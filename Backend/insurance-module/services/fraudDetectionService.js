const Claim = require('../models/Claim');
const RiskData = require('../models/RiskData');
const User = require('../models/User');
const { DEFAULTS } = require('../utils/constants');
const logger = require('../utils/logger');

const APPROVAL_THRESHOLD = DEFAULTS.FRAUD_APPROVAL_THRESHOLD || 60;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

class FraudDetectionService {
    async analyzeClaim(claimData) {
        const {
            userId,
            policyId,
            claimType,
            riskScore,
            triggerEvidence,
            expectedLoss = 0
        } = claimData;

        const user = await User.findById(userId);
        const latestRisk = await RiskData.findOne({ userId }).sort({ createdAt: -1, timestamp: -1 });

        const locationConsistency = await this._locationConsistency(user, triggerEvidence);
        const behavioralAnalysis = this._behavioralAnalysis({ riskScore, expectedLoss, user });
        const platformGroundTruth = this._platformGroundTruth({ claimType, triggerEvidence, latestRisk });
        const officialDataCrossCheck = this._officialDataCrossCheck({ claimType, triggerEvidence, latestRisk });
        const fraudRingPattern = await this._fraudRingPattern({ policyId, userId, claimType });
        const mlAnomalyDetection = this._mlAnomalyDetection({
            locationConsistency,
            behavioralAnalysis,
            platformGroundTruth,
            officialDataCrossCheck,
            fraudRingPattern,
            riskScore,
            expectedLoss
        });

        const layers = {
            locationConsistency,
            behavioralAnalysis,
            platformGroundTruth,
            officialDataCrossCheck,
            fraudRingPattern,
            mlAnomalyDetection
        };

        const aggregateScore = clamp(
            Math.round(
                locationConsistency.score +
                behavioralAnalysis.score +
                platformGroundTruth.score +
                officialDataCrossCheck.score +
                fraudRingPattern.score +
                mlAnomalyDetection.score
            ),
            0,
            100
        );

        const flags = Object.entries(layers)
            .filter(([, layer]) => layer.triggered)
            .map(([layerName]) => this._toFraudFlag(layerName));

        const decision = aggregateScore >= APPROVAL_THRESHOLD ? 'REJECTED' : 'APPROVED';

        logger.debug('6-layer fraud detection completed', {
            userId,
            policyId,
            aggregateScore,
            decision,
            flags
        });

        return {
            score: aggregateScore,
            flags,
            primaryFlag: flags[0] || null,
            description: this._generateDescription(flags, aggregateScore, decision),
            evidence: layers,
            layers,
            layerCount: 6,
            mlScore: mlAnomalyDetection.modelScore,
            decision
        };
    }

    async _locationConsistency(user, triggerEvidence) {
        const claimLocation = triggerEvidence?.locationData;
        if (!user || user.latitude == null || user.longitude == null || !claimLocation) {
            return {
                triggered: false,
                score: 0,
                reason: 'Location baseline unavailable'
            };
        }

        const distance = this._distanceKm(
            user.latitude,
            user.longitude,
            claimLocation.latitude,
            claimLocation.longitude
        );

        const triggered = distance > 5;
        return {
            triggered,
            score: triggered ? 20 : 0,
            distanceKm: Number(distance.toFixed(2)),
            reason: triggered
                ? `Location mismatch detected (${distance.toFixed(1)} km from registered zone).`
                : 'Location consistency verified.'
        };
    }

    _behavioralAnalysis({ riskScore, expectedLoss, user }) {
        const dailyIncome = Number(user?.dailyIncome || 0);
        const lossRatio = dailyIncome > 0 ? expectedLoss / dailyIncome : 0;
        const suspiciousLowRisk = typeof riskScore === 'number' && riskScore < 15;
        const suspiciousLoss = lossRatio > 1.25;
        const triggered = suspiciousLowRisk || suspiciousLoss;

        return {
            triggered,
            score: triggered ? 14 : 0,
            lossRatio: Number(lossRatio.toFixed(2)),
            reason: triggered
                ? 'Behavioral anomaly detected in claimed loss pattern.'
                : 'Behavioral pattern appears normal.'
        };
    }

