const axios = require('axios');
const RiskData = require('../models/RiskData');
const Policy = require('../models/Policy');
const Claim = require('../models/Claim');
const FraudLog = require('../models/FraudLog');
const { calculatePremium } = require('./premiumService');
const { payoutService } = require('./payoutService');
const { CLAIM_STATUS } = require('../utils/constants');
const { fraudDetectionService } = require('./fraudDetectionService');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function mapRiskLevel(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
}

function buildTrafficProfile(platform = 'OTHER') {
    const hour = new Date().getHours();
    const peakHour = (hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 21);
    const baseBlockages = peakHour ? 3 : 1;
    const platformBoost = ['SWIGGY', 'ZOMATO'].includes(platform.toUpperCase()) ? 1 : 0;
    const routeBlockages = clamp(baseBlockages + platformBoost, 0, 5);

    return {
        activeDeliveries: peakHour ? 8 : 5,
        workingHours: peakHour ? 8 : 6,
        avgDeliveryTime: peakHour ? 32 : 24,
        routeBlockages,
        distanceCovered: peakHour ? 48 : 30
    };
}

function calculateEnvironmentalRisk({ rainfall, aqi, temperature, windSpeed }) {
    let risk = 0;

    if (rainfall > 50) risk += Math.min(((rainfall - 50) / 50) * 40, 40);
    if (aqi > 200) risk += Math.min(((aqi - 200) / 100) * 35, 35);
    if (temperature > 45 || temperature < 5) risk += 15;
    else if (temperature > 40 || temperature < 10) risk += 10;
    if (windSpeed > 50) risk += 10;

    return clamp(Math.round(risk), 0, 100);
}

function calculateLocationRisk(user) {
    const location = (user.location || '').toLowerCase();
    const hotspotRules = [
        {
            terms: ['electronic city', 'whitefield', 'bellandur', 'marathahalli', 'koramangala', 'indiranagar', 'sarjapur'],
            score: 92
        },
        {
            terms: ['t. nagar', 't nagar', 'omr', 'velachery', 'anna nagar', 'adyar'],
            score: 68
        },
        {
            terms: ['ukkadam', 'gandhipuram', 'peelamedu', 'race course'],
            score: 58
        },
        {
            terms: ['sai baba colony', 'rs puram', 'sukrawarpettai'],
            score: 32
        },
        {
            terms: ['mumbai', 'bandra', 'andheri', 'powai'],
            score: 48
        },
        {
            terms: ['delhi', 'connaught', 'gurugram', 'noida'],
            score: 40
        }
    ];

    let score = 22;

    if (location.includes('bangalore') || location.includes('bengaluru')) {
        score = Math.max(score, 72);
    }
    if (location.includes('chennai')) {
        score = Math.max(score, 52);
    }
    if (location.includes('coimbatore')) {
        score = Math.max(score, 34);
    }

    for (const rule of hotspotRules) {
        if (rule.terms.some((term) => location.includes(term))) {
            score = Math.max(score, rule.score);
        }
    }

    return clamp(score, 0, 100);
}

function calculateActivityRisk(user, trafficProfile) {
    const platform = (user.platform || '').toUpperCase();
    let risk = ['SWIGGY', 'ZOMATO'].includes(platform) ? 28 : 20;
    risk += trafficProfile.routeBlockages * 8;
    return clamp(risk, 0, 100);
}

function calculateHistoricalRisk(claimCount) {
    return clamp(claimCount * 12, 0, 60);
}

function aggregateRisk({ environmentalRisk, locationRisk, activityRisk, historicalRisk }) {
    const zoneBoost = locationRisk >= 80 ? 15 : locationRisk >= 60 ? 8 : 0;
    return clamp(
        Math.round(
            environmentalRisk * 0.1 +
            locationRisk * 0.6 +
            activityRisk * 0.2 +
            historicalRisk * 0.1 +
            zoneBoost
        ),
        0,
        100
    );
}


function getEstimatedDailyIncome(platform = 'OTHER') {
    switch ((platform || '').toUpperCase()) {
        case 'SWIGGY':
            return 1200;
        case 'ZOMATO':
            return 1100;
        case 'RIKSHAW':
            return 950;
        default:
            return 850;
    }
}

