/**
 * Instantánea de una gráfica v2: datos ya agregados y estilo mínimo para dibujarla
 * sin volver a consultar su fuente. Alimenta las miniaturas de la galería y la vista
 * de solo lectura de gráficas compartidas. Solo guarda lo que la gráfica dibuja (categorías
 * agregadas, o los puntos muestreados de una dispersión), nunca filas completas.
 */
import { aggregateByCategory, computeKpi, type ChartConfig, type Row } from "@/lib/charts";
import type { ChartV2Definition, ChartV2Metric, ChartV2Point, ChartV2Result, ChartV2Type } from "@/lib/chart-v2";

export type ChartSnapshotType = ChartV2Type | "map";
export type ChartSnapshot = {
  v: 1;
  type: ChartSnapshotType;
  points: ChartV2Point[];
  metric: ChartV2Metric;
  weighted: boolean;
  style: ChartV2Definition["style"];
  note: string;
  generatedAt: string;
};
export type ChartVisibility = "private" | "organization";

/** Tarjeta de la galería de Gráficas, ya autorizada para quien la ve. */
export type GalleryChart = {
  id: string;
  name: string;
  type: ChartSnapshotType;
  sourceKind: "survey" | "dataset";
  sourceName: string;
  organizationId: string;
  organizationName: string;
  visibility: ChartVisibility;
  /** true si quien ve la galería es el autor. */
  owner: boolean;
  authorName: string;
  updatedAt: string;
  snapshot: ChartSnapshot | null;
  /** Editor si es propia; vista de solo lectura si es compartida. */
  href: string;
  /** Propias, o compartidas de Encuestas cuya fuente también puede consultar quien la ve. */
  canDuplicate: boolean;
};

/** Tarjeta de la galería de Dashboards: hasta seis mosaicos con su posición en la cuadrícula. */
export type GalleryDashboard = {
  id: string;
  name: string;
  organizationName: string;
  chartCount: number;
  updatedAt: string;
  tiles: { layout: { x: number; y: number; w: number; h: number }; type: ChartSnapshotType; snapshot: ChartSnapshot | null }[];
};

/** Tope de puntos guardados: suficiente para una dispersión legible, pequeño para la galería. */
export const SNAPSHOT_POINT_LIMIT = 600;

export const CHART_TYPE_LABEL: Record<ChartSnapshotType, string> = {
  bar: "Barras", line: "Línea", area: "Área", pie: "Pastel", table: "Tabla", kpi: "Indicador",
  scatter: "Dispersión", histogram: "Histograma", boxplot: "Caja y bigotes", map: "Mapa",
};

function sample<T>(items: T[], limit = SNAPSHOT_POINT_LIMIT): T[] {
  if (items.length <= limit) return items;
  const step = items.length / limit;
  return Array.from({ length: limit }, (_, index) => items[Math.floor(index * step)]);
}

/** Versión ligera para listados: las miniaturas no necesitan más de unas decenas de puntos. */
export function thumbnailSnapshot(snapshot: ChartSnapshot | null, limit = 80): ChartSnapshot | null {
  return snapshot && snapshot.points.length > limit ? { ...snapshot, points: sample(snapshot.points, limit) } : snapshot;
}

export function surveySnapshot(definition: ChartV2Definition, result: ChartV2Result): ChartSnapshot {
  return {
    v: 1, type: definition.type, points: sample(result.points), metric: definition.metric,
    weighted: definition.weightMode === "weighted", style: definition.style, note: result.note,
    generatedAt: new Date().toISOString(),
  };
}

const strict = (value: unknown) => value === null || value === undefined || value === "" ? NaN : Number(value);
const quantile = (values: number[], fraction: number) => {
  const index = (values.length - 1) * fraction;
  const lower = Math.floor(index);
  return values[lower] + (values[Math.min(lower + 1, values.length - 1)] - values[lower]) * (index - lower);
};

