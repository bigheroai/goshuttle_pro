import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

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
    const { 
      type, 
      admin_email, 
      admin_name, 
      from_email,
      booking_data,
      customer_data
    } = body;

    if (!admin_email) {
      throw new Error("Admin email address is required");
    }

    // Accept resend_api_key from request body as fallback when Supabase secret is not set
    const RESEND_API_KEY = (globalThis as any).Deno?.env?.get('RESEND_API_KEY') || body?.resend_api_key || '';
    if (!RESEND_API_KEY) {
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
    
    let subject: string, htmlContent: string;
    
    switch (type) {
      case 'new_booking':
        subject = `🆕 New Booking Request #${booking_data?.id || 'PENDING'}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin-bottom: 10px;">🆕 New Booking Request</h1>
                <p style="color: #6b7280; font-size: 16px;">A new booking has been submitted and requires your attention</p>
              </div>
              <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-bottom: 15px;">📋 Booking Details</h3>
                <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li><strong>Booking ID:</strong> ${booking_data?.id || 'Pending Assignment'}</li>
                  <li><strong>Customer:</strong> ${customer_data?.name || 'N/A'}</li>
                  <li><strong>Email:</strong> ${customer_data?.email || 'N/A'}</li>
                  <li><strong>Phone:</strong> ${customer_data?.phone || 'N/A'}</li>
                  <li><strong>Route:</strong> ${booking_data?.route || 'N/A'}</li>
                  <li><strong>Pickup Time:</strong> ${booking_data?.pickup_time || 'N/A'}</li>
                  <li><strong>Vehicle Type:</strong> ${booking_data?.vehicle_type || 'N/A'}</li>
                  <li><strong>Status:</strong> ${booking_data?.status || 'Pending'}</li>
                </ul>
              </div>
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <h3 style="color: #92400e; margin-bottom: 10px;">⚡ Action Required</h3>
                <p style="color: #374151; line-height: 1.6; margin: 0;">Please review this booking request and take appropriate action.</p>
              </div>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">Notification sent to: <strong>${admin_name || 'Admin'}</strong></p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">GoShuttle Pro Admin Notification System</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'booking_confirmed':
        subject = `✅ Booking Confirmed #${booking_data?.id}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px;">
              <h1 style="color: #059669;">✅ Booking Confirmed</h1>
              <p>Booking #${booking_data?.id} has been confirmed.</p>
              <ul style="color: #374151; line-height: 1.6;">
                <li><strong>Customer:</strong> ${customer_data?.name || 'N/A'}</li>
                <li><strong>Route:</strong> ${booking_data?.route || 'N/A'}</li>
                <li><strong>Pickup Time:</strong> ${booking_data?.pickup_time || 'N/A'}</li>
                <li><strong>Vehicle:</strong> ${booking_data?.vehicle_type || 'N/A'}</li>
                <li><strong>Driver:</strong> ${booking_data?.driver_name || 'To be assigned'}</li>
              </ul>
            </div>
          </div>
        `;
        break;

      case 'booking_cancelled':
        subject = `❌ Booking Cancelled #${booking_data?.id}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px;">
              <h1 style="color: #dc2626;">❌ Booking Cancelled</h1>
              <p>Booking #${booking_data?.id} has been cancelled.</p>
              <ul style="color: #374151; line-height: 1.6;">
                <li><strong>Customer:</strong> ${customer_data?.name || 'N/A'}</li>
                <li><strong>Route:</strong> ${booking_data?.route || 'N/A'}</li>
                <li><strong>Cancellation Reason:</strong> ${booking_data?.cancellation_reason || 'Not specified'}</li>
                <li><strong>Cancelled At:</strong> ${new Date()?.toLocaleString()}</li>
              </ul>
            </div>
          </div>
        `;
        break;

      default:
        subject = `📧 GoShuttle Pro Notification`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937;">GoShuttle Pro Notification</h2>
            <p>Dear ${admin_name || 'Admin'},</p>
            <p>You have received a new notification from the GoShuttle Pro system.</p>
            <p>Best regards,<br>GoShuttle Pro System</p>
          </div>
        `;
    }

    const textContent = htmlContent?.replace(/<[^>]*>/g, '')?.replace(/\s+/g, ' ')?.trim();

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [admin_email],
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!emailResponse?.ok) {
      const errorText = await emailResponse?.text();
      console.error('Resend API Error:', errorText);
      // Return 200 with success:false so frontend can handle gracefully
      return new Response(JSON.stringify({
        success: false,
        error: `Resend API error: ${emailResponse.status} - ${errorText}`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const emailResult = await emailResponse?.json();
    console.log('Admin notification sent successfully:', emailResult);

    return new Response(JSON.stringify({
      success: true,
      message: `Admin notification sent successfully to ${admin_email}`,
      email_id: emailResult?.id,
      recipient: admin_email,
      sender: senderEmail,
      type: type
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error: any) {
    console.error('Admin notification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message,
      details: 'Check your email configuration and ensure RESEND_API_KEY is set in Supabase environment variables'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});