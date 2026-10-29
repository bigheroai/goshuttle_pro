// Enhanced Booking Email Helper Utility
// Integrates with the dynamic email service for real-time booking notifications

import emailService from '../services/emailService';
import notificationService from '../services/notificationService';


export class BookingEmailHelper {
  /**
   * ENHANCED: Get email settings from database with improved error handling
   */
  async getEmailSettings() {
    try {
      // Use the emailService's dynamic configuration method
      const dynamicConfig = await emailService?.getEmailSettingsFromDatabase();
      return dynamicConfig;
    } catch (error) {
      console.error('Error fetching email settings:', error);
      return this.getDefaultEmailSettings();
    }
  }

  /**
   * ENHANCED: Get default email settings with corporate server defaults - SIMPLIFIED for SMTP outgoing only
   */
  getDefaultEmailSettings() {
    return {
      admin_email: 'corporate@konnectd.co',
      admin_name: 'GoShuttle Admin',
      booking_notifications_enabled: true,
      
      // SMTP Corporate Settings - OUTGOING ONLY
      smtp_enabled: false,
      smtp_host: 'secure.emailsrvr.com',
      smtp_port: 465,
      smtp_username: 'corporate@konnectd.co',
      smtp_password: 'Snar$%#@you22',
      smtp_encryption: 'ssl',
      
      // Email Templates
      from_name: 'GoShuttle Pro',
      from_email: 'noreply@goshuttle.ph',
      sender_name: 'GoShuttle Pro Support',
      sender_email: 'noreply@goshuttle.ph',
      subject_template: 'New Booking Request #{booking_id}',
      booking_subject: 'Booking Confirmation - #{booking_id}',
      
      // Notification Triggers
      notification_triggers: {
        new_booking: true,
        booking_confirmed: true,
        booking_cancelled: true,
        payment_received: false
      }
    };
  }

  /**
   * ENHANCED: Send booking confirmation to customer with dynamic configuration
   */
  async sendBookingConfirmationToCustomer(booking) {
    try {
      const settings = await this.getEmailSettings();

      if (!settings?.booking_notifications_enabled) {
        return { 
          success: false, 
          message: 'Email notifications are disabled in admin settings',
          reason: 'notifications_disabled'
        };
      }

      const customerEmail = booking?.customer_email || booking?.email;
      if (!customerEmail) {
        return { 
          success: false, 
          message: 'Customer email not provided in booking data',
          reason: 'missing_email'
        };
      }

      // Clear cache before sending to ensure fresh config
      emailService?.clearSettingsCache();

      const result = await emailService?.sendBookingConfirmation({
        booking,
        customerEmail,
        settings: {} // Let emailService load dynamic config
      });

      if (result?.success) {
        console.log('✅ Customer booking confirmation sent successfully:', {
          bookingId: booking?.id || booking?.booking_id,
          customerEmail,
          service: result?.service,
          messageId: result?.id
        });
      }

      return result;
    } catch (error) {
      console.error('Error sending customer booking confirmation:', error);
      return { 
        success: false, 
        error: error?.message,
        reason: 'send_error'
      };
    }
  }

  /**
   * ENHANCED: Send admin notification with dynamic configuration and notification type checking
   */
  async sendAdminNotificationForBooking(booking, notificationType = 'new_booking') {
    try {
      const settings = await this.getEmailSettings();

      if (!settings?.booking_notifications_enabled) {
        return { 
          success: false, 
          message: 'Admin notifications are disabled in settings',
          reason: 'notifications_disabled'
        };
      }

      if (!settings?.notification_triggers?.[notificationType]) {
        return { 
          success: false, 
          message: `${notificationType} notifications are disabled in admin settings`,
          reason: 'trigger_disabled'
        };
      }

      const adminEmail = settings?.admin_email;
      if (!adminEmail) {
        return { 
          success: false, 
          message: 'Admin email not configured in settings',
          reason: 'missing_admin_email'
        };
      }

      // Clear cache before sending to ensure fresh config
      emailService?.clearSettingsCache();

      const result = await emailService?.sendAdminNotification({
        booking,
        adminEmail,
        notificationType,
        settings: {} // Let emailService load dynamic config
      });

      if (result?.success) {
        console.log('✅ Admin notification sent successfully:', {
          bookingId: booking?.id || booking?.booking_id,
          adminEmail,
          notificationType,
          service: result?.service,
          messageId: result?.id
        });
      }

      return result;
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return { 
        success: false, 
        error: error?.message,
        reason: 'send_error'
      };
    }
  }

