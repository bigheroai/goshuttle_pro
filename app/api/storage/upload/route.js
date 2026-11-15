import { getRequestAuth, json } from '@/server/auth';
import { MAX_UPLOAD_BYTES, blobKey, canAccess, cleanPath, storageStore, validBucket } from '@/server/storage';

export const dynamic = 'force-dynamic';

/** Uploads a file into a bucket (Netlify Blobs). Signed-in users only. */
export async function POST(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ error: 'Sign in to upload files' }, 401);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Expected multipart form data' }, 400);
  }
  const bucket = String(form.get('bucket') || '');
  const path = cleanPath(form.get('path'));
  const file = form.get('file');
  if (!validBucket(bucket) || !path) return json({ error: 'Invalid bucket or path' }, 400);
  if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'No file provided' }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: 'File is larger than 10 MB' }, 413);

  const store = storageStore();
  const key = blobKey(bucket, path);
  const existing = await store.getMetadata(key);
  if (existing) {
    if (form.get('upsert') !== 'true') return json({ error: 'The resource already exists' }, 409);
    if (!canAccess(auth, bucket, path, existing.metadata, 'write')) return json({ error: 'Not allowed to replace this file' }, 403);
  }

  const contentType = String(form.get('contentType') || file.type || 'application/octet-stream').slice(0, 100);
  await store.set(key, await file.arrayBuffer(), {
    metadata: { contentType, owner: auth.uid, size: file.size, uploadedAt: new Date().toISOString() },
  });
  return json({ path, bucket });
}