function datasetPoints(config: ChartConfig, rows: Row[]): ChartV2Point[] {
  const { x, y } = config;
  const agg = config.aggregation ?? "sum";
  if (config.type === "kpi") return [{ value: computeKpi(rows, y, agg) }];
  if (config.type === "scatter") {
    if (!x || !y) return [];
    return rows.flatMap((row) => {
      const a = strict(row[x]);
      const b = strict(row[y]);
      return Number.isFinite(a) && Number.isFinite(b) ? [{ x: a, y: b }] : [];
    });
  }
  if (config.type === "histogram") {
    if (!x) return [];
    const values = rows.map((row) => strict(row[x])).filter(Number.isFinite);
    if (!values.length) return [];
    const min = values.reduce((current, value) => Math.min(current, value), Infinity);
    const max = values.reduce((current, value) => Math.max(current, value), -Infinity);
    const bins = max === min ? 1 : Math.max(2, Math.min(100, config.bins ?? 12));
    const width = max === min ? 1 : (max - min) / bins;
    const counts = Array.from({ length: bins }, () => 0);
    for (const value of values) counts[Math.min(bins - 1, Math.floor((value - min) / width))] += 1;
    return counts.map((value, index) => ({
      label: `${(min + index * width).toFixed(1)}–${(min + (index + 1) * width).toFixed(1)}`, value }));
  }
  if (config.type === "boxplot") {
    if (!x || !y) return [];
    const groups = new Map<string, number[]>();
    for (const row of rows) {
      const number = strict(row[y]);
      if (!Number.isFinite(number)) continue;
      const group = String(row[x] ?? "Sin grupo");
      groups.set(group, [...(groups.get(group) ?? []), number]);
    }
    return [...groups].map(([label, raw]) => {
      const values = raw.sort((a, b) => a - b);
      const q1 = quantile(values, 0.25);
      const q3 = quantile(values, 0.75);
      const inside = values.filter((value) => value >= q1 - 1.5 * (q3 - q1) && value <= q3 + 1.5 * (q3 - q1));
      return { label, min: inside[0], q1, median: quantile(values, 0.5), q3, max: inside[inside.length - 1],
        outliers: values.filter((value) => !inside.includes(value)).slice(0, 50) };
    });
  }
  if (!x) return [];
  // Barras, línea, área, pastel, tabla y mapa: categoría → valor agregado.
  const { categories, values } = aggregateByCategory(rows, x, y, agg);
  const points = categories.map((label, index) => ({ label, value: values[index] }));
  return config.type === "map" ? points.sort((a, b) => b.value - a.value) : points;
}

export function datasetSnapshot(config: ChartConfig, rows: Row[]): ChartSnapshot {
  const points = datasetPoints(config, rows);
  return {
    v: 1, type: config.type, points: sample(points), metric: config.aggregation === "avg" ? "avg" : config.aggregation === "count" ? "count" : "sum",
    weighted: false,
    style: { title: config.title, xLabel: config.xLabel, yLabel: config.yLabel, palette: config.palette,
      showLegend: config.showLegend, showLabels: config.showLabels, stacked: config.stacked },
    note: `${rows.length.toLocaleString("es-MX")} filas analizadas.`,
    generatedAt: new Date().toISOString(),
  };
}

/** Definición sintética para dibujar una instantánea con `SurveyChartRenderer`. Un mapa se muestra como ranking de barras. */
export function snapshotDefinition(snapshot: ChartSnapshot): ChartV2Definition {
  return {
    version: 2, source: { kind: "survey", instrumentId: "", versionId: "" },
    type: snapshot.type === "map" ? "bar" : snapshot.type, xVariableId: "", metric: snapshot.metric,
    percentageBase: "observations", weightMode: snapshot.weighted ? "weighted" : "unweighted",
    includeMissing: false, includeWarnings: false, includeInvalidObservations: false, bins: 12, style: snapshot.style,
  };
}

/** Valida la forma mínima de una instantánea leída de la base antes de dibujarla. */
export function readSnapshot(value: unknown): ChartSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<ChartSnapshot>;
  return snapshot.v === 1 && typeof snapshot.type === "string" && Array.isArray(snapshot.points) ? snapshot as ChartSnapshot : null;
}
