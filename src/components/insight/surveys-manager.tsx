"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, FileQuestion, RefreshCw, Search, Upload, UsersRound } from "lucide-react";
import type { SurveyOrganization, SurveySummary } from "@/lib/insight-surveys";
import type { SurveyImportProgress } from "@/lib/insight-survey-imports";

const importStatusLabels: Record<string, string> = {
  uploading: "Subiendo archivo", ready: "Por confirmar", queued: "En espera", processing: "Importando", failed: "Falló",
};

export function SurveysManager({ organizations, surveys, pendingImports, initialOrganizationId = "all" }: {
  organizations: SurveyOrganization[]; surveys: SurveySummary[]; pendingImports: SurveyImportProgress[]; initialOrganizationId?: string;
}) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [query, setQuery] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState("");
  const visible = useMemo(() => surveys.filter((survey) =>
    (organizationId === "all" || survey.organization_id === organizationId) &&
    `${survey.name} ${survey.code} ${survey.study_name}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")),
  ), [surveys, organizationId, query]);
  const visibleImports = useMemo(() => pendingImports.filter((job) =>
    (organizationId === "all" || job.organization_id === organizationId) &&
    `${job.instrument_name} ${job.instrument_code} ${job.study_name} ${job.study_code} ${job.source_filename}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")),
  ), [pendingImports, organizationId, query]);

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

  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <section className="relative overflow-hidden rounded-[28px] bg-[#10233c] px-6 py-8 text-white shadow-[0_22px_70px_-35px_rgba(16,35,60,0.8)] sm:px-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 83% 16%, rgba(61,194,204,.28), transparent 38%), linear-gradient(120deg, rgba(8,18,33,.2), transparent)" }} />
      <div className="relative max-w-2xl"><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-blue-100"><ClipboardList size={13} /> Encuestas · Instrumentos</p><h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Encuestas</h1><p className="mt-3 text-sm leading-6 text-blue-100/80">Explora los instrumentos y cuestionarios disponibles para tus organizaciones.</p><Link href="/surveys/imports" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#10233c] transition hover:bg-blue-100"><Upload size={16} /> Importar cuestionario</Link></div>
    </section>

    {pendingImports.length > 0 && <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="pending-imports-title">
      <header className="insight-card-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div><h2 id="pending-imports-title" className="text-base font-semibold">Cargas por completar</h2><p className="mt-1 text-xs text-muted-foreground">Sigue aquí las versiones enviadas que aún no terminan de procesarse.</p></div>
        <button type="button" onClick={() => router.refresh()} aria-label="Actualizar estado de las cargas" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"><RefreshCw size={15} /> Actualizar</button>
      </header>
      {retryError && <p role="alert" className="border-b border-border px-5 py-3 text-sm text-destructive">{retryError}</p>}
      <div className="divide-y divide-border">
        {visibleImports.map((job) => <article key={job.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Upload size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{job.instrument_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{job.organization_name} · {job.study_name} · versión {Number.parseInt(job.version, 10)}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{job.instrument_code} · {job.source_filename}</p>
            {job.error_message && <p className="mt-2 text-sm text-destructive">{job.error_message}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">{job.status === "queued" && !job.workflow_run_id ? "Pendiente de inicio" : importStatusLabels[job.status] ?? job.status}</span>
            {job.status === "queued" && !job.workflow_run_id
              ? <button type="button" disabled={retrying === job.id} onClick={() => retryImport(job.id)} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{retrying === job.id ? "Iniciando…" : "Reintentar inicio"}</button>
              : <Link href={`/surveys/imports#import-job-${job.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{job.status === "ready" ? "Continuar importación" : job.status === "failed" ? "Revisar error" : "Ver detalles"}<ArrowRight size={15} /></Link>}
          </div>
        </article>)}
        {!visibleImports.length && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No hay cargas por completar con estos filtros.</p>}
      </div>
    </section>}

    <div className="grid gap-3 sm:grid-cols-3">
      <Summary icon={<ClipboardList size={19} />} value={surveys.length} label="Instrumentos" />
      <Summary icon={<FileQuestion size={19} />} value={surveys.reduce((total, survey) => total + survey.question_count, 0)} label="Preguntas en versiones actuales" />
      <Summary icon={<UsersRound size={19} />} value={surveys.reduce((total, survey) => total + survey.observation_count, 0)} label="Registros en versiones actuales" />
    </div>

    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="insight-card-header flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-4">
        <div><h2 className="text-base font-semibold">Catálogo</h2><p className="mt-1 text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "instrumento" : "instrumentos"} visibles</p></div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {organizations.length > 1 && <label className="min-w-48 flex-1 sm:flex-none"><span className="sr-only">Organización</span><select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"><option value="all">Todas las organizaciones</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>}
          <label className="relative min-w-48 flex-1 sm:flex-none"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar encuesta" aria-label="Buscar encuesta" className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/60" /></label>
        </div>
      </header>
      <div className="divide-y divide-border">
        {visible.map((survey) => <Link key={survey.id} href={`/surveys/${survey.id}`} className="group flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none sm:flex-nowrap">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><ClipboardList size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold text-foreground group-hover:text-primary">{survey.name}</span><span className="mt-1 block text-xs text-muted-foreground">{survey.organization_name} · {survey.study_name}</span><span className="mt-1 block font-mono text-[11px] text-muted-foreground">{survey.code}</span></span>
          <span className="flex items-center gap-3 text-xs text-muted-foreground"><span>v{survey.version ?? "—"}</span><span>{survey.question_count} preguntas</span><span>{survey.observation_count} registros</span><ArrowRight size={16} className="text-primary" /></span>
        </Link>)}
        {!visible.length && <p className="px-5 py-12 text-center text-sm text-muted-foreground">{surveys.length ? "No hay encuestas que coincidan con la búsqueda." : "Aún no hay encuestas disponibles para tus organizaciones."}</p>}
      </div>
    </section>
  </div>;
}

function Summary({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"><span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</span><div><p className="text-2xl font-semibold tabular-nums text-foreground">{value.toLocaleString("es-MX")}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}
