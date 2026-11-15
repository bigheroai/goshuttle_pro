import { getRequestAuth } from '@/server/auth';
import { PRIVATE_BUCKETS, blobKey, canAccess, cleanPath, storageStore, validBucket } from '@/server/storage';

export const dynamic = 'force-dynamic';

/** Serves a stored file. Private buckets require the uploader or an admin (via the sign-in cookie). */
export async function GET(request, { params }) {
  const { bucket, path: segments } = await params;
  const path = cleanPath((segments || []).map((s) => decodeURIComponent(s)).join('/'));
  if (!validBucket(bucket) || !path) return new Response('Not found', { status: 404 });

  const store = storageStore();
  const entry = await store.getWithMetadata(blobKey(bucket, path), { type: 'arrayBuffer' });
  if (!entry) return new Response('Not found', { status: 404 });

  const isPrivate = PRIVATE_BUCKETS.has(bucket);
  if (isPrivate) {
    const auth = await getRequestAuth(request);
    if (!canAccess(auth, bucket, path, entry.metadata, 'read')) return new Response('Forbidden', { status: 403 });
  }

  const contentType = entry.metadata?.contentType || 'application/octet-stream';
  const inline = /^(image\/(png|jpe?g|gif|webp|avif)|application\/pdf)$/.test(contentType);
  return new Response(entry.data, {
    headers: {
      'Content-Type': inline ? contentType : 'application/octet-stream',
      'Content-Disposition': inline ? 'inline' : `attachment; filename="${path.split('/').pop().replace(/"/g, '')}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=300',
    },
  });
}
