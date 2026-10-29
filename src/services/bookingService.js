import { supabase } from '../lib/supabase';
import { sendBookingConfirmationEmail } from '../utils/resendEmailService';

class BookingService {
  // Get all bookings for admin dashboard - ENHANCED: Include primary passenger contact fields
  async getAllBookings() {
    try {
      const { data, error } = await supabase
        ?.from('bookings')
        ?.select(`
          *,
          user_profiles!bookings_user_id_fkey(full_name, email, phone),
          vehicles!bookings_vehicle_id_fkey(name, vehicle_type, capacity)
        `)
        ?.order('created_at', { ascending: false });

      if (error) throw error;

      // Convert snake_case to camelCase for React components with primary passenger contact fields
      return data?.map(booking => ({
        id: booking?.id,
        bookingCode: booking?.booking_code,
        userId: booking?.user_id,
        vehicleId: booking?.vehicle_id,
        pickupLocation: booking?.pickup_location,
        dropoffLocation: booking?.dropoff_location,
        pickupDate: booking?.pickup_date,
        returnDate: booking?.return_date,
        passengerCount: booking?.passenger_count,
        notes: booking?.notes,
        totalCost: booking?.total_cost,
        status: booking?.status,
        paymentStatus: booking?.payment_status,
        paymentMethod: booking?.payment_method,
        paymentReference: booking?.payment_reference,
        createdAt: booking?.created_at,
        created_at: booking?.created_at,
        updatedAt: booking?.updated_at,
        updatedBy: booking?.updated_by,
        cancelledAt: booking?.cancelled_at,
        cancelledBy: booking?.cancelled_by,
        cancelReason: booking?.cancel_reason,
        // Guest booking fields
        isGuestBooking: booking?.is_guest_booking,
        is_guest_booking: booking?.is_guest_booking,
        guestName: booking?.guest_name,
        guestEmail: booking?.guest_email,
        guestPhone: booking?.guest_phone,
        // Primary passenger contact fields
        primaryPassengerFirstName: booking?.primary_passenger_first_name,
        primaryPassengerLastName: booking?.primary_passenger_last_name,
        primaryPassengerEmail: booking?.primary_passenger_email,
        primaryPassengerPhone: booking?.primary_passenger_phone,
        // Related data
        user_profiles: booking?.user_profiles ? {
          full_name: booking?.user_profiles?.full_name,
          email: booking?.user_profiles?.email,
          phone: booking?.user_profiles?.phone
        } : null,
        vehicles: booking?.vehicles ? {
          name: booking?.vehicles?.name,
          vehicle_type: booking?.vehicles?.vehicle_type,
          capacity: booking?.vehicles?.capacity
        } : null
      })) || [];
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      throw error;
    }
  }

