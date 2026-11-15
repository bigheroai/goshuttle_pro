import 'server-only';
import { db } from './db';

/** Reads PayMongo settings (including secret keys) from Netlify Database. Server-only. */
export async function getPaymongoSettings() {
  try {
    const { rows } = await db().pool.query(
      "SELECT setting_value FROM public.app_settings WHERE setting_key = 'paymongo_gateway_settings' LIMIT 1",
    );
    return rows[0]?.setting_value ?? null;
  } catch (err) {
    console.error('Failed to load PayMongo settings:', err?.message || err);
    return null;
  }
}

export function secretKeyFor(settings) {
  if (!settings) return null;
  return (settings.mode || 'test') === 'live' ? settings.secret_key_live : settings.secret_key_test;
}

export async function paymongoRequest(path, secretKey, payload) {
  const response = await fetch(`${PAYMONGO_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64'),
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(result?.errors?.[0]?.detail || `PayMongo API error (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return result;
}

/** Strip secret keys so settings can be safely returned to the browser. */
export function publicSettings(settings) {
  if (!settings) return null;
  // eslint-disable-next-line no-unused-vars
  const { secret_key_live, secret_key_test, webhook_secret, webhook_secret_live, webhook_secret_test, ...rest } = settings;
  return rest;
}
