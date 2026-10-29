import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const body = await req?.json();
    const {
      action, // 'suspend' | 'delete'
      to_email,
      user_name,
      reason,
      resend_api_key,
    } = body;

    const apiKey = (typeof Deno !== "undefined" ? Deno?.env?.get("RESEND_API_KEY") : undefined) || resend_api_key;
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!to_email) {
      return new Response(JSON.stringify({ success: false, error: "No recipient email provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const displayName = user_name || to_email;
    const actionReason = reason?.trim() || "Violation of our Terms of Service or Community Guidelines.";
    const isSuspend = action === "suspend";

    const subject = isSuspend
      ? "Your GoShuttle Account Has Been Suspended" :"Your GoShuttle Account Has Been Deleted";

    const actionColor = isSuspend ? "#d97706" : "#dc2626";
    const actionIcon = isSuspend ? "⚠️" : "🚫";
    const actionTitle = isSuspend ? "Account Suspended" : "Account Deleted";

    const suspendBody = `
      <p style="color:#374151;line-height:1.6;">Your account has been <strong>temporarily suspended</strong>. During this period, you will not be able to log in or access GoShuttle services.</p>
      <div style="background:#fef3c7;border-left:4px solid #d97706;padding:16px;border-radius:6px;margin:20px 0;">
        <p style="color:#92400e;font-weight:600;margin:0 0 6px 0;">Reason for Suspension:</p>
        <p style="color:#78350f;margin:0;">${actionReason}</p>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;border-radius:8px;margin:20px 0;">
        <h3 style="color:#15803d;margin:0 0 12px 0;">📋 How to Appeal</h3>
        <p style="color:#374151;margin:0 0 10px 0;">If you believe this suspension was made in error, you can appeal by:</p>
        <ol style="color:#374151;padding-left:20px;margin:0;line-height:1.8;">
          <li>Emailing us at <a href="mailto:support@goshuttle.ph" style="color:#059669;">support@goshuttle.ph</a> with the subject line <strong>"Account Suspension Appeal"</strong></li>
          <li>Including your registered email address and a brief explanation</li>
          <li>Our team will review your appeal within <strong>3–5 business days</strong></li>
        </ol>
      </div>
      <p style="color:#6b7280;line-height:1.6;">We take account actions seriously and aim to resolve all appeals fairly and promptly.</p>
    `;

    const deleteBody = `
      <p style="color:#374151;line-height:1.6;">Your GoShuttle account and all associated data have been <strong>permanently deleted</strong> from our platform.</p>
      <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:16px;border-radius:6px;margin:20px 0;">
        <p style="color:#991b1b;font-weight:600;margin:0 0 6px 0;">Reason for Deletion:</p>
        <p style="color:#7f1d1d;margin:0;">${actionReason}</p>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;border-radius:8px;margin:20px 0;">
        <h3 style="color:#15803d;margin:0 0 12px 0;">📋 Appeal Process</h3>
        <p style="color:#374151;margin:0 0 10px 0;">If you believe this action was taken in error, you may submit an appeal within <strong>30 days</strong>:</p>
        <ol style="color:#374151;padding-left:20px;margin:0;line-height:1.8;">
          <li>Email <a href="mailto:support@goshuttle.ph" style="color:#059669;">support@goshuttle.ph</a> with the subject line <strong>"Account Deletion Appeal"</strong></li>
          <li>Include your registered email address, full name, and a detailed explanation</li>
          <li>Our team will review your appeal within <strong>5–7 business days</strong></li>
        </ol>
        <p style="color:#6b7280;margin:12px 0 0 0;font-size:13px;">Note: Account restoration is not guaranteed and depends on the nature of the violation.</p>
      </div>
      <p style="color:#6b7280;line-height:1.6;">We regret that it came to this and hope you understand that these measures are in place to protect all users of our platform.</p>
    `;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f9fafb;">
        <div style="background-color:white;padding:30px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;background:${actionColor}1a;border-radius:50%;padding:16px;margin-bottom:12px;">
              <span style="font-size:32px;">${actionIcon}</span>
            </div>
            <h1 style="color:${actionColor};margin:0;font-size:22px;">${actionTitle}</h1>
          </div>
          <p style="color:#374151;">Dear ${displayName},</p>
          ${isSuspend ? suspendBody : deleteBody}
          <div style="background:#e0f2fe;padding:16px;border-radius:6px;margin-top:24px;">
            <h4 style="color:#0277bd;margin:0 0 6px 0;">📞 Contact Support</h4>
            <p style="color:#0277bd;margin:0;">Email: <strong>support@goshuttle.ph</strong> | Phone: <strong>+63 2 8123 4567</strong></p>
          </div>
          <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">GoShuttle Pro — Premium Transportation Service</p>
            <p style="color:#9ca3af;font-size:11px;margin:4px 0 0 0;">This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to_email],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse?.json();

    if (!resendResponse?.ok) {
      console.error("Resend API error:", resendData);
      return new Response(JSON.stringify({ success: false, error: resendData?.message || "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData?.id }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
