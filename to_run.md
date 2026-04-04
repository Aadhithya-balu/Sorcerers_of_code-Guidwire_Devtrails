# RakshitArtha - Insurance for Gig Workers

A comprehensive insurance and risk management platform for gig economy workers (delivery partners, ride-hailing drivers, etc). Features AI-powered risk prediction, automated claims processing, and real-time anomaly detection.

## Project Structure

- **Backend/insurance-module** - Node.js and Express backend with insurance APIs
- **Frontend/gigcover** - Vite React TypeScript frontend for gig workers
- **Automation** - Automation workflows for claims, fraud detection, and monitoring

---

## Quick Start

### Option 1: Clone and Run Directly

```powershell
git clone https://github.com/Aadhithya-balu/Sorcerers_of_code-Guidewire_Devtrails.git
cd Sorcerers_of_code-Guidewire_Devtrails
npm run install:all
npm run dev:all
```

### Option 2: Install Dependencies First

From the root folder:

```powershell
npm run install:all
```

This installs dependencies for all modules:
- Backend/insurance-module
- Frontend/gigcover
- Automation

---

## Running the Application

### Option A: Run All Services Together

```powershell
npm run dev:all
```

### Option B: Run Services Separately

**Terminal 1 - Backend:**
```powershell
cd Backend/insurance-module
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd Frontend/gigcover
npm run dev
```

**Terminal 3 - Automation (Optional):**
```powershell
cd Automation
npm run dev
```

---

## Access the Application

Once everything is running:

- **Frontend:** `http://localhost:5174`
- **Backend API:** `http://localhost:5000`

---

## Authentication & User Accounts

### Quick Login (Pre-seeded Demo Users)

The system comes with 3 pre-loaded demo users from different platforms and zones. You can instantly log in with any of these:

#### Demo Users:

| Email | Password | Platform | Zone | Risk Level | Daily Income |
|-------|----------|----------|------|------------|--------------|
| `rajesh@swiggy.com` | *any value* | Swiggy | Mumbai, Bandra | Medium | ₹1,500+ |
| `priya@zomato.com` | *any value* | Zomato | Bangalore, Whitefield | High | ₹850+ |
| `amit@rikshaw.com` | *any value* | Rikshaw | Delhi, Connaught Place | Medium | ₹1,200+ |

**To Login:**
1. Open Frontend: `http://localhost:5174`
2. Click "Sign In" → "Login"
3. Enter any demo email from above
4. Password: *any value works in demo mode*
5. Click "Sign In"

---

## Registration & Profile Setup

### Platforms & Zones

The platform supports multiple delivery/ride-hailing platforms:

- **Swiggy** (Food Delivery)
- **Zomato** (Food Delivery)
- **Uber Eats** (Food Delivery)

### Pre-configured Demo Zones with Mock Data

Three zones are available with realistic market data:

#### 1. **Low Risk Zone** - Coimbatore, Sai Baba Colony
- **Zone Type:** Urban
- **Expected Daily Income:** ₹1,200+
- **Risk Level:** 🟢 Stable
- **Profile Badge:** Steady performer
- **Climate:** Moderate, stable rainfall patterns
- **Typical Plans:** Basic (₹59/week) → Premium (₹149/week)

#### 2. **Medium Risk Zone** - Chennai, T. Nagar
- **Zone Type:** Urban
- **Expected Daily Income:** ₹1,000+
- **Risk Level:** 🟡 Balanced
- **Profile Badge:** Consistent performer
- **Climate:** Tropical, occasional high rainfall
- **Typical Plans:** Standard (₹99/week) → Premium (₹149/week)

#### 3. **High Risk Zone** - Bangalore, Electronic City
- **Zone Type:** Urban
- **Expected Daily Income:** ₹850+
- **Risk Level:** 🔴 Stress Test
- **Profile Badge:** Variable conditions
- **Climate:** High traffic, weather variability
- **Typical Plans:** Premium (₹149/week) for maximum coverage

### To Create a New Account:

1. Click "Sign Up" from the login page
2. **Select a Platform:** Swiggy / Zomato / Uber Eats
3. **Enter Basic Details:**
   - Full Name
   - Email
   - Phone Number
