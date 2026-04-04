const { PLANS } = require('../utils/constants');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isMonsoonMonth(date = new Date()) {
    const month = date.getMonth() + 1;
    return month >= 6 && month <= 9;
}

function normalizePlan(plan, workerType = 'GIG') {
    const normalizedWorkerType = String(workerType || 'GIG').toUpperCase();
    const normalizedInputPlan = String(plan || '').trim().toUpperCase();

    if (!normalizedInputPlan) {
        return normalizedWorkerType === 'GIG' ? 'GIG_STANDARD' : 'STANDARD';
    }

    if (normalizedWorkerType === 'GIG' && !normalizedInputPlan.startsWith('GIG_')) {
        return `GIG_${normalizedInputPlan}`;
    }

    return normalizedInputPlan;
}

exports.calculatePremium = (plan, riskFactor = 1, workerType = 'GIG') => {
    const normalizedPlan = normalizePlan(plan, workerType);
    const basePlan = PLANS[normalizedPlan] || PLANS[plan] || PLANS.GIG_STANDARD;
    const safeRiskFactor = clamp(Number(riskFactor) || 1, 0.8, 1.6);
    const seasonalMultiplier = isMonsoonMonth() ? 1.15 : 1;
    const dynamicPlan = /STANDARD|PREMIUM/.test(normalizedPlan);
    const riskMultiplier = dynamicPlan ? safeRiskFactor : 1;
    const workerMultiplier = dynamicPlan && workerType === 'GIG' ? 1.05 : 1;

    const basePremiumCalculated = basePlan.premium * riskMultiplier * seasonalMultiplier * workerMultiplier;
    
    // Plan-aware premium caps: Premium max 50, Standard max 45
    const isPremiumPlan = /PREMIUM/.test(normalizedPlan);
    const premiumCap = isPremiumPlan ? 50 : 45;
    
    const weeklyPremium = Math.round(Math.min(premiumCap, basePremiumCalculated));

    const coverageAmount = Math.round(
        basePlan.coverage * (dynamicPlan ? Math.max(1, safeRiskFactor) : 1)
    );

    return {
        weeklyPremium: dynamicPlan ? weeklyPremium : basePlan.premium,
        coverageAmount,
        pricingBreakdown: {
            normalizedPlan,
            basePremium: basePlan.premium,
            baseCoverage: basePlan.coverage,
            riskFactor: safeRiskFactor,
            riskMultiplierApplied: riskMultiplier,
            seasonalMultiplierApplied: seasonalMultiplier,
            workerMultiplierApplied: workerMultiplier,
            dynamicPlan,
            lockedPayableAmount: weeklyPremium
        }
    };
};
