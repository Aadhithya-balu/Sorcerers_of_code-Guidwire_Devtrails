const User = require('../models/User');
const { asyncHandler, APIError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { USER_STATUS, RESPONSE_CODES, ERRORS } = require('../utils/constants');

// Register User
exports.register = asyncHandler(async (req, res) => {
    const { name, email, phone, location, platform, latitude, longitude, workerType, dailyIncome, workingHours, workingDays, avgDailyHours } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        logger.warn('Duplicate email registration attempt', { email });
        throw new APIError(ERRORS.DUPLICATE_EMAIL, RESPONSE_CODES.CONFLICT);
    }

    const user = await User.create({
        name,
        email,
        phone,
        location,
        platform,
        latitude,
        longitude,
        workerType: workerType || 'GIG',
        workingHours,
        workingDays,
        avgDailyHours,
        dailyIncome: typeof dailyIncome === 'number' ? dailyIncome : undefined,
        accountStatus: USER_STATUS.VERIFICATION_PENDING,
        kyc: {
            verified: false
        }
    });

    logger.info('User registered successfully', { userId: user._id, email });

    res.status(RESPONSE_CODES.CREATED).json({
        success: true,
        message: 'User registered successfully. Verification pending.',
        data: {
            userId: user._id,
            email: user.email,
            status: user.accountStatus
        }
    });
});

// Get User Profile
exports.getUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-kyc.documentType');
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    logger.debug('User profile retrieved', { userId });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: user
    });
});

// Get User Profile by Email
exports.getUserProfileByEmail = asyncHandler(async (req, res) => {
    const email = decodeURIComponent(req.params.email).toLowerCase();

    const user = await User.findOne({ email }).select('-kyc.documentType');
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    logger.debug('User profile retrieved by email', { email, userId: user._id });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: user
    });
});

// Verify KYC
exports.verifyKYC = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { documentType, documentId, documentImage, profileImage } = req.body;

    const user = await User.findById(userId);
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    const maskedId = documentId
        ? `XXXX${String(documentId).slice(-4)}`
        : undefined;

    // Update KYC
    user.kyc = {
        verified: true,
        verifiedAt: new Date(),
        documentType,
        documentIdMasked: maskedId,
        documentImage: documentImage || null,
        profileImage: profileImage || null
    };
    if (profileImage) {
        user.profileImage = profileImage;
    }
    user.accountStatus = USER_STATUS.ACTIVE;

    await user.save();

    logger.info('User KYC verified', { userId, documentType });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'KYC verified successfully',
        data: {
            userId: user._id,
            accountStatus: user.accountStatus
        }
    });
});

// Update User Profile
exports.updateProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const {
        location,
        latitude,
        longitude,
        phone,
        dailyIncome,
        workingHours,
        workingDays,
        avgDailyHours,
        themePreference,
        profileImage
    } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        {
            location,
            latitude,
            longitude,
            phone,
            dailyIncome,
            workingHours,
            workingDays,
            avgDailyHours,
            themePreference,
            profileImage,
            updatedAt: new Date()
        },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    logger.info('User profile updated', { userId });

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Profile updated successfully',
        data: user
    });
});

exports.registerDeviceToken = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { token, platform = 'web' } = req.body;

    if (!token || String(token).trim().length < 8) {
        throw new APIError('Device token is required', RESPONSE_CODES.BAD_REQUEST);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new APIError(ERRORS.USER_NOT_FOUND, RESPONSE_CODES.NOT_FOUND);
    }

    const normalizedToken = String(token).trim();
    const exists = (user.deviceTokens || []).some((entry) => entry.token === normalizedToken);
    if (!exists) {
        user.deviceTokens = user.deviceTokens || [];
        user.deviceTokens.push({
            token: normalizedToken,
            platform,
            createdAt: new Date()
        });
        user.updatedAt = new Date();
        await user.save();
    }

    res.status(RESPONSE_CODES.SUCCESS).json({
        success: true,
        message: 'Device token registered',
        data: {
            userId: user._id,
            tokenCount: user.deviceTokens.length
        }
    });
});
