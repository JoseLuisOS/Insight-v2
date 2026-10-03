import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getSurveyResponsePage } from "@/lib/insight-surveys";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[]; search?: string | string[]; record?: string | string[] }>;
};

export default async function SurveyResponsesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const page = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const search = Array.isArray(query.search) ? query.search[0] : query.search ?? "";
  const record = Array.isArray(query.record) ? query.record[0] : query.record;
  const data = await getSurveyResponsePage(id, page, search, record);
  const href = (nextPage: number, selected?: string) => {
    const params = new URLSearchParams();
    if (data.search) params.set("search", data.search);
    if (nextPage > 1) params.set("page", String(nextPage));
    if (selected) params.set("record", selected);
    const suffix = params.toString();
    return `/surveys/${id}/responses${suffix ? `?${suffix}` : ""}`;
  };
  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <Link href={`/surveys/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft size={16} /> Volver a {data.survey.name}</Link>
    <header className="rounded-[28px] bg-[#10233c] px-6 py-8 text-white shadow-[0_22px_70px_-35px_rgba(16,35,60,0.8)] sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-200">Encuestas · Versión {data.version?.version ?? "sin versión"}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Respuestas de {data.survey.name}</h1>
      <p className="mt-2 text-sm text-blue-100/80">{data.survey.observation_count.toLocaleString("es-MX")} registros en la versión actual</p>
    </header>
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="insight-card-header flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
        <div><h2 className="font-semibold">Registros</h2><p className="mt-1 text-sm text-muted-foreground">Busca un ID externo exacto o abre un registro para ver sus respuestas.</p></div>
        <form action={`/surveys/${id}/responses`} className="flex w-full gap-2 sm:w-auto">
          <label htmlFor="survey-record-search" className="sr-only">ID externo del registro</label>
          <input id="survey-record-search" name="search" defaultValue={data.search} maxLength={120} placeholder="ID externo" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-44" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Search size={15} /> Buscar</button>
        </form>
      </div>
      <div className="divide-y divide-border">
        {data.observations.map((item) => <Link key={item.id} href={href(data.page, item.id)} aria-current={data.selected?.id === item.id ? "page" : undefined} className={`flex items-center justify-between gap-3 px-5 py-4 text-sm transition hover:bg-muted/50 ${data.selected?.id === item.id ? "bg-primary/5" : ""}`}>
          <span className="min-w-0"><span className="block truncate font-semibold">{item.external_id ?? item.id}</span><span className="mt-1 block text-xs text-muted-foreground">{item.status} · {item.answer_count.toLocaleString("es-MX")} respuestas</span></span><ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>)}
        {!data.observations.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No se encontraron registros.</p>}
      </div>
      <nav aria-label="Páginas de registros" className="flex items-center justify-between border-t border-border px-5 py-4 text-sm">
        <span className="text-muted-foreground">Página {data.page} de {data.pageCount}</span>
        <div className="flex gap-2">
          {data.page > 1 && <Link href={href(data.page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted"><ChevronLeft size={15} /> Anterior</Link>}
          {data.page < data.pageCount && <Link href={href(data.page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Siguiente <ChevronRight size={15} /></Link>}
        </div>
      </nav>
    </section>
    {data.selected && <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-label={`Respuestas del registro ${data.selected.external_id ?? data.selected.id}`}>
      <div className="insight-card-header border-b border-border p-5"><h2 className="font-semibold">Registro {data.selected.external_id ?? data.selected.id}</h2><p className="mt-1 text-sm text-muted-foreground">{data.selected.answer_count.toLocaleString("es-MX")} respuestas · {data.selected.status}</p></div>
      <div className="divide-y divide-border">{data.answers.map((answer) => <article key={answer.variable_code} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6">
        <div><p className="font-mono text-[11px] text-primary">{answer.question_code} · {answer.variable_code}</p><h3 className="mt-1 text-sm font-medium leading-6">{answer.question_text}</h3></div>
        <div className="min-w-0 text-sm"><p className="break-words font-medium">{answer.is_missing ? "Sin respuesta" : answer.option_label ?? answer.value_text ?? answer.raw_value ?? "Sin valor"}</p>
          {answer.raw_value !== null && <p className="mt-1 break-words text-xs text-muted-foreground">Valor original: {answer.raw_value}</p>}
          {answer.is_missing && answer.missing_type && <p className="mt-1 text-xs text-muted-foreground">Motivo: {answer.missing_type}</p>}
          {answer.quality_status !== "valid" && <p className="mt-1 text-xs text-muted-foreground">Calidad: {answer.quality_status}</p>}
        </div>
      </article>)}{!data.answers.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Este registro no tiene respuestas.</p>}</div>
    </section>}
  </div>;
}
