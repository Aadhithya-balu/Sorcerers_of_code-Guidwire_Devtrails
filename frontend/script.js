
// ==========================
// 🌍 GLOBAL VARIABLES
// ==========================
let locationData = null;
let userNumOrders = null;
let previous = null;
let currentClaimId = null;


// ==========================
// 📡 FETCH LOCATION DATA
// ==========================
async function fetchData() {
    const city = document.getElementById("city").value;

    if (!city) {
        showError("fetch-result", "Please enter a city");
        return;
    }

    try {
        const res = await fetch(`http://127.0.0.1:8000/fetch_location_data?city=${encodeURIComponent(city)}`);
        const data = await res.json();

        if (data.error) {
            showError("fetch-result", data.error);
            return;
        }

        locationData = data;

        // Auto-fill fields if present
        setValue("rainfall_mm", data.rainfall_mm);
        setValue("temperature_c", data.temperature_c);
        setValue("aqi", data.aqi);
        setValue("flood_alert", data.flood_alert);
        setValue("traffic_index", data.traffic_index);
        setValue("zone_risk_level", data.zone_risk_level);
        setValue("historical_disruption_rate", data.historical_disruption_rate);
        setValue("predicted_disruption_probability", data.predicted_disruption_probability);
        setValue("fraud_risk_score", data.fraud_risk_score);
        setValue("disruption_hours", data.disruption_hours);

        showSuccess("fetch-result", "Location data loaded successfully ✅");

    } catch (err) {
        showError("fetch-result", "Error fetching data");
    }
}


// ==========================
// 🧠 AI PREMIUM CALCULATION
// ==========================
async function calculatePremium() {

    try {
        const data = collectPremiumInputs();

        const res = await fetch("http://127.0.0.1:8000/calculate_ai_premium", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });

        const result = await res.json();

        displayPremium(result);

    } catch (err) {
        showError("premium-result", "Error calculating premium");
    }
}


// ==========================
// 📊 DASHBOARD LOAD
// ==========================
async function loadDashboard() {

    try {
        const data = collectPremiumInputs();

        const res = await fetch("http://127.0.0.1:8000/dashboard", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });

        const result = await res.json();

        displayDashboard(result);

    } catch (err) {
        showError("dashboard-result", "Error loading dashboard");
    }
}


// ==========================
// 💰 CLAIM SUBMISSION
// ==========================
async function submitClaim() {

    const data = {
        plan: getValue("claim-plan"),
        hours_wasted: parseFloat(getValue("hours_wasted")),
        hourly_rate: parseFloat(getValue("hourly_rate")),
        reason: getValue("disruption-reason") || "Disruption"
    };

    try {
        const res = await fetch("http://127.0.0.1:8000/insurance_claim", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });

        const result = await res.json();

        document.getElementById("claim-result").innerHTML = `
            <b>💰 Payout:</b> ₹${result.payout}<br>
            <b>Lost Income:</b> ₹${result.lost_income}<br>
            <b>Max Payout:</b> ₹${result.max_payout}
        `;

    } catch (err) {
        showError("claim-result", "Error processing claim");
    }
}


// ==========================
// 🚨 FRAUD DETECTION
// ==========================
async function checkFraud() {

    navigator.geolocation.getCurrentPosition(async (pos) => {

        const data = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timestamp: new Date().toISOString(),

            previous_latitude: previous ? previous.latitude : pos.coords.latitude,
            previous_longitude: previous ? previous.longitude : pos.coords.longitude,
            previous_timestamp: previous ? previous.timestamp : new Date().toISOString(),

            claim_amount: 50000,
            avg_claim_amount: 20000,
            num_claims_last_24h: 3
        };

        previous = data;

        try {
            const res = await fetch("http://127.0.0.1:8000/predict_fraud", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data)
            });

            const result = await res.json();

            document.getElementById("fraud-result").innerHTML =
                `<pre>${JSON.stringify(result, null, 2)}</pre>`;

        } catch {
            showError("fraud-result", "Error detecting fraud");
        }

    }, () => {
        alert("Enable location access!");
    });
}


// ==========================
// 📦 PROFILE SAVE
// ==========================
function saveProfile() {
    userNumOrders = parseInt(getValue("user-num-orders"));

    if (!userNumOrders || userNumOrders < 0) {
        showError("profile-result", "Invalid number of orders");
        return;
    }

    showSuccess("profile-result", `Saved! Orders: ${userNumOrders}`);
}


// ==========================
// 🧠 INPUT COLLECTION
// ==========================
function collectPremiumInputs() {

    return {
        rainfall_mm: parseFloat(getValue("rainfall_mm")),
        temperature_c: parseFloat(getValue("temperature_c")),
        aqi: parseInt(getValue("aqi")),
        flood_alert: parseInt(getValue("flood_alert")),
        zone_risk_level: getValue("zone_risk_level"),
        traffic_index: parseFloat(getValue("traffic_index")),

        avg_daily_income: parseFloat(getValue("avg_daily_income")),
        weekly_working_days: parseInt(getValue("weekly_working_days")),
        avg_daily_hours: parseFloat(getValue("avg_daily_hours")),

        historical_disruption_rate: parseFloat(getValue("historical_disruption_rate")),
        predicted_disruption_probability: parseFloat(getValue("predicted_disruption_probability")),
        fraud_risk_score: parseFloat(getValue("fraud_risk_score")),

        total_orders: parseInt(getValue("total_orders")),
        delivered_orders: parseInt(getValue("delivered_orders")),
        disruption_hours: parseFloat(getValue("disruption_hours"))
    };
}


