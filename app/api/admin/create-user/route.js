import { admin } from '@netlify/identity';
import { getRequestAuth, json } from '@/server/auth';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

const ROLES = new Set([
  'admin', 'super_admin', 'corporate_manager', 'employee', 'customer', 'driver',
  'partner_fleet_manager', 'partner_fleet', 'staff', 'partner',
]);

/**
 * Admin-only: creates a confirmed Netlify Identity account plus its profile.
 * Body: { email, password, full_name, role, phone?, staff_role_id?, notes? }
 */
export async function POST(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ error: 'Not authenticated' }, 401);
  if (!auth.isAdmin) return json({ error: 'Admin access required' }, 403);

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const fullName = String(body?.full_name || '').trim() || email.split('@')[0];
  const role = String(body?.role || 'customer');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'A valid email is required' }, 400);
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);
  if (!ROLES.has(role)) return json({ error: 'Unknown role' }, 400);
  if (role === 'super_admin' && auth.role !== 'super_admin') return json({ error: 'Only a super admin can create super admins' }, 403);

  let identityUser;
  try {
    identityUser = await admin.createUser({
      email,
      password,
      data: { user_metadata: { full_name: fullName, role } },
    });
  } catch (err) {
    return json({ error: err?.message || 'Could not create the sign-in account' }, 409);
  }

  const { pool } = db();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM public.user_profiles WHERE lower(email) = $1 LIMIT 1', [email]);
    const profileId = existing.rows[0]?.id || identityUser.id;
    await client.query(
      `INSERT INTO public.user_profiles (id, email, full_name, role, phone, staff_role_id, notes, created_by_admin, is_active)
       VALUES ($1, $2, $3, $4::public.user_role, $5, $6, $7, $8, true)
       ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role,
         phone = COALESCE(EXCLUDED.phone, public.user_profiles.phone), staff_role_id = EXCLUDED.staff_role_id,
         notes = EXCLUDED.notes, is_active = true, updated_at = now()`,
      [profileId, email, fullName, role, body?.phone || null, body?.staff_role_id || null, body?.notes || null, auth.uid],
    );
    await client.query(
      `INSERT INTO public.identity_links (identity_id, profile_id, email) VALUES ($1, $2, $3)
       ON CONFLICT (identity_id) DO UPDATE SET profile_id = EXCLUDED.profile_id`,
      [identityUser.id, profileId, email],
    );
    await client.query('COMMIT');
    return json({ user: { id: profileId, email, role } }, 201);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await admin.deleteUser(identityUser.id).catch(() => {});
    return json({ error: `Could not save the profile: ${err.message}` }, 500);
  } finally {
    client.release();
  }
}
