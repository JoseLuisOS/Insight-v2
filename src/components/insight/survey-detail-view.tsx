"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardList, FileQuestion, Layers3, UsersRound } from "lucide-react";
import type { SurveyDetail } from "@/lib/insight-surveys";

const tabs = ["Resumen", "Cuestionario", "Versiones"] as const;
type Tab = typeof tabs[number];
const questionType: Record<string, string> = {
  integer: "Número entero", number: "Número", text: "Texto", single_choice: "Selección única",
  multiple_choice: "Selección múltiple", ranking: "Orden de importancia", scale: "Escala",
};

export function SurveyDetailView({ detail }: { detail: SurveyDetail }) {
  const [tab, setTab] = useState<Tab>("Resumen");
  const { survey, sections, questions, versions } = detail;
  function moveTab(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
        : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setTab(tabs[next]);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }
  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <Link href="/surveys" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft size={16} /> Volver a Encuestas</Link>
    <section className="relative overflow-hidden rounded-[28px] bg-[#10233c] px-6 py-8 text-white shadow-[0_22px_70px_-35px_rgba(16,35,60,0.8)] sm:px-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 82% 15%, rgba(112,110,219,.27), transparent 38%), linear-gradient(120deg, rgba(8,18,33,.2), transparent)" }} />
      <div className="relative max-w-3xl"><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-blue-100"><ClipboardList size={13} /> {survey.organization_name}</p><h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{survey.name}</h1><p className="mt-3 text-sm leading-6 text-blue-100/80">{survey.description || survey.study_name}</p><p className="mt-3 font-mono text-xs text-blue-100/70">{survey.study_code} / {survey.code}</p></div>
    </section>
    <div className="grid gap-3 sm:grid-cols-3">
      <Summary icon={<Layers3 size={19} />} value={versions.length} label="Versiones" />
      <Summary icon={<FileQuestion size={19} />} value={survey.question_count} label="Preguntas actuales" />
      <Summary icon={<UsersRound size={19} />} value={survey.observation_count} label="Registros actuales" />
    </div>
    <div className="border-b border-border" role="tablist" aria-label="Vistas de la encuesta">{tabs.map((item, index) => <button key={item} id={`survey-tab-${index}`} type="button" role="tab" aria-selected={tab === item} aria-controls={`survey-panel-${index}`} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)} onKeyDown={(event) => moveTab(event, index)} className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</div>
    {tab === "Resumen" && <section id="survey-panel-0" role="tabpanel" aria-labelledby="survey-tab-0" tabIndex={0} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">{survey.study_name}</h2><p className="mt-2 text-sm text-muted-foreground">Versión actual: {survey.version ?? "sin versiones"} · {survey.status ?? "sin publicar"}</p><p className="mt-5 text-sm leading-6 text-muted-foreground">Consulta las preguntas del instrumento y su historial de versiones desde las pestañas superiores.</p><Link href={`/surveys/${survey.id}/responses`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Ver respuestas <ArrowRight size={16} /></Link></section>}
    {tab === "Cuestionario" && <div id="survey-panel-1" role="tabpanel" aria-labelledby="survey-tab-1" tabIndex={0} className="space-y-4">{sections.map((section) => <section key={section.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><header className="insight-card-header border-b border-border px-5 py-4"><h2 className="font-semibold">{section.title}</h2><p className="mt-1 font-mono text-[11px] text-muted-foreground">{section.code}</p></header><div className="divide-y divide-border">{questions.filter((question) => question.section_id === section.id).map((question) => <QuestionRow key={question.id} question={question} />)}</div></section>)}{questions.filter((question) => !question.section_id).map((question) => <QuestionRow key={question.id} question={question} />)}{!questions.length && <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Esta versión aún no tiene preguntas.</p>}</div>}
    {tab === "Versiones" && <section id="survey-panel-2" role="tabpanel" aria-labelledby="survey-tab-2" tabIndex={0} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><header className="insight-card-header border-b border-border px-5 py-4"><h2 className="font-semibold">Historial de versiones</h2></header><div className="divide-y divide-border">{versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold">{version.name || `Versión ${version.version}`}</p><p className="mt-1 font-mono text-xs text-muted-foreground">v{version.version}</p></div><div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{version.status}</span><span>{version.question_count} preguntas</span><span>{version.observation_count} registros</span></div></div>)}{!versions.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Este instrumento aún no tiene versiones.</p>}</div></section>}
  </div>;
}

function QuestionRow({ question }: { question: SurveyDetail["questions"][number] }) {
  return <article className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="font-mono text-[11px] text-primary">{question.code}{question.variable_codes.length ? ` · ${question.variable_codes.join(", ")}` : ""}</p><h3 className="mt-1 text-sm font-medium leading-6">{question.text}</h3></div><span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground">{questionType[question.question_type] || question.question_type}</span></div>{question.options.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{question.options.map((option) => <span key={option.code} className="rounded-lg bg-primary/5 px-2.5 py-1 text-xs text-muted-foreground">{option.label}</span>)}</div>}{question.required && <p className="mt-2 text-[11px] text-muted-foreground">Obligatoria</p>}</article>;
}

function Summary({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"><span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</span><div><p className="text-2xl font-semibold tabular-nums text-foreground">{value.toLocaleString("es-MX")}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}
