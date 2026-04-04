/**
 * Risk Prediction Workflow Automation
 * Automatically predicts environmental risk levels using live data
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
    new winston.transports.File({ filename: 'logs/risk-prediction-workflow.log' }),
    new winston.transports.Console()
  ]
});

class RiskPredictionAutomation {
  constructor() {
    this.weatherAPI = process.env.WEATHER_API_KEY;
    this.locationAPI = process.env.LOCATION_API_KEY;
    this.riskThresholds = this.loadRiskThresholds();
  }

  /**
   * Predict real-time risk for a user
   */
  async predictRealTimeRisk(params) {
    try {
      const { userId, location, activity } = params;

      logger.info(`🎯 Predicting real-time risk for user: ${userId}`);

      // 1. Get user baseline data
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Fetch live environmental data
      const environmentalData = await this.fetchEnvironmentalData(location);

      // 3. Calculate risk components
      const riskComponents = {
        environmental: await this.calculateEnvironmentalRisk(environmentalData),
        location: await this.calculateLocationRisk(location, user),
        activity: await this.calculateActivityRisk(activity, user),
        historical: await this.calculateHistoricalRisk(userId)
      };

      // 4. Aggregate overall risk
      const overallRisk = this.aggregateRisk(riskComponents);

      // 5. Update user risk profile
      await this.updateUserRiskProfile(userId, overallRisk, riskComponents);

      // 6. Create risk data record
      const riskRecord = await this.createRiskRecord(userId, location, activity, environmentalData, riskComponents);

      // 7. Check for risk alerts
      await this.checkRiskAlerts(userId, overallRisk, riskComponents);

      const result = {
        userId,
        overallRisk,
        riskComponents,
        riskLevel: this.getRiskLevel(overallRisk),
        environmentalData,
        timestamp: new Date(),
        alertsTriggered: await this.getTriggeredAlerts(overallRisk)
      };

      logger.info(`✅ Risk prediction completed for user ${userId}: ${result.riskLevel} (${overallRisk.toFixed(2)})`);
      return result;

    } catch (error) {
      logger.error('Error in real-time risk prediction:', error);
      throw error;
    }
  }

  /**
   * Batch predict risk for all active users
   */
  async batchPredictRisk() {
    try {
      logger.info('🔄 Starting batch risk prediction...');

      // Get all active users
      const activeUsers = await User.find({ status: 'active' })
        .select('_id location platform userType')
        .limit(1000); // Process in batches

      let processed = 0;
      let errors = 0;
      const results = [];

      for (const user of activeUsers) {
        try {
          // Get user's latest activity/location data
          const latestRiskData = await RiskData.findOne({ userId: user._id })
            .sort({ timestamp: -1 })
            .limit(1);

          const location = latestRiskData?.location || user.location;
          const activity = latestRiskData?.activity || { platform: user.platform };

          if (location) {
            const result = await this.predictRealTimeRisk({
              userId: user._id,
              location,
              activity
            });

            results.push(result);
            processed++;
          }

        } catch (error) {
          logger.error(`Error predicting risk for user ${user._id}:`, error);
          errors++;
        }
      }

      logger.info(`✅ Batch risk prediction completed: ${processed} processed, ${errors} errors`);
      return {
        processed,
        errors,
        results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in batch risk prediction:', error);
      throw error;
    }
  }

  /**
   * Fetch environmental data from APIs
   */
  async fetchEnvironmentalData(location) {
    try {
      const { latitude, longitude } = location;

      // Fetch weather data
      const weatherData = await this.fetchWeatherData(latitude, longitude);

      // Fetch air quality data
      const airQualityData = await this.fetchAirQualityData(latitude, longitude);

      // Fetch traffic data (simulated)
      const trafficData = await this.fetchTrafficData(latitude, longitude);

      return {
        weather: weatherData,
        airQuality: airQualityData,
        traffic: trafficData,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error fetching environmental data:', error);
      // Return default values
      return {
        weather: { rainfall: 0, temperature: 25, humidity: 60 },
        airQuality: { aqi: 50, pollutants: {} },
        traffic: { congestion: 0.3, incidents: 0 },
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate environmental risk
   */
  async calculateEnvironmentalRisk(environmentalData) {
    try {
      const { weather, airQuality, traffic } = environmentalData;

      // Weather risk (rainfall, temperature extremes)
      const weatherRisk = this.calculateWeatherRisk(weather);

      // Air quality risk
      const pollutionRisk = this.calculatePollutionRisk(airQuality);

      // Traffic risk
      const trafficRisk = this.calculateTrafficRisk(traffic);

      // Weighted environmental risk score
      const environmentalRisk = (
        weatherRisk * 0.4 +
        pollutionRisk * 0.4 +
        trafficRisk * 0.2
      );

      return Math.min(1.0, environmentalRisk);

    } catch (error) {
      logger.error('Error calculating environmental risk:', error);
      return 0.5; // Default medium risk
    }
  }

  /**
   * Calculate location-based risk
   */
  async calculateLocationRisk(location, user) {
    try {
      const { latitude, longitude } = location;

      // Use zone-based risk assessment
      const zoneRisk = this.calculateZoneRisk(latitude, longitude);

      // Distance from user home location
      const homeDistance = user.location ?
        this.calculateDistance(latitude, longitude, user.location.latitude, user.location.longitude) : 0;

      // Location familiarity factor
      const familiarityFactor = Math.max(0, 1 - (homeDistance / 50)); // 50km radius

      // Combine factors
      const locationRisk = zoneRisk * (1 - familiarityFactor * 0.3);

      return Math.min(1.0, locationRisk);

    } catch (error) {
      logger.error('Error calculating location risk:', error);
      return 0.5;
    }
  }

  /**
   * Calculate activity-based risk
   */
  async calculateActivityRisk(activity, user) {
    try {
      const { platform } = activity;

      // Platform risk factors
      const platformRisk = this.getPlatformRiskFactor(platform);

      // Time-based risk (peak hours)
      const hourRisk = this.getHourRiskFactor();

      // Activity pattern risk
      const patternRisk = await this.calculateActivityPatternRisk(user._id);

      // Combine factors
      const activityRisk = (
        platformRisk * 0.4 +
        hourRisk * 0.3 +
        patternRisk * 0.3
      );

      return Math.min(1.0, activityRisk);

    } catch (error) {
      logger.error('Error calculating activity risk:', error);
      return 0.5;
    }
  }

  /**
   * Calculate historical risk
   */
  async calculateHistoricalRisk(userId) {
    try {
      // Get user's claim history and risk patterns
      const recentRiskData = await RiskData.find({ userId })
        .sort({ timestamp: -1 })
        .limit(30) // Last 30 days
        .select('riskMetrics.overallRisk');

      if (recentRiskData.length === 0) return 0.5;

      // Calculate trend
      const avgRisk = recentRiskData.reduce((sum, record) =>
        sum + record.riskMetrics.overallRisk, 0) / recentRiskData.length;

      // Add trend factor (increasing risk = higher historical risk)
      const trend = this.calculateRiskTrend(recentRiskData);

      return Math.min(1.0, avgRisk + trend * 0.2);

    } catch (error) {
      logger.error('Error calculating historical risk:', error);
      return 0.5;
    }
  }

  /**
   * Aggregate overall risk from components
   */
  aggregateRisk(components) {
    const weights = {
      environmental: 0.35,
      location: 0.25,
      activity: 0.25,
      historical: 0.15
    };

    return (
      components.environmental * weights.environmental +
      components.location * weights.location +
      components.activity * weights.activity +
      components.historical * weights.historical
    );
  }

  /**
   * Update user risk profile
   */
  async updateUserRiskProfile(userId, overallRisk, components) {
    try {
      const riskScore = Math.round(overallRisk * 100); // Convert to 0-100 scale

      await User.findByIdAndUpdate(userId, {
        'riskProfile.score': riskScore,
        'riskProfile.factors': {
          environmental: Math.round(components.environmental * 100),
          location: Math.round(components.location * 100),
          activity: Math.round(components.activity * 100),
          historical: Math.round(components.historical * 100)
        },
        'riskProfile.lastUpdated': new Date()
      });

    } catch (error) {
      logger.error('Error updating user risk profile:', error);
    }
  }

  /**
   * Create risk data record
   */
  async createRiskRecord(userId, location, activity, environmentalData, riskComponents) {
    try {
      const riskRecord = new RiskData({
        userId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 100,
          riskLevel: this.getRiskLevel(riskComponents.location)
        },
        activity: {
          ...activity,
          riskLevel: this.getRiskLevel(riskComponents.activity)
        },
        environmental: {
          weatherRisk: riskComponents.environmental,
          pollutionRisk: this.calculatePollutionRisk(environmentalData.airQuality),
          trafficRisk: this.calculateTrafficRisk(environmentalData.traffic)
        },
        riskMetrics: {
          overallRisk: this.aggregateRisk(riskComponents),
          components: riskComponents,
          lastUpdated: new Date()
        },
        timestamp: new Date()
      });

      await riskRecord.save();
      return riskRecord;

    } catch (error) {
      logger.error('Error creating risk record:', error);
      throw error;
    }
  }

  /**
   * Check for risk alerts
   */
  async checkRiskAlerts(userId, overallRisk, components) {
    try {
      const alerts = [];

      // High risk alert
      if (overallRisk > 0.8) {
        alerts.push({
          type: 'high_risk',
          message: 'Your current risk level is very high. Consider postponing activities.',
          severity: 'high'
        });
      }

      // Environmental alerts
      if (components.environmental > 0.7) {
        alerts.push({
          type: 'environmental_risk',
          message: 'Current weather conditions pose high risk.',
          severity: 'medium'
        });
      }

      // Location alerts
      if (components.location > 0.8) {
        alerts.push({
          type: 'location_risk',
          message: 'You are in a high-risk location.',
          severity: 'high'
        });
      }

      // Send alerts if any
      for (const alert of alerts) {
        await notificationAutomation.sendNotification({
          userId,
          type: 'risk_alert',
          message: alert.message,
          data: { alert, riskComponents: components }
        });
      }

      return alerts;

    } catch (error) {
      logger.error('Error checking risk alerts:', error);
    }
  }

  // Helper methods
  async fetchWeatherData(lat, lon) {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.weatherAPI}&units=metric`
      );

      return {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        rainfall: response.data.rain?.['1h'] || 0,
        windSpeed: response.data.wind.speed,
        conditions: response.data.weather[0].main
      };
    } catch (error) {
      logger.error('Error fetching weather data:', error);
      return { temperature: 25, humidity: 60, rainfall: 0, windSpeed: 5, conditions: 'Clear' };
    }
  }

  async fetchAirQualityData(lat, lon) {
    // Simplified - in real implementation, use AQI API
    return {
      aqi: Math.floor(Math.random() * 200) + 50, // 50-250 AQI
      pollutants: {
        pm25: Math.random() * 100,
        pm10: Math.random() * 150,
        no2: Math.random() * 50
      }
    };
  }

  async fetchTrafficData(lat, lon) {
    // Simplified - in real implementation, use traffic API
    return {
      congestion: Math.random() * 0.8, // 0-0.8 congestion level
      incidents: Math.floor(Math.random() * 5), // 0-4 incidents
      averageSpeed: 30 + Math.random() * 40 // 30-70 km/h
    };
  }

  calculateWeatherRisk(weather) {
    let risk = 0;

    // Rainfall risk
    if (weather.rainfall > 50) risk += 0.6;
    else if (weather.rainfall > 20) risk += 0.3;

    // Temperature extremes
    if (weather.temperature > 40 || weather.temperature < 5) risk += 0.3;

    // Wind risk
    if (weather.windSpeed > 20) risk += 0.2;

    return Math.min(1.0, risk);
  }

  calculatePollutionRisk(airQuality) {
    const aqi = airQuality.aqi || 50;

    // AQI risk mapping
    if (aqi > 300) return 1.0;      // Hazardous
    if (aqi > 200) return 0.8;      // Very unhealthy
    if (aqi > 150) return 0.6;      // Unhealthy
    if (aqi > 100) return 0.4;      // Unhealthy for sensitive groups
    if (aqi > 50) return 0.2;       // Moderate
    return 0.1;                     // Good
  }

  calculateTrafficRisk(traffic) {
    const congestion = traffic.congestion || 0.3;
    const incidents = traffic.incidents || 0;

    return Math.min(1.0, congestion + (incidents * 0.1));
  }

  calculateZoneRisk(lat, lon) {
    // Simplified zone risk - in real implementation, use GIS data
    const zones = [
      { lat: [12, 15], lon: [77, 80], risk: 0.3 }, // Low risk urban
      { lat: [15, 20], lon: [80, 85], risk: 0.6 }, // Medium risk
      { lat: [20, 25], lon: [85, 90], risk: 0.9 }  // High risk remote
    ];

    const zone = zones.find(z =>
      lat >= z.lat[0] && lat <= z.lat[1] &&
      lon >= z.lon[0] && lon <= z.lon[1]
    );

    return zone ? zone.risk : 0.5;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getPlatformRiskFactor(platform) {
    const factors = {
      'swiggy': 0.6, 'zomato': 0.6,  // Food delivery - weather dependent
      'uber': 0.8, 'ola': 0.8,       // Ride hailing - traffic dependent
      'rapido': 0.7,                 // Bike taxi - mixed risk
      'default': 0.5
    };
    return factors[platform?.toLowerCase()] || factors.default;
  }

  getHourRiskFactor() {
    const hour = new Date().getHours();
    // Peak hours have higher risk
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 21)) return 0.8;
    if (hour >= 22 || hour <= 5) return 0.3; // Low activity hours
    return 0.5; // Normal hours
  }

  async calculateActivityPatternRisk(userId) {
    // Simplified - analyze activity patterns
    return Math.random() * 0.5 + 0.2; // 0.2-0.7 range
  }

  calculateRiskTrend(riskData) {
    if (riskData.length < 2) return 0;

    const recent = riskData.slice(0, 7); // Last 7 records
    const older = riskData.slice(7, 14); // Previous 7 records

    const recentAvg = recent.reduce((sum, r) => sum + r.riskMetrics.overallRisk, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.riskMetrics.overallRisk, 0) / older.length;

    return recentAvg - olderAvg; // Positive = increasing risk
  }

  getRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'very_high';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    if (riskScore >= 0.2) return 'low';
    return 'very_low';
  }

  async getTriggeredAlerts(overallRisk) {
    const alerts = [];
    if (overallRisk > 0.8) alerts.push('very_high_risk');
    if (overallRisk > 0.6) alerts.push('high_risk');
    return alerts;
  }

  loadRiskThresholds() {
    return {
      very_high: 0.8,
      high: 0.6,
      medium: 0.4,
      low: 0.2,
      very_low: 0.0
    };
  }
}

const riskPredictionAutomation = new RiskPredictionAutomation();

module.exports = { riskPredictionAutomation };
