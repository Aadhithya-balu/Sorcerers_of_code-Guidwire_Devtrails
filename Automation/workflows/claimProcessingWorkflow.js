/**
 * Zero-Touch Claim Processing Workflow Automation
 * Automatically processes claims based on parametric triggers and fraud analysis
 */

const winston = require('winston');
const User = require('../../Backend/insurance-module/models/User');
const Policy = require('../../Backend/insurance-module/models/Policy');
const Claim = require('../../Backend/insurance-module/models/Claim');
const { fraudDetectionAutomation } = require('./fraudDetectionWorkflow');
const { notificationAutomation } = require('../notifications');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/claim-processing-workflow.log' }),
    new winston.transports.Console()
  ]
});

class ClaimProcessingAutomation {
  constructor() {
    this.processingRules = this.loadProcessingRules();
  }

  /**
   * Process a claim automatically
   */
  async processClaim(params) {
    try {
      const { claimId, autoApprove = true } = params;

      logger.info(`⚡ Processing claim: ${claimId}, auto-approve: ${autoApprove}`);

      // Get claim with populated data
      const claim = await Claim.findById(claimId).populate('userId policyId');
      if (!claim) {
        throw new Error('Claim not found');
      }

      // Skip if already processed
      if (claim.status !== 'submitted' && claim.status !== 'under_review') {
        logger.info(`Claim ${claimId} already processed with status: ${claim.status}`);
        return { claimId, status: claim.status, message: 'Already processed' };
      }

      // Run fraud analysis first
      const fraudResult = await fraudDetectionAutomation.analyzeFraud({
        claimId,
        userId: claim.userId._id
      });

      // If fraud blocked, stop processing
      if (fraudResult.action === 'blocked') {
        logger.warn(`🚫 Claim ${claimId} blocked by fraud detection`);
        return {
          claimId,
          status: 'rejected',
          fraudScore: fraudResult.fraudScore,
          reason: 'Fraud detected'
        };
      }

      // Validate parametric trigger
      const triggerValidation = await this.validateParametricTrigger(claim);

      if (!triggerValidation.valid) {
        logger.warn(`❌ Claim ${claimId} failed trigger validation: ${triggerValidation.reason}`);
        await this.rejectClaim(claim, triggerValidation.reason);
        return {
          claimId,
          status: 'rejected',
          reason: triggerValidation.reason
        };
      }

      // Calculate payout amount
      const payoutCalculation = await this.calculatePayoutAmount(claim);

      // Check policy limits and coverage
      const coverageCheck = await this.checkPolicyCoverage(claim, payoutCalculation.amount);

      if (!coverageCheck.approved) {
        logger.warn(`❌ Claim ${claimId} exceeds policy coverage: ${coverageCheck.reason}`);
        await this.rejectClaim(claim, coverageCheck.reason);
        return {
          claimId,
          status: 'rejected',
          reason: coverageCheck.reason
        };
      }

      // Auto-approve if enabled and all checks pass
      if (autoApprove && fraudResult.action === 'approved') {
        const approvalResult = await this.approveClaim(claim, payoutCalculation, fraudResult);
        logger.info(`✅ Claim ${claimId} auto-approved with payout: ₹${approvalResult.payoutAmount}`);
        return approvalResult;
      }

      // Flag for manual review
      await this.flagForReview(claim, fraudResult, payoutCalculation);
      logger.info(`🔍 Claim ${claimId} flagged for manual review`);

      return {
        claimId,
        status: 'under_review',
        fraudScore: fraudResult.fraudScore,
        calculatedPayout: payoutCalculation.amount,
        message: 'Flagged for manual review'
      };

    } catch (error) {
      logger.error(`Error processing claim ${params.claimId}:`, error);
      throw error;
    }
  }

