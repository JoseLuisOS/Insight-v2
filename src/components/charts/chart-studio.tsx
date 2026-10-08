"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { type ChartV2Definition, type ChartV2Result, type ChartV2Type } from "@/lib/chart-v2";
import type { ChartConfig, ChartType } from "@/lib/charts";
import {
  STUDIO_CHART_TYPES, applySurveyType, datasetTypeSupport, surveyCarryCodes, surveyTypeSupport,
  type ChartSourceCatalog, type ChartSourceRef, type LoadedChartSource, type SourceCarry,
} from "@/lib/chart-studio";
import type { ChartVisibility } from "@/lib/chart-snapshot";
import { SurveyChartRenderer } from "@/components/survey-chart-renderer";
import { ChartRenderer } from "@/components/chart-renderer";
import { ChartMapUpload } from "@/components/chart-map-upload";
import { CubeLoader } from "@/components/cube-loader";
import { ChartVisibilityToggle } from "@/components/charts/chart-visibility-toggle";
import { ChartTypePicker } from "@/components/charts/chart-type-picker";
import { ChartSourcesPanel } from "@/components/charts/chart-sources-panel";
import { SurveyChartFields } from "@/components/charts/survey-chart-fields";
import { DatasetChartFields } from "@/components/charts/dataset-chart-fields";
import { loadChartSource } from "@/app/(app)/charts/studio-actions";
import { previewSurveyChart, saveSurveyChart } from "@/app/(app)/charts/survey/actions";
import { saveCoreDatasetChart } from "@/app/(app)/charts/dataset/actions";

const defaultName = (source: LoadedChartSource | null) =>
  source ? `${source.kind === "survey" ? source.instrumentName : source.name} · nueva gráfica` : "";
const refOf = (source: LoadedChartSource): ChartSourceRef => source.kind === "survey"
  ? { kind: "survey", instrumentId: source.instrumentId, versionId: source.versionId }
  : { kind: "dataset", datasetId: source.datasetId };

