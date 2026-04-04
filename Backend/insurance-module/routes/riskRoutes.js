const router = require('express').Router();
const {
    getLatestRiskByUserId,
    getLatestRiskByEmail,
    refreshRiskByUserId,
    refreshRiskByEmail,
    getNearbyZonesByUserId,
    getNearbyZonesByEmail
} = require('../controllers/riskController');

router.get('/user/:userId/latest', getLatestRiskByUserId);
router.get('/email/:email/latest', getLatestRiskByEmail);
router.get('/user/:userId/nearby-zones', getNearbyZonesByUserId);
router.get('/email/:email/nearby-zones', getNearbyZonesByEmail);
router.post('/user/:userId/refresh', refreshRiskByUserId);
router.post('/email/:email/refresh', refreshRiskByEmail);

module.exports = router;
