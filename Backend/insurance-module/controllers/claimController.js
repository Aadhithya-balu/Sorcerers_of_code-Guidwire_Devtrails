const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const User = require('../models/User');
const FraudLog = require('../models/FraudLog');
const axios = require('axios');
const { asyncHandler, APIError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { fraudDetectionService } = require('../services/fraudDetectionService');
const { payoutService } = require('../services/payoutService');
const { CLAIM_STATUS, POLICY_STATUS, RESPONSE_CODES, ERRORS, DEFAULTS, PLANS } = require('../utils/constants');

// Submit Claim
exports.submitClaim = asyncHandler(async (req, res) => {
    const { policyId, claimType, riskScore, triggerEvidence } = req.body;

    // Validate policy
    const policy = await Policy.findById(policyId).populate('userId');
    if (!policy) {
        throw new APIError(ERRORS.POLICY_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    // Check policy status
    if (policy.status !== POLICY_STATUS.ACTIVE) {
        throw new APIError(
            `Cannot claim on ${policy.status.toLowerCase()} policy`,
            RESPONSE_CODES.FORBIDDEN
        );
    }

    // Check policy not expired
    if (new Date() > policy.expiryDate) {
        throw new APIError(ERRORS.POLICY_EXPIRED, RESPONSE_CODES.FORBIDDEN);
    }

    // Check claim limit
    const claimsThisMonth = await Claim.countDocuments({
        policyId,
        createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
    });

    const planConfig = require('../utils/constants').PLANS[policy.plan];
    if (claimsThisMonth >= planConfig.maxClaims) {
        throw new APIError(ERRORS.CLAIM_LIMIT_EXCEEDED, RESPONSE_CODES.FORBIDDEN);
    }

    // Run fraud detection
    const fraudAnalysis = await fraudDetectionService.analyzeClaim({
        userId: policy.userId._id,
        policyId,
        claimType,
        riskScore,
        triggerEvidence
    });

    logger.debug('Fraud analysis completed', {
        policyId,
        fraudScore: fraudAnalysis.score,
        flags: fraudAnalysis.flags
    });

    // Create claim
    const claim = await Claim.create({
        policyId,
        userId: policy.userId._id,
        claimType,
        riskScore,
        triggerEvidence,
        fraudScore: fraudAnalysis.score,
        fraudFlags: fraudAnalysis.flags,
        fraudFlagDescription: fraudAnalysis.description,
        fraudLayerEvidence: fraudAnalysis.layers,
        fraudLayerCount: fraudAnalysis.layerCount || 6,
        status: CLAIM_STATUS.SUBMITTED
    });

    // Log fraud analysis
    if (fraudAnalysis.score > DEFAULTS.FRAUD_SCORE_THRESHOLD) {
        await FraudLog.create({
            userId: policy.userId._id,
            policyId,
            claimId: claim._id,
            fraudType: fraudAnalysis.primaryFlag || 'PATTERN_ANOMALY',
            fraudScore: fraudAnalysis.score,
            severity: getSeverityLevel(fraudAnalysis.score),
            evidence: fraudAnalysis.evidence,
            decision: fraudAnalysis.score > 70 ? 'FLAGGED_FOR_REVIEW' : 'APPROVED'
        });

        logger.warn('High fraud risk detected', {
            claimId: claim._id,
            fraudScore: fraudAnalysis.score,
            flags: fraudAnalysis.flags
        });
    }

    res.status(RESPONSE_CODES.CREATED).json({
        success: true,
        message: 'Claim submitted successfully. Under review.',
        data: {
            claimId: claim._id,
            status: claim.status,
            fraudScore: claim.fraudScore,
            estimatedProcessingTime: '24-48 hours'
        }
    });
});


// Get Claim Details
exports.getClaimDetails = asyncHandler(async (req, res) => {
    const { claimId } = req.params;

    const claim = await Claim.findById(claimId)
        .populate('policyId', 'plan weeklyPremium coverageAmount')
        .populate('userId', 'name email phone');

    if (!claim) {
        throw new APIError(ERRORS.CLAIM_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    logger.debug('Claim details retrieved', { claimId });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: claim
    });
});

// Get User Claims
exports.getUserClaims = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status, skip = 0, limit = 10 } = req.query;

    const query = { userId };
    if (status) {
        query.status = status;
    }

    const claims = await Claim.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit));

    const total = await Claim.countDocuments(query);

    logger.debug('User claims retrieved', { userId, count: claims.length });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: claims,
        pagination: {
            total,
            skip: parseInt(skip),
            limit: parseInt(limit)
        }
    });
});

