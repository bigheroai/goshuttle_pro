import 'server-only';
import { getCatalog } from './catalog';
import { QueryError } from './query';
import { RPC_POLICIES, RPC_SELF_ARGS } from './policies';

/** Calls an allow-listed database function with named arguments. */
export async function executeRpc(client, ctx, name, args = {}) {
  const access = RPC_POLICIES[name];
  if (!access) throw new QueryError(`Could not find the function public.${name}`, 404, 'PGRST202');
  if (access === 'authenticated' && !ctx.uid) throw new QueryError('Not authenticated', 401, '42501');
  if (access === 'admin' && !ctx.isAdmin) throw new QueryError('Admin access required', 403, '42501');

  const selfArg = RPC_SELF_ARGS[name];
  if (selfArg && !ctx.isAdmin && args?.[selfArg] != null && args[selfArg] !== ctx.uid) {
    throw new QueryError(`${selfArg} must be your own user id`, 403, '42501');
  }

  const catalog = await getCatalog();
  const fn = catalog.functions[name];
  if (!fn) throw new QueryError(`Could not find the function public.${name}`, 404, 'PGRST202');

  const values = [];
  const named = Object.entries(args || {}).map(([key, value]) => {
    if (!fn.arg_names.includes(key)) throw new QueryError(`Unknown argument ${key} for ${name}`, 400, 'PGRST202');
    values.push(value !== null && typeof value === 'object' && !Array.isArray(value) ? JSON.stringify(value) : value);
    return `"${key}" => $${values.length}`;
  });
  const call = `public."${name}"(${named.join(', ')})`;

  if (fn.returns_set || fn.returns_composite) {
    const res = await client.query(`SELECT to_jsonb(r) AS r FROM ${call} r`, values);
    const rows = res.rows.map((r) => r.r);
    return fn.returns_set ? rows : rows[0] ?? null;
  }
  const res = await client.query(`SELECT to_jsonb(${call}) AS v`, values);
  return res.rows[0]?.v ?? null;
}
