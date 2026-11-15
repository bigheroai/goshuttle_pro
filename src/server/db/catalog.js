import 'server-only';
import { db } from './index';

let cached;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

/**
 * Reads table/column/foreign-key/function metadata for the public schema.
 * Used to validate identifiers (nothing user-supplied is ever interpolated
 * into SQL unless it matches the catalog) and to resolve embedded relations.
 */
export async function getCatalog() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  const { pool } = db();
  const [cols, fks, fns] = await Promise.all([
    pool.query(`
      SELECT c.table_name, c.column_name, c.data_type, c.udt_name
      FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position`),
    pool.query(`
      SELECT con.conname AS name, src.relname AS table_name, tgt.relname AS ref_table,
             array_agg(sa.attname ORDER BY k.ord) AS columns,
             array_agg(ta.attname ORDER BY k.ord) AS ref_columns
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      JOIN pg_class tgt ON tgt.oid = con.confrelid
      JOIN pg_namespace n ON n.oid = src.relnamespace AND n.nspname = 'public'
      CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(src_att, tgt_att, ord)
      JOIN pg_attribute sa ON sa.attrelid = con.conrelid AND sa.attnum = k.src_att
      JOIN pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = k.tgt_att
      WHERE con.contype = 'f'
      GROUP BY con.conname, src.relname, tgt.relname`),
    pool.query(`
      SELECT p.proname AS name, p.proretset AS returns_set,
             t.typtype = 'c' OR p.prorettype = 'record'::regtype AS returns_composite,
             COALESCE(p.proargnames, '{}') AS arg_names
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
      JOIN pg_type t ON t.oid = p.prorettype`),
  ]);

  const tables = {};
  for (const row of cols.rows) {
    tables[row.table_name] ??= { name: row.table_name, columns: {} };
    tables[row.table_name].columns[row.column_name] = { type: row.data_type, udt: row.udt_name };
  }
  const functions = {};
  for (const row of fns.rows) functions[row.name] = row;

  cached = { tables, foreignKeys: fks.rows, functions };
  cachedAt = Date.now();
  return cached;
}

export function isJsonColumn(column) {
  return column?.udt === 'json' || column?.udt === 'jsonb';
}

export function isArrayColumn(column) {
  return column?.type === 'ARRAY';
}
