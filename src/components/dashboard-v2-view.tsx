"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { Responsive, type Layout } from "react-grid-layout";
import { useRouter } from "next/navigation";
import { ChartRenderer } from "@/components/chart-renderer";
import { SurveyChartRenderer } from "@/components/survey-chart-renderer";
import type { DashboardV2Item, DashboardV2SurveyFilter } from "@/lib/dashboard-v2";
import type { ChartV2Result } from "@/lib/chart-v2";
import { slugify } from "@/lib/export";
import { useContainerWidth } from "@/lib/use-container-width";
import { filterDashboardV2Surveys, saveDashboardV2Layout } from "@/app/(app)/dashboards/v2/actions";

export function DashboardV2View({ items, editable = false, dashboardId, surveyFilters = [] }: {
  items: DashboardV2Item[]; editable?: boolean; dashboardId?: string;
  surveyFilters?: DashboardV2SurveyFilter[];
}) {
  const router = useRouter();
  const { ref: widthRef, width } = useContainerWidth();
  const [column, setColumn] = useState("");
  const [value, setValue] = useState("");
  const [layoutError, setLayoutError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [surveySource, setSurveySource] = useState(surveyFilters[0]?.key ?? "");
  const [surveyVariable, setSurveyVariable] = useState("");
  const [surveyValue, setSurveyValue] = useState("");
  const [surveyResults, setSurveyResults] = useState<Record<string, ChartV2Result>>({});
  const filterRequest = useRef(0);
  const [filtering, startFilter] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);
  const [exporting, startExport] = useTransition();
  const datasetItems = items.filter((item) => item.kind === "dataset");
  const columns = useMemo(() => [...new Set(datasetItems.flatMap((item) => item.columns))], [items]);
  const activeSurvey = surveyFilters.find((source) => source.key === surveySource) ?? surveyFilters[0];
  const selectedSurveySource = activeSurvey?.key ?? "";
  const activeVariable = activeSurvey?.variables.find((variable) => variable.id === surveyVariable);
  const applySurveyFilter = (nextValue: string) => {
    const request = ++filterRequest.current;
    setSurveyValue(nextValue); setSurveyResults({}); setFilterError("");
    if (!nextValue || !dashboardId || !selectedSurveySource || !surveyVariable) return;
    startFilter(async () => {
      try {
        const response = await filterDashboardV2Surveys(dashboardId, selectedSurveySource, surveyVariable, nextValue);
        if (request !== filterRequest.current) return;
        if ("error" in response) setFilterError(response.error);
        else setSurveyResults(response.results);
      } catch {
        if (request === filterRequest.current) setFilterError("No se pudo aplicar el filtro de Encuestas.");
      }
    });
  };
  const values = useMemo(() => {
    if (!column) return [];
    const distinct = new Set<string>();
    for (const item of datasetItems) {
      if (!item.columns.includes(column)) continue;
      for (const row of item.rows) if (row[column] !== null && row[column] !== undefined && row[column] !== "") distinct.add(String(row[column]));
    }
    return [...distinct].sort(new Intl.Collator("es", { numeric: true }).compare).slice(0, 500);
  }, [column, items]);
  const layout: Layout[] = useMemo(() => items.map((item) => ({ i: item.id, ...item.layout })), [items]);
  const saveLayout = (next: Layout[]) => {
    if (!editable || !dashboardId) return;
    void saveDashboardV2Layout(dashboardId, next.map((item) => ({ i: item.i, x: item.x, y: item.y, w: item.w, h: item.h })))
      .then((response) => { if ("error" in response) setLayoutError(response.error); else { setLayoutError(""); router.refresh(); } });
  };
  const exportPdf = () => startExport(async () => {
    if (!gridRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
    const canvas = await html2canvas(gridRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = canvas.height * pageWidth / canvas.width;
    pdf.addImage(image, "PNG", 0, 0, pageWidth, imageHeight);
    for (let offset = pageHeight; offset < imageHeight; offset += pageHeight) {
      pdf.addPage(); pdf.addImage(image, "PNG", 0, -offset, pageWidth, imageHeight);
    }
    pdf.save(`${slugify("dashboard")}.pdf`);
  });
  return <div>
    {layoutError && <p role="alert" className="mb-3 text-sm text-danger">{layoutError}</p>}
    {filterError && <p role="alert" className="mb-3 text-sm text-danger">{filterError}</p>}
    <div className="mb-3 flex justify-end"><button type="button" disabled={exporting} onClick={exportPdf} className="rounded-md border border-border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50">{exporting ? "Exportando…" : "Exportar dashboard PDF"}</button></div>
    {!!columns.length && <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="dashboard-filter-column">Filtrar datasets por campo</label>
        <select id="dashboard-filter-column" value={column} onChange={(event) => { setColumn(event.target.value); setValue(""); }} className="block rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Sin filtro</option>{columns.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></div>
      {column && <div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="dashboard-filter-value">Valor</label>
        <select id="dashboard-filter-value" value={value} onChange={(event) => setValue(event.target.value)} className="block rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todos</option>{values.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></div>}
      {value && <button type="button" onClick={() => { setColumn(""); setValue(""); }} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Limpiar</button>}
      <p className="w-full text-xs text-muted-foreground">Este control se aplica a las gráficas de datasets que contienen el campo. Las gráficas de Encuestas conservan sus filtros estadísticos guardados.</p>
    </div>}
    {editable && surveyFilters.some((source) => source.variables.length) && <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="dashboard-survey-source">Encuesta y versión</label>
        <select id="dashboard-survey-source" value={selectedSurveySource} onChange={(event) => {
          filterRequest.current++; setSurveySource(event.target.value); setSurveyVariable(""); setSurveyValue(""); setSurveyResults({}); setFilterError("");
        }} className="block max-w-64 rounded-md border border-input bg-background px-3 py-2 text-sm">
          {surveyFilters.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}
        </select></div>
      <div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="dashboard-survey-variable">Filtrar Encuestas por pregunta</label>
        <select id="dashboard-survey-variable" value={surveyVariable} onChange={(event) => {
          filterRequest.current++; setSurveyVariable(event.target.value); setSurveyValue(""); setSurveyResults({}); setFilterError("");
        }} className="block max-w-64 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Selecciona una pregunta</option>{activeSurvey?.variables.map((variable) =>
            <option key={variable.id} value={variable.id}>{variable.label}</option>)}
        </select></div>
      {surveyVariable && <div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="dashboard-survey-value">Respuesta</label>
        <select id="dashboard-survey-value" value={surveyValue} onChange={(event) => applySurveyFilter(event.target.value)}
          className="block max-w-64 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todas</option>{activeVariable?.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select></div>}
      {filtering && <span role="status" className="text-xs text-muted-foreground">Actualizando gráficas…</span>}
      <p className="w-full text-xs text-muted-foreground">Se aplica a las gráficas de esta encuesta y versión. Los filtros guardados en cada gráfica también se respetan. El enlace público conserva el snapshot publicado.</p>
    </div>}
    <div ref={widthRef}><div ref={gridRef}>
      <Responsive className="layout" width={width} layouts={{ lg: layout, md: layout, sm: layout }}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }} cols={{ lg: 12, md: 12, sm: 6 }}
        rowHeight={54} margin={[12, 12]} isDraggable={editable} isResizable={editable}
        draggableHandle=".dashboard-drag-handle" onDragStop={saveLayout} onResizeStop={saveLayout}>
        {items.map((item) => <section key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className={`dashboard-drag-handle truncate font-medium ${editable ? "cursor-move" : ""}`}>{item.name}</h2>
            {editable && <Link href={`/charts/${item.kind}/${item.chartId}`} className="shrink-0 text-xs text-primary hover:underline">Abrir gráfica</Link>}
          </div>
          <div className="h-[calc(100%-41px)] overflow-auto p-2">
            {item.kind === "survey"
              ? <SurveyChartRenderer definition={item.definition} result={surveyResults[item.id] ?? item.result} name={item.name}
                  height={Math.max(170, item.layout.h * 54 - 88)} exportable={editable} />
              : <ChartRenderer config={item.config}
                  rows={column && value && item.columns.includes(column) ? item.rows.filter((row) => String(row[column] ?? "") === value) : item.rows}
                  columns={item.columns} geo={item.geo} height={Math.max(170, item.layout.h * 54 - 88)}
                  exportable={editable} exportName={item.name}
                  onSelect={(field, selected) => { if (field) { setColumn(field); setValue(selected); } }} />}
          </div>
        </section>)}
      </Responsive>
    </div></div></div>;
}
