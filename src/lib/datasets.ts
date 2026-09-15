import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/charts";

export type DatasetData = {
  id: string;
  name: string;
  kind: string;
  columns: string[];
  rows: Row[];
  error?: string;
};

const CACHE_TTL_SECONDS = 120;

/**
 * Fetch a dataset's rows through the secure run_query path (works uniformly for
 * materialized CSV tables and saved SQL queries). Results are cached per
 * (sql + tenant) in query_cache with a short TTL — the "near-live" internal
 * freshness contract (PLAN.md §5.4). Pass skipCache to force a fresh read.
 */
export async function fetchDatasetData(
  datasetId: string,
  limit = 5000,
  skipCache = false,
): Promise<DatasetData | null> {
  const supabase = await createClient();
  const { data: ds } = await supabase
    .from("datasets")
    .select("id, name, kind, tenant_id, physical_table, sql_text, columns_json")
    .eq("id", datasetId)
    .maybeSingle();

  if (!ds) return null;

  // Data-level RLS: build a row filter from dataset_row_policies for non-admins.
  const rowFilter = await buildRowFilter(supabase, datasetId);

  const baseSql = ds.physical_table
    ? `select * from ${ds.physical_table}`
    : `select * from (${ds.sql_text as string}) _ds`;
  const sql = rowFilter
    ? `select * from (${baseSql}) _rls where ${rowFilter} limit ${limit}`
    : `${baseSql} limit ${limit}`;

  const cacheKey = createHash("sha256")
    .update(`${ds.tenant_id}:${sql}:${limit}`)
    .digest("hex");

  // Try cache.
  if (!skipCache) {
    const { data: cached } = await supabase
      .from("query_cache")
      .select("result_json, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (cached && new Date(cached.expires_at as string) > new Date()) {
      const r = cached.result_json as { columns: string[]; rows: Row[] };
      return { id: ds.id, name: ds.name, kind: ds.kind, columns: r.columns, rows: r.rows };
    }
  }

  const { data, error } = await supabase.rpc("run_query", { p_sql: sql, p_limit: limit });
  if (error) {
    return { id: ds.id, name: ds.name, kind: ds.kind, columns: [], rows: [], error: error.message };
  }

  const rows = (data as Row[] | null) ?? [];
  const declared = (ds.columns_json as { key: string }[] | null) ?? [];
  const columns =
    declared.length > 0
      ? declared.map((c) => c.key)
      : rows.length
        ? Object.keys(rows[0])
        : [];

  // Write-through cache (best effort).
  await supabase.from("query_cache").upsert({
    cache_key: cacheKey,
    tenant_id: ds.tenant_id,
    result_json: { columns, rows },
    computed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString(),
  });

  return { id: ds.id, name: ds.name, kind: ds.kind, columns, rows };
}

const sqlIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;
const sqlLit = (v: string) => `'${v.replace(/'/g, "''")}'`;

/**
 * Returns a SQL WHERE fragment enforcing dataset_row_policies for the current
 * user, or null if no filtering applies (no user, admin, or no policies).
 * For each policed column the user must match one of their allowed values;
 * a policed column with no allowed value for the user yields zero rows.
 */
async function buildRowFilter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  datasetId: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role === "admin") return null; // admins see all

  const { data: policies } = await supabase
    .from("dataset_row_policies")
    .select("column_key, principal_type, principal_id, allowed_value")
    .eq("dataset_id", datasetId);

  const all = (policies as
    | { column_key: string; principal_type: string; principal_id: string; allowed_value: string }[]
    | null) ?? [];
  if (all.length === 0) return null;

  // Distinct policed columns; for each, the values allowed to THIS user/role.
  const columns = [...new Set(all.map((p) => p.column_key))];
  const conditions = columns.map((col) => {
    const allowed = all
      .filter(
        (p) =>
          p.column_key === col &&
          ((p.principal_type === "user" && p.principal_id === user.id) ||
            (p.principal_type === "role" && p.principal_id === profile.role)),
      )
      .map((p) => p.allowed_value);
    if (allowed.length === 0) return "false"; // restricted column, no grant → no rows
    return `${sqlIdent(col)} in (${allowed.map(sqlLit).join(", ")})`;
  });

  return conditions.join(" and ");
}
