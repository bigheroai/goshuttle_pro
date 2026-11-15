import 'server-only';
import { getStore } from '@netlify/blobs';

/** Buckets whose files only the uploader and admins may read (KYC/driver documents). */
export const PRIVATE_BUCKETS = new Set(['driver-documents', 'mainbucket']);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const BUCKET_NAME = /^[A-Za-z0-9_-]{1,64}$/;

export function storageStore() {
  return getStore({ name: 'storage', consistency: 'strong' });
}

export function validBucket(bucket) {
  return BUCKET_NAME.test(String(bucket || ''));
}

/** Normalizes an object path and rejects traversal or empty segments. */
export function cleanPath(path) {
  const segments = String(path || '')
    .replace(/^\/+/, '')
    .split('/')
    .filter((s) => s.length > 0);
  if (segments.length === 0 || segments.some((s) => s === '.' || s === '..' || s.length > 200)) return null;
  return segments.join('/');
}

export function blobKey(bucket, path) {
  return `${bucket}/${path}`;
}

/** Whether the caller may read (private buckets) or change an object. */
export function canAccess(auth, bucket, path, metadata, mode) {
  if (auth?.isAdmin) return true;
  if (mode === 'read' && !PRIVATE_BUCKETS.has(bucket)) return true;
  if (!auth?.uid) return false;
  if (metadata?.owner && metadata.owner === auth.uid) return true;
  return path.split('/')[0] === auth.uid;
}
