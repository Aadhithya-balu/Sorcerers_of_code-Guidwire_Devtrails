const Policy = require('../models/Policy');
const User = require('../models/User');
const RiskData = require('../models/RiskData');
const axios = require('axios');
const crypto = require('crypto');
const { calculatePremium } = require('../services/premiumService');
const { asyncHandler, APIError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { PLANS, POLICY_STATUS, USER_STATUS, RESPONSE_CODES, ERRORS, DEFAULTS } = require('../utils/constants');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function readEnvValue(keys) {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return '';
}

function getRazorpayConfig() {
    const keyId = readEnvValue([
        'RAZORPAY_KEY_ID',
        'RAZORPAY_TEST_KEY_ID',
        'RAZORPAY_KEY',
        'VITE_RAZORPAY_KEY_ID'
    ]);
    const keySecret = readEnvValue([
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_TEST_KEY_SECRET',
        'RAZORPAY_SECRET',
        'VITE_RAZORPAY_KEY_SECRET'
    ]);

    if (!keyId || !keySecret) {
        throw new APIError(
            'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Backend/insurance-module/.env',
            RESPONSE_CODES.SERVICE_UNAVAILABLE
        );
    }

    return { keyId, keySecret };
}

function toRiskFactor(overallRisk) {
    if (typeof overallRisk !== 'number') {
        return 1;
    }

    return clamp(Number((overallRisk / 50).toFixed(2)), DEFAULTS.RISK_FACTOR_MIN, DEFAULTS.RISK_FACTOR_MAX);
}

function getBillingWindow() {
    const cycleStart = new Date();
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 7);
    return { cycleStart, cycleEnd };
}

async function ensureVerifiedUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    const kycVerified = Boolean(user.kyc?.verified);
    const accountIsActive = user.accountStatus === USER_STATUS.ACTIVE;

    if (kycVerified && !accountIsActive) {
        user.accountStatus = USER_STATUS.ACTIVE;
        user.updatedAt = new Date();
        await user.save();
    }

    if (!kycVerified && user.accountStatus !== USER_STATUS.ACTIVE) {
        throw new APIError('User account not verified', RESPONSE_CODES.FORBIDDEN);
    }

    return user;
}

async function createRazorpayOrder({ amount, receipt, notes }) {
    const { keyId, keySecret } = getRazorpayConfig();

    try {
        const response = await axios.post(
            'https://api.razorpay.com/v1/orders',
            {
                amount,
                currency: 'INR',
                receipt,
                notes
            },
            {
                auth: {
                    username: keyId,
                    password: keySecret
                },
                timeout: DEFAULTS.API_TIMEOUT_MS
            }
        );

        return response.data;
    } catch (error) {
        const status = error.response?.status;
        const razorpayMessage =
            error.response?.data?.error?.description ||
            error.response?.data?.error?.reason ||
            error.response?.data?.message ||
            error.message;

        logger.error('Failed to create Razorpay order', {
            message: error.message,
            response: error.response?.data,
            status,
            code: error.code
        });

        if (status === RESPONSE_CODES.UNAUTHORIZED || status === RESPONSE_CODES.FORBIDDEN) {
            throw new APIError(`Razorpay auth failed: ${razorpayMessage}`, RESPONSE_CODES.UNAUTHORIZED);
        }

        if (status) {
            throw new APIError(`Razorpay error: ${razorpayMessage}`, RESPONSE_CODES.SERVICE_UNAVAILABLE);
        }

        if (['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN'].includes(error.code)) {
            throw new APIError('Razorpay API unreachable. Check internet or firewall access from the backend.', RESPONSE_CODES.SERVICE_UNAVAILABLE);
        }

        throw new APIError(`Unable to create Razorpay payment order: ${razorpayMessage}`, RESPONSE_CODES.SERVICE_UNAVAILABLE);
    }
}

async function fetchRazorpayPayment(paymentId) {
    const { keyId, keySecret } = getRazorpayConfig();

    const response = await axios.get(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        auth: {
            username: keyId,
            password: keySecret
        },
        timeout: DEFAULTS.API_TIMEOUT_MS
    });

    return response.data;
}