4. **Select Your Zone:** Choose one of the 3 demo zones OR enter custom city/delivery zone
5. **Working Details:**
   - Working Days: Weekdays / Weekends / Full Week
   - Average Daily Hours: (e.g., 6, 8, 10)
   - Daily Income: (in ₹)
6. **Daily Income:** Confirm expected daily earnings
7. **KYC Verification:** Upload ID document
   - Supported: Aadhar, PAN, Driving License, Voter ID
   - *Demo mode allows mock uploads*
8. **Confirm & Create Account**

---

## Insurance Plans

The platform offers three insurance plans tailored to different risk profiles:

### Plan Comparison

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| **Weekly Premium** | ₹59 | ₹99 | ₹149 |
| **Coverage Amount** | ₹600 | ₹1,200 | ₹2,500 |
| **Risk Factor** | 1.0x | 1.0x | 1.2x |
| **Triggers** | Traffic Blocked | Rain, Pollution | Rain, Pollution, Disaster |
| **Claim Payout** | ₹600 | ₹1,000+ | ₹2,500+ |
| **Best For** | Low Risk Zones | All Zones | High Risk Zones |

### Dynamic Pricing Factors

Premiums are calculated based on:
- **Location Risk:** Zone-based risk scoring (low/medium/high)
- **Worker Type:** Platform and experience level
- **Seasonal Variation:** Monsoon & festival seasons
- **Weather Data:** Real-time rainfall & AQI
- **Traffic Patterns:** Peak hour & congestion data

---

## Key Features to Explore

### 1. **Claims Processing**
- File claims for covered events (heavy rain, pollution, disasters)
- View claim status: Pending → Approved → Paid
- Automatic payouts within 24 hours for approved claims

### 2. **Risk Assessment**
- Real-time risk scoring based on:
  - Current weather conditions
  - Traffic patterns in your zone
  - Historical incident data
  - Your activity patterns
- Risk meter shows green/yellow/red status

### 3. **Premium Calculation**
- Zone-specific pricing (verified for all 3 demo zones)
- Dynamic adjustments based on:
  - Seasonal factors (monsoon multiplier)
  - Worker earning pattern
  - Tier-based discounts

### 4. **Workflow Automation**
The automation engine processes:
- **Claim Workflows**: File → Validate → Approve → Payout
- **Fraud Detection**: ML-based anomaly detection
- **Risk Prediction**: Predictive models for claim likelihood
- **Monitoring**: Continuous zone & market monitoring

---

## Testing Different Scenarios

### Scenario 1: Low Risk Zone Performance
1. Log in with demo zone: **Coimbatore, Sai Baba Colony**
2. Purchase **Basic Plan** (₹59/week)
3. View stable premium pricing
4. High trust score

### Scenario 2: High Risk Zone Stress Testing
1. Log in with demo zone: **Bangalore, Electronic City**
2. Purchase **Premium Plan** (₹149/week)
3. Observe higher premiums due to risk factors
4. Monitor weather-triggered claims
5. Test fraud detection with unusual patterns

### Scenario 3: Multiple Claims Processing
1. Switch between accounts (use all 3 demo users)
2. File multiple claims with different trigger types:
   - Heavy Rain
   - High Pollution
   - Traffic Blocked
3. Monitor claim approval flow

---

## Mock Data Details

### Pre-loaded Database

#### Users (3 profiles)
- **Rajesh Kumar** - Swiggy Delivery Partner (Mumbai)
- **Priya Singh** - Zomato Delivery Partner (Bangalore)
- **Amit Patel** - Rikshaw Ride Partner (Delhi)

#### Policies (3 active)
- Policy 1: Basic Plan (₹600 coverage)
- Policy 2: Standard Plan (₹1,200 coverage)
- Policy 3: Premium Plan (₹2,500 coverage)

#### Claims (Sample claim data)
- Heavy rain claim (Mumbai) - APPROVED
- Pollution claim (Bangalore) - PENDING
- Traffic blocked claim (Delhi) - PROCESSING