    _platformGroundTruth({ claimType, triggerEvidence, latestRisk }) {
        const deliveries = triggerEvidence?.activityData?.deliveriesCompleted ?? 0;
        const routeBlockages = latestRisk?.activityData?.routeBlockages ?? 0;
        let mismatch = false;

        if (claimType === 'TRAFFIC_BLOCKED' && routeBlockages < 3) mismatch = true;
        if ((claimType === 'HEAVY_RAIN' || claimType === 'THUNDERSTORM') && deliveries > 20) mismatch = true;

        return {
            triggered: mismatch,
            score: mismatch ? 14 : 0,
            reason: mismatch
                ? 'Platform-like activity does not support the disruption severity.'
                : 'Platform-like activity aligns with disruption.'
        };
    }

    _officialDataCrossCheck({ claimType, triggerEvidence, latestRisk }) {
        const observedRainfall = triggerEvidence?.weatherData?.rainfall ?? 0;
        const observedAqi = triggerEvidence?.weatherData?.aqi ?? 0;
        const latestRainfall = latestRisk?.weatherData?.rainfall ?? 0;
        const latestAqi = latestRisk?.weatherData?.aqi ?? 0;

        let mismatch = false;
        if (claimType === 'HEAVY_RAIN' && Math.max(observedRainfall, latestRainfall) < 50) mismatch = true;
        if (claimType === 'HIGH_POLLUTION' && Math.max(observedAqi, latestAqi) < 300) mismatch = true;
        if (claimType === 'EXTREME_HEAT' && (triggerEvidence?.weatherData?.temperature ?? 0) < 45) mismatch = true;

        return {
            triggered: mismatch,
            score: mismatch ? 14 : 0,
            reason: mismatch
                ? 'Official data thresholds not satisfied for the claimed disruption.'
                : 'Official data threshold cross-check passed.'
        };
    }

    async _fraudRingPattern({ policyId, userId, claimType }) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const similarClaims = await Claim.countDocuments({
            policyId,
            claimType,
            createdAt: { $gte: oneHourAgo }
        });
        const userVelocity = await Claim.countDocuments({
            userId,
            createdAt: { $gte: oneHourAgo }
        });
        const triggered = similarClaims >= 4 || userVelocity >= 2;

        return {
            triggered,
            score: triggered ? 14 : 0,
            similarClaims,
            userVelocity,
            reason: triggered
                ? 'Potential fraud-ring or high-velocity claim pattern detected.'
                : 'No suspicious ring/velocity pattern detected.'
        };
    }

    _mlAnomalyDetection({
        locationConsistency,
        behavioralAnalysis,
        platformGroundTruth,
        officialDataCrossCheck,
        fraudRingPattern,
        riskScore,
        expectedLoss
    }) {
        let modelScore = 8;
        if (locationConsistency.triggered) modelScore += 18;
        if (behavioralAnalysis.triggered) modelScore += 14;
        if (platformGroundTruth.triggered) modelScore += 14;
        if (officialDataCrossCheck.triggered) modelScore += 14;
        if (fraudRingPattern.triggered) modelScore += 18;
        if (typeof riskScore === 'number' && riskScore < 20) modelScore += 8;
        if (expectedLoss > 1500) modelScore += 8;
        modelScore = clamp(Math.round(modelScore), 0, 100);

        return {
            triggered: modelScore >= 45,
            score: Math.round(modelScore * 0.2),
            modelScore,
            reason: modelScore >= 45
                ? `ML anomaly score elevated (${modelScore}/100).`
                : `ML anomaly score normal (${modelScore}/100).`
        };
    }

    _toFraudFlag(layerName) {
        switch (layerName) {
            case 'locationConsistency':
                return 'LOCATION_MISMATCH';
            case 'behavioralAnalysis':
                return 'BEHAVIORAL_ANOMALY';
            case 'platformGroundTruth':
                return 'PLATFORM_DATA_MISMATCH';
            case 'officialDataCrossCheck':
                return 'OFFICIAL_DATA_MISMATCH';
            case 'fraudRingPattern':
                return 'FRAUD_RING_PATTERN';
            case 'mlAnomalyDetection':
                return 'ML_ANOMALY';
            default:
                return 'ML_ANOMALY';
        }
    }

    _generateDescription(flags, score, decision) {
        if (!flags.length) {
            return 'All 6 fraud layers passed. Claim approved for automatic payout.';
        }

        return `${decision === 'REJECTED' ? 'Claim rejected' : 'Claim approved with warnings'} after 6-layer fraud review. Score ${score}/100. Flags: ${flags.join(', ')}`;
    }

    _distanceKm(lat1, lon1, lat2, lon2) {
        if ([lat1, lon1, lat2, lon2].some((value) => typeof value !== 'number')) {
            return 0;
        }

        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

module.exports = {
    fraudDetectionService: new FraudDetectionService()
};
