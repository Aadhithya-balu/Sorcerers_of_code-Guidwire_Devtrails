/**
 * Automated Payout Processing Workflow
 * Handles payment processing for approved claims
 */

const winston = require('winston');
const axios = require('axios');
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
    new winston.transports.File({ filename: 'logs/payout-processing-workflow.log' }),
    new winston.transports.Console()
  ]
});

class PayoutProcessingAutomation {
  constructor() {
    this.paymentProviders = this.loadPaymentProviders();
    this.payoutRules = this.loadPayoutRules();
  }

  /**
   * Process payout for an approved claim
   */
  async processPayout(params) {
    try {
      const { claimId, paymentMethod = 'auto' } = params;

      logger.info(`💰 Processing payout for claim: ${claimId}`);

      // Get claim with populated data
      const claim = await Claim.findById(claimId).populate('userId policyId');
      if (!claim) {
        throw new Error('Claim not found');
      }

      // Validate claim status
      if (claim.status !== 'approved') {
        throw new Error(`Claim not approved. Status: ${claim.status}`);
      }

      // Check if payout already processed
      if (claim.payoutProcessedAt) {
        logger.info(`Payout already processed for claim ${claimId}`);
        return {
          claimId,
          status: 'already_processed',
          payoutProcessedAt: claim.payoutProcessedAt
        };
      }

      const payoutAmount = claim.payoutAmount;
      if (!payoutAmount || payoutAmount <= 0) {
        throw new Error('Invalid payout amount');
      }

      // Determine payment method
      const selectedMethod = paymentMethod === 'auto' ?
        await this.selectPaymentMethod(claim.userId) : paymentMethod;

      // Process payment
      const paymentResult = await this.processPayment(claim, selectedMethod);

      if (paymentResult.success) {
        // Update claim with payout details
        await this.updateClaimWithPayout(claim, paymentResult);

        // Send payout notification
        await this.sendPayoutNotification(claim, paymentResult);

        logger.info(`✅ Payout processed successfully for claim ${claimId}: ₹${payoutAmount} via ${selectedMethod}`);
        return {
          claimId,
          status: 'processed',
          payoutAmount,
          paymentMethod: selectedMethod,
          transactionId: paymentResult.transactionId,
          processedAt: new Date()
        };

      } else {
        // Handle payment failure
        await this.handlePaymentFailure(claim, paymentResult);
        logger.error(`❌ Payout failed for claim ${claimId}: ${paymentResult.error}`);

        return {
          claimId,
          status: 'failed',
          error: paymentResult.error,
          payoutAmount
        };
      }

    } catch (error) {
      logger.error(`Error processing payout for claim ${params.claimId}:`, error);
      throw error;
    }
  }