// ==========================
// 🎨 DISPLAY FUNCTIONS
// ==========================
function displayPremium(result) {

    let riskLevel = "LOW ✅";
    if (result.risk_score > 0.6) riskLevel = "HIGH ⚠️";
    else if (result.risk_score > 0.3) riskLevel = "MEDIUM ⚠️";

    let html = `
        <h3>💰 Weekly Premium: ₹${result.weekly_premium}</h3>
        <p>⚠ Risk Score: ${result.risk_score} (${riskLevel})</p>
        <p>📉 Expected Loss: ₹${result.expected_loss}</p>
        <p>📦 Missed Orders: ${result.missed_orders}</p>
        <p>📊 Efficiency: ${(result.efficiency * 100).toFixed(0)}%</p>
        <p>⚡ Auto Claim: ${result.auto_claim_triggered}</p>
    `;

    document.getElementById("premium-result").innerHTML = html;
}


function displayDashboard(result) {

    let html = `
        <div>💰 Premium: ₹${result.weekly_premium}</div>
        <div>⚠ Risk: ${result.risk_score}</div>
        <div>📉 Loss: ₹${result.expected_loss}</div>
        <div>📦 Missed Orders: ${result.missed_orders}</div>
        <div>📊 Efficiency: ${(result.efficiency * 100).toFixed(0)}%</div>
    `;

    // Add payment schedule
    if (result.payment_schedule) {
        html += `
        <div style="margin-top: 20px; padding: 10px; background: #e8f4fd; border-radius: 5px;">
            <h4>💳 Payment Schedule</h4>
            <div>📅 Next Payment: ${result.payment_schedule.next_payment_date} at ${result.payment_schedule.next_payment_time}</div>
            <div>⏰ Days Until: ${result.payment_schedule.days_until_payment}</div>
            <div>💰 Amount: ₹${result.payment_schedule.weekly_premium}</div>
            <button onclick="showPaymentSection()">Manage Payments</button>
        </div>
        `;
    }

    // Add auto-claim status
    if (result.auto_claim) {
        let claimStatus = result.auto_claim.eligible ?
            `<span style="color: green;">✅ Eligible - Auto Payout: ₹${result.auto_claim.auto_payout}</span>` :
            `<span style="color: orange;">❌ Not Eligible</span>`;
        html += `
        <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px;">
            <h4>🤖 Auto-Claim Status</h4>
            <div>${claimStatus}</div>
            <div>Reason: ${result.auto_claim.reason}</div>
            <button onclick="showAutoClaimSection()">Manage Auto-Claims</button>
        </div>
        `;

        // Store auto-claim eligibility for later use
        window.autoClaimEligible = result.auto_claim.eligible;
    }

    document.getElementById("dashboard-result").innerHTML = html;
}


// ==========================
// 🛠 UTILITY FUNCTIONS
// ==========================
function getValue(id) {
    return document.getElementById(id)?.value;
}

function setValue(id, value) {
    if (document.getElementById(id)) {
        document.getElementById(id).value = value;
    }
}

function showError(id, msg) {
    document.getElementById(id).innerHTML = `<span class="error">${msg}</span>`;
}

function showSuccess(id, msg) {
    document.getElementById(id).innerHTML = `<span class="success">${msg}</span>`;
}

// ==============================
// 💳 PAYMENT MANAGEMENT
// ==============================
function showPaymentSection() {
    document.getElementById("payment-section").style.display = "block";
    document.getElementById("auto-claim-section").style.display = "none";
}

function viewPaymentHistory() {
    // Mock payment history
    const history = [
        { date: "2024-03-15", amount: 345.28, status: "Paid" },
        { date: "2024-03-08", amount: 320.50, status: "Paid" },
        { date: "2024-03-01", amount: 310.75, status: "Paid" }
    ];

    let html = "<h4>📜 Payment History</h4><ul>";
    history.forEach(payment => {
        html += `<li>${payment.date}: ₹${payment.amount} - ${payment.status}</li>`;
    });
    html += "</ul>";

    document.getElementById("payment-details").innerHTML = html;
}

function schedulePayment() {
    const now = new Date();
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
    nextFriday.setHours(17, 0, 0, 0);

    document.getElementById("payment-details").innerHTML = `
        <h4>⏰ Payment Scheduled</h4>
        <p>Next payment scheduled for: ${nextFriday.toLocaleString()}</p>
        <p style="color: green;">✅ Payment reminder set!</p>
    `;
}

// ==============================
// 🤖 AUTO-CLAIM MANAGEMENT
// ==============================
function showAutoClaimSection() {
    document.getElementById("auto-claim-section").style.display = "block";
    document.getElementById("payment-section").style.display = "none";

    const triggerBtn = document.getElementById("trigger-btn");
    if (window.autoClaimEligible) {
        triggerBtn.disabled = false;
        triggerBtn.innerText = "Trigger Auto-Claim";
    } else {
        triggerBtn.disabled = true;
        triggerBtn.innerText = "Not Eligible";
    }
}

function checkAutoClaimStatus() {
    // This would normally call the backend, but for demo we'll show current status
    document.getElementById("auto-claim-details").innerHTML = `
        <h4>🔍 Auto-Claim Status</h4>
        <p>Checking eligibility...</p>
        <p>Last checked: ${new Date().toLocaleString()}</p>
        <p>Status: Monitoring active</p>
    `;
}

function triggerAutoClaim() {
    // Simulate auto-claim trigger
    document.getElementById("auto-claim-details").innerHTML = `
        <h4>⚡ Auto-Claim Triggered</h4>
        <p style="color: green;">✅ Claim submitted automatically!</p>
        <p>Payout: ₹500 (estimated)</p>
        <p>Processing time: 24-48 hours</p>
    `;
    document.getElementById("trigger-btn").disabled = true;
    document.getElementById("trigger-btn").innerText = "Claim Submitted";
}