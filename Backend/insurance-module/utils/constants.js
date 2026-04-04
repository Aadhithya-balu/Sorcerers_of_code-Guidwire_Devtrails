module.exports = {
    // Plan Configuration
    PLANS: {
        BASIC: {
            premium: 20,
            coverage: 500,
            maxClaims: 3,
            claimWindow: 30 // days
        },
        STANDARD: {
            premium: 30,
            coverage: 1000,
            maxClaims: 5,
            claimWindow: 30
        },
        PREMIUM: {
            premium: 50,
            coverage: 2000,
            maxClaims: 10,
            claimWindow: 30
        },
        GIG_STANDARD: {
            premium: 30,
            coverage: 1200,
            maxClaims: 5,
            claimWindow: 30
        },
        GIG_PREMIUM: {
            premium: 45,
            coverage: 2000,
            maxClaims: 8,
            claimWindow: 30
        }
    },

    // Trigger Thresholds (Parametric)
    TRIGGERS: {
        RAINFALL: {
            name: 'Heavy Rain',
            threshold: 50, // mm
            minDuration: 2 // hours
        },
        HIGH_POLLUTION: {
            name: 'High Air Pollution',
            threshold: 200, // AQI
            minDuration: 4 // hours
        },
        DISASTER: {
            name: 'Natural Disaster',
            threshold: null, // Categorical
            types: ['FLOOD', 'EARTHQUAKE', 'CYCLONE']
        },
        TRAFFIC_BLOCKED: {
            name: 'Traffic Blockage',
            threshold: 5, // km radius blocked
            minDuration: 1 // hour
        },
        CURFEW: {
            name: 'Curfew',
            threshold: null,
            minDuration: 2
        },
        STRIKE: {
            name: 'Strike',
            threshold: null,
            minDuration: 2
        },
        UNEXPECTED_EVENT: {
            name: 'Unexpected Event',
            threshold: null,
            minDuration: 1
        }
    },

    // Risk Scoring Rules
    RISK_SCORING: {
        HISTORICAL_CLAIMS: {
            weight: 0.2,
            scale: [
                { claims: 0, score: 0 },
                { claims: 1, score: 10 },
                { claims: 3, score: 25 },
                { claims: 5, score: 40 },
                { claims: 10, score: 70 }
            ]
        },
        LOCATION_RISK: {
            weight: 0.25,
            zones: {
                HIGH: 50,
                MEDIUM: 25,
                LOW: 5
            }
        },
        WEATHER_RISK: {
            weight: 0.25,
            thresholds: {
                rainfall: 50,
                aqi: 200,
                temperature: 45
            }
        },
        ACTIVITY_RISK: {
            weight: 0.3,
            metrics: {
                lowActivity: 20,
                normalActivity: 10,
                highActivity: 5
            }
        }
    },

    // Fraud Detection Rules
    FRAUD_RULES: {
        LOCATION_MISMATCH: {
            enabled: true,
            maxDistanceKm: 5,
            severity: 'HIGH'
        },
        CLAIM_FREQUENCY: {
            enabled: true,
            maxClaimsPerWeek: 2,
            severity: 'MEDIUM'
        },
        DUPLICATE_CLAIM: {
            enabled: true,
            windowHours: 48,
            severity: 'CRITICAL'
        },
        AMOUNT_ANOMALY: {
            enabled: true,
            deviationPercent: 300, // percent of average
            severity: 'MEDIUM'
        },
        VELOCITY_FRAUD: {
            enabled: true,
            maxClaimsPerDay: 3,
            severity: 'HIGH'
        },
        PATTERN_ANOMALY: {
            enabled: true,
            minHistoryDays: 30,
            severity: 'MEDIUM'
        }
    },

    // API Response Codes
    RESPONSE_CODES: {
        SUCCESS: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
    },

    // Error Messages
    ERRORS: {
        INVALID_INPUT: 'Invalid input provided',
        USER_NOT_FOUND: 'User not found',
        POLICY_NOT_FOUND: 'Policy not found',
        CLAIM_NOT_FOUND: 'Claim not found',
        UNAUTHORIZED: 'Unauthorized access',
        DUPLICATE_EMAIL: 'Email already registered',
        POLICY_EXPIRED: 'Policy has expired',
        CLAIM_LIMIT_EXCEEDED: 'Claim limit exceeded for this period',
        DB_ERROR: 'Database error occurred',
        FRAUD_SUSPECTED: 'Claim flagged for fraud review',
        TRIGGER_NOT_MET: 'Trigger conditions not met',
        API_ERROR: 'External API error'
    },

    // Status Enums
    USER_STATUS: {
        ACTIVE: 'ACTIVE',
        SUSPENDED: 'SUSPENDED',
        VERIFICATION_PENDING: 'VERIFICATION_PENDING'
    },

    POLICY_STATUS: {
        ACTIVE: 'ACTIVE',
        SUSPENDED: 'SUSPENDED',
        EXPIRED: 'EXPIRED',
        CANCELLED: 'CANCELLED'
    },

    CLAIM_STATUS: {
        SUBMITTED: 'SUBMITTED',
        UNDER_REVIEW: 'UNDER_REVIEW',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
        PAID: 'PAID'
    },

    FRAUD_SEVERITY: {
        LOW: 0,
        MEDIUM: 1,
        HIGH: 2,
        CRITICAL: 3
    },

    // Default Values
    DEFAULTS: {
        POLICY_DURATION_DAYS: 365,
        RISK_FACTOR_MIN: 0.5,
        RISK_FACTOR_MAX: 2.0,
        FRAUD_SCORE_THRESHOLD: 60,
        MANUAL_REVIEW_THRESHOLD: 40,
        API_TIMEOUT_MS: 10000,
        LOG_RETENTION_DAYS: 90,
        FRAUD_APPROVAL_THRESHOLD: 60,
        FRAUD_LAYER_COUNT: 6
    }
};
