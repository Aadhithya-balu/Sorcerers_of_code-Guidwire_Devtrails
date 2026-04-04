/**
 * Parametric Insurance Automation System
 * AI-Enabled Zero-Touch Insurance for Gig Workers
 *
 * This system automates 10 critical areas:
 * 1. User Registration & Onboarding
 * 2. Policy Creation & Management
 * 3. Dynamic Premium Calculation
 * 4. Real-Time Risk Prediction
 * 5. Parametric Trigger Detection
 * 6. Fraud Detection
 * 7. Zero-Touch Claim Processing
 * 8. Automated Payout Processing
 * 9. Notification & Communication
 * 10. Continuous Learning & Model Improvement
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
const cron = require('node-cron');
const { automationSchedulers } = require('./schedulers');
const { onboardingAutomation } = require('./workflows/onboardingWorkflow');
const { policyAutomation } = require('./workflows/policyWorkflow');
const { premiumAutomation } = require('./workflows/premiumWorkflow');
const { riskPredictionAutomation } = require('./workflows/riskPredictionWorkflow');
const { triggerDetectionAutomation } = require('./workflows/triggerDetectionWorkflow');
const { fraudDetectionAutomation } = require('./workflows/fraudDetectionWorkflow');
const { claimProcessingAutomation } = require('./workflows/claimProcessingWorkflow');
const { payoutProcessingAutomation } = require('./workflows/payoutProcessingWorkflow');
const { notificationAutomation } = require('./notifications');
const { modelImprovementAutomation } = require('./workflows/modelImprovementWorkflow');

// Initialize Express app
const app = express();
const PORT = process.env.AUTOMATION_PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'parametric-automation' },
  transports: [
    new winston.transports.File({ filename: 'logs/automation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/automation.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Global error handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Enable CORS for frontend communication
const cors = require('cors');
const frontendOrigin = process.env.VITE_FRONTEND_URL || process.env.VITE_AUTOMATION_API_URL || '*';
app.use(cors({
  origin: frontendOrigin,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/automation', require('./core/routes'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Express error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

/**
 * Initialize all automation components
 */
async function initializeAutomation() {
  try {
    logger.info('🚀 Starting Parametric Insurance Automation System...');

    // 1. Connect to databases
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parametric-insurance');
    logger.info('✅ MongoDB connected');

    // Note: Redis connection removed for simplicity - can be added back if needed

    // 2. Initialize automation workflows
    logger.info('✅ Automation workflows ready');

    // 3. Initialize schedulers
    await automationSchedulers.initializeSchedulers();
    automationSchedulers.startAllJobs();
    logger.info('✅ Scheduled jobs initialized and started');

    // 4. Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Automation server running on port ${PORT}`);
      logger.info('🎯 All 10 automation areas active and operational');
      logger.info('');
      logger.info('📋 Automation Areas:');
      logger.info('  1. 👤 User Registration & Onboarding');
      logger.info('  2. 📋 Policy Creation & Management');
      logger.info('  3. 💰 Dynamic Premium Calculation');
      logger.info('  4. 🎯 Real-Time Risk Prediction');
      logger.info('  5. ⚡ Parametric Trigger Detection');
      logger.info('  6. 🛡️ Fraud Detection');
      logger.info('  7. 📝 Zero-Touch Claim Processing');
      logger.info('  8. 💳 Automated Payout Processing');
      logger.info('  9. 📱 Notification & Communication');
      logger.info(' 10. 🧠 Continuous Learning & Model Improvement');
    });

  } catch (error) {
    logger.error('❌ Failed to initialize automation system:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the automation system
initializeAutomation();

module.exports = app;
