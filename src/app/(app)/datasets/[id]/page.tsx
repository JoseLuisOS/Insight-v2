import Link from "next/link";
import { notFound } from "next/navigation";
import { RowPolicyManager } from "@/components/row-policy-manager";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Column = { name: string; key: string; type: string };

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dataset } = await supabase
    .from("datasets")
    .select("id, name, kind, row_count, columns_json, sql_text, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!dataset) notFound();

  let columns: { name: string; key: string; type?: string }[] = [];
  let rows: Record<string, unknown>[] = [];
  let queryError: string | null = null;

  if (dataset.kind === "sql_query") {
    const { data, error } = await supabase.rpc("run_query", {
      p_sql: dataset.sql_text,
      p_limit: 100,
    });
    if (error) {
      queryError = error.message;
    } else {
      rows = (data as Record<string, unknown>[] | null) ?? [];
      columns = (rows.length ? Object.keys(rows[0]) : []).map((k) => ({
        name: k,
        key: k,
      }));
    }
  } else {
    columns = (dataset.columns_json as Column[]) ?? [];
    const { data } = await supabase.rpc("dataset_preview", {
      p_dataset_id: id,
      p_limit: 100,
    });
    rows = (data as Record<string, unknown>[] | null) ?? [];
  }

  // Admin-only: row-level security policies.
  const { profile } = await getProfileContext();
  const isAdmin = profile?.role === "admin";
  let policies: {
    id: string;
    column_key: string;
    principal_type: string;
    principal_id: string;
    allowed_value: string;
  }[] = [];
  let members: { id: string; display_name: string | null }[] = [];
  if (isAdmin) {
    const [{ data: pol }, { data: mem }] = await Promise.all([
      supabase
        .from("dataset_row_policies")
        .select("id, column_key, principal_type, principal_id, allowed_value")
        .eq("dataset_id", id),
      supabase.from("profiles").select("id, display_name"),
    ]);
    policies = (pol as typeof policies) ?? [];
    members = (mem as typeof members) ?? [];
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link href="/datasets" className="text-sm text-primary hover:underline">
          ← Datasets
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{dataset.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {dataset.kind === "sql_query"
                ? "Consulta SQL guardada"
                : `${(dataset.row_count ?? 0).toLocaleString("es-MX")} filas`}{" "}
              · {columns.length} columnas
            </p>
          </div>
        </div>
        {dataset.kind === "sql_query" && dataset.sql_text && (
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
            {dataset.sql_text}
          </pre>
        )}
      </div>

      {queryError && (
        <pre className="overflow-x-auto rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {queryError}
        </pre>
      )}

      {!queryError && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="whitespace-nowrap px-3 py-2 text-left font-medium"
                  >
                    {c.name}
                    {c.type && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {c.type}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="whitespace-nowrap px-3 py-2 text-muted-foreground"
                    >
                      {String(row[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!queryError && rows.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Sin filas para mostrar.
        </p>
      )}

      {isAdmin && columns.length > 0 && (
        <div className="mt-6">
          <RowPolicyManager
            datasetId={id}
            columns={columns.map((c) => ({ key: c.key, name: c.name }))}
            policies={policies}
            members={members}
          />
        </div>
      )}
    </div>
  );
}
