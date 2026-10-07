"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { downloadCsv, downloadUrl, slugify } from "@/lib/export";
import { formatNumber, PALETTE } from "@/lib/charts";
import type { ChartV2Definition, ChartV2Point, ChartV2Result } from "@/lib/chart-v2";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
type Instance = { getDataURL: (options: Record<string, unknown>) => string };

function option(definition: ChartV2Definition, result: ChartV2Result): Record<string, unknown> {
  const { points } = result;
  const { type, style } = definition;
  const palette = style.palette?.length ? style.palette : PALETTE;
  const base = {
    color: palette,
    title: style.title ? { text: style.title, left: "center" } : undefined,
    tooltip: { trigger: type === "pie" || type === "scatter" ? "item" : "axis" },
    legend: { show: style.showLegend ?? !!points.some((point) => point.group), bottom: 0 },
    grid: { left: 32, right: 24, top: style.title ? 64 : 28, bottom: 52, containLabel: true },
  };
  if (type === "scatter") {
    const groups = [...new Set(points.map((point) => point.group ?? "Observaciones"))];
    return { ...base, xAxis: { type: "value", name: style.xLabel }, yAxis: { type: "value", name: style.yLabel },
      series: groups.map((group) => ({ name: group, type: "scatter",
        symbolSize: (datum: number[]) => definition.weightMode === "weighted" ? Math.max(5, Math.min(24, 6 + Math.sqrt(Math.max(0, datum[2] ?? 1)) * 3)) : 8,
        data: points.filter((point) => (point.group ?? "Observaciones") === group).map((point) => [point.x, point.y, point.weight]) })) };
  }
  if (type === "boxplot") {
    const categories = points.map((point) => point.label);
    const outliers = points.flatMap((point, index) => (point.outliers ?? []).map((value) => [index, value]));
    return { ...base, xAxis: { type: "category", data: categories, name: style.xLabel },
      yAxis: { type: "value", name: style.yLabel },
      series: [
        { name: "Distribución", type: "boxplot", data: points.map((point) => [point.min, point.q1, point.median, point.q3, point.max]) },
        { name: "Atípicos", type: "scatter", data: outliers, symbolSize: 5 },
      ] };
  }
  if (type === "pie") return { ...base, tooltip: { trigger: "item" },
    series: [{ type: "pie", radius: ["38%", "70%"], data: points.map((point) => ({ name: point.label, value: point.value })),
      label: { show: style.showLabels ?? false } }] };
  const categories = [...new Set(points.map((point) => point.label ?? ""))];
  const groups = [...new Set(points.map((point) => point.group ?? "Valor"))];
  const seriesType = type === "line" || type === "area" ? "line" : "bar";
  return { ...base, xAxis: { type: "category", data: categories, name: style.xLabel, axisLabel: { interval: 0, rotate: categories.length > 8 ? 35 : 0 } },
    yAxis: { type: "value", name: style.yLabel ?? (definition.metric === "percent" ? "%" : undefined) },
    series: groups.map((group) => ({ name: group, type: seriesType,
      stack: style.stacked ? "total" : undefined,
      areaStyle: type === "area" ? { opacity: 0.2 } : undefined,
      label: { show: style.showLabels ?? false },
      data: categories.map((category) => points.find((point) => point.label === category && (point.group ?? "Valor") === group)?.value ?? 0) })) };
}

export function SurveyChartRenderer({ definition, result, name, height = 440, exportable = true }: {
  definition: ChartV2Definition; result: ChartV2Result; name: string; height?: number; exportable?: boolean;
}) {
  const chartRef = useRef<Instance | null>(null);
  const data = result.points;
  const exportCsv = () => {
    const columns = [...new Set(data.flatMap((point) => Object.keys(point)))];
    downloadCsv(columns, data as ChartV2Point[], `${slugify(name)}.csv`);
  };
  const exportPng = () => {
    if (chartRef.current) downloadUrl(chartRef.current.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" }), `${slugify(name)}.png`);
  };
  const exportPdf = async () => {
    if (!chartRef.current) return;
    const png = chartRef.current.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    pdf.setFontSize(16);
    pdf.text(name, 32, 36);
    pdf.addImage(png, "PNG", 32, 55, pdf.internal.pageSize.getWidth() - 64, 370);
    pdf.save(`${slugify(name)}.pdf`);
  };
  return <div className="rounded-xl border border-border bg-card p-4">
    {definition.type === "table" ? (
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Categoría</th><th className="p-2 text-left">Grupo</th><th className="p-2 text-right">Valor</th></tr></thead>
          <tbody>{data.map((point, index) => <tr key={index} className="border-t border-border"><td className="p-2">{point.label}</td><td className="p-2">{point.group}</td><td className="p-2 text-right">{formatNumber(point.value ?? 0)}</td></tr>)}</tbody></table>
      </div>
    ) : definition.type === "kpi" ? (
      <div className="flex flex-col items-center justify-center" style={{ height }}><span className="text-sm text-muted-foreground">{name}</span><strong className="mt-3 text-5xl">{formatNumber(data.reduce((sum, point) => sum + (point.value ?? 0), 0))}</strong></div>
    ) : <ReactECharts option={option(definition, result)} style={{ height }} notMerge onChartReady={(instance: Instance) => { chartRef.current = instance; }} />}
    <p className="mt-2 text-xs text-muted-foreground">{result.note}</p>
    {exportable && <div className="mt-3 flex gap-2 text-xs">
      {definition.type !== "table" && definition.type !== "kpi" && <><button type="button" onClick={exportPng} className="rounded border border-border px-2 py-1 hover:bg-muted">PNG</button><button type="button" onClick={exportPdf} className="rounded border border-border px-2 py-1 hover:bg-muted">PDF</button></>}
      <button type="button" onClick={exportCsv} className="rounded border border-border px-2 py-1 hover:bg-muted">CSV</button>
    </div>}
  </div>;
}
