const router = require('express').Router();
const {
    register,
    getUserProfile,
    getUserProfileByEmail,
    verifyKYC,
    updateProfile,
    registerDeviceToken
} = require('../controllers/authController');
const { validateUserRegistration, validateKycSubmission } = require('../utils/validation');

// User Registration
router.post('/register', validateUserRegistration, register);

// Get User Profile
router.get('/profile-by-email/:email', getUserProfileByEmail);
router.get('/profile/:userId', getUserProfile);

// Verify KYC
router.post('/verify-kyc/:userId', validateKycSubmission, verifyKYC);

// Update Profile
router.patch('/profile/:userId', updateProfile);
router.post('/device-token/:userId', registerDeviceToken);

module.exports = router;
