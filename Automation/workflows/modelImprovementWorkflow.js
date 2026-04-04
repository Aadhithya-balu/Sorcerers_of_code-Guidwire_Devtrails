/**
 * Continuous Learning & Model Improvement Automation
 * Automatically retrains and improves ML models with new data
 */

const winston = require('winston');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const User = require('../../Backend/insurance-module/models/User');
const Policy = require('../../Backend/insurance-module/models/Policy');
const Claim = require('../../Backend/insurance-module/models/Claim');
const { notificationAutomation } = require('../notifications');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/model-improvement-automation.log' }),
    new winston.transports.Console()
  ]
});

class ModelImprovementAutomation {
  constructor() {
    this.pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
    this.modelVersions = this.loadModelVersions();
    this.improvementRules = this.loadImprovementRules();
  }

  /**
   * Run continuous model improvement cycle
   */
  async runModelImprovementCycle() {
    try {
      logger.info('🧠 Starting model improvement cycle...');

      // Check if improvement is needed
      const needsImprovement = await this.checkImprovementNeeded();

      if (!needsImprovement.needed) {
        logger.info('ℹ️ Model improvement not needed at this time');
        return {
          improved: false,
          reason: needsImprovement.reason,
          timestamp: new Date()
        };
      }

      // Collect new training data
      const trainingData = await this.collectTrainingData();

      if (trainingData.totalRecords < this.improvementRules.minTrainingRecords) {
        logger.info(`📊 Insufficient training data: ${trainingData.totalRecords} records`);
        return {
          improved: false,
          reason: `Insufficient training data: ${trainingData.totalRecords} records`,
          timestamp: new Date()
        };
      }

      // Retrain models
      const retrainingResults = await this.retrainModels(trainingData);

      // Evaluate new models
      const evaluationResults = await this.evaluateNewModels(retrainingResults);

      // Deploy improved models if better
      const deploymentResults = await this.deployImprovedModels(evaluationResults);

      // Update model versions
      await this.updateModelVersions(deploymentResults);

      // Send improvement notifications
      await this.sendImprovementNotifications(deploymentResults);

      const improvements = deploymentResults.filter(r => r.deployed).length;
      logger.info(`✅ Model improvement cycle completed: ${improvements} models improved`);

      return {
        improved: improvements > 0,
        modelsImproved: improvements,
        totalModels: deploymentResults.length,
        timestamp: new Date(),
        details: deploymentResults
      };

    } catch (error) {
      logger.error('Error in model improvement cycle:', error);
      throw error;
    }
  }

  /**
   * Check if model improvement is needed
   */
  async checkImprovementNeeded() {
    try {
      // Check data volume - has enough new data accumulated?
      const newDataCount = await this.getNewDataCount();

      if (newDataCount < this.improvementRules.minNewRecords) {
        return {
          needed: false,
          reason: `Insufficient new data: ${newDataCount} records (need ${this.improvementRules.minNewRecords})`
        };
      }

      // Check model performance degradation
      const performanceCheck = await this.checkModelPerformance();

      if (performanceCheck.degraded) {
        return {
          needed: true,
          reason: `Model performance degraded: ${performanceCheck.details}`
        };
      }

      // Check time since last improvement
      const daysSinceLastImprovement = await this.getDaysSinceLastImprovement();

      if (daysSinceLastImprovement >= this.improvementRules.maxDaysBetweenImprovements) {
        return {
          needed: true,
          reason: `Time-based improvement: ${daysSinceLastImprovement} days since last improvement`
        };
      }

      // Check for significant pattern changes
      const patternChange = await this.detectPatternChanges();

      if (patternChange.significant) {
        return {
          needed: true,
          reason: `Significant pattern changes detected: ${patternChange.details}`
        };
      }

      return {
        needed: false,
        reason: 'No improvement triggers met'
      };

    } catch (error) {
      logger.error('Error checking improvement needed:', error);
      return { needed: false, reason: 'Error checking improvement criteria' };
    }
  }

  /**
   * Collect training data for model improvement
   */
  async collectTrainingData() {
    try {
      logger.info('📊 Collecting training data...');

      // Get recent user data
      const recentUsers = await User.find({
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      }).select('location riskScore activityData createdAt');

      // Get recent policies
      const recentPolicies = await Policy.find({
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }).populate('userId', 'location riskScore');

      // Get recent claims
      const recentClaims = await Claim.find({
        submittedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }).populate('userId', 'location riskScore').populate('policyId');

      // Get environmental data (simulated)
      const environmentalData = await this.collectEnvironmentalData();

      const trainingData = {
        users: recentUsers,
        policies: recentPolicies,
        claims: recentClaims,
        environmental: environmentalData,
        totalRecords: recentUsers.length + recentPolicies.length + recentClaims.length,
        collectedAt: new Date()
      };

      logger.info(`✅ Training data collected: ${trainingData.totalRecords} records`);
      return trainingData;

    } catch (error) {
      logger.error('Error collecting training data:', error);
      throw error;
    }
  }