  /**
   * Process payouts for all approved claims
   */
  async processPendingPayouts() {
    try {
      logger.info('🔄 Processing all pending payouts...');

      // Get approved claims that haven't been paid out yet
      const pendingPayouts = await Claim.find({
        status: 'approved',
        payoutProcessedAt: { $exists: false },
        payoutAmount: { $gt: 0 }
      }).populate('userId policyId').limit(50);

      let processed = 0;
      let successful = 0;
      let failed = 0;
      let totalAmount = 0;

      for (const claim of pendingPayouts) {
        try {
          const result = await this.processPayout({
            claimId: claim._id,
            paymentMethod: 'auto'
          });

          processed++;

          if (result.status === 'processed') {
            successful++;
            totalAmount += result.payoutAmount;
          } else if (result.status === 'failed') {
            failed++;
          }

        } catch (error) {
          logger.error(`Error processing payout for claim ${claim._id}:`, error);
          failed++;
        }
      }

      logger.info(`✅ Pending payouts processing completed: ${processed} processed, ${successful} successful (₹${totalAmount}), ${failed} failed`);
      return {
        processed,
        successful,
        failed,
        totalAmount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in pending payouts processing:', error);
      throw error;
    }
  }

  /**
   * Select best payment method for user
   */
  async selectPaymentMethod(user) {
    try {
      // Priority: UPI > Bank Transfer > Wallet > Paytm
      const paymentMethods = user.paymentMethods || [];

      // Check for preferred method
      const preferred = paymentMethods.find(m => m.preferred);
      if (preferred && preferred.verified) {
        return preferred.type;
      }

      // Auto-select based on availability and success rate
      const availableMethods = paymentMethods.filter(m => m.verified);

      if (availableMethods.length === 0) {
        return 'bank_transfer'; // Default fallback
      }

      // Priority order
      const priorityOrder = ['upi', 'bank_transfer', 'wallet', 'paytm'];

      for (const methodType of priorityOrder) {
        const method = availableMethods.find(m => m.type === methodType);
        if (method) {
          return methodType;
        }
      }

      return availableMethods[0].type; // First available

    } catch (error) {
      logger.error('Error selecting payment method:', error);
      return 'bank_transfer'; // Safe default
    }
  }

  /**
   * Process payment through appropriate provider
   */
  async processPayment(claim, paymentMethod) {
    try {
      const user = claim.userId;
      const amount = claim.payoutAmount;

      switch (paymentMethod) {
        case 'upi':
          return await this.processUPIPayment(user, amount, claim);
        case 'bank_transfer':
          return await this.processBankTransfer(user, amount, claim);
        case 'wallet':
          return await this.processWalletPayment(user, amount, claim);
        case 'paytm':
          return await this.processPaytmPayment(user, amount, claim);
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

    } catch (error) {
      logger.error(`Error processing ${paymentMethod} payment:`, error);
      return {
        success: false,
        error: error.message,
        paymentMethod
      };
    }
  }

  /**
   * Process UPI payment
   */
  async processUPIPayment(user, amount, claim) {
    try {
      const upiMethod = user.paymentMethods?.find(m => m.type === 'upi' && m.verified);
      if (!upiMethod) {
        throw new Error('No verified UPI method found');
      }

      // Simulate UPI payment processing
      const transactionId = `UPI${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      // In real implementation, integrate with UPI gateway
      const paymentResponse = await this.simulatePaymentAPI({
        provider: 'upi',
        upiId: upiMethod.upiId,
        amount,
        transactionId,
        description: `Insurance payout for claim ${claim._id}`
      });

      if (paymentResponse.success) {
        return {
          success: true,
          transactionId,
          paymentMethod: 'upi',
          provider: 'UPI Gateway',
          processingFee: this.calculateProcessingFee(amount, 'upi'),
          completedAt: new Date()
        };
      } else {
        return {
          success: false,
          error: paymentResponse.error || 'UPI payment failed'
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process bank transfer
   */
  async processBankTransfer(user, amount, claim) {
    try {
      const bankMethod = user.paymentMethods?.find(m => m.type === 'bank_transfer' && m.verified);
      if (!bankMethod) {
        throw new Error('No verified bank account found');
      }

      const transactionId = `BT${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      // Simulate bank transfer
      const paymentResponse = await this.simulatePaymentAPI({
        provider: 'bank_transfer',
        accountNumber: bankMethod.accountNumber,
        ifscCode: bankMethod.ifscCode,
        amount,
        transactionId,
        description: `Insurance payout for claim ${claim._id}`
      });

      if (paymentResponse.success) {
        return {
          success: true,
          transactionId,
          paymentMethod: 'bank_transfer',
          provider: 'Bank Transfer',
          processingFee: this.calculateProcessingFee(amount, 'bank_transfer'),
          completedAt: new Date(),
          estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
        };
      } else {
        return {
          success: false,
          error: paymentResponse.error || 'Bank transfer failed'
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process wallet payment
   */
  async processWalletPayment(user, amount, claim) {
    try {
      const walletMethod = user.paymentMethods?.find(m => m.type === 'wallet' && m.verified);
      if (!walletMethod) {
        throw new Error('No verified wallet found');
      }

      const transactionId = `WAL${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      const paymentResponse = await this.simulatePaymentAPI({
        provider: 'wallet',
        walletId: walletMethod.walletId,
        amount,
        transactionId,
        description: `Insurance payout for claim ${claim._id}`
      });

      if (paymentResponse.success) {
        return {
          success: true,
          transactionId,
          paymentMethod: 'wallet',
          provider: walletMethod.walletProvider || 'Digital Wallet',
          processingFee: this.calculateProcessingFee(amount, 'wallet'),
          completedAt: new Date()
        };
      } else {
        return {
          success: false,
          error: paymentResponse.error || 'Wallet payment failed'
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process Paytm payment
   */
  async processPaytmPayment(user, amount, claim) {
    try {
      const paytmMethod = user.paymentMethods?.find(m => m.type === 'paytm' && m.verified);
      if (!paytmMethod) {
        throw new Error('No verified Paytm account found');
      }

      const transactionId = `PTM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      const paymentResponse = await this.simulatePaymentAPI({
        provider: 'paytm',
        mobileNumber: paytmMethod.mobileNumber,
        amount,
        transactionId,
        description: `Insurance payout for claim ${claim._id}`
      });

      if (paymentResponse.success) {
        return {
          success: true,
          transactionId,
          paymentMethod: 'paytm',
          provider: 'Paytm',
          processingFee: this.calculateProcessingFee(amount, 'paytm'),
          completedAt: new Date()
        };
      } else {
        return {
          success: false,
          error: paymentResponse.error || 'Paytm payment failed'
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulate payment API call (replace with real API integrations)
   */
  async simulatePaymentAPI(paymentData) {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Simulate success/failure based on random chance (90% success rate)
      const success = Math.random() > 0.1;

      if (success) {
        return {
          success: true,
          transactionId: paymentData.transactionId,
          status: 'completed'
        };
      } else {
        return {
          success: false,
          error: 'Payment processing failed - insufficient funds or technical error'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: 'Payment API error: ' + error.message
      };
    }
  }

  /**
   * Calculate processing fee
   */
  calculateProcessingFee(amount, method) {
    const feeStructure = this.payoutRules.processingFees[method] || 0;
    return Math.round(amount * feeStructure);
  }

  /**
   * Update claim with payout details
   */
  async updateClaimWithPayout(claim, paymentResult) {
    try {
      await Claim.findByIdAndUpdate(claim._id, {
        payoutProcessedAt: new Date(),
        payoutTransactionId: paymentResult.transactionId,
        payoutMethod: paymentResult.paymentMethod,
        payoutProvider: paymentResult.provider,
        payoutProcessingFee: paymentResult.processingFee,
        payoutStatus: 'completed',
        payoutCompletedAt: paymentResult.completedAt,
        payoutEstimatedArrival: paymentResult.estimatedArrival
      });

    } catch (error) {
      logger.error('Error updating claim with payout details:', error);
      throw error;
    }
  }

  /**
   * Send payout notification
   */
  async sendPayoutNotification(claim, paymentResult) {
    try {
      const message = `Your insurance payout of ₹${claim.payoutAmount} has been processed successfully! Transaction ID: ${paymentResult.transactionId}`;

      await notificationAutomation.sendNotification({
        userId: claim.userId,
        type: 'payout_processed',
        message,
        data: {
          claim,
          payoutAmount: claim.payoutAmount,
          transactionId: paymentResult.transactionId,
          paymentMethod: paymentResult.paymentMethod,
          completedAt: paymentResult.completedAt
        }
      });

    } catch (error) {
      logger.error('Error sending payout notification:', error);
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(claim, paymentResult) {
    try {
      // Update claim with failure details
      await Claim.findByIdAndUpdate(claim._id, {
        payoutStatus: 'failed',
        payoutError: paymentResult.error,
        payoutFailedAt: new Date()
      });

      // Send failure notification
      await notificationAutomation.sendNotification({
        userId: claim.userId,
        type: 'payout_failed',
        message: `Your payout processing failed: ${paymentResult.error}. Please contact support.`,
        data: {
          claim,
          error: paymentResult.error
        }
      });

      // Log for manual intervention
      logger.warn(`🚨 Payout failed for claim ${claim._id}: ${paymentResult.error}`);

    } catch (error) {
      logger.error('Error handling payment failure:', error);
    }
  }

  /**
   * Get payout statistics
   */
  async getPayoutStatistics(timeframe = '30d') {
    try {
      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const payouts = await Claim.find({
        payoutProcessedAt: { $gte: startDate },
        payoutStatus: 'completed'
      });

      const stats = {
        totalPayouts: payouts.length,
        totalAmount: payouts.reduce((sum, p) => sum + (p.payoutAmount || 0), 0),
        averageAmount: 0,
        byMethod: {},
        successRate: 0
      };

      if (stats.totalPayouts > 0) {
        stats.averageAmount = Math.round(stats.totalAmount / stats.totalPayouts);

        // Group by payment method
        payouts.forEach(payout => {
          const method = payout.payoutMethod || 'unknown';
          if (!stats.byMethod[method]) {
            stats.byMethod[method] = { count: 0, amount: 0 };
          }
          stats.byMethod[method].count++;
          stats.byMethod[method].amount += payout.payoutAmount || 0;
        });
      }

      // Calculate success rate
      const totalAttempts = await Claim.find({
        payoutProcessedAt: { $gte: startDate },
        payoutAmount: { $gt: 0 }
      }).countDocuments();

      const failedPayouts = await Claim.find({
        payoutFailedAt: { $gte: startDate },
        payoutStatus: 'failed'
      }).countDocuments();

      stats.successRate = totalAttempts > 0 ?
        Math.round(((totalAttempts - failedPayouts) / totalAttempts) * 100) : 0;

      return stats;

    } catch (error) {
      logger.error('Error getting payout statistics:', error);
      throw error;
    }
  }

  // Helper methods
  loadPaymentProviders() {
    return {
      upi: {
        name: 'UPI Gateway',
        supported: true,
        maxAmount: 100000,
        processingTime: 'instant'
      },
      bank_transfer: {
        name: 'Bank Transfer',
        supported: true,
        maxAmount: 500000,
        processingTime: '1-2 days'
      },
      wallet: {
        name: 'Digital Wallet',
        supported: true,
        maxAmount: 50000,
        processingTime: 'instant'
      },
      paytm: {
        name: 'Paytm',
        supported: true,
        maxAmount: 100000,
        processingTime: 'instant'
      }
    };
  }

  loadPayoutRules() {
    return {
      processingFees: {
        upi: 0.002,        // 0.2%
        bank_transfer: 0.005, // 0.5%
        wallet: 0.003,     // 0.3%
        paytm: 0.002       // 0.2%
      },
      minPayoutAmount: 100,
      maxPayoutAmount: 500000,
      dailyLimit: 1000000,
      monthlyLimit: 5000000
    };
  }
}

const payoutProcessingAutomation = new PayoutProcessingAutomation();

module.exports = { payoutProcessingAutomation };
