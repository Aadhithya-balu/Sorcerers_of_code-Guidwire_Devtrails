/**
 * Policy Workflow Automation
 * Automatically creates and manages insurance policies
 */

const axios = require('axios');
const winston = require('winston');
const User = require('../../Backend/insurance-module/models/User');
const Policy = require('../../Backend/insurance-module/models/Policy');
const { notificationAutomation } = require('../notifications');
const { premiumAutomation } = require('./premiumWorkflow');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/policy-workflow.log' }),
    new winston.transports.Console()
  ]
});

class PolicyAutomation {
  constructor() {
    this.policyTemplates = this.loadPolicyTemplates();
  }

  /**
   * Auto-create policy for user
   */
  async autoCreatePolicy(policyData) {
    try {
      const { userId, planType, coverageAmount } = policyData;

      logger.info(`📋 Auto-creating policy for user: ${userId}, plan: ${planType}`);

      // 1. Get user details
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Get policy template
      const template = this.policyTemplates[planType];
      if (!template) {
        throw new Error(`Invalid plan type: ${planType}`);
      }

      // 3. Calculate dynamic premium
      const premium = await premiumAutomation.calculateDynamicPremium({
        userId,
        planType,
        coverageAmount: coverageAmount || template.defaultCoverage
      });

      // 4. Set up triggers based on user location and activity
      const triggers = await this.setupParametricTriggers(user, template);

      // 5. Create policy record
      const policy = new Policy({
        userId,
        planType,
        coverageAmount: coverageAmount || template.defaultCoverage,
        premium: premium.weeklyPremium,
        triggers,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
        autoRenewal: true,
        paymentSchedule: 'weekly',
        createdAt: new Date()
      });

      await policy.save();

      // 6. Update user with policy reference
      await User.findByIdAndUpdate(userId, {
        $push: { policies: policy._id },
        currentPolicy: policy._id
      });

      // 7. Send policy creation notification
      await notificationAutomation.sendNotification({
        userId,
        type: 'policy_created',
        message: `Your ${planType} policy has been created! Weekly premium: ₹${premium.weeklyPremium}`,
        data: { policy, premium }
      });

      logger.info(`✅ Policy created successfully: ${policy._id}`);
      return {
        success: true,
        policyId: policy._id,
        premium: premium.weeklyPremium,
        triggers: triggers.length,
        message: 'Policy created successfully'
      };

    } catch (error) {
      logger.error('Error in auto policy creation:', error);
      throw error;
    }
  }

