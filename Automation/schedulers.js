const cron = require('node-cron');
const { onboardingAutomation } = require('./workflows/onboardingWorkflow');
const { policyAutomation } = require('./workflows/policyWorkflow');
const { premiumAutomation } = require('./workflows/premiumWorkflow');
const { triggerDetectionAutomation } = require('./workflows/triggerDetectionWorkflow');
const { claimProcessingAutomation } = require('./workflows/claimProcessingWorkflow');
const { payoutProcessingAutomation } = require('./workflows/payoutProcessingWorkflow');

class AutomationSchedulers {
  constructor(logger = console) {
    this.logger = logger;
    this.jobs = [];
  }

  async initializeSchedulers() {
    // Keep schedules conservative for local development stability.
    this.jobs = [
      {
        name: 'onboarding-pending',
        schedule: '*/5 * * * *',
        handler: () => onboardingAutomation.processPendingOnboardings(),
      },
      {
        name: 'policy-updates',
        schedule: '*/10 * * * *',
        handler: () => policyAutomation.processPolicyUpdates(),
      },
      {
        name: 'premium-refresh',
        schedule: '*/15 * * * *',
        handler: () => premiumAutomation.updateAllPremiums(),
      },
      {
        name: 'trigger-detection',
        schedule: '*/5 * * * *',
        handler: () => triggerDetectionAutomation.detectAndTrigger(),
      },
      {
        name: 'claim-processing',
        schedule: '*/5 * * * *',
        handler: () => claimProcessingAutomation.processPendingClaims(),
      },
      {
        name: 'payout-processing',
        schedule: '*/5 * * * *',
        handler: () => payoutProcessingAutomation.processPendingPayouts(),
      },
    ];

    return this.jobs;
  }

  startAllJobs() {
    for (const job of this.jobs) {
      if (!cron.validate(job.schedule)) {
        this.logger.warn(`Invalid cron schedule for ${job.name}: ${job.schedule}`);
        continue;
      }

      const task = cron.schedule(job.schedule, async () => {
        try {
          await job.handler();
        } catch (error) {
          this.logger.error(`Scheduler job failed (${job.name})`, error);
        }
      });

      job.task = task;
      this.logger.info(`Scheduler started: ${job.name} (${job.schedule})`);
    }
  }

  stopAllJobs() {
    for (const job of this.jobs) {
      if (job.task && typeof job.task.stop === 'function') {
        job.task.stop();
      }
    }
  }
}

const automationSchedulers = new AutomationSchedulers();

module.exports = {
  AutomationSchedulers,
  automationSchedulers,
};