export function ChartStudio({ catalog: initialCatalog, initialSource, initialRef, chartId, initialName, initialVisibility = "private" }: {
  catalog: ChartSourceCatalog;
  initialSource: LoadedChartSource | null;
  initialRef: ChartSourceRef | null;
  chartId?: string;
  initialName?: string;
  initialVisibility?: ChartVisibility;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [catalog, setCatalog] = useState(initialCatalog);
  const [ref, setRef] = useState<ChartSourceRef | null>(initialRef);
  const [source, setSource] = useState<LoadedChartSource | null>(initialSource);
  const [definition, setDefinition] = useState<ChartV2Definition | null>(initialSource?.kind === "survey" ? initialSource.definition : null);
  const [previewDefinition, setPreviewDefinition] = useState<ChartV2Definition | null>(initialSource?.kind === "survey" ? initialSource.definition : null);
  const [result, setResult] = useState<ChartV2Result | null>(initialSource?.kind === "survey" ? initialSource.result : null);
  const [config, setConfig] = useState<ChartConfig | null>(initialSource?.kind === "dataset" ? initialSource.config : null);
  const [name, setName] = useState(initialName ?? defaultName(initialSource));
  const [nameTouched, setNameTouched] = useState(!!initialName);
  const [visibility, setVisibility] = useState<ChartVisibility>(initialVisibility);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);
  const [previewing, startPreview] = useTransition();
  const [saving, startSave] = useTransition();
  const locked = previewing || saving || loadingSource;

  const applySource = (next: LoadedChartSource) => {
    setSource(next);
    setRef(refOf(next));
    if (next.kind === "survey") {
      setDefinition(next.definition); setPreviewDefinition(next.definition); setResult(next.result); setConfig(null);
    } else {
      setConfig(next.config); setDefinition(null); setPreviewDefinition(null); setResult(null);
    }
    setDirty(false);
    if (!nameTouched) setName(defaultName(next));
  };

  const buildCarry = (): SourceCarry => {
    const carry: SourceCarry = {};
    if (source?.kind === "survey" && definition) {
      carry.type = definition.type as ChartType;
      carry.title = definition.style.title;
      carry.survey = { definition, codes: surveyCarryCodes(definition, source.variables) };
    } else if (source?.kind === "dataset" && config) {
      carry.type = config.type;
      carry.title = config.title;
      carry.dataset = config;
    }
    return carry;
  };

  const lastRequest = useRef(0);
  const reload = async (nextRef: ChartSourceRef) => {
    const request = ++lastRequest.current;
    setError("");
    setLoadingSource(true);
    try {
      const response = await loadChartSource(nextRef, buildCarry());
      if (request !== lastRequest.current) return;
      if ("error" in response) setError(response.error);
      else applySource(response.source);
    } catch {
      if (request === lastRequest.current) setError("No se pudo cargar la fuente. Intenta de nuevo.");
    } finally {
      if (request === lastRequest.current) setLoadingSource(false);
    }
  };

  const datasetUploaded = (dataset: { id: string; name: string; organizationId: string }) => {
    const organizationName = catalog.organizations.find((item) => item.id === dataset.organizationId)?.name ?? "";
    setCatalog((current) => ({ ...current, datasets: [{ id: dataset.id, name: dataset.name, rowCount: 0, organizationName }, ...current.datasets] }));
    void reload({ kind: "dataset", datasetId: dataset.id });
  };

  const setSurvey = (patch: Partial<ChartV2Definition>) => {
    setDefinition((current) => current ? { ...current, ...patch } : current);
    setDirty(true);
  };
  const setDataset = (patch: Partial<ChartConfig>) => setConfig((current) => current ? { ...current, ...patch } : current);

  const changeType = (type: ChartType) => {
    if (source?.kind === "survey" && definition) {
      setDefinition(applySurveyType(definition, type as ChartV2Type, source.variables));
      setDirty(true);
    } else if (source?.kind === "dataset") setDataset({ type });
  };

  const typeOptions = STUDIO_CHART_TYPES.map((item) => ({
    ...item,
    disabledReason: source?.kind === "survey" ? surveyTypeSupport(item.type, source.variables) ?? undefined
      : source?.kind === "dataset" ? datasetTypeSupport(item.type, source.columns) ?? undefined
      : "Elige una fuente primero.",
  }));
  const currentType: ChartType = source?.kind === "survey" && definition ? definition.type as ChartType : config?.type ?? "bar";

  const preview = () => startPreview(async () => {
    if (!definition) return;
    setError("");
    const response = await previewSurveyChart(definition);
    if ("error" in response) setError(response.error);
    else { setResult(response.result); setPreviewDefinition(definition); setDirty(false); }
  });
  const save = () => startSave(async () => {
    if (!source) return;
    setError("");
    const response = source.kind === "survey"
      ? definition ? await saveSurveyChart(name, definition, chartId, visibility) : { error: "Esta versión no tiene variables analíticas disponibles." }
      : config ? await saveCoreDatasetChart(source.datasetId, name, config, chartId, visibility) : { error: "Falta la configuración de la gráfica." };
    if ("error" in response) { setError(response.error); return; }
    const target = `/charts/${source.kind}/${response.chartId}`;
    router.push(target);
    if (pathname === target) router.refresh();
  });

  const selectedMap = source?.kind === "dataset" ? source.maps.find((item) => item.id === config?.mapId) : undefined;
  const geo = selectedMap ? { name: `map_${selectedMap.id}`, geojson: selectedMap.geojson, nameProperty: selectedMap.name_property } : undefined;
  const canSave = !!source && (source.kind === "dataset" ? !!config : !!definition);

  return <div className="grid min-h-[70vh] grid-cols-1 gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
    <aside className="space-y-4 rounded-xl border border-border bg-card p-4 xl:max-h-[calc(100vh-130px)] xl:overflow-y-auto">
      <ChartSourcesPanel catalog={catalog} value={ref} disabled={locked}
        onChange={(next) => void reload(next)} onDatasetUploaded={datasetUploaded} />
      <div><span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de gráfica</span>
        <ChartTypePicker options={typeOptions} value={currentType} onChange={changeType} disabled={locked || !source} /></div>
      {source?.kind === "survey" && definition && <SurveyChartFields definition={definition} variables={source.variables} onChange={setSurvey} disabled={locked} />}
      {source?.kind === "dataset" && config && <DatasetChartFields config={config} columns={source.columns} maps={source.maps} onChange={setDataset} disabled={locked} />}
      {error && <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        {source?.kind === "survey" && <button type="button" disabled={locked || !definition} onClick={preview}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
          {previewing ? <span className="inline-flex items-center gap-2"><CubeLoader size={14} />Actualizando…</span> : "Actualizar vista"}</button>}
        <button type="button" disabled={locked || !canSave} onClick={save}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <span className="inline-flex items-center gap-2"><CubeLoader size={14} />Guardando…</span> : "Guardar"}</button>
      </div>
    </aside>
    <main className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <input aria-label="Nombre de la gráfica" value={name} maxLength={160}
          onChange={(event) => { setName(event.target.value); setNameTouched(true); }}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-medium hover:border-border focus:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <div className="flex shrink-0 items-center gap-2">
          {source?.kind === "survey" && dirty && <span className="rounded-full bg-warning/10 px-3 py-1 text-xs text-warning">Vista previa desactualizada</span>}
          <ChartVisibilityToggle chartId={chartId} initial={visibility} onChange={setVisibility} />
        </div>
      </div>
      {loadingSource ? <div role="status" className="grid min-h-[560px] place-items-center rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground"><CubeLoader size={32} />Cargando fuente…</div></div>
        : !source ? <div className="grid min-h-[560px] place-items-center rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Elige o sube una fuente para empezar.</div>
        : source.kind === "survey" ? <>
          {definition && previewDefinition && result
            ? <SurveyChartRenderer definition={previewDefinition} result={result} name={name} height={560} />
            : <div className="grid min-h-[560px] place-items-center rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Esta versión no tiene variables analíticas disponibles.</div>}
          <p className="mt-3 text-xs text-muted-foreground">Los cálculos se realizan sobre la versión completa en el servidor. Guardar conserva la configuración y la versión seleccionada.</p>
        </> : config && <>
          <ChartRenderer config={config} rows={source.rows} columns={source.columns} height={560} exportable
            exportName={name || `grafica-${source.name}`} geo={geo} />
          <p className="mt-2 text-xs text-muted-foreground">Vista previa sobre {source.rows.length.toLocaleString("es-MX")} filas de {source.name}.
            {source.rowCount > source.rows.length && ` Vista y cálculo sobre las primeras ${source.rows.length.toLocaleString("es-MX")} filas.`}</p>
          {config.type === "map" && <div className="mt-4"><ChartMapUpload organizationId={source.organizationId} onUploaded={() => void reload(refOf(source))} /></div>}
        </>}
    </main>
  </div>;
}
