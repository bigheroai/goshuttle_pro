import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // ✅ CORS preflight
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*", // DO NOT CHANGE THIS
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*" // DO NOT CHANGE THIS
      }
    });
  }
  
  try {
    const body = await req?.json();
    const { type, emailType, booking, booking_data, admin_email, customer_email, from_email } = body;

    // Support both 'type' (new) and 'emailType' (legacy) fields
    const notificationType = type || emailType;

    // Accept resend_api_key from request body as fallback when Supabase secret is not set
    const resendApiKey = (globalThis as any).Deno?.env?.get('RESEND_API_KEY') || body?.resend_api_key || '';
    if (!resendApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'RESEND_API_KEY not configured. Please set it in Supabase secrets or pass resend_api_key in the request body.',
        fallback_required: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const senderEmail = from_email || "noreply@goshuttle.ph";
    let emailSubject = '';
    let emailContent = '';
    let recipientEmail = '';

    // --- Legacy types (booking object) ---
    if (notificationType === 'confirmation' && booking) {
      recipientEmail = booking?.guest_email;
      emailSubject = `Booking Confirmation - ${booking?.booking_code}`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Booking Confirmation</h2>
          <p>Dear ${booking?.guest_name},</p>
          <p>Thank you for your booking! Here are your booking details:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p><strong>Booking Code:</strong> ${booking?.booking_code}</p>
            <p><strong>Pickup Location:</strong> ${booking?.pickup_location}</p>
            <p><strong>Dropoff Location:</strong> ${booking?.dropoff_location}</p>
            <p><strong>Date &amp; Time:</strong> ${new Date(booking.pickup_date)?.toLocaleString()}</p>
            <p><strong>Passengers:</strong> ${booking?.passenger_count}</p>
            <p><strong>Total Cost:</strong> ₱${booking?.total_cost}</p>
            <p><strong>Status:</strong> ${booking?.status}</p>
          </div>
          <p><strong>Important:</strong> Please save your booking code <strong>${booking?.booking_code}</strong> for future reference.</p>
          <p>You can use this code to track your booking or make modifications at our booking lookup portal.</p>
          <div style="margin: 30px 0; padding: 20px; background: #dbeafe; border-radius: 8px;">
            <h4 style="color: #1d4ed8; margin-top: 0;">Want to create an account?</h4>
            <p>Create an account to easily manage your bookings, save preferences, and earn loyalty points!</p>
            <p>Use the same email address (${booking?.guest_email}) when signing up to link this booking to your account.</p>
          </div>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>GoShuttle Team</p>
        </div>
      `;

    } else if (notificationType === 'status_update' && booking) {
      recipientEmail = booking?.guest_email;
      emailSubject = `Booking Update - ${booking?.booking_code}`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Booking Status Update</h2>
          <p>Dear ${booking?.guest_name},</p>
          <p>Your booking status has been updated:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Booking Code:</strong> ${booking?.booking_code}</p>
            <p><strong>New Status:</strong> <span style="color: #059669; font-weight: bold;">${booking?.status?.toUpperCase()}</span></p>
            <p><strong>Pickup:</strong> ${booking?.pickup_location}</p>
            <p><strong>Dropoff:</strong> ${booking?.dropoff_location}</p>
            <p><strong>Date:</strong> ${new Date(booking.pickup_date)?.toLocaleString()}</p>
          </div>
          <p>You can track your booking anytime using code <strong>${booking?.booking_code}</strong> at our booking lookup portal.</p>
          <p>Best regards,<br>GoShuttle Team</p>
        </div>
      `;

    } else if (notificationType === 'account_invitation' && booking) {
      recipientEmail = booking?.guest_email;
      emailSubject = 'Complete Your GoShuttle Experience - Create Your Account';
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Create Your GoShuttle Account</h2>
          <p>Dear ${booking?.guest_name},</p>
          <p>Thank you for booking with us! We'd love to enhance your experience by creating a GoShuttle account.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin-top: 0;">Benefits of Creating an Account:</h3>
            <ul style="color: #374151;">
              <li>Easy booking management and history</li>
              <li>Faster checkout for future bookings</li>
              <li>Earn loyalty points and rewards</li>
              <li>Saved payment methods and preferences</li>
              <li>Real-time booking notifications</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <p style="background: #10b981; color: white; padding: 15px 30px; border-radius: 8px; display: inline-block;">
              <strong>Simply sign up with this email: ${booking?.guest_email}</strong>
            </p>
          </div>
          <p>Your recent booking (${booking?.booking_code}) will be automatically linked to your new account!</p>
          <p>Best regards,<br>GoShuttle Team</p>
        </div>
      `;

    // --- New types (booking_data object) used by bookingService.js ---
    } else if (notificationType === 'admin_notification' && booking_data) {
      const adminTo = admin_email;
      if (!adminTo) throw new Error('Admin email is required for admin_notification type');
      recipientEmail = adminTo;
      emailSubject = `🆕 New Guest Booking - ${booking_data?.booking_id || 'Pending'}`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1f2937; margin-bottom: 10px;">🆕 New Guest Booking</h1>
              <p style="color: #6b7280; font-size: 16px;">A guest has submitted a new booking request</p>
            </div>
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-bottom: 15px;">📋 Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.booking_id || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Guest Name:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.guest_name || booking_data?.customer_name || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.guest_email || booking_data?.customer_email || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Phone:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.guest_phone || booking_data?.customer_phone || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.pickup_location || 'N/A'} → ${booking_data?.dropoff_location || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.vehicle_name || booking_data?.vehicle_type || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Passengers:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.passenger_count || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Date:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.pickup_date || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Time:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.pickup_time || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Cost:</td>
                  <td style="padding: 8px 0; color: #059669; font-weight: bold;">₱${booking_data?.total_cost || 'N/A'}</td>
                </tr>
              </table>
            </div>
            ${booking_data?.special_requirements ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
              <h4 style="color: #92400e; margin: 0 0 8px 0;">⚠️ Special Requirements</h4>
              <p style="color: #92400e; margin: 0;">${booking_data?.special_requirements}</p>
            </div>
            ` : ''}
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; font-weight: bold; margin: 0;">⚡ Please log in to the admin dashboard to review and confirm this booking.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro Admin Notification System</p>
            </div>
          </div>
        </div>
      `;

    } else if (notificationType === 'guest_confirmation' && booking_data) {
      const guestTo = customer_email || booking_data?.guest_email || booking_data?.customer_email;
      if (!guestTo) throw new Error('Guest email is required for guest_confirmation type');
      recipientEmail = guestTo;
      emailSubject = `✅ Booking Confirmed - ${booking_data?.booking_id || 'GoShuttle Pro'}`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin-bottom: 10px;">✅ Booking Confirmed!</h1>
              <p style="color: #6b7280; font-size: 16px;">Thank you for choosing GoShuttle Pro</p>
            </div>
            <p style="color: #374151;">Dear ${booking_data?.guest_name || booking_data?.customer_name || 'Valued Customer'},</p>
            <p style="color: #6b7280; line-height: 1.6;">Your booking has been successfully received. Here are your booking details:</p>
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #22c55e; margin-bottom: 20px;">
              <h3 style="color: #15803d; margin-bottom: 15px;">📋 Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.booking_id || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.pickup_location || 'N/A'} → ${booking_data?.dropoff_location || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.vehicle_name || booking_data?.vehicle_type || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Passengers:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.passenger_count || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Date:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.pickup_date || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Time:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.pickup_time || 'N/A'}</td>
                </tr>
                ${booking_data?.return_date ? `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Return Date:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${booking_data?.return_date} ${booking_data?.return_time ? 'at ' + booking_data?.return_time : ''}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Cost:</td>
                  <td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">₱${booking_data?.total_cost || 'N/A'}</td>
                </tr>
              </table>
            </div>
            ${booking_data?.special_requirements ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
              <h4 style="color: #92400e; margin: 0 0 8px 0;">📝 Special Requirements</h4>
              <p style="color: #92400e; margin: 0;">${booking_data?.special_requirements}</p>
            </div>
            ` : ''}
            <div style="background-color: #e0f2fe; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h4 style="color: #0277bd; margin: 0 0 10px 0;">📞 Need Help?</h4>
              <p style="color: #0277bd; margin: 0;">
                Contact us at <strong>${booking_data?.company_contact?.support_email || 'support@goshuttle.ph'}</strong>
                or call <strong>${booking_data?.company_contact?.hotline_phone || booking_data?.company_contact?.support_phone || '+63 2 8123 4567'}</strong>
              </p>
            </div>
            <p style="color: #6b7280; text-align: center;">Thank you for choosing GoShuttle Pro!</p>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
            </div>
          </div>
        </div>
      `;

    } else {
      return new Response(JSON.stringify({ success: false, error: `Invalid or unsupported notification type: ${notificationType}` }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const emailData = {
      from: senderEmail,
      to: [recipientEmail],
      subject: emailSubject,
      html: emailContent
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response?.ok) {
      const errorData = await response?.text();
      console.error('Resend API Error:', errorData);
      return new Response(JSON.stringify({
        success: false,
        error: `Resend API error: ${response.status} - ${errorData}`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const result = await response?.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: `${notificationType} email sent successfully`,
      emailId: result.id,
      recipient: recipientEmail
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // DO NOT CHANGE THIS
      }
    });
    
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});