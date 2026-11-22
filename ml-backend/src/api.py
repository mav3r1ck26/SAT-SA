from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime
import io
import os
import math

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
    allow_origins=[origin.strip() for origin in os.getenv(
        "ML_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
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
    missing_features: List[str]
    feature_coverage: Dict[str, Any]
    advisory: bool = True

class TrainingResponse(BaseModel):
    success: bool
    metrics: Dict
    message: str

MAX_UPLOAD_BYTES = int(os.getenv("ML_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
MAX_BATCH_ENTITIES = int(os.getenv("ML_MAX_BATCH_ENTITIES", "500"))


def build_efficiency_scores(predictions):
    scores = {}
    for target in EFFICIENCY_TARGETS:
        prediction = predictions.get(target)
        if prediction is None:
            scores[target] = {
                "score": None,
                "confidence": None,
                "prediction_spread": None,
                "uncertainty_method": "not_available",
                "interpretation": "Not predicted because required features are missing."
            }
        else:
            scores[target] = {
                "score": prediction.get("prediction"),
                "confidence": None,
                "prediction_spread": prediction.get("prediction_spread"),
                "uncertainty_method": prediction.get("uncertainty_method", "not_available"),
                "interpretation": prediction.get("interpretation", "")
            }
    return scores


def required_features_status(features):
    missing = [
        feature for feature in SOC_FEATURES
        if feature not in features or not math.isfinite(float(features[feature]))
    ]
    return missing, len(SOC_FEATURES) - len(missing)

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
    
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Training file exceeds the configured size limit.")
    try:
        df = pd.read_csv(io.StringIO(content.decode('utf-8-sig')))
    except Exception as exc:
        raise HTTPException(400, "Training file is not valid UTF-8 CSV.") from exc
    
    if 'entity_id' not in df.columns or 'period' not in df.columns:
        raise HTTPException(400, "CSV must contain 'entity_id' and 'period' columns")
    
    # Check required targets
    missing_targets = [t for t in EFFICIENCY_TARGETS if t not in df.columns]
    if missing_targets:
        raise HTTPException(400, f"Missing target columns: {missing_targets}")
    
    missing_features = [feature for feature in SOC_FEATURES if feature not in df.columns or df[feature].isna().any()]
    if missing_features:
        raise HTTPException(400, f"Training data contains missing required features: {missing_features}")
    
    try:
        trained_evaluator = SOCEfficiencyEvaluator()
        results = trained_evaluator.model.train(df.dropna(subset=EFFICIENCY_TARGETS))
        trained_evaluator.model.save(model_path)
        evaluator = trained_evaluator
    except Exception as exc:
        print(f"ML training failed: {type(exc).__name__}")
        raise HTTPException(500, "Training failed; the existing model was not replaced.") from exc
    
    return {
        "success": True,
        "metrics": results,
        "message": f"Model trained successfully on {len(df)} samples"
    }

@app.post("/evaluate", response_model=List[EfficiencyResponse])
async def evaluate_efficiency(input_data: BatchEfficiencyInput):
    """Evaluate SOC efficiency for one or more entities."""
    if len(input_data.entities) > MAX_BATCH_ENTITIES:
        raise HTTPException(413, f"Evaluation batch exceeds the {MAX_BATCH_ENTITIES} entity limit.")

    results = []
    for entity_input in input_data.entities:
        row = entity_input.features.copy()
        row['entity_id'] = entity_input.entity_id
        row['period'] = entity_input.period
        missing_features, present_count = required_features_status(entity_input.features)
        coverage = {
            "provided": present_count,
            "required": len(SOC_FEATURES),
            "ratio": present_count / len(SOC_FEATURES) if SOC_FEATURES else 1,
            "status": "complete" if not missing_features else "insufficient"
        }
        try:
            if missing_features:
                scores = build_efficiency_scores({})
                findings = []
                assessment = {
                    "status": "insufficient_feature_coverage",
                    "recommendation": "Provide all required features before using advisory predictions."
                }
            else:
                if not evaluator or not evaluator.model.is_trained:
                    raise HTTPException(503, "Model not trained. Call /train first.")
                evaluation = evaluator.evaluate(pd.DataFrame([row]))
                scores = build_efficiency_scores(evaluation["ml_predictions"][0])
                findings = evaluation.get("rule_findings", [])
                assessment = evaluation.get("overall_assessment", {})
                assessment["status"] = "advisory"
            results.append(EfficiencyResponse(
                entity_id=entity_input.entity_id,
                period=entity_input.period,
                efficiency_scores=scores,
                rule_findings=findings,
                overall_assessment=assessment,
                missing_features=missing_features,
                feature_coverage=coverage
            ))
        except Exception as exc:
            print(f"ML inference failed: {type(exc).__name__}")
            raise HTTPException(500, "Model inference failed.") from exc
    
    return results

@app.post("/evaluate-csv")
async def evaluate_csv(file: UploadFile = File(...)):
    """Evaluate SOC efficiency from CSV upload."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Only CSV files supported")
    
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Evaluation file exceeds the configured size limit.")
    try:
        df = pd.read_csv(io.StringIO(content.decode('utf-8-sig')))
    except Exception as exc:
        raise HTTPException(400, "Evaluation file is not valid UTF-8 CSV.") from exc
    
    if 'entity_id' not in df.columns or 'period' not in df.columns:
        raise HTTPException(400, "CSV must contain 'entity_id' and 'period' columns")
    
    if len(df) > MAX_BATCH_ENTITIES:
        raise HTTPException(413, f"Evaluation batch exceeds the {MAX_BATCH_ENTITIES} entity limit.")
    
    results = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        feature_values = {
            feature: row_dict[feature]
            for feature in SOC_FEATURES
            if feature in row_dict and pd.notna(row_dict[feature])
        }
        missing_features, present_count = required_features_status(feature_values)
        if missing_features:
            scores = build_efficiency_scores({})
            findings = []
            assessment = {"status": "insufficient_feature_coverage"}
        else:
            if not evaluator or not evaluator.model.is_trained:
                raise HTTPException(503, "Model not trained. Call /train first.")
            try:
                evaluation = evaluator.evaluate(pd.DataFrame([row_dict]))
            except Exception as exc:
                print(f"ML CSV inference failed: {type(exc).__name__}")
                raise HTTPException(500, "Model inference failed for an evaluation row.") from exc
            scores = build_efficiency_scores(evaluation["ml_predictions"][0])
            findings = evaluation.get("rule_findings", [])
            assessment = evaluation.get("overall_assessment", {})
            assessment["status"] = "advisory"
        results.append({
            "entity_id": row.get('entity_id', 'Unknown'),
            "period": row.get('period', 'Unknown'),
            "efficiency_scores": scores,
            "rule_findings": findings,
            "overall_assessment": assessment,
            "missing_features": missing_features,
            "feature_coverage": {
                "provided": present_count,
                "required": len(SOC_FEATURES),
                "ratio": present_count / len(SOC_FEATURES) if SOC_FEATURES else 1,
                "status": "complete" if not missing_features else "insufficient"
            },
            "advisory": True
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
    uvicorn.run(app, host=os.getenv("ML_API_HOST", "127.0.0.1"), port=int(os.getenv("ML_API_PORT", "8000")))