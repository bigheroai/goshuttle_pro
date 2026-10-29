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
    const { to, subject, html, text, emailType = "notification", from_email } = body;
    
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

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: to, subject, and html are required'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const senderEmail = from_email || "noreply@goshuttle.ph";

    const emailPayload: any = {
      from: senderEmail,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    };

    if (text) {
      emailPayload.text = text;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API Error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `Resend API error: ${response.status} - ${errorText}`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const result = await response.json();

    console.log(`✅ Email sent successfully via Resend API:`, {
      id: result?.id,
      to: emailPayload.to,
      subject: subject,
      type: emailType,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      id: result?.id,
      message: 'Email sent successfully via Resend API',
      service: 'resend',
      timestamp: new Date().toISOString(),
      data: result
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error: any) {
    console.error('❌ Email notification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message,
      message: 'Failed to send email notification',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});