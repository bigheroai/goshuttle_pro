import 'server-only';
import { getDatabase } from '@netlify/database';

let connection;

/** Shared Netlify Database connection (pool + tagged-template sql). */
export function db() {
  if (!connection) connection = getDatabase();
  return connection;
}

/**
 * Runs fn(client) inside a transaction with app.user_id set to the caller's
 * profile id, so database functions that call auth.uid() see the right user.
 */
export async function withTransaction(userId, fn) {
  const client = await db().pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId || '']);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // connection already broken; the original error matters more
    }
    throw error;
  } finally {
    client.release();
  }
}