// Create Policy
exports.createPolicy = asyncHandler(async (req, res) => {
    const { userId, plan, riskFactor = 1, workerType, triggerTypes } = req.body;

    // Validate plan
    if (!PLANS[plan]) {
        throw new APIError(`Invalid plan: ${plan}`, RESPONSE_CODES.BAD_REQUEST);
    }

    // Validate risk factor
    if (riskFactor < DEFAULTS.RISK_FACTOR_MIN || riskFactor > DEFAULTS.RISK_FACTOR_MAX) {
        throw new APIError(
            `Risk factor must be between ${DEFAULTS.RISK_FACTOR_MIN} and ${DEFAULTS.RISK_FACTOR_MAX}`,
            RESPONSE_CODES.BAD_REQUEST
        );
    }

    // Check user exists and is verified
    const user = await User.findById(userId);
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    if (user.accountStatus !== USER_STATUS.ACTIVE) {
        throw new APIError('User account not verified', RESPONSE_CODES.FORBIDDEN);
    }

    // Calculate pricing
    const finalWorkerType = workerType || user.workerType;
    const pricing = calculatePremium(plan, riskFactor, finalWorkerType);

    // Create policy
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + DEFAULTS.POLICY_DURATION_DAYS);

    const policy = await Policy.create({
        userId,
        plan,
        workerType: finalWorkerType,
        weeklyPremium: pricing.weeklyPremium,
        coverageAmount: pricing.coverageAmount,
        riskFactor,
        normalizedPlanCode: pricing.pricingBreakdown?.normalizedPlan || plan,
        lockedPayableAmount: pricing.pricingBreakdown?.lockedPayableAmount || pricing.weeklyPremium,
        pricingBreakdown: pricing.pricingBreakdown || null,
        triggerTypes: triggerTypes || [],
        startDate: new Date(),
        expiryDate,
        status: POLICY_STATUS.ACTIVE,
        paymentStatus: 'PAID',
        paymentProvider: 'RAZORPAY',
        lastPaymentAt: new Date(),
        nextPaymentDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        amountPaid: pricing.weeklyPremium,
        billingHistory: [{
            ...getBillingWindow(),
            amount: pricing.weeklyPremium,
            status: 'PAID',
            provider: 'RAZORPAY',
            paidAt: new Date()
        }]
    });

    logger.info('Policy created successfully', {
        policyId: policy._id,
        userId,
        plan,
        premium: policy.weeklyPremium
    });

    res.status(RESPONSE_CODES.CREATED).json({
        success: true,
        message: 'Policy created successfully',
        data: {
            policyId: policy._id,
            plan: policy.plan,
            normalizedPlanCode: policy.normalizedPlanCode || policy.plan,
            weeklyPremium: policy.weeklyPremium,
            coverageAmount: policy.coverageAmount,
            lockedPayableAmount: policy.lockedPayableAmount || policy.weeklyPremium,
            pricingBreakdown: policy.pricingBreakdown || null,
            status: policy.status,
            expiryDate: policy.expiryDate
        }
    });
});

