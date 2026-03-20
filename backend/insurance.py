import requests
from datetime import datetime, timedelta
from .database import get_risk_data_for_zone

import os
from dotenv import load_dotenv

load_dotenv()
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

PLANS = {
    "Basic": {"weekly_fee": 50, "max_payout": 1000},
    "Standard": {"weekly_fee": 100, "max_payout": 2500},
    "Premium": {"weekly_fee": 150, "max_payout": 5000}
}


def calculate_disruption_loss(risk_score, num_orders):
    base_loss_per_order = 50
    risk_multiplier = 1 + (risk_score / 100) * 2
    estimated_loss = num_orders * base_loss_per_order * risk_multiplier
    return round(estimated_loss, 2)


def fetch_location_data(city):
    risk_data = get_risk_data_for_zone(city)
    zone_risk_level = 'medium'
    csv_risk_score = 0.5
    historical_disruption_rate = 0.05
    predicted_disruption_probability = 0.15
    fraud_risk_score = 0.05
    baseline_source = 'csv' if risk_data else 'none'

    if risk_data:
        zone_risk_level = risk_data['risk_level'].split()[0].lower()
        csv_risk_score = risk_data['risk_score']
        historical_disruption_rate = risk_data['flood_risk'] / 10
        predicted_disruption_probability = csv_risk_score * 0.3

    rainfall_mm = risk_data['rainfall'] if risk_data else 0
    temperature_c = risk_data['temperature'] if risk_data else 25
    aqi = risk_data['aqi'] if risk_data else 100
    traffic_index = risk_data['traffic'] if risk_data else 0.5
    flood_alert = 1 if risk_data and risk_data['flood_risk'] > 0.005 else 0

    # Try fetching live data from OpenWeather to enrich values
    try:
        geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={OPENWEATHER_API_KEY}"
        geo_res = requests.get(geo_url, timeout=5).json()

        if geo_res:
            lat, lon = geo_res[0]['lat'], geo_res[0]['lon']

            weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
            weather = requests.get(weather_url, timeout=5).json()

            aqi_url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
            aqi_data = requests.get(aqi_url, timeout=5).json()

            rainfall_mm = weather.get('rain', {}).get('1h', rainfall_mm)
            temperature_c = weather.get('main', {}).get('temp', temperature_c)

            aqi_map = {1: 50, 2: 100, 3: 150, 4: 250, 5: 400}
            aqi_raw = aqi_data['list'][0]['main']['aqi'] if aqi_data.get('list') else None
            aqi = aqi_map.get(aqi_raw, aqi)

            flood_alert = 1 if rainfall_mm > 10 else 0
            baseline_source = 'api+csv' if risk_data else 'api'

    except Exception:
        baseline_source = 'csv' if risk_data else 'none'

    disruption_hours = calculate_disruption_hours(rainfall_mm, aqi, traffic_index, csv_risk_score)

    return {
        "rainfall_mm": rainfall_mm,
        "temperature_c": temperature_c,
        "aqi": aqi,
        "flood_alert": flood_alert,
        "traffic_index": traffic_index,
        "zone_risk_level": zone_risk_level,
        "csv_risk_score": csv_risk_score,
        "historical_disruption_rate": historical_disruption_rate,
        "predicted_disruption_probability": predicted_disruption_probability,
        "fraud_risk_score": fraud_risk_score,
        "disruption_hours": disruption_hours,
        "data_source": baseline_source
    }


def calculate_disruption_hours(rainfall_mm, aqi, traffic_index, csv_risk_score):
    rain_disruption = min(rainfall_mm / 10, 5)  # Max 5 hours from rain

    aqi_disruption = 0
    if aqi > 300:
        aqi_disruption = (aqi - 300) / 100  

    traffic_disruption = traffic_index * 2 

    
    risk_multiplier = 1 + csv_risk_score

    total_disruption = (rain_disruption + aqi_disruption + traffic_disruption) * risk_multiplier

    return round(min(total_disruption, 10), 2)  # Cap at 10 hours


