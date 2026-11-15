import { getRequestUser, json } from '@/server/supabase';

export const dynamic = 'force-dynamic';

const FROM_EMAIL = 'noreply@goshuttle.ph';

/**
 * Server-side Resend fallback for when the Supabase edge function is
 * unavailable. Requires a signed-in Supabase user so it can't be used as an
 * open mail relay. The sender address is fixed server-side.
 * Body: { to, subject, html, text?, fromName? }
 */
export async function POST(request) {
  const auth = await getRequestUser(request);
  if (!auth) return json({ success: false, error: 'Not authenticated' }, 401);

  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey) return json({ success: false, error: 'RESEND_API_KEY is not configured on the server' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const recipients = (Array.isArray(body?.to) ? body.to : [body?.to]).filter(Boolean).map(String);
  if (recipients.length === 0 || recipients.length > 10 || !body?.subject || !body?.html) {
    return json({ success: false, error: 'to (max 10), subject and html are required' }, 400);
  }

  const fromName = String(body?.fromName || 'GoShuttle Pro').replace(/[<>"]/g, '').slice(0, 80);
  const payload = {
    from: `${fromName} <${FROM_EMAIL}>`,
    to: recipients,
    subject: String(body.subject).slice(0, 300),
    html: String(body.html),
    ...(body?.text ? { text: String(body.text) } : {}),
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ success: false, error: result?.message || 'Resend API error' }, 502);
  }
  return json({ success: true, id: result?.id, from: FROM_EMAIL });
}
