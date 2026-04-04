/**
 * Fraud Detection Workflow Automation
 * Automatically analyzes claims for fraudulent patterns
 */

const winston = require('winston');
const User = require('../../Backend/insurance-module/models/User');
const Policy = require('../../Backend/insurance-module/models/Policy');
const Claim = require('../../Backend/insurance-module/models/Claim');
const FraudLog = require('../../Backend/insurance-module/models/FraudLog');
const { notificationAutomation } = require('../notifications');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/fraud-detection-workflow.log' }),
    new winston.transports.Console()
  ]
});

class FraudDetectionAutomation {
  constructor() {
    this.fraudRules = this.loadFraudRules();
    this.fraudThresholds = this.loadFraudThresholds();
  }

  /**
   * Analyze fraud for a specific claim
   */
  async analyzeFraud(params) {
    try {
      const { claimId, userId } = params;

      logger.info(`🛡️ Analyzing fraud for claim: ${claimId}, user: ${userId}`);

      // Get claim and user data
      const claim = await Claim.findById(claimId).populate('userId policyId');
      if (!claim) {
        throw new Error('Claim not found');
      }

      const user = claim.userId;
      const policy = claim.policyId;

      // Run fraud detection rules
      const fraudAnalysis = await this.runFraudDetectionRules(claim, user, policy);

      // Calculate overall fraud score
      const fraudScore = this.calculateFraudScore(fraudAnalysis);

      // Determine fraud action
      const action = this.determineFraudAction(fraudScore);

      // Create fraud log
      const fraudLog = await this.createFraudLog(claimId, fraudAnalysis, fraudScore, action);

      // Update claim with fraud analysis
      await Claim.findByIdAndUpdate(claimId, {
        fraudScore,
        fraudAnalysis,
        fraudStatus: action,
        fraudAnalyzedAt: new Date()
      });

      // Handle fraud action
      await this.handleFraudAction(claim, action, fraudScore);

      const result = {
        claimId,
        fraudScore,
        riskLevel: this.getFraudRiskLevel(fraudScore),
        action,
        analysis: fraudAnalysis,
        timestamp: new Date()
      };

      logger.info(`✅ Fraud analysis completed for claim ${claimId}: ${action} (${fraudScore} score)`);
      return result;

    } catch (error) {
      logger.error('Error in fraud analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze recent claims for fraud
   */
  async analyzeRecentClaims() {
    try {
      logger.info('🔍 Analyzing recent claims for fraud...');

      // Get claims from last 24 hours that haven't been analyzed
      const recentClaims = await Claim.find({
        submittedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        fraudAnalyzedAt: { $exists: false },
        status: { $in: ['submitted', 'under_review'] }
      }).populate('userId policyId').limit(100);

      let analyzed = 0;
      let flagged = 0;
      let blocked = 0;

      for (const claim of recentClaims) {
        try {
          const result = await this.analyzeFraud({
            claimId: claim._id,
            userId: claim.userId._id
          });

          analyzed++;

          if (result.action === 'flagged') flagged++;
          if (result.action === 'blocked') blocked++;

        } catch (error) {
          logger.error(`Error analyzing claim ${claim._id}:`, error);
        }
      }

      logger.info(`✅ Recent claims analysis completed: ${analyzed} analyzed, ${flagged} flagged, ${blocked} blocked`);
      return {
        analyzed,
        flagged,
        blocked,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in recent claims analysis:', error);
      throw error;
    }
  }

  /**
   * Run fraud detection rules
   */
  async runFraudDetectionRules(claim, user, policy) {
    try {
      const analysis = {
        locationMismatch: await this.checkLocationMismatch(claim, user),
        duplicateClaim: await this.checkDuplicateClaim(claim, user),
        claimFrequency: await this.checkClaimFrequency(claim, user),
        amountAnomaly: await this.checkAmountAnomaly(claim, policy),
        velocityFraud: await this.checkVelocityFraud(claim, user),
        patternAnomaly: await this.checkPatternAnomaly(claim, user)
      };

      return analysis;

    } catch (error) {
      logger.error('Error running fraud detection rules:', error);
      return {
        locationMismatch: { score: 0, triggered: false },
        duplicateClaim: { score: 0, triggered: false },
        claimFrequency: { score: 0, triggered: false },
        amountAnomaly: { score: 0, triggered: false },
        velocityFraud: { score: 0, triggered: false },
        patternAnomaly: { score: 0, triggered: false }
      };
    }
  }

  /**
   * Fraud Rule 1: Location Mismatch
   */
  async checkLocationMismatch(claim, user) {
    try {
      const claimLocation = claim.triggerData?.location || claim.location;
      const userLocation = user.location;

      if (!claimLocation || !userLocation) {
        return { score: 0, triggered: false, reason: 'Location data missing' };
      }

      const distance = this.calculateDistance(
        claimLocation.latitude, claimLocation.longitude,
        userLocation.latitude, userLocation.longitude
      );

      const maxDistance = this.fraudRules.locationMismatch.maxDistanceKm;
      const triggered = distance > maxDistance;

      return {
        score: triggered ? this.fraudRules.locationMismatch.score : 0,
        triggered,
        distance: Math.round(distance * 100) / 100,
        maxDistance,
        reason: triggered ? `Claim location ${distance}km from user home` : 'Location matches'
      };

    } catch (error) {
      logger.error('Error in location mismatch check:', error);
      return { score: 0, triggered: false, reason: 'Error checking location' };
    }
  }

  /**
   * Fraud Rule 2: Duplicate Claim
   */
  async checkDuplicateClaim(claim, user) {
    try {
      // Check for similar claims in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const similarClaims = await Claim.find({
        userId: user._id,
        submittedAt: { $gte: thirtyDaysAgo },
        _id: { $ne: claim._id },
        triggerType: claim.triggerType,
        status: { $ne: 'rejected' }
      });

      const triggered = similarClaims.length > 0;

      return {
        score: triggered ? this.fraudRules.duplicateClaim.score : 0,
        triggered,
        similarClaimsCount: similarClaims.length,
        reason: triggered ? `Found ${similarClaims.length} similar claims in 30 days` : 'No duplicate claims'
      };

    } catch (error) {
      logger.error('Error in duplicate claim check:', error);
      return { score: 0, triggered: false, reason: 'Error checking duplicates' };
    }
  }

  /**
   * Fraud Rule 3: Claim Frequency
   */
  async checkClaimFrequency(claim, user) {
    try {
      // Check claims in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const recentClaims = await Claim.find({
        userId: user._id,
        submittedAt: { $gte: sevenDaysAgo },
        _id: { $ne: claim._id }
      });

      const triggered = recentClaims.length >= this.fraudRules.claimFrequency.maxClaimsPerWeek;

      return {
        score: triggered ? this.fraudRules.claimFrequency.score : 0,
        triggered,
        claimsThisWeek: recentClaims.length,
        maxAllowed: this.fraudRules.claimFrequency.maxClaimsPerWeek,
        reason: triggered ? `Too many claims this week: ${recentClaims.length}` : 'Claim frequency normal'
      };

    } catch (error) {
      logger.error('Error in claim frequency check:', error);
      return { score: 0, triggered: false, reason: 'Error checking frequency' };
    }
  }

