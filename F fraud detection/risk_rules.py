from datetime import datetime
from utils import calculate_distance, calculate_speed

def calculate_risk(data):
    """Compute rule-based fraud risk score."""
    risk_score = 0
    reasons = []

    # Distance & time difference
    distance = calculate_distance(
        data["latitude"], data["longitude"],
        data["previous_latitude"], data["previous_longitude"]
    )

    t1 = datetime.fromisoformat(data["timestamp"])
    t2 = datetime.fromisoformat(data["previous_timestamp"])
    time_diff = (t1 - t2).total_seconds() / 3600
    speed = calculate_speed(distance, time_diff)

    # 🚨 Rule 1: Unrealistic speed
    if speed > 120:
        risk_score += 30
        reasons.append("Unrealistic travel speed (>120 km/h)")

    # 🚨 Rule 2: Large location jump
    if distance > 50:
        risk_score += 25
        reasons.append(f"Large location jump ({distance:.2f} km)")

    # 🚨 Rule 3: High claim amount
    if data["claim_amount"] > 2 * data["avg_claim_amount"]:
        risk_score += 20
        reasons.append("Claim amount exceeds double the average")

    # 🚨 Rule 4: Multiple claims in 24h
    if data["num_claims_last_24h"] > 2:
        risk_score += 25
        reasons.append("Multiple claims within 24 hours")

    # 🚨 Rule 5: Nighttime claims
    if 0 <= t1.hour <= 4:
        risk_score += 10
        reasons.append("Suspicious claim time (midnight hours)")

    return risk_score, reasons


def classify_fraud(risk_score):
    """Classify fraud level."""
    if risk_score >= 70:
        return "HIGH RISK 🚨"
    elif risk_score >= 40:
        return "MEDIUM RISK ⚠️"
    else:
        return "LOW RISK ✅"

