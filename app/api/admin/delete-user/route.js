import { admin } from '@netlify/identity';
import { getRequestAuth, json } from '@/server/auth';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Admin-only: deletes a user's profile and their Netlify Identity account(s). Body: { user_id } */
export async function POST(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);
  if (!auth.isAdmin) return json({ success: false, error: 'Forbidden: insufficient permissions' }, 403);

  const body = await request.json().catch(() => ({}));
  const userId = String(body?.user_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ success: false, error: 'user_id is required' }, 400);
  if (userId === auth.uid) return json({ success: false, error: 'You cannot delete your own account' }, 400);

  const { pool } = db();
  const links = await pool.query('SELECT identity_id FROM public.identity_links WHERE profile_id = $1', [userId]);
  try {
    await pool.query('DELETE FROM public.user_profiles WHERE id = $1', [userId]);
  } catch (err) {
    return json({ success: false, error: `Could not delete profile: ${err.message}` }, 409);
  }

  const identityIds = new Set([...links.rows.map((r) => r.identity_id), userId]);
  for (const id of identityIds) {
    try {
      await admin.deleteUser(id);
    } catch {
      // no Identity account with this id (e.g. imported user who never signed up again)
    }
  }
  return json({ success: true });
}
