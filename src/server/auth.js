import 'server-only';
import { db } from './db';

export const ADMIN_ROLES = new Set(['admin', 'super_admin', 'superadmin']);

/** Roles a person may pick for themselves at signup. Everything else is granted by an admin. */
const SELF_SERVICE_ROLES = new Set(['customer', 'driver', 'partner', 'partner_fleet']);

/**
 * Accounts that receive a fixed role the first time they sign in, so the
 * demo/bootstrap accounts work without anyone editing the database. The
 * password is whatever the person chose at signup; it is never stored here.
 * Extra entries can be supplied as BOOTSTRAP_ROLE_EMAILS="a@x.com:admin,b@y.com:staff".
 */
const BOOTSTRAP_ROLES = {
  'admin@goshuttlepro.com': 'admin',
  'manager@techcorp.com': 'corporate_manager',
  'customer@email.com': 'customer',
};

function bootstrapRoleFor(email) {
  const extra = Object.fromEntries(
    String(process.env.BOOTSTRAP_ROLE_EMAILS || '')
      .split(',')
      .map((pair) => pair.trim().split(':').map((s) => s.trim().toLowerCase()))
      .filter(([e, r]) => e && r),
  );
  return extra[email] || BOOTSTRAP_ROLES[email] || null;
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function bearerToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : readCookie(request, 'nf_jwt');
}

function identityEndpoint() {
  const base = process.env.URL || globalThis.Netlify?.context?.url;
  return base ? new URL('/.netlify/identity', base).href : null;
}

const tokenCache = new Map();
const TOKEN_CACHE_MS = 30 * 1000;

/** Verifies an Identity access token by asking the site's Identity service who it belongs to. */
async function verifyToken(token) {
  const hit = tokenCache.get(token);
  if (hit && hit.expires > Date.now()) return hit.user;
  const endpoint = identityEndpoint();
  if (!endpoint) return null;
  try {
    const res = await fetch(`${endpoint}/user`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const user = await res.json();
    if (!user?.id || !user?.email || !user?.confirmed_at) return null;
    if (tokenCache.size > 500) tokenCache.clear();
    tokenCache.set(token, { user, expires: Date.now() + TOKEN_CACHE_MS });
    return user;
  } catch {
    return null;
  }
}

/**
 * Finds (or creates) the user_profiles row for an Identity user.
 * Profiles imported from Supabase are matched by email the first time that
 * person signs up again, and the link is remembered in identity_links.
 */
async function resolveProfile(identityUser) {
  const { pool } = db();
  const email = String(identityUser.email).trim().toLowerCase();

  const linked = await pool.query(
    `SELECT p.* FROM public.identity_links l JOIN public.user_profiles p ON p.id = l.profile_id
     WHERE l.identity_id = $1`,
    [identityUser.id],
  );
  if (linked.rows[0]) return linked.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let profile = (
      await client.query(
        `SELECT * FROM public.user_profiles WHERE lower(email) = $1
         ORDER BY (id = $2) DESC, created_at ASC LIMIT 1`,
        [email, identityUser.id],
      )
    ).rows[0];

    const bootstrapRole = bootstrapRoleFor(email);
    if (!profile) {
      const meta = identityUser.user_metadata || {};
      const requested = String(meta.role || '').toLowerCase();
      const role = bootstrapRole || (SELF_SERVICE_ROLES.has(requested) ? requested : 'customer');
      profile = (
        await client.query(
          `INSERT INTO public.user_profiles (id, email, full_name, phone, role, is_active)
           VALUES ($1, $2, $3, $4, $5::public.user_role, true)
           ON CONFLICT (id) DO UPDATE SET updated_at = now()
           RETURNING *`,
          [identityUser.id, email, meta.full_name || meta.name || email.split('@')[0], meta.phone || null, role],
        )
      ).rows[0];
    } else if (bootstrapRole && profile.role !== bootstrapRole && !ADMIN_ROLES.has(profile.role)) {
      profile = (
        await client.query(
          `UPDATE public.user_profiles SET role = $2::public.user_role, updated_at = now() WHERE id = $1 RETURNING *`,
          [profile.id, bootstrapRole],
        )
      ).rows[0];
    }

    await client.query(
      `INSERT INTO public.identity_links (identity_id, profile_id, email) VALUES ($1, $2, $3)
       ON CONFLICT (identity_id) DO NOTHING`,
      [identityUser.id, profile.id, email],
    );
    await client.query('COMMIT');
    return profile;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Returns the caller's verified identity and profile, or null when the request
 * carries no valid Identity token. `uid` is the profile id used throughout the
 * database (for imported users it is their original Supabase id).
 */
export async function getRequestAuth(request) {
  const token = bearerToken(request);
  if (!token) return null;
  const identityUser = await verifyToken(token);
  if (!identityUser) return null;
  const profile = await resolveProfile(identityUser);
  if (!profile) return null;
  const role = String(profile.role || 'customer');
  const active = profile.is_active !== false && profile.is_suspended !== true;
  return {
    token,
    identityUser,
    profile,
    uid: profile.id,
    email: profile.email,
    role,
    active,
    isAdmin: active && ADMIN_ROLES.has(role),
  };
}

export function json(body, status = 200) {
  return Response.json(body, { status });
}
