import { getRequestAuth, json } from '@/server/auth';
import { withTransaction } from '@/server/db';
import { executeRpc } from '@/server/db/rpc';
import { toErrorBody } from '@/server/db/errors';

export const dynamic = 'force-dynamic';

const ANON = { uid: null, isAdmin: false, role: 'anon', active: true };

/** Calls an allow-listed database function (replacement for supabase.rpc). */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ data: null, error: { message: 'Invalid JSON body', code: 'PGRST100' } }, 400);
  }
  try {
    const auth = (await getRequestAuth(request)) || ANON;
    const data = await withTransaction(auth.uid, (client) =>
      executeRpc(client, auth, String(body?.fn || ''), body?.args),
    );
    return json({ data, error: null });
  } catch (error) {
    const { status, body: errorBody } = toErrorBody(error);
    return json({ data: null, error: errorBody }, status);
  }
}
