"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ChartDatasetUpload } from "@/components/chart-dataset-upload";
import { findCatalogSource, sourceLabel, type ChartSourceCatalog, type ChartSourceRef } from "@/lib/chart-studio";

const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";
const segmentClass = (active: boolean) => `flex-1 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`;

export function ChartSourcesPanel({ catalog, value, onChange, onDatasetUploaded, disabled }: {
  catalog: ChartSourceCatalog;
  value: ChartSourceRef | null;
  onChange: (ref: ChartSourceRef) => void;
  onDatasetUploaded: (dataset: { id: string; name: string; organizationId: string }) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(value === null);
  const [uploading, setUploading] = useState(false);
  const [kindChoice, setKindChoice] = useState<"survey" | "dataset" | null>(null);
  const kind = kindChoice ?? value?.kind ?? (catalog.studies.length ? "survey" : "dataset");
  const found = value ? findCatalogSource(catalog, value) : null;
  const empty = !catalog.studies.length && !catalog.datasets.length;
  const selectedStudy = found?.kind === "survey" ? found.study : catalog.studies[0];
  const selectedInstrument = found?.kind === "survey" ? found.instrument : selectedStudy?.instruments[0];
  const label = sourceLabel(catalog, value);

  const pickKind = (next: "survey" | "dataset") => {
    if (next === kind && value?.kind === next) return;
    setKindChoice(next);
    if (next === "survey") {
      for (const study of catalog.studies) {
        const instrument = study.instruments.find((item) => item.versions.length);
        if (instrument) { onChange({ kind: "survey", instrumentId: instrument.id, versionId: instrument.versions[0].id }); return; }
      }
    } else if (catalog.datasets[0]) onChange({ kind: "dataset", datasetId: catalog.datasets[0].id });
  };
  const pickStudy = (studyId: string) => {
    const instrument = catalog.studies.find((item) => item.id === studyId)?.instruments.find((item) => item.versions.length);
    if (instrument) onChange({ kind: "survey", instrumentId: instrument.id, versionId: instrument.versions[0].id });
  };
  const pickInstrument = (instrumentId: string) => {
    const instrument = selectedStudy?.instruments.find((item) => item.id === instrumentId);
    if (instrument?.versions.length) onChange({ kind: "survey", instrumentId, versionId: instrument.versions[0].id });
  };
  const showUpload = uploading || !catalog.datasets.length;
  const upload = <ChartDatasetUpload compact organizations={catalog.organizations} onUploaded={(dataset) => { setUploading(false); onDatasetUploaded(dataset); }} />;

  return <section aria-label="Fuentes">
    <h2 className="mb-1.5 text-xs font-medium text-muted-foreground">Fuentes</h2>
    <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)} title={label}
      className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {open && <div className="mt-3 space-y-3">
      {empty ? <>
        <p className="text-sm text-muted-foreground">No hay fuentes disponibles. <Link href="/surveys/imports" className="text-primary hover:underline">Importar una encuesta</Link></p>
        {upload}
      </> : <>
        <div role="radiogroup" aria-label="Tipo de fuente" className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button type="button" role="radio" aria-checked={kind === "survey"} disabled={disabled || !catalog.studies.length}
            title={catalog.studies.length ? undefined : "No hay encuestas accesibles."} onClick={() => pickKind("survey")} className={segmentClass(kind === "survey")}>Encuesta</button>
          <button type="button" role="radio" aria-checked={kind === "dataset"} disabled={disabled}
            onClick={() => pickKind("dataset")} className={segmentClass(kind === "dataset")}>Dataset</button>
        </div>
        {kind === "survey" ? <>
          <div><label className={labelClass} htmlFor="source-study">Estudio</label>
            <select id="source-study" className={inputClass} disabled={disabled} value={selectedStudy?.id ?? ""} onChange={(event) => pickStudy(event.target.value)}>
              {catalog.studies.map((study) => <option key={study.id} value={study.id}>{study.name}</option>)}</select></div>
          <div><label className={labelClass} htmlFor="source-instrument">Instrumento</label>
            <select id="source-instrument" className={inputClass} disabled={disabled} value={selectedInstrument?.id ?? ""} onChange={(event) => pickInstrument(event.target.value)}>
              {selectedStudy?.instruments.map((instrument) => <option key={instrument.id} value={instrument.id}>{instrument.name}</option>)}</select></div>
          {selectedInstrument && selectedInstrument.versions.length > 1 && <div><label className={labelClass} htmlFor="source-version">Versión</label>
            <select id="source-version" className={inputClass} disabled={disabled}
              value={found?.kind === "survey" ? found.version.id : selectedInstrument.versions[0].id}
              onChange={(event) => onChange({ kind: "survey", instrumentId: selectedInstrument.id, versionId: event.target.value })}>
              {selectedInstrument.versions.map((version) => <option key={version.id} value={version.id}>v{version.version}</option>)}</select></div>}
        </> : <>
          {catalog.datasets.length > 0 && <div><label className={labelClass} htmlFor="source-dataset">Dataset</label>
            <select id="source-dataset" className={inputClass} disabled={disabled} value={value?.kind === "dataset" ? value.datasetId : ""}
              onChange={(event) => onChange({ kind: "dataset", datasetId: event.target.value })}>
              {value?.kind !== "dataset" && <option value="" disabled>Selecciona un dataset</option>}
              {catalog.datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name} · {dataset.rowCount.toLocaleString("es-MX")} filas</option>)}</select></div>}
          {catalog.datasets.length > 0 && !uploading && <button type="button" disabled={disabled} onClick={() => setUploading(true)}
            className="text-xs text-primary cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">Subir dataset</button>}
          {showUpload && upload}
        </>}
      </>}
    </div>}
  </section>;
}
