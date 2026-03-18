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

| **Disruption Type** | **Parametric Trigger** | **Impact** | **Payout** |
|---|---|---|---|
| Heavy Rainfall | >50mm in 24 hours | Cannot deliver safely | ₹100-200 |
| Thunderstorm | Official alerts + Lightning activity | Zone closure risk | ₹150-300 |
| Extreme Heat | >45°C sustained for 6+ hours | Low demand + health risk | ₹80-150 |
| Flooding | Official waterlogging alerts | Route inaccessibility | ₹200-400 |
| Severe Pollution | AQI >400 (Severe category) | Health concerns, low demand | ₹60-120 |
| Curfews/Strikes | Official municipal declarations | Zone lockdown | ₹250-500 |
| Market Closure | Restaurants closed > 2 hours | No pickups available | ₹150-300 |

---
## 🧑‍💻Technical requirements

### 🧠 AI & Risk Core
* **AI-Powered Risk Calculation**: Real-time assessment of environmental and behavioral risks via ML.
* **Weekly Dynamic Premium**: A pricing engine aligned with gig economy pay cycles.
* **Predictive Persona Modeling**: Custom risk profiles built on historical delivery data.

### 🛡️ Fraud & Validation Layer
* **Anomaly Detection**: AI models to flag suspicious patterns and statistical outliers.
* **Activity Validation**: Dual-sync validation using GPS and Platform activity logs.
* **Duplicate Prevention**: Automated cross-checks to stop multi-payout fraud.

### ⚙️ Parametric Automation
*   **Real-time Trigger Monitoring**: 24/7 background polling of Environmental APIs (AQI/Rain/Heat).
*   **Automatic Claim Initiation**: Zero-touch workflow that triggers claims the moment a disruption is detected.
*   **Instant Payout Processing**: Automated financial integration to credit digital wallets within minutes.

### 🔗 Integration Capabilities
*   **Environmental Data APIs**: Integration with Weather/AQI services (Mocks/Free tiers) to track disruptions.
*   **Traffic & Mobility Data**: Utilization of traffic mocks to quantify "Efficiency Degradation."
*   **Platform API Simulation**: Simulated connectors for `Zomato/Swiggy` to verify worker eligibility.
*   **Financial & Payment Systems**: Sandbox/Trial gateway integration for testing premiums and payouts.
  
---
## Overall System workflow
<img width="2816" height="1536" alt="workflow" src="https://github.com/user-attachments/assets/abf1e569-275f-45f1-a731-946e4158104e" />

---
## 📅 How the Weekly Premium Works
*Automated Risk-Based Pricing for Gig Workers*

### 1️⃣ Worker Registration
The onboarding process captures critical data points to build the initial risk profile:
*   **Identity:** Name and unique Platform ID.
*   **Location:** Primary city and operational zones.
*   **Economic Baseline:** Connected platform (Zomato/Swiggy) and average weekly income.

### 2️⃣ Real-time Risk Assessment
Our AI engine continuously evaluates the environment to determine the disruption probability:
*   **Climate Analytics:** Live monitoring of weather (Rain/Heat) and Pollution (AQI).
*   **Operational Data:** Real-time traffic congestion and city-level movement trends.
*   **Historical Trends:** Cross-referencing current data with past disruption patterns in specific pin codes.

### 3️⃣ Dynamic Premium Calculation
Instead of a "one-size-fits-all" fee, the system generates a **Personalized Risk Score**:
*   **Weekly Adjustments:** Premiums are recalculated every 7 days based on the upcoming forecast.
*   **Affordability:** The AI ensures the premium remains a small fraction of the worker's average weekly earnings.
*   **Incentivized Safety:** Lower premiums for workers operating in lower-risk zones or during stable weather windows.


## ⚡ Parametric Triggers & Automation
*Smart Detection: No Manual Claims. No Paperwork. Instant Response.*

Parametric insurance relies on **predefined external conditions** to trigger claims automatically. Our system continuously monitors real-time environmental and social data. When specific disruption thresholds are reached, the platform identifies affected workers and initiates compensation for income loss.

### 🔍 Automated Disruption Thresholds


| Trigger Type | 📡 Data Source | 🛠️ Automated Logic |
| :--- | :--- | :--- |
| **🌧️ Extreme Rainfall** | `OpenWeather API` | Triggers when precipitation levels exceed defined safety thresholds within a specific time window. |
| **🔥 Extreme Heat** | `Weather Services` | Activates when temperatures cross safe outdoor working limits, protecting workers from heat-related health risks. |
| **🌫️ Severe Pollution** | `AQI Monitoring` | Monitors Air Quality Index (AQI); treats hazardous pollution levels as a restricted-activity event. |
| **🚦 Zone Closures** | `Google Maps API` | Detects heavy congestion, road closures, strikes, or curfews that block access to delivery routes. |

### 🛠️ How it Works (Step-by-Step)

1.  **Continuous Polling**: The system polls global and local APIs every 15-30 minutes for every registered worker's geo-location.
2.  **Threshold Validation**: If a "Severe Rain" or "Hazardous AQI" event is detected, the AI validates the intensity against the worker's active zone.
3.  **Automatic Identification**: The platform automatically flags all workers currently "Online" or scheduled to work in that specific zone.
4.  **Zero-Touch Payout**: Without the worker needing to upload a single photo or document, the system calculates the estimated loss and initiates the payout.

---



