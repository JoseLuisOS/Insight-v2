"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createMetric, deleteMetric } from "@/app/(app)/metrics/actions";

type Col = { key: string; name: string; type: string };
type Dataset = { id: string; name: string; columns: Col[] };
type Metric = {
  id: string;
  name: string;
  agg: string;
  column_key: string;
  description: string | null;
  datasets: { name: string } | null;
};

const AGGS = ["sum", "avg", "count", "min", "max"] as const;

export function MetricManager({
  datasets,
  metrics,
  canWrite,
}: {
  datasets: Dataset[];
  metrics: Metric[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [name, setName] = useState("");
  const [columnKey, setColumnKey] = useState(datasets[0]?.columns[0]?.key ?? "");
  const [agg, setAgg] = useState<(typeof AGGS)[number]>("sum");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ds = datasets.find((d) => d.id === datasetId);

  function add() {
    setError(null);
    start(async () => {
      const res = await createMetric({ datasetId, name, columnKey, agg, description });
      if ("error" in res) setError(res.error);
      else {
        setName("");
        setDescription("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {canWrite && datasets.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-card-foreground">Nueva métrica</h2>
          {error && (
            <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej. Ingresos totales)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <select
              value={datasetId}
              onChange={(e) => {
                setDatasetId(e.target.value);
                const d = datasets.find((x) => x.id === e.target.value);
                setColumnKey(d?.columns[0]?.key ?? "");
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={agg}
              onChange={(e) => setAgg(e.target.value as (typeof AGGS)[number])}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {AGGS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={columnKey}
              onChange={(e) => setColumnKey(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ds?.columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (opcional)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          <button
            onClick={add}
            disabled={pending}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Crear métrica"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay métricas.</p>
        )}
        {metrics.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-card-foreground">{m.name}</div>
              {canWrite && (
                <button
                  onClick={() => start(async () => { await deleteMetric(m.id); router.refresh(); })}
                  className="text-xs text-muted-foreground hover:text-danger"
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="mt-1 font-mono text-xs text-primary">
              {m.agg}({m.column_key})
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {m.datasets?.name}
              {m.description ? ` · ${m.description}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
