"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { runSql, saveSqlQuery, type RunResult } from "@/app/(app)/sql/actions";
import {
  buildSql,
  type Alias,
  type BuilderMeasure,
  type BuilderState,
  type ColumnRef,
  type FilterOp,
} from "@/lib/query-builder";

type Col = { key: string; name: string; type: string };
type Dataset = { id: string; name: string; physical_table: string; columns: Col[] };

const OPS: FilterOp[] = ["=", "!=", ">", "<", ">=", "<=", "contains"];
const FNS: BuilderMeasure["fn"][] = ["sum", "avg", "count", "min", "max"];

const refKey = (r: ColumnRef) => `${r.alias}:${r.key}`;
const parseRef = (s: string): ColumnRef => {
  const [alias, key] = s.split(":");
  return { alias: alias as Alias, key };
};

export function QueryBuilder({ datasets }: { datasets: Dataset[] }) {
  const router = useRouter();
  const [baseId, setBaseId] = useState(datasets[0]?.id ?? "");
  const [joinEnabled, setJoinEnabled] = useState(false);
  const [joinId, setJoinId] = useState(datasets[1]?.id ?? datasets[0]?.id ?? "");
  const [joinType, setJoinType] = useState<"inner" | "left">("inner");
  const [joinLeft, setJoinLeft] = useState("");
  const [joinRight, setJoinRight] = useState("");

  const [dimensions, setDimensions] = useState<ColumnRef[]>([]);
  const [measures, setMeasures] = useState<BuilderMeasure[]>([]);
  const [filters, setFilters] = useState<{ col: ColumnRef; op: FilterOp; value: string }[]>([]);
  const [limit, setLimit] = useState(1000);
  const [name, setName] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();

  const base = datasets.find((d) => d.id === baseId);
  const joinDs = datasets.find((d) => d.id === joinId);
  const useJoin = joinEnabled && joinDs && base && joinDs.id !== base.id;

  const availableCols = useMemo(() => {
    const cols: { ref: ColumnRef; label: string; type: string }[] = [];
    base?.columns.forEach((c) =>
      cols.push({ ref: { alias: "t0", key: c.key }, label: `${base.name}.${c.name}`, type: c.type }),
    );
    if (useJoin)
      joinDs?.columns.forEach((c) =>
        cols.push({ ref: { alias: "t1", key: c.key }, label: `${joinDs.name}.${c.name}`, type: c.type }),
      );
    return cols;
  }, [base, joinDs, useJoin]);

  const typeMap = useMemo(() => {
    const m = new Map<string, string>();
    availableCols.forEach((c) => m.set(refKey(c.ref), c.type));
    return m;
  }, [availableCols]);

  const sql = useMemo(() => {
    if (!base) return "";
    const state: BuilderState = {
      base: base.physical_table,
      join: useJoin
        ? { table: joinDs!.physical_table, type: joinType, left: joinLeft, right: joinRight }
        : undefined,
      dimensions,
      measures,
      filters,
      limit,
    };
    return buildSql(state, (ref) => typeMap.get(refKey(ref)));
  }, [base, useJoin, joinDs, joinType, joinLeft, joinRight, dimensions, measures, filters, limit, typeMap]);

  function ColSelect({ value, onChange }: { value?: ColumnRef; onChange: (r: ColumnRef) => void }) {
    return (
      <select
        value={value ? refKey(value) : ""}
        onChange={(e) => onChange(parseRef(e.target.value))}
        className="flex-1 rounded border border-input bg-background px-1 py-1 text-xs"
      >
        <option value="" disabled>
          columna…
        </option>
        {availableCols.map((c) => (
          <option key={refKey(c.ref)} value={refKey(c.ref)}>
            {c.label}
          </option>
        ))}
      </select>
    );
  }

  if (!base) {
    return <p className="text-sm text-muted-foreground">No tienes datasets materializados.</p>;
  }

  const inDim = (r: ColumnRef) => dimensions.some((d) => refKey(d) === refKey(r));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Tabla base</label>
          <select
            value={baseId}
            onChange={(e) => {
              setBaseId(e.target.value);
              setDimensions([]);
              setMeasures([]);
              setFilters([]);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {datasets.length > 1 && (
          <div className="rounded-md border border-border p-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={joinEnabled}
                onChange={(e) => setJoinEnabled(e.target.checked)}
              />
              Combinar con otra tabla (JOIN)
            </label>
            {joinEnabled && (
              <div className="mt-2 space-y-2">
                <select
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full rounded border border-input bg-background px-1 py-1 text-xs"
                >
                  {datasets
                    .filter((d) => d.id !== baseId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
                <select
                  value={joinType}
                  onChange={(e) => setJoinType(e.target.value as "inner" | "left")}
                  className="w-full rounded border border-input bg-background px-1 py-1 text-xs"
                >
                  <option value="inner">inner join</option>
                  <option value="left">left join</option>
                </select>
                <div className="flex items-center gap-1 text-xs">
                  <select
                    value={joinLeft}
                    onChange={(e) => setJoinLeft(e.target.value)}
                    className="flex-1 rounded border border-input bg-background px-1 py-1"
                  >
                    <option value="">{base.name}…</option>
                    {base.columns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  =
                  <select
                    value={joinRight}
                    onChange={(e) => setJoinRight(e.target.value)}
                    className="flex-1 rounded border border-input bg-background px-1 py-1"
                  >
                    <option value="">{joinDs?.name}…</option>
                    {joinDs?.columns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-1 text-sm font-medium">Columnas (agrupar por)</div>
          <div className="flex flex-wrap gap-1">
            {availableCols.map((c) => (
              <button
                key={refKey(c.ref)}
                onClick={() =>
                  setDimensions((p) =>
                    inDim(c.ref) ? p.filter((d) => refKey(d) !== refKey(c.ref)) : [...p, c.ref],
                  )
                }
                className={`rounded-md border px-2 py-1 text-xs transition ${
                  inDim(c.ref) ? "border-primary bg-brand-50 text-brand-700" : "border-border hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm font-medium">
            Métricas
            <button
              onClick={() => setMeasures((p) => [...p, { col: availableCols[0].ref, fn: "sum" }])}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
            >
              + Agregar
            </button>
          </div>
          <div className="space-y-2">
            {measures.map((m, idx) => (
              <div key={idx} className="flex gap-1">
                <select
                  value={m.fn}
                  onChange={(e) =>
                    setMeasures((p) => p.map((x, i) => (i === idx ? { ...x, fn: e.target.value as BuilderMeasure["fn"] } : x)))
                  }
                  className="rounded border border-input bg-background px-1 py-1 text-xs"
                >
                  {FNS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <ColSelect
                  value={m.col}
                  onChange={(ref) => setMeasures((p) => p.map((x, i) => (i === idx ? { ...x, col: ref } : x)))}
                />
                <button onClick={() => setMeasures((p) => p.filter((_, i) => i !== idx))} className="px-1 text-xs text-muted-foreground hover:text-danger">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm font-medium">
            Filtros
            <button
              onClick={() => setFilters((p) => [...p, { col: availableCols[0].ref, op: "=", value: "" }])}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
            >
              + Agregar
            </button>
          </div>
          <div className="space-y-2">
            {filters.map((f, idx) => (
              <div key={idx} className="flex gap-1">
                <ColSelect
                  value={f.col}
                  onChange={(ref) => setFilters((p) => p.map((x, i) => (i === idx ? { ...x, col: ref } : x)))}
                />
                <select
                  value={f.op}
                  onChange={(e) => setFilters((p) => p.map((x, i) => (i === idx ? { ...x, op: e.target.value as FilterOp } : x)))}
                  className="rounded border border-input bg-background px-1 py-1 text-xs"
                >
                  {OPS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <input
                  value={f.value}
                  onChange={(e) => setFilters((p) => p.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))}
                  placeholder="valor"
                  className="w-16 rounded border border-input bg-background px-2 py-1 text-xs"
                />
                <button onClick={() => setFilters((p) => p.filter((_, i) => i !== idx))} className="px-1 text-xs text-muted-foreground hover:text-danger">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
          {sql}
        </pre>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => startRun(async () => setResult(await runSql(sql)))}
            disabled={running}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {running ? "Ejecutando…" : "Previsualizar"}
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del dataset"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() =>
              startSave(async () => {
                const res = await saveSqlQuery(name || `${base.name} (consulta)`, sql);
                if ("error" in res) setResult({ error: res.error });
                else router.push(`/datasets/${res.datasetId}`);
              })
            }
            disabled={saving}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar como dataset"}
          </button>
        </div>

        {result && "error" in result && (
          <pre className="overflow-x-auto rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{result.error}</pre>
        )}
        {result && "rows" in result && (
          <div className="max-h-[400px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {result.columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {result.columns.map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-2 text-muted-foreground">{String(row[c] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
