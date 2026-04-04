const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authenticateUser } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

router.post('/create', rateLimit, authenticateUser, policyController.createPolicy);
router.post('/payment/order', rateLimit, policyController.createPaymentOrder);
router.post('/payment/verify', rateLimit, policyController.verifyPaymentAndActivatePolicy);
router.get('/user/:userId', rateLimit, authenticateUser, policyController.getUserPolicies);
router.get('/:policyId', rateLimit, authenticateUser, policyController.getPolicyDetails);
router.put('/:policyId', rateLimit, authenticateUser, policyController.updatePolicy);
router.post('/:policyId/suspend', rateLimit, authenticateUser, policyController.suspendPolicy);
router.delete('/:policyId/cancel', rateLimit, authenticateUser, policyController.cancelPolicy);
router.post('/user/:userId/estimate', rateLimit, authenticateUser, policyController.estimateProtection);
router.post('/premium/quote', rateLimit, policyController.getPremiumQuote);

module.exports = router;
