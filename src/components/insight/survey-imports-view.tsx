"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, RefreshCw, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SurveyImportChoice, SurveyImportJob, SurveyImportOrganization } from "@/lib/insight-survey-imports";
import { surveySequenceLabel, threeLetterCode } from "@/lib/survey-codes";
import { ConfirmDialog } from "@/components/navigation/confirm-dialog";
import { CubeLoader } from "@/components/cube-loader";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

const labels: Record<string, string> = {
  uploading: "Subiendo", ready: "Validado", queued: "En espera", processing: "Importando", completed: "Completado", failed: "Falló",
};
const inputClass = "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary";
type NameOption = { id: string; name: string; code: string; studyName?: string };

function searchKey(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase("es");
}

function sameName(left: string, right: string) {
  return left.trim().toLocaleLowerCase("es") === right.trim().toLocaleLowerCase("es");
}

export function SurveyImportsView({ organizations, jobs, choices }: { organizations: SurveyImportOrganization[]; jobs: SurveyImportJob[]; choices: SurveyImportChoice[] }) {
  const router = useRouter();
  const activeJobs = jobs.filter((job) => ["uploading", "queued", "processing"].includes(job.status))
    .map(({ id, status }) => ({ id, status })).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 50);
  useAutoRefresh(activeJobs.length > 0, `/api/surveys/imports?ids=${activeJobs.map((job) => job.id).join(",")}`, JSON.stringify(activeJobs));
  const [busy, setBusy] = useState(false);
  const [queueing, setQueueing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurveyImportJob | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [duplicate, setDuplicate] = useState<{ version: number; instrumentId: string | null; jobId: string | null } | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [columnQuery, setColumnQuery] = useState("");
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});
  const filteredColumnsByJob = new Map(jobs.map((job) => [job.id, (job.preview.columns ?? []).filter((column) => `${column.code} ${column.label}`.toLocaleLowerCase("es").includes(columnQuery.toLocaleLowerCase("es")))]));
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [studyName, setStudyName] = useState("");
  const [instrumentName, setInstrumentName] = useState("");
  const selectedOrganization = organizations.find((organization) => organization.id === organizationId);
  const organizationChoices = choices.filter((choice) => choice.organization_id === organizationId);
  const studyOptions = Array.from(new Map(organizationChoices.map((choice) => [choice.study_id, { id: choice.study_id, name: choice.study_name, code: choice.study_code }])).values());
  const existingStudy = studyOptions.find((option) => sameName(option.name, studyName));
  const candidateStudies = existingStudy ? [existingStudy] : studyName.trim()
    ? studyOptions.filter((option) => searchKey(option.name).includes(searchKey(studyName))) : [];
  const candidateStudyIds = new Set(candidateStudies.map((study) => study.id));
  const instrumentOptions = [...new Map(organizationChoices.flatMap((choice) =>
    candidateStudyIds.has(choice.study_id) && choice.instrument_id && choice.instrument_name && choice.instrument_code
      ? [[choice.instrument_id, { id: choice.instrument_id, name: choice.instrument_name, code: choice.instrument_code, studyName: choice.study_name }] as const] : [])).values()];
  const existingInstrument = existingStudy ? instrumentOptions.find((option) => sameName(option.name, instrumentName)) : undefined;
  const studyCodePreview = existingStudy?.code ?? `${selectedOrganization?.code_prefix ?? "XXX"}-${studyName.trim() ? threeLetterCode(studyName) : ""}-${surveySequenceLabel(selectedOrganization?.next_study_number ?? 1)}`;
  const instrumentCodePreview = existingInstrument?.code ?? `${selectedOrganization?.code_prefix ?? "XXX"}-${studyName.trim() ? threeLetterCode(studyName) : ""}-${instrumentName.trim() ? threeLetterCode(instrumentName) : ""}-${surveySequenceLabel(selectedOrganization?.next_instrument_number ?? 1)}`;

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
      if (response.status === 409 && body.existing_version) {
        setDuplicate({ version: Number.parseInt(body.existing_version, 10), instrumentId: body.existing_instrument_id ?? null, jobId: body.existing_job_id ?? null });
        return;
      }
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
        body: JSON.stringify({ id: job.id, confirm_warnings: confirmed[job.id] === true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo iniciar la importación.");
      setNotice("Importación en espera. Actualiza el estado para seguir su avance.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar la importación."); }
    finally { setQueueing(null); }
  }

  async function remove(job: SurveyImportJob) {
    setError(""); setDeleting(job.id);
    try {
      const response = await fetch("/api/surveys/imports", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.id, action: "delete" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar la carga.");
      setDeleteTarget(null);
      setNotice("La carga se eliminó.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar la carga."); }
    finally { setDeleting(null); }
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <Link href="/surveys" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> Volver a Encuestas</Link>
    <header className="rounded-[28px] bg-[#10233c] px-6 py-8 text-white shadow-[0_22px_70px_-35px_rgba(16,35,60,0.8)] sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-200">Encuestas · Carga</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Importar cuestionario</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">Sube el archivo, revisa las preguntas y confirma la carga. El procesamiento continúa aunque cierres esta página.</p>
    </header>
    {duplicate ? <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger"><span>La versión {duplicate.version} de esta encuesta ya existe. Revísala o cambia a la versión {duplicate.version + 1}.</span>{duplicate.instrumentId && <Link href={`/surveys/${duplicate.instrumentId}`} className="font-semibold underline underline-offset-2 hover:opacity-80">Revisar encuesta</Link>}{duplicate.jobId && <a href={`#import-job-${duplicate.jobId}`} className="font-semibold underline underline-offset-2 hover:opacity-80">Revisar carga en curso</a>}</div> : error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
    {notice && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">{notice}</p>}
    {organizations.length > 0 ? <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="insight-card-header rounded-t-2xl border-b border-border px-5 py-4"><h2 className="font-semibold">Nuevo archivo</h2><p className="mt-1 text-sm text-muted-foreground">TXT, CSV, XLSX, XLS, ODS o JSON. En hojas de cálculo se lee la primera hoja; no hace falta diccionario. Máximo 10 MB.</p></div>
      <form onSubmit={upload} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Organización"><select name="organization_id" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setStudyName(""); setInstrumentName(""); }} required className={inputClass}>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></Field>
        <Field label="Archivo"><input name="file" type="file" accept=".txt,.csv,.xlsx,.xls,.ods,.json" required className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-primary`} /></Field>
        <NameCombobox label="Nombre del estudio" name="study_name" value={studyName} onChange={(value) => { if (!sameName(value, studyName)) setInstrumentName(""); setStudyName(value); }} options={studyOptions} placeholder="Encuesta de percepción 2026" />
        <Field label="Código del estudio"><output aria-live="polite" className={`${inputClass} block select-all font-mono tracking-wide text-muted-foreground`}>{studyCodePreview}</output></Field>
        <NameCombobox label="Nombre del instrumento" name="instrument_name" value={instrumentName} onChange={setInstrumentName} onSelect={(option) => { if (option.studyName && !existingStudy) setStudyName(option.studyName); }} options={instrumentOptions} placeholder="Cuestionario A" hint="Las coincidencias se filtran por el estudio escrito o seleccionado; puedes seguir escribiendo para crear un instrumento nuevo." />
        <Field label="Código del instrumento"><output aria-live="polite" className={`${inputClass} block select-all font-mono tracking-wide text-muted-foreground`}>{instrumentCodePreview}</output></Field>
        <Field label="Versión"><input name="version" type="number" min={1} max={9999} step={1} defaultValue={1} required className={inputClass} /></Field>
        <p className="self-end rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">Busca y selecciona un nombre anterior, o sigue escribiendo para crear uno nuevo. Los folios definitivos se reservan al preparar la carga.</p>
        <div className="sm:col-span-2"><button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? <CubeLoader size={16} /> : <Upload size={16} />} {busy ? "Validando…" : "Validar archivo"}</button></div>
      </form>
    </section> : <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Necesitas el permiso «Crear encuesta» de una organización activa para cargar archivos.</p>}
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="insight-card-header flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-semibold">Importaciones recientes</h2><p className="mt-1 text-sm text-muted-foreground">El estado se actualiza automáticamente mientras haya cargas en curso.</p></div><button type="button" onClick={() => router.refresh()} aria-label="Actualizar estados" className="rounded-lg border border-border p-2 hover:bg-muted"><RefreshCw size={16} /></button></div>
      <div className="divide-y divide-border">{jobs.map((job) => <article key={job.id} id={`import-job-${job.id}`} className="scroll-mt-24 space-y-3 px-5 py-4 target:bg-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{job.instrument_name}</p><p className="mt-1 text-xs text-muted-foreground">{job.organization_name} · {job.study_code} / {job.instrument_code} · versión {Number.parseInt(job.version, 10)} · {job.source_filename}</p></div><span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">{labels[job.status] ?? job.status}</span></div>
        {job.preview.records !== undefined && <p className="text-sm text-muted-foreground">{job.preview.records.toLocaleString("es-MX")} registros · {job.preview.questions} preguntas · {job.preview.responses.toLocaleString("es-MX")} respuestas · {job.preview.format.toUpperCase()}</p>}
        {job.preview.warnings?.length > 0 && <details className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><summary className="cursor-pointer font-medium">{job.preview.warnings.length} advertencias para revisar</summary><ul className="mt-2 list-inside list-disc text-xs leading-5">{job.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
        {job.status === "ready" && <details className="rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer font-medium">Revisar preguntas y valores ({job.preview.columns.length})</summary><div className="mt-3 space-y-3"><label className="sr-only" htmlFor={`column-search-${job.id}`}>Buscar pregunta</label><input id={`column-search-${job.id}`} value={columnQuery} onChange={(event) => setColumnQuery(event.target.value)} placeholder="Buscar pregunta o código" className={inputClass} />{(filteredColumnsByJob.get(job.id)?.length ?? 0) > 30 && <p className="text-xs text-muted-foreground">{expandedPreviews[job.id] ? `Se muestran las ${filteredColumnsByJob.get(job.id)?.length} preguntas encontradas.` : `Se muestran 30 de ${filteredColumnsByJob.get(job.id)?.length} preguntas encontradas.`} Los valores se ordenan alfabéticamente o de menor a mayor.</p>}<div className="max-h-96 divide-y divide-border overflow-y-auto">{(expandedPreviews[job.id] ? filteredColumnsByJob.get(job.id) ?? [] : (filteredColumnsByJob.get(job.id) ?? []).slice(0, 30)).map((column) => <div key={column.code} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><div><p className="font-mono text-xs text-primary">{column.code}</p><p className="mt-1 text-sm">{column.label}</p></div><div><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{column.sampleLimit === 10 || (column.distinctCount ?? 0) > 25 || column.samples !== undefined ? "Valores muestra" : "Valores distintos"}</p><span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">{column.values?.length ?? 0}</span></div><div className="mt-2 flex flex-wrap gap-1.5">{(column.values ?? []).length ? (column.values ?? []).map((value, index) => <span key={`${index}-${value}`} className="max-w-full break-words rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">{value}</span>) : <span className="text-xs text-muted-foreground">Sin valores</span>}</div></div></div>)}</div>{(filteredColumnsByJob.get(job.id)?.length ?? 0) > 30 && <button type="button" onClick={() => setExpandedPreviews((current) => ({ ...current, [job.id]: !current[job.id] }))} className="text-sm font-semibold text-primary hover:underline">{expandedPreviews[job.id] ? "Ver menos" : `Ver todas las preguntas (${filteredColumnsByJob.get(job.id)?.length})`}</button>}</div></details>}
        {job.error_message && <p className="text-sm text-destructive">{job.error_message}</p>}
        {job.status === "ready" && <div className="flex flex-wrap items-center justify-end gap-3">{job.preview.warnings?.length > 0 && <label className="mr-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed[job.id] === true} onChange={(event) => setConfirmed((value) => ({ ...value, [job.id]: event.target.checked }))} /> Revisé las advertencias</label>}{job.can_delete && <button type="button" onClick={() => setDeleteTarget(job)} className="rounded-xl border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">Eliminar</button>}<button type="button" disabled={queueing === job.id || (job.preview.warnings?.length > 0 && confirmed[job.id] !== true)} onClick={() => queue(job)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{queueing === job.id && <CubeLoader size={15} />}{queueing === job.id ? "Importando…" : "Importar"}</button></div>}
        {job.status === "failed" && !job.workflow_run_id && job.can_delete && <div className="flex justify-end"><button type="button" onClick={() => setDeleteTarget(job)} className="rounded-xl border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">Eliminar</button></div>}
        {job.status === "queued" && !job.workflow_run_id && <button type="button" disabled={queueing === job.id} onClick={() => queue(job)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">{queueing === job.id && <CubeLoader size={15} />}{queueing === job.id ? "Iniciando…" : "Reintentar inicio"}</button>}
        {job.status === "completed" && job.instrument_id && <Link href={`/surveys/${job.instrument_id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardList size={16} /> Abrir encuesta</Link>}
      </article>)}{!jobs.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aún no hay importaciones.</p>}</div>
    </section>
    <ConfirmDialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) void remove(deleteTarget); }} title="Eliminar carga" description={`Se eliminará la carga de «${deleteTarget?.instrument_name ?? ""}» y su archivo. Esta acción no se puede deshacer.`} confirmLabel={deleting ? "Eliminando…" : "Eliminar"} cancelLabel="Cancelar" busy={deleting !== null} />
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}