function getDynamicRiskFactor(overallRisk, weatherData, trafficProfile) {
    const riskBase = overallRisk / 100;
    const rainfallBoost = (weatherData?.rainfall || 0) >= 50 ? 0.2 : 0;
    const pollutionBoost = (weatherData?.aqi || 0) >= 180 ? 0.15 : 0;
    const trafficBoost = (trafficProfile?.routeBlockages || 0) >= 4 ? 0.1 : 0;
    return clamp(Number((0.9 + riskBase + rainfallBoost + pollutionBoost + trafficBoost).toFixed(2)), 0.85, 2.0);
}

function getTriggerCandidates(policy, weatherData, trafficProfile, overallRisk) {
    const thresholds = policy?.triggerThresholds || {};
    const candidates = [];

    if ((weatherData?.rainfall || 0) >= (thresholds.rainfall || 50)) {
        candidates.push({
            claimType: 'HEAVY_RAIN',
            severity: weatherData.rainfall >= 80 ? 0.75 : 0.55
        });
    }

    if ((weatherData?.aqi || 0) >= (thresholds.aqi || 200)) {
        candidates.push({
            claimType: 'HIGH_POLLUTION',
            severity: weatherData.aqi >= 240 ? 0.65 : 0.45
        });
    }

    if ((trafficProfile?.routeBlockages || 0) >= 4 || overallRisk >= 75) {
        candidates.push({
            claimType: 'TRAFFIC_BLOCKED',
            severity: (trafficProfile?.routeBlockages || 0) >= 5 ? 0.6 : 0.45
        });
    }

    return candidates;
}

async function updatePolicyPricing(activePolicy, user, overallRisk, weatherData, trafficProfile) {
    if (!activePolicy) {
        return null;
    }

    const riskFactor = getDynamicRiskFactor(overallRisk, weatherData, trafficProfile);
    const pricing = calculatePremium(activePolicy.plan, riskFactor, user.workerType || 'GIG');

    activePolicy.riskFactor = riskFactor;
    activePolicy.weeklyPremium = pricing.weeklyPremium;
    activePolicy.coverageAmount = pricing.coverageAmount;
    activePolicy.updatedAt = new Date();
    await activePolicy.save();

    return activePolicy;
}

async function autoProcessTriggeredClaim(user, activePolicy, riskRecord) {
    if (!activePolicy) {
        return null;
    }

    const overallRisk = riskRecord?.riskMetrics?.overallRisk || 0;
    const triggerCandidates = getTriggerCandidates(
        activePolicy,
        riskRecord.weatherData,
        riskRecord.activityData,
        overallRisk
    );

    if (triggerCandidates.length === 0) {
        return null;
    }

    const trigger = triggerCandidates[0];
    const duplicateWindowStart = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const existingClaim = await Claim.findOne({
        userId: user._id,
        policyId: activePolicy._id,
        claimType: trigger.claimType,
        createdAt: { $gte: duplicateWindowStart }
    }).sort({ createdAt: -1 });

    if (existingClaim) {
        return existingClaim;
    }

    const estimatedLoss = Math.round(getEstimatedDailyIncome(user.platform) * trigger.severity);
    const approvedAmount = Math.min(activePolicy.coverageAmount, Math.round(estimatedLoss * 1.1));
    const triggerEvidence = {
        weatherData: {
            rainfall: riskRecord?.weatherData?.rainfall,
            aqi: riskRecord?.weatherData?.aqi,
            temperature: riskRecord?.weatherData?.temperature,
            timestamp: riskRecord.timestamp
        },
        locationData: {
            latitude: riskRecord?.locationData?.latitude,
            longitude: riskRecord?.locationData?.longitude,
            address: riskRecord?.locationData?.address,
            timestamp: riskRecord.timestamp
        },
        activityData: {
            deliveriesCompleted: riskRecord?.activityData?.activeDeliveries,
            workingHours: riskRecord?.activityData?.workingHours,
            timestamp: riskRecord.timestamp
        }
    };
    const fraudAnalysis = await fraudDetectionService.analyzeClaim({
        userId: user._id,
        policyId: activePolicy._id,
        claimType: trigger.claimType,
        riskScore: overallRisk,
        triggerEvidence,
        expectedLoss: approvedAmount
    });

    const claim = await Claim.create({
        policyId: activePolicy._id,
        userId: user._id,
        claimType: trigger.claimType,
        riskScore: overallRisk,
        triggerEvidence,
        fraudScore: fraudAnalysis.score,
        fraudFlags: fraudAnalysis.flags,
        fraudFlagDescription: fraudAnalysis.description,
        fraudLayerEvidence: fraudAnalysis.layers,
        fraudLayerCount: fraudAnalysis.layerCount || 6,
        status: fraudAnalysis.decision === 'REJECTED' ? CLAIM_STATUS.REJECTED : CLAIM_STATUS.APPROVED,
        approvedAmount: fraudAnalysis.decision === 'REJECTED' ? 0 : approvedAmount,
        approvalNotes: fraudAnalysis.decision === 'REJECTED' ? undefined : `Auto-approved parametric payout for ${trigger.claimType}`,
        approvedBy: fraudAnalysis.decision === 'REJECTED' ? undefined : 'AUTOMATION_ENGINE',
        reviewedAt: new Date(),
        rejectionReason: fraudAnalysis.decision === 'REJECTED'
            ? 'Auto-rejected by 6-layer fraud detection'
            : undefined
    });

    if (fraudAnalysis.score > 0 || fraudAnalysis.flags.length > 0) {
        await FraudLog.create({
            userId: user._id,
            policyId: activePolicy._id,
            claimId: claim._id,
            fraudType: fraudAnalysis.primaryFlag || 'PATTERN_ANOMALY',
            fraudScore: fraudAnalysis.score,
            severity: fraudAnalysis.score >= 80 ? 'CRITICAL' : fraudAnalysis.score >= 60 ? 'HIGH' : fraudAnalysis.score >= 40 ? 'MEDIUM' : 'LOW',
            evidence: fraudAnalysis.layers,
            decision: fraudAnalysis.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED',
            actionTaken: fraudAnalysis.decision === 'REJECTED' ? 'CLAIM_REJECTED' : 'CLAIM_APPROVED'
        });
    }

    if (fraudAnalysis.decision === 'REJECTED') {
        return claim;
    }

    await payoutService.processPayout({
        userId: user._id,
        claimId: claim._id,
        amount: approvedAmount,
        method: 'WALLET'
    });

    claim.status = CLAIM_STATUS.PAID;
    claim.payoutAmount = approvedAmount;
    claim.payoutMethod = 'WALLET';
    claim.payoutDate = new Date();
    await claim.save();

    return claim;
}

