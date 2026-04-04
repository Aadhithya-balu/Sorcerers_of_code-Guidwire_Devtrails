/**
 * Premium Workflow Automation
 * Automatically calculates and adjusts weekly premiums based on real-time risk
 */

const axios = require('axios');
const winston = require('winston');
const User = require('../../Backend/insurance-module/models/User');
const Policy = require('../../Backend/insurance-module/models/Policy');
const RiskData = require('../../Backend/insurance-module/models/RiskData');
const { notificationAutomation } = require('../notifications');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/premium-workflow.log' }),
    new winston.transports.Console()
  ]
});

class PremiumAutomation {
  constructor() {
    this.baseRates = this.loadBaseRates();
    this.riskMultipliers = this.loadRiskMultipliers();
  }

  /**
   * Calculate dynamic premium for user
   */
  async calculateDynamicPremium(params) {
    try {
      const { userId, planType, coverageAmount } = params;

      logger.info(`💰 Calculating dynamic premium for user: ${userId}, plan: ${planType}`);

      // 1. Get user and current risk data
      const user = await User.findById(userId).populate('currentPolicy');
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Get latest risk data
      const latestRiskData = await RiskData.findOne({ userId })
        .sort({ timestamp: -1 })
        .limit(1);

      // 3. Calculate base premium
      const basePremium = this.calculateBasePremium(planType, coverageAmount);

      // 4. Apply risk multipliers
      const riskMultiplier = await this.calculateRiskMultiplier(user, latestRiskData);

      // 5. Apply platform-specific adjustments
      const platformMultiplier = this.getPlatformMultiplier(user.platform);

      // 6. Calculate final weekly premium
      const weeklyPremium = Math.round(basePremium * riskMultiplier * platformMultiplier);

      // 7. Ensure minimum premium
      const finalPremium = Math.max(weeklyPremium, this.baseRates.minimumWeekly);

      const result = {
        basePremium,
        riskMultiplier,
        platformMultiplier,
        weeklyPremium: finalPremium,
        monthlyPremium: finalPremium * 4,
        annualPremium: finalPremium * 52,
        factors: {
          userRisk: user.riskProfile?.score || 50,
          locationRisk: latestRiskData?.location?.riskLevel || 'medium',
          activityRisk: latestRiskData?.activity?.riskLevel || 'medium',
          environmentalRisk: this.calculateEnvironmentalRisk(latestRiskData)
        },
        calculatedAt: new Date()
      };

      logger.info(`✅ Premium calculated: ₹${finalPremium}/week for user ${userId}`);
      return result;

    } catch (error) {
      logger.error('Error calculating dynamic premium:', error);
      throw error;
    }
  }

  /**
   * Update premiums for all active users
   */
  async updateAllPremiums() {
    try {
      logger.info('🔄 Starting bulk premium update...');

      // Get all active policies
      const activePolicies = await Policy.find({ status: 'active' })
        .populate('userId')
        .limit(1000); // Process in batches

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const policy of activePolicies) {
        try {
          // Check if premium was updated in last 24 hours
          const lastUpdate = policy.lastPremiumUpdate || new Date(0);
          const hoursSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60);

          if (hoursSinceUpdate < 24) {
            skipped++;
            continue;
          }

          // Calculate new premium
          const newPremium = await this.calculateDynamicPremium({
            userId: policy.userId._id,
            planType: policy.planType,
            coverageAmount: policy.coverageAmount
          });

          // Check if premium changed significantly (>10%)
          const premiumChange = Math.abs(newPremium.weeklyPremium - policy.premium) / policy.premium;

          if (premiumChange > 0.1) { // More than 10% change
            const oldPremium = policy.premium;
            policy.premium = newPremium.weeklyPremium;
            policy.lastPremiumUpdate = new Date();
            await policy.save();

            // Notify user of premium change
            await notificationAutomation.sendNotification({
              userId: policy.userId._id,
              type: 'premium_changed',
              message: `Your weekly premium has changed from ₹${oldPremium} to ₹${newPremium.weeklyPremium}`,
              data: { oldPremium, newPremium, policy }
            });

            updated++;
            logger.info(`💰 Premium updated for user ${policy.userId._id}: ₹${oldPremium} → ₹${newPremium.weeklyPremium}`);
          } else {
            skipped++;
          }

        } catch (error) {
          logger.error(`Error updating premium for policy ${policy._id}:`, error);
          errors++;
        }
      }

