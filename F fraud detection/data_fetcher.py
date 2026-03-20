import requests

API_URL = "https://jsonplaceholder.typicode.com/posts/1"

def fetch_live_data():
    try:
        response = requests.get(API_URL)
        response.raise_for_status()  # important
        data = response.json()

        # Convert external API → your fraud format
        return {
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

    except Exception as e:
        print("Error:", e)
        return None