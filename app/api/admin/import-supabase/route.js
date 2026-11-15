import { getRequestAuth, json } from '@/server/auth';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Admin-only: status of the most recent Supabase imports. */
export async function GET(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ error: 'Not authenticated' }, 401);
  if (!auth.isAdmin) return json({ error: 'Admin access required' }, 403);
  const { rows } = await db().pool.query(
    'SELECT id, status, started_at, finished_at, summary FROM public.data_import_runs ORDER BY started_at DESC LIMIT 5',
  );
  return json({ runs: rows });
}

/**
 * Admin-only: starts a one-time copy of all Supabase tables and files into
 * Netlify Database and Netlify Blobs. Existing rows are kept, so it is safe to
 * run again (for example right before switching over for good).
 */
export async function POST(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ error: 'Not authenticated' }, 401);
  if (!auth.isAdmin) return json({ error: 'Admin access required' }, 403);

  const { pool } = db();
  const running = await pool.query(
    "SELECT id FROM public.data_import_runs WHERE status IN ('queued', 'running') AND started_at > now() - interval '20 minutes' LIMIT 1",
  );
  if (running.rowCount) return json({ error: 'An import is already in progress', runId: running.rows[0].id }, 409);

  const { rows } = await pool.query(
    "INSERT INTO public.data_import_runs (started_by, status) VALUES ($1, 'queued') RETURNING id",
    [auth.uid],
  );
  const runId = rows[0].id;

  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/.netlify/functions/import-supabase-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId }),
  });
  if (res.status !== 202 && !res.ok) {
    await pool.query("UPDATE public.data_import_runs SET status = 'failed', finished_at = now() WHERE id = $1", [runId]);
    return json({ error: `Could not start the import (${res.status})` }, 502);
  }
  return json({ runId, status: 'queued' }, 202);
}
