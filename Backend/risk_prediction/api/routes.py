from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from core.predictor import RiskPredictor
from core.geo_risk import GeoRiskAnalyzer
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["risk"])

# Initialize services
predictor = RiskPredictor()
geo_analyzer = GeoRiskAnalyzer()

# Data models
class WeatherData(BaseModel):
    rainfall: Optional[float] = 0
    temperature: Optional[float] = 25
    humidity: Optional[float] = 70
    aqi: Optional[float] = 150
    wind_speed: Optional[float] = 0

class LocationData(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    timezone: Optional[str] = "Asia/Kolkata"

class ActivityData(BaseModel):
    deliveries_completed: Optional[int] = 0
    working_hours: Optional[float] = 0
    avg_speed: Optional[float] = 0
    stops: Optional[int] = 0

class RiskPredictionRequest(BaseModel):
    user_id: str
    policy_id: Optional[str] = None
    weather_data: WeatherData
    location_data: LocationData
    activity_data: Optional[ActivityData] = None
    historical_claims: Optional[int] = 0

class RiskPredictionResponse(BaseModel):
    risk_score: float = Field(..., ge=0, le=100)
    risk_level: str
    environmental_risk: float
    location_risk: float
    activity_risk: float
    factors: Dict[str, float]
    confidence: float
    recommendation: str

# Endpoints
@router.get("/")
def home():
    return {"message": "Risk Prediction API running"}

@router.post("/predict")
def predict(data: dict):
    result = predict_risk(data)
    return {
        "risk_level": result
    }