// Approve Claim
exports.approveClaim = asyncHandler(async (req, res) => {
    const { claimId } = req.params;
    const { approvedAmount, approvedBy, notes } = req.body;

    const claim = await Claim.findById(claimId).populate('policyId');
    if (!claim) {
        throw new APIError(ERRORS.CLAIM_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    if (claim.status !== CLAIM_STATUS.SUBMITTED && claim.status !== CLAIM_STATUS.UNDER_REVIEW) {
        throw new APIError('Claim cannot be approved in current status', RESPONSE_CODES.FORBIDDEN);
    }

    // Validate approved amount
    const maxAmount = claim.policyId.coverageAmount;
    if (approvedAmount > maxAmount) {
        throw new APIError(
            `Approved amount cannot exceed coverage amount (${maxAmount})`,
            RESPONSE_CODES.BAD_REQUEST
        );
    }

    claim.status = CLAIM_STATUS.APPROVED;
    claim.approvedAmount = approvedAmount;
    claim.approvedBy = approvedBy;
    claim.approvalNotes = notes;
    claim.reviewedAt = new Date();

    await claim.save();

    logger.info('Claim approved', {
        claimId,
        approvedAmount,
        approvedBy
    });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Claim approved successfully',
        data: {
            claimId: claim._id,
            status: claim.status,
            approvedAmount: claim.approvedAmount
        }
    });
});

// Reject Claim
exports.rejectClaim = asyncHandler(async (req, res) => {
    const { claimId } = req.params;
    const { reason, rejectedBy } = req.body;

    const claim = await Claim.findById(claimId);
    if (!claim) {
        throw new APIError(ERRORS.CLAIM_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    if (claim.status !== CLAIM_STATUS.SUBMITTED && claim.status !== CLAIM_STATUS.UNDER_REVIEW) {
        throw new APIError('Claim cannot be rejected in current status', RESPONSE_CODES.FORBIDDEN);
    }

    claim.status = CLAIM_STATUS.REJECTED;
    claim.rejectionReason = reason;
    claim.approvedBy = rejectedBy;
    claim.reviewedAt = new Date();

    await claim.save();

    logger.info('Claim rejected', {
        claimId,
        reason
    });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Claim rejected successfully',
        data: {
            claimId: claim._id,
            status: claim.status,
            reason: claim.rejectionReason
        }
    });
});

