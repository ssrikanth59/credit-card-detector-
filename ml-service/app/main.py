import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.model import FraudModelService

app = FastAPI(
    title="AI Credit Card Fraud Detection Microservice",
    description="Provides real-time transaction risk scoring and explainable AI weights.",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate model service
model_service = FraudModelService()

class TransactionPayload(BaseModel):
    amount: float = Field(..., description="Transaction amount in USD", example=125.50)
    distance_from_home: float = Field(..., description="Geographic distance in km from home base", example=12.4)
    velocity_1h: int = Field(..., description="Number of transactions in the last hour", example=1)
    device_risk_score: float = Field(..., description="Calculated device fingerprint threat level (0-1)", example=0.1)
    is_declined_before: int = Field(..., description="Has this card been declined in the last 24h? (0=No, 1=Yes)", example=0)
    hour_of_day: int = Field(..., description="Hour of the day transaction occurred (0-23)", example=14)
    is_foreign: int = Field(..., description="Is this a foreign merchant? (0=No, 1=Yes)", example=0)
    model_type: str = Field("Random Forest", description="Machine learning model to use for prediction", example="Random Forest")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Credit Card Fraud Detection ML API",
        "model_loaded": len(model_service.models) > 0 or model_service.metadata is not None
    }

@app.post("/predict")
def predict_transaction(payload: TransactionPayload):
    try:
        data = payload.model_dump()
        result = model_service.predict(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@app.get("/metrics")
def get_metrics():
    if model_service.metadata is None:
        raise HTTPException(status_code=404, detail="Model metadata not loaded.")
    return model_service.metadata

@app.post("/train")
def retrain_model():
    try:
        print("Forced retraining requested via API...")
        from scripts.train import run_training
        run_training()
        model_service.load_model()
        return {
            "status": "success",
            "message": "Model retrained and reloaded successfully.",
            "metadata": model_service.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Allow running directly for local debugging
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
