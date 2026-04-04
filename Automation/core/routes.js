/**
 * Core Automation Routes
 * API endpoints for managing and monitoring automation processes
 */

const express = require('express');
const router = express.Router();
const { automationController } = require('./controllers/automationController');
const { monitoringController } = require('./controllers/monitoringController');

// Automation status and control
router.get('/status', automationController.getStatus);
router.post('/start', automationController.startAutomation);
router.post('/stop', automationController.stopAutomation);
router.post('/restart', automationController.restartAutomation);

// User onboarding automation
router.post('/users/onboard', automationController.onboardUser);
router.get('/users/:userId/onboarding-status', automationController.getOnboardingStatus);

// Policy automation
router.post('/policies/auto-create', automationController.autoCreatePolicy);
router.post('/policies/:policyId/auto-update', automationController.autoUpdatePolicy);

// Premium calculation automation
router.post('/premiums/calculate', automationController.calculatePremium);
router.post('/premiums/bulk-update', automationController.bulkUpdatePremiums);

// Risk prediction automation
router.post('/risk/predict', automationController.predictRisk);
router.post('/risk/batch-predict', automationController.batchPredictRisk);

// Trigger detection automation
router.post('/triggers/detect', automationController.detectTriggers);
router.get('/triggers/active', automationController.getActiveTriggers);

// Fraud detection automation
router.post('/fraud/analyze', automationController.analyzeFraud);
router.post('/fraud/bulk-analyze', automationController.bulkAnalyzeFraud);

// Claim processing automation
router.post('/claims/auto-process', automationController.autoProcessClaims);
router.post('/claims/bulk-process', automationController.bulkProcessClaims);

// Payout automation
router.post('/payouts/auto-process', automationController.autoProcessPayouts);
router.post('/payouts/bulk-process', automationController.bulkProcessPayouts);

// Notification automation
router.post('/notifications/send', automationController.sendNotification);
router.post('/notifications/bulk-send', automationController.bulkSendNotifications);

// ML model management
router.post('/ml/retrain', automationController.retrainModels);
router.get('/ml/status', automationController.getMLStatus);
router.post('/ml/deploy', automationController.deployModel);

// Monitoring and analytics
router.get('/monitoring/dashboard', monitoringController.getDashboard);
router.get('/monitoring/metrics', monitoringController.getMetrics);
router.get('/monitoring/logs', monitoringController.getLogs);
router.get('/monitoring/alerts', monitoringController.getAlerts);

// Workflow management
router.get('/workflows', monitoringController.getWorkflows);
router.get('/workflows/:workflowId/status', monitoringController.getWorkflowStatus);
router.post('/workflows/:workflowId/retry', monitoringController.retryWorkflow);

// Integration status
router.get('/integrations/status', monitoringController.getIntegrationStatus);
router.post('/integrations/test', monitoringController.testIntegration);

module.exports = router;