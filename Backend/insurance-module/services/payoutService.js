const logger = require('../utils/logger');

const PAYOUT_METHODS = {
    BANK_TRANSFER: {
        processingTime: '2-3 business days',
        fee: 0,
        minAmount: 0
    },
    WALLET: {
        processingTime: 'Instant',
        fee: 0,
        minAmount: 0
    },
    CHEQUE: {
        processingTime: '5-7 business days',
        fee: 50,
        minAmount: 500
    }
};

class PayoutService {
    /**
     * Process payout for approved claim
     */
    async processPayout(payoutData) {
        const { userId, claimId, amount, method = 'BANK_TRANSFER' } = payoutData;

        // Validate payout method
        if (!PAYOUT_METHODS[method]) {
            throw new Error(`Invalid payout method: ${method}`);
        }

        const methodConfig = PAYOUT_METHODS[method];

        // Validate amount
        if (amount < methodConfig.minAmount) {
            throw new Error(
                `Amount must be at least ${methodConfig.minAmount} for ${method}`
            );
        }

        try {
            logger.info('Processing payout', {
                userId,
                claimId,
                amount,
                method,
                processingTime: methodConfig.processingTime
            });

            // Simulate payout processing
            const payoutResult = {
                success: true,
                transactionId: this._generateTransactionId(),
                amount: amount - methodConfig.fee,
                fee: methodConfig.fee,
                totalAmount: amount,
                method,
                processingTime: methodConfig.processingTime,
                status: 'INITIATED',
                timestamp: new Date()
            };

            logger.info('Payout processed successfully', {
                claimId,
                transactionId: payoutResult.transactionId
            });

            return payoutResult;
        } catch (error) {
            logger.error('Payout processing error', {
                claimId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get payout status
     */
    async getPayoutStatus(transactionId) {
        try {
            // In production, this would query a payment gateway
            logger.debug('Retrieving payout status', { transactionId });

            return {
                transactionId,
                status: 'COMPLETED',
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Failed to retrieve payout status', { error: error.message });
            throw error;
        }
    }

    /**
     * Calculate payout amount based on coverage and multiplier
     */
    calculatePayoutAmount(coverageAmount, riskMultiplier = 1) {
        return Math.round(coverageAmount * riskMultiplier);
    }

    /**
     * Generate unique transaction ID
     */
    _generateTransactionId() {
        return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    /**
     * Validate payout eligibility
     */
    async validatePayoutEligibility(claimData) {
        const { claim, policy } = claimData;

        const issues = [];

        if (claim.status !== 'APPROVED') {
            issues.push('Claim must be approved for payout');
        }

        if (policy.status !== 'ACTIVE') {
            issues.push('Policy must be active for payout');
        }

        if (new Date() > policy.expiryDate) {
            issues.push('Policy has expired');
        }

        if (claim.payoutAmount && claim.payoutAmount > 0) {
            issues.push('Claim has already been paid out');
        }

        return {
            eligible: issues.length === 0,
            issues
        };
    }
}

module.exports = {
    payoutService: new PayoutService()
};