function NameCombobox({ label, name, value, onChange, onSelect, options, placeholder, hint }: {
  label: string; name: string; value: string; onChange: (value: string) => void;
  onSelect?: (option: NameOption) => void; options: NameOption[]; placeholder: string; hint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = searchKey(value);
  const matches = query ? options.filter((option) => searchKey(option.name).includes(query)) : [];
  const visible = open && matches.length > 0;

  function select(option: NameOption) {
    onChange(option.name);
    onSelect?.(option);
    setOpen(false);
    setActiveIndex(-1);
  }

  return <div className="relative grid gap-1.5 text-sm font-medium">
    <label htmlFor={id}>{label}</label>
    <input id={id} name={name} type="text" value={value} onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(-1); }}
      onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActiveIndex(-1); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); return; }
        if (!matches.length) return;
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => (index + 1) % matches.length); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((index) => index < 1 ? matches.length - 1 : index - 1); }
        else if (event.key === "Enter" && visible && activeIndex >= 0) { event.preventDefault(); select(matches[activeIndex]); }
      }}
      role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={`${id}-list`}
      aria-activedescendant={visible && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
      required minLength={2} maxLength={150} autoComplete="off" placeholder={placeholder} className={inputClass} />
    {visible && <div id={`${id}-list`} role="listbox" aria-label={`Coincidencias para ${label.toLocaleLowerCase("es")}`}
      className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
      {matches.map((option, index) => <button key={option.id} id={`${id}-option-${index}`} type="button" role="option"
        aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-normal hover:bg-primary/10 ${index === activeIndex ? "bg-primary/10" : ""}`}>
        <span className="min-w-0"><span className="block truncate">{option.name}</span>{option.studyName && !sameName(option.studyName, value) && <span className="block truncate text-[11px] text-muted-foreground">{option.studyName}</span>}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">{option.code}</span>
      </button>)}
    </div>}
    {hint && <p className="text-xs font-normal text-muted-foreground">{hint}</p>}
  </div>;
}
