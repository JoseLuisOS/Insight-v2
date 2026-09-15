"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runSql, saveSqlQuery, type RunResult } from "@/app/(app)/sql/actions";

type DatasetRef = { id: string; name: string; physical_table: string | null };

export function SqlLab({ datasets }: { datasets: DatasetRef[] }) {
  const router = useRouter();
  const [sql, setSql] = useState(
    datasets[0]?.physical_table
      ? `select *\nfrom ${datasets[0].physical_table}\nlimit 100`
      : "select 1 as ejemplo",
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [name, setName] = useState("");
  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();

  function run() {
    startRun(async () => setResult(await runSql(sql)));
  }

  function save() {
    startSave(async () => {
      const res = await saveSqlQuery(name || "Consulta", sql);
      if ("error" in res) {
        setResult({ error: res.error });
        return;
      }
      router.push(`/datasets/${res.datasetId}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
      <div className="space-y-4">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          spellCheck={false}
          rows={8}
          className="w-full rounded-lg border border-input bg-card p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={run}
            disabled={running}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {running ? "Ejecutando…" : "Ejecutar"}
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre para guardar"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar como dataset"}
          </button>
        </div>

        {result && "error" in result && (
          <pre className="overflow-x-auto rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {result.error}
          </pre>
        )}

        {result && "rows" in result && (
          <ResultTable columns={result.columns} rows={result.rows} />
        )}
      </div>

      <aside className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold text-card-foreground">Tus tablas</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Usa el nombre completo del esquema.
        </p>
        <ul className="space-y-2">
          {datasets.length === 0 && (
            <li className="text-xs text-muted-foreground">
              Aún no tienes datasets materializados.
            </li>
          )}
          {datasets
            .filter((d) => d.physical_table)
            .map((d) => (
              <li key={d.id}>
                <button
                  onClick={() =>
                    setSql(`select *\nfrom ${d.physical_table}\nlimit 100`)
                  }
                  className="w-full rounded px-2 py-1 text-left text-xs transition hover:bg-muted"
                  title={d.physical_table ?? ""}
                >
                  <div className="font-medium text-foreground">{d.name}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {d.physical_table}
                  </div>
                </button>
              </li>
            ))}
        </ul>
      </aside>
    </div>
  );
}

function ResultTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  if (rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        La consulta no devolvió filas.
      </p>
    );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {rows.length.toLocaleString("es-MX")} filas
      </p>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
