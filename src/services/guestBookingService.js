import { supabase } from '../lib/supabase';
import { sendBookingConfirmationEmail } from '../utils/resendEmailService';

export const guestBookingService = {
  // Send booking notification emails for guest bookings
  async sendGuestBookingNotifications(bookingData, originalGuestData) {
    try {
      // Get email settings from app_settings
      const { data: emailSettings } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'booking_form_email_settings')
        ?.single();

      // Get company contact details
      const { data: companyContactData } = await supabase
        ?.rpc('get_company_contact_details');

      const settings = emailSettings?.setting_value || {};
      const companyContact = companyContactData || {
        company_name: 'GoShuttle Philippines',
        support_email: 'support@goshuttle.com',
        support_phone: '+63 2 8123 4567',
        hotline_phone: '+63 917 123 4567',
        emergency_phone: '+63 998 765 4321'
      };
      
      // Prepare email data for guest booking
      const emailData = {
        booking_id: bookingData?.id?.substring(0, 8)?.toUpperCase(),
        booking_code: bookingData?.booking_code || null,
        guest_name: bookingData?.guest_name,
        customer_name: bookingData?.guest_name,
        guest_email: bookingData?.guest_email,
        customer_email: bookingData?.guest_email,
        guest_phone: bookingData?.guest_phone,
        customer_phone: bookingData?.guest_phone,
        pickup_location: bookingData?.pickup_location,
        dropoff_location: bookingData?.dropoff_location,
        pickup_date: new Date(bookingData?.pickup_date)?.toLocaleDateString(),
        pickup_time: new Date(bookingData?.pickup_date)?.toLocaleTimeString(),
        return_date: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleDateString() : null,
        return_time: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleTimeString() : null,
        vehicle_type: originalGuestData?.vehicle?.type || 'Standard Vehicle',
        vehicle_name: originalGuestData?.vehicle?.name || 'GoShuttle Vehicle',
        passenger_count: bookingData?.passenger_count,
        special_requirements: bookingData?.notes,
        total_cost: bookingData?.total_cost,
        payment_method: originalGuestData?.payment?.method || 'To be determined',
        // Include company contact details
        company_contact: companyContact
      };

      // Use configured from_email or undefined (let edge function use its default)
      const from_email = settings?.from_email || undefined;

      // 1. Send admin notification if admin_email is configured
      const notificationsEnabled = settings?.booking_notifications_enabled !== false;
      if (notificationsEnabled && settings?.admin_email) {
        try {
          console.log('📧 Sending guest booking admin notification to:', settings?.admin_email);
          await supabase?.functions?.invoke('send-booking-confirmation', {
            body: {
              type: 'admin_notification',
              admin_email: settings?.admin_email,
              ...(from_email ? { from_email } : {}),
              resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
              booking_data: emailData
            }
          });
        } catch (adminEmailError) {
          console.error('Admin email notification failed:', adminEmailError);
        }
      } else {
        console.log('ℹ️ Admin notification skipped - no admin_email configured or notifications disabled');
      }

      // 2. Send guest confirmation email using resendEmailService (with edge function fallback)
      const guestEmail = bookingData?.guest_email;
      if (guestEmail && bookingData?.id) {
        try {
          console.log('📧 Sending guest confirmation email to:', guestEmail);
          const result = await sendBookingConfirmationEmail(guestEmail, {
            ...emailData,
            id: bookingData?.id,
            pickup_date: bookingData?.pickup_date,
          }, supabase);

          if (result?.success) {
            await supabase?.from('bookings')?.update({
              email_confirmation_status: 'sent',
              email_confirmation_sent_at: new Date()?.toISOString(),
              email_confirmation_recipient: guestEmail,
              email_confirmation_error: null,
            })?.eq('id', bookingData?.id);
            console.log('✅ Guest confirmation email sent to:', guestEmail);
          } else {
            await supabase?.from('bookings')?.update({
              email_confirmation_status: 'failed',
              email_confirmation_failed_at: new Date()?.toISOString(),
              email_confirmation_error: result?.error || 'Send failed',
              email_confirmation_recipient: guestEmail,
            })?.eq('id', bookingData?.id);
            console.warn('Guest confirmation email failed:', result?.error);
          }
        } catch (guestEmailError) {
          await supabase?.from('bookings')?.update({
            email_confirmation_status: 'failed',
            email_confirmation_failed_at: new Date()?.toISOString(),
            email_confirmation_error: guestEmailError?.message || 'Unknown error',
            email_confirmation_recipient: guestEmail,
          })?.eq('id', bookingData?.id);
          console.error('Guest confirmation email failed:', guestEmailError);
        }
      } else {
        console.warn('⚠️ No guest email found - skipping guest confirmation');
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending guest booking notifications:', error);
      throw error;
    }
  },

  // Enhanced createGuestBooking method
  async createGuestBooking(guestBookingData) {
    try {
      console.log('GuestBookingService - Creating guest booking with data:', guestBookingData);

      // Validate guest details
      if (!guestBookingData?.guestDetails?.fullName || !guestBookingData?.guestDetails?.email) {
        throw new Error('Guest name and email are required');
      }

      // Validate and format pickup date - FIXED: Add proper validation and formatting
      const formatDateTime = (date, time) => {
        console.log('GuestBookingService - formatDateTime input:', { date, time });
        
        if (!date || !time) {
          console.error('GuestBookingService - Missing date or time:', { date, time });
          throw new Error('Date and time are required');
        }
        
        // Ensure date is in YYYY-MM-DD format and time is in HH:MM format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^\d{2}:\d{2}$/;
        
        if (!dateRegex?.test(date)) {
          console.error('GuestBookingService - Invalid date format:', date);
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        
        if (!timeRegex?.test(time)) {
          console.error('GuestBookingService - Invalid time format:', time);
          throw new Error('Time must be in HH:MM format');
        }
        
        const formattedDateTime = `${date}T${time}:00.000Z`;
        console.log('GuestBookingService - Formatted dateTime:', formattedDateTime);
        return formattedDateTime;
      };

      // FIXED: Enhanced logging and validation before calling formatDateTime
      console.log('GuestBookingService - Full guestBookingData received:', guestBookingData);
      console.log('GuestBookingService - DateTime object:', guestBookingData?.dateTime);

      // Format pickup date with validation
      const pickupDate = formatDateTime(guestBookingData?.dateTime?.date, guestBookingData?.dateTime?.time);
      
      // Format return date only if both returnDate and returnTime are provided
      let returnDate = null;
      if (guestBookingData?.dateTime?.returnDate && guestBookingData?.dateTime?.returnTime) {
        returnDate = formatDateTime(guestBookingData?.dateTime?.returnDate, guestBookingData?.dateTime?.returnTime);
      }

      // Create guest booking in database - FIXED: Use proper field mapping
      const { data, error } = await supabase
        ?.from('bookings')
        ?.insert([{
          user_id: null, // No user for guest booking
          pickup_location: guestBookingData?.route?.from,
          dropoff_location: guestBookingData?.route?.to,
          pickup_date: pickupDate,
          return_date: returnDate,
          passenger_count: guestBookingData?.passengerCount || 1,
          vehicle_id: guestBookingData?.vehicle?.id,
          notes: guestBookingData?.guestDetails?.specialRequirements || null,
          total_cost: guestBookingData?.vehicle?.price || 0,
          status: 'pending',
          payment_method: guestBookingData?.payment?.method || null,
          is_guest_booking: true,
          guest_name: guestBookingData?.guestDetails?.fullName,
          guest_email: guestBookingData?.guestDetails?.email,
          guest_phone: guestBookingData?.guestDetails?.phone || null
        }])
        ?.select('*')
        ?.single();

      if (error) throw error;

      // Send booking notification emails
      try {
        await this.sendGuestBookingNotifications(data, guestBookingData);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the booking if email fails
      }

      return {
        id: data?.id,
        bookingCode: data?.booking_code,
        pickupLocation: data?.pickup_location,
        dropoffLocation: data?.dropoff_location,
        pickupDate: data?.pickup_date,
        returnDate: data?.return_date,
        passengerCount: data?.passenger_count,
        vehicleId: data?.vehicle_id,
        vehicleName: guestBookingData?.vehicle?.name || null,
        vehicleType: guestBookingData?.vehicle?.type || null,
        notes: data?.notes,
        totalCost: data?.total_cost,
        status: data?.status,
        createdAt: data?.created_at,
        guestName: data?.guest_name,
        guestEmail: data?.guest_email,
        guestPhone: data?.guest_phone,
        isGuestBooking: data?.is_guest_booking,
        paymentMethod: data?.payment_method
      };
    } catch (error) {
      console.error('Error creating guest booking:', error);
      throw error;
    }
  },

  // Lookup booking by code and email
  async lookupBooking(bookingCode, email) {
    try {
      const normalizedCode = bookingCode?.toUpperCase();
      const normalizedEmail = email?.toLowerCase()?.trim();

      const selectQuery = `
          *,
          vehicles:vehicle_id (
            id,
            name,
            vehicle_type,
            license_plate,
            capacity
          ),
          driver_assignments (
            id,
            assignment_status,
            driver_profiles (
              id,
              user_profiles (
                full_name,
                phone
              )
            )
          )
        `;

      // First try: guest booking by guest_email
      const { data: guestData, error: guestError } = await supabase
        ?.from('bookings')
        ?.select(selectQuery)
        ?.eq('booking_code', normalizedCode)
        ?.eq('guest_email', normalizedEmail)
        ?.maybeSingle();

      if (guestData) {
        return this._mapBookingData(guestData);
      }

      // Second try: authenticated booking by primary_passenger_email
      const { data: passengerData, error: passengerError } = await supabase
        ?.from('bookings')
        ?.select(selectQuery)
        ?.eq('booking_code', normalizedCode)
        ?.eq('primary_passenger_email', normalizedEmail)
        ?.maybeSingle();

      if (passengerData) {
        return this._mapBookingData(passengerData);
      }

      // Third try: authenticated booking matched via user_profiles email
      const { data: profileData, error: profileError } = await supabase
        ?.from('bookings')
        ?.select(`
          *,
          vehicles:vehicle_id (
            id,
            name,
            vehicle_type,
            license_plate,
            capacity
          ),
          driver_assignments (
            id,
            assignment_status,
            driver_profiles (
              id,
              user_profiles (
                full_name,
                phone
              )
            )
          ),
          user_profiles!bookings_user_id_fkey (
            id,
            email
          )
        `)
        ?.eq('booking_code', normalizedCode)
        ?.maybeSingle();

      if (profileData && profileData?.user_profiles?.email?.toLowerCase() === normalizedEmail) {
        return this._mapBookingData(profileData);
      }

      // Nothing found
      throw new Error('Booking not found. Please check your booking code and email address.');
    } catch (error) {
      console.error('Error looking up booking:', error);
      throw error;
    }
  },

  // Internal helper to map raw DB row to camelCase object
  _mapBookingData(data) {
    return {
      id: data?.id,
      bookingCode: data?.booking_code,
      pickupLocation: data?.pickup_location,
      dropoffLocation: data?.dropoff_location,
      pickupDate: data?.pickup_date,
      returnDate: data?.return_date,
      passengerCount: data?.passenger_count,
      totalCost: data?.total_cost,
      status: data?.status,
      guestEmail: data?.guest_email,
      guestName: data?.guest_name || `${data?.primary_passenger_first_name || ''} ${data?.primary_passenger_last_name || ''}`?.trim() || null,
      guestPhone: data?.guest_phone || data?.primary_passenger_phone || null,
      notes: data?.notes,
      vehicle: data?.vehicles,
      driverAssignment: data?.driver_assignments?.[0] || null,
      createdAt: data?.created_at,
      updatedAt: data?.updated_at,
      isGuestBooking: data?.is_guest_booking,
      primaryPassengerEmail: data?.primary_passenger_email,
    };
  },

  // Update guest booking
  async updateGuestBooking(bookingId, updateData, bookingCode, email) {
    try {
      // First verify the booking belongs to the guest
      const existingBooking = await this.lookupBooking(bookingCode, email);
      if (existingBooking?.id !== bookingId) {
        throw new Error('Unauthorized to update this booking');
      }

      const { data, error } = await supabase?.from('bookings')?.update({
          guest_name: updateData?.guestName,
          guest_phone: updateData?.guestPhone,
          passenger_count: updateData?.passengerCount,
          notes: updateData?.notes,
          updated_at: new Date()?.toISOString()
        })?.eq('id', bookingId)?.eq('is_guest_booking', true)?.select()?.single();

      if (error) throw error;

      return {
        id: data?.id,
        bookingCode: data?.booking_code,
        pickupLocation: data?.pickup_location,
        dropoffLocation: data?.dropoff_location,
        pickupDate: data?.pickup_date,
        returnDate: data?.return_date,
        passengerCount: data?.passenger_count,
        totalCost: data?.total_cost,
        status: data?.status,
        guestEmail: data?.guest_email,
        guestName: data?.guest_name,
        guestPhone: data?.guest_phone,
        notes: data?.notes,
        updatedAt: data?.updated_at
      };
    } catch (error) {
      console.error('Error updating guest booking:', error);
      throw error;
    }
  },

  // Cancel guest booking
  async cancelGuestBooking(bookingCode, email, reason = '', policy = null) {
    try {
      // First verify the booking belongs to the guest
      const existingBooking = await this.lookupBooking(bookingCode, email);

      if (['cancelled', 'completed']?.includes(existingBooking?.status)) {
        throw new Error('This booking cannot be cancelled — it is already ' + existingBooking.status);
      }

      // Build update payload — works for both guest and authenticated bookings
      const updatePayload = {
        status: 'cancelled',
        cancel_reason: reason || null,
        cancelled_at: new Date()?.toISOString(),
        updated_at: new Date()?.toISOString()
      };

      const { data, error } = await supabase
        ?.from('bookings')
        ?.update(updatePayload)
        ?.eq('id', existingBooking?.id)
        ?.select()
        ?.single();

      if (error) throw error;

      // Send cancellation confirmation email
      try {
        await this._sendCancellationEmail(data, existingBooking, reason, policy);
      } catch (emailError) {
        console.error('Cancellation email failed (non-blocking):', emailError);
      }

      return {
        success: true,
        message: 'Booking cancelled successfully',
        bookingCode: data?.booking_code,
        refundAmount: policy?.refundAmount || 0,
        refundEligible: policy?.refundEligible || false
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  },

  // Send cancellation confirmation email
  async _sendCancellationEmail(dbRow, existingBooking, reason, policy) {
    const recipientEmail = dbRow?.guest_email || dbRow?.primary_passenger_email || existingBooking?.guestEmail;
    const recipientName = dbRow?.guest_name || existingBooking?.guestName || 'Valued Customer';

    if (!recipientEmail) {
      console.warn('No recipient email found for cancellation notification');
      return;
    }

    const cancellationData = {
      booking_code: dbRow?.booking_code,
      booking_id: dbRow?.booking_code,
      customer_name: recipientName,
      guest_name: recipientName,
      customer_email: recipientEmail,
      pickup_location: dbRow?.pickup_location,
      dropoff_location: dbRow?.dropoff_location,
      pickup_date: dbRow?.pickup_date ? new Date(dbRow.pickup_date)?.toLocaleDateString('en-PH', { dateStyle: 'full' }) : 'N/A',
      pickup_time: dbRow?.pickup_date ? new Date(dbRow.pickup_date)?.toLocaleTimeString('en-PH', { timeStyle: 'short' }) : 'N/A',
      total_cost: dbRow?.total_cost,
      cancellation_reason: reason || 'Not specified',
      cancellation_fee: policy?.cancellationFee ?? 0,
      refund_amount: policy?.refundAmount ?? 0,
      refund_eligible: policy?.refundEligible ?? false,
      cancellation_policy: policy?.policy || 'Standard cancellation policy applied',
      cancelled_at: new Date()?.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    };

    await supabase?.functions?.invoke('send-booking-confirmation', {
      body: {
        type: 'booking_cancellation',
        customer_email: recipientEmail,
        to_email: recipientEmail,
        resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
        booking_data: cancellationData
      }
    });
  },

  // Get available vehicles for guest booking
  async getAvailableVehicles() {
    try {
      const { data, error } = await supabase?.from('vehicles')?.select('*')?.eq('status', 'active')?.order('name', { ascending: true });

      if (error) throw error;

      return data?.map(vehicle => ({
        id: vehicle?.id,
        name: vehicle?.name,
        vehicleType: vehicle?.vehicle_type,
        capacity: vehicle?.capacity,
        licensePlate: vehicle?.license_plate,
        dailyRate: vehicle?.daily_rate || 0,
        description: vehicle?.description,
        features: vehicle?.features,
        imageUrl: vehicle?.image_url
      }));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  },

  // Send booking notification email
  async sendBookingNotification(booking, emailType) {
    try {
      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';
      const { data, error } = await supabase?.functions?.invoke('send-guest-booking-notification', {
        body: {
          booking: {
            booking_code: booking?.booking_code,
            guest_email: booking?.guest_email,
            guest_name: booking?.guest_name,
            pickup_location: booking?.pickup_location,
            dropoff_location: booking?.dropoff_location,
            pickup_date: booking?.pickup_date,
            passenger_count: booking?.passenger_count,
            total_cost: booking?.total_cost,
            status: booking?.status
          },
          emailType,
          resend_api_key: resendApiKey,
        }
      });

      if (error) {
        console.error('Error sending email notification:', error);
        // Don't throw error here - booking should succeed even if email fails
      }

      return { success: !error, data };
    } catch (error) {
      console.error('Error invoking email function:', error);
      // Don't throw error - booking should succeed even if email fails
      return { success: false, error: error?.message };
    }
  },

  // Create account invitation for guest
  async createAccountInvitation(bookingCode, email) {
    try {
      const booking = await this.lookupBooking(bookingCode, email);
      
      // Send account invitation email
      await this.sendBookingNotification({
        booking_code: booking?.bookingCode,
        guest_email: booking?.guestEmail,
        guest_name: booking?.guestName,
        pickup_location: booking?.pickupLocation,
        dropoff_location: booking?.dropoffLocation,
        pickup_date: booking?.pickupDate,
        passenger_count: booking?.passengerCount,
        total_cost: booking?.totalCost,
        status: booking?.status
      }, 'account_invitation');

      return {
        success: true,
        message: 'Account invitation sent to your email'
      };
    } catch (error) {
      console.error('Error creating account invitation:', error);
      throw error;
    }
  }
};