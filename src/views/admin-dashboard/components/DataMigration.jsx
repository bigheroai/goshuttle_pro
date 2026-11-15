import React, { useCallback, useEffect, useState } from 'react';

function authHeaders() {
  const token = typeof document !== 'undefined'
    ? document.cookie.split('; ').find((c) => c.startsWith('nf_jwt='))?.slice(7)
    : null;
  return token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {};
}

/** Admin tool: copy all data and files from the old Supabase project into Netlify. */
export default function DataMigration() {
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/import-supabase', { credentials: 'same-origin', headers: authHeaders() });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
      setRuns(body.runs || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!runs.some((r) => r.status === 'queued' || r.status === 'running')) return undefined;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [runs, load]);

  const start = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/import-supabase', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const busy = runs.some((r) => r.status === 'queued' || r.status === 'running');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Import from Supabase</h2>
        <p className="mt-2 text-sm text-gray-600">
          Copies every table and uploaded file from the old Supabase project into Netlify Database and Netlify Blobs.
          Records that were already copied are left alone, so it is safe to run again, for example right before the final switch-over.
          Old Supabase file links are rewritten to point at this site.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Passwords cannot be copied. Existing users sign up again with the same email, and the app reconnects them to their profile, role and history.
        </p>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button
          type="button"
          onClick={start}
          disabled={starting || busy}
          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Import running…' : starting ? 'Starting…' : 'Start import'}
        </button>
      </div>

      {runs.map((run) => (
        <div key={run.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              {new Date(run.started_at).toLocaleString()} · <span className="uppercase">{run.status}</span>
            </p>
            {run.finished_at && <p className="text-xs text-gray-500">Finished {new Date(run.finished_at).toLocaleString()}</p>}
          </div>
          {run.summary?.error && <p className="mt-2 text-sm text-red-700">{run.summary.error}</p>}
          {run.summary?.tables && (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">Table</th>
                  <th className="py-1">Copied</th>
                  <th className="py-1">Failed</th>
                  <th className="py-1">Note</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(run.summary.tables).map(([name, t]) => (
                  <tr key={name} className="border-t border-gray-100">
                    <td className="py-1 font-mono text-xs">{name}</td>
                    <td className="py-1">{t.inserted ?? '—'}</td>
                    <td className="py-1">{t.failed ?? '—'}</td>
                    <td className="py-1 text-xs text-gray-500">{t.skipped || t.firstError || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {run.summary?.files && (
            <p className="mt-3 text-sm text-gray-600">
              Files: {run.summary.files.copied ?? 0} copied, {run.summary.files.failed ?? 0} failed
              {run.summary.files.skipped ? ` (${run.summary.files.skipped})` : ''}
              {run.summary.files.error ? ` (${run.summary.files.error})` : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
