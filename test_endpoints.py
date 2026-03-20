import requests
import json

# Test frauddetection endpoint
try:
    resp = requests.get('http://127.0.0.1:8000/live_fraud_detection', timeout=5)
    print("✅ Live Fraud Detection Endpoint:")
    print(json.dumps(resp.json(), indent=2))
except Exception as e:
    print(f"❌ Error: {e}")

# Test fetch endpoint
try:
    resp = requests.get('http://127.0.0.1:8000/fetch_location_data?city=Chennai', timeout=5)
    print("\n✅ Fetch Location Data Endpoint:")
    print(json.dumps(resp.json(), indent=2))
except Exception as e:
    print(f"❌ Error: {e}")

# Test calculate premium endpoint with sample data
try:
    sample_data = {
        "rainfall_mm": 0.2,
        "temperature_c": 26.3,
        "aqi": 100,
        "flood_alert": 0,
        "zone_risk_level": "medium",
        "traffic_index": 0.5,
        "avg_daily_income": 500,
        "weekly_working_days": 6,
        "avg_daily_hours": 8,
        "historical_disruption_rate": 0.05,
        "predicted_disruption_probability": 0.15,
        "fraud_risk_score": 0.05,
        "total_orders": 20,
        "delivered_orders": 18,
        "disruption_hours": 1.8
    }
    resp = requests.post('http://127.0.0.1:8000/calculate_ai_premium', json=sample_data, timeout=5)
    print("\n✅ Calculate AI Premium Endpoint:")
    print(json.dumps(resp.json(), indent=2))
except Exception as e:
    print(f"❌ Error: {e}")
