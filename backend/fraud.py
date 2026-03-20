import math
from datetime import datetime


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km using Haversine formula."""
    R = 6371  # Earth radius (km)
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return round(R * c, 2)



def calculate_speed(distance_km, time_hours):
    """Calculate speed in km/h."""
    return round(distance_km / time_hours, 2) if time_hours > 0 else 0



def time_diff_hours(t1, t2):
    """Calculate time difference in hours between two ISO timestamps."""
    t1_dt = datetime.fromisoformat(t1)
    t2_dt = datetime.fromisoformat(t2)
    return abs((t2_dt - t1_dt).total_seconds() / 3600)



def detect_fraud(data):
    """
    Detect fraud using rule-based scoring system.
    Integrates rules from:
    - GPS spoofing detection (speed check)
    - Location jump detection
    - Claim amount anomaly
    - Multiple claims pattern
    - Temporal anomaly (nighttime claims)
    """
    fraud_score = 0
    reasons = []

    # Extract data with safe defaults
    lat = data.get("latitude", 0)
    lon = data.get("longitude", 0)
    prev_lat = data.get("previous_latitude", lat)
    prev_lon = data.get("previous_longitude", lon)

    t1 = data.get("timestamp", datetime.now().isoformat())
    t2 = data.get("previous_timestamp", t1)

    claim_amount = data.get("claim_amount", 0)
    avg_claim = data.get("avg_claim_amount", 10000)
    claims_24h = data.get("num_claims_last_24h", 0)

    # Calculate distance & speed
    distance = calculate_distance(prev_lat, prev_lon, lat, lon)
    time_hours = time_diff_hours(t1, t2)
    speed = calculate_speed(distance, time_hours)

   
    if speed > 120:
        fraud_score += 30
        reasons.append(f"Unrealistic travel speed detected ({speed:.1f} km/h > 120 km/h limit)")


    if distance > 50:
        fraud_score += 25
        reasons.append(f"Large sudden location change ({distance:.2f} km in {time_hours:.1f}h)")

 
    if claim_amount > avg_claim * 2:
        fraud_score += 20
        reasons.append(f"Claim amount (₹{claim_amount}) exceeds 2x average (₹{avg_claim})")

  
    if claims_24h > 2:
        fraud_score += 25
        reasons.append(f"Multiple claims in 24 hours ({claims_24h} claims)")

    # If more than 3 claims, add extra penalty
    if claims_24h > 3:
        fraud_score += 10
        reasons.append("Excessive claim frequency detected")


    try:
        t1_dt = datetime.fromisoformat(t1)
        hour = t1_dt.hour
        if 0 <= hour <= 4:  # Midnight to 4 AM
            fraud_score += 10
            reasons.append(f"Suspicious claim time ({hour:02d}:00 - midnight hours)")
    except:
        pass


    fraud_score = min(fraud_score, 100)  # Cap at 100
    fraud_probability = round(fraud_score / 100, 2)

    if fraud_score >= 70:
        fraud = 1
        risk_level = "HIGH RISK "
        severity = "HIGH"
    elif fraud_score >= 40:
        fraud = 0
        risk_level = "MEDIUM RISK "
        severity = "MEDIUM"
    else:
        fraud = 0
        risk_level = "LOW RISK "
        severity = "LOW"

    return {
        "fraud": fraud,
        "fraud_probability": fraud_probability,
        "risk_score": fraud_score,
        "risk_level": risk_level,
        "severity": severity,
        "reasons": reasons,
        "details": {
            "distance_km": distance,
            "speed_kmph": speed,
            "time_hours": round(time_hours, 2),
            "claims_last_24h": claims_24h,
            "claim_amount": claim_amount,
            "avg_claim_amount": avg_claim
        }
    }
