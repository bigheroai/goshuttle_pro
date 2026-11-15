import { getRequestAuth, json } from '@/server/auth';
import { blobKey, canAccess, cleanPath, storageStore, validBucket } from '@/server/storage';

export const dynamic = 'force-dynamic';

/** Deletes files the caller uploaded (admins may delete any). */
export async function POST(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ data: null, error: { message: 'Not authenticated' } }, 401);
  const body = await request.json().catch(() => ({}));
  const bucket = String(body?.bucket || '');
  if (!validBucket(bucket)) return json({ data: null, error: { message: 'Invalid bucket' } }, 400);

  const store = storageStore();
  const removed = [];
  for (const raw of (Array.isArray(body?.paths) ? body.paths : []).slice(0, 100)) {
    const path = cleanPath(raw);
    if (!path) continue;
    const key = blobKey(bucket, path);
    const meta = await store.getMetadata(key);
    if (!meta) continue;
    if (!canAccess(auth, bucket, path, meta.metadata, 'write')) {
      return json({ data: null, error: { message: `Not allowed to delete ${path}` } }, 403);
    }
    await store.delete(key);
    removed.push({ name: path, bucket_id: bucket });
  }
  return json({ data: removed, error: null });
}
