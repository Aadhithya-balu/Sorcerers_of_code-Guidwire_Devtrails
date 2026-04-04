const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Invalid email format']
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
        match: [/^[0-9]{10}$/, 'Phone must be 10 digits']
    },
    location: {
        type: String,
        required: [true, 'Location is required']
    },
    latitude: Number,
    longitude: Number,
    workerType: {
        type: String,
        enum: ['GIG', 'EMPLOYEE'],
        default: 'GIG'
    },
    platform: {
        type: String,
        enum: ['SWIGGY', 'ZOMATO', 'RIKSHAW', 'OTHER'],
        required: true
    },
    workingHours: {
        type: String,
        default: null
    },
    workingDays: {
        type: String,
        default: null
    },
    avgDailyHours: {
        type: String,
        default: null
    },
    dailyIncome: {
        type: Number,
        default: null
    },
    kyc: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        documentType: String,
        documentIdMasked: String,
        documentImage: String,
        profileImage: String
    },
    profileImage: {
        type: String,
        default: null
    },
    themePreference: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
    },
    deviceTokens: [{
        token: { type: String, required: true },
        platform: { type: String, default: 'web' },
        createdAt: { type: Date, default: Date.now }
    }],
    notificationPreferences: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true }
    },
    riskProfile: {
        historicalClaims: { type: Number, default: 0 },
        fraudScore: { type: Number, default: 0, min: 0, max: 100 },
        reputationScore: { type: Number, default: 100 }
    },
    accountStatus: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED', 'VERIFICATION_PENDING'],
        default: 'VERIFICATION_PENDING'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model('User', userSchema);
