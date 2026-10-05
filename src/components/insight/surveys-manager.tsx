"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, ChevronDown, ChevronRight, CircleHelp, ClipboardList, FileQuestion, Layers3, RefreshCw, Search, Sparkles, Trash2, Upload, UsersRound } from "lucide-react";
import { CubeLoader } from "@/components/cube-loader";
import type { SurveyOrganization, SurveySummary, SurveyVersion } from "@/lib/insight-surveys";
import type { SurveyImportProgress } from "@/lib/insight-survey-imports";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type StudyGroup = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  organizationName: string;
  instruments: SurveySummary[];
};
type Selection = { kind: "study" | "instrument"; id: string };

const importStatusLabels: Record<string, string> = {
  uploading: "Subiendo archivo", ready: "Por confirmar", queued: "En espera", processing: "Importando", failed: "Falló",
};
const largeDeletionResponseThreshold = 100_000;

export function SurveysManager({ organizations, surveys, deletableStudyIds, deletableInstrumentIds, versionsByInstrument, pendingImports, initialOrganizationId = "all" }: {
  organizations: SurveyOrganization[]; surveys: SurveySummary[]; deletableStudyIds: string[]; deletableInstrumentIds: string[]; versionsByInstrument: Record<string, SurveyVersion[]>; pendingImports: SurveyImportProgress[]; initialOrganizationId?: string;
}) {
  const router = useRouter();
  const activeJobs = pendingImports.filter((job) => ["uploading", "queued", "processing"].includes(job.status))
    .map(({ id, status }) => ({ id, status })).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 50);
  useAutoRefresh(activeJobs.length > 0, `/api/surveys/imports?ids=${activeJobs.map((job) => job.id).join(",")}`, JSON.stringify(activeJobs));

  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState("");
  const [deleteStudy, setDeleteStudy] = useState<StudyGroup | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingStudy, setDeletingStudy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteInstrument, setDeleteInstrument] = useState<SurveySummary | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [instrumentConfirmation, setInstrumentConfirmation] = useState("");
  const [deletingInstrument, setDeletingInstrument] = useState(false);
  const [instrumentDeleteError, setInstrumentDeleteError] = useState("");

  const visible = useMemo(() => surveys.filter((survey) =>
    (organizationId === "all" || survey.organization_id === organizationId) &&
    `${survey.name} ${survey.code} ${survey.study_name} ${survey.study_code}`.toLocaleLowerCase("es")
      .includes(query.trim().toLocaleLowerCase("es")),
  ), [surveys, organizationId, query]);
  const studies = useMemo(() => {
    const grouped = new Map<string, StudyGroup>();
    for (const survey of visible) {
      const study = grouped.get(survey.study_id) ?? {
        id: survey.study_id, code: survey.study_code, name: survey.study_name,
        description: survey.study_description, organizationName: survey.organization_name, instruments: [],
      };
      study.instruments.push(survey);
      grouped.set(study.id, study);
    }
    return [...grouped.values()];
  }, [visible]);
  const selectedInstrument = selection?.kind === "instrument"
    ? visible.find((survey) => survey.id === selection.id) : undefined;
  const selectedStudy = selectedInstrument
    ? studies.find((study) => study.id === selectedInstrument.study_id)
    : studies.find((study) => study.id === selection?.id) ?? studies[0];
  const visibleImports = pendingImports.filter((job) =>
    (organizationId === "all" || job.organization_id === organizationId) &&
    `${job.instrument_name} ${job.instrument_code} ${job.study_name} ${job.study_code} ${job.source_filename}`
      .toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")));

  async function retryImport(id: string) {
    setRetryError("");
    setRetrying(id);
    try {
      const response = await fetch("/api/surveys/imports", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, confirm_warnings: true, column_mapping: {} }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo iniciar la importación.");
      router.refresh();
    } catch (cause) {
      setRetryError(cause instanceof Error ? cause.message : "No se pudo iniciar la importación.");
    } finally {
      setRetrying(null);
    }
  }

  async function removeStudy() {
    if (!deleteStudy || deleteConfirmation.trim() !== deleteStudy.name) return;
    setDeletingStudy(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/surveys/studies/${deleteStudy.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_name: deleteConfirmation }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar el estudio.");
      setSelection(null);
      setDeleteStudy(null);
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el estudio.");
    } finally {
      setDeletingStudy(false);
    }
  }

  async function removeInstrumentVersions() {
    if (!deleteInstrument || !selectedVersions.length || instrumentConfirmation.trim() !== deleteInstrument.name) return;
    setDeletingInstrument(true);
    setInstrumentDeleteError("");
    try {
      const response = await fetch(`/api/surveys/${deleteInstrument.id}/versions`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_ids: selectedVersions, confirm_name: instrumentConfirmation }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar el cuestionario.");
      setDeleteInstrument(null);
      if (body.instrumentDeleted) setSelection(null);
      router.refresh();
    } catch (error) {
      setInstrumentDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el cuestionario.");
    } finally {
      setDeletingInstrument(false);
    }
  }

  return <div className="grid min-h-[calc(100dvh-10rem)] w-full gap-4 lg:h-[calc(100dvh-8rem)] lg:min-h-0 lg:grid-cols-[minmax(0,20fr)_minmax(0,65fr)_minmax(0,15fr)] lg:items-stretch">
    <aside aria-label="Catálogo de encuestas" className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="insight-card-header border-b border-border p-4">
        <div className="flex items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Layers3 size={18} /></span><div className="min-w-0"><h1 className="font-semibold">Estudios</h1><p className="text-xs text-muted-foreground">{studies.length} estudios · {visible.length} instrumentos</p></div></div>
        <div className="mt-4 space-y-2">
          {organizations.length > 1 && <label className="block"><span className="sr-only">Organización</span><select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="all">Todas las organizaciones</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>}
          <label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar estudio o instrumento" aria-label="Buscar estudio o instrumento" className="w-full rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
        </div>
      </div>
      <div className="min-h-0 max-h-80 flex-1 overflow-y-auto p-2 lg:max-h-none">
        {studies.map((study) => {
          const open = expanded[study.id] ?? (selectedStudy?.id === study.id);
          const selected = selectedStudy?.id === study.id && !selectedInstrument;
          return <div key={study.id} className="mb-1 rounded-xl">
            <div className={`flex items-start gap-1 rounded-xl ${selected ? "bg-primary/10 text-primary" : "hover:bg-muted/60"}`}>
              <button type="button" onClick={() => { setSelection({ kind: "study", id: study.id }); setExpanded((state) => ({ ...state, [study.id]: true })); }} className="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-left focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-primary" aria-current={selected ? "true" : undefined}>
                <span className="block truncate text-sm font-semibold">{study.name}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{study.code} · {study.instruments.length} instrumentos</span>
              </button>
              <button type="button" onClick={() => setExpanded((state) => ({ ...state, [study.id]: !open }))} aria-label={`${open ? "Contraer" : "Expandir"} ${study.name}`} aria-expanded={open} className="mr-1 mt-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
            </div>
            {open && <div className="ml-4 border-l border-border pl-2">{study.instruments.map((survey) => <button key={survey.id} type="button" onClick={() => { setSelection({ kind: "instrument", id: survey.id }); setExpanded((state) => ({ ...state, [study.id]: true })); }} aria-current={selectedInstrument?.id === survey.id ? "true" : undefined} className={`my-0.5 flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-primary ${selectedInstrument?.id === survey.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted/60"}`}><FileQuestion size={14} className="mt-0.5 shrink-0" /><span className="min-w-0"><span className="block break-words">{survey.name}</span><span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{survey.code}</span></span></button>)}</div>}
          </div>;
        })}
        {!studies.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{surveys.length ? "No hay coincidencias con este filtro." : "Aún no hay estudios disponibles."}</p>}
      </div>
    </aside>

    <section aria-label="Resumen de encuestas" className="flex min-h-80 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto">
      {selectedStudy ? <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{selectedInstrument ? "Instrumento seleccionado" : "Estudio seleccionado"}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{selectedInstrument?.name ?? selectedStudy.name}</h2><p className="mt-2 text-sm text-muted-foreground">{selectedStudy.organizationName} · {selectedInstrument ? selectedStudy.name : `${selectedStudy.instruments.length} instrumentos vinculados`}</p></div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary">{selectedInstrument?.code ?? selectedStudy.code}</span>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">{selectedInstrument?.description || (!selectedInstrument && selectedStudy.description) || (selectedInstrument ? "Cuestionario disponible para explorar sus preguntas, versiones y respuestas." : "Este estudio reúne los instrumentos disponibles para su consulta y análisis.")}</p>
        {selectedInstrument ? <>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Metric icon={<BookOpenText size={18} />} label="Versión más reciente" value={selectedInstrument.version ? `v${selectedInstrument.version}` : "Sin versión"} />
            <Metric icon={<FileQuestion size={18} />} label="Preguntas" value={selectedInstrument.question_count.toLocaleString("es-MX")} />
            <Metric icon={<UsersRound size={18} />} label="Registros" value={selectedInstrument.observation_count.toLocaleString("es-MX")} />
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-4"><div><p className="text-sm font-semibold">Explorar cuestionario</p><p className="mt-1 text-xs text-muted-foreground">Abre las preguntas y analiza las respuestas por versión.</p></div><Link href={`/surveys/${selectedInstrument.id}`} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Abrir cuestionario <ArrowRight size={16} /></Link></div>
          <dl className="mt-7 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Estudio</dt><dd className="mt-1 font-medium">{selectedStudy.name}</dd></div><div><dt className="text-xs text-muted-foreground">Estado de la versión</dt><dd className="mt-1 font-medium">{selectedInstrument.status ?? "Sin versión"}</dd></div><div><dt className="text-xs text-muted-foreground">Tipo</dt><dd className="mt-1 font-medium">{selectedInstrument.instrument_type}</dd></div><div><dt className="text-xs text-muted-foreground">Organización</dt><dd className="mt-1 font-medium">{selectedInstrument.organization_name}</dd></div><div><dt className="text-xs text-muted-foreground">Creado el</dt><dd className="mt-1 font-medium">{formatSurveyDate(selectedInstrument.created_at)}</dd></div><div><dt className="text-xs text-muted-foreground">Creado por</dt><dd className="mt-1 font-medium">{selectedInstrument.created_by_name || "No disponible"}</dd></div>{selectedInstrument.version_created_at && <div><dt className="text-xs text-muted-foreground">Versión más reciente creada el</dt><dd className="mt-1 font-medium">{formatSurveyDate(selectedInstrument.version_created_at)}</dd></div>}{selectedInstrument.version_source_file && <div><dt className="text-xs text-muted-foreground">Archivo de origen</dt><dd className="mt-1 break-all font-medium">{selectedInstrument.version_source_file}</dd></div>}{selectedInstrument.version_valid_from && <div><dt className="text-xs text-muted-foreground">Vigencia desde</dt><dd className="mt-1 font-medium">{formatSurveyDateOnly(selectedInstrument.version_valid_from)}</dd></div>}{selectedInstrument.version_valid_to && <div><dt className="text-xs text-muted-foreground">Vigencia hasta</dt><dd className="mt-1 font-medium">{formatSurveyDateOnly(selectedInstrument.version_valid_to)}</dd></div>}{Object.entries(selectedInstrument.metadata ?? {}).filter(([key]) => !["import_job_id", "source_file"].includes(key)).map(([key, value]) => <div key={key}><dt className="text-xs text-muted-foreground">{metadataLabel(key)}</dt><dd className="mt-1 break-all font-medium">{typeof value === "string" ? value : JSON.stringify(value)}</dd></div>)}</dl>
        </> : <>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Metric icon={<ClipboardList size={18} />} label="Instrumentos" value={selectedStudy.instruments.length.toLocaleString("es-MX")} />
            <Metric icon={<FileQuestion size={18} />} label="Preguntas actuales" value={selectedStudy.instruments.reduce((sum, item) => sum + item.question_count, 0).toLocaleString("es-MX")} />
            <Metric icon={<UsersRound size={18} />} label="Registros actuales" value={selectedStudy.instruments.reduce((sum, item) => sum + item.observation_count, 0).toLocaleString("es-MX")} />
          </div>
          <div className="mt-8"><h3 className="text-sm font-semibold">Instrumentos del estudio</h3><div className="mt-3 divide-y divide-border rounded-2xl border border-border">{selectedStudy.instruments.map((survey) => <button key={survey.id} type="button" onClick={() => setSelection({ kind: "instrument", id: survey.id })} className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"><span className="min-w-0"><span className="block font-medium">{survey.name}</span><span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{survey.code} · v{survey.version ?? "—"}</span></span><ChevronRight size={16} className="shrink-0 text-primary" /></button>)}</div></div>
        </>}
      </div> : <div className="grid min-h-80 place-items-center p-8 text-center"><div><CircleHelp size={28} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">Sin resultados</h2><p className="mt-1 text-sm text-muted-foreground">Ajusta la búsqueda o el filtro de organización.</p></div></div>}
      {visibleImports.length > 0 && <section className="border-t border-border p-5 sm:p-7" aria-labelledby="pending-imports-title"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 id="pending-imports-title" className="text-sm font-semibold">Cargas por completar</h3><p className="mt-1 text-xs text-muted-foreground">El estado se actualiza mientras haya importaciones en curso.</p></div><button type="button" onClick={() => router.refresh()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><RefreshCw size={13} /> Actualizar</button></div>{retryError && <p role="alert" className="mt-3 text-sm text-destructive">{retryError}</p>}<div className="mt-3 divide-y divide-border rounded-xl border border-border">{visibleImports.map((job) => <div key={job.id} className="flex flex-wrap items-center gap-3 p-3 text-xs"><Upload size={16} className="shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-semibold">{job.instrument_name}</p><p className="mt-0.5 text-muted-foreground">{job.organization_name} · {job.study_name} · {importStatusLabels[job.status] ?? job.status}</p>{job.error_message && <p className="mt-1 text-destructive">{job.error_message}</p>}</div>{job.status === "queued" && !job.workflow_run_id ? <button type="button" disabled={retrying === job.id} onClick={() => retryImport(job.id)} className="cursor-pointer rounded-lg border border-primary px-2.5 py-1.5 font-semibold text-primary disabled:opacity-50">{retrying === job.id ? "Iniciando…" : "Reintentar"}</button> : <Link href={`/surveys/imports#import-job-${job.id}`} className="font-semibold text-primary hover:underline">Ver carga</Link>}</div>)}</div></section>}
      </div>
      {selectedInstrument && deletableInstrumentIds.includes(selectedInstrument.id) && (versionsByInstrument[selectedInstrument.id]?.length ?? 0) > 0 && <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card p-4"><p className="text-sm text-muted-foreground">Administrar <strong className="font-semibold text-foreground">{selectedInstrument.name}</strong> y versiones</p><button type="button" onClick={() => { setDeleteInstrument(selectedInstrument); setSelectedVersions(versionsByInstrument[selectedInstrument.id]?.[0] ? [versionsByInstrument[selectedInstrument.id][0].id] : []); setInstrumentConfirmation(""); setInstrumentDeleteError(""); }} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"><Trash2 size={16} /> Eliminar</button></div>}
      {selectedStudy && !selectedInstrument && deletableStudyIds.includes(selectedStudy.id) && <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card p-4"><p className="text-sm text-muted-foreground">Administrar <strong className="font-semibold text-foreground">{selectedStudy.name}</strong> y sus instrumentos</p><button type="button" onClick={() => { setDeleteStudy(selectedStudy); setDeleteConfirmation(""); setDeleteError(""); }} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"><Trash2 size={16} /> Eliminar</button></div>}
    </section>

    <aside aria-label="Importar cuestionario" className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-3 2xl:p-5" style={{ background: "linear-gradient(160deg, var(--surface-header-start), var(--card) 58%, var(--surface-header-end))" }}>
      <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full border-[18px] border-primary/10" />
      <span className="relative grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Upload size={23} /></span>
      <div className="relative mt-5"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-primary">Nueva carga</p><h2 className="mt-2 break-words text-lg font-semibold leading-tight text-foreground">Importar cuestionario</h2><p className="mt-3 break-words text-xs leading-5 text-muted-foreground">Carga TXT, CSV, Excel, ODS o JSON. Revisa las preguntas antes de confirmar y sigue el avance desde aquí.</p></div>
      <div className="relative mt-6 space-y-3 border-t border-border pt-5 text-xs text-muted-foreground"><p className="flex items-start gap-2"><Sparkles size={15} className="mt-0.5 shrink-0 text-primary" /> Vista previa antes de importar</p><p className="flex items-start gap-2"><ClipboardList size={15} className="mt-0.5 shrink-0 text-primary" /> Carga con seguimiento</p></div>
      <Link href="/surveys/imports" className="relative mt-8 inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-center text-xs font-semibold text-primary-foreground transition hover:opacity-90 lg:mt-auto"><span>Importar</span><ArrowRight size={14} className="shrink-0" /></Link>
      {pendingImports.length > 0 && <p className="relative mt-3 text-center text-[11px] text-muted-foreground">{pendingImports.length} {pendingImports.length === 1 ? "carga pendiente" : "cargas pendientes"}</p>}
    </aside>
    {deleteStudy && <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-study-title"><button type="button" aria-label="Cerrar" onClick={() => !deletingStudy && setDeleteStudy(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" /><div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"><div className="border-b border-border p-5"><h2 id="delete-study-title" className="text-lg font-semibold">Eliminar estudio</h2><p className="mt-1.5 text-sm text-muted-foreground">Se eliminarán todos los instrumentos de este estudio, con sus versiones, preguntas, registros y respuestas.</p></div><div className="space-y-3 p-5"><label htmlFor="delete-study-confirmation" className="block text-sm">Escribe <strong className="font-semibold">{deleteStudy.name}</strong> para confirmar</label><input id="delete-study-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" placeholder={deleteStudy.name} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />{deleteError && <p role="alert" className="text-sm text-danger">{deleteError}</p>}</div>{estimateStudyResponses(deleteStudy.id, surveys, versionsByInstrument) >= largeDeletionResponseThreshold && <p role="status" className="mx-5 mb-4 rounded-xl border border-amber-700/50 bg-amber-100 px-3.5 py-3 text-sm font-semibold text-[#713f12] dark:border-amber-700/50 dark:bg-amber-100 dark:text-[#713f12]">Por el tamaño de este estudio, la eliminación puede tardar un par de minutos. Mantén esta ventana abierta mientras termina.</p>}<div className="flex justify-end gap-2 border-t border-border p-4"><button type="button" onClick={() => setDeleteStudy(null)} disabled={deletingStudy} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">Cancelar</button><button type="button" onClick={() => void removeStudy()} disabled={deletingStudy || deleteConfirmation.trim() !== deleteStudy.name} className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{deletingStudy && <CubeLoader size={15} />}{deletingStudy ? "Eliminando…" : "Eliminar estudio"}</button></div></div></div>}
    {deleteInstrument && <InstrumentDeleteDialog instrument={deleteInstrument} versions={versionsByInstrument[deleteInstrument.id] ?? []} selectedVersions={selectedVersions} setSelectedVersions={setSelectedVersions} confirmation={instrumentConfirmation} setConfirmation={setInstrumentConfirmation} error={instrumentDeleteError} deleting={deletingInstrument} onClose={() => setDeleteInstrument(null)} onDelete={() => void removeInstrumentVersions()} />}
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-muted/30 p-4"><span className="text-primary">{icon}</span><p className="mt-4 text-2xl font-semibold tabular-nums text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}

function InstrumentDeleteDialog({ instrument, versions, selectedVersions, setSelectedVersions, confirmation, setConfirmation, error, deleting, onClose, onDelete }: {
  instrument: SurveySummary;
  versions: SurveyVersion[];
  selectedVersions: string[];
  setSelectedVersions: React.Dispatch<React.SetStateAction<string[]>>;
  confirmation: string;
  setConfirmation: (value: string) => void;
  error: string;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const allSelected = versions.length > 0 && selectedVersions.length === versions.length;
  const estimatedResponses = versions.filter((version) => selectedVersions.includes(version.id))
    .reduce((sum, version) => sum + version.question_count * version.observation_count, 0);
  return <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-instrument-title">
    <button type="button" aria-label="Cerrar" onClick={() => !deleting && onClose()} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative max-h-[min(85dvh,42rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="border-b border-border p-5"><h2 id="delete-instrument-title" className="text-lg font-semibold">Eliminar cuestionario</h2><p className="mt-1.5 text-sm text-muted-foreground">Selecciona las versiones que quieres eliminar. Se borrarán también sus preguntas, registros y respuestas.</p></div>
      <div className="max-h-[50dvh] space-y-2 overflow-y-auto p-5">
        {versions.map((version) => <label key={version.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/40"><input type="checkbox" checked={selectedVersions.includes(version.id)} onChange={(event) => setSelectedVersions((current) => event.target.checked ? [...current, version.id] : current.filter((id) => id !== version.id))} className="size-4 accent-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">v{version.version}</span><span className="mt-0.5 block text-xs text-muted-foreground">{version.question_count.toLocaleString("es-MX")} preguntas · {version.observation_count.toLocaleString("es-MX")} registros</span></span></label>)}
        <button type="button" onClick={() => setSelectedVersions(() => allSelected ? [] : versions.map((version) => version.id))} className="text-xs font-semibold text-primary hover:underline">{allSelected ? "Quitar selección" : "Seleccionar todas"}</button>
        {allSelected && <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">Al eliminar todas las versiones también se eliminará el instrumento del catálogo.</p>}
        <label htmlFor="delete-instrument-confirmation" className="block pt-3 text-sm">Escribe <strong className="font-semibold">{instrument.name}</strong> para confirmar</label>
        <input id="delete-instrument-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" placeholder={instrument.name} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
      {estimatedResponses >= largeDeletionResponseThreshold && <p role="status" className="mx-5 mb-4 rounded-xl border border-amber-700/50 bg-amber-100 px-3.5 py-3 text-sm font-semibold text-[#713f12] dark:border-amber-700/50 dark:bg-amber-100 dark:text-[#713f12]">Por el tamaño de las versiones seleccionadas, la eliminación puede tardar un par de minutos. Mantén esta ventana abierta mientras termina.</p>}
      <div className="flex justify-end gap-2 border-t border-border p-4"><button type="button" onClick={onClose} disabled={deleting} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">Cancelar</button><button type="button" onClick={onDelete} disabled={!selectedVersions.length || deleting || confirmation.trim() !== instrument.name} className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{deleting && <CubeLoader size={15} />}{deleting ? "Eliminando…" : `Eliminar ${selectedVersions.length || ""} ${selectedVersions.length === 1 ? "versión" : "versiones"}`}</button></div>
    </div>
  </div>;
}

function estimateStudyResponses(studyId: string, surveys: SurveySummary[], versionsByInstrument: Record<string, SurveyVersion[]>) {
  return surveys.filter((survey) => survey.study_id === studyId).reduce((studyTotal, survey) =>
    studyTotal + (versionsByInstrument[survey.id] ?? []).reduce((instrumentTotal, version) =>
      instrumentTotal + version.question_count * version.observation_count, 0), 0);
}

function formatSurveyDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(value instanceof Date ? value : new Date(value));
}

function formatSurveyDateOnly(value: string | Date) {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date);
}

function metadataLabel(key: string) {
  return key.replaceAll("_", " ").replace(/^./, (letter) => letter.toLocaleUpperCase("es-MX"));
}
