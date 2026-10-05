"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CubeLoader } from "@/components/cube-loader";
import type { SurveyTablePage } from "@/lib/insight-surveys";

const pageSizes = [25, 50, 75, 100, 200, 500];

function SortButton({ column, label, text = label, sortColumn, sortDirection, onSort }: { column: string; label: string; text?: string; sortColumn: string; sortDirection: "asc" | "desc"; onSort: (column: string) => void }) {
  const active = sortColumn === column;
  const Icon = active ? sortDirection === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
  return <button type="button" onClick={() => onSort(column)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-xs font-semibold text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Ordenar ${label}${active ? sortDirection === "asc" ? ": menor a mayor" : ": mayor a menor" : ""}`}>
    {text}<Icon size={14} aria-hidden="true" />
  </button>;
}

export function SurveyTableView({ surveyId, versionId, focus, onSelectQuestion }: { surveyId: string; versionId: string; focus: { recordId: string; variableId: string | null } | null; onSelectQuestion: (questionId: string) => void }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState("record");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [followFocus, setFollowFocus] = useState(Boolean(focus?.recordId));
  const requestKey = `${surveyId}:${versionId}:${page}:${pageSize}:${sortColumn}:${sortDirection}:${followFocus ? focus?.recordId ?? "" : ""}`;
  const [result, setResult] = useState<{ key: string; data: SurveyTablePage | null; error: string }>({ key: "", data: null, error: "" });
  const requestRef = useRef<AbortController | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusedRowRef = useRef<HTMLTableRowElement>(null);
  const focusedCellRef = useRef<HTMLTableCellElement>(null);
  const data = result.data;
  const loading = result.key !== requestKey;
  const error = result.key === requestKey ? result.error : "";

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const query = new URLSearchParams({ version: versionId, page: String(page), pageSize: String(pageSize), sort: sortColumn, direction: sortDirection });
    if (followFocus && focus?.recordId) query.set("record", focus.recordId);
    void fetch(`/api/surveys/${surveyId}/table?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudo cargar la tabla del cuestionario.");
        if (!controller.signal.aborted) setResult({ key: requestKey, data: body as SurveyTablePage, error: "" });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error: reason instanceof Error ? reason.message : "No se pudo cargar la tabla del cuestionario." });
      });
    return () => controller.abort();
  }, [focus?.recordId, followFocus, page, pageSize, requestKey, sortColumn, sortDirection, surveyId, versionId]);

  useLayoutEffect(() => {
    if (loading || !data || !focus?.recordId) return;
    const viewport = viewportRef.current;
    const target = focusedCellRef.current ?? focusedRowRef.current;
    if (!viewport || !target) return;
    const viewportBounds = viewport.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const frozenWidth = viewport.querySelector("thead th")?.getBoundingClientRect().width ?? 0;
    const headerHeight = viewport.querySelector("thead")?.getBoundingClientRect().height ?? 0;
    const horizontalInset = Math.max(12, (viewport.clientWidth - frozenWidth - targetBounds.width) / 2);
    const verticalInset = Math.max(8, (viewport.clientHeight - headerHeight - targetBounds.height) / 2);
    viewport.scrollTo({
      left: focusedCellRef.current ? viewport.scrollLeft + targetBounds.left - viewportBounds.left - frozenWidth - horizontalInset : viewport.scrollLeft,
      top: viewport.scrollTop + targetBounds.top - viewportBounds.top - headerHeight - verticalInset,
      behavior: "instant",
    });
    target.focus({ preventScroll: true });
  }, [data, focus?.recordId, focus?.variableId, loading]);

  function navigateToPage(nextPage: number) {
    setFollowFocus(false);
    setPage(nextPage);
  }

  function changePageSize(value: number) {
    setFollowFocus(false);
    setPage(1);
    setPageSize(value);
  }

  function changeSort(column: string) {
    setFollowFocus(false);
    setPage(1);
    if (sortColumn === column) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortColumn(column); setSortDirection("asc"); }
  }

  return <section aria-label="Tabla del cuestionario" aria-busy={loading} className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    {error && <p role="alert" className="m-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    <header className="insight-card-header shrink-0 border-b border-border px-4 py-3"><h2 className="text-sm font-semibold">Tabla de registros</h2></header>
    <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto">
      {data && <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
          <tr>
            <th aria-sort={sortColumn === "record" ? sortDirection === "asc" ? "ascending" : "descending" : "none"} className="sticky left-0 z-20 min-w-48 border-b border-r border-border bg-muted/95 px-3 py-2"><SortButton column="record" label="Registro" sortColumn={sortColumn} sortDirection={sortDirection} onSort={changeSort} /></th>
            <th aria-sort={sortColumn === "status" ? sortDirection === "asc" ? "ascending" : "descending" : "none"} className="min-w-28 border-b border-r border-border px-3 py-2"><SortButton column="status" label="Estado" sortColumn={sortColumn} sortDirection={sortDirection} onSort={changeSort} /></th>
            {data.columns.map((column) => <th key={column.id} title={column.question_text} aria-sort={sortColumn === column.id ? sortDirection === "asc" ? "ascending" : "descending" : "none"} className="min-w-56 max-w-72 border-b border-r border-border px-3 py-2 align-bottom last:border-r-0">
              <div className="flex h-full flex-col items-start">
              <SortButton column={column.id} label={`pregunta ${column.question_code}`} text="Ordenar" sortColumn={sortColumn} sortDirection={sortDirection} onSort={changeSort} />
              <Link href={`/surveys/${surveyId}?version=${versionId}&question=${column.question_id}`} onClick={(event) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; onSelectQuestion(column.question_id); }} className="block h-full cursor-pointer px-1 py-2 outline-none hover:bg-primary/10 hover:underline focus-visible:ring-2 focus-visible:ring-primary">
                <span className="block font-mono text-primary">{column.question_code}{column.code !== column.question_code ? ` · ${column.code}` : ""}</span>
                <span className="mt-1 block line-clamp-2 normal-case font-medium tracking-normal text-foreground">{column.question_text}</span>
              </Link>
              </div>
            </th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.rows.map((row) => <tr key={row.id} ref={row.id === focus?.recordId ? focusedRowRef : undefined} tabIndex={row.id === focus?.recordId && !focus?.variableId ? -1 : undefined} className={`group outline-none transition hover:bg-muted/35 ${row.id === focus?.recordId ? "bg-primary/5" : ""}`}>
            <td className={`sticky left-0 z-[5] border-b border-r border-border px-4 py-3 font-semibold transition group-hover:bg-muted ${row.id === focus?.recordId ? "bg-primary/10 text-primary" : "bg-card"}`}>{row.id === focus?.recordId && <span className="sr-only">Registro seleccionado: </span>}{row.external_id ?? row.id}</td>
            <td className="border-b border-r border-border px-4 py-3 text-muted-foreground">{row.status}</td>
            {data.columns.map((column) => {
              const selected = row.id === focus?.recordId && column.id === focus?.variableId;
              return <td key={column.id} ref={selected ? focusedCellRef : undefined} tabIndex={selected ? -1 : undefined} title={row.values[column.id]} className={`max-w-72 border-b border-r border-border px-4 py-3 outline-none last:border-r-0 ${selected ? "bg-primary/15 font-semibold text-primary ring-2 ring-inset ring-primary" : ""}`}>
                {selected && <span className="sr-only">Respuesta seleccionada: </span>}<span className="line-clamp-3 break-words">{row.values[column.id] ?? "—"}</span>
              </td>;
            })}
          </tr>)}
          {!data.rows.length && <tr><td colSpan={data.columns.length + 2} className="px-5 py-12 text-center text-muted-foreground">Esta versión no tiene registros.</td></tr>}
        </tbody>
      </table>}
    </div>
    <footer className="grid shrink-0 items-center gap-3 border-t border-border bg-card px-4 py-3 text-sm sm:grid-cols-[1fr_auto_1fr]">
      <p className="text-muted-foreground">{(data?.total ?? 0).toLocaleString("es-MX")} registros</p>
      <nav aria-label="Páginas de la tabla" className="flex items-center justify-center gap-2">
        <button type="button" aria-label="Página anterior" onClick={() => data && navigateToPage(Math.max(1, data.page - 1))} disabled={loading || !data || data.page <= 1} className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="min-w-20 text-center font-medium tabular-nums">{data?.page ?? page}/{data?.pageCount ?? 1}</span>
        <button type="button" aria-label="Página siguiente" onClick={() => data && navigateToPage(data.page + 1)} disabled={loading || !data || data.page >= data.pageCount} className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
      </nav>
      <label className="flex items-center gap-2 text-muted-foreground sm:justify-self-end">Mostrar
        <select aria-label="Registros por página" value={pageSize} onChange={(event) => changePageSize(Number(event.target.value))} disabled={loading} className="cursor-pointer rounded-lg border border-border bg-card px-2 py-1.5 font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed">
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        por página
      </label>
    </footer>
    {loading && <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-card/75 backdrop-blur-sm" role="status" aria-live="polite"><CubeLoader size={40} /><p className="text-sm text-muted-foreground">Cargando tabla…</p></div>}
  </section>;
}