  /**
   * Fraud Rule 4: Amount Anomaly
   */
  async checkAmountAnomaly(claim, policy) {
    try {
      const claimAmount = claim.payoutAmount || policy.coverageAmount * 0.1; // Estimate
      const policyCoverage = policy.coverageAmount;

      const ratio = claimAmount / policyCoverage;
      const triggered = ratio > this.fraudRules.amountAnomaly.maxRatio;

      return {
        score: triggered ? this.fraudRules.amountAnomaly.score : 0,
        triggered,
        claimAmount,
        policyCoverage,
        ratio: Math.round(ratio * 100) / 100,
        maxRatio: this.fraudRules.amountAnomaly.maxRatio,
        reason: triggered ? `Claim amount too high: ${ratio}x coverage` : 'Amount within normal range'
      };

    } catch (error) {
      logger.error('Error in amount anomaly check:', error);
      return { score: 0, triggered: false, reason: 'Error checking amount' };
    }
  }

  /**
   * Fraud Rule 5: Velocity Fraud
   */
  async checkVelocityFraud(claim, user) {
    try {
      // Check if claim was submitted too quickly after policy creation
      const policyAge = Date.now() - claim.policyId.createdAt;
      const policyAgeDays = policyAge / (24 * 60 * 60 * 1000);

      const triggered = policyAgeDays < this.fraudRules.velocityFraud.minPolicyAgeDays;

      return {
        score: triggered ? this.fraudRules.velocityFraud.score : 0,
        triggered,
        policyAgeDays: Math.round(policyAgeDays * 100) / 100,
        minAgeRequired: this.fraudRules.velocityFraud.minPolicyAgeDays,
        reason: triggered ? `Policy too new: ${policyAgeDays} days old` : 'Policy age acceptable'
      };

    } catch (error) {
      logger.error('Error in velocity fraud check:', error);
      return { score: 0, triggered: false, reason: 'Error checking velocity' };
    }
  }

