import 'server-only';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function bearerToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
}

/**
 * Supabase client for server code. Uses SUPABASE_SERVICE_ROLE_KEY when it is
 * configured (so secrets can be read even after RLS is tightened), otherwise
 * falls back to the anon key, optionally acting as the calling user.
 */
export function serverSupabase(accessToken) {
  assertConfigured();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || SUPABASE_ANON_KEY;
  const headers = !serviceKey && accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: headers ? { headers } : undefined,
  });
}

/** Client that always acts as the calling user (respects RLS). */
export function userSupabase(accessToken) {
  assertConfigured();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Returns the authenticated Supabase user for the request, or null. */
export async function getRequestUser(request) {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const { data, error } = await userSupabase(token).auth.getUser(token);
    if (error || !data?.user) return null;
    return { user: data.user, token };
  } catch {
    return null;
  }
}

export async function isAdmin(token) {
  try {
    const { data, error } = await userSupabase(token).rpc('is_admin_from_auth');
    return !error && data === true;
  } catch {
    return false;
  }
}

export function json(body, status = 200) {
  return Response.json(body, { status });
}
