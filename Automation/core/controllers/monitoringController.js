/**
 * Monitoring Controller
 * Real-time monitoring and analytics for automation system
 */

const mongoose = require('mongoose');
const winston = require('winston');
const User = require('../../../Backend/insurance-module/models/User');
const Policy = require('../../../Backend/insurance-module/models/Policy');
const Claim = require('../../../Backend/insurance-module/models/Claim');
const RiskData = require('../../../Backend/insurance-module/models/RiskData');
const FraudLog = require('../../../Backend/insurance-module/models/FraudLog');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/monitoring.log' }),
    new winston.transports.Console()
  ]
});

class MonitoringController {
  constructor() {
    this.metrics = {
      users: { onboarded: 0, active: 0, total: 0 },
      policies: { created: 0, active: 0, total: 0 },
      claims: { submitted: 0, processed: 0, approved: 0, rejected: 0 },
      payouts: { processed: 0, totalAmount: 0 },
      fraud: { detected: 0, blocked: 0 },
      notifications: { sent: 0, delivered: 0, failed: 0 },
      ml: { predictions: 0, accuracy: 0, retrains: 0 }
    };

    this.getDashboard = this.getDashboard.bind(this);
    this.getMetrics = this.getMetrics.bind(this);
    this.getLogs = this.getLogs.bind(this);
    this.getAlerts = this.getAlerts.bind(this);
    this.getWorkflows = this.getWorkflows.bind(this);
    this.getWorkflowStatus = this.getWorkflowStatus.bind(this);
    this.retryWorkflow = this.retryWorkflow.bind(this);
    this.getIntegrationStatus = this.getIntegrationStatus.bind(this);
    this.testIntegration = this.testIntegration.bind(this);
  }

