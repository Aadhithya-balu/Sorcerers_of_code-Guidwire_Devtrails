from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .insurance import (
    fetch_location_data,
    calculate_ai_weekly_premium,
    calculate_premium,
    calculate_disruption_loss,
    process_insurance_claim,
    auto_trigger_claim,
    PLANS,
    get_payment_schedule,
    check_auto_claim_eligibility,
)
from .fraud import detect_fraud

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AIPremiumInput(BaseModel):
    rainfall_mm: float
    temperature_c: float
    aqi: int
    flood_alert: int
    zone_risk_level: str = "medium"
    traffic_index: float
    csv_risk_score: float = 0.5

    avg_daily_income: float
    weekly_working_days: int
    avg_daily_hours: float

    historical_disruption_rate: float
    predicted_disruption_probability: float
    fraud_risk_score: float

    total_orders: int = 20
    delivered_orders: int = 15
    disruption_hours: Optional[float] = None


class PremiumInput(BaseModel):
    plan: str
    risk_score: float
    num_orders: int


class ClaimInput(BaseModel):
    plan: str
    hours_wasted: float
    hourly_rate: float
    reason: str = "Disruption"


@app.post("/predict_fraud")
def predict_fraud(data: dict):
    return detect_fraud(data)

@app.get("/")
def home():
    return {"message": "Gig Insurance API Running"}


@app.get("/fetch_location_data")
def get_location(city: str):
    return fetch_location_data(city)

@app.post("/calculate_ai_premium")
def ai_premium(data: AIPremiumInput):
   
    fraud_data = {
        "latitude": getattr(data, 'latitude', 0),
        "longitude": getattr(data, 'longitude', 0),
        "previous_latitude": getattr(data, 'previous_latitude', 0),
        "previous_longitude": getattr(data, 'previous_longitude', 0),
        "timestamp": getattr(data, 'timestamp', datetime.now().isoformat()),
        "previous_timestamp": getattr(data, 'previous_timestamp', datetime.now().isoformat()),
        "claim_amount": getattr(data, 'claim_amount', 0),
        "avg_claim_amount": getattr(data, 'avg_claim_amount', 10000),
        "num_claims_last_24h": getattr(data, 'num_claims_last_24h', 0),
    }
    
    fraud_result = detect_fraud(fraud_data)
    
    
    if fraud_result.get('fraud_probability', 0) > 0.7:
        return {
            "error": "Fraud detected - Premium calculation blocked",
            "fraud_probability": fraud_result.get('fraud_probability', 0),
            "fraud_reasons": fraud_result.get('reasons', []),
            "weekly_premium": None,
            "risk_score": None,
            "expected_loss": None,
            "explanation": ["Fraud detected - Premium calculation not performed"]
        }
    
    result = calculate_ai_weekly_premium(data.dict())

    auto_claim = auto_trigger_claim(
        data.rainfall_mm,
        data.aqi,
        data.disruption_hours
    )

    result["auto_claim_triggered"] = auto_claim
    result["fraud_probability"] = fraud_result.get('fraud_probability', 0)
    result["fraud_reasons"] = fraud_result.get('reasons', [])

    return result


@app.post("/calculate_premium")
def premium(data: PremiumInput):
    disruption_loss = calculate_disruption_loss(data.risk_score, data.num_orders)

    weekly_premium = calculate_premium(
        data.plan,
        data.risk_score,
        disruption_loss,
        data.num_orders
    )

    return {
        "weekly_premium": weekly_premium,
        "estimated_disruption_loss": disruption_loss,
        "max_payout": PLANS[data.plan]["max_payout"]
    }


@app.post("/insurance_claim")
def claim(data: ClaimInput):
    return process_insurance_claim(data.dict())


@app.get("/plans")
def get_plans():
    return {"plans": PLANS}


@app.post("/dashboard")
def dashboard(data: AIPremiumInput):
    premium_data = calculate_ai_weekly_premium(data.dict())

   
    plan = "Standard"  
    payment_schedule = get_payment_schedule(plan, premium_data["weekly_premium"])

    
    hourly_rate = data.avg_daily_income / data.avg_daily_hours if data.avg_daily_hours > 0 else 100
    auto_claim = check_auto_claim_eligibility(
        data.disruption_hours or 0,
        premium_data.get("missed_orders", 0),
        plan,
        hourly_rate
    )

    return {
        "weekly_premium": premium_data["weekly_premium"],
        "risk_score": premium_data["risk_score"],
        "expected_loss": premium_data["expected_loss"],
        "efficiency": premium_data["efficiency"],
        "missed_orders": premium_data["missed_orders"],
        "payment_schedule": payment_schedule,
        "auto_claim": auto_claim,
        "message": "Dashboard data generated successfully"
    }



@app.post("/advanced_fraud_detection")
def advanced_fraud_detection(data: dict):
    """
    Detect fraud using advanced rule-based system.
    Accepts claim data with:
    - latitude, longitude (current location)
    - previous_latitude, previous_longitude (previous location)
    - timestamp, previous_timestamp (ISO format)
    - claim_amount, avg_claim_amount
    - num_claims_last_24h
    """
    result = detect_fraud(data)
    return result



@app.get("/live_fraud_detection")
def live_fraud_detection():
    """
    Real-time fraud detection with sample data.
    This endpoint demonstrates the fraud detection system in action.
    """
    sample_data = {
        "claim_id": 2851,
        "user_id": 5621,
        "timestamp": "2026-03-18T22:15:00",
        "latitude": 13.1939,
        "longitude": 77.6245,
        "previous_latitude": 12.9716,
        "previous_longitude": 77.5946,
        "previous_timestamp": "2026-03-18T21:00:00",
        "claim_amount": 72000,
        "avg_claim_amount": 35000,
        "num_claims_last_24h": 3
    }

    result = detect_fraud(sample_data)

    return {
        "claim_id": sample_data["claim_id"],
        "fraud": result["fraud"],
        "fraud_probability": result["fraud_probability"],
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "severity": result["severity"],
        "reasons": result["reasons"],
        "details": result["details"],
        "latitude": sample_data["latitude"],
        "longitude": sample_data["longitude"],
        "previous_latitude": sample_data["previous_latitude"],
        "previous_longitude": sample_data["previous_longitude"],
    }