  /**
   * Fraud Rule 6: Pattern Anomaly
   */
  async checkPatternAnomaly(claim, user) {
    try {
      // Check for unusual patterns in claim timing/location
      const hour = new Date(claim.submittedAt).getHours();
      const isOffHour = hour < 6 || hour > 22; // Outside 6 AM - 10 PM

      // Check if location matches user's typical area
      const locationCheck = await this.checkLocationMismatch(claim, user);
      const unusualLocation = locationCheck.triggered;

      const triggered = isOffHour && unusualLocation;

      return {
        score: triggered ? this.fraudRules.patternAnomaly.score : 0,
        triggered,
        submittedHour: hour,
        unusualTiming: isOffHour,
        unusualLocation,
        reason: triggered ? 'Unusual timing and location pattern' : 'Pattern appears normal'
      };

    } catch (error) {
      logger.error('Error in pattern anomaly check:', error);
      return { score: 0, triggered: false, reason: 'Error checking pattern' };
    }
  }

  /**
   * Calculate overall fraud score
   */
  calculateFraudScore(analysis) {
    let totalScore = 0;

    Object.values(analysis).forEach(rule => {
      totalScore += rule.score || 0;
    });

    return Math.min(100, totalScore); // Cap at 100
  }

  /**
   * Determine fraud action based on score
   */
  determineFraudAction(fraudScore) {
    if (fraudScore >= this.fraudThresholds.block) return 'blocked';
    if (fraudScore >= this.fraudThresholds.flag) return 'flagged';
    return 'approved';
  }

  /**
   * Create fraud log entry
   */
  async createFraudLog(claimId, analysis, fraudScore, action) {
    try {
      const fraudLog = new FraudLog({
        claimId,
        fraudScore,
        riskLevel: this.getFraudRiskLevel(fraudScore),
        action,
        analysis,
        rulesTriggered: Object.entries(analysis)
          .filter(([_, rule]) => rule.triggered)
          .map(([ruleName, rule]) => ({
            rule: ruleName,
            score: rule.score,
            reason: rule.reason
          })),
        analyzedAt: new Date(),
        automated: true
      });

      await fraudLog.save();
      return fraudLog;

    } catch (error) {
      logger.error('Error creating fraud log:', error);
      throw error;
    }
  }

  /**
   * Handle fraud action
   */
  async handleFraudAction(claim, action, fraudScore) {
    try {
      if (action === 'blocked') {
        // Block the claim
        await Claim.findByIdAndUpdate(claim._id, {
          status: 'rejected',
          rejectionReason: 'Fraud detected',
          rejectedAt: new Date()
        });

        // Notify user
        await notificationAutomation.sendNotification({
          userId: claim.userId,
          type: 'claim_rejected',
          message: 'Your claim has been rejected due to fraud detection. Please contact support.',
          data: { claim, fraudScore, reason: 'Automated fraud detection' }
        });

      } else if (action === 'flagged') {
        // Flag for manual review
        await Claim.findByIdAndUpdate(claim._id, {
          status: 'under_review',
          flaggedForReview: true,
          reviewReason: 'Fraud suspicion'
        });

        // Notify admin (in real implementation)
        logger.warn(`🚩 Claim ${claim._id} flagged for fraud review (score: ${fraudScore})`);
      }

    } catch (error) {
      logger.error('Error handling fraud action:', error);
    }
  }

  // Helper methods
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getFraudRiskLevel(score) {
    if (score >= 70) return 'very_high';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    if (score >= 15) return 'low';
    return 'very_low';
  }

  loadFraudRules() {
    return {
      locationMismatch: {
        maxDistanceKm: 50,
        score: 25
      },
      duplicateClaim: {
        score: 30
      },
      claimFrequency: {
        maxClaimsPerWeek: 3,
        score: 20
      },
      amountAnomaly: {
        maxRatio: 0.5, // 50% of coverage
        score: 35
      },
      velocityFraud: {
        minPolicyAgeDays: 7,
        score: 15
      },
      patternAnomaly: {
        score: 20
      }
    };
  }

  loadFraudThresholds() {
    return {
      block: 70,  // Block claims with score >= 70
      flag: 40    // Flag claims with score >= 40
    };
  }
}

const fraudDetectionAutomation = new FraudDetectionAutomation();

module.exports = { fraudDetectionAutomation };
