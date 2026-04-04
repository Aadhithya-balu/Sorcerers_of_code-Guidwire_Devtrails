# Clone Setup: Dependencies and Environment

Use this file after cloning the repository to prepare the app before running it.

## 1. Install Dependencies

From the repository root, install packages for all modules:

```powershell
npm run install:all
```

This installs dependencies for:
- `Backend/insurance-module`
- `Frontend/gigcover`
- `Automation`

## 2. Set Up Environment Variables

Create or verify the `.env` file inside `Backend/insurance-module`.

```powershell
MONGODB_URI=mongodb://localhost:27017/parametric-insurance
PORT=5000
NODE_ENV=development

RISK_PREDICTION_API=http://localhost:8000

WEATHER_API_KEY=2f4bb56e69406fc027a0c875a1a02b5b

IMD_API_ENDPOINT=https://api.imd.gov.in

LOCATION_API_KEY=AIzaSyC_PDgTjyjDmA8xY5hMJHtPPHxQJ-50U8s

LOG_LEVEL=debug
LOG_FILE=logs/app.log

JWT_SECRET=mTkiVSo8FsHFeL2nkkow4XBX3rrcBi1lhjqsJsFKLa3

RAZORPAY_KEY_ID=rzp_test_SYbYG2RQJp5oaQ
RAZORPAY_KEY_SECRET=e5q3x0PjRsLeWRSN7lA0qk13
```

If the frontend needs a custom API base URL, confirm it points to the backend at `http://localhost:5000`.

## 3. Verify MongoDB is Running Locally

Before running the app, make sure MongoDB is running on your machine. Use one of these methods:

### Method 1: Check MongoDB Service Status (Windows)

Open PowerShell as Administrator and run:

```powershell
Get-Service MongoDB
```

**Expected output if running:**
```
Status   Name               DisplayName
------   ----               -----------
Running  MongoDB            MongoDB
```

**If it shows "Stopped"**, start it with:

```powershell
Start-Service MongoDB
```

### Method 2: Check if MongoDB is Listening on Port 27017

Run this command to check if MongoDB is listening on port 27017:

```powershell
netstat -ano | findstr :27017
```

**Expected output if running:**
```
TCP    127.0.0.1:27017       0.0.0.0:0              LISTENING       12345
```

If you see "LISTENING", MongoDB is active. If no output appears, it's not running.

### Method 3: Test with mongosh (MongoDB Shell)

If MongoDB Shell is installed, you can test the connection:

```powershell
mongosh
```

**Expected output if successful:**
```
Current Mongosh Log ID: ...
Connecting to:          mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.0.0
Using MongoDB:          7.0.0
```

If it connects successfully, MongoDB is running. Type `exit` to close the shell.

---

**If MongoDB is NOT running:**
- Install MongoDB from https://www.mongodb.com/try/download/community
- Start the service using `Start-Service MongoDB` (Windows)
- Or check the MongoDB installation guide for your OS

## 4. Run the Application

After dependencies and environment setup are complete, start the app from the repository root:

```powershell
npm run dev:all
```

If a port is already in use, check it first:

```powershell
netstat -ano | findstr :5173
netstat -ano | findstr :5000
```

If needed, stop the process by PID:

```powershell
taskkill /PID <PID> /F
```

## 5. Access the App

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
