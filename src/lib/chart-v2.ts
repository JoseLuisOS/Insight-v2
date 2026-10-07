/** Persisted, renderer-independent definition for organization charts. */
export type ChartV2Type = "bar" | "line" | "area" | "pie" | "table" | "kpi" | "scatter" | "histogram" | "boxplot";
export type ChartV2Metric = "count" | "percent" | "sum" | "avg" | "median" | "min" | "max";
export type ChartV2Filter = { variableId: string; value: string };

export type ChartV2Definition = {
  version: 2;
  source: { kind: "survey"; instrumentId: string; versionId: string };
  type: ChartV2Type;
  xVariableId: string;
  yVariableId?: string;
  groupVariableId?: string;
  filter?: ChartV2Filter;
  filters?: ChartV2Filter[];
  metric: ChartV2Metric;
  percentageBase: "observations" | "selections";
  weightMode: "unweighted" | "weighted";
  includeMissing: boolean;
  includeWarnings: boolean;
  includeInvalidObservations: boolean;
  bins: number;
  style: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    palette?: string[];
    showLegend?: boolean;
    showLabels?: boolean;
    stacked?: boolean;
  };
};

export type ChartV2Point = {
  label?: string;
  group?: string;
  value?: number;
  x?: number;
  y?: number;
  weight?: number;
  min?: number;
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  outliers?: number[];
};

export type ChartV2Result = {
  points: ChartV2Point[];
  observationCount: number;
  base: number;
  shownCount: number;
  note: string;
};

export type ChartV2Variable = {
  id: string;
  code: string;
  label: string;
  question: string;
  dataType: string;
  numeric: boolean;
  options: string[];
};

export const CHART_V2_CATALOG: { type: ChartV2Type; label: string; numericX?: boolean; numericY?: boolean; group?: boolean }[] = [
  { type: "bar", label: "Barras" },
  { type: "line", label: "Línea" },
  { type: "area", label: "Área" },
  { type: "pie", label: "Pastel" },
  { type: "table", label: "Tabla" },
  { type: "kpi", label: "Indicador" },
  { type: "scatter", label: "Dispersión", numericX: true, numericY: true },
  { type: "histogram", label: "Histograma", numericX: true },
  { type: "boxplot", label: "Caja y bigotes", numericX: true, group: true },
];

export function defaultChartV2(instrumentId: string, versionId: string, xVariableId: string): ChartV2Definition {
  return {
    version: 2,
    source: { kind: "survey", instrumentId, versionId },
    type: "bar",
    xVariableId,
    metric: "percent",
    percentageBase: "observations",
    weightMode: "unweighted",
    includeMissing: true,
    includeWarnings: true,
    includeInvalidObservations: true,
    bins: 12,
    style: {},
  };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateChartV2(input: unknown): ChartV2Definition {
  if (!input || typeof input !== "object") throw new Error("Definición de gráfica inválida.");
  const value = input as ChartV2Definition;
  if (value.version !== 2 || value.source?.kind !== "survey" ||
      !uuid.test(value.source.instrumentId) || !uuid.test(value.source.versionId) ||
      !CHART_V2_CATALOG.some((item) => item.type === value.type) || !uuid.test(value.xVariableId) ||
      (value.yVariableId && !uuid.test(value.yVariableId)) ||
      (value.groupVariableId && !uuid.test(value.groupVariableId)) ||
      (value.filter && (!uuid.test(value.filter.variableId) || typeof value.filter.value !== "string" ||
        !value.filter.value.trim() || value.filter.value.length > 200)) ||
      !["count","percent","sum","avg","median","min","max"].includes(value.metric) ||
      !["observations","selections"].includes(value.percentageBase) ||
      !["weighted","unweighted"].includes(value.weightMode) ||
      typeof value.includeMissing !== "boolean" || typeof value.includeWarnings !== "boolean" ||
      typeof value.includeInvalidObservations !== "boolean" ||
      !Number.isInteger(value.bins) || value.bins < 2 || value.bins > 100) {
    throw new Error("Definición de gráfica inválida.");
  }
  if (value.filters !== undefined && (!Array.isArray(value.filters) || value.filters.length > 3 ||
      value.filters.some((filter) => !filter || !uuid.test(filter.variableId) ||
        typeof filter.value !== "string" || !filter.value.trim() || filter.value.length > 200))) {
    throw new Error("Filtros de gráfica inválidos.");
  }
  const filterIds = [value.filter?.variableId, ...(value.filters ?? []).map((filter) => filter.variableId)]
    .filter((id): id is string => !!id);
  if (new Set(filterIds).size !== filterIds.length) throw new Error("Cada pregunta solo puede filtrarse una vez.");
  const style = value.style ?? {};
  for (const text of [style.title, style.xLabel, style.yLabel]) {
    if (text !== undefined && (typeof text !== "string" || text.length > 160)) throw new Error("Texto de gráfica inválido.");
  }
  if (style.palette && (!Array.isArray(style.palette) || style.palette.length > 20 ||
      style.palette.some((color) => typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)))) {
    throw new Error("Paleta de gráfica inválida.");
  }
  return {
    version: 2, source: { kind: "survey", instrumentId: value.source.instrumentId, versionId: value.source.versionId },
    type: value.type, xVariableId: value.xVariableId, yVariableId: value.yVariableId,
    groupVariableId: value.groupVariableId, filter: value.filter, filters: value.filters,
    metric: value.metric, percentageBase: value.percentageBase, weightMode: value.weightMode,
    includeMissing: value.includeMissing, includeWarnings: value.includeWarnings,
    includeInvalidObservations: value.includeInvalidObservations, bins: value.bins,
    style: { title: style.title, xLabel: style.xLabel, yLabel: style.yLabel,
      palette: style.palette,
      showLegend: style.showLegend === undefined ? undefined : !!style.showLegend,
      showLabels: style.showLabels === undefined ? undefined : !!style.showLabels,
      stacked: style.stacked === undefined ? undefined : !!style.stacked },
  };
}