  /**
   * Auto-update policy based on risk changes
   */
  async autoUpdatePolicy(policyId, updates) {
    try {
      logger.info(`🔄 Auto-updating policy: ${policyId}`);

      const policy = await Policy.findById(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      // Apply updates
      Object.assign(policy, updates);
      policy.lastUpdated = new Date();

      await policy.save();

      // Notify user of policy update
      await notificationAutomation.sendNotification({
        userId: policy.userId,
        type: 'policy_updated',
        message: 'Your policy has been updated automatically.',
        data: { policy, updates }
      });

      return {
        success: true,
        policyId,
        updates,
        message: 'Policy updated successfully'
      };

    } catch (error) {
      logger.error('Error in auto policy update:', error);
      throw error;
    }
  }

  /**
   * Process policy updates (renewals, expirations, etc.)
   */
  async processPolicyUpdates() {
    try {
      logger.info('🔄 Processing policy updates...');

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      // Find policies expiring soon
      const expiringPolicies = await Policy.find({
        endDate: { $lte: thirtyDaysFromNow },
        status: 'active',
        autoRenewal: true
      });

      let renewed = 0;
      let expired = 0;

      for (const policy of expiringPolicies) {
        try {
          if (policy.endDate <= now) {
            // Policy has expired
            await this.handlePolicyExpiration(policy);
            expired++;
          } else {
            // Policy expiring soon - send renewal reminder
            await this.sendRenewalReminder(policy);
          }
        } catch (error) {
          logger.error(`Error processing policy ${policy._id}:`, error);
        }
      }

      // Find policies that need renewal
      const policiesToRenew = await Policy.find({
        endDate: { $lte: now },
        status: 'active',
        autoRenewal: true
      });

      for (const policy of policiesToRenew) {
        try {
          await this.renewPolicy(policy);
          renewed++;
        } catch (error) {
          logger.error(`Error renewing policy ${policy._id}:`, error);
        }
      }

      logger.info(`✅ Policy updates completed: ${renewed} renewed, ${expired} expired`);
      return {
        renewed,
        expired,
        reminders: expiringPolicies.length - expired,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error processing policy updates:', error);
      throw error;
    }
  }

  /**
   * Setup parametric triggers based on user profile
   */
  async setupParametricTriggers(user, template) {
    try {
      const triggers = [];

      // Location-based triggers
      if (user.location) {
        triggers.push({
          type: 'location_risk',
          condition: 'zone_risk_change',
          threshold: user.riskZone?.riskMultiplier || 1.0,
          enabled: true
        });
      }

      // Weather-based triggers
      triggers.push({
        type: 'weather_rainfall',
        condition: 'rainfall_exceeds',
        threshold: 50, // 50mm rainfall
        enabled: true
      });

      // Pollution-based triggers
      triggers.push({
        type: 'pollution_aqi',
        condition: 'aqi_exceeds',
        threshold: 200, // AQI 200
        enabled: true
      });

      // Traffic disruption triggers
      triggers.push({
        type: 'traffic_disruption',
        condition: 'traffic_delay_exceeds',
        threshold: 60, // 60 minutes delay
        enabled: true
      });

      // Activity-based triggers
      if (user.userType === 'food_delivery') {
        triggers.push({
          type: 'delivery_delay',
          condition: 'delivery_delay_exceeds',
          threshold: 45, // 45 minutes
          enabled: true
        });
      }

      return triggers;
    } catch (error) {
      logger.error('Error setting up parametric triggers:', error);
      return [];
    }
  }

  /**
   * Handle policy expiration
   */
  async handlePolicyExpiration(policy) {
    try {
      // Update policy status
      policy.status = 'expired';
      policy.expiredAt = new Date();
      await policy.save();

      // Notify user
      await notificationAutomation.sendNotification({
        userId: policy.userId,
        type: 'policy_expired',
        message: 'Your insurance policy has expired. Please renew to continue coverage.',
        data: { policy }
      });

      logger.info(`📅 Policy expired: ${policy._id}`);
    } catch (error) {
      logger.error('Error handling policy expiration:', error);
      throw error;
    }
  }

  /**
   * Send renewal reminder
   */
  async sendRenewalReminder(policy) {
    try {
      const daysUntilExpiry = Math.ceil((policy.endDate - new Date()) / (1000 * 60 * 60 * 24));

      await notificationAutomation.sendNotification({
        userId: policy.userId,
        type: 'renewal_reminder',
        message: `Your policy expires in ${daysUntilExpiry} days. Auto-renewal is enabled.`,
        data: { policy, daysUntilExpiry }
      });

      logger.info(`📅 Renewal reminder sent for policy: ${policy._id}`);
    } catch (error) {
      logger.error('Error sending renewal reminder:', error);
      throw error;
    }
  }

  /**
   * Renew policy automatically
   */
  async renewPolicy(policy) {
    try {
      // Calculate new premium
      const newPremium = await premiumAutomation.calculateDynamicPremium({
        userId: policy.userId,
        planType: policy.planType,
        coverageAmount: policy.coverageAmount
      });

      // Extend policy for another year
      policy.endDate = new Date(policy.endDate.getTime() + (365 * 24 * 60 * 60 * 1000));
      policy.premium = newPremium.weeklyPremium;
      policy.renewedAt = new Date();
      policy.renewalCount = (policy.renewalCount || 0) + 1;

      await policy.save();

      // Notify user
      await notificationAutomation.sendNotification({
        userId: policy.userId,
        type: 'policy_renewed',
        message: `Your policy has been renewed automatically. New weekly premium: ₹${newPremium.weeklyPremium}`,
        data: { policy, newPremium }
      });

      logger.info(`🔄 Policy renewed: ${policy._id}`);
    } catch (error) {
      logger.error('Error renewing policy:', error);
      throw error;
    }
  }

  /**
   * Load policy templates
   */
  loadPolicyTemplates() {
    return {
      basic: {
        name: 'Basic Coverage',
        defaultCoverage: 50000,
        description: 'Essential coverage for gig workers',
        features: ['basic_accident', 'medical_emergency'],
        riskMultiplier: 1.0
      },
      standard: {
        name: 'Standard Coverage',
        defaultCoverage: 100000,
        description: 'Comprehensive coverage with parametric triggers',
        features: ['accident_coverage', 'medical_emergency', 'parametric_triggers'],
        riskMultiplier: 1.2
      },
      premium: {
        name: 'Premium Coverage',
        defaultCoverage: 200000,
        description: 'Full protection with advanced features',
        features: ['comprehensive_coverage', 'parametric_triggers', 'emergency_support'],
        riskMultiplier: 1.5
      }
    };
  }
}

const policyAutomation = new PolicyAutomation();

module.exports = { policyAutomation };
