import { getPaymongoSettings, paymongoRequest, secretKeyFor } from '@/server/paymongo';
import { json } from '@/server/auth';

export const dynamic = 'force-dynamic';

const SOURCE_TYPES = new Set(['gcash', 'paymaya', 'grab_pay', 'qrph', 'dob', 'billease']);
const MAX_AMOUNT_PHP = 1_000_000;

/** Only allow redirect URLs on this site, to prevent open redirects. */
function sameOriginUrl(candidate, origin) {
  if (!candidate) return null;
  try {
    const url = new URL(candidate, origin);
    return url.origin === origin ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Creates PayMongo checkout objects server-side so the secret key never
 * reaches the browser.
 * Body: { kind: 'link' | 'source' | 'intent', amountInPHP, description, bookingRef, type, successUrl, cancelUrl }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const amountInPHP = Number(body?.amountInPHP);
  if (!Number.isFinite(amountInPHP) || amountInPHP <= 0 || amountInPHP > MAX_AMOUNT_PHP) {
    return json({ error: 'Invalid amount' }, 400);
  }

  const settings = await getPaymongoSettings();
  if (!settings?.enabled) return json({ error: 'PayMongo is not enabled' }, 400);
  const secretKey = secretKeyFor(settings);
  if (!secretKey) return json({ error: 'PayMongo secret key is not configured' }, 500);

  const origin = new URL(request.url).origin;
  const successUrl =
    sameOriginUrl(body?.successUrl, origin) || settings.success_url || `${origin}/booking-confirmed`;
  const failedUrl =
    sameOriginUrl(body?.cancelUrl || body?.failedUrl, origin) ||
    settings.cancel_url ||
    `${origin}/smart-booking-portal`;

  const amount = Math.round(amountInPHP * 100);
  const description = String(body?.description || settings.checkout_description || 'GoShuttle Booking Payment').slice(0, 255);
  const bookingRef = String(body?.bookingRef || '').slice(0, 255);

  try {
    switch (body?.kind) {
      case 'link': {
        const result = await paymongoRequest('/links', secretKey, {
          data: {
            attributes: {
              amount,
              currency: 'PHP',
              description,
              remarks: bookingRef,
              redirect: { success: successUrl, failed: failedUrl },
            },
          },
        });
        return json({
          checkoutUrl: result?.data?.attributes?.checkout_url,
          paymentLinkId: result?.data?.id,
          referenceNumber: result?.data?.attributes?.reference_number,
        });
      }
      case 'source': {
        if (!SOURCE_TYPES.has(body?.type)) return json({ error: 'Unsupported payment method' }, 400);
        const result = await paymongoRequest('/sources', secretKey, {
          data: {
            attributes: {
              amount,
              currency: 'PHP',
              type: body.type,
              description,
              redirect: { success: successUrl, failed: failedUrl },
              billing: { name: bookingRef || 'GoShuttle Customer' },
            },
          },
        });
        return json({
          redirectUrl: result?.data?.attributes?.redirect?.checkout_url,
          sourceId: result?.data?.id,
        });
      }
      case 'intent': {
        const result = await paymongoRequest('/payment_intents', secretKey, {
          data: {
            attributes: {
              amount,
              currency: 'PHP',
              payment_method_allowed: ['card'],
              description,
              statement_descriptor: settings.statement_descriptor || 'GOSHUTTLE',
              capture_type: 'automatic',
            },
          },
        });
        return json({
          clientKey: result?.data?.attributes?.client_key,
          paymentIntentId: result?.data?.id,
        });
      }
      default:
        return json({ error: 'Unknown checkout kind' }, 400);
    }
  } catch (err) {
    return json({ error: err?.message || 'PayMongo request failed' }, 502);
  }
}