exports.createPaymentOrder = asyncHandler(async (req, res) => {
    const { userId, plan, overallRisk, triggerTypes } = req.body;

    if (!userId) {
        throw new APIError('User ID is required', RESPONSE_CODES.BAD_REQUEST);
    }

    if (!plan || !PLANS[plan]) {
        throw new APIError(`Invalid plan: ${plan}`, RESPONSE_CODES.BAD_REQUEST);
    }

    const user = await ensureVerifiedUser(userId);
    const riskFactor = toRiskFactor(overallRisk);
    const pricing = calculatePremium(plan, riskFactor, user.workerType || 'GIG');
    const receipt = `gc_${String(userId).slice(-8)}_${Date.now().toString().slice(-6)}`;
    const order = await createRazorpayOrder({
        amount: (pricing.pricingBreakdown?.lockedPayableAmount || pricing.weeklyPremium) * 100,
        receipt,
        notes: {
            userId: String(userId),
            plan,
            normalizedPlanCode: pricing.pricingBreakdown?.normalizedPlan || plan,
            lockedPayableAmount: pricing.pricingBreakdown?.lockedPayableAmount || pricing.weeklyPremium,
            billingCycle: 'WEEKLY'
        }
    });

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + DEFAULTS.POLICY_DURATION_DAYS);
    const { cycleStart, cycleEnd } = getBillingWindow();

    const pendingPolicy = await Policy.create({
        userId,
        plan,
        workerType: user.workerType || 'GIG',
        weeklyPremium: pricing.weeklyPremium,
        coverageAmount: pricing.coverageAmount,
        riskFactor,
        normalizedPlanCode: pricing.pricingBreakdown?.normalizedPlan || plan,
        lockedPayableAmount: pricing.pricingBreakdown?.lockedPayableAmount || pricing.weeklyPremium,
        pricingBreakdown: pricing.pricingBreakdown || null,
        triggerTypes: triggerTypes || ['HEAVY_RAIN', 'HIGH_POLLUTION', 'TRAFFIC_BLOCKED'],
        startDate: new Date(),
        expiryDate,
        status: POLICY_STATUS.SUSPENDED,
        paymentStatus: 'PENDING',
        paymentProvider: 'RAZORPAY',
        razorpayOrderId: order.id,
        nextPaymentDue: cycleEnd,
        billingHistory: [{
            cycleStart,
            cycleEnd,
            amount: pricing.weeklyPremium,
            status: 'PENDING',
            provider: 'RAZORPAY',
            razorpayOrderId: order.id
        }]
    });

    logger.info('Payment order created for policy activation', {
        policyId: pendingPolicy._id,
        userId,
        plan,
        orderId: order.id
    });

    res.status(RESPONSE_CODES.CREATED).json({
        success: true,
        message: 'Payment order created successfully',
        data: {
            policyId: pendingPolicy._id,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: getRazorpayConfig().keyId,
            weeklyPremium: pricing.weeklyPremium,
            coverageAmount: pricing.coverageAmount,
            lockedPayableAmount: pendingPolicy.lockedPayableAmount,
            pricingBreakdown: pendingPolicy.pricingBreakdown,
            normalizedPlanCode: pendingPolicy.normalizedPlanCode,
            nextPaymentDue: pendingPolicy.nextPaymentDue
        }
    });
});

