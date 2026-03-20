from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from risk_rules import calculate_risk, classify_fraud
from data_fetcher import fetch_live_data

app = FastAPI(title="Real-Time Fraud Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return FileResponse("dashboard.html")

@app.get("/live_fraud_detection")
def live_fraud_detection():
    data = fetch_live_data()

    if not data:
        return {"error": "Failed to fetch data"}

    # Calculate risk
    risk_score, reasons = calculate_risk(data)

    # Cap score at 100 (safety)
    risk_score = min(risk_score, 100)

    # Classification
    risk_level = classify_fraud(risk_score)

    # ✅ Fraud flag
    fraud = 1 if risk_score >= 70 else 0

    # ✅ Probability (0 to 1)
    fraud_probability = round(risk_score / 100, 2)

    # ✅ Severity label
    if risk_score >= 90:
        severity = "CRITICAL"
    elif risk_score >= 70:
        severity = "HIGH"
    elif risk_score >= 40:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return {
        "claim_id": data.get("claim_id"),
        "fraud": fraud,
        "fraud_probability": fraud_probability,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "severity": severity,
        "reasons": reasons,
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "previous_latitude": data.get("previous_latitude"),
        "previous_longitude": data.get("previous_longitude"),
    }