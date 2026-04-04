/**
 * Notification & Communication Automation
 * Handles automated notifications across multiple channels
 */

const winston = require('winston');
const axios = require('axios');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const User = require('../../Backend/insurance-module/models/User');
const Policy = require('../../Backend/insurance-module/models/Policy');
const Claim = require('../../Backend/insurance-module/models/Claim');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/notification-automation.log' }),
    new winston.transports.Console()
  ]
});

class NotificationAutomation {
  constructor() {
    this.emailTransporter = this.initializeEmailTransporter();
    this.twilioClient = this.initializeTwilioClient();
    this.notificationTemplates = this.loadNotificationTemplates();
    this.notificationRules = this.loadNotificationRules();
  }

  /**
   * Send notification to user
   */
  async sendNotification(params) {
    try {
      const { userId, type, message, data = {}, channels = ['auto'] } = params;

      logger.info(`📤 Sending ${type} notification to user: ${userId}`);

      // Get user with notification preferences
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Determine channels to use
      const selectedChannels = channels[0] === 'auto' ?
        this.determineChannels(user, type) : channels;

      // Prepare notification content
      const content = this.prepareNotificationContent(type, message, data, user);

      // Send through each channel
      const results = [];
      for (const channel of selectedChannels) {
        try {
          const result = await this.sendThroughChannel(channel, user, content);
          results.push({ channel, success: true, ...result });
        } catch (error) {
          logger.error(`Error sending ${channel} notification:`, error);
          results.push({ channel, success: false, error: error.message });
        }
      }

      // Log notification
      await this.logNotification(userId, type, selectedChannels, results, content);

      const successCount = results.filter(r => r.success).length;
      logger.info(`✅ Notification sent to ${successCount}/${selectedChannels.length} channels for user ${userId}`);

      return {
        userId,
        type,
        channels: selectedChannels,
        results,
        sentAt: new Date()
      };

    } catch (error) {
      logger.error(`Error sending notification to user ${params.userId}:`, error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications) {
    try {
      logger.info(`📤 Sending bulk notifications to ${notifications.length} users`);

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const notification of notifications) {
        try {
          const result = await this.sendNotification(notification);
          results.push(result);
          successCount++;
        } catch (error) {
          logger.error(`Error sending bulk notification:`, error);
          results.push({ error: error.message, ...notification });
          failureCount++;
        }
      }

      logger.info(`✅ Bulk notifications completed: ${successCount} successful, ${failureCount} failed`);
      return {
        total: notifications.length,
        successful: successCount,
        failed: failureCount,
        results,
        completedAt: new Date()
      };

    } catch (error) {
      logger.error('Error in bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Send automated alerts for system events
   */
  async sendSystemAlerts() {
    try {
      logger.info('🚨 Checking for system alerts...');

      const alerts = await this.checkSystemAlerts();

      if (alerts.length === 0) {
        return { alertsSent: 0, message: 'No alerts to send' };
      }

      // Send alerts to admin users
      const adminUsers = await User.find({ role: 'admin' });

      let totalSent = 0;
      for (const alert of alerts) {
        for (const admin of adminUsers) {
          try {
            await this.sendNotification({
              userId: admin._id,
              type: 'system_alert',
              message: alert.message,
              data: alert.data,
              channels: ['email', 'sms'] // Critical alerts
            });
            totalSent++;
          } catch (error) {
            logger.error(`Error sending alert to admin ${admin._id}:`, error);
          }
        }
      }

      logger.info(`✅ System alerts sent: ${totalSent} notifications`);
      return {
        alertsSent: totalSent,
        alertCount: alerts.length,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error sending system alerts:', error);
      throw error;
    }
  }

  /**
   * Send personalized risk alerts to users
   */
  async sendRiskAlerts() {
    try {
      logger.info('⚠️ Sending personalized risk alerts...');

      // Get users with high risk profiles
      const highRiskUsers = await User.find({
        riskScore: { $gte: 70 },
        notificationsEnabled: true
      }).populate('policies');

      let alertsSent = 0;

      for (const user of highRiskUsers) {
        try {
          // Check if user has recent risk increase
          const recentRiskIncrease = await this.checkRecentRiskIncrease(user);

          if (recentRiskIncrease) {
            await this.sendNotification({
              userId: user._id,
              type: 'risk_alert',
              message: `Your risk score has increased to ${user.riskScore}. Consider safety measures.`,
              data: {
                riskScore: user.riskScore,
                increase: recentRiskIncrease,
                recommendations: this.getRiskRecommendations(user.riskScore)
              }
            });
            alertsSent++;
          }

        } catch (error) {
          logger.error(`Error sending risk alert to user ${user._id}:`, error);
        }
      }

      logger.info(`✅ Risk alerts sent: ${alertsSent}`);
      return { alertsSent, timestamp: new Date() };

    } catch (error) {
      logger.error('Error sending risk alerts:', error);
      throw error;
    }
  }

  /**
   * Send policy renewal reminders
   */
  async sendRenewalReminders() {
    try {
      logger.info('📅 Sending policy renewal reminders...');

      // Get policies expiring in next 30 days
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const expiringPolicies = await Policy.find({
        expiryDate: { $lte: thirtyDaysFromNow, $gt: new Date() },
        status: 'active'
      }).populate('userId');

      let remindersSent = 0;

      for (const policy of expiringPolicies) {
        try {
          const daysUntilExpiry = Math.ceil(
            (policy.expiryDate - new Date()) / (24 * 60 * 60 * 1000)
          );

          await this.sendNotification({
            userId: policy.userId._id,
            type: 'renewal_reminder',
            message: `Your policy expires in ${daysUntilExpiry} days. Renew now to continue coverage.`,
            data: {
              policy,
              daysUntilExpiry,
              renewalOptions: this.getRenewalOptions(policy)
            }
          });
          remindersSent++;

        } catch (error) {
          logger.error(`Error sending renewal reminder for policy ${policy._id}:`, error);
        }
      }

      logger.info(`✅ Renewal reminders sent: ${remindersSent}`);
      return { remindersSent, timestamp: new Date() };

    } catch (error) {
      logger.error('Error sending renewal reminders:', error);
      throw error;
    }
  }

  /**
   * Send claim status updates
   */
  async sendClaimStatusUpdates() {
    try {
      logger.info('📋 Sending claim status updates...');

      // Get claims with recent status changes (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentClaims = await Claim.find({
        $or: [
          { approvedAt: { $gte: yesterday } },
          { rejectedAt: { $gte: yesterday } },
          { submittedAt: { $gte: yesterday } }
        ]
      }).populate('userId policyId');

      let updatesSent = 0;

      for (const claim of recentClaims) {
        try {
          let notificationType, message;

          if (claim.approvedAt) {
            notificationType = 'claim_approved';
            message = `Your claim has been approved! Payout: ₹${claim.payoutAmount}`;
          } else if (claim.rejectedAt) {
            notificationType = 'claim_rejected';
            message = `Your claim has been rejected: ${claim.rejectionReason}`;
          } else if (claim.submittedAt) {
            notificationType = 'claim_submitted';
            message = 'Your claim has been submitted and is under review.';
          }

          if (notificationType) {
            await this.sendNotification({
              userId: claim.userId._id,
              type: notificationType,
              message,
              data: { claim }
            });
            updatesSent++;
          }

        } catch (error) {
          logger.error(`Error sending claim update for claim ${claim._id}:`, error);
        }
      }

      logger.info(`✅ Claim status updates sent: ${updatesSent}`);
      return { updatesSent, timestamp: new Date() };

    } catch (error) {
      logger.error('Error sending claim status updates:', error);
      throw error;
    }
  }

  // Channel-specific sending methods
  async sendThroughChannel(channel, user, content) {
    switch (channel) {
      case 'email':
        return await this.sendEmail(user, content);
      case 'sms':
        return await this.sendSMS(user, content);
      case 'push':
        return await this.sendPushNotification(user, content);
      case 'whatsapp':
        return await this.sendWhatsApp(user, content);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(user, content) {
    try {
      if (!user.email) {
        throw new Error('User has no email address');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@gigcover.com',
        to: user.email,
        subject: content.subject,
        html: content.htmlBody,
        text: content.textBody
      };

      const info = await this.emailTransporter.sendMail(mailOptions);

      return {
        messageId: info.messageId,
        channel: 'email',
        recipient: user.email
      };

    } catch (error) {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(user, content) {
    try {
      if (!user.phoneNumber) {
        throw new Error('User has no phone number');
      }

      const message = await this.twilioClient.messages.create({
        body: content.textBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phoneNumber
      });

      return {
        messageId: message.sid,
        channel: 'sms',
        recipient: user.phoneNumber
      };

    } catch (error) {
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Send push notification (simulated)
   */
  async sendPushNotification(user, content) {
    try {
      // In real implementation, integrate with FCM/APNs
      logger.info(`📱 Push notification would be sent to user ${user._id}: ${content.subject}`);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        messageId: `push_${Date.now()}`,
        channel: 'push',
        recipient: user._id
      };

    } catch (error) {
      throw new Error(`Push notification failed: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp notification (simulated)
   */
  async sendWhatsApp(user, content) {
    try {
      // In real implementation, integrate with WhatsApp Business API
      logger.info(`💬 WhatsApp message would be sent to user ${user._id}: ${content.textBody}`);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        messageId: `wa_${Date.now()}`,
        channel: 'whatsapp',
        recipient: user.phoneNumber
      };

    } catch (error) {
      throw new Error(`WhatsApp sending failed: ${error.message}`);
    }
  }

  // Helper methods
  determineChannels(user, type) {
    const preferences = user.notificationPreferences || {};
    const channels = [];

    // Check notification rules for this type
    const typeRules = this.notificationRules[type] || this.notificationRules.default;

    if (typeRules.email && preferences.email !== false) channels.push('email');
    if (typeRules.sms && preferences.sms !== false) channels.push('sms');
    if (typeRules.push && preferences.push !== false) channels.push('push');

    // Ensure at least one channel
    if (channels.length === 0) channels.push('email');

    return channels;
  }

  prepareNotificationContent(type, customMessage, data, user) {
    const template = this.notificationTemplates[type] || this.notificationTemplates.default;

    // Replace placeholders
    const replacements = {
      userName: user.name || 'User',
      ...data
    };

    const subject = this.replacePlaceholders(template.subject, replacements);
    const htmlBody = this.replacePlaceholders(template.htmlBody, replacements);
    const textBody = customMessage || this.replacePlaceholders(template.textBody, replacements);

    return {
      subject,
      htmlBody,
      textBody,
      type,
      data
    };
  }

  replacePlaceholders(text, replacements) {
    let result = text;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  async logNotification(userId, type, channels, results, content) {
    try {
      // In real implementation, save to database
      logger.info(`📝 Logged notification: ${type} to ${userId} via ${channels.join(', ')}`);
    } catch (error) {
      logger.error('Error logging notification:', error);
    }
  }

  async checkSystemAlerts() {
    // Simulate system health checks
    const alerts = [];

    // Check for high error rates, system performance, etc.
    // This would integrate with monitoring systems

    return alerts;
  }

  async checkRecentRiskIncrease(user) {
    // Check if risk score increased significantly recently
    // Implementation would check historical risk data
    return user.riskScore > 80; // Simplified
  }

  getRiskRecommendations(riskScore) {
    if (riskScore >= 80) {
      return ['Avoid high-risk areas', 'Use protective gear', 'Consider additional coverage'];
    } else if (riskScore >= 60) {
      return ['Be cautious in risky conditions', 'Keep emergency contacts updated'];
    }
    return ['Maintain current safety practices'];
  }

  getRenewalOptions(policy) {
    return {
      sameCoverage: policy.coverageAmount,
      increasedCoverage: policy.coverageAmount * 1.1,
      discountAvailable: true
    };
  }

  initializeEmailTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  initializeTwilioClient() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return null;
    }

    return twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  loadNotificationTemplates() {
    return {
      claim_approved: {
        subject: 'Your Insurance Claim Has Been Approved! 🎉',
        htmlBody: `
          <h2>Great News, {{userName}}!</h2>
          <p>Your insurance claim has been approved and processed.</p>
          <p><strong>Payout Amount:</strong> ₹{{payoutAmount}}</p>
          <p><strong>Transaction ID:</strong> {{transactionId}}</p>
          <p>The payment will be credited to your account shortly.</p>
        `,
        textBody: 'Your claim has been approved! Payout: ₹{{payoutAmount}}'
      },
      claim_rejected: {
        subject: 'Update on Your Insurance Claim',
        htmlBody: `
          <h2>Claim Update</h2>
          <p>Dear {{userName}},</p>
          <p>After review, your claim has been rejected.</p>
          <p><strong>Reason:</strong> {{reason}}</p>
          <p>Please contact support if you have questions.</p>
        `,
        textBody: 'Your claim has been rejected: {{reason}}'
      },
      risk_alert: {
        subject: 'Risk Alert: Take Precautions',
        htmlBody: `
          <h2>Risk Alert</h2>
          <p>Dear {{userName}},</p>
          <p>Your current risk score is {{riskScore}}.</p>
          <p>Please take necessary precautions to stay safe.</p>
        `,
        textBody: 'Risk alert: Your risk score is {{riskScore}}. Stay safe!'
      },
      renewal_reminder: {
        subject: 'Policy Renewal Reminder',
        htmlBody: `
          <h2>Policy Renewal Due</h2>
          <p>Dear {{userName}},</p>
          <p>Your policy expires in {{daysUntilExpiry}} days.</p>
          <p>Please renew to continue coverage.</p>
        `,
        textBody: 'Your policy expires in {{daysUntilExpiry}} days. Renew now!'
      },
      default: {
        subject: 'GigCover Notification',
        htmlBody: '<p>{{message}}</p>',
        textBody: '{{message}}'
      }
    };
  }

  loadNotificationRules() {
    return {
      claim_approved: { email: true, sms: true, push: true },
      claim_rejected: { email: true, sms: true, push: false },
      risk_alert: { email: true, sms: true, push: true },
      renewal_reminder: { email: true, sms: false, push: true },
      system_alert: { email: true, sms: true, push: false },
      default: { email: true, sms: false, push: false }
    };
  }
}

const notificationAutomation = new NotificationAutomation();

module.exports = { notificationAutomation };
