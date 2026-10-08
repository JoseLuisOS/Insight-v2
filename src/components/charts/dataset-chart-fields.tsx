"use client";

import { PRESET_PALETTES, type Aggregation, type ChartConfig } from "@/lib/charts";
import type { ChartMapOption } from "@/lib/chart-studio";

const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

const AGGS: { value: Aggregation; label: string }[] = [
  { value: "sum", label: "Suma" },
  { value: "avg", label: "Promedio" },
  { value: "count", label: "Conteo" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
];

/** Controles de campos de una gráfica de dataset (sin nombre, fuente ni tipo). */
export function DatasetChartFields({ config, columns, maps, onChange, disabled }: {
  config: ChartConfig;
  columns: string[];
  maps: ChartMapOption[];
  onChange: (patch: Partial<ChartConfig>) => void;
  disabled?: boolean;
}) {
  const set = onChange;
  const needsX = config.type !== "kpi" && config.type !== "table";
  const needsY = config.type !== "table" && config.type !== "histogram";

  return <fieldset disabled={disabled} className="min-w-0 space-y-4 border-0 p-0">
    {config.type === "map" && <div>
      <label className={labelClass} htmlFor="dataset-map">Mapa</label>
      {maps.length === 0
        ? <p className="text-xs text-muted-foreground">No hay mapas. Carga un GeoJSON debajo de la gráfica.</p>
        : <select id="dataset-map" className={inputClass} value={config.mapId ?? ""} onChange={(event) => set({ mapId: event.target.value })}>
          <option value="">— elige un mapa —</option>
          {maps.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>}
    </div>}

    {needsX && <div>
      <label className={labelClass} htmlFor="dataset-x">{config.type === "pie" ? "Categoría" : config.type === "map" ? "Región" : "Eje X"}</label>
      <select id="dataset-x" className={inputClass} value={config.x ?? ""} onChange={(event) => set({ x: event.target.value })}>
        {columns.map((column) => <option key={column} value={column}>{column}</option>)}
      </select>
    </div>}

    {needsY && <>
      <div>
        <label className={labelClass} htmlFor="dataset-y">{config.type === "kpi" ? "Valor" : "Eje Y"}</label>
        <select id="dataset-y" className={inputClass} value={config.y ?? ""} onChange={(event) => set({ y: event.target.value })}>
          {columns.map((column) => <option key={column} value={column}>{column}</option>)}
        </select>
      </div>
      {!["scatter", "boxplot"].includes(config.type) && <div>
        <label className={labelClass} htmlFor="dataset-aggregation">Agregación</label>
        <select id="dataset-aggregation" className={inputClass} value={config.aggregation ?? "sum"} onChange={(event) => set({ aggregation: event.target.value as Aggregation })}>
          {AGGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>}
    </>}

    {config.type === "histogram" && <div>
      <label className={labelClass} htmlFor="dataset-bins">Intervalos: {config.bins ?? 12}</label>
      <input id="dataset-bins" type="range" min={2} max={50} value={config.bins ?? 12} onChange={(event) => set({ bins: Number(event.target.value) })} className="w-full" />
    </div>}

    {config.type !== "table" && <details className="rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">Estilo</summary>
      <div className="mt-3 space-y-3">
        <div>
          <label className={labelClass} htmlFor="dataset-title">Título</label>
          <input id="dataset-title" className={inputClass} value={config.title ?? ""} onChange={(event) => set({ title: event.target.value })} placeholder="(sin título)" />
        </div>
        {config.type !== "kpi" && <>
          <div>
            <label className={labelClass} htmlFor="dataset-palette">Paleta</label>
            <select id="dataset-palette" className={inputClass} onChange={(event) => set({ palette: PRESET_PALETTES[event.target.value] })}>
              {Object.keys(PRESET_PALETTES).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.showLegend ?? false} onChange={(event) => set({ showLegend: event.target.checked })} />Mostrar leyenda</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.showLabels ?? false} onChange={(event) => set({ showLabels: event.target.checked })} />Mostrar valores</label>
          {config.type === "bar" && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.stacked ?? false} onChange={(event) => set({ stacked: event.target.checked })} />Apiladas</label>}
          {(config.type === "line" || config.type === "area") && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.smooth ?? true} onChange={(event) => set({ smooth: event.target.checked })} />Línea suave</label>}
          {config.type !== "pie" && <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass} htmlFor="dataset-x-label">Etiqueta X</label>
              <input id="dataset-x-label" className={inputClass} value={config.xLabel ?? ""} onChange={(event) => set({ xLabel: event.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="dataset-y-label">Etiqueta Y</label>
              <input id="dataset-y-label" className={inputClass} value={config.yLabel ?? ""} onChange={(event) => set({ yLabel: event.target.value })} />
            </div>
          </div>}
        </>}
      </div>
    </details>}
  </fieldset>;
}
