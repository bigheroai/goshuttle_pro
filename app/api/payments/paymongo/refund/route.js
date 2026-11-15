import { getPaymongoSettings, paymongoRequest, secretKeyFor } from '@/server/paymongo';
import { getRequestAuth, json } from '@/server/auth';

export const dynamic = 'force-dynamic';

/** Admin-only: issue a PayMongo refund. Body: { paymentId, amountInPHP, notes } */
export async function POST(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ error: 'Not authenticated' }, 401);
  if (!auth.isAdmin) return json({ error: 'Admin access required' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const amountInPHP = Number(body?.amountInPHP);
  if (!body?.paymentId || !Number.isFinite(amountInPHP) || amountInPHP <= 0) {
    return json({ error: 'paymentId and a positive amount are required' }, 400);
  }

  const settings = await getPaymongoSettings();
  const secretKey = secretKeyFor(settings);
  if (!secretKey) return json({ error: 'PayMongo secret key is not configured' }, 400);

  try {
    const result = await paymongoRequest('/refunds', secretKey, {
      data: {
        attributes: {
          amount: Math.round(amountInPHP * 100),
          payment_id: String(body.paymentId),
          reason: 'requested_by_customer',
          notes: String(body?.notes || '').slice(0, 255),
        },
      },
    });
    return json({ refundId: result?.data?.id });
  } catch (err) {
    return json({ error: err?.message || 'PayMongo refund failed' }, 502);
  }
}
