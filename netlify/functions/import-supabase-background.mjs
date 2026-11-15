/*
 * One-time copy of the old Supabase project into Netlify Database + Blobs.
 *
 * Started by an admin through POST /api/admin/import-supabase, which creates a
 * `queued` row in data_import_runs and calls this background function with
 * that run id. Re-running is safe: rows that already exist (same id) are kept.
 *
 * Needs SUPABASE_DATABASE_URL (Postgres connection string) for data, and
 * SUPABASE_SERVICE_ROLE_KEY for files.
 */
import pg from 'pg';
import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';

const BATCH = 500;
const SKIP_TABLES = new Set(['identity_links', 'data_import_runs']);

function supabaseUrl() {
  const explicit = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    const url = new URL(process.env.SUPABASE_DATABASE_URL);
    const direct = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (direct) return `https://${direct[1]}.supabase.co`;
    const pooled = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]+)$/);
    if (pooled) return `https://${pooled[1]}.supabase.co`;
  } catch {
    // fall through
  }
  return null;
}

/** Points old Supabase storage URLs at this site's storage route. */
function makeUrlRewriter(baseUrl) {
  if (!baseUrl) return (v) => v;
  const escaped = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escaped}/storage/v1/object/(?:public|sign|authenticated)/`, 'g');
  return (value) => (typeof value === 'string' && value.includes('/storage/v1/object/') ? value.replace(pattern, '/api/storage/object/') : value);
}

async function targetCatalog(pool) {
  const cols = await pool.query(`
    SELECT table_name, column_name, udt_name, data_type, is_nullable = 'YES' AS nullable
    FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`);
  const fks = await pool.query(`
    SELECT src.relname AS table_name, tgt.relname AS ref_table, a.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_class tgt ON tgt.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = src.relnamespace AND n.nspname = 'public'
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
    WHERE con.contype = 'f'`);
  const tables = {};
  for (const c of cols.rows) {
    tables[c.table_name] ??= { columns: {}, fkColumns: new Set(), requiredRefs: new Set() };
    tables[c.table_name].columns[c.column_name] = c;
  }
  for (const fk of fks.rows) {
    const t = tables[fk.table_name];
    if (!t) continue;
    t.fkColumns.add(fk.column_name);
    if (!t.columns[fk.column_name]?.nullable && fk.ref_table !== fk.table_name) t.requiredRefs.add(fk.ref_table);
  }
  return tables;
}

/** Orders tables so that NOT NULL foreign keys point at tables loaded earlier. */
function loadOrder(tables) {
  const order = [];
  const seen = new Set();
  const visit = (name, stack = new Set()) => {
    if (seen.has(name) || stack.has(name)) return;
    stack.add(name);
    for (const ref of tables[name]?.requiredRefs || []) if (tables[ref]) visit(ref, stack);
    seen.add(name);
    order.push(name);
  };
  Object.keys(tables).sort().forEach((t) => visit(t));
  return order;
}

function encode(column, value, rewrite) {
  if (value === null || value === undefined) return null;
  if (column.udt_name === 'json' || column.udt_name === 'jsonb') {
    return rewrite(JSON.stringify(value));
  }
  return rewrite(value);
}

async function copyTable(source, target, name, meta, rewrite) {
  const exists = await source.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
    [name],
  );
  if (!exists.rowCount) return { skipped: 'not in Supabase' };

  const sourceCols = new Set(
    (await source.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1", [name])).rows.map(
      (r) => r.column_name,
    ),
  );
  const columns = Object.keys(meta.columns).filter((c) => sourceCols.has(c));
  if (!columns.includes('id')) return { skipped: 'no id column' };
  // Nullable foreign keys are filled in a second pass so load order never matters.
  const deferred = columns.filter((c) => meta.fkColumns.has(c) && meta.columns[c].nullable);
  const quoted = columns.map((c) => `"${c}"`).join(', ');

  let inserted = 0;
  let failed = 0;
  let firstError = null;
  const deferredRows = [];

  for (let offset = 0; ; offset += BATCH) {
    const { rows } = await source.query(`SELECT ${quoted} FROM public."${name}" ORDER BY "id" LIMIT ${BATCH} OFFSET ${offset}`);
    if (rows.length === 0) break;

    for (const row of rows) {
      if (name === 'user_profiles' && row.email) {
        await mergeEarlySignup(target, row).catch((err) => {
          firstError ??= err.message;
        });
      }
      const values = columns.map((c) => (deferred.includes(c) ? null : encode(meta.columns[c], row[c], rewrite)));
      const placeholders = columns.map((c, i) => {
        const udt = meta.columns[c].udt_name;
        return udt === 'json' || udt === 'jsonb' ? `$${i + 1}::jsonb` : `$${i + 1}`;
      });
      try {
        const res = await target.query(
          `INSERT INTO public."${name}" (${quoted}) VALUES (${placeholders.join(', ')}) ON CONFLICT ("id") DO NOTHING`,
          values,
        );
        inserted += res.rowCount;
        if (deferred.some((c) => row[c] != null)) deferredRows.push(row);
      } catch (err) {
        failed += 1;
        firstError ??= err.message;
      }
    }
    if (rows.length < BATCH) break;
  }
  return { inserted, failed, firstError, deferred, deferredRows };
}

/**
 * Someone (usually the admin) may have signed up on Netlify before the import
 * ran, which created a fresh profile with the same email. Move their sign-in
 * link over to the imported profile so they get their history, keep any admin
 * role they already had, and retire the temporary profile.
 */
async function mergeEarlySignup(target, row) {
  const existing = await target.query(
    'SELECT id, role FROM public.user_profiles WHERE lower(email) = lower($1) AND id <> $2 LIMIT 1',
    [row.email, row.id],
  );
  if (!existing.rowCount) return;
  const early = existing.rows[0];
  await target.query(
    "UPDATE public.user_profiles SET email = email || '.replaced-' || id::text, is_active = false WHERE id = $1",
    [early.id],
  );
  if (['admin', 'super_admin'].includes(early.role)) row.role = early.role;
  pendingLinkMoves.push({ from: early.id, to: row.id });
}

const pendingLinkMoves = [];

async function applyLinkMoves(target) {
  for (const move of pendingLinkMoves.splice(0)) {
    await target.query('UPDATE public.identity_links SET profile_id = $2 WHERE profile_id = $1', [move.from, move.to]).catch(() => {});
    await target.query('DELETE FROM public.user_profiles WHERE id = $1', [move.from]).catch(() => {});
  }
}

async function fillDeferred(target, name, result) {
  let updated = 0;
  let failed = 0;
  for (const row of result.deferredRows || []) {
    const cols = result.deferred.filter((c) => row[c] != null);
    if (cols.length === 0) continue;
    try {
      await target.query(
        `UPDATE public."${name}" SET ${cols.map((c, i) => `"${c}" = $${i + 1}`).join(', ')} WHERE "id" = $${cols.length + 1}`,
        [...cols.map((c) => row[c]), row.id],
      );
      updated += 1;
    } catch (err) {
      // One reference is missing (e.g. a Supabase auth user who never had a
      // profile). Keep the references that do resolve and leave that one empty.
      result.firstError ??= err.message;
      failed += 1;
      for (const c of cols) {
        await target.query(`UPDATE public."${name}" SET "${c}" = $1 WHERE "id" = $2`, [row[c], row.id]).catch(() => {});
      }
    }
  }
  return { updated, failed };
}

async function copyFiles(baseUrl, serviceKey, summary) {
  if (!baseUrl || !serviceKey) {
    summary.files = { skipped: 'SUPABASE_SERVICE_ROLE_KEY or Supabase URL not available' };
    return;
  }
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const store = getStore({ name: 'storage', consistency: 'strong' });
  const bucketsRes = await fetch(`${baseUrl}/storage/v1/bucket`, { headers });
  if (!bucketsRes.ok) {
    summary.files = { error: `Could not list buckets (${bucketsRes.status})` };
    return;
  }
  const buckets = await bucketsRes.json();
  const files = { copied: 0, failed: 0, buckets: {} };

  const walk = async (bucket, prefix) => {
    for (let offset = 0; ; offset += 100) {
      const res = await fetch(`${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
      });
      if (!res.ok) return;
      const entries = await res.json();
      for (const entry of entries) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!entry.id) {
          await walk(bucket, path);
          continue;
        }
        try {
          const key = `${bucket}/${path}`;
          if (await store.getMetadata(key)) continue;
          const file = await fetch(
            `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
            { headers },
          );
          if (!file.ok) throw new Error(`HTTP ${file.status}`);
          const owner = entry.owner || path.split('/')[0];
          await store.set(key, await file.arrayBuffer(), {
            metadata: {
              contentType: entry.metadata?.mimetype || file.headers.get('content-type') || 'application/octet-stream',
              owner,
              size: entry.metadata?.size,
              importedAt: new Date().toISOString(),
            },
          });
          files.copied += 1;
          files.buckets[bucket] = (files.buckets[bucket] || 0) + 1;
        } catch {
          files.failed += 1;
        }
      }
      if (entries.length < 100) return;
    }
  };

  for (const bucket of buckets) await walk(bucket.id || bucket.name, '');
  summary.files = files;
}

export default async (req) => {
  const { pool } = getDatabase();
  const body = await req.json().catch(() => ({}));
  const runId = String(body?.runId || '');

  const claimed = await pool.query(
    `UPDATE public.data_import_runs SET status = 'running'
     WHERE id::text = $1 AND status = 'queued' AND started_at > now() - interval '10 minutes'
     RETURNING id`,
    [runId],
  );
  if (!claimed.rowCount) return;

  const summary = { tables: {} };
  let status = 'completed';
  const source = new pg.Client({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  const target = await pool.connect();

  try {
    if (!process.env.SUPABASE_DATABASE_URL) throw new Error('SUPABASE_DATABASE_URL is not set');
    await source.connect();
    const baseUrl = supabaseUrl();
    const rewrite = makeUrlRewriter(baseUrl);
    const tables = await targetCatalog(pool);
    const order = loadOrder(tables).filter((t) => !SKIP_TABLES.has(t));

    const results = {};
    for (const name of order) {
      results[name] = await copyTable(source, target, name, tables[name], rewrite);
      if (name === 'user_profiles') await applyLinkMoves(target);
    }
    for (const name of order) {
      const r = results[name];
      const deferredResult = r.deferredRows ? await fillDeferred(target, name, r) : null;
      summary.tables[name] = r.skipped
        ? { skipped: r.skipped }
        : {
            inserted: r.inserted,
            failed: r.failed + (deferredResult?.failed || 0),
            ...(r.firstError ? { firstError: String(r.firstError).slice(0, 300) } : {}),
          };
    }

    await copyFiles(baseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, summary);
  } catch (err) {
    status = 'failed';
    summary.error = String(err?.message || err).slice(0, 500);
  } finally {
    await source.end().catch(() => {});
    target.release();
    await pool.query(
      `UPDATE public.data_import_runs SET status = $2, summary = $3::jsonb, finished_at = now() WHERE id::text = $1`,
      [runId, status, JSON.stringify(summary)],
    );
  }
};