  // Enhanced createBooking function with guest booking support
  async createBooking(bookingData) {
    try {
      console.log('BookingService - Creating booking:', JSON.stringify(bookingData, null, 2));

      // Always check the actual Supabase session to determine authentication state.
      // Do NOT rely on bookingData.user — it is never populated from the booking portal.
      const { data: { user: authUser }, error: userError } = await supabase?.auth?.getUser();

      const isGuestBooking = !authUser || !!bookingData?.isGuestBooking;
      let user = null;
      let userProfile = null;

      if (!isGuestBooking) {
        if (userError || !authUser) {
          throw new Error('User not authenticated');
        }
        user = authUser;

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          ?.from('user_profiles')
          ?.select('*')
          ?.eq('id', user?.id)
          ?.single();

        if (profileError) {
          throw new Error('Unable to fetch user profile');
        }
        userProfile = profile;
      }

      // Enhanced validation and formatting
      const formatDateTime = (date, time) => {
        console.log('BookingService - formatDateTime input:', { date, time });
        
        if (!date || !time) {
          console.error('BookingService - Missing date or time:', { date, time });
          throw new Error('Date and time are required');
        }
        
        // Ensure date is in YYYY-MM-DD format and time is in HH:MM format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^\d{2}:\d{2}$/;
        
        if (!dateRegex?.test(date)) {
          console.error('BookingService - Invalid date format:', date);
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        
        if (!timeRegex?.test(time)) {
          console.error('BookingService - Invalid time format:', time);
          throw new Error('Time must be in HH:MM format');
        }
        
        const formattedDateTime = `${date}T${time}:00.000Z`;
        console.log('BookingService - Formatted dateTime:', formattedDateTime);
        return formattedDateTime;
      };

      // Validate required fields
      if (!bookingData?.route?.from || !bookingData?.route?.to) {
        throw new Error('Route information (from and to locations) is required');
      }

      if (!bookingData?.dateTime?.date || !bookingData?.dateTime?.time) {
        throw new Error('Pickup date and time are required');
      }

      if (!bookingData?.vehicle?.id) {
        throw new Error('Vehicle selection is required');
      }

      if (!bookingData?.passengerCount || bookingData?.passengerCount < 1) {
        throw new Error('Passenger count must be at least 1');
      }

      // Format pickup date with validation
      const pickupDate = formatDateTime(bookingData?.dateTime?.date, bookingData?.dateTime?.time);
      
      // Format return date only if both returnDate and returnTime are provided
      let returnDate = null;
      if (bookingData?.dateTime?.returnDate && bookingData?.dateTime?.returnTime) {
        returnDate = formatDateTime(bookingData?.dateTime?.returnDate, bookingData?.dateTime?.returnTime);
      }

      // Enhanced booking payload with support for both authenticated users and guests
      const bookingPayload = {
        // User information (null for guest bookings)
        user_id: user?.id || null,
        
        // Booking details
        pickup_location: bookingData?.route?.from,
        dropoff_location: bookingData?.route?.to,
        pickup_date: pickupDate,
        return_date: returnDate,
        passenger_count: parseInt(bookingData?.passengerCount, 10),
        vehicle_id: bookingData?.vehicle?.id,
        notes: bookingData?.passengerDetails?.primaryPassenger?.specialRequests || bookingData?.passengerDetails?.notes || bookingData?.notes || null,
        total_cost: parseFloat(bookingData?.totalCost || bookingData?.vehicle?.price || bookingData?.vehicle?.dailyRate || bookingData?.totalCost || 0),
        status: 'pending',
        payment_method: bookingData?.paymentDetails?.method || bookingData?.payment?.method || null,
        payment_reference: bookingData?.paymentDetails?.reference || bookingData?.payment?.reference || null,
        
        // Guest booking fields
        is_guest_booking: isGuestBooking,
        guest_name: isGuestBooking ? (bookingData?.guestDetails?.name || bookingData?.passengerDetails?.primaryPassenger?.firstName + ' ' + bookingData?.passengerDetails?.primaryPassenger?.lastName) : null,
        guest_email: isGuestBooking ? (bookingData?.guestDetails?.email || bookingData?.passengerDetails?.primaryPassenger?.email) : null,
        guest_phone: isGuestBooking ? (bookingData?.guestDetails?.phone || bookingData?.passengerDetails?.primaryPassenger?.phone) : null,
        
        // Primary passenger contact fields (works for both authenticated users and guests)
        primary_passenger_first_name: bookingData?.passengerDetails?.primaryPassenger?.firstName || null,
        primary_passenger_last_name: bookingData?.passengerDetails?.primaryPassenger?.lastName || null,
        primary_passenger_email: bookingData?.passengerDetails?.primaryPassenger?.email || null,
        primary_passenger_phone: bookingData?.passengerDetails?.primaryPassenger?.phone || null,
      };

      console.log('BookingService - Enhanced booking payload:', JSON.stringify(bookingPayload, null, 2));

      // Create booking in database
      const { data, error } = await supabase
        ?.from('bookings')
        ?.insert([bookingPayload])
        ?.select('*')
        ?.single();

      if (error) {
        console.error('BookingService - Database insert error:', error);
        throw error;
      }

      console.log('BookingService - Booking created successfully:', data);

      // Fetch related data separately
      const [vehicleResult, customerResult] = await Promise.all([
        supabase?.from('vehicles')?.select('name, vehicle_type, license_plate')?.eq('id', data?.vehicle_id)?.single(),
        data?.user_id ? supabase?.from('user_profiles')?.select('full_name, email, phone')?.eq('id', data?.user_id)?.single() : { data: null }
      ]);

      const enhancedData = {
        ...data,
        vehicles: vehicleResult?.data,
        customer: customerResult?.data
      };

      console.log('BookingService - Enhanced booking data:', enhancedData);

      // Send booking notification emails
      try {
        if (isGuestBooking) {
          await this.sendGuestBookingNotifications(enhancedData, bookingData);
        } else {
          await this.sendBookingNotifications(enhancedData, userProfile, bookingData);
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the booking if email fails
      }

      // Return formatted booking data
      return {
        id: enhancedData?.id,
        bookingCode: enhancedData?.booking_code,
        pickupLocation: enhancedData?.pickup_location,
        dropoffLocation: enhancedData?.dropoff_location,
        pickupDate: enhancedData?.pickup_date,
        returnDate: enhancedData?.return_date,
        passengerCount: enhancedData?.passenger_count,
        vehicleId: enhancedData?.vehicle_id,
        vehicleName: enhancedData?.vehicles?.name,
        vehicleType: enhancedData?.vehicles?.vehicle_type,
        vehicleLicensePlate: enhancedData?.vehicles?.license_plate,
        notes: enhancedData?.notes,
        totalCost: enhancedData?.total_cost,
        status: enhancedData?.status,
        paymentMethod: enhancedData?.payment_method,
        paymentStatus: enhancedData?.payment_status,
        paymentReference: enhancedData?.payment_reference,
        createdAt: enhancedData?.created_at,
        // Guest booking info
        isGuestBooking: enhancedData?.is_guest_booking,
        guestName: enhancedData?.guest_name,
        guestEmail: enhancedData?.guest_email,
        guestPhone: enhancedData?.guest_phone,
        // Primary passenger contact information
        primaryPassengerFirstName: enhancedData?.primary_passenger_first_name,
        primaryPassengerLastName: enhancedData?.primary_passenger_last_name,
        primaryPassengerEmail: enhancedData?.primary_passenger_email,
        primaryPassengerPhone: enhancedData?.primary_passenger_phone,
        // Customer info (for authenticated users)
        customerName: enhancedData?.customer?.full_name,
        customerEmail: enhancedData?.customer?.email,
        customerPhone: enhancedData?.customer?.phone
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // New function to handle guest booking notifications
  async sendGuestBookingNotifications(bookingData, originalBookingData) {
    try {
      // Get email settings
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
        vehicle_type: bookingData?.vehicles?.vehicle_type,
        vehicle_name: bookingData?.vehicles?.name,
        passenger_count: bookingData?.passenger_count,
        special_requirements: bookingData?.notes,
        total_cost: bookingData?.total_cost,
        payment_method: originalBookingData?.payment?.method || 'To be determined',
        // Include company contact details
        company_contact: companyContact
      };

      const from_email = settings?.from_email || undefined;
      const notificationsEnabled = settings?.booking_notifications_enabled !== false;

      // 1. Send admin notification if admin_email is configured
      if (notificationsEnabled && settings?.admin_email) {
        try {
          console.log('📧 Sending guest booking admin notification');
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
          console.error('Guest booking admin notification failed:', adminEmailError);
        }
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
  }

  // Send booking notification emails (both admin and customer) - ENHANCED: Use new confirmation service
  async sendBookingNotifications(bookingData, userProfile, originalBookingData) {
    try {
      // Get email settings from app_settings - ENHANCED: Always get latest settings
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

      // Resolve customer email: prefer userProfile email, fallback to primaryPassengerEmail
      const customerEmail = userProfile?.email
        || bookingData?.primary_passenger_email
        || bookingData?.primaryPassengerEmail
        || null;

      // Resolve customer name
      const customerName = userProfile?.full_name
        || (bookingData?.primary_passenger_first_name
          ? `${bookingData?.primary_passenger_first_name} ${bookingData?.primary_passenger_last_name || ''}`?.trim()
          : null)
        || 'Valued Customer';
      
      // Prepare common email data
      const emailData = {
        booking_id: bookingData?.id?.substring(0, 8)?.toUpperCase(),
        booking_code: bookingData?.booking_code || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: userProfile?.phone || bookingData?.primary_passenger_phone || null,
        pickup_location: bookingData?.pickup_location,
        dropoff_location: bookingData?.dropoff_location,
        pickup_date: new Date(bookingData?.pickup_date)?.toLocaleDateString(),
        pickup_time: new Date(bookingData?.pickup_date)?.toLocaleTimeString(),
        return_date: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleDateString() : null,
        return_time: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleTimeString() : null,
        vehicle_type: bookingData?.vehicles?.vehicle_type,
        vehicle_name: bookingData?.vehicles?.name,
        passenger_count: bookingData?.passenger_count,
        special_requirements: bookingData?.notes,
        total_cost: bookingData?.total_cost,
        payment_method: originalBookingData?.payment?.method || 'To be determined',
        company_contact: companyContact
      };

      const from_email = settings?.from_email || undefined;
      const notificationsEnabled = settings?.booking_notifications_enabled !== false;

      // 1. Send admin notification if admin_email is configured
      if (notificationsEnabled && settings?.admin_email) {
        try {
          console.log('📧 Sending admin notification with sender:', from_email || 'default');
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
      }

      // 2. Send customer confirmation email using resendEmailService (with edge function fallback)
      if (customerEmail && bookingData?.id) {
        try {
          console.log('📧 Sending customer confirmation to:', customerEmail);
          const result = await sendBookingConfirmationEmail(customerEmail, {
            ...emailData,
            id: bookingData?.id,
            pickup_date: bookingData?.pickup_date,
          }, supabase);

          if (result?.success) {
            await supabase?.from('bookings')?.update({
              email_confirmation_status: 'sent',
              email_confirmation_sent_at: new Date()?.toISOString(),
              email_confirmation_recipient: customerEmail,
              email_confirmation_error: null,
            })?.eq('id', bookingData?.id);
            console.log('✅ Customer confirmation email sent to:', customerEmail);
          } else {
            await supabase?.from('bookings')?.update({
              email_confirmation_status: 'failed',
              email_confirmation_failed_at: new Date()?.toISOString(),
              email_confirmation_error: result?.error || 'Send failed',
              email_confirmation_recipient: customerEmail,
            })?.eq('id', bookingData?.id);
            console.error('Customer confirmation email failed:', result?.error);
          }
        } catch (customerEmailError) {
          await supabase?.from('bookings')?.update({
            email_confirmation_status: 'failed',
            email_confirmation_failed_at: new Date()?.toISOString(),
            email_confirmation_error: customerEmailError?.message || 'Unknown error',
            email_confirmation_recipient: customerEmail,
          })?.eq('id', bookingData?.id);
          console.error('Customer confirmation email failed:', customerEmailError);
        }
      } else {
        console.warn('⚠️ No customer email found for booking:', bookingData?.id, '- skipping customer confirmation');
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending booking notifications:', error);
      throw error;
    }
  }

  // Send booking notification email (admin only - for backward compatibility)
  async sendBookingNotification(bookingData, userProfile) {
    try {
      // Get email settings from app_settings
      const { data: emailSettings } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'booking_form_email_settings')
        ?.single();

      const settings = emailSettings?.setting_value;
      
      // Check if notifications are enabled
      if (!settings?.booking_notifications_enabled || !settings?.admin_email) {
        console.log('Admin email notifications are disabled or admin email not configured');
        return { success: true, message: 'Notifications disabled' };
      }

      // Format booking data for email
      const emailData = {
        booking_id: bookingData?.id?.substring(0, 8)?.toUpperCase(),
        customer_name: userProfile?.full_name,
        customer_email: userProfile?.email,
        customer_phone: userProfile?.phone,
        pickup_location: bookingData?.pickup_location,
        dropoff_location: bookingData?.dropoff_location,
        pickup_date: new Date(bookingData?.pickup_date)?.toLocaleDateString(),
        pickup_time: new Date(bookingData?.pickup_date)?.toLocaleTimeString(),
        vehicle_type: bookingData?.vehicles?.vehicle_type,
        passenger_count: bookingData?.passenger_count,
        special_requirements: bookingData?.notes
      };

      // Call the edge function
      const { data, error } = await supabase?.functions?.invoke('send-booking-notification', {
        body: {
          type: 'new_booking',
          to_email: settings?.admin_email,
          admin_name: settings?.admin_name || 'Admin',
          resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
          booking_data: emailData
        }
      });

      if (error) {
        console.error('Email notification error:', error);
        throw error;
      }

      console.log('Booking notification sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Error sending booking notification:', error);
      throw error;
    }
  }

  // Get user bookings - FIXED: Use explicit joins to avoid ambiguous relationships
  async getUserBookings(userId) {
    try {
      const { data, error } = await supabase
        ?.from('bookings')
        ?.select('*')
        ?.eq('user_id', userId)
        ?.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch vehicle data separately for each booking
      const bookingsWithVehicles = await Promise.all(
        data?.map(async (booking) => {
          const { data: vehicleData } = await supabase
            ?.from('vehicles')
            ?.select('name, vehicle_type, image_url')
            ?.eq('id', booking?.vehicle_id)
            ?.single();

          return {
            ...booking,
            vehicles: vehicleData
          };
        }) || []
      );

      return bookingsWithVehicles?.map(booking => ({
        id: booking?.id,
        pickupLocation: booking?.pickup_location,
        dropoffLocation: booking?.dropoff_location,
        pickupDate: booking?.pickup_date,
        returnDate: booking?.return_date,
        passengerCount: booking?.passenger_count,
        vehicleName: booking?.vehicles?.name,
        vehicleType: booking?.vehicles?.vehicle_type,
        vehicleImage: booking?.vehicles?.image_url || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d",
        vehicleImageAlt: `${booking?.vehicles?.vehicle_type || 'Vehicle'} for passenger transport`,
        notes: booking?.notes,
        totalCost: booking?.total_cost,
        status: booking?.status,
        createdAt: booking?.created_at,
        // Format for trip history component
        from: booking?.pickup_location,
        to: booking?.dropoff_location,
        date: new Date(booking?.pickup_date)?.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        time: new Date(booking?.pickup_date)?.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        duration: this.calculateDuration(booking?.pickup_date, booking?.return_date),
        amount: parseFloat(booking?.total_cost || 0)?.toFixed(2)
      })) || [];
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  }

  // Helper method to calculate trip duration
  calculateDuration(startDate, endDate) {
    if (!endDate) return 'Single trip';
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end - start;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `${diffHours}h ${diffMins}m`;
      }
      return `${diffMins} mins`;
    } catch (error) {
      return 'Unknown';
    }
  }

  // Get current active trip for live tracking
  async getCurrentTrip(userId) {
    try {
      const { data, error } = await supabase
        ?.from('bookings')
        ?.select('*')
        ?.eq('user_id', userId)
        ?.in('status', ['confirmed', 'in_progress'])
        ?.order('pickup_date', { ascending: true })
        ?.limit(1)
        ?.single();

      if (error || !data) return null;

      // Fetch related data
      const [vehicleResult, driverResult] = await Promise.all([
        supabase?.from('vehicles')?.select('*')?.eq('id', data?.vehicle_id)?.single(),
        supabase?.from('driver_assignments')
          ?.select('*, driver_profiles(*, user_profiles(full_name, phone))')
          ?.eq('booking_id', data?.id)
          ?.single()
      ]);

      const driverProfile = driverResult?.data?.driver_profiles;

      return {
        id: data?.id,
        booking_code: data?.booking_code,
        status: data?.status,
        pickup: data?.pickup_location,
        destination: data?.dropoff_location,
        pickup_date: data?.pickup_date,
        return_date: data?.return_date,
        passenger_count: data?.passenger_count,
        total_cost: data?.total_cost,
        notes: data?.notes,
        vehicle: vehicleResult?.data,
        driver: driverProfile ? {
          name: driverProfile?.user_profiles?.full_name,
          phone: driverProfile?.user_profiles?.phone,
          photo: driverProfile?.photo_url || "https://images.unsplash.com/photo-1696347609175-49b310bb8106",
          photoAlt: 'Professional driver headshot',
          rating: driverProfile?.rating || 4.8,
          totalTrips: driverProfile?.total_trips || 0,
          licenseNumber: driverProfile?.license_number
        } : null
      };
    } catch (error) {
      console.error('Error fetching current trip:', error);
      return null;
    }
  }

  // Update booking status
  async updateBookingStatus(bookingId, status) {
    try {
      const { data, error } = await supabase
        ?.from('bookings')
        ?.update({ status, updated_at: new Date()?.toISOString() })
        ?.eq('id', bookingId)
        ?.select('*')
        ?.single();

      if (error) throw error;

      // Fetch related data separately
      const [vehicleResult, customerResult] = await Promise.all([
        supabase?.from('vehicles')?.select('name, vehicle_type')?.eq('id', data?.vehicle_id)?.single(),
        supabase?.from('user_profiles')?.select('full_name, email')?.eq('id', data?.user_id)?.single()
      ]);

      const enhancedData = {
        ...data,
        vehicles: vehicleResult?.data,
        user_profiles: customerResult?.data
      };

      // Send confirmation email if status is confirmed
      if (status === 'confirmed') {
        try {
          await this.sendBookingConfirmation(enhancedData);
          await this.sendCustomerConfirmation(enhancedData);
        } catch (emailError) {
          console.error('Confirmation email failed:', emailError);
        }
      }

      return enhancedData;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  // Function to get email settings from app_settings
  async getEmailSettings() {
    try {
      const { data, error } = await supabase?.from('app_settings')?.select('setting_value')?.eq('setting_key', 'booking_form_email_settings')?.single();

      if (error || !data) {
        return {
          from_email: null,
          admin_email: null
        };
      }

      const emailConfig = data?.setting_value || {};
      return {
        from_email: emailConfig?.from_email || null,
        admin_email: emailConfig?.admin_email || null,
        sender_name: emailConfig?.from_name || 'GoShuttle Pro'
      };
    } catch (error) {
      console.error('Error fetching email settings:', error);
      return {
        from_email: null,
        admin_email: null
      };
    }
  }

  // Updated sendBookingConfirmation function
  async sendBookingConfirmationEmail(bookingData, emailType = 'customer_confirmation') {
    try {
      const emailSettings = await this.getEmailSettings();
      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';
      
      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          booking_data: bookingData,
          customer_email: bookingData?.customer_email || bookingData?.email,
          admin_email: emailSettings?.admin_email,
          from_email: emailSettings?.from_email,
          resend_api_key: resendApiKey,
          type: emailType
        }
      });

      if (error) {
        throw new Error(error?.message || 'Failed to send booking confirmation email');
      }

      return {
        success: true,
        data: data,
        sender_email: emailSettings?.from_email || 'noreply@goshuttle.ph'
      };
    } catch (error) {
      console.error('Booking confirmation email error:', error);
      throw error;
    }
  }

  // Updated sendGuestBookingConfirmation function  
  async sendGuestBookingConfirmation(bookingData) {
    try {
      const emailSettings = await this.getEmailSettings();
      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';
      
      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          booking_data: bookingData,
          customer_email: bookingData?.guest_email,
          admin_email: emailSettings?.admin_email,
          from_email: emailSettings?.from_email,
          resend_api_key: resendApiKey,
          type: 'guest_booking_confirmation'
        }
      });

      if (error) {
        throw new Error(error?.message || 'Failed to send guest booking confirmation email');
      }

      return {
        success: true,
        data: data,
        sender_email: emailSettings?.from_email || 'noreply@goshuttle.ph'
      };
    } catch (error) {
      console.error('Guest booking confirmation email error:', error);
      throw error;
    }
  }

  // Updated sendAdminNotification function
  async sendAdminNotification(bookingData) {
    try {
      const emailSettings = await this.getEmailSettings();
      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';
      
      if (!emailSettings?.admin_email) {
        console.warn('Admin email not configured, skipping admin notification');
        return { success: true, skipped: true };
      }
      
      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          booking_data: bookingData,
          admin_email: emailSettings?.admin_email,
          from_email: emailSettings?.from_email,
          resend_api_key: resendApiKey,
          type: 'admin_notification'
        }
      });

      if (error) {
        throw new Error(error?.message || 'Failed to send admin notification email');
      }

      return {
        success: true,
        data: data,
        sender_email: emailSettings?.from_email || 'noreply@goshuttle.ph'
      };
    } catch (error) {
      console.error('Admin notification email error:', error);
      throw error;
    }
  }

  // Send booking confirmation email (admin)
  async sendBookingConfirmation(bookingData) {
    try {
      const { data: emailSettings } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'booking_form_email_settings')
        ?.single();

      const settings = emailSettings?.setting_value;
      const adminEmail = settings?.admin_email || 'admin@goshuttle.com';
      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';

      const emailData = {
        booking_id: bookingData?.id?.substring(0, 8)?.toUpperCase(),
        customer_name: bookingData?.user_profiles?.full_name,
        pickup_date: new Date(bookingData?.pickup_date)?.toLocaleDateString(),
        pickup_time: new Date(bookingData?.pickup_date)?.toLocaleTimeString()
      };

      const { data, error } = await supabase?.functions?.invoke('send-booking-notification', {
        body: {
          type: 'booking_confirmed',
          to_email: adminEmail,
          admin_name: settings?.admin_name || 'Admin',
          resend_api_key: resendApiKey,
          booking_data: emailData
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      throw error;
    }
  }

  // Send customer confirmation email
  async sendCustomerConfirmation(bookingData) {
    try {
      const customerEmail = bookingData?.user_profiles?.email;
      
      if (!customerEmail) {
        console.error('No customer email found');
        return;
      }

      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';

      const emailData = {
        booking_id: bookingData?.id?.substring(0, 8)?.toUpperCase(),
        customer_name: bookingData?.user_profiles?.full_name,
        customer_email: customerEmail,
        pickup_location: bookingData?.pickup_location,
        dropoff_location: bookingData?.dropoff_location,
        pickup_date: new Date(bookingData?.pickup_date)?.toLocaleDateString(),
        pickup_time: new Date(bookingData?.pickup_date)?.toLocaleTimeString(),
        return_date: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleDateString() : null,
        return_time: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleTimeString() : null,
        vehicle_name: bookingData?.vehicles?.name,
        vehicle_type: bookingData?.vehicles?.vehicle_type,
        passenger_count: bookingData?.passenger_count,
        special_requirements: bookingData?.notes,
        total_cost: bookingData?.total_cost
      };

      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: 'customer_confirmation',
          customer_email: customerEmail,
          resend_api_key: resendApiKey,
          booking_data: emailData
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending customer confirmation:', error);
      throw error;
    }
  }

  // Get available vehicles
  async getAvailableVehicles() {
    try {
      const { data, error } = await supabase
        ?.from('vehicles')
        ?.select('*')
        ?.eq('status', 'active')
        ?.order('name');

      if (error) throw error;

      return data?.map(vehicle => ({
        id: vehicle?.id,
        name: vehicle?.name,
        capacity: vehicle?.capacity,
        vehicleType: vehicle?.vehicle_type,
        dailyRate: vehicle?.daily_rate,
        features: vehicle?.features,
        imageUrl: vehicle?.image_url,
        description: vehicle?.description
      })) || [];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  // Get available vehicles for booking form - FIXED: Enhanced method to get partner/admin vehicles only
  async getAvailableVehiclesForBooking() {
    try {
      const { data, error } = await supabase
        ?.from('vehicles')
        ?.select(`
          *,
          partner_vehicles!partner_vehicles_vehicle_id_fkey(
            id,
            is_active,
            partner_id,
            partners(name, is_active)
          )
        `)
        ?.eq('status', 'active')
        ?.order('name');

      if (error) throw error;

      return data?.map(vehicle => ({
        id: vehicle?.id,
        name: vehicle?.name,
        capacity: vehicle?.capacity,
        vehicleType: vehicle?.vehicle_type,
        dailyRate: vehicle?.daily_rate,
        features: vehicle?.features,
        imageUrl: vehicle?.image_url,
        description: vehicle?.description,
        // Include partner info if this is a partner vehicle
        partner: vehicle?.partner_vehicles?.[0] ? {
          id: vehicle?.partner_vehicles?.[0]?.partner_id,
          name: vehicle?.partner_vehicles?.[0]?.partners?.name,
          isActive: vehicle?.partner_vehicles?.[0]?.is_active && vehicle?.partner_vehicles?.[0]?.partners?.is_active
        } : null,
        // Only show vehicles that are:
        // 1. Directly managed by admin (no partner assignment) OR
        // 2. Managed by active partners with active assignments
        isAvailable: !vehicle?.partner_vehicles?.[0] || 
                    (vehicle?.partner_vehicles?.[0]?.is_active && vehicle?.partner_vehicles?.[0]?.partners?.is_active)
      }))?.filter(vehicle => vehicle?.isAvailable) || [];
    } catch (error) {
      console.error('Error fetching vehicles for booking:', error);
      throw error;
    }
  }

  // ENHANCED: Test email configuration - Add comprehensive email testing with better error handling
  async testEmailConfiguration(testEmail) {
    try {
      // Get email settings
      const { data: emailSettings } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'booking_form_email_settings')
        ?.single();

      const settings = emailSettings?.setting_value;
      const targetEmail = testEmail || settings?.admin_email || 'admin@goshuttle.com';

      console.log('📧 Testing email configuration:');
      console.log('   Target email:', targetEmail);
      console.log('   From email (admin setting):', settings?.from_email || 'Not configured');
      console.log('   Admin email:', settings?.admin_email || 'Not configured');

      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: 'test_email',
          customer_email: targetEmail,
          from_email: settings?.from_email,
          resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
          booking_data: {
            booking_id: 'TEST-' + Date.now(),
            customer_name: 'Test User',
            pickup_location: 'Test Location A',
            dropoff_location: 'Test Location B',
            pickup_date: new Date()?.toLocaleDateString(),
            pickup_time: new Date()?.toLocaleTimeString(),
            vehicle_type: 'Executive Car',
            passenger_count: 1,
            total_cost: 1500
          }
        }
      });

      if (error) {
        console.error('Test email error details:', error);
        throw error;
      }

      console.log('✅ Test email sent successfully:', data);
      return {
        success: true,
        data: data,
        sender_email: settings?.from_email || 'noreply@goshuttle.ph',
        target_email: targetEmail,
        timestamp: new Date()?.toISOString()
      };
    } catch (error) {
      console.error('Error testing email configuration:', error);
      
      // Enhanced error messaging for better troubleshooting
      let errorMessage = `Email test failed: ${error?.message}`;
      
      if (error?.message?.includes('RESEND_API_KEY')) {
        errorMessage += '\n\n🔧 Solution: Configure RESEND_API_KEY in Supabase Project Settings > Edge Functions > Environment Variables';
      } else if (error?.message?.includes('Invalid email format')) {
        errorMessage += '\n\n🔧 Solution: Check that all email addresses are properly formatted';
      } else if (error?.message?.includes('Forbidden')) {
        errorMessage += '\n\n🔧 Solution: Verify your sender email domain in Resend dashboard and check API key permissions';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Get booking by ID for admin management
  async getBookingById(bookingId) {
    try {
      const { data, error } = await supabase
        ?.from('bookings')
        ?.select('*')
        ?.eq('id', bookingId)
        ?.single();

      if (error) throw error;

      // Fetch related data separately
      const [vehicleResult, customerResult] = await Promise.all([
        supabase?.from('vehicles')?.select('name, vehicle_type')?.eq('id', data?.vehicle_id)?.single(),
        supabase?.from('user_profiles')?.select('full_name, email, phone')?.eq('id', data?.user_id)?.single()
      ]);

      return {
        ...data,
        vehicles: vehicleResult?.data,
        user_profiles: customerResult?.data
      };
    } catch (error) {
      console.error('Error fetching booking by ID:', error);
      throw error;
    }
  }

  // Resend booking confirmation email manually
  async resendBookingConfirmation(bookingId) {
    try {
      const bookingData = await this.getBookingById(bookingId);
      
      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Get company contact details
      const { data: companyContactData } = await supabase
        ?.rpc('get_company_contact_details');

      // ENHANCED: Get email settings for from_email
      const { data: emailSettings } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'booking_form_email_settings')
        ?.single();

      const settings = emailSettings?.setting_value;
      const companyContact = companyContactData || {
        company_name: 'GoShuttle Philippines',
        support_email: 'support@goshuttle.com',
        support_phone: '+63 2 8123 4567',
        hotline_phone: '+63 917 123 4567',
        emergency_phone: '+63 998 765 4321'
      };

      const emailData = {
        booking_id: bookingData?.id?.substring(0, 8)?.toUpperCase(),
        customer_name: bookingData?.user_profiles?.full_name,
        customer_email: bookingData?.user_profiles?.email,
        customer_phone: bookingData?.user_profiles?.phone,
        pickup_location: bookingData?.pickup_location,
        dropoff_location: bookingData?.dropoff_location,
        pickup_date: new Date(bookingData?.pickup_date)?.toLocaleDateString(),
        pickup_time: new Date(bookingData?.pickup_date)?.toLocaleTimeString(),
        return_date: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleDateString() : null,
        return_time: bookingData?.return_date ? new Date(bookingData?.return_date)?.toLocaleTimeString() : null,
        vehicle_name: bookingData?.vehicles?.name,
        vehicle_type: bookingData?.vehicles?.vehicle_type,
        passenger_count: bookingData?.passenger_count,
        special_requirements: bookingData?.notes,
        total_cost: bookingData?.total_cost,
        company_contact: companyContact
      };

      const { data, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: 'customer_confirmation',
          customer_email: bookingData?.user_profiles?.email,
          from_email: settings?.from_email,
          resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
          booking_data: emailData
        }
      });

      if (error) throw error;
      return {
        success: true,
        data: data,
        sender_email: settings?.from_email || 'noreply@goshuttle.ph'
      };
    } catch (error) {
      console.error('Error resending booking confirmation:', error);
      throw error;
    }
  }
}

export default new BookingService();