      logger.info(`✅ Bulk premium update completed: ${updated} updated, ${skipped} skipped, ${errors} errors`);
      return {
        updated,
        skipped,
        errors,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in bulk premium update:', error);
      throw error;
    }
  }

  /**
   * Calculate base premium
   */
  calculateBasePremium(planType, coverageAmount) {
    const planRates = this.baseRates.plans[planType];
    if (!planRates) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    // Base rate per lakh of coverage
    const baseRatePerLakh = planRates.baseRate;
    const coverageInLakhs = coverageAmount / 100000;

    return baseRatePerLakh * coverageInLakhs;
  }

  /**
   * Calculate risk multiplier based on user and environmental factors
   */
  async calculateRiskMultiplier(user, riskData) {
    try {
      let multiplier = 1.0;

      // 1. User risk profile
      const userRiskScore = user.riskProfile?.score || 50;
      multiplier *= this.riskMultipliers.userRisk[userRiskScore > 70 ? 'high' : userRiskScore > 30 ? 'medium' : 'low'];

      // 2. Location risk
      const locationRisk = riskData?.location?.riskLevel || 'medium';
      multiplier *= this.riskMultipliers.location[locationRisk];

      // 3. Activity risk
      const activityRisk = riskData?.activity?.riskLevel || 'medium';
      multiplier *= this.riskMultipliers.activity[activityRisk];

      // 4. Environmental risk
      const environmentalRisk = this.calculateEnvironmentalRisk(riskData);
      multiplier *= environmentalRisk;

      // 5. Zone multiplier
      const zoneMultiplier = user.riskZone?.riskMultiplier || 1.0;
      multiplier *= zoneMultiplier;

      // 6. Time-based adjustments (peak hours = higher risk)
      const hourMultiplier = this.getHourMultiplier();
      multiplier *= hourMultiplier;

      return Math.max(0.5, Math.min(3.0, multiplier)); // Clamp between 0.5x and 3.0x

    } catch (error) {
      logger.error('Error calculating risk multiplier:', error);
      return 1.0; // Default multiplier
    }
  }

  /**
   * Calculate environmental risk from weather/pollution data
   */
  calculateEnvironmentalRisk(riskData) {
    if (!riskData?.environmental) return 1.0;

    const { weatherRisk, pollutionRisk, trafficRisk } = riskData.environmental;

    // Weighted average of environmental factors
    const environmentalScore = (
      weatherRisk * 0.4 +
      pollutionRisk * 0.4 +
      trafficRisk * 0.2
    );

    // Convert to multiplier (1.0 to 2.0 range)
    return 1.0 + (environmentalScore * 0.5);
  }

  /**
   * Get platform-specific multiplier
   */
  getPlatformMultiplier(platform) {
    const multipliers = {
      'swiggy': 1.1,  // Food delivery - moderate risk
      'zomato': 1.1,  // Food delivery - moderate risk
      'uber': 1.3,    // Ride hailing - higher risk
      'ola': 1.3,     // Ride hailing - higher risk
      'rapido': 1.2,  // Bike taxi - medium-high risk
      'default': 1.0
    };

    return multipliers[platform?.toLowerCase()] || multipliers.default;
  }

  /**
   * Get hour-based multiplier (peak hours = higher premiums)
   */
  getHourMultiplier() {
    const hour = new Date().getHours();

    // Peak hours: morning rush (7-9), evening rush (17-21)
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 21)) {
      return 1.2; // 20% higher during peak
    }

    // Off-peak hours: late night/early morning
    if (hour >= 22 || hour <= 5) {
      return 0.9; // 10% lower during off-peak
    }

    return 1.0; // Normal hours
  }

  /**
   * Load base rates configuration
   */
  loadBaseRates() {
    return {
      minimumWeekly: 50, // Minimum ₹50/week
      plans: {
        basic: {
          baseRate: 25, // ₹25 per lakh per week
          description: 'Basic coverage'
        },
        standard: {
          baseRate: 40, // ₹40 per lakh per week
          description: 'Standard coverage with parametric triggers'
        },
        premium: {
          baseRate: 60, // ₹60 per lakh per week
          description: 'Premium coverage with advanced features'
        }
      }
    };
  }

  /**
   * Load risk multipliers
   */
  loadRiskMultipliers() {
    return {
      userRisk: {
        low: 0.8,    // 20% discount for low risk users
        medium: 1.0, // Standard rate
        high: 1.5    // 50% surcharge for high risk users
      },
      location: {
        low: 0.9,    // Urban areas with good infrastructure
        medium: 1.0, // Mixed areas
        high: 1.3    // Remote areas with limited infrastructure
      },
      activity: {
        low: 0.9,    // Consistent, safe activity patterns
        medium: 1.0, // Normal activity
        high: 1.4    // High-risk activity patterns
      }
    };
  }
}

const premiumAutomation = new PremiumAutomation();

module.exports = { premiumAutomation };
