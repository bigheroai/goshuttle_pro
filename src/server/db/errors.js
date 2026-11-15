import 'server-only';
import { QueryError } from './query';

/** Maps query and Postgres errors to a Supabase-shaped { message, code, details, hint } body. */
export function toErrorBody(error) {
  if (error instanceof QueryError) {
    return { status: error.status, body: { message: error.message, code: error.code, details: null, hint: null } };
  }
  if (error?.code && typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
    const status = error.code === '42501' ? 403 : error.code.startsWith('23') ? 409 : 400;
    return {
      status,
      body: { message: error.message, code: error.code, details: error.detail || null, hint: error.hint || null },
    };
  }
  console.error('Data API error:', error);
  return { status: 500, body: { message: 'Internal server error', code: 'INTERNAL', details: null, hint: null } };
}
