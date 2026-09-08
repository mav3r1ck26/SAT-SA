from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime
import io
import os

from .models import SOCEfficiencyEvaluator, train_efficiency_model, evaluate_model
from .features import extract_soc_features, SOC_FEATURES, EFFICIENCY_TARGETS
from .generate_data import generate_soc_efficiency_data, prepare_training_data

app = FastAPI(
    title="SAT-SA ML Backend - SOC Efficiency Evaluation",
    description="ML-powered SOC efficiency evaluation (not threat classification)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

evaluator = None
model_path = os.path.join(os.path.dirname(__file__), "..", "models", "soc_efficiency_model.pkl")

class SOCEntityInput(BaseModel):
    entity_id: str
    period: str
    features: Dict[str, float]

class BatchEfficiencyInput(BaseModel):
    entities: List[SOCEntityInput]

class EfficiencyResponse(BaseModel):
    entity_id: str
    period: str
    efficiency_scores: Dict[str, Dict[str, Any]]
    rule_findings: List[Dict]
    overall_assessment: Dict[str, Any]

class TrainingResponse(BaseModel):
    success: bool
    metrics: Dict
    message: str

@app.on_event("startup")
async def startup_event():
    global evaluator
    evaluator = SOCEfficiencyEvaluator()
    if os.path.exists(model_path):
        try:
            evaluator.model.load(model_path)
            print("ML model loaded successfully")
        except Exception as e:
            print(f"Could not load model: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SAT-SA ML Backend - SOC Efficiency Evaluation",
        "models_loaded": evaluator is not None and evaluator.model.is_trained if evaluator else False,
        "model_path": model_path,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/train", response_model=TrainingResponse)
async def train_model_endpoint(
    file: UploadFile = File(...),
    n_estimators: int = 200
):
    """Train the SOC efficiency model from CSV upload."""
    global evaluator
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Only CSV files supported")
    
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    
    if 'entity_id' not in df.columns or 'period' not in df.columns:
        raise HTTPException(400, "CSV must contain 'entity_id' and 'period' columns")
    
    # Check required targets
    missing_targets = [t for t in EFFICIENCY_TARGETS if t not in df.columns]
    if missing_targets:
        raise HTTPException(400, f"Missing target columns: {missing_targets}")
    
    evaluator = SOCEfficiencyEvaluator()
    results = evaluator.model.train(df.dropna(subset=EFFICIENCY_TARGETS))
    
    evaluator.model.save(model_path)
    
    return {
        "success": True,
        "metrics": results,
        "message": f"Model trained successfully on {len(df)} samples"
    }

@app.post("/evaluate", response_model=List[EfficiencyResponse])
async def evaluate_efficiency(input_data: BatchEfficiencyInput):
    """Evaluate SOC efficiency for one or more entities."""
    if not evaluator or not evaluator.model.is_trained:
        raise HTTPException(503, "Model not trained. Call /train first.")
    
    results = []
    for entity_input in input_data.entities:
        # Create DataFrame row
        row = entity_input.features.copy()
        row['entity_id'] = entity_input.entity_id
        row['period'] = entity_input.period
        df = pd.DataFrame([row])
        
        # Ensure all features present
        for f in SOC_FEATURES:
            if f not in df.columns:
                df[f] = 0
        
        # Evaluate
        eval_result = evaluator.evaluate(df)
        
        # Format response
        efficiency_scores = {}
        for target in EFFICIENCY_TARGETS:
            if target in evaluator.model.predict(pd.DataFrame([row])).tolist()[0]:
                pass
        
        # Use evaluator's results
        ml_results = evaluator.model.predict_with_confidence(pd.DataFrame([row]))
        
        # Format efficiency scores
        efficiency_scores = {}
        for i, target in enumerate(EFFICIENCY_TARGETS):
            if i < len(ml_results):
                pred = ml_results[i].get(target, {})
                efficiency_scores[target] = {
                    "score": pred.get("prediction", 0),
                    "confidence": pred.get("confidence", 0),
                    "interpretation": pred.get("interpretation", "")
                }
        
        results.append(EfficiencyResponse(
            entity_id=entity_input.entity_id,
            period=entity_input.period,
            efficiency_scores=efficiency_scores,
            rule_findings=eval_result.get("rule_findings", []),
            overall_assessment=eval_result.get("overall_assessment", {})
        ))
    
    return results

@app.post("/evaluate-csv")
async def evaluate_csv(file: UploadFile = File(...)):
    """Evaluate SOC efficiency from CSV upload."""
    if not evaluator or not evaluator.model.is_trained:
        raise HTTPException(503, "Model not trained. Call /train first.")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Only CSV files supported")
    
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    
    if 'entity_id' not in df.columns or 'period' not in df.columns:
        raise HTTPException(400, "CSV must contain 'entity_id' and 'period' columns")
    
    # Ensure all features present
    for f in SOC_FEATURES:
        if f not in df.columns:
            df[f] = 0
    
    results = []
    for _, row in df.iterrows():
        row_df = pd.DataFrame([row.to_dict()])
        eval_result = evaluator.evaluate(row_df)
        results.append({
            "entity_id": row.get('entity_id', 'Unknown'),
            "period": row.get('period', 'Unknown'),
            "efficiency_scores": eval_result.get("ml_predictions", []),
            "rule_findings": eval_result.get("rule_findings", []),
            "overall_assessment": eval_result.get("overall_assessment", {})
        })
    
    return {
        "success": True,
        "evaluated_entities": len(results),
        "results": results
    }

@app.get("/model/info")
async def model_info():
    if not evaluator or not evaluator.model.is_trained:
        return {"status": "not_trained"}
    
    return {
        "status": "trained",
        "model_type": evaluator.model.model_type,
        "features": evaluator.model.feature_names,
        "targets": evaluator.model.target_names,
        "feature_importance": evaluator.model.feature_importance if hasattr(evaluator.model, 'feature_importance') else {}
    }

@app.post("/train-auto")
async def train_auto(
    n_entities: int = 200,
    periods_per_entity: int = 6,
    model_type: str = "ensemble"
):
    """Auto-generate training data and train model."""
    global evaluator
    
    data = list(generate_soc_efficiency_data(n_entities, periods_per_entity))
    df = pd.DataFrame(data)
    
    evaluator = SOCEfficiencyEvaluator()
    evaluator.model.model_type = model_type
    results = evaluator.model.train(df)
    
    evaluator.model.save(model_path)
    
    return {
        "success": True,
        "training_samples": len(df),
        "metrics": results,
        "message": f"Auto-trained on {len(df)} synthetic samples"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)