  /**
   * Send booking notification to all configured role recipients (superadmin, admin, corporate, partner)
   * @param {object} booking - booking data
   * @param {string} eventType - 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'payment_received'
   */
  async sendMultiRoleBookingNotification(booking, eventType = 'new_booking') {
    try {
      const result = await notificationService?.sendBookingNotification(booking, eventType);
      if (result?.success) {
        console.log(`✅ Multi-role booking notification sent for ${eventType}, recipients: ${result?.sent}`);
      } else {
        console.warn(`⚠️ Multi-role booking notification issue for ${eventType}:`, result?.message || result?.error);
      }
      return result;
    } catch (error) {
      console.error('Error in sendMultiRoleBookingNotification:', error);
      return { success: false, error: error?.message };
    }
  }

  /**
   * ENHANCED: Send both customer confirmation, admin notification, AND multi-role notifications
   */
  async sendAllBookingNotifications(booking, options = {}) {
    const results = {
      customer: null,
      admin: null,
      multiRole: null,
      success: false,
      errors: [],
    };

    try {
      // Send customer confirmation
      if (options?.sendCustomerConfirmation !== false) {
        results.customer = await this.sendBookingConfirmationToCustomer(booking);
        if (!results?.customer?.success) {
          results?.errors?.push(`Customer email: ${results?.customer?.message || results?.customer?.error}`);
        }
      }

      // Send multi-role notifications (superadmin, admin, corporate, partner)
      results.multiRole = await this.sendMultiRoleBookingNotification(
        booking,
        options?.eventType || 'new_booking'
      );
      if (!results?.multiRole?.success) {
        results?.errors?.push(`Multi-role notification: ${results?.multiRole?.message || results?.multiRole?.error}`);
      }

      results.success = (
        (options?.sendCustomerConfirmation === false || results?.customer?.success) &&
        (results?.multiRole?.success || results?.multiRole?.sent === 0)
      );

      return results;
    } catch (error) {
      console.error('Error in sendAllBookingNotifications:', error);
      results?.errors?.push(`General error: ${error?.message}`);
      return results;
    }
  }

  /**
   * ENHANCED: Send both customer confirmation and admin notification with comprehensive result tracking
   */
  async sendBookingEmails(booking, options = {}) {
    const results = {
      customer: null,
      admin: null,
      success: false,
      errors: [],
      summary: {
        attempted: 0,
        successful: 0,
        failed: 0
      }
    };

    try {
      console.log('📧 Starting booking email notifications for booking:', booking?.id || booking?.booking_id);

      // Send customer confirmation if requested
      if (options?.sendCustomerConfirmation !== false) {
        results.summary.attempted++;
        console.log('📤 Sending customer confirmation email...');
        
        results.customer = await this.sendBookingConfirmationToCustomer(booking);
        
        if (results?.customer?.success) {
          results.summary.successful++;
          console.log('✅ Customer email sent successfully');
        } else {
          results.summary.failed++;
          results?.errors?.push(`Customer email failed: ${results?.customer?.error || results?.customer?.message} (${results?.customer?.reason || 'unknown'})`);
          console.log('❌ Customer email failed:', results?.customer?.message);
        }
      }

      // Send admin notification if requested
      if (options?.sendAdminNotification !== false) {
        results.summary.attempted++;
        console.log('📤 Sending admin notification email...');
        
        results.admin = await this.sendAdminNotificationForBooking(
          booking, 
          options?.notificationType || 'new_booking'
        );
        
        if (results?.admin?.success) {
          results.summary.successful++;
          console.log('✅ Admin email sent successfully');
        } else {
          results.summary.failed++;
          results?.errors?.push(`Admin email failed: ${results?.admin?.error || results?.admin?.message} (${results?.admin?.reason || 'unknown'})`);
          console.log('❌ Admin email failed:', results?.admin?.message);
        }
      }

      // Determine overall success
      results.success = (
        (options?.sendCustomerConfirmation === false || results?.customer?.success) &&
        (options?.sendAdminNotification === false || results?.admin?.success)
      );

      console.log('📊 Booking email summary:', {
        attempted: results?.summary?.attempted,
        successful: results?.summary?.successful,
        failed: results?.summary?.failed,
        overallSuccess: results?.success
      });

      return results;
    } catch (error) {
      console.error('Error in sendBookingEmails:', error);
      results?.errors?.push(`General error: ${error?.message}`);
      results.summary.failed = results?.summary?.attempted;
      return results;
    }
  }

