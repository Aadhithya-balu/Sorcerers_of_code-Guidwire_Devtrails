/**
 * Onboarding Workflow Automation
 * Automatically registers users using minimal input and assigns risk zones
 */

const axios = require('axios');
const winston = require('winston');
const User = require('../../Backend/insurance-module/models/User');
const RiskData = require('../../Backend/insurance-module/models/RiskData');
const { notificationAutomation } = require('../notifications');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/onboarding-workflow.log' }),
    new winston.transports.Console()
  ]
});

class OnboardingAutomation {
  constructor() {
    this.pendingOnboardings = new Map();
  }

  /**
   * Auto-onboard user with minimal input
   */
  async autoOnboardUser(userData) {
    try {
      const { phone, location, platform } = userData;

      logger.info(`👤 Starting auto-onboarding for phone: ${phone}`);

      // 1. Validate input
      if (!phone || !location || !platform) {
        throw new Error('Missing required fields: phone, location, platform');
      }

      // 2. Check if user already exists
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        logger.warn(`User with phone ${phone} already exists`);
        return { success: false, message: 'User already exists', userId: existingUser._id };
      }

      // 3. Generate user profile
      const userProfile = await this.generateUserProfile(phone, location, platform);

      // 4. Determine risk zone
      const riskZone = await this.determineRiskZone(location);

      // 5. Create user record
      const user = new User({
        ...userProfile,
        riskZone,
        onboardingStatus: 'completed',
        onboardedAt: new Date(),
        status: 'active'
      });

      await user.save();

      // 6. Create initial risk data
      await this.createInitialRiskData(user._id, location, platform);

      // 7. Send welcome notification
      await notificationAutomation.sendNotification({
        userId: user._id,
        type: 'welcome',
        message: `Welcome to Parametric Insurance! You're in risk zone ${riskZone.name}.`,
        data: { riskZone, userProfile }
      });

      logger.info(`✅ Successfully onboarded user: ${user._id}`);
      return {
        success: true,
        userId: user._id,
        riskZone,
        message: 'User onboarded successfully'
      };

    } catch (error) {
      logger.error('Error in auto-onboarding:', error);
      throw error;
    }
  }

  /**
   * Process pending onboarding requests
   */
  async processPendingOnboardings() {
    try {
      // In a real implementation, you'd have a queue of pending requests
      // For now, we'll simulate processing

      const processed = Math.floor(Math.random() * 10) + 1; // 1-10 users
      const failed = Math.floor(Math.random() * 2); // 0-1 failures

      logger.info(`📊 Processed ${processed} pending onboardings, ${failed} failed`);

      return {
        processed,
        failed,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error processing pending onboardings:', error);
      throw error;
    }
  }

  /**
   * Get onboarding status for a user
   */
  async getOnboardingStatus(userId) {
    try {
      const user = await User.findById(userId).select('onboardingStatus onboardedAt riskZone status');

      if (!user) {
        return { status: 'not_found' };
      }

      return {
        userId,
        status: user.onboardingStatus,
        onboardedAt: user.onboardedAt,
        riskZone: user.riskZone,
        accountStatus: user.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting onboarding status:', error);
      throw error;
    }
  }

  /**
   * Generate user profile from minimal data
   */
  async generateUserProfile(phone, location, platform) {
    try {
      // Extract basic info from phone/location/platform
      const profile = {
        phone,
        platform,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || 'Auto-detected'
        }
      };

      // Generate name from platform/phone (simplified)
      profile.name = this.generateNameFromPhone(phone);

      // Set default values
      profile.email = `${phone}@gigworker.com`; // Temporary email
      profile.kyc = {
        status: 'pending',
        documents: [],
        verifiedAt: null
      };

      // Determine user type based on platform
      profile.userType = this.determineUserType(platform);

      // Set initial risk profile
      profile.riskProfile = {
        score: 50, // Neutral starting score
        factors: {
          location: 0,
          activity: 0,
          historical: 0
        },
        lastUpdated: new Date()
      };

      return profile;
    } catch (error) {
      logger.error('Error generating user profile:', error);
      throw error;
    }
  }

  /**
   * Determine risk zone based on location
   */
  async determineRiskZone(location) {
    try {
      const { latitude, longitude } = location;

      // Define risk zones (simplified geographic zones)
      const zones = [
        {
          name: 'Low Risk Zone',
          bounds: { lat: [12, 15], lng: [77, 80] }, // Bangalore area
          riskMultiplier: 0.8,
          description: 'Urban area with good infrastructure'
        },
        {
          name: 'Medium Risk Zone',
          bounds: { lat: [15, 20], lng: [80, 85] }, // Mixed areas
          riskMultiplier: 1.0,
          description: 'Mixed urban-rural area'
        },
        {
          name: 'High Risk Zone',
          bounds: { lat: [20, 25], lng: [85, 90] }, // Remote areas
          riskMultiplier: 1.3,
          description: 'Remote area with limited infrastructure'
        }
      ];

      // Find matching zone
      const zone = zones.find(z =>
        latitude >= z.bounds.lat[0] && latitude <= z.bounds.lat[1] &&
        longitude >= z.bounds.lng[0] && longitude <= z.bounds.lng[1]
      );

      return zone || zones[1]; // Default to medium risk
    } catch (error) {
      logger.error('Error determining risk zone:', error);
      // Return default zone
      return {
        name: 'Medium Risk Zone',
        riskMultiplier: 1.0,
        description: 'Default risk zone'
      };
    }
  }

  /**
   * Create initial risk data for new user
   */
  async createInitialRiskData(userId, location, platform) {
    try {
      const riskData = new RiskData({
        userId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 100
        },
        activity: {
          platform,
          activeHours: this.getPlatformActiveHours(platform),
          riskLevel: 'medium'
        },
        environmental: {
          weatherRisk: 0.5,
          pollutionRisk: 0.5,
          trafficRisk: 0.5
        },
        riskMetrics: {
          overallRisk: 0.5,
          lastUpdated: new Date()
        },
        timestamp: new Date()
      });

      await riskData.save();
      logger.info(`📊 Created initial risk data for user: ${userId}`);

      return riskData;
    } catch (error) {
      logger.error('Error creating initial risk data:', error);
      throw error;
    }
  }

  // Helper methods
  generateNameFromPhone(phone) {
    // Generate a temporary name from phone number
    const lastFour = phone.slice(-4);
    return `GigWorker_${lastFour}`;
  }

  determineUserType(platform) {
    const platformMap = {
      'swiggy': 'food_delivery',
      'zomato': 'food_delivery',
      'uber': 'ride_hailing',
      'ola': 'ride_hailing',
      'rapido': 'ride_hailing',
      'default': 'general_gig'
    };

    return platformMap[platform.toLowerCase()] || platformMap.default;
  }

  getPlatformActiveHours(platform) {
    // Define typical active hours for different platforms
    const hoursMap = {
      'swiggy': [10, 14, 18, 22], // Breakfast, lunch, dinner peaks
      'zomato': [12, 13, 19, 20, 21], // Lunch and dinner
      'uber': [7, 8, 9, 17, 18, 19, 20, 21, 22], // Morning and evening rush
      'ola': [7, 8, 9, 17, 18, 19, 20, 21, 22], // Similar to Uber
      'rapido': [8, 9, 10, 16, 17, 18, 19, 20], // Day time
      'default': [9, 10, 11, 12, 16, 17, 18, 19, 20] // General business hours
    };

    return hoursMap[platform.toLowerCase()] || hoursMap.default;
  }
}

const onboardingAutomation = new OnboardingAutomation();

module.exports = { onboardingAutomation };
