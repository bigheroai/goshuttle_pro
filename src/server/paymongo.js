import 'server-only';
import { serverSupabase } from './supabase';

const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

export async function getPaymongoSettings(accessToken) {
  try {
    const { data, error } = await serverSupabase(accessToken)
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'paymongo_gateway_settings')
      .single();
    if (error || !data) return null;
    return data.setting_value;
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
