"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { CubeLoader } from "@/components/cube-loader";
import { ArrowLeft, ArrowRight, BarChart3, FileQuestion, Hash, ListChecks, UsersRound } from "lucide-react";
import type { SurveyQuestion, SurveyQuestionAnalytics, SurveyQuestionResponsePage } from "@/lib/insight-surveys";
import { SurveyVersionSelect } from "@/components/insight/survey-version-select";
import { SurveyTableView } from "@/components/insight/survey-table-view";

const questionType: Record<string, string> = {
  integer: "Número entero", number: "Número", text: "Texto", single_choice: "Selección única",
  multiple_choice: "Selección múltiple", ranking: "Orden de importancia", scale: "Escala",
};
const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

export function SurveyDetailView({ analysis, initialRecords = null, tableFocus = null }: { analysis: SurveyQuestionAnalytics; initialRecords?: SurveyQuestionResponsePage | null; tableFocus?: { recordId: string; variableId: string | null } | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [records, setRecords] = useState<SurveyQuestionResponsePage | null>(initialRecords);
  const [recordsPending, setRecordsPending] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [pendingTableQuestion, setPendingTableQuestion] = useState<string | null>(null);
  const [pendingTableRecord, setPendingTableRecord] = useState(false);
  const analysisPanelRef = useRef<HTMLElement>(null);
  const questionNavRef = useRef<HTMLElement>(null);
  const recordsAbortRef = useRef<AbortController | null>(null);
  const { detail, version, question, total, answered, missing, distinct, distribution } = analysis;
  const { survey, sections, questions, versions } = detail;
  const questionHref = (id: string) => `/surveys/${survey.id}?version=${version?.id ?? ""}&question=${id}`;
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));
  const coverage = total > 0 ? Math.round(answered / total * 100) : 0;
  const numeric = question && ["integer", "number", "scale", "ranking"].includes(question.question_type);
  const loadingPanel = Boolean(pendingQuestion || isPending || recordsPending);
  const routeView = searchParams.get("view");
  const workspaceView = routeView === "table" ? "table" : "question";
  const panelView = routeView === "records" ? "records" : "statistics";

  function updateViewUrl(view?: "table" | "records") {
    const url = new URL(window.location.href);
    if (view) url.searchParams.set("view", view);
    else url.searchParams.delete("view");
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  useLayoutEffect(() => {
    if (workspaceView !== "question" || !question?.id) return;
    const nav = questionNavRef.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !selected) return;
    const navBounds = nav.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    nav.scrollTop += selectedBounds.top - navBounds.top - (nav.clientHeight - selectedBounds.height) / 2;
  }, [question?.id, version?.id, workspaceView]);

  useEffect(() => {
    return () => recordsAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!loadingPanel) return;
    analysisPanelRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [loadingPanel]);

  function blockAnalysisScroll(event: { preventDefault: () => void }) {
    if (loadingPanel) event.preventDefault();
  }

  async function showRecords(page = 1) {
    if (!question || !version) return;
    recordsAbortRef.current?.abort();
    const controller = new AbortController();
    recordsAbortRef.current = controller;
    updateViewUrl("records");
    setRecordsPending(true);
    setRecordsError("");
    try {
      const query = new URLSearchParams({ page: String(page), version: version.id });
      const response = await fetch(`/api/surveys/${survey.id}/questions/${question.id}/responses?${query}`, { signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar los registros.");
      if (!controller.signal.aborted) setRecords(body as SurveyQuestionResponsePage);
    } catch (error) {
      if (!controller.signal.aborted) setRecordsError(error instanceof Error ? error.message : "No se pudieron cargar los registros.");
    } finally {
      if (!controller.signal.aborted) setRecordsPending(false);
    }
  }

  function showStatistics() {
    analysisPanelRef.current?.scrollTo({ top: 0, behavior: "instant" });
    updateViewUrl();
  }

  function toggleWorkspaceView() {
    if (workspaceView === "question") {
      recordsAbortRef.current?.abort();
      setRecordsPending(false);
      updateViewUrl("table");
      return;
    }
    updateViewUrl();
  }

  function selectTableQuestion(questionId: string) {
    if (question?.id === questionId) {
      updateViewUrl();
      return;
    }
    setPendingTableQuestion(questionId);
  }

  return <div className="relative flex min-h-[calc(100dvh-10rem)] w-full flex-col gap-4 lg:h-[calc(100dvh-8rem)] lg:min-h-0">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="min-w-0"><Link href="/surveys" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"><ArrowLeft size={14} /> Volver a Encuestas</Link><h1 className="mt-1 truncate text-xl font-semibold text-foreground">{survey.name}</h1><p className="mt-0.5 text-xs text-muted-foreground">{survey.organization_name} · {survey.study_name} · {survey.code}</p></div>
      {version && <div className="flex flex-wrap items-end justify-end gap-5">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Vista</p>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={workspaceView === "table" ? "text-primary" : "text-muted-foreground"}>Tabla</span>
            <button type="button" role="switch" aria-checked={workspaceView === "question"} aria-label="Cambiar entre vista de tabla y vista por pregunta" onClick={toggleWorkspaceView} className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${workspaceView === "question" ? "bg-gradient-to-r from-primary to-[var(--accent-violet)]" : "bg-muted"}`}><span className={`size-4 rounded-full bg-white shadow transition-transform ${workspaceView === "question" ? "translate-x-[24px]" : "translate-x-1"}`} /></button>
            <span className={workspaceView === "question" ? "text-primary" : "text-muted-foreground"}>Por pregunta</span>
          </div>
        </div>
        <SurveyVersionSelect surveyId={survey.id} versions={versions} selectedId={version.id} />
      </div>}
    </header>
    {workspaceView === "table" && version ? <div className="flex min-h-0 flex-1 flex-col">
      <SurveyTableView key={version.id} surveyId={survey.id} versionId={version.id} focus={tableFocus} onSelectQuestion={selectTableQuestion} />
    </div> : <div className="flex min-h-0 flex-1 flex-col">
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,20fr)_minmax(0,80fr)]">
      <aside aria-label="Preguntas del cuestionario" className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="insight-card-header border-b border-border p-4"><div className="flex items-center gap-2"><FileQuestion size={18} className="text-primary" /><h2 className="font-semibold">Cuestionario</h2></div><p className="mt-1 text-xs text-muted-foreground">{questions.length} preguntas · {version ? `versión ${version.version}` : "sin versión"}</p></div>
        <nav ref={questionNavRef} className="min-h-0 max-h-80 flex-1 space-y-4 overflow-y-auto p-2 lg:max-h-none" aria-label="Seleccionar pregunta">
              {sections.map((section) => <div key={section.id}><p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{section.title}</p><div className="space-y-0.5">{questions.filter((item) => item.section_id === section.id).map((item) => <QuestionLink key={item.id} question={item} href={questionHref(item.id)} selected={question?.id === item.id} onNavigate={() => setPendingQuestion(item.id)} startTransition={startTransition} />)}</div></div>)}
          {questions.filter((item) => !item.section_id).map((item) => <QuestionLink key={item.id} question={item} href={questionHref(item.id)} selected={question?.id === item.id} onNavigate={() => setPendingQuestion(item.id)} startTransition={startTransition} />)}
          {!questions.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Esta versión no tiene preguntas.</p>}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <section ref={analysisPanelRef} aria-label={panelView === "statistics" ? "Análisis de la pregunta" : "Registros de la pregunta"} aria-busy={loadingPanel} onWheelCapture={blockAnalysisScroll} onTouchMoveCapture={blockAnalysisScroll} onKeyDownCapture={(event) => { if (loadingPanel && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) event.preventDefault(); }} className={`relative min-h-0 min-w-0 flex-1 rounded-2xl border border-border bg-card shadow-sm ${loadingPanel ? "overflow-hidden" : "overflow-y-auto"}`}>
        {question ? panelView === "statistics" ? <div className="p-5 pb-20 sm:p-7 sm:pb-20">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6"><div className="min-w-0"><p className="font-mono text-xs font-semibold text-primary">{question.code} · {questionType[question.question_type] ?? question.question_type}</p><h2 className="mt-3 max-w-4xl text-2xl font-semibold leading-snug text-foreground sm:text-3xl">{question.text}</h2><div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">{question.required && <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1">Obligatoria</span>}{question.variable_codes.filter((code) => code !== question.code).map((code) => <span key={code} className="rounded-full border border-border bg-muted/50 px-2.5 py-1 font-mono">{code}</span>)}</div></div><button type="button" onClick={() => void showRecords(1)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10">Ver registros <ArrowRight size={14} /></button></div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<UsersRound size={17} />} label="Registros" value={numberFormat.format(total)} />
            <Metric icon={<ListChecks size={17} />} label="Con respuesta" value={numberFormat.format(answered)} />
            <Metric icon={<FileQuestion size={17} />} label="Sin respuesta" value={numberFormat.format(missing)} />
            <Metric icon={<Hash size={17} />} label="Valores distintos" value={numberFormat.format(distinct)} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(210px,1fr)]">
            <div className="rounded-2xl border border-border p-5"><div className="flex items-center gap-2"><BarChart3 size={17} className="text-primary" /><h3 className="text-sm font-semibold">Distribución de respuestas</h3></div><p className="mt-1 text-xs text-muted-foreground">Hasta 12 valores más frecuentes · conteo de registros por valor</p>
              {distribution.length ? <div className="mt-6 space-y-3" role="img" aria-label="Gráfica de frecuencias de respuestas">{distribution.map((item) => <div key={item.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3 text-xs"><span className="truncate text-foreground" title={item.label}>{item.label}</span><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${item.count / maxCount * 100}%` }} /></div><span className="text-right tabular-nums text-muted-foreground">{numberFormat.format(item.count)}</span></div>)}</div> : <p className="mt-8 rounded-xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">Aún no hay respuestas para esta pregunta.</p>}
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border p-5 text-center"><div className="grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${coverage}%, var(--muted) ${coverage}% 100%)` }}><div className="grid size-27 place-items-center rounded-full bg-card"><div><p className="text-3xl font-semibold tabular-nums">{coverage}%</p><p className="text-xs text-muted-foreground">cobertura</p></div></div></div><h3 className="mt-5 text-sm font-semibold">Participación de la pregunta</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{numberFormat.format(answered)} de {numberFormat.format(total)} registros tienen una respuesta.</p></div>
          </div>

          {numeric && <div className="mt-6"><h3 className="text-sm font-semibold">Estadísticas numéricas</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Mínimo" value={analysis.minimum === null ? "—" : numberFormat.format(analysis.minimum)} /><Metric label="Promedio" value={analysis.average === null ? "—" : numberFormat.format(analysis.average)} /><Metric label="Mediana" value={analysis.median === null ? "—" : numberFormat.format(analysis.median)} /><Metric label="Máximo" value={analysis.maximum === null ? "—" : numberFormat.format(analysis.maximum)} /></div></div>}
          {question.options.length > 0 && <div className="mt-6 border-t border-border pt-6"><h3 className="text-sm font-semibold">Opciones del cuestionario</h3><div className="mt-3 flex flex-wrap gap-2">{question.options.map((option) => <span key={option.code} className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-foreground" title={option.value}>{option.label}</span>)}</div></div>}
        </div> : <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Registros · versión {version?.version ?? "—"}</p><h2 className="mt-2 text-2xl font-semibold text-foreground">Respuestas de {question.code}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{question.text}</p></div><button type="button" onClick={showStatistics} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"><ArrowLeft size={14} /> Volver a Estadísticas</button></div>
          {recordsError && <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{recordsError}</p>}
          {records && <><div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p>{records.version.observation_count.toLocaleString("es-MX")} registros en esta versión</p><p>Respuestas de la pregunta por registro</p></div><div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">{records.observations.map((observation) => {
            const answers = records.answers.filter((answer) => answer.observation_id === observation.id);
            const tableQuery = new URLSearchParams({ version: version?.id ?? "", question: question.id, view: "table", record: observation.id });
            if (answers[0]?.variable_id) tableQuery.set("variable", answers[0].variable_id);
            return <article key={observation.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-6">
              <div>
                <Link href={`/surveys/${survey.id}?${tableQuery}`} onClick={(event) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; setPendingTableRecord(true); }} className="group inline-flex max-w-full items-center gap-1.5 rounded-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="min-w-0 break-all">{observation.external_id ?? observation.id}</span>
                  <ArrowRight size={14} aria-hidden="true" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{observation.status}</p>
              </div>
              <div className="space-y-3 text-sm">{answers.length ? answers.map((answer) => <div key={`${observation.id}-${answer.variable_id}`}>{question.variable_codes.length > 1 && <p className="font-mono text-[11px] text-muted-foreground">{answer.variable_code}</p>}<p className="break-words font-medium">{answer.is_missing ? "Sin respuesta" : answer.option_label ?? answer.value_text ?? answer.raw_value ?? "Sin valor"}</p>{answer.raw_value !== null && <p className="mt-1 break-words text-xs text-muted-foreground">Valor original: {answer.raw_value}</p>}</div>) : <p className="text-muted-foreground">Sin respuesta registrada</p>}</div>
            </article>;
          })}{!records.observations.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No hay registros en esta versión.</p>}</div><nav aria-label="Páginas de registros" className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm"><span className="text-muted-foreground">Página {records.page} de {records.pageCount}</span><div className="flex gap-2"><button type="button" onClick={() => void showRecords(records.page - 1)} disabled={records.page <= 1 || recordsPending} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><ArrowLeft size={14} /> Anterior</button><button type="button" onClick={() => void showRecords(records.page + 1)} disabled={records.page >= records.pageCount || recordsPending} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">Siguiente <ArrowRight size={14} /></button></div></nav></>}
        </div> : <div className="grid min-h-80 place-items-center p-8 text-center"><div><FileQuestion size={30} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">Sin preguntas para analizar</h2><p className="mt-1 text-sm text-muted-foreground">Selecciona otra versión del cuestionario.</p></div></div>}
        {loadingPanel && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-card/75 backdrop-blur-sm" role="status" aria-live="polite"><CubeLoader size={40} /><p className="text-sm text-muted-foreground">{recordsPending ? "Cargando registros…" : "Cargando análisis de la pregunta…"}</p></div>}
      </section>
      </div>
    </div></div>}
    {(pendingTableQuestion || pendingTableRecord) && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/90 text-primary backdrop-blur-sm" role="status" aria-live="polite"><CubeLoader size={40} /><p className="text-sm text-muted-foreground">{pendingTableRecord ? "Cargando tabla…" : "Cargando análisis de la pregunta…"}</p></div>}
  </div>;
}

function QuestionLink({ question, href, selected, onNavigate, startTransition }: { question: SurveyQuestion; href: string; selected: boolean; onNavigate: () => void; startTransition: (callback: () => void) => void }) {
  const router = useRouter();
  return <Link href={href} prefetch={false} onClick={(event) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (selected) return; onNavigate(); startTransition(() => router.push(href, { scroll: false })); }} aria-current={selected ? "page" : undefined} className={`block rounded-xl px-3 py-2.5 transition focus-visible:outline-2 focus-visible:outline-primary ${selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60"}`}><span className="font-mono text-[11px] font-semibold">{question.code}</span><span className="mt-1 line-clamp-2 text-xs leading-5">{question.text}</span></Link>;
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-muted/30 p-4">{icon && <span className="text-primary">{icon}</span>}<p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}
