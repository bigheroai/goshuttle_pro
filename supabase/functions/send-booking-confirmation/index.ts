import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

// Declare Deno types for environment access
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Helper: send a single email via Resend
async function sendResendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${err}`);
  }
  return await response.json();
}

// Helper: load email template from Supabase DB
async function loadEmailTemplate(supabaseUrl: string, supabaseKey: string, templateKey: string): Promise<{ subject: string; html_body: string } | null> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/email_templates?template_key=eq.${templateKey}&is_active=eq.true&select=subject,html_body&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

// Helper: replace {{variable}} placeholders in template
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : `{{${key}}}`;
  });
}

serve(async (req) => {
  // ✅ CORS preflight
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  try {
    const body = await req?.json();
    const { type, to_email, customer_email, admin_email, admin_name, from_email, test_data, booking_data, recipients, driver_data, custom_subject, custom_html } = body;

    // Accept resend_api_key from request body as fallback when env secret is not set
    const RESEND_API_KEY = Deno?.env?.get('RESEND_API_KEY') || body?.resend_api_key || '';
    if (!RESEND_API_KEY) {
      // Return a 200 with success:false so the frontend fallback triggers cleanly
      // without the Supabase SDK throwing "Edge Function returned a non-2xx status code"
      return new Response(JSON.stringify({
        success: false,
        error: 'RESEND_API_KEY not configured in Supabase secrets. Using frontend fallback.',
        fallback_required: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const SUPABASE_URL = Deno?.env?.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // FIXED: Use verified goshuttle.ph domain as sender.
    const senderEmail = "noreply@goshuttle.ph";
    const data = booking_data || test_data;

    // ===== MULTI-ROLE NOTIFICATION =====
    if (type === 'multi_role_notification') {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new Error("recipients array is required for multi_role_notification");
      }

      const results: any[] = [];
      for (const recipient of recipients) {
        if (!recipient?.email) continue;
        const role = recipient?.role || 'admin';
        const eventType = recipient?.event_type || 'new_booking';

        let subject = '';
        let html = '';

        if (eventType === 'new_booking') {
          subject = `🆕 New Booking - ${data?.booking_id || 'Pending'} [${role.toUpperCase()}]`;
          html = buildBookingNotificationHtml(data, role, 'New Booking Submitted');
        } else if (eventType === 'booking_confirmed') {
          subject = `✅ Booking Confirmed - ${data?.booking_id || ''} [${role.toUpperCase()}]`;
          html = buildBookingNotificationHtml(data, role, 'Booking Confirmed');
        } else if (eventType === 'booking_cancelled') {
          subject = `❌ Booking Cancelled - ${data?.booking_id || ''} [${role.toUpperCase()}]`;
          html = buildBookingNotificationHtml(data, role, 'Booking Cancelled');
        } else if (eventType === 'payment_received') {
          subject = `💰 Payment Received - ${data?.booking_id || ''} [${role.toUpperCase()}]`;
          html = buildBookingNotificationHtml(data, role, 'Payment Received');
        } else {
          subject = `📋 Booking Update - ${data?.booking_id || ''} [${role.toUpperCase()}]`;
          html = buildBookingNotificationHtml(data, role, 'Booking Update');
        }

        try {
          const result = await sendResendEmail(RESEND_API_KEY, senderEmail, recipient.email, subject, html);
          results.push({ email: recipient.email, role, success: true, id: result?.id });
        } catch (err: any) {
          results.push({ email: recipient.email, role, success: false, error: err?.message });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Multi-role notifications sent`,
        results,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== DRIVER SIGNUP NOTIFICATION =====
    if (type === 'driver_signup_notification') {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new Error("recipients array is required for driver_signup_notification");
      }

      const driverInfo = driver_data || data;
      const results: any[] = [];

      for (const recipient of recipients) {
        if (!recipient?.email) continue;
        const role = recipient?.role || 'admin';
        let subject = `🚗 New Driver Sign-up Request - ${driverInfo?.full_name || driverInfo?.fullName || 'New Driver'} [${role.toUpperCase()}]`;
        let html = buildDriverSignupHtml(driverInfo, role);

        try {
          const result = await sendResendEmail(RESEND_API_KEY, senderEmail, recipient.email, subject, html);
          results.push({ email: recipient.email, role, success: true, id: result?.id });
        } catch (err: any) {
          results.push({ email: recipient.email, role, success: false, error: err?.message });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Driver signup notifications sent`,
        results,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== PARTNER WELCOME EMAIL (sent TO the driver/partner) =====
    if (type === 'partner_welcome') {
      const partnerTo = to_email;
      if (!partnerTo) throw new Error("to_email is required for partner_welcome");
      const driverInfo = driver_data || data;
      let subject = `🤝 Welcome to GoShuttle, ${driverInfo?.full_name || driverInfo?.fullName || 'Partner'}! Your Application is Under Review`;
      let html = buildPartnerWelcomeHtml(driverInfo);
      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, partnerTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Partner welcome email sent to ${partnerTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== PARTNER BOOKING NOTIFICATION (sent TO the fleet partner) =====
    if (type === 'partner_booking_notification') {
      const partnerTo = to_email;
      if (!partnerTo) throw new Error("to_email is required for partner_booking_notification");
      const bookingInfo = booking_data || data;
      let subject = `🚐 New GoShuttle Booking Assigned - ${bookingInfo?.booking_id || 'New Booking'}`;
      let html = buildPartnerBookingHtml(bookingInfo);
      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, partnerTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Partner booking notification sent to ${partnerTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== GUEST WELCOME EMAIL (sent after guest registers during booking) =====
    if (type === 'welcome_email') {
      const welcomeTo = to_email || customer_email;
      if (!welcomeTo) throw new Error("to_email is required for welcome_email");
      const guestName = data?.guest_name || data?.customer_name || body?.guest_name || 'Valued Customer';

      // Try to load DB template first
      let subject = `🎉 Welcome to GoShuttle, ${guestName}! Your account is ready`;
      let html = buildWelcomeEmailHtml({ name: guestName, email: welcomeTo });

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'welcome_email');
        if (dbTemplate) {
          const vars = { customer_name: guestName, customer_email: welcomeTo };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      // Allow custom override from admin template editor test
      if (custom_subject) subject = renderTemplate(custom_subject, { customer_name: guestName, customer_email: welcomeTo });
      if (custom_html) html = renderTemplate(custom_html, { customer_name: guestName, customer_email: welcomeTo });

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, welcomeTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Welcome email sent to ${welcomeTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== PAYMENT RECEIPT EMAIL (sent to customer after PayMongo payment succeeds) =====
    if (type === 'payment_receipt') {
      const receiptTo = customer_email || to_email;
      if (!receiptTo) throw new Error("customer_email or to_email is required for payment_receipt");
      const bookingInfo = booking_data || data;
      let subject = `💳 Payment Receipt – Booking ${bookingInfo?.booking_id || bookingInfo?.booking_code || ''}`;
      let html = buildPaymentReceiptHtml(bookingInfo);
      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, receiptTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Payment receipt sent to ${receiptTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== REFUND NOTICE EMAIL (sent to customer after admin processes a refund) =====
    if (type === 'refund_notice') {
      const refundTo = customer_email || to_email;
      if (!refundTo) throw new Error("customer_email or to_email is required for refund_notice");
      const bookingInfo = booking_data || data;
      let subject = `↩️ Refund Processed – Booking ${bookingInfo?.booking_id || bookingInfo?.booking_code || ''}`;
      let html = buildRefundNoticeHtml(bookingInfo);
      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, refundTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Refund notice sent to ${refundTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== KYC APPROVED EMAIL (sent to driver when KYC is approved) =====
    if (type === 'kyc_approved') {
      const kycTo = to_email || customer_email;
      if (!kycTo) throw new Error("to_email is required for kyc_approved");
      const driverInfo = driver_data || data;
      let subject = `✅ KYC Approved – Welcome to GoShuttle, ${driverInfo?.full_name || driverInfo?.driver_name || 'Driver'}!`;
      let html = buildKycApprovedHtml(driverInfo);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'kyc_approved');
        if (dbTemplate) {
          const vars = {
            driver_name: driverInfo?.full_name || driverInfo?.driver_name || 'Driver',
            driver_email: kycTo,
            license_number: driverInfo?.license_number || 'N/A',
            fleet_type: driverInfo?.fleet_type || 'N/A',
            approved_date: new Date().toLocaleDateString('en-PH'),
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, kycTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `KYC approval email sent to ${kycTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== KYC REJECTED EMAIL (sent to driver when KYC is rejected) =====
    if (type === 'kyc_rejected') {
      const kycTo = to_email || customer_email;
      if (!kycTo) throw new Error("to_email is required for kyc_rejected");
      const driverInfo = driver_data || data;
      let subject = `❌ KYC Application Update – Action Required`;
      let html = buildKycRejectedHtml(driverInfo);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'kyc_rejected');
        if (dbTemplate) {
          const vars = {
            driver_name: driverInfo?.full_name || driverInfo?.driver_name || 'Driver',
            driver_email: kycTo,
            rejection_reason: driverInfo?.rejection_reason || 'Documents could not be verified',
            rejected_date: new Date().toLocaleDateString('en-PH'),
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, kycTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `KYC rejection email sent to ${kycTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== TRIP ASSIGNED EMAIL (sent to customer when driver is assigned) =====
    if (type === 'trip_assigned') {
      const tripTo = customer_email || to_email;
      if (!tripTo) throw new Error("customer_email is required for trip_assigned");
      const bookingInfo = booking_data || data;
      let subject = `🚐 Driver Assigned – Booking ${bookingInfo?.booking_id || ''}`;
      let html = buildTripAssignedHtml(bookingInfo);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'trip_assigned');
        if (dbTemplate) {
          const vars = {
            customer_name: bookingInfo?.customer_name || bookingInfo?.guest_name || 'Customer',
            booking_id: bookingInfo?.booking_id || 'N/A',
            driver_name: bookingInfo?.driver_name || 'Your Driver',
            driver_phone: bookingInfo?.driver_phone || 'N/A',
            vehicle_name: bookingInfo?.vehicle_name || 'N/A',
            vehicle_plate: bookingInfo?.vehicle_plate || 'N/A',
            pickup_location: bookingInfo?.pickup_location || 'N/A',
            pickup_date: bookingInfo?.pickup_date || 'N/A',
            pickup_time: bookingInfo?.pickup_time || 'N/A',
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, tripTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Trip assigned email sent to ${tripTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== TRIP STARTED EMAIL (sent to customer when trip begins) =====
    if (type === 'trip_started') {
      const tripTo = customer_email || to_email;
      if (!tripTo) throw new Error("customer_email is required for trip_started");
      const bookingInfo = booking_data || data;
      let subject = `🚀 Your Trip Has Started – Booking ${bookingInfo?.booking_id || ''}`;
      let html = buildTripStartedHtml(bookingInfo);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'trip_started');
        if (dbTemplate) {
          const vars = {
            customer_name: bookingInfo?.customer_name || bookingInfo?.guest_name || 'Customer',
            booking_id: bookingInfo?.booking_id || 'N/A',
            driver_name: bookingInfo?.driver_name || 'Your Driver',
            pickup_location: bookingInfo?.pickup_location || 'N/A',
            dropoff_location: bookingInfo?.dropoff_location || 'N/A',
            started_at: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, tripTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Trip started email sent to ${tripTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== TRIP COMPLETED EMAIL (sent to customer when trip ends) =====
    if (type === 'trip_completed') {
      const tripTo = customer_email || to_email;
      if (!tripTo) throw new Error("customer_email is required for trip_completed");
      const bookingInfo = booking_data || data;
      let subject = `✅ Trip Completed – Thank You for Riding with GoShuttle!`;
      let html = buildTripCompletedHtml(bookingInfo);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'trip_completed');
        if (dbTemplate) {
          const vars = {
            customer_name: bookingInfo?.customer_name || bookingInfo?.guest_name || 'Customer',
            booking_id: bookingInfo?.booking_id || 'N/A',
            pickup_location: bookingInfo?.pickup_location || 'N/A',
            dropoff_location: bookingInfo?.dropoff_location || 'N/A',
            total_cost: bookingInfo?.total_cost || '0.00',
            completed_at: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, tripTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Trip completed email sent to ${tripTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== ACCOUNT PASSWORD RESET EMAIL =====
    if (type === 'account_password_reset') {
      const acctTo = to_email || customer_email;
      if (!acctTo) throw new Error("to_email is required for account_password_reset");
      const userData = data || {};
      let subject = `🔐 Password Reset Request – GoShuttle`;
      let html = buildPasswordResetHtml(userData);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'account_password_reset');
        if (dbTemplate) {
          const vars = {
            customer_name: userData?.customer_name || userData?.full_name || 'User',
            reset_url: userData?.reset_url || 'https://goshuttle.ph/auth/reset-password',
            requested_at: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, acctTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Password reset email sent to ${acctTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== ACCOUNT DEACTIVATED EMAIL =====
    if (type === 'account_deactivated') {
      const acctTo = to_email || customer_email;
      if (!acctTo) throw new Error("to_email is required for account_deactivated");
      const userData = data || {};
      let subject = `⚠️ Your GoShuttle Account Has Been Deactivated`;
      let html = buildAccountDeactivatedHtml(userData);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'account_deactivated');
        if (dbTemplate) {
          const vars = {
            customer_name: userData?.customer_name || userData?.full_name || 'User',
            deactivation_reason: userData?.deactivation_reason || 'Administrative action',
            deactivated_at: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, acctTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Account deactivated email sent to ${acctTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== ACCOUNT PROFILE UPDATED EMAIL =====
    if (type === 'account_profile_updated') {
      const acctTo = to_email || customer_email;
      if (!acctTo) throw new Error("to_email is required for account_profile_updated");
      const userData = data || {};
      let subject = `📝 Your GoShuttle Profile Has Been Updated`;
      let html = buildProfileUpdatedHtml(userData);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const dbTemplate = await loadEmailTemplate(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 'account_profile_updated');
        if (dbTemplate) {
          const vars = {
            customer_name: userData?.customer_name || userData?.full_name || 'User',
            updated_fields: userData?.updated_fields || 'Profile information',
            updated_at: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          };
          subject = renderTemplate(dbTemplate.subject, vars);
          html = renderTemplate(dbTemplate.html_body, vars);
        }
      }

      let emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, acctTo, subject, html);
      return new Response(JSON.stringify({
        success: true,
        message: `Profile updated email sent to ${acctTo}`,
        email_id: emailResult?.id,
        type
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ===== EXISTING TYPES =====
    let subject = '';
    let htmlContent = '';
    let recipientEmail = '';

    if (type === 'test_email') {
      if (!to_email) throw new Error("To email address is required");
      recipientEmail = to_email;
      subject = `🧪 Test Email - GoShuttle Pro Configuration Test`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1f2937; margin-bottom: 10px;">🚀 Test Email Successful!</h1>
              <p style="color: #6b7280; font-size: 16px;">Your GoShuttle Pro email configuration is working perfectly</p>
            </div>
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-bottom: 15px;">📧 Email Configuration Test Results</h3>
              <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li><strong>Recipient:</strong> ${to_email}</li>
                <li><strong>Sender:</strong> ${senderEmail}</li>
                <li><strong>Admin Name:</strong> ${admin_name || 'GoShuttle Admin'}</li>
                <li><strong>Test Time:</strong> ${new Date()?.toLocaleString()}</li>
                <li><strong>Status:</strong> ✅ Email delivery successful</li>
              </ul>
            </div>
            ${data ? `
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #0369a1; margin-bottom: 15px;">🎯 Sample Booking Data (Test)</h3>
              <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li><strong>Booking ID:</strong> ${data?.booking_id}</li>
                <li><strong>Customer:</strong> ${data?.customer_name}</li>
                <li><strong>Route:</strong> ${data?.route}</li>
                <li><strong>Pickup Time:</strong> ${data?.pickup_time}</li>
                <li><strong>Vehicle:</strong> ${data?.vehicle_type}</li>
              </ul>
            </div>
            ` : ''}
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #22c55e;">
              <h3 style="color: #15803d; margin-bottom: 10px;">✅ What This Means</h3>
              <p style="color: #374151; line-height: 1.6; margin: 0;">Your email notification system is properly configured and ready to send booking confirmations, alerts, and receipts.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Powered by <strong>GoShuttle Pro</strong> Email System</p>
            </div>
          </div>
        </div>
      `;

    } else if (type === 'admin_notification') {
      const adminTo = admin_email || to_email;
      if (!adminTo) throw new Error("Admin email address is required");
      recipientEmail = adminTo;
      subject = `🆕 New Booking Request - ${data?.booking_id || 'Pending'}`;
      htmlContent = buildBookingNotificationHtml(data, 'admin', 'New Booking Request');

    } else if (type === 'customer_confirmation' || type === 'guest_booking_confirmation') {
      const customerTo = customer_email || to_email;
      if (!customerTo) throw new Error("Customer email address is required");
      recipientEmail = customerTo;
      const displayCode = data?.booking_code || data?.booking_id || 'GoShuttle Pro';
      subject = `✅ Booking Confirmed & Invoice – ${displayCode}`;
      const confirmUrl = data?.confirm_url || `https://goshuttle.ph/booking-lookup?code=${data?.booking_code || data?.booking_id || ''}&action=confirm`;
      const invoiceNumber = `INV-${data?.booking_code || data?.booking_id || Date.now()}`;
      const issuedDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
      const totalCostNum = parseFloat(data?.total_cost || 0);
      const formattedTotal = totalCostNum.toLocaleString('en-PH', { minimumFractionDigits: 2 });
      const paymentStatus = data?.payment_status || data?.status || 'Pending';
      const isPaid = String(paymentStatus).toLowerCase() === 'paid' || String(paymentStatus).toLowerCase() === 'confirmed';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
          <div style="background-color: white; padding: 32px; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="text-align: center; margin-bottom: 28px;">
              <h1 style="color: #059669; margin: 0 0 6px 0; font-size: 26px;">✅ Booking Confirmed!</h1>
              <p style="color: #6b7280; font-size: 15px; margin: 0;">Thank you for choosing GoShuttle Pro</p>
            </div>

            <p style="color: #374151; font-size: 15px; margin-bottom: 6px;">Dear <strong>${data?.customer_name || data?.guest_name || 'Valued Customer'}</strong>,</p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">Your booking has been successfully received and confirmed. Please find your booking confirmation and invoice/receipt below.</p>

            <!-- Booking Code Banner -->
            ${data?.booking_code ? `
            <div style="background-color: #eff6ff; border: 2px solid #3b82f6; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
              <p style="color: #1e40af; font-size: 12px; font-weight: 700; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.08em;">Booking Confirmation ID</p>
              <p style="color: #1e3a8a; font-size: 30px; font-weight: 800; font-family: monospace; letter-spacing: 0.12em; margin: 0;">${data?.booking_code}</p>
              <p style="color: #3b82f6; font-size: 12px; margin: 8px 0 0 0;">Save this code to track or modify your booking</p>
            </div>
            ` : ''}

            <!-- Booking Details -->
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin-bottom: 24px;">
              <h3 style="color: #15803d; margin: 0 0 14px 0; font-size: 15px;">📋 Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${data?.booking_code ? `<tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking Code:</td><td style="padding: 8px 0; color: #1e40af; font-weight: 700; font-family: monospace; font-size: 15px;">${data?.booking_code}</td></tr>` : ''}
                <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Reference ID:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.booking_id || 'N/A'}</td></tr>
                <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Route:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.pickup_location || 'N/A'} → ${data?.dropoff_location || 'N/A'}</td></tr>
                <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.vehicle_name || data?.vehicle_type || 'N/A'}</td></tr>
                <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Passengers:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.passenger_count || 'N/A'}</td></tr>
                <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Pickup Date:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.pickup_date || 'N/A'}</td></tr>
                <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Pickup Time:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.pickup_time || 'N/A'}</td></tr>
                ${data?.return_date ? `<tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Return Date:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.return_date} ${data?.return_time ? 'at ' + data?.return_time : ''}</td></tr>` : ''}
                <tr><td style="padding: 8px 0; font-weight: 700; color: #374151; font-size: 14px;">Total Cost:</td><td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 18px;">₱${formattedTotal}</td></tr>
              </table>
            </div>

            ${data?.special_requirements ? `<div style="background-color: #fef3c7; padding: 14px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 24px;"><h4 style="color: #92400e; margin: 0 0 6px 0; font-size: 13px;">📝 Special Requirements</h4><p style="color: #92400e; margin: 0; font-size: 13px;">${data?.special_requirements}</p></div>` : ''}

            <!-- ===== INVOICE & RECEIPT ===== -->
            <div style="border: 2px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
              <!-- Invoice Header -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 18px 22px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h2 style="color: #ffffff; margin: 0 0 4px 0; font-size: 18px; font-weight: 800; letter-spacing: 0.03em;">🧾 INVOICE & RECEIPT</h2>
                  <p style="color: #a7f3d0; margin: 0; font-size: 12px;">GoShuttle Pro – Official Document</p>
                </div>
                <div style="text-align: right;">
                  <p style="color: #ffffff; font-size: 13px; font-weight: 700; margin: 0 0 2px 0;">${invoiceNumber}</p>
                  <p style="color: #a7f3d0; font-size: 11px; margin: 0;">Issued: ${issuedDate}</p>
                </div>
              </div>

              <!-- Invoice Body -->
              <div style="padding: 20px 22px; background-color: #ffffff;">

                <!-- Billed To / Booking Ref -->
                <div style="display: flex; gap: 20px; margin-bottom: 18px;">
                  <div style="flex: 1; background-color: #f9fafb; padding: 14px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px 0;">Billed To</p>
                    <p style="color: #111827; font-size: 14px; font-weight: 700; margin: 0 0 2px 0;">${data?.customer_name || data?.guest_name || 'Valued Customer'}</p>
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">${data?.customer_email || data?.guest_email || ''}</p>
                    ${data?.customer_phone || data?.phone ? `<p style="color: #6b7280; font-size: 12px; margin: 2px 0 0 0;">${data?.customer_phone || data?.phone}</p>` : ''}
                  </div>
                  <div style="flex: 1; background-color: #f9fafb; padding: 14px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px 0;">Booking Reference</p>
                    <p style="color: #1e40af; font-size: 16px; font-weight: 800; font-family: monospace; margin: 0 0 2px 0;">${data?.booking_code || data?.booking_id || 'N/A'}</p>
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">Invoice No: ${invoiceNumber}</p>
                    <p style="color: #6b7280; font-size: 12px; margin: 2px 0 0 0;">Date: ${issuedDate}</p>
                  </div>
                </div>

                <!-- Line Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
                  <thead>
                    <tr style="background-color: #f3f4f6;">
                      <th style="padding: 10px 12px; text-align: left; color: #374151; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Description</th>
                      <th style="padding: 10px 12px; text-align: right; color: #374151; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 10px 12px; color: #374151;">
                        <strong>${data?.vehicle_name || data?.vehicle_type || 'Transportation Service'}</strong><br>
                        <span style="color: #9ca3af; font-size: 12px;">${data?.pickup_location || 'N/A'} → ${data?.dropoff_location || 'N/A'}</span><br>
                        <span style="color: #9ca3af; font-size: 12px;">${data?.pickup_date || ''} ${data?.pickup_time ? 'at ' + data?.pickup_time : ''} · ${data?.passenger_count || 'N/A'} passenger(s)</span>
                      </td>
                      <td style="padding: 10px 12px; text-align: right; color: #374151; font-weight: 600; vertical-align: top;">₱${formattedTotal}</td>
                    </tr>
                    ${data?.return_date ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 10px 12px; color: #374151;">
                        <strong>Return Trip</strong><br>
                        <span style="color: #9ca3af; font-size: 12px;">${data?.dropoff_location || 'N/A'} → ${data?.pickup_location || 'N/A'}</span><br>
                        <span style="color: #9ca3af; font-size: 12px;">${data?.return_date} ${data?.return_time ? 'at ' + data?.return_time : ''}</span>
                      </td>
                      <td style="padding: 10px 12px; text-align: right; color: #374151; font-weight: 600; vertical-align: top;">Included</td>
                    </tr>
                    ` : ''}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f0fdf4; border-top: 2px solid #22c55e;">
                      <td style="padding: 12px; font-weight: 800; color: #15803d; font-size: 15px;">TOTAL AMOUNT</td>
                      <td style="padding: 12px; text-align: right; font-weight: 800; color: #15803d; font-size: 18px;">₱${formattedTotal}</td>
                    </tr>
                  </tfoot>
                </table>

                <!-- Payment Status -->
                <div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 6px; background-color: ${isPaid ? '#f0fdf4' : '#fef3c7'}; border: 1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}; margin-bottom: 16px;">
                  <span style="font-size: 18px;">${isPaid ? '✅' : '⏳'}</span>
                  <div>
                    <p style="margin: 0; font-size: 13px; font-weight: 700; color: ${isPaid ? '#15803d' : '#92400e'};">Payment Status: ${isPaid ? 'PAID' : String(paymentStatus).toUpperCase()}</p>
                    ${isPaid ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #16a34a;">Payment received on ${issuedDate}</p>` : `<p style="margin: 2px 0 0 0; font-size: 12px; color: #b45309;">Payment will be collected upon service</p>`}
                  </div>
                </div>

                <!-- Footer Note -->
                <p style="color: #9ca3af; font-size: 11px; margin: 0; line-height: 1.6; border-top: 1px solid #f3f4f6; padding-top: 12px;">
                  This is an official invoice and receipt from GoShuttle Pro. Please retain this document for your records. 
                  Booking Confirmation ID: <strong style="color: #374151;">${data?.booking_code || data?.booking_id || 'N/A'}</strong> · Invoice: <strong style="color: #374151;">${invoiceNumber}</strong>
                </p>
              </div>
            </div>
            <!-- ===== END INVOICE & RECEIPT ===== -->

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <p style="color: #374151; font-size: 14px; margin-bottom: 12px;">View or track your booking anytime:</p>
              <a href="${confirmUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.02em;">
                📋 View My Booking
              </a>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">Or copy this link: <a href="${confirmUrl}" style="color: #059669;">${confirmUrl}</a></p>
            </div>

            <!-- Support -->
            <div style="background-color: #e0f2fe; padding: 18px; border-radius: 6px; margin-bottom: 20px;">
              <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
              <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>${data?.company_contact?.support_email || 'support@goshuttle.ph'}</strong> or call <strong>${data?.company_contact?.support_phone || data?.company_contact?.hotline_phone || '+63 2 8123 4567'}</strong></p>
            </div>

            <p style="color: #6b7280; text-align: center; font-size: 13px; margin-bottom: 0;">Thank you for choosing GoShuttle Pro for your transportation needs!</p>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
            </div>
          </div>
        </div>
      `;

    } else if (type === 'booking_cancellation') {
      recipientEmail = customer_email || to_email;
      if (!recipientEmail) throw new Error("customer_email or to_email is required for booking_cancellation");
      const bookingInfo = booking_data || data;
      subject = `❌ Booking Cancelled – #${bookingInfo?.booking_code || bookingInfo?.booking_id || ''}`;
      htmlContent = buildBookingCancellationHtml(bookingInfo);

    // ===== DRIVER SIGNUP CONFIRMATION =====
    } else if (type === 'driver_signup_confirmation') {
      const driverTo = to_email;
      if (!driverTo) throw new Error("to_email is required for driver_signup_confirmation");
      const driverInfo = driver_data || data || {};
      subject = `🚗 Welcome to GoShuttle, ${driverInfo?.full_name || 'Driver'}! Your application has been received`;
      htmlContent = buildDriverSignupConfirmationHtml(driverInfo);

    // ===== DRIVER PENDING APPROVAL =====
    } else if (type === 'driver_pending_approval') {
      const driverTo = to_email;
      if (!driverTo) throw new Error("to_email is required for driver_pending_approval");
      const driverInfo = driver_data || data || {};
      subject = `⏳ Your GoShuttle Driver Application is Under Review`;
      htmlContent = buildDriverPendingApprovalHtml(driverInfo);

    // ===== DRIVER DOC UPLOAD REQUEST =====
    } else if (type === 'driver_doc_upload_request') {
      const driverTo = to_email;
      if (!driverTo) throw new Error("to_email is required for driver_doc_upload_request");
      const driverInfo = driver_data || data || {};
      subject = `📄 Action Required: Upload Your Documents – GoShuttle Driver Application`;
      htmlContent = buildDriverDocUploadRequestHtml(driverInfo);

    } else {
      throw new Error(`Unsupported email type: ${type}. Supported types: test_email, admin_notification, customer_confirmation, guest_booking_confirmation, multi_role_notification, driver_signup_notification, payment_receipt, refund_notice, kyc_approved, kyc_rejected, trip_assigned, trip_started, trip_completed, account_password_reset, account_deactivated, account_profile_updated, booking_cancellation, driver_signup_confirmation, driver_pending_approval, driver_doc_upload_request`);
    }

    // Send single email via Resend API
    // Wrap in try/catch to return 200 with error details instead of 500
    let emailResult: any;
    try {
      emailResult = await sendResendEmail(RESEND_API_KEY, senderEmail, recipientEmail, subject, htmlContent);
    } catch (sendErr: any) {
      console.error('Resend API error:', sendErr?.message);
      return new Response(JSON.stringify({
        success: false,
        error: sendErr?.message || 'Failed to send email via Resend API',
        details: 'Check that RESEND_API_KEY is valid and the recipient email is allowed by your Resend account'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    console.log('✅ Email sent successfully via Resend:', emailResult);

    return new Response(JSON.stringify({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`,
      email_id: emailResult.id,
      recipient: recipientEmail,
      sender: senderEmail,
      type: type
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error: any) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'Check your email configuration and ensure RESEND_API_KEY is set in Supabase environment variables'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});

// ===== HTML BUILDERS =====

function buildCustomerConfirmationHtml(data: any, confirmUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #059669; margin-bottom: 10px;">✅ Booking Confirmed!</h1>
          <p style="color: #6b7280; font-size: 16px;">Thank you for choosing GoShuttle Pro</p>
        </div>
        <p style="color: #374151;">Dear ${data?.customer_name || data?.guest_name || 'Valued Customer'},</p>
        <p style="color: #6b7280; line-height: 1.6;">Your booking has been successfully received. Here are your booking details:</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #22c55e; margin-bottom: 20px;">
          <h3 style="color: #15803d; margin-bottom: 15px;">📋 Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280;">${data?.booking_id || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_location || 'N/A'} → ${data?.dropoff_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280;">${data?.vehicle_name || data?.vehicle_type || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Passengers:</td><td style="padding: 8px 0; color: #6b7280;">${data?.passenger_count || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Date:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_date || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Time:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_time || 'N/A'}</td></tr>
            ${data?.return_date ? `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Return Date:</td><td style="padding: 8px 0; color: #6b7280;">${data?.return_date} ${data?.return_time ? 'at ' + data?.return_time : ''}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Cost:</td><td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">₱${data?.total_cost || 'N/A'}</td></tr>
          </table>
        </div>
        ${data?.special_requirements ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;"><h4 style="color: #92400e; margin: 0 0 8px 0;">📝 Special Requirements</h4><p style="color: #92400e; margin: 0;">${data?.special_requirements}</p></div>` : ''}
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="color: #374151; font-size: 14px; margin-bottom: 12px;">Please confirm your booking by clicking the button below:</p>
          <a href="${confirmUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.02em;">
            ✅ Confirm My Booking
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">Or copy this link: <a href="${confirmUrl}" style="color: #059669;">${confirmUrl}</a></p>
        </div>
        <div style="background-color: #e0f2fe; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 8px 0;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0;">Contact us at <strong>${data?.company_contact?.support_email || 'support@goshuttle.ph'}</strong> or call <strong>${data?.company_contact?.support_phone || data?.company_contact?.hotline_phone || '+63 2 8123 4567'}</strong></p>
        </div>
        <p style="color: #6b7280; text-align: center; margin-bottom: 0;">Thank you for choosing GoShuttle Pro for your transportation needs!</p>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildBookingNotificationHtml(data: any, role: string, eventTitle: string): string {
  const roleColors: Record<string, string> = {
    superadmin: '#7c3aed',
    admin: '#1d4ed8',
    corporate: '#059669',
    partner: '#d97706',
  };
  const color = roleColors[role] || '#1d4ed8';
  const roleBadge = role.charAt(0).toUpperCase() + role.slice(1);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: ${color}15; color: ${color}; border: 1px solid ${color}30; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; margin-bottom: 10px;">${roleBadge} Notification</span>
          <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px;">${eventTitle}</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">GoShuttle Pro Booking System</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid ${color}; margin-bottom: 20px;">
          <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 15px;">📋 Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Booking ID:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${data?.booking_id || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Customer:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${data?.customer_name || data?.guest_name || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Email:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${data?.customer_email || data?.guest_email || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Route:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${data?.pickup_location || 'N/A'} → ${data?.dropoff_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Vehicle:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${data?.vehicle_name || data?.vehicle_type || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Pickup Date:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${data?.pickup_date || 'N/A'} ${data?.pickup_time ? 'at ' + data?.pickup_time : ''}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Passengers:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${data?.passenger_count || 'N/A'}</td></tr>
            <tr><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Total Cost:</td><td style="padding: 7px 0; color: #059669; font-weight: bold; font-size: 15px;">₱${data?.total_cost || 'N/A'}</td></tr>
          </table>
        </div>
        ${data?.special_requirements ? `<div style="background-color: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 16px;"><p style="color: #92400e; margin: 0; font-size: 13px;"><strong>⚠️ Special Requirements:</strong> ${data?.special_requirements}</p></div>` : ''}
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
          <p style="color: #374151; margin: 0; font-size: 13px;"><strong>⚡ Action Required:</strong> Please log in to the admin dashboard to review and manage this booking.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro Admin Notification System • ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  `;
}

function buildDriverSignupHtml(driver: any, role: string): string {
  const roleColors: Record<string, string> = {
    superadmin: '#7c3aed',
    admin: '#1d4ed8',
    corporate: '#059669',
    partner: '#d97706',
  };
  const color = roleColors[role] || '#1d4ed8';
  const roleBadge = role.charAt(0).toUpperCase() + role.slice(1);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: ${color}15; color: ${color}; border: 1px solid ${color}30; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; margin-bottom: 10px;">${roleBadge} Notification</span>
          <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px;">🚗 New Driver Sign-up Request</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">A new driver has submitted a sign-up request</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid ${color}; margin-bottom: 20px;">
          <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 15px;">👤 Driver Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Full Name:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.full_name || driver?.fullName || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Email:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.email || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Phone:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.phone || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">License Number:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.license_number || driver?.licenseNumber || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">License Expiry:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.license_expiry || driver?.licenseExpiry || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Fleet Type:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.fleet_type || driver?.fleetType || 'N/A'}</td></tr>
            <tr><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Partner:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.partner_name || driver?.partnerName || 'GoShuttle Main Fleet'}</td></tr>
          </table>
        </div>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
          <p style="color: #374151; margin: 0; font-size: 13px;"><strong>⚡ Action Required:</strong> Please log in to the Driver Assignment System to review and approve this driver sign-up request.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro Driver Management System • ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  `;
}

function buildPartnerWelcomeHtml(driver: any): string {
  const color = '#d97706';
  const roleBadge = 'Partner';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: ${color}15; color: ${color}; border: 1px solid ${color}30; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; margin-bottom: 10px;">${roleBadge} Welcome</span>
          <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px;">Welcome to GoShuttle!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your application is under review. We will notify you once it has been approved.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid ${color}; margin-bottom: 20px;">
          <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 15px;">👤 Driver Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Full Name:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.full_name || driver?.fullName || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Email:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.email || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Phone:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.phone || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">License Number:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.license_number || driver?.licenseNumber || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">License Expiry:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.license_expiry || driver?.licenseExpiry || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Fleet Type:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.fleet_type || driver?.fleetType || 'N/A'}</td></tr>
            <tr><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Partner:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${driver?.partner_name || driver?.partnerName || 'GoShuttle Main Fleet'}</td></tr>
          </table>
        </div>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
          <p style="color: #374151; margin: 0; font-size: 13px;"><strong>⚡ Action Required:</strong> Please log in to the Driver Assignment System to review and approve this driver sign-up request.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro Driver Management System • ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  `;
}

function buildPartnerBookingHtml(booking: any): string {
  const color = '#d97706';
  const roleBadge = 'Partner';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: ${color}15; color: ${color}; border: 1px solid ${color}30; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; margin-bottom: 10px;">${roleBadge} Booking Notification</span>
          <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px;">New Booking Assigned</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">You have been assigned a new booking. Please review the details below.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid ${color}; margin-bottom: 20px;">
          <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 15px;">📋 Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Booking ID:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.booking_id || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Customer:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.customer_name || booking?.guest_name || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Email:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.customer_email || booking?.guest_email || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Route:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_location || 'N/A'} → ${booking?.dropoff_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Vehicle:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.vehicle_name || booking?.vehicle_type || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Pickup Date:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_date || 'N/A'} ${booking?.pickup_time ? 'at ' + booking?.pickup_time : ''}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Passengers:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.passenger_count || 'N/A'}</td></tr>
            <tr><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Total Cost:</td><td style="padding: 7px 0; color: #059669; font-weight: bold; font-size: 15px;">₱${booking?.total_cost || 'N/A'}</td></tr>
          </table>
        </div>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
          <p style="color: #374151; margin: 0; font-size: 13px;"><strong>⚡ Action Required:</strong> Please log in to the admin dashboard to review and manage this booking.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro Admin Notification System • ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  `;
}

function buildWelcomeEmailHtml(user: { name: string; email: string }): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #059669; margin: 0 0 8px 0; font-size: 26px;">🎉 Welcome to GoShuttle!</h1>
          <p style="color: #6b7280; font-size: 15px; margin: 0;">Your account has been created successfully</p>
        </div>
        <p style="color: #374151; font-size: 15px;">Hi <strong>${user?.name || 'Valued Customer'}</strong>,</p>
        <p style="color: #6b7280; line-height: 1.7;">Thank you for creating a GoShuttle account! You can now track your bookings, earn loyalty points, and enjoy a faster booking experience.</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #22c55e; margin: 20px 0;">
          <h3 style="color: #15803d; margin: 0 0 12px 0; font-size: 15px;">✅ What you can do now</h3>
          <ul style="color: #374151; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Track all your bookings in one place</li>
            <li>Earn loyalty points on every ride</li>
            <li>Save favorite routes for quick rebooking</li>
            <li>Manage your profile and preferences</li>
          </ul>
        </div>
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
          <p style="color: #1e40af; margin: 0; font-size: 13px;"><strong>📧 Verify your email:</strong> Please check your inbox for a verification link to activate all account features.</p>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 8px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <p style="color: #6b7280; text-align: center; font-size: 14px; margin-bottom: 0;">Thank you for choosing GoShuttle for your transportation needs!</p>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

// ===== NEW HTML BUILDERS =====

function buildKycApprovedHtml(driver: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #f0fdf4; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">✅</span>
          </div>
          <h1 style="color: #059669; margin: 0 0 6px 0; font-size: 24px;">KYC Approved!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your identity verification has been successfully completed.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${driver?.full_name || driver?.driver_name || 'Driver'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Congratulations! Your KYC (Know Your Customer) verification has been <strong style="color: #059669;">approved</strong>. You are now fully verified and can start accepting trips on the GoShuttle platform.
        </p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <h3 style="color: #15803d; margin: 0 0 14px 0; font-size: 15px;">📋 Verification Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Driver Name:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${driver?.full_name || driver?.driver_name || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">License Number:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${driver?.license_number || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Fleet Type:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${driver?.fleet_type || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Approved On:</td><td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 13px;">${new Date().toLocaleDateString('en-PH')}</td></tr>
          </table>
        </div>
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
          <h4 style="color: #1e40af; margin: 0 0 8px 0; font-size: 14px;">🚀 What's Next?</h4>
          <ul style="color: #1e40af; margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8;">
            <li>Log in to the GoShuttle Driver Portal</li>
            <li>Complete your vehicle profile if not done</li>
            <li>Start accepting trip assignments</li>
          </ul>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>drivers@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Driver Management System</p>
        </div>
      </div>
    </div>
  `;
}

function buildKycRejectedHtml(driver: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #fef2f2; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">❌</span>
          </div>
          <h1 style="color: #dc2626; margin: 0 0 6px 0; font-size: 24px;">KYC Application Update</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Action required to complete your verification.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${driver?.full_name || driver?.driver_name || 'Driver'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          We were unable to approve your KYC application at this time. Please review the reason below and resubmit the required documents.
        </p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 20px;">
          <h3 style="color: #991b1b; margin: 0 0 12px 0; font-size: 15px;">⚠️ Rejection Reason</h3>
          <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">${driver?.rejection_reason || 'The submitted documents could not be verified. Please ensure all documents are clear, valid, and unexpired.'}</p>
        </div>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
          <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">📋 What to Do Next</h4>
          <ol style="color: #92400e; margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8;">
            <li>Review the rejection reason above</li>
            <li>Prepare clear, valid copies of your documents</li>
            <li>Log in to the Driver Portal and resubmit your application</li>
            <li>Our team will review your resubmission within 2–3 business days</li>
          </ol>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>drivers@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Driver Management System</p>
        </div>
      </div>
    </div>
  `;
}

function buildTripAssignedHtml(booking: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #eff6ff; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">🚐</span>
          </div>
          <h1 style="color: #1d4ed8; margin: 0 0 6px 0; font-size: 24px;">Driver Assigned!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your driver has been assigned for your upcoming trip.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${booking?.customer_name || booking?.guest_name || 'Customer'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Great news! A driver has been assigned to your booking. Here are your driver and trip details.
        </p>
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin-bottom: 20px;">
          <h3 style="color: #1e40af; margin: 0 0 14px 0; font-size: 15px;">👤 Your Driver</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Driver Name:</td><td style="padding: 8px 0; color: #1e40af; font-weight: 700; font-size: 13px;">${booking?.driver_name || 'Your Driver'}</td></tr>
            <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Contact Number:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.driver_phone || 'Will be provided on pickup day'}</td></tr>
            <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.vehicle_name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Plate Number:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.vehicle_plate || 'N/A'}</td></tr>
          </table>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #1d4ed8; margin-bottom: 20px;">
          <h3 style="color: #1e293b; margin: 0 0 14px 0; font-size: 15px;">📋 Trip Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.booking_id || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px;">Pickup:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px;">Drop-off:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.dropoff_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px;">Date:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_date || 'N/A'}</td></tr>
            <tr><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px;">Time:</td><td style="padding: 7px 0; color: #1d4ed8; font-weight: 700; font-size: 13px;">${booking?.pickup_time || 'N/A'}</td></tr>
          </table>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildBookingCancellationHtml(booking: any): string {
  const refundEligible = booking?.refund_eligible === true || booking?.refund_eligible === 'true';
  const refundAmount = parseFloat(booking?.refund_amount || 0);
  const cancellationFee = parseFloat(booking?.cancellation_fee || 0);
  const totalCost = parseFloat(booking?.total_cost || 0);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #fef2f2; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">❌</span>
          </div>
          <h1 style="color: #dc2626; margin: 0 0 6px 0; font-size: 24px;">Booking Cancelled</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your booking has been successfully cancelled.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${booking?.customer_name || booking?.guest_name || 'Valued Customer'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          We have processed your cancellation request. Below are the details of your cancelled booking.
        </p>
        <div style="background-color: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
          <p style="color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Cancelled Booking Code</p>
          <p style="color: #dc2626; font-size: 28px; font-weight: 800; letter-spacing: 3px; margin: 0;">#${booking?.booking_code || booking?.booking_id || 'N/A'}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
          <h3 style="color: #374151; margin: 0 0 14px 0; font-size: 15px;">🗓️ Trip Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Pickup Location:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Drop-off Location:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.dropoff_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Pickup Date:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_date || 'N/A'} ${booking?.pickup_time ? 'at ' + booking.pickup_time : ''}</td></tr>
            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Cancellation Reason:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.cancellation_reason || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Cancelled At:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.cancelled_at || new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td></tr>
          </table>
        </div>
        <div style="background-color: ${refundEligible ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; border: 1px solid ${refundEligible ? '#bbf7d0' : '#fca5a5'}; margin-bottom: 20px;">
          <h3 style="color: ${refundEligible ? '#15803d' : '#dc2626'}; margin: 0 0 14px 0; font-size: 15px;">${refundEligible ? '💰 Refund Information' : '⚠️ No Refund Applicable'}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid ${refundEligible ? '#bbf7d0' : '#fca5a5'};"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 55%;">Original Booking Amount:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">₱${totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
            <tr style="border-bottom: 1px solid ${refundEligible ? '#bbf7d0' : '#fca5a5'};"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Cancellation Fee:</td><td style="padding: 8px 0; color: #dc2626; font-size: 13px;">₱${cancellationFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
            <tr style="border-bottom: 1px solid ${refundEligible ? '#bbf7d0' : '#fca5a5'};"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Policy Applied:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.cancellation_policy || 'Standard policy'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700; color: #374151; font-size: 15px;">Refund Amount:</td><td style="padding: 8px 0; color: ${refundEligible ? '#15803d' : '#dc2626'}; font-weight: 800; font-size: 18px;">₱${refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
          </table>
          ${refundEligible ? `<p style="color: #15803d; font-size: 12px; margin: 12px 0 0 0;">✅ Your refund of <strong>₱${refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> will be processed within 5–7 business days.</p>` : `<p style="color: #dc2626; font-size: 12px; margin: 12px 0 0 0;">Based on our cancellation policy, no refund is applicable for this cancellation.</p>`}
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <p style="color: #6b7280; text-align: center; font-size: 13px; margin-bottom: 0;">Thank you for choosing GoShuttle. We hope to serve you again soon.</p>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildTripStartedHtml(booking: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">🚀</span>
          </div>
          <h1 style="color: #d97706; margin: 0 0 6px 0; font-size: 24px;">Your Trip Has Started!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">You are now on your way to your destination.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${booking?.customer_name || booking?.guest_name || 'Customer'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Your GoShuttle trip is now underway. Sit back, relax, and enjoy the ride!
        </p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 20px;">
          <h3 style="color: #92400e; margin: 0 0 14px 0; font-size: 15px;">🗺️ Trip in Progress</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.booking_id || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Driver:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.driver_name || 'Your Driver'}</td></tr>
            <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">From:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">To:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.dropoff_location || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Started At:</td><td style="padding: 8px 0; color: #d97706; font-weight: 700; font-size: 13px;">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td></tr>
          </table>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Emergency Contact</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">If you need assistance during your trip, call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildTripCompletedHtml(booking: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #f0fdf4; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">🏁</span>
          </div>
          <h1 style="color: #059669; margin: 0 0 6px 0; font-size: 24px;">Trip Completed!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Thank you for riding with GoShuttle.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${booking?.customer_name || booking?.guest_name || 'Customer'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Your trip has been successfully completed. We hope you had a comfortable journey!
        </p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <h3 style="color: #15803d; margin: 0 0 14px 0; font-size: 15px;">📋 Trip Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.booking_id || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Route:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_location || 'N/A'} → ${booking?.dropoff_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Completed At:</td><td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 13px;">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700; color: #374151; font-size: 15px;">Total Fare:</td><td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 18px;">₱${parseFloat(booking?.total_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
          <p style="color: #1e40af; margin: 0; font-size: 13px; line-height: 1.6;">
            <strong>⭐ Rate your experience!</strong> Your feedback helps us improve. Visit your booking history at <a href="https://goshuttle.ph/customer-account" style="color: #2563eb;">goshuttle.ph</a> to leave a review.
          </p>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildPasswordResetHtml(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #faf5ff; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">🔐</span>
          </div>
          <h1 style="color: #7c3aed; margin: 0 0 6px 0; font-size: 24px;">Password Reset Request</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">We received a request to reset your password.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${data?.customer_name || data?.full_name || 'User'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          We received a request to reset the password for your GoShuttle account. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${data?.reset_url || 'https://goshuttle.ph/auth/reset-password'}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none;">🔐 Reset My Password</a>
        </div>
        <div style="background-color: #fef2f2; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
          <p style="color: #991b1b; margin: 0; font-size: 13px; line-height: 1.6;">
            <strong>⚠️ Didn't request this?</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged. If you believe your account is at risk, contact support immediately.
          </p>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Security Notification</p>
        </div>
      </div>
    </div>
  `;
}

function buildAccountDeactivatedHtml(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #fef2f2; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">⚠️</span>
          </div>
          <h1 style="color: #dc2626; margin: 0 0 6px 0; font-size: 24px;">Account Deactivated</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your GoShuttle account has been deactivated.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${data?.customer_name || data?.full_name || 'User'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          We are writing to inform you that your GoShuttle account has been deactivated. If you believe this is an error, please contact our support team.
        </p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 20px;">
          <h3 style="color: #991b1b; margin: 0 0 12px 0; font-size: 15px;">📋 Deactivation Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #fecaca;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Reason:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.deactivation_reason || 'Administrative action'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Date:</td><td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 13px;">${new Date().toLocaleDateString('en-PH')}</td></tr>
          </table>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Contact Support</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">If you have questions, contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Account Management</p>
        </div>
      </div>
    </div>
  `;
}

function buildProfileUpdatedHtml(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #eff6ff; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">📝</span>
          </div>
          <h1 style="color: #1d4ed8; margin: 0 0 6px 0; font-size: 24px;">Profile Updated</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your account information has been updated.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${data?.customer_name || data?.full_name || 'User'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Your GoShuttle profile has been successfully updated. Here's a summary of the changes made.
        </p>
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin-bottom: 20px;">
          <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 15px;">📋 Update Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Updated Fields:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${data?.updated_fields || 'Profile information'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Updated At:</td><td style="padding: 8px 0; color: #1d4ed8; font-weight: 700; font-size: 13px;">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td></tr>
          </table>
        </div>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
          <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.6;">
            <strong>⚠️ Wasn't you?</strong> If you did not make these changes, please contact our support team immediately.
          </p>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Account Management</p>
        </div>
      </div>
    </div>
  `;
}

function buildPaymentReceiptHtml(booking: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #f0fdf4; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">💳</span>
          </div>
          <h1 style="color: #059669; margin: 0 0 6px 0; font-size: 24px;">Payment Received!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your payment has been successfully processed.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${booking?.customer_name || booking?.guest_name || 'Customer'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Thank you for your payment. Here is your payment receipt.
        </p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <h3 style="color: #15803d; margin: 0 0 14px 0; font-size: 15px;">📋 Payment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.booking_id || booking?.booking_code || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Route:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.pickup_location || 'N/A'} → ${booking?.dropoff_location || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Payment Date:</td><td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 13px;">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700; color: #374151; font-size: 15px;">Amount Paid:</td><td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 18px;">₱${parseFloat(booking?.total_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildRefundNoticeHtml(booking: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #eff6ff; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">↩️</span>
          </div>
          <h1 style="color: #1d4ed8; margin: 0 0 6px 0; font-size: 24px;">Refund Processed</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your refund has been successfully processed.</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${booking?.customer_name || booking?.guest_name || 'Customer'}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          We have processed a refund for your booking. Please allow 5–10 business days for the amount to reflect in your account.
        </p>
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin-bottom: 20px;">
          <h3 style="color: #1e40af; margin: 0 0 14px 0; font-size: 15px;">📋 Refund Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${booking?.booking_id || booking?.booking_code || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Refund Date:</td><td style="padding: 8px 0; color: #1d4ed8; font-weight: 700; font-size: 13px;">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700; color: #374151; font-size: 15px;">Refund Amount:</td><td style="padding: 8px 0; color: #1d4ed8; font-weight: 800; font-size: 18px;">₱${parseFloat(booking?.total_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildDriverSignupConfirmationHtml(driver: any): string {
  const name = driver?.full_name || driver?.fullName || 'Driver';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #eff6ff; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">🚗</span>
          </div>
          <h1 style="color: #1d4ed8; margin: 0 0 6px 0; font-size: 24px;">Application Received!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Welcome to GoShuttle, ${name}</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${name}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Thank you for signing up as a GoShuttle driver! Your application has been successfully received and is now being processed.
        </p>
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin-bottom: 20px;">
          <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 15px;">📋 What happens next?</h3>
          <ul style="color: #374151; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 18px;">
            <li>Upload your required documents (Driver's License, NBI Clearance, Medical Certificate)</li>
            <li>Our team will review your application within 3–5 business days</li>
            <li>You'll receive email updates at every stage</li>
            <li>Once approved, you'll be ready to start accepting rides!</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="https://goshuttle.ph/driver-document-upload" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
            📄 Upload Documents Now
          </a>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>drivers@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildDriverPendingApprovalHtml(driver: any): string {
  const name = driver?.full_name || driver?.fullName || 'Driver';
  const feedback = driver?.feedback || '';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">⏳</span>
          </div>
          <h1 style="color: #92400e; margin: 0 0 6px 0; font-size: 24px;">Application Under Review</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">We're reviewing your application, ${name}</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${name}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          Your GoShuttle driver application is currently under review by our team. We'll notify you as soon as a decision has been made.
        </p>
        ${feedback ? `
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
          <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">📝 Admin Note</h4>
          <p style="color: #78350f; margin: 0; font-size: 13px;">${feedback}</p>
        </div>
        ` : ''}
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <h3 style="color: #15803d; margin: 0 0 12px 0; font-size: 15px;">⏱ Expected Timeline</h3>
          <ul style="color: #374151; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 18px;">
            <li>Background check: within 24 hours</li>
            <li>Document verification: 1–2 business days</li>
            <li>Final decision: 3–5 business days</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="https://goshuttle.ph/driver-application-status" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
            📊 Check Application Status
          </a>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Questions?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>drivers@goshuttle.ph</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

function buildDriverDocUploadRequestHtml(driver: any): string {
  const name = driver?.full_name || driver?.fullName || 'Driver';
  const missingDocs = driver?.missing_docs || ['Driver\'s License', 'Police/NBI Clearance', 'Medical Certificate'];
  const docsHtml = Array.isArray(missingDocs)
    ? missingDocs.map((d: string) => `<li>${d}</li>`).join('')
    : `<li>${missingDocs}</li>`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
            <span style="font-size: 36px;">📄</span>
          </div>
          <h1 style="color: #92400e; margin: 0 0 6px 0; font-size: 24px;">Documents Required</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Action required to complete your application</p>
        </div>
        <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">Dear <strong>${name}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          To proceed with your GoShuttle driver application, please upload the following required documents:
        </p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 20px;">
          <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 15px;">📋 Required Documents</h3>
          <ul style="color: #78350f; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 18px;">
            ${docsHtml}
          </ul>
        </div>
        <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; border: 1px solid #bae6fd; margin-bottom: 20px;">
          <h4 style="color: #0369a1; margin: 0 0 8px 0; font-size: 14px;">📌 Upload Guidelines</h4>
          <ul style="color: #0c4a6e; font-size: 12px; line-height: 1.7; margin: 0; padding-left: 16px;">
            <li>Files must be clear and readable (JPEG, PNG, or PDF)</li>
            <li>Maximum file size: 10MB per document</li>
            <li>Ensure all text and photos are clearly visible</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="https://goshuttle.ph/driver-document-upload" style="display: inline-block; background-color: #f59e0b; color: #ffffff; font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
            📤 Upload Documents Now
          </a>
        </div>
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>drivers@goshuttle.ph</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}