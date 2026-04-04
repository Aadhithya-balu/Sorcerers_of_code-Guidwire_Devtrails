/**
 * Trigger Detection Workflow Automation
 * Automatically detects parametric events and triggers insurance conditions
 */

const axios = require('axios');
const winston = require('winston');
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
    new winston.transports.File({ filename: 'logs/trigger-detection-workflow.log' }),
    new winston.transports.Console()
  ]
});

class TriggerDetectionAutomation {
  constructor() {
    this.triggerThresholds = this.loadTriggerThresholds();
    this.activeTriggers = new Map();
  }

  /**
   * Detect and trigger parametric events
   */
  async detectAndTrigger() {
    try {
      logger.info('⚡ Starting parametric trigger detection...');

      const triggers = {
        rainfall: await this.detectRainfallTriggers(),
        pollution: await this.detectPollutionTriggers(),
        traffic: await this.detectTrafficTriggers(),
        disaster: await this.detectDisasterTriggers()
      };

      // Process each trigger type
      const results = {
        rainfall: await this.processTriggers(triggers.rainfall, 'rainfall'),
        pollution: await this.processTriggers(triggers.pollution, 'pollution'),
        traffic: await this.processTriggers(triggers.traffic, 'traffic'),
        disaster: await this.processTriggers(triggers.disaster, 'disaster')
      };

      const totalTriggered = Object.values(results).reduce((sum, r) => sum + r.triggered, 0);

      logger.info(`✅ Trigger detection completed: ${totalTriggered} policies triggered`);
      return {
        triggers: results,
        totalTriggered,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in trigger detection:', error);
      throw error;
    }
  }

  /**
   * Get active triggers
   */
  async getActiveTriggers() {
    try {
      const active = Array.from(this.activeTriggers.entries()).map(([id, trigger]) => ({
        id,
        ...trigger,
        triggeredAt: trigger.triggeredAt
      }));

      return {
        count: active.length,
        triggers: active,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting active triggers:', error);
      return { count: 0, triggers: [] };
    }
  }

  /**
   * Detect rainfall triggers
   */
  async detectRainfallTriggers() {
    try {
      logger.info('🌧️ Detecting rainfall triggers...');

      // Get active policies with rainfall triggers
      const policies = await Policy.find({
        status: 'active',
        'triggers': {
          $elemMatch: {
            type: 'weather_rainfall',
            condition: 'rainfall_exceeds',
            enabled: true
          }
        }
      }).populate('userId');

      const triggers = [];

      for (const policy of policies) {
        try {
          const user = policy.userId;
          if (!user?.location) continue;

          // Get current rainfall data
          const rainfallData = await this.getRainfallData(user.location);

          // Check trigger conditions
          const rainfallTrigger = policy.triggers.find(t =>
            t.type === 'weather_rainfall' && t.condition === 'rainfall_exceeds'
          );

          if (rainfallTrigger && rainfallData.rainfall > rainfallTrigger.threshold) {
            triggers.push({
              policyId: policy._id,
              userId: user._id,
              type: 'rainfall',
              threshold: rainfallTrigger.threshold,
              actualValue: rainfallData.rainfall,
              location: user.location,
              severity: this.calculateSeverity(rainfallData.rainfall, rainfallTrigger.threshold),
              data: rainfallData
            });
          }

        } catch (error) {
          logger.error(`Error checking rainfall trigger for policy ${policy._id}:`, error);
        }
      }

      logger.info(`🌧️ Found ${triggers.length} rainfall triggers`);
      return triggers;

    } catch (error) {
      logger.error('Error detecting rainfall triggers:', error);
      return [];
    }
  }

  /**
   * Detect pollution triggers
   */
  async detectPollutionTriggers() {
    try {
      logger.info('🏭 Detecting pollution triggers...');

      // Get active policies with pollution triggers
      const policies = await Policy.find({
        status: 'active',
        'triggers': {
          $elemMatch: {
            type: 'pollution_aqi',
            condition: 'aqi_exceeds',
            enabled: true
          }
        }
      }).populate('userId');

      const triggers = [];

      for (const policy of policies) {
        try {
          const user = policy.userId;
          if (!user?.location) continue;

          // Get current AQI data
          const pollutionData = await this.getPollutionData(user.location);

          // Check trigger conditions
          const pollutionTrigger = policy.triggers.find(t =>
            t.type === 'pollution_aqi' && t.condition === 'aqi_exceeds'
          );

          if (pollutionTrigger && pollutionData.aqi > pollutionTrigger.threshold) {
            triggers.push({
              policyId: policy._id,
              userId: user._id,
              type: 'pollution',
              threshold: pollutionTrigger.threshold,
              actualValue: pollutionData.aqi,
              location: user.location,
              severity: this.calculateSeverity(pollutionData.aqi, pollutionTrigger.threshold),
              data: pollutionData
            });
          }

        } catch (error) {
          logger.error(`Error checking pollution trigger for policy ${policy._id}:`, error);
        }
      }

      logger.info(`🏭 Found ${triggers.length} pollution triggers`);
      return triggers;

    } catch (error) {
      logger.error('Error detecting pollution triggers:', error);
      return [];
    }
  }

  /**
   * Detect traffic disruption triggers
   */
  async detectTrafficTriggers() {
    try {
      logger.info('🚗 Detecting traffic triggers...');

      // Get active policies with traffic triggers
      const policies = await Policy.find({
        status: 'active',
        'triggers': {
          $elemMatch: {
            type: 'traffic_disruption',
            condition: 'traffic_delay_exceeds',
            enabled: true
          }
        }
      }).populate('userId');

      const triggers = [];

      for (const policy of policies) {
        try {
          const user = policy.userId;
          if (!user?.location) continue;

          // Get current traffic data
          const trafficData = await this.getTrafficData(user.location);

          // Check trigger conditions
          const trafficTrigger = policy.triggers.find(t =>
            t.type === 'traffic_disruption' && t.condition === 'traffic_delay_exceeds'
          );

          if (trafficTrigger && trafficData.delayMinutes > trafficTrigger.threshold) {
            triggers.push({
              policyId: policy._id,
              userId: user._id,
              type: 'traffic',
              threshold: trafficTrigger.threshold,
              actualValue: trafficData.delayMinutes,
              location: user.location,
              severity: this.calculateSeverity(trafficData.delayMinutes, trafficTrigger.threshold),
              data: trafficData
            });
          }

        } catch (error) {
          logger.error(`Error checking traffic trigger for policy ${policy._id}:`, error);
        }
      }

      logger.info(`🚗 Found ${triggers.length} traffic triggers`);
      return triggers;

    } catch (error) {
      logger.error('Error detecting traffic triggers:', error);
      return [];
    }
  }

  /**
   * Detect disaster triggers
   */
  async detectDisasterTriggers() {
    try {
      logger.info('🌪️ Detecting disaster triggers...');

      // Get active policies with disaster triggers
      const policies = await Policy.find({
        status: 'active',
        'triggers': {
          $elemMatch: {
            type: 'disaster_event',
            condition: 'disaster_occurs',
            enabled: true
          }
        }
      }).populate('userId');

      const triggers = [];

      for (const policy of policies) {
        try {
          const user = policy.userId;
          if (!user?.location) continue;

          // Check for active disasters in user's area
          const disasterData = await this.getDisasterData(user.location);

          if (disasterData.active) {
            triggers.push({
              policyId: policy._id,
              userId: user._id,
              type: 'disaster',
              threshold: 0, // Any disaster triggers
              actualValue: 1,
              location: user.location,
              severity: disasterData.severity,
              data: disasterData
            });
          }

        } catch (error) {
          logger.error(`Error checking disaster trigger for policy ${policy._id}:`, error);
        }
      }

      logger.info(`🌪️ Found ${triggers.length} disaster triggers`);
      return triggers;

    } catch (error) {
      logger.error('Error detecting disaster triggers:', error);
      return [];
    }
  }

  /**
   * Process detected triggers
   */
  async processTriggers(triggers, triggerType) {
    try {
      let triggered = 0;
      let failed = 0;

      for (const trigger of triggers) {
        try {
          // Create claim automatically
          const claim = await this.createTriggeredClaim(trigger);

          // Update trigger status
          this.activeTriggers.set(`${triggerType}-${trigger.policyId}-${Date.now()}`, {
            ...trigger,
            claimId: claim._id,
            triggeredAt: new Date(),
            status: 'processed'
          });

          // Notify user
          await notificationAutomation.sendNotification({
            userId: trigger.userId,
            type: 'trigger_activated',
            message: `${triggerType.toUpperCase()} trigger activated! Claim filed automatically.`,
            data: { trigger, claim }
          });

          triggered++;

        } catch (error) {
          logger.error(`Error processing ${triggerType} trigger for policy ${trigger.policyId}:`, error);
          failed++;
        }
      }

      return { triggered, failed };

    } catch (error) {
      logger.error(`Error processing ${triggerType} triggers:`, error);
      return { triggered: 0, failed: triggers.length };
    }
  }

  /**
   * Create claim from trigger
   */
  async createTriggeredClaim(trigger) {
    try {
      const claim = new Claim({
        userId: trigger.userId,
        policyId: trigger.policyId,
        type: 'parametric_trigger',
        triggerType: trigger.type,
        triggerData: {
          threshold: trigger.threshold,
          actualValue: trigger.actualValue,
          severity: trigger.severity,
          location: trigger.location,
          environmentalData: trigger.data
        },
        status: 'submitted',
        evidence: [{
          type: 'api_data',
          source: trigger.type,
          data: trigger.data,
          timestamp: new Date()
        }],
        submittedAt: new Date(),
        autoProcessed: true
      });

      await claim.save();

      // Update policy with claim reference
      await Policy.findByIdAndUpdate(trigger.policyId, {
        $push: { claims: claim._id }
      });

      logger.info(`📝 Created triggered claim: ${claim._id} for ${trigger.type}`);
      return claim;

    } catch (error) {
      logger.error('Error creating triggered claim:', error);
      throw error;
    }
  }

  // Data fetching methods
  async getRainfallData(location) {
    try {
      const { latitude, longitude } = location;

      // Use OpenWeatherMap API
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.WEATHER_API_KEY}&units=metric`
      );

      return {
        rainfall: response.data.rain?.['1h'] || 0,
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        source: 'openweathermap',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error fetching rainfall data:', error);
      return {
        rainfall: Math.random() * 20, // Fallback random data
        temperature: 25,
        humidity: 60,
        source: 'fallback',
        timestamp: new Date()
      };
    }
  }

  async getPollutionData(location) {
    try {
      const { latitude, longitude } = location;

      // Simplified AQI calculation - in real implementation, use AQI API
      const baseAQI = Math.floor(Math.random() * 150) + 50; // 50-200 range

      return {
        aqi: baseAQI,
        pollutants: {
          pm25: baseAQI * 0.8,
          pm10: baseAQI * 1.2,
          no2: baseAQI * 0.3
        },
        source: 'simulated',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error fetching pollution data:', error);
      return {
        aqi: 75,
        pollutants: { pm25: 60, pm10: 90, no2: 25 },
        source: 'fallback',
        timestamp: new Date()
      };
    }
  }

  async getTrafficData(location) {
    try {
      // Simplified traffic data - in real implementation, use traffic API
      const congestionLevel = Math.random();
      const delayMinutes = Math.floor(congestionLevel * 120); // 0-120 minutes

      return {
        congestion: congestionLevel,
        delayMinutes,
        averageSpeed: 60 - (delayMinutes * 0.5),
        incidents: Math.floor(Math.random() * 3),
        source: 'simulated',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error fetching traffic data:', error);
      return {
        congestion: 0.3,
        delayMinutes: 15,
        averageSpeed: 45,
        incidents: 0,
        source: 'fallback',
        timestamp: new Date()
      };
    }
  }

  async getDisasterData(location) {
    try {
      // Simplified disaster detection - in real implementation, use disaster APIs
      const hasDisaster = Math.random() < 0.05; // 5% chance of disaster

      return {
        active: hasDisaster,
        type: hasDisaster ? ['flood', 'storm', 'earthquake'][Math.floor(Math.random() * 3)] : null,
        severity: hasDisaster ? ['minor', 'moderate', 'severe'][Math.floor(Math.random() * 3)] : null,
        affectedArea: hasDisaster ? 50 + Math.random() * 200 : 0, // km radius
        source: 'simulated',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error fetching disaster data:', error);
      return {
        active: false,
        type: null,
        severity: null,
        affectedArea: 0,
        source: 'fallback',
        timestamp: new Date()
      };
    }
  }

  // Helper methods
  calculateSeverity(actualValue, threshold) {
    const ratio = actualValue / threshold;

    if (ratio >= 2.0) return 'extreme';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'moderate';
    return 'low';
  }

  loadTriggerThresholds() {
    return {
      rainfall: {
        low: 10,      // mm
        moderate: 25, // mm
        high: 50,     // mm
        extreme: 100  // mm
      },
      pollution: {
        low: 50,      // AQI
        moderate: 100,// AQI
        high: 150,    // AQI
        extreme: 200  // AQI
      },
      traffic: {
        low: 15,      // minutes
        moderate: 30, // minutes
        high: 60,     // minutes
        extreme: 120  // minutes
      }
    };
  }
}

const triggerDetectionAutomation = new TriggerDetectionAutomation();

module.exports = { triggerDetectionAutomation };
