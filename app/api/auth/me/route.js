import { getRequestAuth, json } from '@/server/auth';

export const dynamic = 'force-dynamic';

/**
 * Returns the signed-in user's profile. The first call after someone signs up
 * links their Netlify Identity account to an existing (imported) profile with
 * the same email, or creates a new profile.
 */
export async function GET(request) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) return json({ user: null, profile: null }, 401);
    return json({
      user: { id: auth.uid, identityId: auth.identityUser.id, email: auth.email },
      profile: auth.profile,
      role: auth.role,
      isAdmin: auth.isAdmin,
    });
  } catch (error) {
    console.error('Failed to load the signed-in profile:', error);
    return json({ user: null, profile: null, error: 'Could not load profile' }, 500);
  }
}
