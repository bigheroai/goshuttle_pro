import 'server-only';
import { getCatalog, isJsonColumn, isArrayColumn } from './catalog';
import { POLICIES } from './policies';

/*
 * Translates the Supabase-style query descriptions sent by the browser client
 * (src/lib/supabase.js) into parameterized SQL against Netlify Database.
 *
 * Safety model:
 *  - Table, column and relation names are only used if they exist in the
 *    database catalog, and are always double-quoted.
 *  - Every value is passed as a bind parameter.
 *  - Row access is limited by the rules in policies.js unless the caller is an admin.
 */

export class QueryError extends Error {
  constructor(message, status = 400, code = 'PGRST000') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const q = (name) => {
  if (!IDENT.test(name)) throw new QueryError(`Invalid identifier: ${name}`);
  return `"${name}"`;
};

class Params {
  constructor() {
    this.values = [];
  }
  add(value) {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

// ---------------------------------------------------------------------------
// Access rules
// ---------------------------------------------------------------------------

function policyFor(table) {
  return POLICIES[table] || {};
}

/** Row filter for an operation, or 'false' when it is not allowed. */
function accessCondition(ctx, table, op, alias) {
  if (ctx.isAdmin) return null;
  const policy = policyFor(table);
  const rules = ctx.uid ? policy : policy.anon || {};
  const cond = rules[op];
  if (!cond) return 'false';
  if (cond === 'true') return null;
  return `(${cond.replaceAll('{t}', alias)})`;
}

function protectedColumns(ctx, table) {
  if (ctx.isAdmin) return new Set();
  return new Set(policyFor(table).protect || []);
}

// ---------------------------------------------------------------------------
// select-string parsing:  "*, alias:table!hint(col, other(*))"
// ---------------------------------------------------------------------------

function splitTopLevel(input, separator = ',') {
  const parts = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    if (!quoted) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === separator && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function parseSelect(input) {
  const text = String(input ?? '*').replace(/\s+/g, ' ').trim() || '*';
  return splitTopLevel(text).map((item) => {
    const open = item.indexOf('(');
    if (open > -1 && item.endsWith(')')) {
      const headPart = item.slice(0, open).trim();
      const inner = item.slice(open + 1, -1);
      let alias = null;
      let rest = headPart;
      if (rest.includes(':')) [alias, rest] = rest.split(':').map((s) => s.trim());
      const [name, ...hints] = rest.split('!').map((s) => s.trim());
      const isInner = hints.includes('inner');
      const hint = hints.find((h) => h !== 'inner' && h !== 'left') || null;
      return { kind: 'embed', alias: alias || name, name, hint, inner: isInner, children: parseSelect(inner) };
    }
    if (item === '*') return { kind: 'star' };
    let alias = null;
    let rest = item;
    if (rest.includes(':') && !rest.includes('::')) [alias, rest] = rest.split(':').map((s) => s.trim());
    let cast = null;
    if (rest.includes('::')) [rest, cast] = rest.split('::').map((s) => s.trim());
    if (rest === 'count') return { kind: 'count', alias: alias || 'count' };
    return { kind: 'column', name: rest, alias: alias || rest, cast };
  });
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

function resolveRelation(catalog, parentTable, embed) {
  const fks = catalog.foreignKeys;
  const parentCols = catalog.tables[parentTable]?.columns || {};
  let candidates = [];

  // alias:fk_column(...)  e.g. sender:sender_id(full_name)
  if (parentCols[embed.name]) {
    candidates = fks
      .filter((fk) => fk.table_name === parentTable && fk.columns.length === 1 && fk.columns[0] === embed.name)
      .map((fk) => ({ fk, target: fk.ref_table, many: false }));
  } else if (catalog.tables[embed.name]) {
    const outgoing = fks
      .filter((fk) => fk.table_name === parentTable && fk.ref_table === embed.name)
      .map((fk) => ({ fk, target: embed.name, many: false }));
    const incoming = fks
      .filter((fk) => fk.ref_table === parentTable && fk.table_name === embed.name)
      .map((fk) => ({ fk, target: embed.name, many: true }));
    candidates = [...outgoing, ...incoming];
    if (embed.hint) {
      candidates = candidates.filter(
        (c) => c.fk.name === embed.hint || (c.fk.columns.length === 1 && c.fk.columns[0] === embed.hint),
      );
    }
  }
  if (candidates.length === 0) {
    throw new QueryError(
      `Could not find a relationship between '${parentTable}' and '${embed.name}'`,
      400,
      'PGRST200',
    );
  }
  if (candidates.length > 1) {
    // Several foreign keys connect the same two tables (e.g. bookings.user_id,
    // bookings.updated_by -> user_profiles). Prefer the "obvious" one.
    const singular = (name) => name.replace(/ies$/, 'y').replace(/s$/, '');
    const preferred = [
      `${embed.alias}_id`,
      embed.alias,
      `${singular(embed.name)}_id`,
      `${singular(parentTable)}_id`,
      embed.name === 'user_profiles' || parentTable === 'user_profiles' ? 'user_id' : null,
    ].filter(Boolean);
    for (const column of preferred) {
      const match = candidates.find((c) => c.fk.columns.length === 1 && c.fk.columns[0] === column);
      if (match) return match;
    }
  }
  return candidates[0];
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function columnInfo(catalog, table, column) {
  const info = catalog.tables[table]?.columns?.[column];
  if (!info) throw new QueryError(`column ${table}.${column} does not exist`, 400, '42703');
  return info;
}

function encodeValue(info, value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (isJsonColumn(info)) return JSON.stringify(value);
  if (isArrayColumn(info)) return Array.isArray(value) ? value : value;
  if (typeof value === 'object' && !(value instanceof Date)) return JSON.stringify(value);
  return value;
}

function paramFor(params, info, value) {
  const placeholder = params.add(encodeValue(info, value));
  return isJsonColumn(info) ? `${placeholder}::jsonb` : placeholder;
}

/** Parses PostgREST's text form of a list: (a,b,"c d") */
function parseList(value) {
  if (Array.isArray(value)) return value;
  const text = String(value).trim().replace(/^\(/, '').replace(/\)$/, '');
  return splitTopLevel(text).map((v) => v.replace(/^"(.*)"$/, '$1'));
}

function scalarFromText(value) {
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function buildCondition(catalog, table, alias, params, filter) {
  const { column, op } = filter;
  let { value } = filter;
  const info = columnInfo(catalog, table, column);
  const col = `${alias}.${q(column)}`;
  let sql;
  switch (op) {
    case 'eq':
      sql = value === null ? `${col} IS NULL` : `${col} = ${paramFor(params, info, value)}`;
      break;
    case 'neq':
      sql = `${col} <> ${paramFor(params, info, value)}`;
      break;
    case 'gt':
      sql = `${col} > ${paramFor(params, info, value)}`;
      break;
    case 'gte':
      sql = `${col} >= ${paramFor(params, info, value)}`;
      break;
    case 'lt':
      sql = `${col} < ${paramFor(params, info, value)}`;
      break;
    case 'lte':
      sql = `${col} <= ${paramFor(params, info, value)}`;
      break;
    case 'like':
    case 'ilike': {
      const pattern = String(value).replaceAll('*', '%');
      sql = `${col}::text ${op === 'like' ? 'LIKE' : 'ILIKE'} ${params.add(pattern)}`;
      break;
    }
    case 'is': {
      const v = typeof value === 'string' ? value.toLowerCase() : value;
      if (v === null || v === 'null') sql = `${col} IS NULL`;
      else if (v === true || v === 'true') sql = `${col} IS TRUE`;
      else if (v === false || v === 'false') sql = `${col} IS FALSE`;
      else throw new QueryError(`Invalid value for is: ${value}`);
      break;
    }
    case 'in': {
      const list = parseList(value);
      if (list.length === 0) {
        sql = 'false';
      } else {
        const placeholders = list.map((v) => paramFor(params, info, scalarFromText(v)));
        sql = `${col} IN (${placeholders.join(', ')})`;
      }
      break;
    }
    case 'cs':
    case 'contains':
    case 'cd':
    case 'containedBy':
    case 'ov':
    case 'overlaps': {
      const operator = { cs: '@>', contains: '@>', cd: '<@', containedBy: '<@', ov: '&&', overlaps: '&&' }[op];
      if (isJsonColumn(info)) {
        sql = `${col} ${operator} ${params.add(typeof value === 'string' ? value : JSON.stringify(value))}::jsonb`;
      } else {
        const arr = Array.isArray(value) ? value : parseList(String(value).replace(/^\{/, '(').replace(/\}$/, ')'));
        sql = `${col} ${operator} ${params.add(arr)}`;
      }
      break;
    }
    default:
      throw new QueryError(`Unsupported filter operator: ${op}`);
  }
  return filter.negate ? `NOT (${sql})` : sql;
}

/** Parses PostgREST logic trees like "a.eq.1,b.ilike.%x%,and(c.gt.2,d.is.null)". */
function parseLogic(expression) {
  return splitTopLevel(expression).map((term) => {
    const logic = term.match(/^(not\.)?(and|or)\((.*)\)$/);
    if (logic) return { type: logic[2], negate: !!logic[1], terms: parseLogic(logic[3]) };
    const firstDot = term.indexOf('.');
    const column = term.slice(0, firstDot);
    let rest = term.slice(firstDot + 1);
    let negate = false;
    if (rest.startsWith('not.')) {
      negate = true;
      rest = rest.slice(4);
    }
    const opDot = rest.indexOf('.');
    const op = rest.slice(0, opDot);
    let value = rest.slice(opDot + 1);
    value = op === 'in' ? value : scalarFromText(value.replace(/^"(.*)"$/, '$1'));
    return { type: 'filter', column, op, value, negate };
  });
}

function buildLogic(catalog, table, alias, params, node, joiner) {
  const parts = node.map((term) => {
    if (term.type === 'filter') return buildCondition(catalog, table, alias, params, term);
    const inner = buildLogic(catalog, table, alias, params, term.terms, term.type === 'and' ? ' AND ' : ' OR ');
    return term.negate ? `NOT (${inner})` : `(${inner})`;
  });
  return parts.length ? parts.join(joiner) : 'true';
}

/** Turns the client's filter list into SQL conditions (for this table only). */
function buildFilters(catalog, table, alias, params, filters) {
  const conditions = [];
  for (const filter of filters || []) {
    if (filter.type === 'or') {
      conditions.push(`(${buildLogic(catalog, table, alias, params, parseLogic(filter.expression), ' OR ')})`);
    } else if (filter.type === 'and') {
      conditions.push(`(${buildLogic(catalog, table, alias, params, parseLogic(filter.expression), ' AND ')})`);
    } else {
      conditions.push(buildCondition(catalog, table, alias, params, filter));
    }
  }
  return conditions;
}

/** Splits filters into those for the root table and those addressed to embedded relations ("rel.col"). */
function partitionFilters(filters) {
  const root = [];
  const nested = {};
  for (const f of filters || []) {
    const key = f.foreignTable || (f.column && f.column.includes('.') ? f.column.split('.').slice(0, -1).join('.') : null);
    if (key) {
      const column = f.column?.includes('.') ? f.column.split('.').pop() : f.column;
      const [head, ...tail] = key.split('.');
      nested[head] ??= [];
      nested[head].push({ ...f, column, foreignTable: tail.length ? tail.join('.') : undefined });
    } else {
      root.push(f);
    }
  }
  return { root, nested };
}

function buildOrder(catalog, table, alias, orders) {
  const parts = [];
  for (const o of orders || []) {
    columnInfo(catalog, table, o.column);
    const dir = o.ascending === false ? 'DESC' : 'ASC';
    const nulls = o.nullsFirst === undefined ? '' : o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST';
    parts.push(`${alias}.${q(o.column)} ${dir}${nulls}`);
  }
  return parts.length ? ` ORDER BY ${parts.join(', ')}` : '';
}

// ---------------------------------------------------------------------------
// SELECT
// ---------------------------------------------------------------------------

class AliasCounter {
  constructor() {
    this.n = 0;
  }
  next() {
    this.n += 1;
    return `t${this.n}`;
  }
}

/**
 * Builds the column list for one level of a select tree. Embedded relations
 * become correlated sub-queries returning JSON, each limited by that table's
 * own access rule.
 */
function buildColumns(ctx, catalog, table, alias, params, items, nested, orders, aliases, innerJoins) {
  const cols = [];
  const tableInfo = catalog.tables[table];
  for (const item of items) {
    if (item.kind === 'star') {
      for (const name of Object.keys(tableInfo.columns)) cols.push(`${alias}.${q(name)}`);
    } else if (item.kind === 'column') {
      columnInfo(catalog, table, item.name);
      const castSql = item.cast && /^[a-z_]+$/.test(item.cast) ? `::${item.cast}` : '';
      cols.push(`${alias}.${q(item.name)}${castSql} AS ${q(item.alias)}`);
    } else if (item.kind === 'count') {
      cols.push(`count(*) OVER () AS ${q(item.alias)}`);
    } else if (item.kind === 'embed') {
      const rel = resolveRelation(catalog, table, item);
      const child = aliases.next();
      const join = rel.fk.columns
        .map((c, i) =>
          rel.many
            ? `${child}.${q(c)} = ${alias}.${q(rel.fk.ref_columns[i])}`
            : `${child}.${q(rel.fk.ref_columns[i])} = ${alias}.${q(c)}`,
        )
        .join(' AND ');
      const access = accessCondition(ctx, rel.target, 'select', child);
      const childFilters = nested[item.alias] || nested[item.name] || [];
      const split = partitionFilters(childFilters);
      const where = [join, ...(access ? [access] : []), ...buildFilters(catalog, rel.target, child, params, split.root)];
      const childOrders = (orders || []).filter((o) => o.foreignTable === item.alias || o.foreignTable === item.name);

      if (item.children.length === 1 && item.children[0].kind === 'count') {
        const countSql = `(SELECT count(*) FROM public.${q(rel.target)} ${child} WHERE ${where.join(' AND ')})`;
        cols.push(`${rel.many ? `jsonb_build_array(jsonb_build_object('count', ${countSql}))` : countSql} AS ${q(item.alias)}`);
        continue;
      }

      const childCols = buildColumns(ctx, catalog, rel.target, child, params, item.children, split.nested, orders, aliases, []);
      const inner = `SELECT ${childCols.join(', ')} FROM public.${q(rel.target)} ${child} WHERE ${where.join(' AND ')}${buildOrder(catalog, rel.target, child, childOrders)}`;
      cols.push(
        rel.many
          ? `COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM (${inner}) s), '[]'::jsonb) AS ${q(item.alias)}`
          : `(SELECT to_jsonb(s) FROM (${inner} LIMIT 1) s) AS ${q(item.alias)}`,
      );
      if (item.inner) {
        innerJoins.push(`EXISTS (SELECT 1 FROM public.${q(rel.target)} ${child} WHERE ${where.join(' AND ')})`);
      }
    }
  }
  return cols;
}

function requireTable(catalog, table) {
  if (!table || !catalog.tables[table]) throw new QueryError(`relation "public.${table}" does not exist`, 404, '42P01');
}

function checkAnonRequirements(ctx, table, filters) {
  if (ctx.isAdmin || ctx.uid) return;
  const required = policyFor(table).anonRequireEq;
  if (!required) return;
  const ok = (filters || []).some((f) => f.op === 'eq' && !f.negate && required.includes(f.column) && f.value != null);
  if (!ok) throw new QueryError('Sign in to view these records', 401, '42501');
}

async function runSelect(client, ctx, catalog, spec, { skipAccess = false, ids = null } = {}) {
  const params = new Params();
  const aliases = new AliasCounter();
  const alias = 't0';
  const items = parseSelect(spec.select);
  const { root, nested } = partitionFilters(spec.filters);
  const innerJoins = [];
  const cols = buildColumns(ctx, catalog, spec.table, alias, params, items, nested, spec.order, aliases, innerJoins);

  const where = [];
  if (!skipAccess) {
    checkAnonRequirements(ctx, spec.table, root);
    const access = accessCondition(ctx, spec.table, 'select', alias);
    if (access) where.push(access);
  }
  if (ids) where.push(`${alias}."id" = ANY(${params.add(ids)})`);
  else where.push(...buildFilters(catalog, spec.table, alias, params, root));
  where.push(...innerJoins);

  const whereSql = where.length ? ` WHERE ${where.map((w) => `(${w})`).join(' AND ')}` : '';
  const from = `FROM public.${q(spec.table)} ${alias}${whereSql}`;

  let count = null;
  if (spec.count && !ids) {
    const countRes = await client.query(`SELECT count(*)::int AS n ${from}`, params.values);
    count = countRes.rows[0]?.n ?? 0;
  }
  if (spec.head) return { data: null, count };

  const rootOrders = (spec.order || []).filter((o) => !o.foreignTable);
  let sql = `SELECT ${cols.join(', ')} ${from}${buildOrder(catalog, spec.table, alias, rootOrders)}`;
  if (!ids) {
    if (Number.isInteger(spec.limit)) sql += ` LIMIT ${Math.max(0, spec.limit)}`;
    if (Number.isInteger(spec.offset)) sql += ` OFFSET ${Math.max(0, spec.offset)}`;
  }
  const res = await client.query(`SELECT to_jsonb(s) AS r FROM (${sql}) s`, params.values);
  return { data: res.rows.map((r) => r.r), count };
}

// ---------------------------------------------------------------------------
// INSERT / UPSERT / UPDATE / DELETE
// ---------------------------------------------------------------------------

function cleanRow(ctx, catalog, table, row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new QueryError('Each row must be an object');
  const protectedCols = protectedColumns(ctx, table);
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    columnInfo(catalog, table, key);
    if (protectedCols.has(key)) continue;
    out[key] = value;
  }
  return out;
}

async function verifyRows(client, ctx, table, op, ids) {
  if (ctx.isAdmin || ids.length === 0) return;
  const policy = policyFor(table);
  const rules = ctx.uid ? policy : policy.anon || {};
  const check = op === 'update' ? rules.updateCheck || rules.update : rules.insert;
  if (!check) throw new QueryError(`You do not have permission to ${op} ${table}`, 403, '42501');
  if (check === 'true') return;
  const res = await client.query(
    `SELECT count(*)::int AS n FROM public.${q(table)} t0 WHERE t0."id" = ANY($1) AND (${check.replaceAll('{t}', 't0')})`,
    [ids],
  );
  if (res.rows[0].n !== ids.length) {
    throw new QueryError(`new row violates row-level security policy for table "${table}"`, 403, '42501');
  }
}

async function runInsert(client, ctx, catalog, spec) {
  const table = spec.table;
  const isUpsert = spec.action === 'upsert';
  if (!ctx.isAdmin) {
    const rules = ctx.uid ? policyFor(table) : policyFor(table).anon || {};
    if (!rules.insert) throw new QueryError(`You do not have permission to insert into ${table}`, 403, '42501');
  }
  const rows = (Array.isArray(spec.values) ? spec.values : [spec.values]).map((r) => cleanRow(ctx, catalog, table, r));
  if (rows.length === 0) return { ids: [] };
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const params = new Params();
  const tableCols = catalog.tables[table].columns;

  let sql;
  if (columns.length === 0) {
    sql = `INSERT INTO public.${q(table)} AS t0 DEFAULT VALUES`;
  } else {
    const valuesSql = rows
      .map((row) => `(${columns.map((c) => (c in row ? paramFor(params, tableCols[c], row[c]) : 'DEFAULT')).join(', ')})`)
      .join(', ');
    sql = `INSERT INTO public.${q(table)} AS t0 (${columns.map(q).join(', ')}) VALUES ${valuesSql}`;
  }

  if (isUpsert) {
    const conflict = String(spec.onConflict || 'id').split(',').map((c) => c.trim()).filter(Boolean);
    conflict.forEach((c) => columnInfo(catalog, table, c));
    if (spec.ignoreDuplicates) {
      sql += ` ON CONFLICT (${conflict.map(q).join(', ')}) DO NOTHING`;
    } else {
      const updates = columns.filter((c) => !conflict.includes(c));
      const access = accessCondition(ctx, table, 'update', 't0');
      sql += updates.length
        ? ` ON CONFLICT (${conflict.map(q).join(', ')}) DO UPDATE SET ${updates.map((c) => `${q(c)} = EXCLUDED.${q(c)}`).join(', ')}${access ? ` WHERE ${access}` : ''}`
        : ` ON CONFLICT (${conflict.map(q).join(', ')}) DO NOTHING`;
    }
  }
  sql += ' RETURNING t0."id"';
  const res = await client.query(sql, params.values);
  const ids = res.rows.map((r) => r.id);
  await verifyRows(client, ctx, table, 'insert', ids);
  return { ids };
}

function requireFilters(spec) {
  if (!spec.filters || spec.filters.length === 0) {
    throw new QueryError(`${spec.action.toUpperCase()} requires a WHERE clause`, 400, '21000');
  }
}

async function runUpdate(client, ctx, catalog, spec) {
  requireFilters(spec);
  const table = spec.table;
  const values = cleanRow(ctx, catalog, table, spec.values);
  const params = new Params();
  const tableCols = catalog.tables[table].columns;
  const sets = Object.entries(values).map(([c, v]) => `${q(c)} = ${paramFor(params, tableCols[c], v)}`);
  if (sets.length === 0) return { ids: [] };
  const where = buildFilters(catalog, table, 't0', params, spec.filters);
  const access = accessCondition(ctx, table, 'update', 't0');
  if (access) where.push(access);
  const sql = `UPDATE public.${q(table)} AS t0 SET ${sets.join(', ')} WHERE ${where.map((w) => `(${w})`).join(' AND ')} RETURNING t0."id"`;
  const res = await client.query(sql, params.values);
  const ids = res.rows.map((r) => r.id);
  await verifyRows(client, ctx, table, 'update', ids);
  return { ids };
}

async function runDelete(client, ctx, catalog, spec) {
  requireFilters(spec);
  const table = spec.table;
  const params = new Params();
  const where = buildFilters(catalog, table, 't0', params, spec.filters);
  const access = accessCondition(ctx, table, 'delete', 't0');
  if (access) where.push(access);
  const sql = `DELETE FROM public.${q(table)} AS t0 WHERE ${where.map((w) => `(${w})`).join(' AND ')} RETURNING to_jsonb(t0) AS r`;
  const res = await client.query(sql, params.values);
  return { rows: res.rows.map((r) => r.r) };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function shapeResult(spec, data, count) {
  if (data && spec.single) {
    if (data.length === 1) return { data: data[0], count };
    if (data.length === 0 && spec.single === 'maybe') return { data: null, count };
    throw new QueryError(
      'JSON object requested, multiple (or no) rows returned',
      406,
      'PGRST116',
    );
  }
  return { data, count };
}

export async function executeQuery(client, ctx, spec) {
  const catalog = await getCatalog();
  requireTable(catalog, spec.table);

  if (!ctx.isAdmin && ctx.uid && ctx.active === false) {
    throw new QueryError('This account is suspended or inactive', 403, '42501');
  }

  switch (spec.action) {
    case 'select': {
      const { data, count } = await runSelect(client, ctx, catalog, spec);
      return shapeResult(spec, data, count);
    }
    case 'insert':
    case 'upsert': {
      const { ids } = await runInsert(client, ctx, catalog, spec);
      if (!spec.returning) return { data: null, count: spec.count ? ids.length : null };
      const { data } = await runSelect(client, ctx, catalog, spec, { skipAccess: true, ids });
      return shapeResult(spec, data, spec.count ? ids.length : null);
    }
    case 'update': {
      const { ids } = await runUpdate(client, ctx, catalog, spec);
      if (!spec.returning) return { data: null, count: spec.count ? ids.length : null };
      const { data } = await runSelect(client, ctx, catalog, spec, { skipAccess: true, ids });
      return shapeResult(spec, data, spec.count ? ids.length : null);
    }
    case 'delete': {
      const { rows } = await runDelete(client, ctx, catalog, spec);
      return shapeResult(spec, spec.returning ? rows : null, spec.count ? rows.length : null);
    }
    default:
      throw new QueryError(`Unsupported action: ${spec.action}`);
  }
}
