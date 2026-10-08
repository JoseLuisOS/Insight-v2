"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, BarChart3, BoxSelect, Gauge, LineChart, Map as MapIcon, PieChart, ScatterChart, Table2, type LucideIcon } from "lucide-react";
import { CubeLoader } from "@/components/cube-loader";
import { formatNumber, PALETTE } from "@/lib/charts";
import { CHART_TYPE_LABEL, type ChartSnapshot, type ChartSnapshotType } from "@/lib/chart-snapshot";

const ReactECharts = dynamic(() => import("@/components/insight-echarts"), { ssr: false });

export const CHART_TYPE_ICON: Record<ChartSnapshotType, LucideIcon> = {
  bar: BarChart3, histogram: BarChart3, line: LineChart, area: Activity, pie: PieChart, scatter: ScatterChart,
  boxplot: BoxSelect, map: MapIcon, kpi: Gauge, table: Table2,
};

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") && mq.matches));
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return dark;
}

function buildOption(snapshot: ChartSnapshot, type: ChartSnapshotType, dark: boolean): Record<string, unknown> {
  const { points, style } = snapshot;
  const color = style.palette?.length ? style.palette : PALETTE;
  const guide = dark ? "rgba(148,163,184,0.16)" : "rgba(100,116,139,0.16)";
  const base = { animation: false, color, grid: { left: 6, right: 6, top: 10, bottom: 6 } };
  const hiddenAxis = { axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false } };
  const valueAxis = { type: "value", ...hiddenAxis, splitLine: { lineStyle: { color: guide } } };
  if (type === "pie") return { ...base, series: [{ type: "pie", silent: true, radius: ["48%", "78%"], label: { show: false }, labelLine: { show: false },
    itemStyle: { borderWidth: 1, borderColor: dark ? "#0f172a" : "#ffffff" },
    data: points.map((point) => ({ name: point.label, value: point.value })) }] };
  if (type === "scatter") {
    const groups = [...new Set(points.map((point) => point.group ?? ""))];
    return { ...base, xAxis: { type: "value", ...hiddenAxis, splitLine: { show: false } }, yAxis: valueAxis,
      series: groups.map((group) => ({ type: "scatter", silent: true, symbolSize: 4, itemStyle: { opacity: 0.7 },
        data: points.filter((point) => (point.group ?? "") === group).map((point) => [point.x, point.y]) })) };
  }
  if (type === "boxplot") {
    const outliers = points.flatMap((point, index) => (point.outliers ?? []).map((value) => [index, value]));
    return { ...base, xAxis: { type: "category", data: points.map((point) => point.label), ...hiddenAxis }, yAxis: valueAxis,
      series: [{ type: "boxplot", silent: true, data: points.map((point) => [point.min, point.q1, point.median, point.q3, point.max]) },
        { type: "scatter", silent: true, symbolSize: 3, data: outliers }] };
  }
  if (type === "map") {
    const top = points.filter((point) => point.value !== undefined).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 6).reverse();
    return { ...base, xAxis: { ...valueAxis, splitLine: { show: false } }, yAxis: { type: "category", data: top.map((point) => point.label), ...hiddenAxis },
      series: [{ type: "bar", silent: true, barCategoryGap: "35%", itemStyle: { borderRadius: [0, 3, 3, 0] }, data: top.map((point) => point.value) }] };
  }
  const categories = [...new Set(points.map((point) => point.label ?? ""))];
  const groups = [...new Set(points.map((point) => point.group ?? "Valor"))];
  const isLine = type === "line" || type === "area";
  return { ...base, xAxis: { type: "category", data: categories, boundaryGap: !isLine, ...hiddenAxis }, yAxis: valueAxis,
    series: groups.map((group, index) => {
      const data = categories.map((category) => points.find((point) => point.label === category && (point.group ?? "Valor") === group)?.value ?? 0);
      const tone = color[index % color.length];
      if (isLine) return { type: "line", silent: true, smooth: true, showSymbol: false, data, lineStyle: { width: 2 },
        stack: style.stacked ? "total" : undefined,
        areaStyle: type === "area" ? { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: tone }, { offset: 1, color: "rgba(0,0,0,0)" }] }, opacity: 0.25 } : undefined };
      return { type: "bar", silent: true, data, stack: style.stacked ? "total" : undefined,
        itemStyle: { borderRadius: style.stacked ? 0 : [3, 3, 0, 0] } };
    }) };
}

function Center({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-center">{children}</div>;
}

export function ChartThumbnail({ snapshot, type, height = 160, pending = false }: {
  snapshot: ChartSnapshot | null; type: ChartSnapshotType; height?: number | string; pending?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const dark = useDark();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Icon = CHART_TYPE_ICON[type];
  const points = snapshot?.points ?? [];
  const label = CHART_TYPE_LABEL[type];
  let body: ReactNode = null;
  if (pending) body = <Center><CubeLoader size={18} /><span className="text-xs text-muted-foreground">Generando vista previa…</span></Center>;
  else if (!snapshot) body = <Center><Icon className="size-8 text-muted-foreground/60" aria-hidden="true" /><span className="text-xs text-muted-foreground">Sin vista previa</span></Center>;
  else if (!points.length) body = <Center><Icon className="size-6 text-muted-foreground/60" aria-hidden="true" /><span className="text-xs text-muted-foreground">Sin datos para mostrar</span></Center>;
  else if (!visible) body = null;
  else if (type === "kpi") body = <Center>
    <span className="text-3xl font-semibold tracking-tight text-foreground">{formatNumber(points.reduce((sum, point) => sum + (point.value ?? 0), 0))}</span>
    <span className="text-[11px] text-muted-foreground">{label}</span></Center>;
  else if (type === "table") body = <div className="flex h-full w-full items-center"><table className="w-full table-fixed text-[11px]"><tbody>
    {points.slice(0, 4).map((point, index) => <tr key={index} className="border-b border-border/60 last:border-0">
      <td className="truncate py-0.5 pr-2 text-foreground">{point.label ?? point.group ?? "—"}</td>
      <td className="w-20 py-0.5 text-right tabular-nums text-muted-foreground">{formatNumber(point.value ?? 0)}</td></tr>)}
  </tbody></table></div>;
  else body = <div className="relative h-full w-full">
    <ReactECharts option={buildOption(snapshot, type, dark)} style={{ height: "100%", width: "100%" }} notMerge />
    {type === "map" && <span className="absolute right-0 top-0 grid size-5 place-items-center rounded-md bg-muted text-muted-foreground" title="Mapa">
      <MapIcon className="size-3" aria-hidden="true" /><span className="sr-only">Mapa</span></span>}
  </div>;

  return <div ref={ref} className="w-full" style={{ height }}>{body}</div>;
}
