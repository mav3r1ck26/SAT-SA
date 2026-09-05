from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime
import io
import json
import uuid

try:
    from .models import EnsembleDetector
    from .features import extract_features
    from .outputs import generate_file_a, generate_file_b, run_full_pipeline, PLAYBOOKS
except ImportError:
    from models import EnsembleDetector
    from features import extract_features
    from outputs import generate_file_a, generate_file_b, run_full_pipeline, PLAYBOOKS

app = FastAPI(
    title="SAT-SA ML Backend",
    description="Supervised (Decision Tree) + Unsupervised (K-Means) Attack Detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = None
training_stats = {}

class AlertInput(BaseModel):
    timestamp: str
    source_ip: Optional[str] = None
    dest_ip: Optional[str] = None
    source_port: Optional[int] = None
    dest_port: Optional[int] = None
    protocol: Optional[str] = None
    bytes_sent: Optional[int] = 0
    bytes_received: Optional[int] = 0
    packet_count: Optional[int] = 0
    alert_description: Optional[str] = ""
    user_agent: Optional[str] = ""
    http_status: Optional[int] = None
    ticket_number: Optional[str] = None
    label: Optional[int] = None

class BatchInput(BaseModel):
    alerts: List[AlertInput]
    investigators: Optional[List[str]] = None

class PredictionResponse(BaseModel):
    ticket_number: str
    classification: str
    confidence: float
    supervised_pred: int
    unsupervised_pred: int
    anomaly_score: float

class FileAResponse(BaseModel):
    Investigator: str
    Ticket_Number: str
    Potential_Attack_Classification: str
    TP_or_FP: str
    Escalation_Needed: str
    Reasoning: str

class FileBResponse(BaseModel):
    Ticket_Number: str
    Rule_Playbook_Triggered: str
    Rule_Triggering_Activity_IoC: str
    Timestamp_of_IoC: str
    Service_Functionality_Affected_Potential: str

@app.on_event("startup")
async def startup_event():
    global detector
    detector = EnsembleDetector()
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base_dir, "..", "models")
    sup_path = os.path.join(model_dir, "supervised_model.pkl")
    unsup_path = os.path.join(model_dir, "unsupervised_model.pkl")
    if os.path.exists(sup_path) and os.path.exists(unsup_path):
        try:
            detector.load(sup_path, unsup_path)
            print("Models loaded successfully on startup")
        except Exception as e:
            print(f"Failed to load models: {e}")
    else:
        print(f"Model files not found at {sup_path}, {unsup_path}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SAT-SA ML Backend",
        "models_loaded": detector is not None and detector.supervised.is_trained and detector.unsupervised.is_trained,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/train")
async def train_model(file: UploadFile = File(...)):
    global detector, training_stats
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Only CSV files supported")
    
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    
    if 'label' not in df.columns:
        raise HTTPException(400, "Training data must contain 'label' column (0=Normal, 1=Attack)")
    
    detector = EnsembleDetector()
    training_stats = detector.train(df)
    
    return {
        "message": "Model trained successfully",
        "training_stats": training_stats,
        "samples": len(df),
        "features": len(detector.supervised.feature_names) if detector.supervised.feature_names else 0
    }

@app.post("/predict", response_model=List[PredictionResponse])
async def predict_batch(input_data: BatchInput):
    global detector
    
    if detector is None or not detector.supervised.is_trained:
        raise HTTPException(503, "Model not trained. Call /train first.")
    
    df = pd.DataFrame([alert.model_dump() for alert in input_data.alerts])
    if 'ticket_number' not in df.columns:
        df['ticket_number'] = [f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}' for i in range(len(df))]
    
    results = detector.predict(df)
    
    return [
        PredictionResponse(
            ticket_number=df.iloc[i]['ticket_number'],
            classification=r['classification'],
            confidence=r['confidence'],
            supervised_pred=r['supervised_pred'],
            unsupervised_pred=r['unsupervised_pred'],
            anomaly_score=r['anomaly_score']
        )
        for i, r in enumerate(results)
    ]

@app.post("/analyze", response_model=Dict[str, Any])
async def analyze_full(input_data: BatchInput):
    global detector
    
    if detector is None or not detector.supervised.is_trained:
        raise HTTPException(503, "Model not trained. Call /train first.")
    
    df = pd.DataFrame([alert.model_dump() for alert in input_data.alerts])
    if 'ticket_number' not in df.columns:
        df['ticket_number'] = [f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}' for i in range(len(df))]
    
    results = detector.predict(df)
    file_a = generate_file_a(df, results, input_data.investigators)
    file_b = generate_file_b(df, results)
    
    return {
        "predictions": results,
        "file_a": file_a.to_dict(orient='records'),
        "file_b": file_b.to_dict(orient='records'),
        "summary": {
            "total": len(df),
            "attacks": sum(1 for r in results if r['classification'] == 'Attack'),
            "normal": sum(1 for r in results if r['classification'] == 'Normal'),
            "escalations_needed": sum(1 for r in results if r['classification'] == 'Attack' and r['confidence'] >= 0.7)
        }
    }

@app.post("/analyze-csv")
async def analyze_csv(file: UploadFile = File(...), investigators: Optional[str] = None):
    global detector
    
    if detector is None or not detector.supervised.is_trained:
        raise HTTPException(503, "Model not trained. Call /train first.")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Only CSV files supported")
    
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    
    if 'ticket_number' not in df.columns:
        df['ticket_number'] = [f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}' for i in range(len(df))]
    else:
        # Convert to string first to handle NaN values
        df['ticket_number'] = df['ticket_number'].astype(str).replace('nan', '')
        mask = (df['ticket_number'] == '') | (df['ticket_number'].str.lower() == 'nan')
        df.loc[mask, 'ticket_number'] = [f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}' for i in range(len(df))]
    
    inv_list = investigators.split(',') if investigators else None
    results = detector.predict(df)
    file_a = generate_file_a(df, results, inv_list)
    file_b = generate_file_b(df, results)
    
    return {
        "file_a": file_a.to_dict(orient='records'),
        "file_b": file_b.to_dict(orient='records'),
        "summary": {
            "total": len(df),
            "attacks": sum(1 for r in results if r['classification'] == 'Attack'),
            "normal": sum(1 for r in results if r['classification'] == 'Normal'),
        }
    }

@app.get("/playbooks")
async def list_playbooks():
    return {"playbooks": {k: {"name": v["name"], "trigger": v["trigger"], "services": v["services"]} for k, v in PLAYBOOKS.items()}}

@app.get("/playbooks/{playbook_id}")
async def get_playbook(playbook_id: str):
    if playbook_id not in PLAYBOOKS:
        raise HTTPException(404, "Playbook not found")
    return PLAYBOOKS[playbook_id]

@app.get("/model/info")
async def model_info():
    global detector, training_stats
    if detector is None:
        raise HTTPException(503, "Model not initialized")
    
    return {
        "supervised_trained": detector.supervised.is_trained,
        "unsupervised_trained": detector.unsupervised.is_trained,
        "feature_count": len(detector.supervised.feature_names) if detector.supervised.feature_names else 0,
        "training_stats": training_stats,
        "supervised_features": detector.supervised.feature_names,
        "unsupervised_features": detector.unsupervised.feature_names
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)