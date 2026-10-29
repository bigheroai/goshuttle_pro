import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }
  
  try {
    const body = await req.json();
    const { type, to_email, admin_name, booking_data, test_data, customer_email } = body;
    
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

    const recipientEmail = to_email || customer_email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ success: false, error: 'to_email is required' }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    let subject: string, html_content: string;
    const data = booking_data || test_data;
    
    switch (type) {
      case 'test_email':
        subject = `🧪 GoShuttle Pro - Test Email Configuration`;
        html_content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🧪 Test Email</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">GoShuttle Pro Email Configuration Test</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-top: 0;">Hello ${admin_name || 'Admin'},</h2>
              <p style="color: #6b7280; line-height: 1.6;">This is a test email to verify that your booking notification system is working correctly.</p>
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #059669;">✅ Email System Status</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                  <li>Email delivery: <strong style="color: #10b981;">Working</strong></li>
                  <li>Configuration: <strong style="color: #10b981;">Valid</strong></li>
                  <li>Test time: <strong>${new Date().toLocaleString()}</strong></li>
                </ul>
              </div>
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 0;">If you received this email, your notification system is configured correctly.</p>
            </div>
            <div style="background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px;">
              <p style="margin: 0;">GoShuttle Pro Admin System</p>
            </div>
          </div>
        `;
        break;
        
      case 'new_booking':
        subject = `🚗 New Booking Request - ${data?.booking_id || 'Unknown'}`;
        html_content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🚗 New Booking Request</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Action Required - Customer Waiting</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-top: 0;">Hello ${admin_name || 'Admin'},</h2>
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="margin: 0 0 15px 0; color: #1d4ed8;">📋 Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280;">${data?.booking_id || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Customer:</td><td style="padding: 8px 0; color: #6b7280;">${data?.customer_name || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Contact:</td><td style="padding: 8px 0; color: #6b7280;">${data?.customer_phone || data?.customer_email || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_location || 'N/A'} → ${data?.dropoff_location || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280;">${data?.vehicle_type || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Date:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_date || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Time:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_time || 'N/A'}</td></tr>
                </table>
              </div>
            </div>
            <div style="background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px;">
              <p style="margin: 0;">GoShuttle Pro Booking System</p>
            </div>
          </div>
        `;
        break;

      case 'customer_receipt':
        subject = `✅ Booking Confirmation & Receipt - ${data?.booking_id || 'Unknown'}`;
        html_content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">✅ Booking Confirmed!</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Thank you for choosing GoShuttle Pro</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-top: 0;">Hello ${data?.customer_name || 'Valued Customer'},</h2>
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #059669;">📋 Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280;">${data?.booking_id || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_location || 'N/A'} → ${data?.dropoff_location || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280;">${data?.vehicle_name || data?.vehicle_type || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Date & Time:</td><td style="padding: 8px 0; color: #6b7280;">${data?.pickup_date || 'N/A'} at ${data?.pickup_time || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Total:</td><td style="padding: 8px 0; color: #10b981; font-weight: bold; font-size: 18px;">₱${data?.total_cost || '0.00'}</td></tr>
                </table>
              </div>
            </div>
            <div style="background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px;">
              <p style="margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
            </div>
          </div>
        `;
        break;
        
      case 'booking_confirmed':
        subject = `✅ Booking Confirmed - ${data?.booking_id || 'Unknown'}`;
        html_content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">✅ Booking Confirmed</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-top: 0;">Hello ${admin_name || 'Admin'},</h2>
              <p style="color: #6b7280;">Booking ${data?.booking_id || 'Unknown'} for ${data?.customer_name || 'Unknown Customer'} has been confirmed.</p>
              <p><strong>Pickup:</strong> ${data?.pickup_date || 'N/A'} at ${data?.pickup_time || 'N/A'}</p>
            </div>
          </div>
        `;
        break;
        
      default:
        return new Response(JSON.stringify({ success: false, error: `Unsupported email type: ${type}` }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "noreply@goshuttle.ph",
        to: [recipientEmail],
        subject: subject,
        html: html_content,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API Error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `Resend API error: ${resendResponse.status} - ${errorText}`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const emailResult = await resendResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`,
      email_id: emailResult?.id,
      type: type
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error: any) {
    console.error('send-booking-notification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});