exports.verifyPaymentAndActivatePolicy = asyncHandler(async (req, res) => {
    const {
        policyId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
    } = req.body;

    if (!policyId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new APIError('Payment verification payload is incomplete', RESPONSE_CODES.BAD_REQUEST);
    }

    const policy = await Policy.findById(policyId);
    if (!policy) {
        throw new APIError(ERRORS.POLICY_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    if (policy.razorpayOrderId !== razorpayOrderId) {
        throw new APIError('Order ID mismatch for this policy', RESPONSE_CODES.BAD_REQUEST);
    }

    const { keySecret } = getRazorpayConfig();
    const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

    if (generatedSignature !== razorpaySignature) {
        policy.paymentStatus = 'FAILED';
        policy.updatedAt = new Date();
        const latestFailedBilling = policy.billingHistory?.[policy.billingHistory.length - 1];
        if (latestFailedBilling) {
            latestFailedBilling.status = 'FAILED';
        }
        await policy.save();
        throw new APIError('Payment signature verification failed', RESPONSE_CODES.BAD_REQUEST);
    }

    let razorpayPayment;
    try {
        razorpayPayment = await fetchRazorpayPayment(razorpayPaymentId);
    } catch (error) {
        throw new APIError('Unable to fetch Razorpay payment for verification', RESPONSE_CODES.SERVICE_UNAVAILABLE);
    }

    if (razorpayPayment.order_id !== razorpayOrderId) {
        throw new APIError('Razorpay payment does not belong to this order', RESPONSE_CODES.BAD_REQUEST);
    }

    if (!['captured', 'authorized'].includes(String(razorpayPayment.status || '').toLowerCase())) {
        throw new APIError('Razorpay payment is not successful', RESPONSE_CODES.BAD_REQUEST);
    }

    const expectedAmount = Math.round((policy.lockedPayableAmount || policy.weeklyPremium) * 100);
    const billingExpectedAmount = Math.round((policy.billingHistory?.[policy.billingHistory.length - 1]?.amount || 0) * 100);
    const receivedAmount = Number(razorpayPayment.amount);
    const acceptedAmounts = new Set([expectedAmount, billingExpectedAmount].filter((value) => value > 0));

    if (!acceptedAmounts.has(receivedAmount)) {
        policy.paymentStatus = 'FAILED';
        policy.updatedAt = new Date();
        const latestFailedBilling = policy.billingHistory?.[policy.billingHistory.length - 1];
        if (latestFailedBilling) {
            latestFailedBilling.status = 'FAILED';
        }
        await policy.save();
        throw new APIError(
            `Payment amount mismatch. Expected one of [${Array.from(acceptedAmounts).join(', ')}], received ${razorpayPayment.amount}`,
            RESPONSE_CODES.BAD_REQUEST
        );
    }

    await Policy.updateMany(
        {
            userId: policy.userId,
            _id: { $ne: policy._id },
            status: POLICY_STATUS.ACTIVE
        },
        {
            status: POLICY_STATUS.CANCELLED,
            updatedAt: new Date()
        }
    );

    policy.status = POLICY_STATUS.ACTIVE;
    policy.paymentStatus = 'PAID';
    policy.paymentProvider = 'RAZORPAY';
    policy.razorpayOrderId = razorpayOrderId;
    policy.lastPaymentId = razorpayPaymentId;
    policy.lastPaymentAt = new Date();
    policy.amountPaid = (policy.amountPaid || 0) + (receivedAmount / 100);
    policy.nextPaymentDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    policy.updatedAt = new Date();

    const latestBilling = policy.billingHistory?.[policy.billingHistory.length - 1];
    if (latestBilling) {
        latestBilling.status = 'PAID';
        latestBilling.amount = receivedAmount / 100;
        latestBilling.razorpayPaymentId = razorpayPaymentId;
        latestBilling.paidAt = new Date();
    }

    await policy.save();

    logger.info('Policy activated after successful payment', {
        policyId: policy._id,
        userId: policy.userId,
        razorpayPaymentId
    });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Payment verified and policy activated successfully',
        data: {
            policyId: policy._id,
            plan: policy.plan,
            normalizedPlanCode: policy.normalizedPlanCode || policy.plan,
            weeklyPremium: policy.weeklyPremium,
            coverageAmount: policy.coverageAmount,
            status: policy.status,
            paymentStatus: policy.paymentStatus,
            lockedPayableAmount: policy.lockedPayableAmount || policy.weeklyPremium,
            pricingBreakdown: policy.pricingBreakdown || null,
            nextPaymentDue: policy.nextPaymentDue,
            razorpayPaymentId
        }
    });
});

// Get User Policies
exports.getUserPolicies = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { userId };
    if (status) {
        query.status = status;
    }

    const policies = await Policy.find(query).sort({ createdAt: -1 });

    logger.debug('User policies retrieved', { userId, count: policies.length });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        count: policies.length,
        data: policies
    });
});

// Get Policy Details
exports.getPolicyDetails = asyncHandler(async (req, res) => {
    const { policyId } = req.params;

    const policy = await Policy.findById(policyId).populate('userId', 'name email phone location');
    if (!policy) {
        throw new APIError(ERRORS.POLICY_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    logger.debug('Policy details retrieved', { policyId });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: policy
    });
});

