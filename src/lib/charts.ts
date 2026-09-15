/**
 * Chart model + publication-ready ECharts option builder.
 * Defaults aim for "presentable without tweaking": brand-derived accessible
 * palette, clean grid, informative tooltips, responsive sizing.
 */

export type ChartType = "kpi" | "bar" | "line" | "area" | "pie" | "table" | "map";

export type Aggregation = "sum" | "avg" | "count" | "min" | "max" | "none";

export type ChartConfig = {
  type: ChartType;
  /** Category / x-axis field (also the label field for pie/kpi=none). */
  x?: string;
  /** Value / y-axis field. */
  y?: string;
  aggregation?: Aggregation;
  title?: string;
  /** For type 'map': the maps.id whose GeoJSON to render. */
  mapId?: string;
  // --- styling (Ola 2) ---
  palette?: string[];
  showLegend?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  showLabels?: boolean;
  xLabel?: string;
  yLabel?: string;
};

/** Brand-derived categorical palette (accessible, not a naive rainbow). */
export const PALETTE = [
  "#4377BC",
  "#2E5A98",
  "#6B97CE",
  "#244873",
  "#84abdf",
  "#11212f",
  "#b45309",
  "#15803d",
];

/** Named preset palettes (all colorblind-conscious). */
export const PRESET_PALETTES: Record<string, string[]> = {
  Intersel: PALETTE,
  "Azules": ["#11212f", "#244873", "#2E5A98", "#4377BC", "#6B97CE", "#84abdf", "#adc7ea"],
  "Cálida": ["#7c2d12", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"],
  "Fría": ["#0f766e", "#0e7490", "#0369a1", "#4377BC", "#6d28d9", "#7c3aed"],
  "Accesible": ["#4377BC", "#d97706", "#15803d", "#b91c1c", "#7c3aed", "#0e7490"],
};

const toNum = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

function aggregateValues(values: number[], agg: Aggregation): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "count":
      return values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "sum":
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

export type Row = Record<string, unknown>;

/** Group rows by the category field and aggregate the value field. */
export function aggregateByCategory(
  rows: Row[],
  x: string,
  y: string | undefined,
  agg: Aggregation,
): { categories: string[]; values: number[] } {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const key = String(r[x] ?? "—");
    const val = y ? toNum(r[y]) : 1;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(val);
  }
  const categories = [...groups.keys()];
  const values = categories.map((c) =>
    aggregateValues(groups.get(c)!, agg === "none" ? "sum" : agg),
  );
  return { categories, values };
}

/** Single value for a KPI card. */
export function computeKpi(
  rows: Row[],
  y: string | undefined,
  agg: Aggregation,
): number {
  if (!y) return rows.length; // count of rows
  const vals = rows.map((r) => toNum(r[y]));
  return aggregateValues(vals, agg === "none" ? "sum" : agg);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n);
}

type EChartsOption = Record<string, unknown>;

/** Build an ECharts option for a choropleth map (region colored by value). */
export function buildMapOption(
  config: ChartConfig,
  rows: Row[],
  mapName: string,
  nameProperty: string,
  dark: boolean,
): EChartsOption {
  const palette = config.palette?.length ? config.palette : PALETTE;
  const agg = config.aggregation ?? "sum";
  const { categories, values } = config.x
    ? aggregateByCategory(rows, config.x, config.y, agg)
    : { categories: [], values: [] };
  const data = categories.map((c, i) => ({ name: c, value: values[i] }));
  const max = Math.max(1, ...values);
  const axisColor = dark ? "#94a3b8" : "#64748b";
  return {
    ...(config.title
      ? { title: { text: config.title, left: "center", textStyle: { color: axisColor, fontSize: 14 } } }
      : {}),
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    visualMap: {
      min: 0,
      max,
      left: "left",
      bottom: 20,
      calculable: true,
      inRange: { color: [palette[4] ?? "#cfe0f3", palette[0] ?? "#4377BC"] },
      textStyle: { color: axisColor },
    },
    series: [
      {
        type: "map",
        map: mapName,
        nameProperty,
        roam: true,
        emphasis: { label: { show: true } },
        data,
      },
    ],
  };
}

/** Build an ECharts option for bar/line/area/pie chart types. */
export function buildEChartsOption(
  config: ChartConfig,
  rows: Row[],
  dark: boolean,
): EChartsOption {
  const axisColor = dark ? "#94a3b8" : "#64748b";
  const splitColor = dark ? "#1e293b" : "#e2e8f0";
  const palette = config.palette?.length ? config.palette : PALETTE;
  const showLegend = config.showLegend ?? false;
  const titleBlock = config.title
    ? { title: { text: config.title, left: "center", textStyle: { color: axisColor, fontSize: 14 } } }
    : {};
  const base = {
    ...titleBlock,
    color: palette,
    textStyle: { fontFamily: "inherit" },
    tooltip: { trigger: config.type === "pie" ? "item" : "axis" },
    grid: { left: 48, right: 24, top: config.title ? 48 : 24, bottom: showLegend ? 56 : 40, containLabel: true },
  };

  const x = config.x;
  const agg = config.aggregation ?? "sum";

  if (config.type === "pie") {
    if (!x) return base;
    const { categories, values } = aggregateByCategory(rows, x, config.y, agg);
    return {
      ...base,
      tooltip: { trigger: "item" },
      legend: { bottom: 0, show: config.showLegend ?? true, textStyle: { color: axisColor } },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          label: { show: config.showLabels ?? false },
          itemStyle: { borderRadius: 4, borderColor: dark ? "#0f172a" : "#fff", borderWidth: 2 },
          data: categories.map((c, i) => ({ name: c, value: values[i] })),
        },
      ],
    };
  }

  // bar / line / area
  if (!x) return base;
  const { categories, values } = aggregateByCategory(rows, x, config.y, agg);
  const isArea = config.type === "area";
  const smooth = config.smooth ?? config.type !== "bar";
  return {
    ...base,
    legend: showLegend ? { bottom: 0, textStyle: { color: axisColor } } : undefined,
    xAxis: {
      type: "category",
      data: categories,
      name: config.xLabel,
      nameLocation: "middle",
      nameGap: 28,
      axisLine: { lineStyle: { color: splitColor } },
      axisLabel: { color: axisColor },
    },
    yAxis: {
      type: "value",
      name: config.yLabel,
      splitLine: { lineStyle: { color: splitColor } },
      axisLabel: { color: axisColor },
    },
    series: [
      {
        name: config.y ?? "valor",
        type: config.type === "bar" ? "bar" : "line",
        data: values,
        smooth: config.type === "bar" ? false : smooth,
        stack: config.stacked ? "total" : undefined,
        areaStyle: isArea ? { opacity: 0.2 } : undefined,
        label: { show: config.showLabels ?? false, position: "top" },
        itemStyle: { borderRadius: config.type === "bar" ? [4, 4, 0, 0] : 0 },
        showSymbol: config.type !== "bar",
      },
    ],
  };
}
