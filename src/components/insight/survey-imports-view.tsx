"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, RefreshCw, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SurveyImportJob, SurveyImportOrganization } from "@/lib/insight-survey-imports";
import { threeLetterCode } from "@/lib/survey-codes";

const labels: Record<string, string> = {
  uploading: "Subiendo", ready: "Validado", queued: "En espera", processing: "Importando", completed: "Completado", failed: "Falló",
};
const inputClass = "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function SurveyImportsView({ organizations, jobs }: { organizations: SurveyImportOrganization[]; jobs: SurveyImportJob[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [queueing, setQueueing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [duplicate, setDuplicate] = useState<{ version: number; instrumentId: string | null; jobId: string | null } | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [mappings, setMappings] = useState<Record<string, Record<string, number>>>({});
  const [columnQuery, setColumnQuery] = useState("");
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [studyName, setStudyName] = useState("");
  const [instrumentName, setInstrumentName] = useState("");
  const selectedOrganization = organizations.find((organization) => organization.id === organizationId);
  const studyCodePreview = `${selectedOrganization?.code_prefix ?? "XXX"}-${studyName.trim() ? threeLetterCode(studyName) : ""}-A001`;
  const instrumentCodePreview = `${selectedOrganization?.code_prefix ?? "XXX"}-${studyName.trim() ? threeLetterCode(studyName) : ""}-${instrumentName.trim() ? threeLetterCode(instrumentName) : ""}-A001`;

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setDuplicate(null); setBusy(true);
    const form = event.currentTarget;
    let createdJobId: string | null = null;
    try {
      const fields = new FormData(form);
      const file = fields.get("file");
      if (!(file instanceof File) || file.size > 10 * 1024 * 1024) throw new Error("Selecciona un archivo de hasta 10 MB.");
      const response = await fetch("/api/surveys/imports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: fields.get("organization_id"),
          study_name: fields.get("study_name"), instrument_name: fields.get("instrument_name"),
          version: Number(fields.get("version")), filename: file.name, size: file.size }),
      });
      const body = await response.json();
      if (response.status === 409 && body.existing_version) setDuplicate({ version: Number.parseInt(body.existing_version, 10), instrumentId: body.existing_instrument_id ?? null, jobId: body.existing_job_id ?? null });
      if (!response.ok) throw new Error(body.error || "No se pudo preparar la subida.");
      createdJobId = body.id;
      const uploaded = await createClient().storage.from("survey-imports").uploadToSignedUrl(body.path, body.token, file);
      if (uploaded.error) throw new Error(uploaded.error.message);
      const validation = await fetch("/api/surveys/imports", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: body.id }),
      });
      const result = await validation.json();
      if (!validation.ok) throw new Error(result.error || "No se pudo validar el archivo.");
      createdJobId = null;
      setNotice(`Archivo validado como ${body.study_code} / ${body.instrument_code} · versión ${Number(fields.get("version"))}. Revisa el resumen y confirma la importación.`);
      form.reset();
      setStudyName(""); setInstrumentName("");
      router.refresh();
    } catch (cause) {
      if (createdJobId) {
        await fetch("/api/surveys/imports", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: createdJobId }),
        }).catch(() => {});
      }
      setError(cause instanceof Error ? cause.message : "No se pudo validar el archivo.");
    }
    finally { setBusy(false); }
  }

  async function queue(job: SurveyImportJob) {
    setError(""); setNotice(""); setQueueing(job.id);
    try {
      const response = await fetch("/api/surveys/imports", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.id, confirm_warnings: confirmed[job.id] === true,
          column_mapping: mappings[job.id] ?? {} }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo iniciar la importación.");
      setNotice("Importación en espera. Actualiza el estado para seguir su avance.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar la importación."); }
    finally { setQueueing(null); }
  }

  function changeMapping(job: SurveyImportJob, code: string, position: number) {
    setMappings((previous) => {
      const current = { ...previous[job.id] };
      const column = job.preview.columns.find((item) => item.code === code);
      if (!column) return previous;
      const oldPosition = current[code] ?? column.position;
      const displaced = job.preview.columns.find((item) => item.code !== code && (current[item.code] ?? item.position) === position);
      current[code] = position;
      if (displaced) current[displaced.code] = oldPosition;
      return { ...previous, [job.id]: current };
    });
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <Link href="/surveys" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> Volver a Encuestas</Link>
    <header className="rounded-[28px] bg-[#10233c] px-6 py-8 text-white shadow-[0_22px_70px_-35px_rgba(16,35,60,0.8)] sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-200">Encuestas · Carga</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Importar cuestionario</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">Sube el archivo, revisa las preguntas y confirma la carga. El procesamiento continúa aunque cierres esta página.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    {duplicate && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm"><span>Versión existente: <strong>{duplicate.version}</strong>.</span>{duplicate.instrumentId && <Link href={`/surveys/${duplicate.instrumentId}`} className="font-semibold text-primary underline underline-offset-2">Revisar encuesta</Link>}{duplicate.jobId && <a href={`#import-job-${duplicate.jobId}`} className="font-semibold text-primary underline underline-offset-2">Revisar carga en curso</a>}<span className="text-muted-foreground">Puedes cambiar el campo Versión a {duplicate.version + 1}.</span></div>}
    {notice && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">{notice}</p>}
    {organizations.length > 0 ? <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="insight-card-header border-b border-border px-5 py-4"><h2 className="font-semibold">Nuevo archivo</h2><p className="mt-1 text-sm text-muted-foreground">TXT, CSV, XLSX, XLS, ODS o JSON. En hojas de cálculo se lee la primera hoja; no hace falta diccionario. Máximo 10 MB.</p></div>
      <form onSubmit={upload} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Organización"><select name="organization_id" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required className={inputClass}>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></Field>
        <Field label="Archivo"><input name="file" type="file" accept=".txt,.csv,.xlsx,.xls,.ods,.json" required className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-primary`} /></Field>
        <Field label="Nombre del estudio"><input name="study_name" value={studyName} onChange={(event) => setStudyName(event.target.value)} required minLength={2} maxLength={150} placeholder="Encuesta de percepción 2026" className={inputClass} /></Field>
        <Field label="Código del estudio"><output aria-live="polite" className={`${inputClass} block select-all font-mono tracking-wide text-muted-foreground`}>{studyCodePreview}</output></Field>
        <Field label="Nombre del instrumento"><input name="instrument_name" value={instrumentName} onChange={(event) => setInstrumentName(event.target.value)} required minLength={2} maxLength={150} placeholder="Cuestionario A" className={inputClass} /></Field>
        <Field label="Código del instrumento"><output aria-live="polite" className={`${inputClass} block select-all font-mono tracking-wide text-muted-foreground`}>{instrumentCodePreview}</output></Field>
        <Field label="Versión"><input name="version" type="number" min={1} max={9999} step={1} defaultValue={1} required className={inputClass} /></Field>
        <p className="self-end rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">Vista previa: los códigos definitivos y folios se asignan al preparar la carga.</p>
        <div className="sm:col-span-2"><button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Upload size={16} /> {busy ? "Validando…" : "Validar archivo"}</button></div>
      </form>
    </section> : <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Necesitas el permiso «Crear encuesta» de una organización activa para cargar archivos.</p>}
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="insight-card-header flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-semibold">Importaciones recientes</h2><p className="mt-1 text-sm text-muted-foreground">El proceso de carga avanza fuera de la petición web.</p></div><button type="button" onClick={() => router.refresh()} aria-label="Actualizar estados" className="rounded-lg border border-border p-2 hover:bg-muted"><RefreshCw size={16} /></button></div>
      <div className="divide-y divide-border">{jobs.map((job) => <article key={job.id} id={`import-job-${job.id}`} className="scroll-mt-24 space-y-3 px-5 py-4 target:bg-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{job.instrument_name}</p><p className="mt-1 text-xs text-muted-foreground">{job.organization_name} · {job.study_code} / {job.instrument_code} · versión {Number.parseInt(job.version, 10)} · {job.source_filename}</p></div><span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">{labels[job.status] ?? job.status}</span></div>
        {job.preview.records !== undefined && <p className="text-sm text-muted-foreground">{job.preview.records.toLocaleString("es-MX")} registros · {job.preview.questions} preguntas · {job.preview.responses.toLocaleString("es-MX")} respuestas · {job.preview.format.toUpperCase()}</p>}
        {job.preview.warnings?.length > 0 && <details className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><summary className="cursor-pointer font-medium">{job.preview.warnings.length} advertencias para revisar</summary><ul className="mt-2 list-inside list-disc text-xs leading-5">{job.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
        {job.status === "ready" && job.preview.format !== "json" && <details className="rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer font-medium">Revisar columnas y muestras ({job.preview.columns.length})</summary><div className="mt-3 space-y-3"><label className="sr-only" htmlFor={`column-search-${job.id}`}>Buscar columna</label><input id={`column-search-${job.id}`} value={columnQuery} onChange={(event) => setColumnQuery(event.target.value)} placeholder="Buscar pregunta o código" className={inputClass} /><p className="text-xs text-muted-foreground">Si los valores aparecen bajo otra pregunta, cambia la columna de origen. La columna desplazada intercambiará su origen. Se muestran hasta 30 preguntas a la vez.</p><div className="max-h-96 divide-y divide-border overflow-y-auto">{job.preview.columns.filter((column) => `${column.code} ${column.label}`.toLocaleLowerCase("es").includes(columnQuery.toLocaleLowerCase("es"))).slice(0, 30).map((column) => <div key={column.code} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div><p className="font-mono text-xs text-primary">{column.code}</p><p className="mt-1 text-sm">{column.label}</p></div><div><label className="text-xs text-muted-foreground" htmlFor={`${job.id}-${column.code}`}>Valores de la columna</label><select id={`${job.id}-${column.code}`} value={mappings[job.id]?.[column.code] ?? column.position} onChange={(event) => changeMapping(job, column.code, Number(event.target.value))} className={inputClass}>{job.preview.columns.map((source) => <option key={source.code} value={source.position}>{source.code} · {source.samples.join(" / ").slice(0, 90)}</option>)}</select></div></div>)}</div></div></details>}
        {job.error_message && <p className="text-sm text-destructive">{job.error_message}</p>}
        {job.status === "ready" && <div className="flex flex-wrap items-center gap-3">{job.preview.warnings?.length > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed[job.id] === true} onChange={(event) => setConfirmed((value) => ({ ...value, [job.id]: event.target.checked }))} /> Revisé las advertencias</label>}<button type="button" disabled={queueing === job.id || (job.preview.warnings?.length > 0 && confirmed[job.id] !== true)} onClick={() => queue(job)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{queueing === job.id ? "Iniciando…" : "Iniciar importación"}</button></div>}
        {job.status === "queued" && !job.workflow_run_id && <button type="button" disabled={queueing === job.id} onClick={() => queue(job)} className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Reintentar inicio</button>}
        {job.status === "completed" && job.instrument_id && <Link href={`/surveys/${job.instrument_id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardList size={16} /> Abrir encuesta</Link>}
      </article>)}{!jobs.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aún no hay importaciones.</p>}</div>
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}