// Process Payout
exports.processPayout = asyncHandler(async (req, res) => {
    const { claimId } = req.params;
    const { payoutMethod = 'BANK_TRANSFER' } = req.body;

    const claim = await Claim.findById(claimId).populate('userId');
    if (!claim) {
        throw new APIError(ERRORS.CLAIM_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    if (claim.status !== CLAIM_STATUS.APPROVED) {
        throw new APIError('Only approved claims can be paid out', RESPONSE_CODES.FORBIDDEN);
    }

    try {
        // Process payout
        const payoutResult = await payoutService.processPayout({
            userId: claim.userId._id,
            claimId: claim._id,
            amount: claim.approvedAmount,
            method: payoutMethod
        });

        claim.status = CLAIM_STATUS.PAID;
        claim.payoutAmount = claim.approvedAmount;
        claim.payoutMethod = payoutMethod;
        claim.payoutDate = new Date();

        await claim.save();

        logger.info('Payout processed successfully', {
            claimId,
            amount: claim.approvedAmount,
            method: payoutMethod
        });

        res.status(RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: 'Payout processed successfully',
            data: {
                claimId: claim._id,
                status: claim.status,
                payoutAmount: claim.payoutAmount,
                payoutDate: claim.payoutDate
            }
        });
    } catch (error) {
        logger.error('Payout processing failed', { claimId, error: error.message });
        throw new APIError('Failed to process payout', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
    }
});

// Helper function to get severity level
function getSeverityLevel(fraudScore) {
    if (fraudScore >= 80) return 'CRITICAL';
    if (fraudScore >= 60) return 'HIGH';
    if (fraudScore >= 40) return 'MEDIUM';
    return 'LOW';
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toRiskLabel(score) {
    if (score >= 80) return 'EXTREME';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    return 'LOW';
}

const ALLOWED_RULE_DISRUPTIONS = new Set([
    'HEAVY_RAIN',
    'THUNDERSTORM',
    'EXTREME_HEAT',
    'FLOODING',
    'HIGH_POLLUTION',
    'CURFEW',
    'STRIKE',
    'UNEXPECTED_EVENT',
    'MARKET_CLOSURE',
    'PLATFORM_DOWNTIME',
    'TRAFFIC_BLOCKED'
]);

const OTHER_ALLOWED_REASONS = new Set([
    'CURFEW',
    'STRIKE',
    'UNEXPECTED_EVENT',
    'MARKET_CLOSURE',
    'PLATFORM_DOWNTIME'
]);

exports.simulateDemoClaim = asyncHandler(async (req, res) => {
    const {
        userId,
        selectedPlan = 'GIG_STANDARD',
        disruptionType,
        otherReason,
        rainfall = 0,
        aqi = 0,
        traffic = 0,
        lostIncome = 0
    } = req.body;

    if (!userId) {
        throw new APIError('User ID is required', RESPONSE_CODES.BAD_REQUEST);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    const requestedPolicyId = req.body.policyId || null;
    let candidatePolicy = null;

    if (requestedPolicyId) {
        candidatePolicy = await Policy.findOne({ _id: requestedPolicyId, userId: user._id });
    }

    if (!candidatePolicy) {
        candidatePolicy = await Policy.findOne({ userId: user._id })
            .sort({ updatedAt: -1, startDate: -1, createdAt: -1 });
    }

    const hasSuccessfulBillingRecord = Boolean(
        candidatePolicy?.lastPaymentId ||
        Number(candidatePolicy?.amountPaid || 0) > 0 ||
        (Array.isArray(candidatePolicy?.billingHistory) &&
            candidatePolicy.billingHistory.some((entry) => entry?.status === 'PAID'))
    );

    const policyPaymentVerified = Boolean(
        candidatePolicy &&
        candidatePolicy.status === POLICY_STATUS.ACTIVE &&
        candidatePolicy.paymentStatus === 'PAID' &&
        hasSuccessfulBillingRecord
    );

    const normalizedDisruption = String(disruptionType || '').toUpperCase();
    const normalizedOtherReason = String(otherReason || '').toUpperCase();
    const effectiveDisruption = normalizedDisruption === 'OTHER'
        ? normalizedOtherReason
        : normalizedDisruption;

    const baselineIncome = Number(user.dailyIncome || 0);
    const normalizedLostIncome = Math.max(0, Number(lostIncome) || 0);
    const incomeLossPercent = baselineIncome > 0
        ? clamp(Math.round((normalizedLostIncome / baselineIncome) * 100), 0, 100)
        : 0;

    const weatherTriggerPassed =
        (effectiveDisruption === 'HEAVY_RAIN' && rainfall >= 50) ||
        (effectiveDisruption === 'HIGH_POLLUTION' && aqi >= 400) ||
        (effectiveDisruption === 'TRAFFIC_BLOCKED' && traffic >= 4) ||
        ['THUNDERSTORM', 'EXTREME_HEAT', 'FLOODING', 'CURFEW', 'STRIKE', 'UNEXPECTED_EVENT', 'MARKET_CLOSURE', 'PLATFORM_DOWNTIME'].includes(effectiveDisruption);

    const disruptionInRules = ALLOWED_RULE_DISRUPTIONS.has(effectiveDisruption);
    const otherReasonValid =
        normalizedDisruption !== 'OTHER' ||
        OTHER_ALLOWED_REASONS.has(normalizedOtherReason);

    const disruptionDetected = policyPaymentVerified && disruptionInRules && otherReasonValid && weatherTriggerPassed;
    const incomeLossValidated = policyPaymentVerified && baselineIncome > 0 && normalizedLostIncome > 0 && incomeLossPercent >= 5;

    const triggerEvidence = {
        weatherData: {
            rainfall: Number(rainfall) || 0,
            aqi: Number(aqi) || 0,
            temperature: Number(req.body.temperature || 30),
            timestamp: new Date()
        },
        activityData: {
            deliveriesCompleted: Math.max(0, 20 - Math.round(traffic * 2)),
            workingHours: Number(req.body.workingHours || 8),
            timestamp: new Date()
        },
        locationData: {
            latitude: user.latitude,
            longitude: user.longitude,
            address: user.location,
            timestamp: new Date()
        }
    };

    let fraudAnalysis = {
        decision: 'REJECTED',
        score: 0,
        description: 'Skipped because no active paid policy was found.',
        flags: ['POLICY_PAYMENT_NOT_VERIFIED'],
        layers: {
            policyPayment: {
                triggered: true,
                score: 100,
                reason: 'No active paid policy found for demo claim simulation.'
            }
        }
    };

    if (policyPaymentVerified) {
        fraudAnalysis = await fraudDetectionService.analyzeClaim({
            userId: user._id,
            policyId: candidatePolicy?._id || null,
            claimType: disruptionInRules ? effectiveDisruption : 'UNEXPECTED_EVENT',
            riskScore: clamp(
                Math.round(
                    (Number(rainfall) > 0 ? Number(rainfall) / 2 : 0) +
                    (Number(aqi) > 0 ? Number(aqi) / 10 : 0) +
                    (Number(traffic) || 0) * 10
                ),
                0,
                100
            ),
            triggerEvidence,
            expectedLoss: normalizedLostIncome
        });
    }

    const allFraudLayersPassed = policyPaymentVerified && fraudAnalysis.decision !== 'REJECTED';
    const shouldRejectCoverageReason = !disruptionInRules || !otherReasonValid;
    const shouldReject = !policyPaymentVerified || shouldRejectCoverageReason || !disruptionDetected || !incomeLossValidated || !allFraudLayersPassed;

    // Plan-based payout multipliers (basic low, standard med, premium high)
    const planMultipliers = {
      'GIG_BASIC': 0.6,
      'BASIC': 0.6,
      'GIG_STANDARD': 0.85,
      'STANDARD': 0.85,
      'GIG_PREMIUM': 1.1,
      'PREMIUM': 1.1
    };
const planKey = selectedPlan;
    const planMultiplier = planMultipliers[selectedPlan] || 0.85;
    const severityMultiplier =
        effectiveDisruption === 'FLOODING' || effectiveDisruption === 'CURFEW' ? 1.6 :
        effectiveDisruption === 'THUNDERSTORM' || effectiveDisruption === 'STRIKE' ? 1.4 :
        effectiveDisruption === 'HIGH_POLLUTION' ? 1.1 : 1.2;
    const rawClaimAmount = Math.round(normalizedLostIncome * severityMultiplier * planMultiplier);
    const maxCoverage = {
      'GIG_BASIC': 600,
      'BASIC': 500,
      'GIG_STANDARD': 1200,
      'STANDARD': 1000,
      'GIG_PREMIUM': 2500,
      'PREMIUM': 2000
    }[selectedPlan] || 1200;
    const claimAmount = shouldReject ? 0 : Math.min(maxCoverage, rawClaimAmount);

    const workflow = {
        policyPaymentVerified: {
            passed: policyPaymentVerified,
            reason: policyPaymentVerified
                ? 'Active policy with completed payment was verified.'
                : 'No active paid policy found. Demo claim rejected at step 1.'
        },
        disruptionDetected: {
            passed: disruptionDetected,
            reason: disruptionDetected
                ? 'Disruption threshold validated by rules and sensor inputs.'
                : !policyPaymentVerified
                ? 'Skipped because policy payment verification failed.'
                : shouldRejectCoverageReason
                ? 'Reason is outside covered parametric rules.'
                : 'Trigger threshold not met for selected disruption.'
        },
        incomeLossValidated: {
            passed: incomeLossValidated,
            reason: incomeLossValidated
                ? `Income loss validated at ${incomeLossPercent}%.`
                : !policyPaymentVerified
                ? 'Skipped because policy payment verification failed.'
                : 'Income loss is below minimum validation threshold.'
        },
        fraudLayers: fraudAnalysis.layers,
        fraudDecision: {
            passed: allFraudLayersPassed,
            score: fraudAnalysis.score,
            reason: fraudAnalysis.description
        },
        payoutCalculated: {
            passed: !shouldReject,
            amount: claimAmount,
            plan: planKey,
            reason: shouldReject ? 'Claim rejected before payout calculation.' : 'Claim amount computed from selected plan and validated loss.'
        },
        payoutSent: {
            passed: !shouldReject,
            reason: shouldReject ? 'No payout sent due to rejection.' : 'Payout queued for wallet transfer.'
        },
        notificationSent: {
            passed: true,
            reason: 'Push/in-app notification event emitted.'
        }
    };

    try {
        const automationBase = process.env.AUTOMATION_API_URL || 'http://localhost:3000';
        await axios.post(`${automationBase}/api/v1/automation/notifications/send`, {
            userId: user._id,
            type: shouldReject ? 'claim_rejected' : 'claim_approved',
            message: shouldReject
                ? 'Demo claim rejected after workflow checks.'
                : `Demo claim approved. Payout estimate: Rs ${claimAmount}.`,
            data: {
                claimAmount,
                selectedPlan: planKey,
                disruptionType: effectiveDisruption,
                fraudScore: fraudAnalysis.score
            }
        }, { timeout: 5000 });
    } catch (error) {
        workflow.notificationSent = {
            passed: false,
            reason: 'Automation notification API unavailable; in-app notification fallback can be used.'
        };
    }

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: shouldReject ? 'Demo claim rejected by workflow checks' : 'Demo claim processed successfully',
        data: {
            selectedPlan: planKey,
            riskLabel: toRiskLabel(fraudAnalysis.score),
            disruptionType: effectiveDisruption,
            baselineIncome,
            lostIncome: normalizedLostIncome,
            incomeLossPercent,
            approved: !shouldReject,
            rejectionReason: !policyPaymentVerified
                ? 'No active paid policy found. Please activate policy with payment before running demo claim.'
                : shouldRejectCoverageReason
                ? 'This disruption reason is outside policy rules. Income-loss payout rejected.'
                : shouldReject
                ? 'Workflow checks failed'
                : null,
            claimAmount,
            fraudScore: fraudAnalysis.score,
            fraudFlags: fraudAnalysis.flags,
            workflow
        }
    });
});

module.exports = exports;
