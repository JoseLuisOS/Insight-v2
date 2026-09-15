"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  buildEChartsOption,
  buildMapOption,
  computeKpi,
  formatNumber,
  type ChartConfig,
  type Row,
} from "@/lib/charts";
import { downloadCsv, downloadUrl, slugify } from "@/lib/export";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type EChartsInstance = { getDataURL: (opts: Record<string, unknown>) => string };

export function ChartRenderer({
  config,
  rows,
  columns,
  height = 360,
  exportable = false,
  exportName = "intersel-insight",
  onSelect,
  geo,
}: {
  config: ChartConfig;
  rows: Row[];
  columns: string[];
  height?: number;
  exportable?: boolean;
  exportName?: string;
  /** Cross-filter: fired when a category is clicked (column, value). */
  onSelect?: (column: string | undefined, value: string) => void;
  /** For type 'map': the GeoJSON to register and render. */
  geo?: { name: string; geojson: object; nameProperty?: string };
}) {
  const [dark, setDark] = useState(false);
  const [mapReady, setMapReady] = useState<string | null>(null);
  const chartRef = useRef<EChartsInstance | null>(null);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.type !== "map" || !geo) return;
    let active = true;
    import("echarts").then((echarts) => {
      if (!active) return;
      echarts.registerMap(geo.name, geo.geojson as never);
      setMapReady(geo.name);
    });
    return () => {
      active = false;
    };
  }, [config.type, geo]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () =>
      setDark(
        document.documentElement.classList.contains("dark") ||
          (!document.documentElement.classList.contains("light") && mq.matches),
      );
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const isEcharts = !["kpi", "table"].includes(config.type);

  const exportPng = () => {
    if (!chartRef.current) return;
    const url = chartRef.current.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: dark ? "#0f172a" : "#ffffff",
    });
    downloadUrl(url, `${slugify(exportName)}.png`);
  };

  const exportCsv = () => {
    const cols = columns.length ? columns : rows.length ? Object.keys(rows[0]) : [];
    downloadCsv(cols, rows, `${slugify(exportName)}.csv`);
  };

  const exportPdf = async () => {
    if (!chartRef.current) return;
    const png = chartRef.current.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 32;
    const imgW = pageW - margin * 2;
    const imgH = imgW * 0.5;
    pdf.setFontSize(16);
    pdf.text(exportName, margin, margin + 4);
    pdf.addImage(png, "PNG", margin, margin + 20, imgW, imgH);
    pdf.save(`${slugify(exportName)}.pdf`);
  };

  // PNG/PDF for non-ECharts charts (KPI, table) by capturing the DOM.
  const exportDomPng = async () => {
    if (!domRef.current) return;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(domRef.current, {
      scale: 2,
      backgroundColor: dark ? "#0f172a" : "#ffffff",
    });
    downloadUrl(canvas.toDataURL("image/png"), `${slugify(exportName)}.png`);
  };

  const exportDomPdf = async () => {
    if (!domRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(domRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const margin = 32;
    const imgW = pw - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    pdf.setFontSize(16);
    pdf.text(exportName, margin, margin + 4);
    pdf.addImage(img, "PNG", margin, margin + 20, imgW, imgH);
    pdf.save(`${slugify(exportName)}.pdf`);
  };

  const Toolbar = exportable ? (
    <div className="mb-2 flex justify-end gap-2">
      <button
        onClick={isEcharts ? exportPng : exportDomPng}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
      >
        Exportar PNG
      </button>
      <button
        onClick={isEcharts ? exportPdf : exportDomPdf}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
      >
        Exportar PDF
      </button>
      <button
        onClick={exportCsv}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
      >
        Exportar CSV
      </button>
    </div>
  ) : null;

  if (config.type === "kpi") {
    const value = computeKpi(rows, config.y, config.aggregation ?? "sum");
    return (
      <div>
        {Toolbar}
        <div
          ref={domRef}
          className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6"
          style={{ minHeight: height }}
        >
          <div className="text-5xl font-bold text-primary">{formatNumber(value)}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {config.title || config.y || "Total de filas"}
          </div>
        </div>
      </div>
    );
  }

  if (config.type === "table") {
    const cols = columns.length ? columns : rows.length ? Object.keys(rows[0]) : [];
    return (
      <div>
        {Toolbar}
        <div
          ref={domRef}
          className="overflow-auto rounded-xl border border-border"
          style={{ maxHeight: height }}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 500).map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {cols.map((c) => (
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

  if (config.type === "map") {
    if (!geo) {
      return (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
          style={{ height }}
        >
          Elige un mapa y un campo de región.
        </div>
      );
    }
    if (mapReady !== geo.name) {
      return (
        <div
          className="flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground"
          style={{ height }}
        >
          Cargando mapa…
        </div>
      );
    }
    const mapOption = buildMapOption(config, rows, geo.name, geo.nameProperty ?? "name", dark);
    return (
      <div>
        {Toolbar}
        <div className="rounded-xl border border-border bg-card p-2">
          <ReactECharts
            option={mapOption}
            style={{ height }}
            notMerge
            opts={{ renderer: "canvas" }}
            onChartReady={(instance: EChartsInstance) => {
              chartRef.current = instance;
            }}
          />
        </div>
      </div>
    );
  }

  if (!config.x) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
        style={{ height }}
      >
        Elige un campo de categoría para ver la gráfica.
      </div>
    );
  }

  const option = buildEChartsOption(config, rows, dark);
  return (
    <div>
      {Toolbar}
      <div className="rounded-xl border border-border bg-card p-2">
        <ReactECharts
          option={option}
          style={{ height }}
          notMerge
          opts={{ renderer: "canvas" }}
          onChartReady={(instance: EChartsInstance) => {
            chartRef.current = instance;
          }}
          onEvents={
            onSelect
              ? { click: (p: { name?: string }) => onSelect(config.x, String(p?.name ?? "")) }
              : undefined
          }
        />
      </div>
    </div>
  );
}
