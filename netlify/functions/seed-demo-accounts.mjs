/*
 * Creates the built-in demo accounts as confirmed Netlify Identity users and
 * links each one to a user_profiles row with the right role.
 *
 * The demo emails use domains nobody can receive mail on, so the normal
 * "sign up and confirm your email" flow can never finish for them.
 *
 * Runs automatically after every successful deploy, and on demand at
 * /.netlify/functions/seed-demo-accounts. Safe to repeat: an existing account
 * is never recreated and its password is never changed.
 *
 * Passwords come from environment variables (never from the public repo).
 * An account whose variable is unset is skipped.
 */
import { admin } from '@netlify/identity';
import { getDatabase } from '@netlify/database';

const DEMO_ACCOUNTS = [
  { email: 'admin@goshuttlepro.com', role: 'admin', fullName: 'GoShuttle Admin', passwordVar: 'DEMO_ADMIN_PASSWORD' },
  { email: 'manager@techcorp.com', role: 'corporate_manager', fullName: 'TechCorp Manager', passwordVar: 'DEMO_MANAGER_PASSWORD' },
  { email: 'customer@email.com', role: 'customer', fullName: 'Demo Customer', passwordVar: 'DEMO_CUSTOMER_PASSWORD' },
];

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'superadmin']);

function env(name) {
  return globalThis.Netlify?.env?.get(name) ?? process.env[name];
}

async function findIdentityUser(email) {
  for (let page = 1; page <= 50; page++) {
    const users = await admin.listUsers({ page, perPage: 100 });
    const hit = users.find((u) => String(u.email || '').toLowerCase() === email);
    if (hit) return hit;
    if (users.length < 100) return null;
  }
  return null;
}

async function linkProfile(pool, identityUser, account) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = (
      await client.query(
        `SELECT id, role FROM public.user_profiles WHERE lower(email) = $1
         ORDER BY (id = $2) DESC, created_at ASC LIMIT 1`,
        [account.email, identityUser.id],
      )
    ).rows[0];
    const profileId = existing?.id || identityUser.id;
    // Keep an imported admin/super_admin role; otherwise enforce the demo role.
    const role = existing && ADMIN_ROLES.has(existing.role) && ADMIN_ROLES.has(account.role) ? existing.role : account.role;
    await client.query(
      `INSERT INTO public.user_profiles (id, email, full_name, role, is_active, is_suspended)
       VALUES ($1, $2, $3, $4::public.user_role, true, false)
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = true, is_suspended = false, updated_at = now()`,
      [profileId, account.email, account.fullName, role],
    );
    await client.query(
      `INSERT INTO public.identity_links (identity_id, profile_id, email) VALUES ($1, $2, $3)
       ON CONFLICT (identity_id) DO UPDATE SET profile_id = EXCLUDED.profile_id, email = EXCLUDED.email`,
      [identityUser.id, profileId, account.email],
    );
    await client.query('COMMIT');
    return { profileId, role };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function seed() {
  const { pool } = getDatabase();
  const results = [];
  for (const account of DEMO_ACCOUNTS) {
    const password = env(account.passwordVar);
    try {
      let identityUser = await findIdentityUser(account.email);
      let status = 'exists';
      if (!identityUser) {
        if (!password) {
          results.push({ email: account.email, status: `skipped: ${account.passwordVar} is not set` });
          continue;
        }
        identityUser = await admin.createUser({
          email: account.email,
          password,
          data: { user_metadata: { full_name: account.fullName, role: account.role } },
        });
        status = 'created';
      } else if (!identityUser.confirmedAt && !identityUser.confirmed_at) {
        // An earlier self-signup that could never be confirmed (the domain is
        // fake), so nobody can have used it: confirm it and give it the demo password.
        await admin.updateUser(identityUser.id, password ? { confirm: true, password } : { confirm: true });
        status = 'confirmed';
      }
      const { role } = await linkProfile(pool, identityUser, account);
      results.push({ email: account.email, status, role });
    } catch (error) {
      results.push({ email: account.email, status: 'error', error: error?.message || String(error) });
    }
  }
  console.log('[seed-demo-accounts]', JSON.stringify(results));
  return results;
}

export default {
  async fetch() {
    const results = await seed();
    // Report status only; never echo passwords.
    return Response.json({ results });
  },
  async deploySucceeded() {
    await seed();
  },
};
