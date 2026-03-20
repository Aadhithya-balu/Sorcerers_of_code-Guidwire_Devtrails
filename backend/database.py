import pandas as pd
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parent.parent / 'final_dataset_with_risk.csv'

df = pd.read_csv(DATA_PATH)


risk_map = {
    'Low Risk': 0.2,
    'Medium Risk': 0.5,
    'High Risk': 0.8
}

def get_risk_data_for_zone(zone):
    
    zone_data = df[df['Zone'].str.lower() == zone.lower()]

    
    if zone_data.empty:
        zone_data = df[df['Zone'].str.lower().str.contains(zone.lower())]

    if zone_data.empty:
        return None

    avg_data = zone_data.mean(numeric_only=True)
    risk_level = zone_data['Risk_Level'].mode()[0] if not zone_data['Risk_Level'].empty else 'Medium Risk'
    risk_score = risk_map.get(risk_level, 0.5)

    return {
        'rainfall': avg_data.get('Rainfall', 0),
        'aqi': avg_data.get('AQI', 100),
        'traffic': avg_data.get('Traffic', 0.5),
        'humidity': avg_data.get('Humidity', 50),
        'temperature': avg_data.get('Temperature', 30),
        'flood_risk': avg_data.get('Flood_Risk', 0),
        'delivery_time': avg_data.get('Delivery_Time', 15),
        'orders': avg_data.get('Orders', 500),
        'risk_level': risk_level,
        'risk_score': risk_score
    }

def get_all_zones():
    return df['Zone'].unique().tolist()