#### Risk Data
- Weather patterns for each zone
- Traffic congestion metrics
- Historical incident records
- Seasonal risk adjustments

---

## Dependencies & Requirements

- **Node.js** 18+ (recommended: 18.x or 20.x)
- **npm** (comes with Node.js)
- **MongoDB** (for backend data storage - uses local or cloud instance)
- **Redis** (optional, for caching)

---

## Troubleshooting

### Issue: `npm run dev:all` fails

**Solution 1:** Install dependencies first
```powershell
npm run install:all
```

**Solution 2:** Run services separately in different terminals
```powershell
# Terminal 1
cd Backend/insurance-module && npm run dev

# Terminal 2
cd Frontend/gigcover && npm run dev

# Terminal 3
cd Automation && npm run dev
```

### Issue: Frontend won't start

```powershell
cd Frontend/gigcover
npm install
npm run dev
```

### Issue: Backend fails to start

- **Check Port 5000 is free:**
  ```powershell
  netstat -ano | findstr :5000
  ```
- **Kill process on port 5000 (if needed):**
  ```powershell
  taskkill /PID <PID> /F
  ```
- **Restart backend:**
  ```powershell
  cd Backend/insurance-module
  npm run dev
  ```

### Issue: Database connection error

- Ensure MongoDB is running locally or connection string is valid
- Check `.env` file in `Backend/insurance-module` for `MONGODB_URI`
- Mock data will reseed on restart if needed

### Issue: Node modules are huge

Clean and reinstall:
```powershell
# Remove all node_modules
Remove-Item -Path "**/node_modules" -Recurse -Force
npm run install:all
```

---

## Environment Configuration

### Backend (.env)
Located in `Backend/insurance-module/.env`

```
MONGODB_URI=mongodb://localhost:27017/rakshitartha
JWT_SECRET=your-secret-key
NODE_ENV=development
LOG_LEVEL=info
PORT=5000
```

### Frontend (vite.config.ts)
Located in `Frontend/gigcover/vite.config.ts`

- API endpoint: `http://localhost:5000/api`
- Dev server port: `5174`

---

## Key APIs

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/user/:email` - Get user by email

### Policies
- `GET /api/policies/user/:userId` - Get user's policies
- `POST /api/policies` - Create new policy
- `GET /api/policies/:policyId` - Get policy details

### Claims
- `POST /api/claims` - File a claim
- `GET /api/claims/policy/:policyId` - Get claims for policy
- `GET /api/claims/:claimId` - Get claim details

### Risk Data
- `GET /api/risk/location/:latitude/:longitude` - Get risk for location
- `POST /api/risk/score` - Calculate risk score

For detailed API documentation, see `Backend/insurance-module/README.md`

---

## Project Architecture

```
Guidewire2/
├── Backend/
│   └── insurance-module/          # Express.js backend
│       ├── models/                # MongoDB schemas
│       ├── controllers/           # Business logic
│       ├── routes/                # API endpoints
│       ├── services/              # Premium calc, fraud detection
│       └── seeds/                 # Mock data
├── Frontend/
│   └── gigcover/                  # React + TypeScript frontend
│       ├── src/pages/             # UI pages
│       ├── src/components/        # Reusable components
│       ├── src/services/          # API client
│       └── src/context/           # Auth context
└── Automation/                    # Workflow orchestration
    ├── workflows/                 # Automation logic
    ├── ml-pipelines/              # Risk prediction models
    └── notifications/             # Event notifications
```

---

## Additional Notes

- **Demo Password:** In demo mode, any password works with pre-seeded accounts
- **Data Persistence:** All data is stored in MongoDB; persists across restarts
- **Logs:** Check `logs/` directories for debugging
- **Caching:** Frontend caches auth tokens in localStorage during session

---

## Additional Resources

- **Backend README:** `Backend/insurance-module/README.md`
- **Frontend Setup:** `Frontend/gigcover/README.md`
- **API Documentation:** Backend module includes Postman collection

---

## Support & Issues

For bug reports or feature requests, please create an issue in the GitHub repository:
https://github.com/Aadhithya-balu/Sorcerers_of_code-Guidewire_Devtrails