// Update Policy (extend or modify triggers)
exports.updatePolicy = asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const { triggerTypes, triggerThresholds } = req.body;

    const policy = await Policy.findById(policyId);
    if (!policy) {
        throw new APIError(ERRORS.POLICY_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    if (policy.status !== POLICY_STATUS.ACTIVE) {
        throw new APIError('Can only update active policies', RESPONSE_CODES.FORBIDDEN);
    }

    if (triggerTypes) {
        policy.triggerTypes = triggerTypes;
    }

    if (triggerThresholds) {
        policy.triggerThresholds = {
            ...policy.triggerThresholds,
            ...triggerThresholds
        };
    }

    policy.updatedAt = new Date();
    await policy.save();

    logger.info('Policy updated', { policyId, triggerTypes });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Policy updated successfully',
        data: policy
    });
});

// Suspend Policy
exports.suspendPolicy = asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const { reason } = req.body;

    const policy = await Policy.findByIdAndUpdate(
        policyId,
        {
            status: POLICY_STATUS.SUSPENDED,
            updatedAt: new Date()
        },
        { new: true }
    );

    if (!policy) {
        throw new APIError(ERRORS.POLICY_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    logger.warn('Policy suspended', { policyId, reason });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Policy suspended successfully',
        data: policy
    });
});

// Cancel Policy
exports.cancelPolicy = asyncHandler(async (req, res) => {
    const { policyId } = req.params;

    const policy = await Policy.findByIdAndUpdate(
        policyId,
        {
            status: POLICY_STATUS.CANCELLED,
            updatedAt: new Date()
        },
        { new: true }
    );

    if (!policy) {
        throw new APIError(ERRORS.POLICY_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    logger.info('Policy cancelled', { policyId });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Policy cancelled successfully',
        data: policy
    });
});

// Premium Quote (dry-run pricing)
exports.getPremiumQuote = asyncHandler(async (req, res) => {
    const { userId, plan, overallRisk } = req.body;
    
    if (!userId) {
        throw new APIError('User ID required', RESPONSE_CODES.BAD_REQUEST);
    }
    
    const user = await User.findById(userId);
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }
    
    const riskFactor = toRiskFactor(overallRisk);
    const pricing = calculatePremium(plan, riskFactor, user.workerType || 'GIG');
    
    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: pricing
    });
});

// Estimate disruption protection using live risk + active policy
exports.estimateProtection = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { dailyIncome } = req.body;

    const latestRisk = await RiskData.findOne({ userId }).sort({ createdAt: -1, timestamp: -1 });
    const overallRisk = latestRisk?.riskMetrics?.overallRisk ?? 25;
    const rainfall = latestRisk?.weatherData?.rainfall ?? 0;
    const traffic = latestRisk?.activityData?.routeBlockages ?? 0;
    const income = Number(dailyIncome) || 850;
    const riskFactor = toRiskFactor(overallRisk);
    const policy = await Policy.findOne({ userId, status: POLICY_STATUS.ACTIVE }).sort({ createdAt: -1 });
    const fallbackPlan = PLANS.GIG_STANDARD;
    const pricing = policy
        ? { weeklyPremium: policy.weeklyPremium, coverageAmount: policy.coverageAmount, riskFactor: policy.riskFactor }
        : calculatePremium('GIG_STANDARD', riskFactor, 'GIG');

    const disruptionPercent = clamp(
        Number((
            0.1 +
            (overallRisk / 220) +
            (rainfall >= 50 ? 0.12 : rainfall >= 20 ? 0.05 : 0) +
            (traffic >= 4 ? 0.08 : traffic >= 3 ? 0.04 : 0)
        ).toFixed(2)),
        0.1,
        0.65
    );

    const estimatedLoss = Math.round(income * disruptionPercent);
    const payout = Math.min(
        pricing.coverageAmount,
        Math.round(estimatedLoss * (pricing.riskFactor >= 1.2 ? 1.05 : 0.95))
    );

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: {
            userId,
            policyId: policy ? policy._id : null,
            weeklyPremium: pricing.weeklyPremium,
            coverageAmount: pricing.coverageAmount,
            riskFactor: pricing.riskFactor,
            overallRisk,
            disruptionPercent,
            estimatedLoss,
            payout,
            source: policy ? (latestRisk?.dataSource || 'MANUAL') : 'NO_POLICY'
        }
    });
});