  // Dashboard overview
  async getDashboard(req, res) {
    try {
      const dashboard = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        },
        metrics: await this.getCurrentMetrics(),
        alerts: await this.getActiveAlerts(),
        workflows: await this.getWorkflowStatus(),
        performance: await this.getPerformanceMetrics()
      };

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Real-time metrics
  async getMetrics(req, res) {
    try {
      const metrics = await this.getCurrentMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // System logs
  async getLogs(req, res) {
    try {
      const { level = 'info', limit = 100, startDate, endDate } = req.query;

      // In a real implementation, you'd query a log database
      // For now, return mock data
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Automation system started successfully',
          service: 'parametric-automation'
        },
        {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          level: 'info',
          message: 'Risk prediction completed for 150 users',
          service: 'risk-prediction'
        },
        {
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          level: 'warn',
          message: 'Weather API rate limit approaching',
          service: 'integrations'
        }
      ];

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      logger.error('Error getting logs:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Active alerts
  async getAlerts(req, res) {
    try {
      const alerts = await this.getActiveAlerts();

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error getting alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Workflow status
  async getWorkflows(req, res) {
    try {
      const workflows = await this.getWorkflowStatus();

      res.json({
        success: true,
        data: workflows
      });
    } catch (error) {
      logger.error('Error getting workflows:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getWorkflowStatus(req, res) {
    try {
      const { workflowId } = req.params;
      const status = await this.getWorkflowStatusById(workflowId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error getting workflow status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async retryWorkflow(req, res) {
    try {
      const { workflowId } = req.params;

      // Retry logic would go here
      const result = await this.retryWorkflowById(workflowId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error retrying workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Integration status
  async getIntegrationStatus(req, res) {
    try {
      const integrations = {
        weather: { status: 'operational', lastCheck: new Date().toISOString() },
        location: { status: 'operational', lastCheck: new Date().toISOString() },
        payment: { status: 'operational', lastCheck: new Date().toISOString() },
        notification: { status: 'operational', lastCheck: new Date().toISOString() },
        ml: { status: 'operational', lastCheck: new Date().toISOString() }
      };

      res.json({
        success: true,
        data: integrations
      });
    } catch (error) {
      logger.error('Error getting integration status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async testIntegration(req, res) {
    try {
      const { integrationType } = req.body;

      // Test integration logic
      const result = await this.testIntegrationByType(integrationType);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error testing integration:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Helper methods
  async getCurrentMetrics() {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('MongoDB connection is not ready');
      }

      const users = db.collection('users');
      const policies = db.collection('policies');
      const claims = db.collection('claims');
      const fraudLogs = db.collection('fraudlogs');

      // Get real-time metrics from database
      const [
        userCount,
        policyCount,
        claimStats,
        payoutStats,
        fraudStats
      ] = await Promise.all([
        users.countDocuments(),
        policies.countDocuments(),
        claims.aggregate([
          {
            $group: {
              _id: null,
              submitted: { $sum: 1 },
              approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
              processed: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } }
            }
          }
        ]).toArray(),
        claims.aggregate([
          {
            $match: { status: 'PAID' }
          },
          {
            $group: {
              _id: null,
              processed: { $sum: 1 },
              totalAmount: { $sum: '$payoutAmount' }
            }
          }
        ]).toArray(),
        fraudLogs.aggregate([
          {
            $group: {
              _id: null,
              detected: { $sum: 1 },
              blocked: { $sum: { $cond: [{ $eq: ['$action', 'blocked'] }, 1, 0] } }
            }
          }
        ]).toArray()
      ]);

      return {
        users: {
          total: userCount,
          active: userCount, // Simplified
          onboarded: userCount
        },
        policies: {
          total: policyCount,
          active: policyCount,
          created: policyCount
        },
        claims: claimStats[0] || { submitted: 0, approved: 0, rejected: 0 },
        payouts: payoutStats[0] || { processed: 0, totalAmount: 0 },
        fraud: fraudStats[0] || { detected: 0, blocked: 0 },
        notifications: this.metrics.notifications,
        ml: this.metrics.ml,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting current metrics:', error);
      return this.metrics;
    }
  }

  async getActiveAlerts() {
    try {
      const [latestRiskRows, latestClaims, latestFraudLogs, expiringPolicies] = await Promise.all([
        RiskData.find({})
          .sort({ timestamp: -1, createdAt: -1 })
          .limit(20)
          .lean(),
        Claim.find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        FraudLog.find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        Policy.find({
          status: 'ACTIVE',
          expiryDate: { $lte: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) }
        })
          .sort({ expiryDate: 1 })
          .limit(10)
          .lean()
      ]);

      const alerts = [];
      const seenKeys = new Set();

      const pushAlert = (alert) => {
        const dedupeKey = `${alert.title}-${alert.zone}-${alert.severity}`;
        if (seenKeys.has(dedupeKey)) {
          return;
        }
        seenKeys.add(dedupeKey);
        alerts.push(alert);
      };

      for (const riskRow of latestRiskRows) {
        const overallRisk = riskRow?.riskMetrics?.overallRisk ?? 0;
        const rainfall = riskRow?.weatherData?.rainfall ?? 0;
        const aqi = riskRow?.weatherData?.aqi ?? 0;
        const traffic = riskRow?.activityData?.routeBlockages ?? 0;
        const zone = riskRow?.locationData?.address || riskRow?.locationData?.zone || 'Unknown Zone';
        const timestamp = riskRow?.timestamp || riskRow?.createdAt || new Date();

        if (overallRisk >= 70) {
          pushAlert({
            id: `risk-${riskRow._id}`,
            title: 'High risk disruption zone',
            description: `Overall disruption risk is ${overallRisk}/100 in ${zone}. Workers in this area may face severe delivery impact.`,
            timestamp,
            severity: 'High',
            zone
          });
        }

        if (rainfall >= 40) {
          pushAlert({
            id: `rain-${riskRow._id}`,
            title: 'Heavy rain disruption',
            description: `Rainfall has reached ${rainfall} mm around ${zone}. Parametric weather disruption conditions are elevated.`,
            timestamp,
            severity: rainfall >= 70 ? 'Critical' : 'High',
            zone
          });
        }

        if (aqi >= 150) {
          pushAlert({
            id: `aqi-${riskRow._id}`,
            title: 'AQI health warning',
            description: `AQI is ${aqi} in ${zone}. Outdoor gig work conditions are becoming unhealthy.`,
            timestamp,
            severity: aqi >= 220 ? 'Critical' : 'Medium',
            zone
          });
        }

        if (traffic >= 3) {
          pushAlert({
            id: `traffic-${riskRow._id}`,
            title: 'Traffic blockage alert',
            description: `Route blockage score is ${traffic}/5 in ${zone}. Delivery delays and disruption claims may increase.`,
            timestamp,
            severity: traffic >= 4 ? 'High' : 'Medium',
            zone
          });
        }
      }

      for (const claim of latestClaims) {
        const zone =
          claim?.triggerEvidence?.locationData?.address ||
          claim?.triggerEvidence?.locationData?.zone ||
          'Claim Zone';
        const claimType = (claim?.claimType || 'DISRUPTION').replaceAll('_', ' ').toLowerCase();
        const status = claim?.status || 'SUBMITTED';

        if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
          pushAlert({
            id: `claim-${claim._id}`,
            title: 'Active disruption claim',
            description: `${claimType} claim is ${status.toLowerCase().replace('_', ' ')} for ${zone}.`,
            timestamp: claim?.createdAt || new Date(),
            severity: status === 'UNDER_REVIEW' ? 'Medium' : 'Info',
            zone
          });
        }
      }

      for (const fraudLog of latestFraudLogs) {
        if (!['HIGH', 'CRITICAL'].includes(fraudLog?.severity || '')) {
          continue;
        }

        pushAlert({
          id: `fraud-${fraudLog._id}`,
          title: 'Fraud review required',
          description: `${fraudLog.fraudType.replaceAll('_', ' ')} flagged with score ${fraudLog.fraudScore}. Manual review may delay payout.`,
          timestamp: fraudLog?.createdAt || new Date(),
          severity: fraudLog.severity === 'CRITICAL' ? 'Critical' : 'High',
          zone: 'Fraud Monitoring'
        });
      }

      for (const policy of expiringPolicies) {
        pushAlert({
          id: `policy-${policy._id}`,
          title: 'Policy expiring soon',
          description: `An active ${policy.plan} policy expires on ${new Date(policy.expiryDate).toLocaleDateString()}. Renewal is required to avoid protection gaps.`,
          timestamp: policy?.updatedAt || policy?.createdAt || new Date(),
          severity: 'Info',
          zone: 'Policy'
        });
      }

      return alerts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);
    } catch (error) {
      logger.error('Error building active alerts:', error);
      return [];
    }
  }

  async getWorkflowStatus() {
    return {
      onboarding: { status: 'active', lastRun: new Date().toISOString(), success: true },
      'policy-creation': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'premium-calculation': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'risk-prediction': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'trigger-detection': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'fraud-detection': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'claim-processing': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'payout-processing': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'notification-system': { status: 'active', lastRun: new Date().toISOString(), success: true },
      'ml-improvement': { status: 'scheduled', nextRun: new Date(Date.now() + 86400000).toISOString(), success: true }
    };
  }

  async getPerformanceMetrics() {
    return {
      responseTime: {
        average: 245, // ms
        p95: 450,
        p99: 800
      },
      throughput: {
        requestsPerSecond: 15.2,
        requestsPerMinute: 912
      },
      errorRate: {
        percentage: 0.02,
        count: 3
      },
      uptime: {
        percentage: 99.98,
        downtime: 0.02 // hours
      }
    };
  }

  async getWorkflowStatusById(workflowId) {
    const workflows = await this.getWorkflowStatus();
    return workflows[workflowId] || { status: 'not_found' };
  }

  async retryWorkflowById(workflowId) {
    // Mock retry logic
    return {
      workflowId,
      status: 'retrying',
      timestamp: new Date().toISOString()
    };
  }

  async testIntegrationByType(integrationType) {
    // Mock integration test
    return {
      integration: integrationType,
      status: 'success',
      responseTime: 150,
      timestamp: new Date().toISOString()
    };
  }
}

const monitoringController = new MonitoringController();

module.exports = { monitoringController };
