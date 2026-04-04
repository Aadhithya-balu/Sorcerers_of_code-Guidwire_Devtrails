const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
    policyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy',
        required: [true, 'Policy ID is required']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    
    // Claim Details
    claimType: {
        type: String,
        enum: [
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
        ],
        required: true
    },
    status: {
        type: String,
        enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'],
        default: 'SUBMITTED'
    },
    
    // Risk & Fraud Assessment
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    fraudScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    fraudFlags: [{
        type: String,
        enum: [
            'LOCATION_MISMATCH',
            'BEHAVIORAL_ANOMALY',
            'PLATFORM_DATA_MISMATCH',
            'OFFICIAL_DATA_MISMATCH',
            'FRAUD_RING_PATTERN',
            'ML_ANOMALY',
            'DUPLICATE_CLAIM'
        ]
    }],
    fraudFlagDescription: String,
    fraudLayerEvidence: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    fraudLayerCount: {
        type: Number,
        default: 0
    },
    
    // Trigger Evidence
    triggerEvidence: {
        weatherData: {
            rainfall: Number,
            aqi: Number,
            temperature: Number,
            timestamp: Date
        },
        locationData: {
            latitude: Number,
            longitude: Number,
            address: String,
            timestamp: Date
        },
        activityData: {
            deliveriesCompleted: Number,
            workingHours: Number,
            timestamp: Date
        }
    },
    
    // Payout
    approvedAmount: { type: Number, default: 0 },
    payoutAmount: { type: Number, default: 0 },
    payoutMethod: {
        type: String,
        enum: ['BANK_TRANSFER', 'WALLET', 'CHEQUE'],
        default: 'BANK_TRANSFER'
    },
    payoutDate: Date,
    
    // Approval Details
    approvedBy: String,
    approvalNotes: String,
    reviewedAt: Date,
    rejectionReason: String,
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

claimSchema.index({ policyId: 1 });
claimSchema.index({ userId: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Claim', claimSchema);