  /**
   * Retrain ML models with new data
   */
  async retrainModels(trainingData) {
    try {
      logger.info('🔄 Retraining models...');

      const modelsToRetrain = ['risk_prediction', 'fraud_detection', 'parametric_trigger'];
      const results = [];

      for (const modelName of modelsToRetrain) {
        try {
          logger.info(`Training ${modelName} model...`);

          // Prepare data for this model
          const modelData = await this.prepareDataForModel(modelName, trainingData);

          // Call Python service to retrain
          const retrainingResult = await this.callPythonRetrainingService(modelName, modelData);

          results.push({
            modelName,
            success: retrainingResult.success,
            newVersion: retrainingResult.version,
            metrics: retrainingResult.metrics,
            trainingTime: retrainingResult.trainingTime,
            error: retrainingResult.error
          });

          if (retrainingResult.success) {
            logger.info(`✅ ${modelName} model retrained successfully`);
          } else {
            logger.error(`❌ ${modelName} model retraining failed: ${retrainingResult.error}`);
          }

        } catch (error) {
          logger.error(`Error retraining ${modelName}:`, error);
          results.push({
            modelName,
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('Error in model retraining:', error);
      throw error;
    }
  }

  /**
   * Evaluate new model performance
   */
  async evaluateNewModels(retrainingResults) {
    try {
      logger.info('📈 Evaluating new models...');

      const evaluationResults = [];

      for (const result of retrainingResults) {
        if (!result.success) {
          evaluationResults.push({
            ...result,
            evaluation: null,
            betterThanCurrent: false
          });
          continue;
        }

        try {
          // Get evaluation metrics from Python service
          const evaluation = await this.callPythonEvaluationService(result.modelName, result.newVersion);

          // Compare with current model
          const currentMetrics = this.modelVersions[result.modelName]?.metrics || {};
          const betterThanCurrent = this.compareModelPerformance(evaluation.metrics, currentMetrics);

          evaluationResults.push({
            ...result,
            evaluation,
            betterThanCurrent,
            improvement: this.calculateImprovement(evaluation.metrics, currentMetrics)
          });

        } catch (error) {
          logger.error(`Error evaluating ${result.modelName}:`, error);
          evaluationResults.push({
            ...result,
            evaluation: null,
            betterThanCurrent: false,
            error: error.message
          });
        }
      }

      return evaluationResults;

    } catch (error) {
      logger.error('Error evaluating models:', error);
      throw error;
    }
  }

  /**
   * Deploy improved models
   */
  async deployImprovedModels(evaluationResults) {
    try {
      logger.info('🚀 Deploying improved models...');

      const deploymentResults = [];

      for (const result of evaluationResults) {
        const shouldDeploy = result.success && result.betterThanCurrent;

        if (shouldDeploy) {
          try {
            // Deploy new model version
            const deployment = await this.callPythonDeploymentService(result.modelName, result.newVersion);

            if (deployment.success) {
              // Update model version in memory
              this.modelVersions[result.modelName] = {
                version: result.newVersion,
                deployedAt: new Date(),
                metrics: result.evaluation.metrics,
                improvement: result.improvement
              };

              deploymentResults.push({
                ...result,
                deployed: true,
                deployment
              });

              logger.info(`✅ ${result.modelName} model deployed successfully`);
            } else {
              deploymentResults.push({
                ...result,
                deployed: false,
                error: deployment.error
              });
            }

          } catch (error) {
            logger.error(`Error deploying ${result.modelName}:`, error);
            deploymentResults.push({
              ...result,
              deployed: false,
              error: error.message
            });
          }
        } else {
          deploymentResults.push({
            ...result,
            deployed: false,
            reason: result.success ? 'Not better than current model' : 'Retraining failed'
          });
        }
      }

      return deploymentResults;

    } catch (error) {
      logger.error('Error deploying models:', error);
      throw error;
    }
  }

  /**
   * Send improvement notifications
   */
  async sendImprovementNotifications(deploymentResults) {
    try {
      const improvedModels = deploymentResults.filter(r => r.deployed);

      if (improvedModels.length === 0) {
        return;
      }

      // Send to admin users
      const adminUsers = await User.find({ role: 'admin' });

      const message = `${improvedModels.length} AI models have been improved and deployed. System performance enhanced.`;

      for (const admin of adminUsers) {
        await notificationAutomation.sendNotification({
          userId: admin._id,
          type: 'model_improvement',
          message,
          data: {
            improvedModels: improvedModels.map(m => ({
              name: m.modelName,
              improvement: m.improvement,
              newVersion: m.newVersion
            }))
          },
          channels: ['email']
        });
      }

    } catch (error) {
      logger.error('Error sending improvement notifications:', error);
    }
  }

  // Helper methods
  async getNewDataCount() {
    // Count new records since last improvement
    const lastImprovement = await this.getLastImprovementDate();
    const newUsers = await User.find({ createdAt: { $gte: lastImprovement } }).countDocuments();
    const newPolicies = await Policy.find({ createdAt: { $gte: lastImprovement } }).countDocuments();
    const newClaims = await Claim.find({ submittedAt: { $gte: lastImprovement } }).countDocuments();

    return newUsers + newPolicies + newClaims;
  }

  async checkModelPerformance() {
    // Simulate performance check - in real implementation, monitor prediction accuracy
    return { degraded: false, details: 'Performance within acceptable range' };
  }

  async getDaysSinceLastImprovement() {
    // Simulate - in real implementation, track from database
    return 15; // Assume 15 days for demo
  }

  async detectPatternChanges() {
    // Simulate pattern change detection
    return { significant: false, details: 'No significant pattern changes' };
  }

  async collectEnvironmentalData() {
    // Simulate collecting environmental data for training
    return {
      weatherPatterns: [],
      pollutionLevels: [],
      trafficData: [],
      collectedAt: new Date()
    };
  }

  async prepareDataForModel(modelName, trainingData) {
    // Prepare data specific to each model
    switch (modelName) {
      case 'risk_prediction':
        return {
          users: trainingData.users,
          environmental: trainingData.environmental,
          labels: trainingData.users.map(u => u.riskScore)
        };
      case 'fraud_detection':
        return {
          claims: trainingData.claims,
          users: trainingData.users,
          labels: trainingData.claims.map(c => c.fraudScore > 50 ? 1 : 0)
        };
      case 'parametric_trigger':
        return {
          claims: trainingData.claims,
          environmental: trainingData.environmental,
          labels: trainingData.claims.map(c => c.triggerType)
        };
      default:
        return trainingData;
    }
  }

  async callPythonRetrainingService(modelName, data) {
    try {
      const response = await axios.post(`${this.pythonServiceUrl}/retrain/${modelName}`, {
        data,
        timestamp: new Date()
      }, {
        timeout: 300000 // 5 minutes
      });

      return response.data;
    } catch (error) {
      throw new Error(`Python retraining service error: ${error.message}`);
    }
  }

  async callPythonEvaluationService(modelName, version) {
    try {
      const response = await axios.get(`${this.pythonServiceUrl}/evaluate/${modelName}/${version}`, {
        timeout: 60000
      });

      return response.data;
    } catch (error) {
      throw new Error(`Python evaluation service error: ${error.message}`);
    }
  }

  async callPythonDeploymentService(modelName, version) {
    try {
      const response = await axios.post(`${this.pythonServiceUrl}/deploy/${modelName}/${version}`, {}, {
        timeout: 60000
      });

      return response.data;
    } catch (error) {
      throw new Error(`Python deployment service error: ${error.message}`);
    }
  }

  compareModelPerformance(newMetrics, currentMetrics) {
    // Compare key metrics to determine if new model is better
    const keyMetrics = ['accuracy', 'precision', 'recall', 'f1_score'];

    let betterCount = 0;
    let totalCount = 0;

    for (const metric of keyMetrics) {
      if (newMetrics[metric] && currentMetrics[metric]) {
        totalCount++;
        if (newMetrics[metric] > currentMetrics[metric]) {
          betterCount++;
        }
      }
    }

    // Consider better if majority of metrics improved
    return betterCount > totalCount / 2;
  }

  calculateImprovement(newMetrics, currentMetrics) {
    const improvements = {};

    for (const [metric, value] of Object.entries(newMetrics)) {
      const current = currentMetrics[metric];
      if (current && typeof value === 'number' && typeof current === 'number') {
        improvements[metric] = ((value - current) / current * 100).toFixed(2) + '%';
      }
    }

    return improvements;
  }

  async getLastImprovementDate() {
    // Simulate - in real implementation, get from database
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  }

  async updateModelVersions(deploymentResults) {
    try {
      // Save to file for persistence
      const versionsPath = path.join(__dirname, '../config/model_versions.json');
      await fs.writeFile(versionsPath, JSON.stringify(this.modelVersions, null, 2));

      logger.info('✅ Model versions updated');
    } catch (error) {
      logger.error('Error updating model versions:', error);
    }
  }

  loadModelVersions() {
    try {
      // Load from file if exists
      const versionsPath = path.join(__dirname, '../config/model_versions.json');
      if (require('fs').existsSync(versionsPath)) {
        return JSON.parse(require('fs').readFileSync(versionsPath, 'utf8'));
      }
    } catch (error) {
      logger.error('Error loading model versions:', error);
    }

    // Default versions
    return {
      risk_prediction: { version: '1.0.0', deployedAt: new Date() },
      fraud_detection: { version: '1.0.0', deployedAt: new Date() },
      parametric_trigger: { version: '1.0.0', deployedAt: new Date() }
    };
  }

  loadImprovementRules() {
    return {
      minNewRecords: 100,
      minTrainingRecords: 500,
      maxDaysBetweenImprovements: 30,
      minImprovementThreshold: 0.05, // 5% improvement required
      evaluationMetrics: ['accuracy', 'precision', 'recall', 'f1_score']
    };
  }
}

const modelImprovementAutomation = new ModelImprovementAutomation();

module.exports = { modelImprovementAutomation };