  /**
   * ENHANCED: Test email configuration with comprehensive status checking
   */
  async testEmailConfiguration(testEmail) {
    try {
      console.log('🧪 Testing email configuration...');

      // Clear cache to get fresh settings
      emailService?.clearSettingsCache();
      
      // Get current configuration status
      const configStatus = await emailService?.testEmailConfig();
      console.log('📊 Current email configuration:', configStatus);

      if (!testEmail) {
        const settings = await this.getEmailSettings();
        testEmail = settings?.admin_email;
      }

      if (!testEmail) {
        return { 
          success: false, 
          error: 'No test email address provided and admin email not configured',
          configStatus
        };
      }

      console.log(`📧 Sending test email to: ${testEmail}`);
      
      const result = await emailService?.sendTestEmail({
        to: testEmail,
        settings: {} // Let emailService load dynamic config
      });

      if (result?.success) {
        console.log('✅ Test email sent successfully via:', result?.service);
      } else {
        console.log('❌ Test email failed:', result?.error);
      }

      return {
        ...result,
        configStatus,
        testEmail
      };
    } catch (error) {
      console.error('Error testing email configuration:', error);
      return { 
        success: false, 
        error: error?.message,
        configStatus: await emailService?.testEmailConfig()?.catch(() => null)
      };
    }
  }

  /**
   * NEW: Check if SMTP outgoing mail is properly configured
   */
  async checkEmailConfigurationHealth() {
    try {
      const settings = await this.getEmailSettings();
      const configStatus = await emailService?.testEmailConfig();
      
      const health = {
        overall: 'healthy',
        notifications: {
          enabled: settings?.booking_notifications_enabled,
          adminEmail: settings?.admin_email,
          triggers: settings?.notification_triggers
        },
        service: {
          active: configStatus?.activeService,
          smtp: configStatus?.smtp,
          resend: configStatus?.resend
        },
        mailType: 'outgoing_only', // Indicates simplified configuration
        issues: []
      };

      // Check for common configuration issues - SMTP outgoing only
      if (!settings?.booking_notifications_enabled) {
        health?.issues?.push('Email notifications are disabled');
        health.overall = 'warning';
      }

      if (!settings?.admin_email) {
        health?.issues?.push('Admin email not configured');
        health.overall = 'error';
      }

      if (configStatus?.activeService === 'smtp' && !configStatus?.smtp?.configured) {
        health?.issues?.push('SMTP outgoing server configuration incomplete');
        health.overall = 'error';
      }

      if (configStatus?.activeService === 'resend' && !configStatus?.resend?.configured) {
        health?.issues?.push('Resend API key not configured');
        health.overall = 'error';
      }

      console.log('📤 Email health check (Outgoing Only):', health);

      return health;
    } catch (error) {
      return {
        overall: 'error',
        mailType: 'outgoing_only',
        issues: [`Configuration check failed: ${error?.message}`],
        error: error?.message
      };
    }
  }

  /**
   * NEW: Refresh email configuration cache
   */
  refreshEmailConfiguration() {
    emailService?.clearSettingsCache();
    console.log('🔄 Email configuration cache refreshed');
  }
}

// Export singleton instance
export const bookingEmailHelper = new BookingEmailHelper();

// Export convenience methods
export const {
  sendBookingConfirmationToCustomer,
  sendAdminNotificationForBooking,
  sendBookingEmails,
  testEmailConfiguration,
  checkEmailConfigurationHealth,
  refreshEmailConfiguration
} = bookingEmailHelper;

export default bookingEmailHelper;