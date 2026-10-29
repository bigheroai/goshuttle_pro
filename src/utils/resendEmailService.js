/**
 * Direct Resend API email service (frontend)
 * Used as fallback when Supabase edge function is unavailable.
 * Sends booking confirmation emails directly via Resend REST API.
 */

const RESEND_API_KEY = import.meta.env?.VITE_RESEND_API_KEY;
const FROM_EMAIL = 'noreply@goshuttle.ph';
const FROM_NAME = 'GoShuttle Pro';

/**
 * Send an email via Resend API directly from the frontend.
 * NOTE: Direct browser calls to Resend API are blocked by CORS.
 * This function is kept for server-side / Node.js contexts only.
 * For browser usage, always use sendBookingConfirmationEmail with a supabaseClient.
 * @param {string|string[]} to - recipient email or array of emails
 * @param {string} subject - email subject
 * @param {string} html - HTML body
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function sendEmailViaResend(to, subject, html) {
  // Direct Resend API calls from the browser are blocked by CORS (NetworkError).
  // This path should only be used server-side. Return a clear error for browser contexts.
  console.warn('sendEmailViaResend: Direct browser calls to Resend API are blocked by CORS. Use the Supabase edge function instead.');
  return { success: false, error: 'Direct Resend API calls are not supported from the browser due to CORS. Please ensure the Supabase edge function (send-booking-confirmation) is deployed with RESEND_API_KEY set as a secret.' };
}

/**
 * Build booking confirmation HTML email body.
 */
