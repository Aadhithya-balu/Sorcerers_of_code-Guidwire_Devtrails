# 🛡️AI-Powered Insurance for India’s Gig Economy

## 🚩Problem Statement

India’s platform-based delivery partners (Zomato, Swiggy, Zepto, Amazon, Dunzo etc.)
are the backbone of our fast-paced digital economy. However, external disruptions such
as extreme weather, pollution, and natural disasters can reduce their working hours and
cause them to lose 20–30% of their monthly earnings. Currently, gig workers have no
income protection against these uncontrollable events. When disruptions occur, they
bear the full financial loss with no safety net.

---
#### Chosen persona - Food Delivery riders working for platforms such as Zomato/Swiggy.
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



