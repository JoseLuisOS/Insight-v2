"use server";

import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RunResult =
  | { columns: string[]; rows: Record<string, unknown>[] }
  | { error: string };

export async function runSql(sql: string, limit = 1000): Promise<RunResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_query", {
    p_sql: sql,
    p_limit: limit,
  });
  if (error) return { error: error.message };

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return { columns, rows };
}

export type SaveResult = { datasetId: string } | { error: string };

export async function saveSqlQuery(
  name: string,
  sql: string,
): Promise<SaveResult> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    .insert({
      tenant_id: profile.tenant_id,
      name: name.trim() || "Consulta",
      kind: "sql_query",
      sql_text: sql,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/datasets");
  return { datasetId: data.id as string };
}
