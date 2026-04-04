import joblib
import pandas as pd
import json
import os
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# Load or create mock models
try:
    model = joblib.load(f"{BASE_DIR}/model/risk_model.pkl")
except:
    # Fallback to mock model if file doesn't exist
    model = None

try:
    scaler = joblib.load(f"{BASE_DIR}/model/scaler.pkl")
except:
    scaler = None

try:
    encoder = joblib.load(f"{BASE_DIR}/model/label_encoder.pkl")
except:
    encoder = None

try:
    with open(f"{BASE_DIR}/model/features.json") as f:
        FEATURES = json.load(f)
except:
    FEATURES = []

class RiskPredictor:
    """ML-based risk prediction for parametric insurance"""
    
    def __init__(self):
        self.model = model
        self.scaler = scaler
        self.encoder = encoder
        self.features = FEATURES
    
    def predict_risk(self, data: dict):
        """Predict risk level using ML model"""
        try:
            if not self.model:
                return self._calculate_risk_manually(data)
            
            df = pd.DataFrame([data])
            if self.features:
                df = df[self.features]
            
            if self.scaler:
                scaled = self.scaler.transform(df)
            else:
                scaled = df.values
            
            pred = self.model.predict(scaled)
            
            if self.encoder:
                return self.encoder.inverse_transform(pred)[0]
            return str(pred[0])
        except Exception as e:
            logger.error(f"Model prediction error: {str(e)}")
            return self._calculate_risk_manually(data)
    
    def calculate_environmental_risk(self, rainfall=0, aqi=150, temperature=25, wind_speed=0):
        """Calculate environmental risk score (0-100)"""
        risk = 0
        
        # Rainfall risk
        if rainfall > 50:
            risk += min((rainfall - 50) / 50 * 40, 40)
        
        # AQI risk
        if aqi > 200:
            risk += min((aqi - 200) / 100 * 35, 35)
        
        # Temperature extremes
        if temperature > 45 or temperature < 5:
            risk += 15
        elif temperature > 40 or temperature < 10:
            risk += 10
        
        # Wind speed
        if wind_speed > 50:
            risk += 10
        
        return min(risk, 100)
    
    def calculate_location_risk(self, latitude: float, longitude: float):
        """Calculate location-based risk (0-100)"""
        # Mock implementation - in production, use geocoding/zone mapping
        # High-risk zones: high-traffic areas, flood-prone regions, etc.
        
        if latitude < 0:
            return min(abs(latitude % 10) * 10, 100)
        return min(latitude % 10 * 5, 100)
    
    def calculate_activity_risk(self, working_hours=0, deliveries=0, avg_speed=0, historical_claims=0):
        """Calculate activity-based risk (0-100)"""
        risk = 0
        
        # Historical claims risk
        if historical_claims >= 5:
            risk += 40
        elif historical_claims >= 3:
            risk += 25
        elif historical_claims >= 1:
            risk += 10
        
        # Working hours risk (fatigue)
        if working_hours > 12:
            risk += 20
        elif working_hours > 8:
            risk += 10
        
        # Delivery velocity risk
        if avg_speed > 60:
            risk += 15
        elif avg_speed > 40:
            risk += 10
        
        # Delivery frequency risk
        if deliveries > 30:
            risk += 15
        elif deliveries > 15:
            risk += 10
        
        return min(risk, 100)
    
    def aggregate_risk(self, environmental_risk=0, location_risk=0, activity_risk=0, historical_claims=0):
        """Aggregate multiple risk factors"""
        weights = {
            'environmental': 0.35,
            'location': 0.25,
            'activity': 0.25,
            'historical': 0.15
        }
        
        historical_risk = min(historical_claims * 10, 50)
        
        total_risk = (
            environmental_risk * weights['environmental'] +
            location_risk * weights['location'] +
            activity_risk * weights['activity'] +
            historical_risk * weights['historical']
        )
        
        return min(total_risk, 100)
    
    def detect_fraud(self, claim_data: dict, user_history: dict):
        """Detect fraudulent claims"""
        fraud_score = 0
        
        # Location mismatch check
        if 'location_distance' in claim_data:
            if claim_data['location_distance'] > 10:
                fraud_score += 30
        
        # Frequency check
        if 'claims_this_week' in user_history:
            if user_history['claims_this_week'] >= 3:
                fraud_score += 25
        
        # Amount anomaly check
        if 'average_claim_amount' in user_history:
            avg = user_history['average_claim_amount']
            current = claim_data.get('claim_amount', 0)
            if avg > 0 and current / avg > 3:
                fraud_score += 20
        
        # Pattern check
        if 'typical_claim_type' in user_history:
            if user_history['typical_claim_type'] != claim_data.get('claim_type'):
                fraud_score += 15
        
        return min(fraud_score, 100)
    
    def analyze_triggers(self, weather_data: dict, location_data: dict, activity_data: dict):
        """Analyze if parametric triggers are met"""
        triggers = {
            'rainfall': False,
            'aqi': False,
            'disaster': False,
            'traffic': False
        }
        
        # Check rainfall
        if weather_data.get('rainfall', 0) > 50:
            triggers['rainfall'] = True
        
        # Check AQI
        if weather_data.get('aqi', 0) > 200:
            triggers['aqi'] = True
        
        # Disaster flag
        if weather_data.get('disaster_alert', False):
            triggers['disaster'] = True
        
        # Traffic blockage
        if activity_data.get('route_blocked', False):
            triggers['traffic'] = True
        
        return triggers
    
    def _calculate_risk_manually(self, data: dict):
        """Fallback manual risk calculation"""
        rainfall = data.get('rainfall', 0)
        aqi = data.get('aqi', 150)
        
        risk = "LOW"
        
        if rainfall > 100 or aqi > 300:
            risk = "CRITICAL"
        elif rainfall > 50 or aqi > 200:
            risk = "HIGH"
        elif rainfall > 25 or aqi > 150:
            risk = "MEDIUM"
        
        return risk
