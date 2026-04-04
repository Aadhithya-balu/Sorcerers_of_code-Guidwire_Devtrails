const { RESPONSE_CODES, ERRORS } = require('./constants');
const logger = require('./logger');
const VALID_KYC_DOCS = ['AADHAR', 'PAN', 'DRIVER_LICENSE', 'VOTER_ID'];

// Validate User Registration Input
const validateUserRegistration = (req, res, next) => {
    const { name, email, phone, location, platform } = req.body;

    const errors = [];

    if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
    }

    if (!email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        errors.push('Invalid email format');
    }

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
        errors.push('Phone must be 10 digits');
    }

    if (!location || location.trim().length === 0) {
        errors.push('Location is required');
    }

    if (!platform || !['SWIGGY', 'ZOMATO', 'RIKSHAW', 'OTHER'].includes(platform)) {
        errors.push('Invalid platform');
    }

    if (errors.length > 0) {
        logger.warn('Validation failed for user registration', { errors, email });
        return res.status(RESPONSE_CODES.BAD_REQUEST).json({
            success: false,
            message: ERRORS.INVALID_INPUT,
            errors
        });
    }

    next();
};

// Validate Policy Creation Input
const validatePolicyCreation = (req, res, next) => {
    const { userId, plan, workerType, triggerTypes } = req.body;
    const VALID_PLANS = ['BASIC', 'STANDARD', 'PREMIUM', 'GIG_BASIC', 'GIG_STANDARD', 'GIG_PREMIUM'];
    const VALID_TRIGGERS = ['HEAVY_RAIN', 'HIGH_POLLUTION', 'DISASTER', 'TRAFFIC_BLOCKED'];

    const errors = [];

    if (!userId) {
        errors.push('User ID is required');
    }

    if (!plan || !VALID_PLANS.includes(plan)) {
        errors.push(`Plan must be one of: ${VALID_PLANS.join(', ')}`);
    }

    if (workerType && !['GIG', 'EMPLOYEE'].includes(workerType)) {
        errors.push('Worker type must be GIG or EMPLOYEE');
    }

    if (triggerTypes && (!Array.isArray(triggerTypes) || 
        triggerTypes.some(t => !VALID_TRIGGERS.includes(t)))) {
        errors.push(`Trigger types must be array of: ${VALID_TRIGGERS.join(', ')}`);
    }

    if (errors.length > 0) {
        logger.warn('Validation failed for policy creation', { errors, userId });
        return res.status(RESPONSE_CODES.BAD_REQUEST).json({
            success: false,
            message: ERRORS.INVALID_INPUT,
            errors
        });
    }

    next();
};

// Validate Claim Submission Input
const validateClaimSubmission = (req, res, next) => {
    const { policyId, claimType, riskScore, triggerEvidence } = req.body;
    const VALID_CLAIM_TYPES = [
        'HEAVY_RAIN',
        'HIGH_POLLUTION',
        'DISASTER',
        'TRAFFIC_BLOCKED',
        'THUNDERSTORM',
        'EXTREME_HEAT',
        'FLOODING',
        'CURFEW',
        'STRIKE',
        'UNEXPECTED_EVENT',
        'MARKET_CLOSURE',
        'PLATFORM_DOWNTIME'
    ];

    const errors = [];

    if (!policyId) {
        errors.push('Policy ID is required');
    }

    if (!claimType || !VALID_CLAIM_TYPES.includes(claimType)) {
        errors.push(`Claim type must be one of: ${VALID_CLAIM_TYPES.join(', ')}`);
    }

    if (riskScore === undefined || riskScore < 0 || riskScore > 100) {
        errors.push('Risk score must be between 0 and 100');
    }

    if (!triggerEvidence || typeof triggerEvidence !== 'object') {
        errors.push('Trigger evidence is required and must be an object');
    }

    if (errors.length > 0) {
        logger.warn('Validation failed for claim submission', { errors, policyId });
        return res.status(RESPONSE_CODES.BAD_REQUEST).json({
            success: false,
            message: ERRORS.INVALID_INPUT,
            errors
        });
    }

    next();
};

// Validate KYC Submission Input
const validateKycSubmission = (req, res, next) => {
    const { documentType, documentId } = req.body;
    const errors = [];

    if (!documentType || !VALID_KYC_DOCS.includes(documentType)) {
        errors.push(`Document type must be one of: ${VALID_KYC_DOCS.join(', ')}`);
    }

    if (!documentId || String(documentId).trim().length < 6) {
        errors.push('Document ID must be at least 6 characters');
    }

    if (errors.length > 0) {
        logger.warn('Validation failed for KYC submission', { errors });
        return res.status(RESPONSE_CODES.BAD_REQUEST).json({
            success: false,
            message: ERRORS.INVALID_INPUT,
            errors
        });
    }

    next();
};

// Request Logging Middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.debug(`${req.method} ${req.originalUrl}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        });
    });

    next();
};

module.exports = {
    validateUserRegistration,
    validatePolicyCreation,
    validateClaimSubmission,
    validateKycSubmission,
    requestLogger
};
