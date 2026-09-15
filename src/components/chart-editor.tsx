"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChartRenderer } from "@/components/chart-renderer";
import { saveChart, updateChart } from "@/app/(app)/charts/actions";
import {
  PRESET_PALETTES,
  type Aggregation,
  type ChartConfig,
  type ChartType,
  type Row,
} from "@/lib/charts";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "kpi", label: "KPI" },
  { value: "bar", label: "Barras" },
  { value: "line", label: "Línea" },
  { value: "area", label: "Área" },
  { value: "pie", label: "Pastel" },
  { value: "table", label: "Tabla" },
  { value: "map", label: "Mapa" },
];

const AGGS: { value: Aggregation; label: string }[] = [
  { value: "sum", label: "Suma" },
  { value: "avg", label: "Promedio" },
  { value: "count", label: "Conteo" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
];

export function ChartEditor({
  datasetId,
  datasetName,
  columns,
  rows,
  themes = [],
  metrics = [],
  maps = [],
  chartId,
  initialName,
  initialConfig,
}: {
  datasetId: string;
  datasetName: string;
  columns: string[];
  rows: Row[];
  themes?: { name: string; palette: string[] }[];
  metrics?: { id: string; name: string; column_key: string; agg: string }[];
  maps?: { id: string; name: string; name_property: string; geojson: object }[];
  /** When set, the editor updates this chart instead of creating a new one. */
  chartId?: string;
  initialName?: string;
  initialConfig?: ChartConfig;
}) {
  const router = useRouter();
  const palettes: Record<string, string[]> = {
    ...PRESET_PALETTES,
    ...Object.fromEntries(themes.map((t) => [`Tema: ${t.name}`, t.palette])),
  };
  const [name, setName] = useState(initialName ?? "");
  const [config, setConfig] = useState<ChartConfig>(
    initialConfig ?? {
      type: "bar",
      x: columns[0],
      y: columns[1] ?? columns[0],
      aggregation: "sum",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const set = (patch: Partial<ChartConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));

  const needsX = config.type !== "kpi" && config.type !== "table";
  const needsY = config.type !== "table";

  const selectedMap = maps.find((m) => m.id === config.mapId);
  const geo = selectedMap
    ? { name: `map_${selectedMap.id}`, geojson: selectedMap.geojson, nameProperty: selectedMap.name_property }
    : undefined;

  function save() {
    setError(null);
    startSave(async () => {
      const res = chartId
        ? await updateChart(chartId, name, config)
        : await saveChart(datasetId, name, config);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(`/charts/${res.chartId}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Gráfica de ${datasetName}`}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tipo</label>
          <div className="grid grid-cols-3 gap-1">
            {CHART_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => set({ type: t.value })}
                className={`rounded-md border px-2 py-1.5 text-xs transition ${
                  config.type === t.value
                    ? "border-primary bg-brand-50 text-brand-700"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {config.type === "map" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Mapa</label>
            {maps.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay mapas. Crea uno en la sección <strong>Mapas</strong> (sube un GeoJSON).
              </p>
            ) : (
              <select
                value={config.mapId ?? ""}
                onChange={(e) => set({ mapId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— elige un mapa —</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {needsX && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              {config.type === "pie" ? "Categoría" : config.type === "map" ? "Región" : "Eje X"}
            </label>
            <select
              value={config.x ?? ""}
              onChange={(e) => set({ x: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsY && metrics.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">Métrica guardada</label>
            <select
              defaultValue=""
              onChange={(e) => {
                const m = metrics.find((x) => x.id === e.target.value);
                if (m)
                  set({
                    y: m.column_key,
                    aggregation: m.agg as Aggregation,
                    title: config.title || m.name,
                  });
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— usar campo manual —</option>
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.agg})
                </option>
              ))}
            </select>
          </div>
        )}

        {needsY && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {config.type === "kpi" ? "Valor" : "Eje Y"}
              </label>
              <select
                value={config.y ?? ""}
                onChange={(e) => set({ y: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Agregación</label>
              <select
                value={config.aggregation ?? "sum"}
                onChange={(e) => set({ aggregation: e.target.value as Aggregation })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {AGGS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {config.type !== "table" && (
          <details className="rounded-md border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">Estilo</summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Título</label>
                <input
                  value={config.title ?? ""}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="(sin título)"
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              {config.type !== "kpi" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Paleta</label>
                    <select
                      onChange={(e) => set({ palette: palettes[e.target.value] })}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                      {Object.keys(palettes).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.showLegend ?? false}
                      onChange={(e) => set({ showLegend: e.target.checked })}
                    />
                    Mostrar leyenda
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.showLabels ?? false}
                      onChange={(e) => set({ showLabels: e.target.checked })}
                    />
                    Mostrar valores
                  </label>
                  {config.type === "bar" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.stacked ?? false}
                        onChange={(e) => set({ stacked: e.target.checked })}
                      />
                      Apiladas
                    </label>
                  )}
                  {(config.type === "line" || config.type === "area") && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.smooth ?? true}
                        onChange={(e) => set({ smooth: e.target.checked })}
                      />
                      Línea suave
                    </label>
                  )}
                  {config.type !== "pie" && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={config.xLabel ?? ""}
                        onChange={(e) => set({ xLabel: e.target.value })}
                        placeholder="Etiqueta X"
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      />
                      <input
                        value={config.yLabel ?? ""}
                        onChange={(e) => set({ yLabel: e.target.value })}
                        placeholder="Etiqueta Y"
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </details>
        )}

        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : chartId ? "Guardar cambios" : "Guardar gráfica"}
        </button>
      </div>

      <div>
        <ChartRenderer
          config={config}
          rows={rows}
          columns={columns}
          height={420}
          exportable
          exportName={name || `grafica-${datasetName}`}
          geo={geo}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Vista previa sobre {rows.length.toLocaleString("es-MX")} filas de{" "}
          {datasetName}.
        </p>
      </div>
    </div>
  );
}