async function fetchOpenWeatherSnapshot(latitude, longitude) {
    const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        return null;
    }

    const [weatherRes, airRes] = await Promise.all([
        axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: { lat: latitude, lon: longitude, appid: apiKey, units: 'metric' },
            timeout: 10000
        }),
        axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
            params: { lat: latitude, lon: longitude, appid: apiKey },
            timeout: 10000
        })
    ]);

    const weather = weatherRes.data;
    const air = airRes.data;

    return {
        rainfall: weather.rain?.['1h'] || weather.rain?.['3h'] || 0,
        temperature: weather.main?.temp ?? 25,
        humidity: weather.main?.humidity ?? 60,
        windSpeed: weather.wind?.speed ?? 0,
        aqi: (air.list?.[0]?.main?.aqi || 1) * 50,
        address: weather.name || '',
    };
}

async function geocodeLocation(locationText) {
    const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
    if (!apiKey || !locationText) {
        return null;
    }

    try {
        const response = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
            params: {
                q: locationText,
                limit: 1,
                appid: apiKey
            },
            timeout: 10000
        });

        const match = response.data?.[0];
        if (!match) {
            return null;
        }

        return {
            latitude: match.lat,
            longitude: match.lon,
            address: [match.name, match.state, match.country].filter(Boolean).join(', ')
        };
    } catch (error) {
        return null;
    }
}

function mapModelLevelToScore(level) {
    switch ((level || '').toUpperCase()) {
        case 'CRITICAL':
            return 95;
        case 'HIGH':
        case 'VERY_HIGH':
            return 80;
        case 'MEDIUM':
            return 60;
        case 'LOW':
            return 30;
        case 'VERY_LOW':
            return 15;
        default:
            return null;
    }
}

