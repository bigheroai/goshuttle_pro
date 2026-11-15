import { getRequestAuth, json } from '@/server/auth';
import { withTransaction } from '@/server/db';
import { executeQuery } from '@/server/db/query';
import { toErrorBody } from '@/server/db/errors';

export const dynamic = 'force-dynamic';

const ANON = { uid: null, isAdmin: false, role: 'anon', active: true };

/** Data API used by the browser client in place of Supabase's REST API. */
export async function POST(request) {
  let spec;
  try {
    spec = await request.json();
  } catch {
    return json({ data: null, count: null, error: { message: 'Invalid JSON body', code: 'PGRST100' } }, 400);
  }
  try {
    const auth = (await getRequestAuth(request)) || ANON;
    const result = await withTransaction(auth.uid, (client) => executeQuery(client, auth, spec));
    return json({ data: result.data, count: result.count ?? null, error: null });
  } catch (error) {
    const { status, body } = toErrorBody(error);
    return json({ data: null, count: null, error: body }, status);
  }
}