  /**
   * Process all pending claims
   */
  async processPendingClaims() {
    try {
      logger.info('🔄 Processing all pending claims...');

      // Get claims that need processing
      const pendingClaims = await Claim.find({
        status: { $in: ['submitted', 'under_review'] },
        processedAt: { $exists: false }
      }).populate('userId policyId').limit(50);

      let processed = 0;
      let approved = 0;
      let rejected = 0;
      let flagged = 0;

      for (const claim of pendingClaims) {
        try {
          const result = await this.processClaim({
            claimId: claim._id,
            autoApprove: true
          });

          processed++;

          if (result.status === 'approved') approved++;
          else if (result.status === 'rejected') rejected++;
          else if (result.status === 'under_review') flagged++;

        } catch (error) {
          logger.error(`Error processing claim ${claim._id}:`, error);
        }
      }

      logger.info(`✅ Pending claims processing completed: ${processed} processed, ${approved} approved, ${rejected} rejected, ${flagged} flagged`);
      return {
        processed,
        approved,
        rejected,
        flagged,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in pending claims processing:', error);
      throw error;
    }
  }

  /**
   * Validate parametric trigger data
   */
  async validateParametricTrigger(claim) {
    try {
      const triggerData = claim.triggerData;
      const triggerType = claim.triggerType;

      if (!triggerData) {
        return { valid: false, reason: 'No trigger data provided' };
      }

      // Validate based on trigger type
      switch (triggerType) {
        case 'rainfall':
          return this.validateRainfallTrigger(triggerData);
        case 'pollution':
          return this.validatePollutionTrigger(triggerData);
        case 'traffic':
          return this.validateTrafficTrigger(triggerData);
        case 'disaster':
          return this.validateDisasterTrigger(triggerData);
        default:
          return { valid: false, reason: `Unknown trigger type: ${triggerType}` };
      }

    } catch (error) {
      logger.error('Error validating parametric trigger:', error);
      return { valid: false, reason: 'Error validating trigger data' };
    }
  }

  /**
   * Validate rainfall trigger
   */
  validateRainfallTrigger(triggerData) {
    const required = ['rainfall_mm', 'duration_hours', 'location'];
    const missing = required.filter(field => !triggerData[field]);

    if (missing.length > 0) {
      return { valid: false, reason: `Missing rainfall data: ${missing.join(', ')}` };
    }

    const { rainfall_mm, duration_hours } = triggerData;
    const minRainfall = this.processingRules.rainfall.minRainfallMm;
    const minDuration = this.processingRules.rainfall.minDurationHours;

    if (rainfall_mm < minRainfall || duration_hours < minDuration) {
      return {
        valid: false,
        reason: `Rainfall ${rainfall_mm}mm/${duration_hours}h below threshold (${minRainfall}mm/${minDuration}h)`
      };
    }

    return { valid: true };
  }

  /**
   * Validate pollution trigger
   */
  validatePollutionTrigger(triggerData) {
    const required = ['aqi', 'pollutants', 'location'];
    const missing = required.filter(field => !triggerData[field]);

    if (missing.length > 0) {
      return { valid: false, reason: `Missing pollution data: ${missing.join(', ')}` };
    }

    const { aqi } = triggerData;
    const maxAqi = this.processingRules.pollution.maxAqi;

    if (aqi > maxAqi) {
      return { valid: false, reason: `AQI ${aqi} exceeds threshold ${maxAqi}` };
    }

    return { valid: true };
  }

  /**
   * Validate traffic trigger
   */
  validateTrafficTrigger(triggerData) {
    const required = ['congestion_level', 'duration_minutes', 'location'];
    const missing = required.filter(field => !triggerData[field]);

    if (missing.length > 0) {
      return { valid: false, reason: `Missing traffic data: ${missing.join(', ')}` };
    }

    const { congestion_level, duration_minutes } = triggerData;
    const minCongestion = this.processingRules.traffic.minCongestionLevel;
    const minDuration = this.processingRules.traffic.minDurationMinutes;

    if (congestion_level < minCongestion || duration_minutes < minDuration) {
      return {
        valid: false,
        reason: `Traffic congestion ${congestion_level}/${duration_minutes}min below threshold (${minCongestion}/${minDuration}min)`
      };
    }

    return { valid: true };
  }

  /**
   * Validate disaster trigger
   */
  validateDisasterTrigger(triggerData) {
    const required = ['disaster_type', 'severity', 'location'];
    const missing = required.filter(field => !triggerData[field]);

    if (missing.length > 0) {
      return { valid: false, reason: `Missing disaster data: ${missing.join(', ')}` };
    }

    const { severity } = triggerData;
    const minSeverity = this.processingRules.disaster.minSeverity;

    if (severity < minSeverity) {
      return { valid: false, reason: `Disaster severity ${severity} below threshold ${minSeverity}` };
    }

    return { valid: true };
  }

  /**
   * Calculate payout amount based on trigger and policy
   */
  async calculatePayoutAmount(claim) {
    try {
      const policy = claim.policyId;
      const triggerData = claim.triggerData;
      const triggerType = claim.triggerType;

      let baseAmount = 0;
      let multiplier = 1;

      // Calculate base amount based on trigger type
      switch (triggerType) {
        case 'rainfall':
          baseAmount = this.calculateRainfallPayout(triggerData);
          break;
        case 'pollution':
          baseAmount = this.calculatePollutionPayout(triggerData);
          break;
        case 'traffic':
          baseAmount = this.calculateTrafficPayout(triggerData);
          break;
        case 'disaster':
          baseAmount = this.calculateDisasterPayout(triggerData);
          break;
        default:
          baseAmount = policy.coverageAmount * 0.1; // Default 10%
      }

      // Apply policy coverage limits
      const maxPayout = policy.coverageAmount * this.processingRules.maxPayoutPercentage;
      const finalAmount = Math.min(baseAmount, maxPayout);

      return {
        amount: Math.round(finalAmount),
        baseAmount: Math.round(baseAmount),
        maxAllowed: Math.round(maxPayout),
        triggerType,
        calculation: `Base: ₹${Math.round(baseAmount)}, Max: ₹${Math.round(maxPayout)}`
      };

    } catch (error) {
      logger.error('Error calculating payout amount:', error);
      return { amount: 0, error: error.message };
    }
  }

  /**
   * Calculate rainfall payout
   */
  calculateRainfallPayout(triggerData) {
    const { rainfall_mm, duration_hours } = triggerData;
    const ratePerMm = this.processingRules.rainfall.payoutRatePerMm;
    const durationMultiplier = Math.min(duration_hours / 24, 1); // Cap at 24 hours

    return rainfall_mm * ratePerMm * durationMultiplier;
  }

  /**
   * Calculate pollution payout
   */
  calculatePollutionPayout(triggerData) {
    const { aqi } = triggerData;
    const baseRate = this.processingRules.pollution.basePayout;
    const severityMultiplier = Math.min(aqi / 100, 2); // Max 2x multiplier

    return baseRate * severityMultiplier;
  }

  /**
   * Calculate traffic payout
   */
  calculateTrafficPayout(triggerData) {
    const { congestion_level, duration_minutes } = triggerData;
    const ratePerHour = this.processingRules.traffic.payoutRatePerHour;

    return (congestion_level / 10) * (duration_minutes / 60) * ratePerHour;
  }

  /**
   * Calculate disaster payout
   */
  calculateDisasterPayout(triggerData) {
    const { severity } = triggerData;
    const baseRate = this.processingRules.disaster.basePayout;
    const severityMultiplier = severity / 5; // Scale with severity

    return baseRate * severityMultiplier;
  }

  /**
   * Check policy coverage and limits
   */
  async checkPolicyCoverage(claim, payoutAmount) {
    try {
      const policy = claim.policyId;

      // Check total coverage
      if (payoutAmount > policy.coverageAmount) {
        return {
          approved: false,
          reason: `Payout ₹${payoutAmount} exceeds policy coverage ₹${policy.coverageAmount}`
        };
      }

      // Check remaining coverage (after previous claims)
      const previousClaims = await Claim.find({
        policyId: policy._id,
        status: 'approved',
        approvedAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // Last year
      });

      const totalPaidOut = previousClaims.reduce((sum, c) => sum + (c.payoutAmount || 0), 0);
      const remainingCoverage = policy.coverageAmount - totalPaidOut;

      if (payoutAmount > remainingCoverage) {
        return {
          approved: false,
          reason: `Payout ₹${payoutAmount} exceeds remaining coverage ₹${remainingCoverage}`
        };
      }

      return { approved: true };

    } catch (error) {
      logger.error('Error checking policy coverage:', error);
      return { approved: false, reason: 'Error checking coverage' };
    }
  }

  /**
   * Approve claim automatically
   */
  async approveClaim(claim, payoutCalculation, fraudResult) {
    try {
      const approvedAt = new Date();

      await Claim.findByIdAndUpdate(claim._id, {
        status: 'approved',
        payoutAmount: payoutCalculation.amount,
        approvedAt,
        processedAt: approvedAt,
        approvalMethod: 'automated',
        fraudScore: fraudResult.fraudScore,
        processingNotes: `Auto-approved: ${payoutCalculation.calculation}`
      });

      // Update policy with payout
      await Policy.findByIdAndUpdate(claim.policyId._id, {
        $inc: { totalPaidOut: payoutCalculation.amount },
        lastClaimDate: approvedAt
      });

      // Send approval notification
      await notificationAutomation.sendNotification({
        userId: claim.userId,
        type: 'claim_approved',
        message: `Your claim has been approved! Payout: ₹${payoutCalculation.amount}`,
        data: {
          claim,
          payoutAmount: payoutCalculation.amount,
          approvedAt
        }
      });

      return {
        claimId: claim._id,
        status: 'approved',
        payoutAmount: payoutCalculation.amount,
        approvedAt,
        fraudScore: fraudResult.fraudScore
      };

    } catch (error) {
      logger.error('Error approving claim:', error);
      throw error;
    }
  }

  /**
   * Reject claim
   */
  async rejectClaim(claim, reason) {
    try {
      await Claim.findByIdAndUpdate(claim._id, {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date(),
        processedAt: new Date()
      });

      // Send rejection notification
      await notificationAutomation.sendNotification({
        userId: claim.userId,
        type: 'claim_rejected',
        message: `Your claim has been rejected: ${reason}`,
        data: { claim, reason }
      });

    } catch (error) {
      logger.error('Error rejecting claim:', error);
    }
  }

  /**
   * Flag claim for manual review
   */
  async flagForReview(claim, fraudResult, payoutCalculation) {
    try {
      await Claim.findByIdAndUpdate(claim._id, {
        status: 'under_review',
        flaggedForReview: true,
        reviewReason: 'Automated processing flagged for review',
        calculatedPayout: payoutCalculation.amount,
        fraudScore: fraudResult.fraudScore,
        processedAt: new Date()
      });

      // Send review notification to user
      await notificationAutomation.sendNotification({
        userId: claim.userId,
        type: 'claim_under_review',
        message: 'Your claim is under review. We will notify you once processed.',
        data: { claim, calculatedPayout: payoutCalculation.amount }
      });

    } catch (error) {
      logger.error('Error flagging claim for review:', error);
    }
  }

  // Helper methods
  loadProcessingRules() {
    return {
      maxPayoutPercentage: 0.8, // Max 80% of coverage per claim

      rainfall: {
        minRainfallMm: 50,
        minDurationHours: 2,
        payoutRatePerMm: 10 // ₹10 per mm of rainfall
      },

      pollution: {
        maxAqi: 300,
        basePayout: 500 // Base ₹500 for pollution claims
      },

      traffic: {
        minCongestionLevel: 7, // Scale of 1-10
        minDurationMinutes: 30,
        payoutRatePerHour: 200 // ₹200 per hour of congestion
      },

      disaster: {
        minSeverity: 3, // Scale of 1-5
        basePayout: 1000 // Base ₹1000 for disaster claims
      }
    };
  }
}

const claimProcessingAutomation = new ClaimProcessingAutomation();

module.exports = { claimProcessingAutomation };