function buildConfirmationHtml(data) {
  const bookingCode = data?.booking_code || data?.bookingCode || data?.booking_reference || '';
  const customerName = data?.customer_name || data?.customerName || data?.guest_name || data?.guestName || 'Valued Customer';
  const customerEmail = data?.customer_email || data?.customerEmail || data?.guest_email || '';
  const pickupLocation = data?.pickup_location || data?.pickupLocation || 'N/A';
  const dropoffLocation = data?.dropoff_location || data?.dropoffLocation || 'N/A';
  const vehicleName = data?.vehicle_name || data?.vehicleName || data?.vehicle_type || data?.vehicleType || 'N/A';
  const passengerCount = data?.passenger_count || data?.passengerCount || 'N/A';
  const totalCost = data?.total_cost || data?.totalCost || '0';
  const status = data?.status || 'Pending';
  const invoiceNumber = `INV-${bookingCode || Date.now()}`;
  const issuedDate = new Date()?.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalCostNum = parseFloat(totalCost) || 0;
  const formattedTotal = totalCostNum?.toLocaleString('en-PH', { minimumFractionDigits: 2 });
  const isPaid = String(status)?.toLowerCase() === 'paid' || String(status)?.toLowerCase() === 'confirmed';

  // Format pickup date
  let pickupDateStr = 'N/A';
  let pickupTimeStr = '';
  const rawDate = data?.pickup_date || data?.pickupDate;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      pickupDateStr = d?.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      pickupTimeStr = d?.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      pickupDateStr = String(rawDate);
    }
  }

  const trackingUrl = bookingCode
    ? `https://goshuttle.ph/booking-lookup-portal?code=${bookingCode}`
    : 'https://goshuttle.ph/booking-lookup-portal';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
      <div style="background-color: white; padding: 32px; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #059669; margin-bottom: 8px;">✅ Booking Confirmed!</h1>
          <p style="color: #6b7280; font-size: 15px;">Thank you for choosing GoShuttle Pro</p>
        </div>

        <p style="color: #374151; font-size: 15px;">Dear <strong>${customerName}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">Your booking has been successfully received and confirmed. Please find your booking confirmation and invoice/receipt below.</p>

        ${bookingCode ? `
        <div style="background-color: #eff6ff; border: 2px solid #3b82f6; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <p style="color: #1e40af; font-size: 12px; font-weight: 700; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.08em;">Booking Confirmation ID</p>
          <p style="color: #1e3a8a; font-size: 30px; font-weight: 800; font-family: monospace; letter-spacing: 0.12em; margin: 0;">${bookingCode}</p>
          <p style="color: #3b82f6; font-size: 12px; margin: 8px 0 0 0;">Save this code to track or modify your booking</p>
        </div>
        ` : ''}

        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin-bottom: 24px;">
          <h3 style="color: #15803d; margin-bottom: 14px; font-size: 15px;">📋 Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${bookingCode ? `<tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking Code:</td><td style="padding: 8px 0; color: #1e40af; font-weight: 700; font-family: monospace; font-size: 15px;">${bookingCode}</td></tr>` : ''}
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Route:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${pickupLocation} → ${dropoffLocation}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Pickup Date:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${pickupDateStr}</td></tr>
            ${pickupTimeStr ? `<tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Pickup Time:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${pickupTimeStr}</td></tr>` : ''}
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${vehicleName}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Passengers:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${passengerCount}</td></tr>
            <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Status:</td><td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 13px;">${String(status)?.charAt(0)?.toUpperCase() + String(status)?.slice(1)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700; color: #374151; font-size: 14px;">Total Cost:</td><td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 18px;">₱${formattedTotal}</td></tr>
          </table>
        </div>

        <!-- ===== INVOICE & RECEIPT ===== -->
        <div style="border: 2px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 18px 22px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>
                  <h2 style="color: #ffffff; margin: 0 0 4px 0; font-size: 18px; font-weight: 800;">🧾 INVOICE & RECEIPT</h2>
                  <p style="color: #a7f3d0; margin: 0; font-size: 12px;">GoShuttle Pro – Official Document</p>
                </td>
                <td style="text-align: right;">
                  <p style="color: #ffffff; font-size: 13px; font-weight: 700; margin: 0 0 2px 0;">${invoiceNumber}</p>
                  <p style="color: #a7f3d0; font-size: 11px; margin: 0;">Issued: ${issuedDate}</p>
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 20px 22px; background-color: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                  <div style="background-color: #f9fafb; padding: 14px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px 0;">Billed To</p>
                    <p style="color: #111827; font-size: 14px; font-weight: 700; margin: 0 0 2px 0;">${customerName}</p>
                    ${customerEmail ? `<p style="color: #6b7280; font-size: 12px; margin: 0;">${customerEmail}</p>` : ''}
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                  <div style="background-color: #f9fafb; padding: 14px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px 0;">Booking Reference</p>
                    <p style="color: #1e40af; font-size: 16px; font-weight: 800; font-family: monospace; margin: 0 0 2px 0;">${bookingCode || 'N/A'}</p>
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">Invoice: ${invoiceNumber}</p>
                    <p style="color: #6b7280; font-size: 12px; margin: 2px 0 0 0;">Date: ${issuedDate}</p>
                  </div>
                </td>
              </tr>
            </table>

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
                    <strong>${vehicleName}</strong><br>
                    <span style="color: #9ca3af; font-size: 12px;">${pickupLocation} → ${dropoffLocation}</span><br>
                    <span style="color: #9ca3af; font-size: 12px;">${pickupDateStr} ${pickupTimeStr ? 'at ' + pickupTimeStr : ''} · ${passengerCount} passenger(s)</span>
                  </td>
                  <td style="padding: 10px 12px; text-align: right; color: #374151; font-weight: 600; vertical-align: top;">₱${formattedTotal}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background-color: #f0fdf4; border-top: 2px solid #22c55e;">
                  <td style="padding: 12px; font-weight: 800; color: #15803d; font-size: 15px;">TOTAL AMOUNT</td>
                  <td style="padding: 12px; text-align: right; font-weight: 800; color: #15803d; font-size: 18px;">₱${formattedTotal}</td>
                </tr>
              </tfoot>
            </table>

            <div style="padding: 12px 14px; border-radius: 6px; background-color: ${isPaid ? '#f0fdf4' : '#fef3c7'}; border: 1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}; margin-bottom: 14px;">
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: ${isPaid ? '#15803d' : '#92400e'};">${isPaid ? '✅' : '⏳'} Payment Status: ${isPaid ? 'PAID' : String(status)?.toUpperCase()}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: ${isPaid ? '#16a34a' : '#b45309'};">${isPaid ? `Payment received on ${issuedDate}` : 'Payment will be collected upon service'}</p>
            </div>

            <p style="color: #9ca3af; font-size: 11px; margin: 0; line-height: 1.6; border-top: 1px solid #f3f4f6; padding-top: 12px;">
              This is an official invoice and receipt from GoShuttle Pro. Please retain this document for your records.
              Booking Confirmation ID: <strong style="color: #374151;">${bookingCode || 'N/A'}</strong> · Invoice: <strong style="color: #374151;">${invoiceNumber}</strong>
            </p>
          </div>
        </div>
        <!-- ===== END INVOICE & RECEIPT ===== -->

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${trackingUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
            📋 View My Booking
          </a>
        </div>

        <div style="background-color: #e0f2fe; padding: 18px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
          <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
        </div>

        <p style="color: #6b7280; text-align: center; font-size: 13px; margin-bottom: 0;">Thank you for choosing GoShuttle Pro for your transportation needs!</p>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Safely invoke a Supabase edge function, returning null on any error (including non-2xx).
 * This prevents the Supabase SDK "Edge Function returned a non-2xx status code" from propagating.
 */
async function safeInvokeEdgeFunction(supabaseClient, functionName, body) {
  // Do NOT pass the API key in the request body — edge functions must use
  // their own server-side Supabase secrets (RESEND_API_KEY).
  // Sending API keys from the browser in request bodies is a security risk.
  try {
    const { data, error } = await supabaseClient?.functions?.invoke(functionName, { body });
    if (error) {
      console.warn(`Edge function ${functionName} SDK error:`, error?.message || error);
      // Try direct fetch as secondary fallback (handles "not deployed" case)
      return await safeDirectFetch(supabaseClient, functionName, body);
    }
    return data;
  } catch (err) {
    console.warn(`Edge function ${functionName} threw:`, err?.message || err);
    // Try direct fetch as secondary fallback
    return await safeDirectFetch(supabaseClient, functionName, body);
  }
}

/**
 * Fallback: call the edge function via direct fetch using the Supabase URL.
 * This handles cases where the Supabase SDK invoke fails but the function is deployed.
 */
async function safeDirectFetch(supabaseClient, functionName, body) {
  try {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const url = `${supabaseUrl}/functions/v1/${functionName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });

    // Always try to parse the JSON body regardless of status
    let responseData = null;
    try {
      responseData = await response?.json();
    } catch (_) {
      responseData = null;
    }

    if (!response?.ok) {
      console.warn(`Direct fetch to ${functionName} returned ${response?.status}:`, responseData);
      // Return the error data so callers can surface the real error message
      return responseData || { success: false, error: `Edge function returned status ${response?.status}` };
    }
    return responseData;
  } catch (err) {
    console.warn(`Direct fetch to ${functionName} failed:`, err?.message || err);
    return null;
  }
}

/**
 * Send a booking confirmation email to a customer.
 * Uses the Supabase edge function (server-side) to avoid CORS issues.
 * The VITE_RESEND_API_KEY is passed in the request body as a fallback
 * so emails send even when the Supabase RESEND_API_KEY secret is not configured.
 * @param {string} toEmail - recipient email
 * @param {object} bookingData - booking details
 * @param {object} [supabaseClient] - supabase client for edge function call
 * @returns {Promise<{success: boolean, email?: string, error?: string}>}
 */
export async function sendBookingConfirmationEmail(toEmail, bookingData, supabaseClient = null) {
  if (!toEmail) return { success: false, error: 'No email address provided' };

  const customerName = bookingData?.customer_name || bookingData?.customerName ||
    bookingData?.guest_name || bookingData?.guestName || 'Valued Customer';
  const bookingCode = bookingData?.booking_code || bookingData?.bookingCode ||
    bookingData?.booking_reference || '';

  // Use edge function (server-side, no CORS issues)
  // VITE_RESEND_API_KEY is passed in the body as fallback for when the Supabase secret is not set
  if (supabaseClient) {
    const edgeData = await safeInvokeEdgeFunction(supabaseClient, 'send-booking-confirmation', {
      type: 'customer_confirmation',
      customer_email: toEmail,
      to_email: toEmail,
      booking_data: {
        booking_code: bookingCode,
        booking_id: bookingData?.id || bookingData?.booking_id || bookingCode,
        customer_name: customerName,
        guest_name: customerName,
        pickup_location: bookingData?.pickup_location || bookingData?.pickupLocation,
        dropoff_location: bookingData?.dropoff_location || bookingData?.dropoffLocation,
        pickup_date: bookingData?.pickup_date || bookingData?.pickupDate,
        vehicle_name: bookingData?.vehicle_name || bookingData?.vehicleName || bookingData?.vehicle_type || bookingData?.vehicleType,
        vehicle_type: bookingData?.vehicle_type || bookingData?.vehicleType,
        passenger_count: bookingData?.passenger_count || bookingData?.passengerCount,
        total_cost: bookingData?.total_cost || bookingData?.totalCost,
        status: bookingData?.status,
      },
    });

    if (edgeData?.success) {
      console.log('✅ Booking confirmation sent via edge function to:', toEmail);
      return { success: true, email: toEmail, via: 'edge_function' };
    }

    // Edge function returned fallback_required — means RESEND_API_KEY secret not set in Supabase
    // and VITE_RESEND_API_KEY was also not available in the body
    if (edgeData?.fallback_required) {
      return {
        success: false,
        error: 'Email service not configured. Please set RESEND_API_KEY in Supabase edge function secrets or add VITE_RESEND_API_KEY to your environment variables.'
      };
    }

    if (edgeData === null) {
      // Edge function completely unreachable (not deployed or network error)
      return {
        success: false,
        error: 'Email service is unreachable. Please check your internet connection and try again.'
      };
    }

    // Edge function returned an error response — surface the real error
    const realError = edgeData?.error || edgeData?.message || 'Email could not be sent. Please try again.';
    console.warn('Edge function returned error:', realError);
    return {
      success: false,
      error: realError
    };
  }

  return { success: false, error: 'No Supabase client provided. Cannot send email.' };
}

/**
 * Send admin booking notification to multiple admin emails.
 * @param {string|string[]} adminEmails - one or more admin email addresses
 * @param {object} bookingData - booking details
 * @param {object} [supabaseClient] - optional supabase client for edge function attempt
 * @returns {Promise<{success: boolean, sent?: number, error?: string}>}
 */
export async function sendAdminNotificationEmails(adminEmails, bookingData, supabaseClient = null) {
  const emails = Array.isArray(adminEmails)
    ? adminEmails?.filter(e => e && e?.includes('@'))
    : (adminEmails || '')?.split(',')?.map(e => e?.trim())?.filter(e => e?.includes('@'));

  if (emails?.length === 0) return { success: false, error: 'No valid admin emails provided' };

  const bookingCode = bookingData?.booking_code || bookingData?.bookingCode || bookingData?.booking_id || '';
  const subject = `🆕 New Booking Request – ${bookingCode || 'Pending'} | GoShuttle Pro`;

  // Try edge function first
  if (supabaseClient && emails?.length > 0) {
    const edgeData = await safeInvokeEdgeFunction(supabaseClient, 'send-booking-confirmation', {
      type: 'multi_role_notification',
      booking_data: bookingData,
      recipients: emails?.map(email => ({ email, role: 'admin', event_type: 'new_booking' })),
    });

    if (edgeData?.success) {
      console.log('✅ Admin notifications sent via edge function to:', emails);
      return { success: true, sent: emails?.length, via: 'edge_function' };
    }
    console.warn('Edge function unavailable for admin notifications:', edgeData?.error);
    return { success: false, error: edgeData?.error || 'Admin notification email service unavailable.' };
  }

  return { success: false, error: 'No Supabase client provided. Cannot send admin notification.' };
}