async function fetchModelRiskScore({ user, policyId, weatherData, trafficProfile, claimCount }) {
    const baseUrl = process.env.PYTHON_SERVICE_URL || process.env.RISK_PREDICTION_URL || 'http://localhost:5001';
    const latitude = user.latitude;
    const longitude = user.longitude;

    if (latitude == null || longitude == null) {
        return null;
    }

    try {
        const response = await axios.post(`${baseUrl}/api/predict`, {
            user_id: String(user._id),
            policy_id: policyId ? String(policyId) : null,
            weather_data: {
                rainfall: weatherData.rainfall,
                temperature: weatherData.temperature,
                humidity: weatherData.humidity,
                aqi: weatherData.aqi,
                wind_speed: weatherData.windSpeed
            },
            location_data: {
                latitude,
                longitude,
                address: user.location
            },
            activity_data: {
                deliveries_completed: trafficProfile.activeDeliveries,
                working_hours: trafficProfile.workingHours,
                avg_speed: trafficProfile.avgDeliveryTime ? clamp(60 - trafficProfile.avgDeliveryTime, 0, 60) : 0,
                stops: trafficProfile.routeBlockages
            },
            historical_claims: claimCount
        }, {
            timeout: 10000
        });

        const level = response.data?.risk_level || response.data?.riskLevel || response.data?.risk_score;
        return mapModelLevelToScore(level);
    } catch (error) {
        return null;
    }
}

async function computeLiveRiskSnapshot(user) {
    const activePolicy = await Policy.findOne({ userId: user._id, status: 'ACTIVE' }).sort({ createdAt: -1 });
    const claimCount = await Claim.countDocuments({ userId: user._id });
    const latestStored = await RiskData.findOne({ userId: user._id }).sort({ createdAt: -1, timestamp: -1 });

    const geocoded = (user.latitude == null || user.longitude == null)
        ? await geocodeLocation(user.location)
        : null;

    const latitude = user.latitude ?? latestStored?.locationData?.latitude ?? geocoded?.latitude;
    const longitude = user.longitude ?? latestStored?.locationData?.longitude ?? geocoded?.longitude;

    let weatherSnapshot = null;
    if (latitude != null && longitude != null) {
        try {
            weatherSnapshot = await fetchOpenWeatherSnapshot(latitude, longitude);
        } catch (error) {
            weatherSnapshot = null;
        }
    }

    const fallbackWeather = latestStored?.weatherData || {};
    const weatherData = {
        rainfall: weatherSnapshot?.rainfall ?? fallbackWeather.rainfall ?? null,
        temperature: weatherSnapshot?.temperature ?? fallbackWeather.temperature ?? null,
        humidity: weatherSnapshot?.humidity ?? fallbackWeather.humidity ?? null,
        aqi: weatherSnapshot?.aqi ?? fallbackWeather.aqi ?? null,
        windSpeed: weatherSnapshot?.windSpeed ?? fallbackWeather.windSpeed ?? null
    };

    const trafficProfile = buildTrafficProfile(user.platform);
    const environmentalRisk = calculateEnvironmentalRisk(weatherData);
    const locationRisk = calculateLocationRisk(user);
    const activityRisk = calculateActivityRisk(user, trafficProfile);
    const historicalRisk = calculateHistoricalRisk(claimCount);
    const heuristicRisk = aggregateRisk({ environmentalRisk, locationRisk, activityRisk, historicalRisk });
    const modelRisk = await fetchModelRiskScore({
        user,
        policyId: activePolicy?._id,
        weatherData,
        trafficProfile,
        claimCount
    });
    const overallRisk = modelRisk == null ? heuristicRisk : Math.round((heuristicRisk * 0.6) + (modelRisk * 0.4));

    let riskRecord = await RiskData.create({
        userId: user._id,
        policyId: activePolicy?._id,
        weatherData,
        locationData: {
            latitude,
            longitude,
            address: weatherSnapshot?.address || geocoded?.address || latestStored?.locationData?.address || user.location,
            zone: latestStored?.locationData?.zone || user.location,
            riskZone: mapRiskLevel(overallRisk)
        },
        activityData: trafficProfile,
        riskMetrics: {
            environmentalRisk,
            locationRisk,
            activityRisk,
            overallRisk
        },
        dataSource: weatherSnapshot ? 'OPENWEATHER' : 'MANUAL',
        timestamp: new Date()
    });

    const updatedPolicy = await updatePolicyPricing(activePolicy, user, overallRisk, weatherData, trafficProfile);
    const autoClaim = await autoProcessTriggeredClaim(user, updatedPolicy || activePolicy, riskRecord);

    if (autoClaim) {
        riskRecord = await RiskData.findByIdAndUpdate(
            riskRecord._id,
            {
                $set: {
                    policyId: updatedPolicy?._id || activePolicy?._id
                }
            },
            { new: true }
        );
    }

    return riskRecord;
}

module.exports = {
    computeLiveRiskSnapshot
};