def calculate_ai_weekly_premium(data):

    rainfall_mm = data['rainfall_mm']
    temperature_c = data['temperature_c']
    aqi = data['aqi']
    flood_alert = data['flood_alert']
    zone_risk_level = data.get('zone_risk_level', 'medium')
    traffic_index = data['traffic_index']
    csv_risk_score = data.get('csv_risk_score', 0.5)

    avg_daily_income = data['avg_daily_income']
    weekly_working_days = data['weekly_working_days']
    avg_daily_hours = data['avg_daily_hours']

    historical_disruption_rate = data['historical_disruption_rate']
    predicted_disruption_probability = data['predicted_disruption_probability']

    fraud_risk_score = data['fraud_risk_score']

    total_orders = data.get('total_orders', 20)
    delivered_orders = data.get('delivered_orders', 15)
    disruption_hours = data.get('disruption_hours', calculate_disruption_hours(rainfall_mm, aqi, traffic_index, csv_risk_score))

    weather_risk_score = 0
    if rainfall_mm > 100:
        weather_risk_score += 0.5
    if temperature_c > 40:
        weather_risk_score += 0.2
    if aqi > 300:
        weather_risk_score += 0.3
    if flood_alert:
        weather_risk_score += 0.5
    weather_risk_score = min(weather_risk_score, 1.0)


    location_risk_score = {"low": 0.2, "medium": 0.5, "high": 0.8}.get(zone_risk_level, 0.5)

    location_risk_score = max(location_risk_score, csv_risk_score)


    exposure_score = (weekly_working_days / 7) * (avg_daily_hours / 10)

    traffic_risk_score = traffic_index

    efficiency = delivered_orders / total_orders if total_orders > 0 else 0
    missed_orders = total_orders - delivered_orders

    order_risk = (1 - efficiency) + (missed_orders / 50)

    disruption_impact = min(disruption_hours / 10, 1.0)

    adjusted_probability = (
        0.7 * predicted_disruption_probability +
        0.3 * historical_disruption_rate
    )

    risk_score = (
        0.20 * weather_risk_score +
        0.10 * location_risk_score +
        0.15 * exposure_score +
        0.15 * adjusted_probability +
        0.15 * traffic_risk_score +
        0.15 * order_risk +
        0.10 * disruption_impact
    )

    # 💰 Weekly Income
    weekly_income = avg_daily_income * weekly_working_days

    # 📉 Expected Loss
    expected_loss = weekly_income * adjusted_probability

    # 💸 Premium Calculation
    base_premium = risk_score * expected_loss
    final_premium = base_premium * 1.15

    # 🚨 Fraud Adjustment
    if fraud_risk_score > 0.7:
        final_premium *= 1.10

    # 🛡 Business Constraints
    final_premium = min(final_premium, weekly_income * 0.3)
    final_premium = max(final_premium, 20)

    weekly_premium = round(final_premium, 2)

    # 📊 Explanation
    explanation = [
        f"Weather risk: {weather_risk_score:.2f}",
        f"Location risk: {location_risk_score:.2f} (CSV: {csv_risk_score:.2f})",
        f"Exposure: {exposure_score:.2f}",
        f"Traffic risk: {traffic_risk_score:.2f}",
        f"Order efficiency: {efficiency:.2f}",
        f"Missed orders: {missed_orders}",
        f"Disruption impact: {disruption_impact:.2f} (hours: {disruption_hours:.2f})",
        f"Adjusted probability: {adjusted_probability:.2f}",
        f"Weekly income: ₹{weekly_income:.2f}",
        f"Expected loss: ₹{expected_loss:.2f}",
        f"Final premium: ₹{weekly_premium}"
    ]

    return {
        "weekly_premium": weekly_premium,
        "risk_score": round(risk_score, 2),
        "expected_loss": round(expected_loss, 2),
        "missed_orders": missed_orders,
        "efficiency": round(efficiency, 2),
        "explanation": explanation
    }


# 💰 Plan-based premium
def calculate_premium(plan, risk_score, disruption_loss, num_orders):
    base = PLANS[plan]["weekly_fee"]

    risk_factor = 1 + (risk_score / 100) * 0.5
    loss_factor = 1 + (disruption_loss / 1000) * 0.2

    if num_orders <= 5:
        order_factor = 1.0
    elif num_orders <= 20:
        order_factor = 1.1
    else:
        order_factor = 1.2

    total_premium = round(base * risk_factor * loss_factor * order_factor, 2)

    return total_premium


# 💵 Claim payout
def calculate_payout(plan, hours, rate):
    max_payout = PLANS[plan]["max_payout"]
    payout = hours * rate
    return min(payout, max_payout)


# 📄 Claim processing
def process_insurance_claim(data):
    plan = data["plan"]
    hours_wasted = data["hours_wasted"]
    hourly_rate = data["hourly_rate"]

    payout = calculate_payout(plan, hours_wasted, hourly_rate)

    return {
        "payout": payout,
        "max_payout": PLANS[plan]["max_payout"],
        "lost_income": hours_wasted * hourly_rate,
        "reason": data.get("reason", "Disruption caused income loss")
    }


# ⚡ Auto-trigger claim system
def auto_trigger_claim(rainfall_mm, aqi, disruption_hours):
    if rainfall_mm > 120 or aqi > 350 or disruption_hours > 3:
        return True
    return False


# 💳 Payment Schedule
def get_payment_schedule(plan, weekly_premium):

    now = datetime.now()
    # Assume payments are due every Friday at 5 PM
    days_until_friday = (4 - now.weekday()) % 7  # 4 = Friday
    if days_until_friday == 0 and now.hour >= 17:
        days_until_friday = 7  # Next Friday

    next_payment = now + timedelta(days=days_until_friday)
    next_payment = next_payment.replace(hour=17, minute=0, second=0, microsecond=0)

    return {
        "plan": plan,
        "weekly_premium": weekly_premium,
        "next_payment_date": next_payment.strftime("%Y-%m-%d"),
        "next_payment_time": next_payment.strftime("%H:%M:%S"),
        "next_payment_datetime": next_payment.isoformat(),
        "days_until_payment": days_until_friday if days_until_friday > 0 else 7
    }


# 🤖 Auto-Claim System
def check_auto_claim_eligibility(disruption_hours, missed_orders, plan, hourly_rate):
    # Auto-claim if disruption > 2 hours or missed orders > 2
    if disruption_hours > 2 or missed_orders > 2:
        payout = calculate_payout(plan, disruption_hours, hourly_rate)
        return {
            "eligible": True,
            "reason": f"Disruption: {disruption_hours}h, Missed: {missed_orders}",
            "auto_payout": payout
        }
    return {"eligible": False, "reason": "Conditions not met", "auto_payout": 0}