// GoShuttle Pro - Multi-Role Notification Service
// Reads role-based email settings and dispatches notifications to all configured recipients

import { supabase } from '../lib/supabase';

class NotificationService {
  constructor() {
    this.settingsCache = null;
    this.cacheExpiry = 0;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load email notification settings from database
   */
  async getEmailSettings() {
    try {
      const now = Date.now();
      if (this.settingsCache && now < this.cacheExpiry) {
        return this.settingsCache;
      }

      const { data, error } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'booking_form_email_settings')
        ?.single();

      if (error || !data?.setting_value) {
        return null;
      }

      this.settingsCache = data?.setting_value;
      this.cacheExpiry = now + this.CACHE_DURATION;
      return this.settingsCache;
    } catch (err) {
      console.error('NotificationService: failed to load settings', err);
      return null;
    }
  }

  /**
   * Clear settings cache (call after settings are updated)
   */
  clearCache() {
    this.settingsCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Build recipients list for a given event type based on role settings
   */
  buildRecipients(settings, eventType) {
    if (!settings?.booking_notifications_enabled) return [];

    const roleRecipients = settings?.role_recipients || {};
    const recipients = [];

    // Admin (always uses admin_email from top-level)
    const adminEmail = settings?.admin_email || roleRecipients?.admin?.email;
    if (adminEmail && roleRecipients?.admin?.triggers?.[eventType] !== false) {
      recipients?.push({ email: adminEmail, role: 'admin', event_type: eventType });
    }

    // Superadmin
    const superadminConfig = roleRecipients?.superadmin;
    if (superadminConfig?.enabled && superadminConfig?.email && superadminConfig?.triggers?.[eventType] !== false) {
      recipients?.push({ email: superadminConfig?.email, role: 'superadmin', event_type: eventType });
    }

    // Corporate
    const corporateConfig = roleRecipients?.corporate;
    if (corporateConfig?.enabled && corporateConfig?.email && corporateConfig?.triggers?.[eventType] !== false) {
      recipients?.push({ email: corporateConfig?.email, role: 'corporate', event_type: eventType });
    }

    // Partner
    const partnerConfig = roleRecipients?.partner;
    if (partnerConfig?.enabled && partnerConfig?.email && partnerConfig?.triggers?.[eventType] !== false) {
      recipients?.push({ email: partnerConfig?.email, role: 'partner', event_type: eventType });
    }

    return recipients;
  }

  /**
   * Send booking notification to all configured role recipients
   * @param {object} bookingData - booking details
   * @param {string} eventType - 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'payment_received'
   */
  async sendBookingNotification(bookingData, eventType = 'new_booking') {
    try {
      const settings = await this.getEmailSettings();
      if (!settings) {
        console.warn('NotificationService: no email settings found');
        return { success: false, message: 'Email settings not configured' };
      }

      const recipients = this.buildRecipients(settings, eventType);
      if (recipients?.length === 0) {
        console.log(`NotificationService: no recipients configured for event: ${eventType}`);
        return { success: true, message: 'No recipients configured for this event', sent: 0 };
      }

      const fromEmail = settings?.from_email || 'noreply@goshuttle.ph';
      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';

      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: 'multi_role_notification',
          from_email: fromEmail,
          resend_api_key: resendApiKey,
          booking_data: {
            booking_id: bookingData?.bookingCode || bookingData?.booking_code || bookingData?.id,
            customer_name: bookingData?.primaryPassengerFirstName
              ? `${bookingData?.primaryPassengerFirstName} ${bookingData?.primaryPassengerLastName || ''}`?.trim()
              : bookingData?.guestName || bookingData?.guest_name || bookingData?.user_profiles?.full_name || 'N/A',
            customer_email: bookingData?.primaryPassengerEmail || bookingData?.guestEmail || bookingData?.guest_email || bookingData?.user_profiles?.email,
            customer_phone: bookingData?.primaryPassengerPhone || bookingData?.guestPhone || bookingData?.guest_phone,
            pickup_location: bookingData?.pickupLocation || bookingData?.pickup_location,
            dropoff_location: bookingData?.dropoffLocation || bookingData?.dropoff_location,
            pickup_date: bookingData?.pickupDate || bookingData?.pickup_date,
            pickup_time: bookingData?.pickupTime || bookingData?.pickup_time,
            vehicle_name: bookingData?.vehicles?.name || bookingData?.vehicle_name,
            vehicle_type: bookingData?.vehicles?.vehicle_type || bookingData?.vehicle_type,
            passenger_count: bookingData?.passengerCount || bookingData?.passenger_count,
            total_cost: bookingData?.totalCost || bookingData?.total_cost,
            special_requirements: bookingData?.notes || bookingData?.special_requirements,
            return_date: bookingData?.returnDate || bookingData?.return_date,
          },
          recipients,
        }
      });

      if (error) {
        console.error('NotificationService: edge function error', error);
        return { success: false, error: error?.message };
      }

