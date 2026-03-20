# 🛡️RakshitArtha - AI-Powered Insurance for India’s Gig Economy

**A Parametric Insurance Platform for Gig Workers | Phase 1: Ideation & Foundation**

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Persona & Problem Statement](#persona--problem-statement)
3. [Solution Overview](#solution-overview)
4. [Weekly Premium Model](#weekly-premium-model)
5. [Parametric Triggers & Disruption Types](#parametric-triggers--disruption-types)
6. [Workflow & User Journey](#workflow--user-journey)
7. [AI/ML Integration Strategy](#aiml-integration-strategy)
8. [Tech Stack & Architecture](#tech-stack--architecture)
9. [Development Plan & Timeline](#development-plan--timeline)
10. [MVP Scope for Phase 1](#mvp-scope-for-phase-1)
11. [Success Metrics](#success-metrics)
---
## 🎯 Executive Summary
**Raskhitartha** is an AI-enabled parametric insurance platform designed to protect food delivery partners (from platforms like Swiggy and Zomato) against income loss caused by external disruptions. 

### Key Highlights:
- **Target User:** Food Delivery Partners (Swiggy/Zomato)
- **Coverage:** Income loss protection ONLY (No health, accidents, vehicle repairs)
- **Pricing:** Weekly model (₹20-50/week) aligned with gig worker payout cycles
- **Payout Speed:** Automatic, within 24 hours
- **Smart Features:** AI-powered risk assessment, intelligent fraud detection, parametric automation

---
## 👤 Persona & Problem Statement
#### Chosen persona - Food Delivery riders working for platforms such as Zomato/Swiggy.
### Our Delivery Partner Persona

**Name:** Kevin  
**Age:** 25  
**Experience:** 1.5 years as Swiggy delivery partner  
**Average Weekly Earnings:** ₹6,200-7,500  
**Location:** Banglore (Koramangala area)  
**Work Pattern:** 9-11 hours/day, 6 days/week 
#### **Research on gig workers salary**
| Platform | Avg. Daily Net (10 hrs) | Weekly Net (6 days) | Notes                                                                |
| -------- | ----------------------- | ------------------- | -------------------------------------------------------------------- |
| Swiggy   | ₹800–₹1,000             | ₹4,800–₹6,000       | Incentives add ₹200–400 peak; fuel ~₹150/day deduct. ​ |
| Zomato   | ₹900–₹1,100             | ₹5,400–₹6,600       | ₹102/hour gross avg.; surge higher in cities.  |

### Current Pain Points

1. **Income Volatility & Unpredictability**
   - Earnings fluctuate based on weather, traffic, customer demand , curfews and more.
   - Heavy rain = fewer orders + longer delivery times = 40-60% income loss.
   - No compensation for lost work days.

2. **External Disruptions Causing Income Loss**
   - Extreme weather (monsoons, heatwaves,heavy rains)
   - Floods and waterlogging in delivery zones(especially near sea zone)
   - High pollution (health concerns reduce work capacity)
   - Unexpected curfews/strikes blocking delivery routes
   - Market closures affecting restaurant availability
   - Deviation in normal route

3. **Lack of Safety Net**
   - No sick leave, paid holidays, or emergency funds
   - One bad weather day can mean no food on table
   - No financial buffer for disruption-caused losses

4. **Existing Solutions Don't Help**
   - Health insurance doesn't cover lost income
   - Accident insurance doesn't help on non-accident days
   - Vehicle insurance doesn't compensate for reduced work

### Our Solution

**RakshitArtha** provides a parametric insurance product that automatically pays when verified external disruptions occur, ensuring income stability even during weather events or unexpected closures.

---

## 💡 Solution Overview

### What RakshitArtha Does

**Automatic Income Compensation During Disruptions:**
- Real-time weather & environmental monitoring
- Parametric triggers (automated, no claim filing needed)
- Instant payout when disruptions exceed thresholds
- AI-powered fraud detection; if the system fails to predict correctly, manual verification is allowed.
- Weekly pricing model matching gig work cycles

### What RakshitArtha Does NOT Cover
- ❌ Health/Medical expenses
- ❌ Life Insurance
- ❌ Accident/Injury compensation
- ❌ Vehicle repairs or maintenance
- ❌ Personal disability

### Coverage Focus: LOSS OF INCOME ONLY

| **Disruption Type** | **Parametric Trigger** | **Impact on Gig Workers** | **Payout Range** |
|----------------------|-------------------------|----------------------------|------------------|
| Heavy Rainfall       | >50mm in 24 hours       | Unsafe driving, delayed deliveries, cancellations due to customer reluctance | ₹100–200 |
| Thunderstorm         | Official alerts + lightning activity | Zone closures, app suspensions, riders forced to wait without income | ₹150–300 |
| Extreme Heat         | >45°C sustained for 6+ hours | Health risks (heatstroke), reduced customer demand, higher fuel costs (AC use) | ₹80–150 |
| Flooding             | Municipal waterlogging alerts | Roads blocked, delivery rerouting, longer travel times, cancellations | ₹200–400 |
| Severe Pollution     | AQI >400 (Severe)       | Respiratory health concerns, fewer outdoor orders, mask costs | ₹60–120 |
| Curfews/Strikes      | Official municipal declarations | Zone lockdown, police restrictions, sudden income halt | ₹250–500 |
| Market Closure       | Restaurants closed >2 hours | No pickups, wasted travel time, idle waiting | ₹150–300 |
| Fuel Shortage        | Petrol pump closure alerts | Longer queues, higher costs, inability to complete shifts | ₹200–350 |
| Platform Downtime    | App outage >30 minutes  | No orders, wasted logged-in time, income disruption | ₹100–250 |
| Vehicle Breakdown    | Verified roadside assistance report | Lost shift hours, repair costs, missed incentives | ₹300–600 |

---
## 💰 Weekly Premium Model

### How Pricing Works

RakshitArtha uses a **Dynamic Weekly Premium** model that recalculates based on:

#### 1. Base Premium Calculation

```
Weekly Premium = Base Rate × Location Risk × Worker Profile × Seasonal Adjustment

Example for Raj (Bangalore):
├─ Base Rate: ₹25/week (National standard)
├─ Location Risk: 1.2x (Bangalore = Flood-prone areas, monsoon susceptible)
├─ Worker Profile: 0.95x (Trusted user, low cancellation rate)
├─ Seasonal Adjustment: 1.0x (Current season)
└─ Final Weekly Premium: ₹25 × 1.2 × 0.95 × 1.0 = ₹28.50/week
   (Rounded to ₹30/week)
```

#### 2. Pricing Tiers (Personalized)

```
PRICING TIERS FOR RAJ (Koramangala, Bangalore)
═════════════════════════════════════════════

🥗 ESSENTIAL PLAN - ₹20/week
├─ Heavy Rain (>50mm): ₹100
├─ Extreme Heat (>45°C): ₹60
├─ High Pollution (AQI >400): ₹50
└─ Monthly Max Payout: ₹300

⭐ STANDARD PLAN - ₹30/week (RECOMMENDED)
├─ Heavy Rain (>50mm): ₹150
├─ Thunderstorms: ₹200
├─ Extreme Heat (>45°C): ₹120
├─ Flooding: ₹300
├─ High Pollution (AQI >400): ₹100
└─ Monthly Max Payout: ₹600

🏆 PREMIUM PLAN - ₹50/week
├─ Moderate Rain (>30mm): ₹120
├─ Heavy Rain (>50mm): ₹200
├─ Thunderstorms: ₹300
├─ Extreme Heat (>42°C): ₹150
├─ Flooding: ₹400
├─ High Pollution (AQI >350): ₹150
├─ Curfews/Strikes: ₹500
└─ Monthly Max Payout: ₹1,000
```

#### 3. Seasonal Adjustments

```
SEASONAL PRICING VARIATIONS (India Context)

Jun-Sep (Monsoon):     1.5x multiplier (High disruption risk)
Apr-May (Summer):      1.2x multiplier (Heat waves, high demand)
Nov-Jan (Winter):      0.8x multiplier (Stable, good weather)
Feb-Mar (Spring):      1.0x multiplier (Transition period)

Example: Standard Plan in Monsoon
₹30/week × 1.5 = ₹45/week
```

#### 4. Payment & Deduction Method

```
AUTO-DEDUCTION MODEL (Aligned with Gig Work Cycles)

Every Monday:
├─ Swiggy/Zomato calculates weekly earnings
├─ Insurance premium auto-deducted
├─ Worker receives: Net Earnings - Premium
├─ Example: ₹2,200 earnings - ₹30 premium = ₹2,170 payout

Alternative: Manual Payment Options
├─ UPI/Wallet top-up
├─ Credit/Debit card
└─ Cash payment at partner hubs
```

---

## 🌦️ Parametric Triggers & Disruption Types

### Disruption Category 1: ENVIRONMENTAL

#### A. Heavy Rainfall
```
Trigger Parameter: Rainfall > 50mm in 24-hour period
Data Source: IMD (India Meteorological Dept), Weather APIs
Evidence: Official weather reports, satellite data
Payout: 1.5x-2.0x weekly premium (₹45-60 for Standard plan)
Why This Matters: Heavy rain = 40-50% fewer orders, longer delivery times, safety risks
Frequency (Bangalore): 15-20 days during monsoon (Jun-Sep)
```

#### B. Thunderstorms & Lightning
```
Trigger Parameter: 
├─ Official thunderstorm warnings issued
├─ Lightning activity detected in zone
└─ Wind speed > 30 km/h

Data Source: IMD weather alerts, Lightning detection networks
Payout: 2.0x-2.5x weekly premium (₹60-75)
Why This Matters: Zone closures, delivery suspensions, safety hazards
Frequency (Bangalore): 10-15 events/monsoon season
```

#### C. Extreme Heat
```
Trigger Parameter: Temperature > 45°C sustained for 6+ hours
Data Source: Weather APIs, meteorological stations
Payout: 1.2x-1.5x weekly premium (₹36-45)
Why This Matters: 
├─ Health risks (heat exhaustion, dehydration)
├─ Reduced customer orders (people stay indoors)
├─ Slower deliveries (can't work long hours)
└─ Estimated income loss: 25-35%

Frequency (Bangalore): 5-10 days (Apr-May)
```

#### D. Severe Flooding/Waterlogging
```
Trigger Parameter:
├─ Official flood alerts from civic authorities
├─ Waterlogging in >30% of primary delivery zones
└─ Road closures > 2 hours

Data Source: Municipal alerts, traffic data, news APIs
Payout: 3.0x-3.5x weekly premium (₹90-105)
Why This Matters: Route inaccessibility, complete halt of deliveries
Frequency (Bangalore): 3-5 events/monsoon
```

#### E. Severe Air Pollution (AQI)
```
Trigger Parameter: AQI > 400 (Severe category)
Data Source: CPCB, Air Quality monitoring APIs
Payout: 1.0x-1.2x weekly premium (₹30-36)
Why This Matters:
├─ Health hazards (respiratory issues)
├─ Reduced work capacity
├─ Fewer delivery orders
└─ Estimated income loss: 15-25%

Frequency (Bangalore): Rare (2-3 events/year, mainly Jan-Mar in North India)
```

### Disruption Category 2: SOCIAL/ADMINISTRATIVE

#### A. Unexpected Curfews
```
Trigger Parameter:
├─ Official municipal/state curfew declaration
├─ Curfew duration > 2 hours during work hours
└─ Affects delivery zone coverage

Data Source: Official govt alerts, news APIs, WhatsApp circulars
Payout: 3.0x-4.0x weekly premium (₹90-120)
Why This Matters: Complete work stoppage, zone inaccessibility
Frequency (Bangalore): Rare (2-3 events/year)
```

#### B. Local Strikes & Protests
```
Trigger Parameter:
├─ Reported strikes affecting delivery operations
├─ Road blockades > 2 hours
├─ Zone accessibility < 60%

Data Source: Police alerts, news APIs, delivery app notifications
Payout: 2.0x-3.0x weekly premium (₹60-90)
Why This Matters: Route blockades, safety concerns, delivery halts
Frequency (Bangalore): 2-4 events/year
```

#### C. Market/Zone Closures
```
Trigger Parameter:
├─ Municipality closes markets > 2 hours
├─ Restaurants not operational > 2 hours
├─ No pickup locations available in zone

Data Source: Municipal notifications, restaurant status APIs
Payout: 2.0x-2.5x weekly premium (₹60-75)
Why This Matters: No orders to pickup = no deliveries possible
Frequency (Bangalore): 1-2 events/month (sanitation drives, inspections)
```
<img width="2748" height="1536" alt="Gemini_Generated_Image_ku9x3wku9x3wku9x" src="https://github.com/user-attachments/assets/8d756bba-b2c7-42d6-90ca-0c09615f7e52" />

---
## 🚶 Workflow & User Journey
<img width="1408" height="768" alt="image_583d983b" src="https://github.com/user-attachments/assets/ca37ed97-8d91-43e4-b7b8-007711fcd718" />

### Detailed Complete User Flow (5 Stages)

#### STAGE 1: DISCOVERY & ONBOARDING (1-2 minutes)

```
FLOW DIAGRAM:

Worker sees in-app notification
        ↓
Clicks "Learn More" → Lands on GigGuard website
        ↓
Enters mobile number / Scans QR code
        ↓
Location auto-detected (GPS) → Risk assessment instant
        ↓
Sees personalized quote (₹20-50/week)
        ↓
Clicks "Get Started" → KYC form
```

**What Happens:**
1. Worker discovers GigGuard via in-app notification (Swiggy/Zomato)
2. System detects location and calculates risk profile
3. Personalized quote shown based on:
   - Location risk (flood-prone? coastal? urban?)
   - Historical disruption data
   - Worker reliability score
4. KYC verification (auto-filled from Swiggy/Zomato account)
5. Premium calculation and plan selection

#### STAGE 2: POLICY CREATION & ACTIVATION (2-3 minutes)

```
FLOW DIAGRAM:

Select Plan (Essential/Standard/Premium)
        ↓
Fill KYC Details (Auto-filled from platform)
        ↓
Accept Terms & Conditions
        ↓
Choose Payment Method (Auto-deduction recommended)
        ↓
Policy Activated ✓
        ↓
Welcome email + Dashboard access
```

**What Happens:**
1. Worker selects pricing plan
2. KYC verification (Aadhar, Bank account)
3. Initial fraud risk scoring:
   - Swiggy/Zomato account age & ratings
   - Cancellation/complaint rates
   - Historical behavior
4. Policy issued (usually within 2 minutes)
5. Dashboard access granted

#### STAGE 3: REAL-TIME MONITORING & TRIGGER DETECTION

```
FLOW DIAGRAM:

24/7 Real-time monitoring of:
├─ Weather data (rainfall, temperature, AQI)
├─ Administrative alerts (curfews, strikes)
├─ Traffic & route data
└─ Delivery app activity (worker location)

        ↓

Parametric trigger detected?
        ├─ YES → Proceed to Fraud Detection (Stage 4)
        └─ NO → Continue monitoring
```

**What Happens:**
1. System continuously monitors:
   - Weather APIs (OpenWeatherMap, IMD data)
   - Air quality indices
   - Official government alerts
   - News APIs for social disruptions
2. When threshold breached → Trigger alert generated
3. Fraud detection automatically initiated

#### STAGE 4: INTELLIGENT FRAUD DETECTION & VERIFICATION

```
FRAUD DETECTION PIPELINE:

Parametric Trigger Detected (e.g., Heavy Rain)
        ↓
Run 5-Point Fraud Check:
├─ LOCATION VERIFICATION
│  ├─ Is worker in affected area? (GPS)
│  └─ Distance from weather event: < 5km ✓
│
├─ BEHAVIORAL ANALYSIS
│  ├─ First claim? (Risk score adjusted)
│  ├─ Historical claim pattern normal?
│  └─ No suspicious frequency ✓
│
├─ ACTIVITY VALIDATION
│  ├─ Worker was active during disruption?
│  ├─ Swiggy app shows orders in that area?
│  └─ Activity matches claim ✓
│
├─ OFFICIAL DATA CROSS-CHECK
│  ├─ Weather data from official sources?
│  ├─ IMD confirms rainfall >50mm?
│  └─ Verified from 3+ data sources ✓
│
└─ ANOMALY DETECTION (ML-based)
   ├─ Statistical outlier check
   ├─ Pattern matching with known fraud cases
   └─ Risk score < threshold ✓

        ↓

Fraud Risk Score: 8.5/10 (LOW RISK) → APPROVE
        ↓
Proceed to Payout Processing
```

**AI/ML Models Used:**
1. **Location Anomaly Detection:** Identify if worker consistently files claims from non-affected areas
2. **Temporal Pattern Analysis:** Check claim frequency against expected disruption frequency
3. **Behavioral Clustering:** Compare worker behavior against fraud cluster profiles
4. **Official Data Validation:** Cross-check parametric trigger with ≥3 official sources

#### STAGE 5: AUTOMATED PAYOUT & SETTLEMENT

```
FLOW DIAGRAM:

Claim Approved by Fraud Detection
        ↓
Calculate Payout Amount
├─ Base Weekly Premium: ₹30
├─ Event Multiplier: 1.5x (Heavy rain)
├─ Severity Factor: 1.2x (65mm rainfall)
└─ Final Payout: ₹30 × 1.5 × 1.2 = ₹54
        ↓
Initiate Bank Transfer
├─ Via NEFT/IMPS (India)
├─ Usually 2-4 hours
└─ Confirmed by next morning
        ↓
Send Notification to Worker
├─ Push notification (Real-time)
├─ SMS confirmation
└─ Email with transaction details
        ↓
Update Dashboard
├─ Payout recorded
├─ Claim history updated
└─ Worker sees ₹54 credited
```
---

## 🤖 AI/ML Integration Strategy

### 1. PREMIUM CALCULATION ENGINE

**Objective:** Dynamic, personalized weekly premium based on individual risk profile

**Input Parameters:**
```
├─ Geographic Risk
│  ├─ Flood-prone area? (Yes/No) → 1.0-1.5x
│  ├─ Coastal region? (Yes/No) → 1.2x
│  ├─ Urban/Rural → 1.0-1.3x
│  └─ Historical disruption frequency
│
├─ Worker Profile
│  ├─ Account age (months) → Newer = higher risk
│  ├─ Swiggy/Zomato rating (out of 5) → Lower = higher risk
│  ├─ Cancellation rate (%) → Higher = higher risk
│  └─ Previous claims (count) → Experience modifier
│
├─ Seasonal Factor
│  ├─ Monsoon season? → 1.5x multiplier
│  ├─ Summer? → 1.2x multiplier
│  └─ Winter? → 0.8x multiplier
│
└─ Delivery Pattern
   ├─ Average daily earnings (₹) → Higher earning = lower risk
   ├─ Hours worked per week
   └─ Preferred delivery zones
```

**ML Model:**
```
Weekly Premium = Base Rate × (
    Location Risk Factor × 0.3 +
    Worker Profile Score × 0.4 +
    Seasonal Multiplier × 0.2 +
    Historical Disruption Frequency × 0.1
)
```

**Model Type:** Linear Regression with feature scaling

---

### 2. FRAUD DETECTION SYSTEM

**Objective:** Identify suspicious claims and prevent fraudulent payouts

**5-Layer Fraud Detection Pipeline:**

#### Layer 1: Location Verification (Deterministic)
```
Check: Is worker's GPS location within 5km of weather event?

Algorithm: Haversine Distance Calculation
distance = haversine(worker_lat, worker_long, event_lat, event_long)
if distance < 5km → PASS (Score: +2)
elif distance < 15km → WARNING (Score: +1)
else → FAIL (Score: -3)
```

#### Layer 2: Behavioral Analysis (Statistical)
```
Check: Does claim pattern match expected disruption frequency?

Algorithm: Z-Score Analysis
for each worker:
    historical_claims_avg = mean(claims_per_month)
    std_dev = stdev(claims_per_month)
    z_score = (current_claim_count - historical_avg) / std_dev
    
if |z_score| < 2.5 → NORMAL (Score: +1)
elif |z_score| < 3.5 → MODERATE ANOMALY (Score: 0)
else → SEVERE ANOMALY (Score: -2)
```

#### Layer 3: Activity Validation (Data Cross-Check)
```
Check: Was worker actively working during disruption?

Validation Points:
├─ Swiggy app shows deliveries in that zone?
├─ Phone location data matches claimed location?
├─ Typical work hours for this worker?
└─ Weather conditions match worker's usual work pattern?

Score: +2 if all pass, -1 per failed check
```

#### Layer 4: Official Data Verification (Deterministic)
```
Check: Do multiple official sources confirm the disruption?

Required Sources:
├─ IMD (India Met Dept) rainfall data ✓
├─ CPCB AQI readings ✓
├─ Municipal alerts/news ✓
└─ At least 2 of 3 sources must confirm

if 2+ sources confirm → VERIFIED (Score: +3)
else → UNVERIFIED (Score: -2)
```

#### Layer 5: Anomaly Detection (ML-Based)
```
Algorithm: Isolation Forest + Autoencoder Ensemble

Features Analyzed:
├─ Claim frequency (per worker, per area, temporal)
├─ Claim amount distribution (Expected vs actual payout)
├─ Worker behavior patterns (Work hours, zones, activity)
├─ Claim timing (During actual disruption? Or hours later?)
└─ Claim concentration (Multiple claims from same area within minutes?)

Output: Anomaly Score (0-1)
if score < 0.3 → LOW RISK (Approve)
elif score < 0.6 → MEDIUM RISK (Manual review)
else → HIGH RISK (Reject/Investigate)
```

**Final Fraud Score Calculation:**
```
Total Fraud Score = (
    Location_Score × 0.2 +
    Behavioral_Score × 0.2 +
    Activity_Score × 0.2 +
    Official_Data_Score × 0.2 +
    Anomaly_Score × 0.2
) / 5

Approval Rule:
if Final_Score > 6/10 → APPROVE
elif Final_Score > 4/10 → MANUAL REVIEW
else → REJECT
```

---

### 3. PREDICTIVE RISK MODELING

**Objective:** Forecast income disruption likelihood for personalized warnings

**ML Algorithm:** XGBoost Classifier with SHAP Explainability

**Features:**
```
Weather Features:
├─ Temperature forecast (7-day)
├─ Rainfall forecast (7-day)
├─ Wind speed predictions
├─ AQI forecast
└─ Extreme weather alerts

Temporal Features:
├─ Day of week (Weekends = more orders, lower risk)
├─ Time of day (Peak hours = more resilient)
├─ Week of month (Salary week = higher demand)
└─ Season (Monsoon = higher disruption)

Behavioral Features:
├─ Worker's earning stability index
├─ Average delivery completion rate
├─ Zone preferences (Risk zones vs safe zones)
└─ Historical disruption resilience
```

**Output:** Income Disruption Probability
```
Example Prediction:
"Raj, there's 75% probability of heavy rain tomorrow.
Expected income loss: ₹300-400.
You're protected! Premium cost: ₹30."
```

---

## 🏗️ Tech Stack & Architecture

### Frontend Architecture
```
┌─────────────────────────────────────────┐
│      User Interface Layer               │
├─────────────────────────────────────────┤
│  Web Dashboard (React)                  │
│  Mobile App (React Native)              │
│  SMS/Push Notifications (Twilio)        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   API Gateway (Node.js/Express)         │
├──────────────────────────────────────────┤
│  ├─ Authentication/Authorization        │
│  ├─ Request validation                  │
│  └─ Rate limiting                       │
└──────────────────┬──────────────────────┘
```

### Backend Architecture
```
┌──────────────────────────────────────────┐
│    Core Application Services            │
├──────────────────────────────────────────┤
│  ├─ Onboarding Service                  │
│  ├─ Policy Management Service           │
│  ├─ Premium Calculation Service         │
│  ├─ Risk Assessment Service             │
│  ├─ Claims Processing Service           │
│  └─ Payout Engine                       │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│    Data Processing & Analytics          │
├──────────────────────────────────────────┤
│  ├─ Real-time Data Ingestion            │
│  ├─ Fraud Detection Pipeline            │
│  ├─ ML Model Serving (TensorFlow)      │
│  └─ Analytics Aggregation               │
└────────────────┬─────────────────────────┘
```

### Technology Choices
```
Backend:
├─ Language: Python 3.9+ (ML support)
├─ Framework: FastAPI (High performance)
├─ Database: PostgreSQL (Relational data)
├─ Cache: Redis (Real-time monitoring)
└─ Task Queue: Celery + RabbitMQ

Machine Learning:
├─ Premium Calculation: Scikit-learn
├─ Fraud Detection: XGBoost + Isolation Forest
├─ Predictive Models: TensorFlow/PyTorch
└─ Explainability: SHAP

Data Pipeline:
├─ Ingestion: Kafka (Event streaming)
├─ Processing: Apache Spark (Distributed)
└─ Storage: Data Lake (S3/Azure Blob)

External APIs:
├─ Weather: OpenWeatherMap API + IMD (Free tier)
├─ Air Quality: CPCB API (India specific)
├─ Payments: Razorpay/PayU (Indian gateways)
├─ SMS/Push: Twilio + Firebase
└─ Delivery Platform: Swiggy/Zomato APIs (Simulated)

Infrastructure:
├─ Deployment: Docker + Kubernetes
├─ Cloud: AWS/Google Cloud
└─ Monitoring: ELK Stack + Prometheus
```

---