      console.log(`✅ NotificationService: booking notifications sent for ${eventType}`, data);
      return { success: true, data, sent: recipients?.length };
    } catch (err) {
      console.error('NotificationService: sendBookingNotification error', err);
      return { success: false, error: err?.message };
    }
  }

  /**
   * Send driver signup notification to all configured role recipients
   * @param {object} driverData - driver signup details
   */
  async sendDriverSignupNotification(driverData) {
    try {
      const settings = await this.getEmailSettings();
      if (!settings) {
        console.warn('NotificationService: no email settings found');
        return { success: false, message: 'Email settings not configured' };
      }

      const recipients = this.buildRecipients(settings, 'driver_signup');
      const fromEmail = settings?.from_email || 'noreply@goshuttle.ph';

      const results = [];

      // 1. Notify GoShuttle staff
      if (recipients?.length > 0) {
        const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
          body: {
            type: 'driver_signup_notification',
            from_email: fromEmail,
            resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
            driver_data: {
              full_name: driverData?.fullName || driverData?.full_name,
              email: driverData?.email,
              phone: driverData?.phone,
              license_number: driverData?.licenseNumber || driverData?.license_number,
              license_expiry: driverData?.licenseExpiry || driverData?.license_expiry,
              fleet_type: driverData?.fleetType || driverData?.fleet_type,
              partner_name: driverData?.partnerName || driverData?.partner_name,
            },
            recipients,
          }
        });
        if (error) {
          console.error('NotificationService: staff notification error', error);
        } else {
          results?.push({ type: 'staff_notification', success: true, data });
        }
      }

      // 2. Send welcome email to the driver/partner themselves
      if (driverData?.email) {
        const welcomeResult = await this.sendPartnerWelcomeEmail(driverData, fromEmail);
        results?.push({ type: 'partner_welcome', ...welcomeResult });
      }

      console.log('✅ NotificationService: driver signup notifications sent', results);
      return { success: true, results, sent: recipients?.length };
    } catch (err) {
      console.error('NotificationService: sendDriverSignupNotification error', err);
      return { success: false, error: err?.message };
    }
  }

  /**
   * Send welcome email directly to the driver/partner who just signed up
   * @param {object} driverData - driver signup details
   * @param {string} fromEmail - sender email
   */
  async sendPartnerWelcomeEmail(driverData, fromEmail) {
    try {
      const driverEmail = driverData?.email;
      if (!driverEmail) {
        return { success: false, message: 'No driver email provided' };
      }

      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';

      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: 'partner_welcome',
          to_email: driverEmail,
          from_email: fromEmail || 'noreply@goshuttle.ph',
          resend_api_key: resendApiKey,
          driver_data: {
            full_name: driverData?.fullName || driverData?.full_name,
            email: driverData?.email,
            phone: driverData?.phone,
            license_number: driverData?.licenseNumber || driverData?.license_number,
            license_expiry: driverData?.licenseExpiry || driverData?.license_expiry,
            fleet_type: driverData?.fleetType || driverData?.fleet_type,
            partner_name: driverData?.partnerName || driverData?.partner_name,
          },
        }
      });

      if (error) {
        console.error('NotificationService: partner welcome email error', error);
        return { success: false, error: error?.message };
      }

      console.log('✅ NotificationService: partner welcome email sent to', driverEmail);
      return { success: true, data };
    } catch (err) {
      console.error('NotificationService: sendPartnerWelcomeEmail error', err);
      return { success: false, error: err?.message };
    }
  }

  /**
   * Send booking notification to a fleet partner
   * @param {object} bookingData - booking details
   * @param {string} partnerEmail - partner's email address
   */
  async sendPartnerBookingNotification(bookingData, partnerEmail) {
    try {
      if (!partnerEmail) {
        return { success: false, message: 'No partner email provided' };
      }

      const settings = await this.getEmailSettings();
      const fromEmail = settings?.from_email || 'noreply@goshuttle.ph';

      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: 'partner_booking_notification',
          to_email: partnerEmail,
          from_email: fromEmail,
          resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
          booking_data: {
            booking_id: bookingData?.bookingCode || bookingData?.booking_code || bookingData?.id,
            customer_name: bookingData?.primaryPassengerFirstName
              ? `${bookingData?.primaryPassengerFirstName} ${bookingData?.primaryPassengerLastName || ''}`?.trim()
              : bookingData?.guestName || bookingData?.guest_name || 'N/A',
            pickup_location: bookingData?.pickupLocation || bookingData?.pickup_location,
            dropoff_location: bookingData?.dropoffLocation || bookingData?.dropoff_location,
            pickup_date: bookingData?.pickupDate || bookingData?.pickup_date,
            pickup_time: bookingData?.pickupTime || bookingData?.pickup_time,
            vehicle_name: bookingData?.vehicles?.name || bookingData?.vehicle_name,
            vehicle_type: bookingData?.vehicles?.vehicle_type || bookingData?.vehicle_type,
            passenger_count: bookingData?.passengerCount || bookingData?.passenger_count,
          },
        }
      });

      if (error) {
        console.error('NotificationService: partner booking notification error', error);
        return { success: false, error: error?.message };
      }

      console.log('✅ NotificationService: partner booking notification sent to', partnerEmail);
      return { success: true, data };
    } catch (err) {
      console.error('NotificationService: sendPartnerBookingNotification error', err);
      return { success: false, error: err?.message };
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
