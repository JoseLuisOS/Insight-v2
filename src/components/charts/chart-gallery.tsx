"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Copy, ExternalLink, LayoutGrid, List, Lock, MoreHorizontal, RefreshCw, Search, Share2, Trash2, Users, type LucideIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/navigation/confirm-dialog";
import { CubeLoader } from "@/components/cube-loader";
import { ChartThumbnail, CHART_TYPE_ICON } from "@/components/charts/chart-thumbnail";
import { CHART_TYPE_LABEL, type ChartSnapshot, type ChartVisibility, type GalleryChart } from "@/lib/chart-snapshot";
import { deleteChart, duplicateChart, refreshChartPreview, setChartVisibility } from "@/app/(app)/charts/gallery-actions";

type Scope = "all" | "mine" | "team";
type SourceFilter = "all" | "survey" | "dataset";
type Sort = "recent" | "name" | "type";
type View = "grid" | "list";
const VIEW_KEY = "insight.charts.view";

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
const fullDate = (iso: string) => new Date(iso).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });

function relativeTime(iso: string): string {
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  return formatter.format(0, "second");
}

type Actions = {
  share: (chart: GalleryChart) => void;
  duplicate: (chart: GalleryChart) => void;
  refresh: (chart: GalleryChart) => void;
  askDelete: (chart: GalleryChart) => void;
};

type MenuEntry = { key: string; label: string; Icon: LucideIcon; href?: string; onSelect?: () => void; danger?: boolean; separatorBefore?: boolean };

function ChartMenu({ chart, actions }: { chart: GalleryChart; actions: Actions }) {
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = position !== null;
  const close = useCallback((restoreFocus = true) => { setPosition(null); if (restoreFocus) button.current?.focus(); }, []);

  const entries: MenuEntry[] = [{ key: "open", label: "Abrir", Icon: ExternalLink, href: chart.href }];
  if (chart.canDuplicate) entries.push({ key: "duplicate", label: "Duplicar", Icon: Copy, onSelect: () => actions.duplicate(chart) });
  if (chart.owner) entries.push(
    { key: "share", label: chart.visibility === "organization" ? "Dejar de compartir" : "Compartir con la organización",
      Icon: chart.visibility === "organization" ? Lock : Share2, onSelect: () => actions.share(chart) },
    { key: "refresh", label: "Actualizar vista previa", Icon: RefreshCw, onSelect: () => actions.refresh(chart) },
    { key: "delete", label: "Eliminar", Icon: Trash2, danger: true, separatorBefore: true, onSelect: () => actions.askDelete(chart) },
  );

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) close(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const dismiss = () => close(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open, close]);

  const toggle = () => {
    if (open) { close(); return; }
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const right = window.innerWidth - rect.right;
    setPosition(rect.bottom + 260 > window.innerHeight ? { bottom: window.innerHeight - rect.top + 4, right } : { top: rect.bottom + 4, right });
  };

  const onMenuKey = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const itemClass = (danger?: boolean) => `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:outline-none ${danger ? "text-danger" : "text-foreground"}`;

  return <>
    <button ref={button} type="button" onClick={toggle} aria-label={`Acciones de ${chart.name}`} aria-haspopup="menu" aria-expanded={open}
      className="relative z-10 grid size-8 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:none)]:opacity-100 aria-expanded:opacity-100 cursor-pointer">
      <MoreHorizontal className="size-4" aria-hidden="true" /></button>
    {open && createPortal(
      <div ref={menu} role="menu" aria-label={`Acciones de ${chart.name}`} onKeyDown={onMenuKey}
        style={{ position: "fixed", top: position.top, bottom: position.bottom, right: position.right }}
        className="z-50 min-w-52 rounded-xl border border-border bg-card p-1 shadow-xl">
        {entries.map((entry) => <div key={entry.key}>
          {entry.separatorBefore && <div role="separator" className="my-1 h-px bg-border" />}
          {entry.href
            ? <Link href={entry.href} role="menuitem" className={itemClass(entry.danger)} onClick={() => close(false)}><entry.Icon className="size-4" aria-hidden="true" />{entry.label}</Link>
            : <button type="button" role="menuitem" className={itemClass(entry.danger)} onClick={() => { close(false); entry.onSelect?.(); }}>
              <entry.Icon className="size-4" aria-hidden="true" />{entry.label}</button>}
        </div>)}
      </div>, document.body)}
  </>;
}

function VisibilityMark({ visibility }: { visibility: ChartVisibility }) {
  const shared = visibility === "organization";
  const text = shared ? "Compartida con la organización" : "Privada";
  const Icon = shared ? Users : Lock;
  return <span title={text} className="inline-flex"><Icon className="size-3.5" aria-hidden="true" /><span className="sr-only">{text}</span></span>;
}

function SourceLine({ chart }: { chart: GalleryChart }) {
  const survey = chart.sourceKind === "survey";
  return <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className={`size-2 shrink-0 rounded-full ${survey ? "bg-accent-teal" : "bg-accent-violet"}`} aria-hidden="true" />
    <span className="truncate">{survey ? "Encuesta" : "Dataset"} · {chart.sourceName}</span></p>;
}

function ChartCard({ chart, actions, pending, busy, showOrganization }: {
  chart: GalleryChart; actions: Actions; pending: boolean; busy: boolean; showOrganization: boolean;
}) {
  const TypeIcon = CHART_TYPE_ICON[chart.type];
  return <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-within:ring-2 focus-within:ring-ring motion-reduce:transform-none">
    <div className="relative h-40 border-b border-border bg-muted/30 p-3 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px]">
      <ChartThumbnail snapshot={chart.snapshot} type={chart.type} height="100%" pending={pending} />
      <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
        <TypeIcon className="size-3" aria-hidden="true" />{CHART_TYPE_LABEL[chart.type]}</span>
      <span className="absolute right-2 top-2 z-10 rounded-md bg-card/90 p-1 text-muted-foreground backdrop-blur"><VisibilityMark visibility={chart.visibility} /></span>
      {busy && <div className="absolute inset-0 z-10 grid place-items-center bg-card/60"><CubeLoader size={18} /></div>}
    </div>
    <div className="relative p-4 pr-12">
      <h3 className="font-medium"><Link href={chart.href} title={chart.name} className="line-clamp-1 outline-none after:absolute after:inset-0 after:content-[''] ">{chart.name}</Link></h3>
      <SourceLine chart={chart} />
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary" aria-hidden="true">{initials(chart.authorName)}</span>
        <span className="truncate">{chart.owner ? "Tú" : chart.authorName}</span><span aria-hidden="true">·</span>
        <time dateTime={chart.updatedAt} title={fullDate(chart.updatedAt)} suppressHydrationWarning className="shrink-0">{relativeTime(chart.updatedAt)}</time>
      </div>
      {showOrganization && <p className="mt-1 truncate text-xs text-muted-foreground">{chart.organizationName}</p>}
      <div className="absolute right-2 top-3"><ChartMenu chart={chart} actions={actions} /></div>
    </div>
  </article>;
}

function ChartTable({ charts, actions, pendingIds, busyIds, showOrganization }: {
  charts: GalleryChart[]; actions: Actions; pendingIds: Set<string>; busyIds: Set<string>; showOrganization: boolean;
}) {
  const head = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground";
  return <div className="overflow-x-auto rounded-xl border border-border bg-card">
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/40"><tr>
        {["Vista", "Nombre", "Tipo", "Fuente", "Autor", "Visibilidad", "Actualizada"].map((label) => <th key={label} scope="col" className={head}>{label}</th>)}
        <th scope="col" className={head}><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>{charts.map((chart) => <tr key={chart.id} className="group border-b border-border last:border-0 hover:bg-muted/30">
        <td className="px-3 py-2"><div className="h-[52px] w-[88px] overflow-hidden rounded-md border border-border bg-muted/30 px-1">
          <ChartThumbnail snapshot={chart.snapshot} type={chart.type} height={52} pending={pendingIds.has(chart.id)} /></div></td>
        <td className="max-w-64 px-3 py-2 font-medium"><Link href={chart.href} title={chart.name} className="block truncate rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{chart.name}</Link>
          {showOrganization && <span className="block truncate text-xs font-normal text-muted-foreground">{chart.organizationName}</span>}</td>
        <td className="whitespace-nowrap px-3 py-2">{CHART_TYPE_LABEL[chart.type]}</td>
        <td className="max-w-56 px-3 py-2"><SourceLine chart={chart} /></td>
        <td className="whitespace-nowrap px-3 py-2">{chart.owner ? "Tú" : chart.authorName}</td>
        <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><VisibilityMark visibility={chart.visibility} />{chart.visibility === "organization" ? "Organización" : "Privada"}</span></td>
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground"><time dateTime={chart.updatedAt} title={fullDate(chart.updatedAt)} suppressHydrationWarning>{relativeTime(chart.updatedAt)}</time></td>
        <td className="px-3 py-2"><div className="flex items-center justify-end gap-1">{busyIds.has(chart.id) && <CubeLoader size={14} />}<ChartMenu chart={chart} actions={actions} /></div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

const selectClass = "rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ChartGallery({ charts }: { charts: GalleryChart[] }) {
  const router = useRouter();
  const [items, setItems] = useState<GalleryChart[]>(charts);
  // Tras revalidar en el servidor llegan props nuevas: sustituyen el estado local.
  const [received, setReceived] = useState(charts);
  if (received !== charts) { setReceived(charts); setItems(charts); }
  const [pendingIds, setPendingIds] = useState<Set<string>>(
    () => new Set(charts.filter((chart) => chart.owner && chart.snapshot === null).map((chart) => chart.id)));
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [type, setType] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<View>("grid");
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<GalleryChart | null>(null);
  const [deleting, setDeleting] = useState(false);
  const started = useRef(new Set<string>());

  useEffect(() => {
    try { const saved = window.localStorage.getItem(VIEW_KEY); if (saved === "grid" || saved === "list") queueMicrotask(() => setView(saved)); } catch { /* sin almacenamiento */ }
  }, []);
  const chooseView = (next: View) => {
    setView(next);
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* sin almacenamiento */ }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setFlag = (setter: typeof setBusyIds, id: string, on: boolean) =>
    setter((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; });
  const applySnapshot = (id: string, snapshot: ChartSnapshot) =>
    setItems((current) => current.map((chart) => chart.id === id ? { ...chart, snapshot } : chart));

  const generatePreview = useCallback(async (id: string, notify: boolean) => {
    setFlag(setPendingIds, id, true);
    try {
      const result = await refreshChartPreview(id);
      if ("error" in result) { if (notify) setToast(result.error); }
      else applySnapshot(id, result.snapshot);
    } catch { if (notify) setToast("No se pudo actualizar la vista previa."); }
    setFlag(setPendingIds, id, false);
  }, []);

  // Genera una sola vez las vistas previas faltantes de las gráficas propias, de dos en dos.
  useEffect(() => {
    const queue = charts.filter((chart) => chart.owner && chart.snapshot === null && !started.current.has(chart.id)).map((chart) => chart.id);
    queue.forEach((id) => started.current.add(id));
    const worker = async () => { for (let id = queue.shift(); id; id = queue.shift()) await generatePreview(id, false); };
    void Promise.all([worker(), worker()]);
  }, [charts, generatePreview]);

  const actions: Actions = {
    share: (chart) => {
      if (busyIds.has(chart.id)) return;
      const next: ChartVisibility = chart.visibility === "organization" ? "private" : "organization";
      const patch = (visibility: ChartVisibility) => setItems((current) => current.map((item) => item.id === chart.id ? { ...item, visibility } : item));
      patch(next);
      setFlag(setBusyIds, chart.id, true);
      void setChartVisibility(chart.id, next).then((result) => { if ("error" in result) { patch(chart.visibility); setToast(result.error); } })
        .catch(() => { patch(chart.visibility); setToast("No se pudo cambiar la visibilidad."); })
        .finally(() => setFlag(setBusyIds, chart.id, false));
    },
    duplicate: (chart) => {
      setFlag(setBusyIds, chart.id, true);
      void duplicateChart(chart.id).then((result) => {
        if ("error" in result) { setToast(result.error); setFlag(setBusyIds, chart.id, false); }
        else router.push(result.href);
      }).catch(() => { setToast("No se pudo duplicar la gráfica."); setFlag(setBusyIds, chart.id, false); });
    },
    refresh: (chart) => { void generatePreview(chart.id, true); },
    askDelete: setToDelete,
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const result = await deleteChart(toDelete.id);
      if ("error" in result) setToast(result.error);
      else setItems((current) => current.filter((chart) => chart.id !== toDelete.id));
    } catch { setToast("No se pudo eliminar la gráfica."); }
    setDeleting(false);
    setToDelete(null);
  };

  const counts = useMemo(() => ({ all: items.length, mine: items.filter((chart) => chart.owner).length, team: items.filter((chart) => !chart.owner).length }), [items]);
  const typesPresent = useMemo(() => [...new Set(items.map((chart) => chart.type))].sort((a, b) => CHART_TYPE_LABEL[a].localeCompare(CHART_TYPE_LABEL[b], "es")), [items]);
  const showOrganization = useMemo(() => new Set(items.map((chart) => chart.organizationId)).size > 1, [items]);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    const list = items.filter((chart) =>
      (scope === "all" || (scope === "mine") === chart.owner) &&
      (source === "all" || chart.sourceKind === source) &&
      (type === "all" || chart.type === type) &&
      (!needle || normalize(`${chart.name} ${chart.sourceName} ${chart.authorName}`).includes(needle)));
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "type") return CHART_TYPE_LABEL[a.type].localeCompare(CHART_TYPE_LABEL[b.type], "es") || a.name.localeCompare(b.name, "es");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [items, scope, source, type, query, sort]);

  const clearFilters = () => { setScope("all"); setQuery(""); setSource("all"); setType("all"); };
  const mine = visible.filter((chart) => chart.owner);
  const team = visible.filter((chart) => !chart.owner);

  const renderItems = (list: GalleryChart[]): ReactNode => view === "list"
    ? <ChartTable charts={list} actions={actions} pendingIds={pendingIds} busyIds={busyIds} showOrganization={showOrganization} />
    : <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {list.map((chart) => <ChartCard key={chart.id} chart={chart} actions={actions} pending={pendingIds.has(chart.id)} busy={busyIds.has(chart.id)} showOrganization={showOrganization} />)}</div>;
  const heading = (text: string, count: number) => <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{text} <span className="font-normal">({count})</span></h2>;

  const scopes: [Scope, string][] = [["all", "Todas"], ["mine", "Mías"], ["team", "Del equipo"]];
  const toggleClass = (active: boolean) => `grid size-8 place-items-center rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

  return <div>
    <div className="sticky top-0 z-20 -mx-1 mb-6 border-b border-border bg-background/85 px-1 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-sm" role="group" aria-label="Alcance">
          {scopes.map(([value, label]) => <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)}
            className={`rounded-md px-3 py-1.5 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${scope === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {label} <span className="text-xs font-normal text-muted-foreground">{counts[value]}</span></button>)}
        </div>
        <label className="relative min-w-52 flex-1 basis-64">
          <span className="sr-only">Buscar gráficas</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, fuente o autor"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <select aria-label="Fuente" value={source} onChange={(event) => setSource(event.target.value as SourceFilter)} className={selectClass}>
          <option value="all">Todas las fuentes</option><option value="survey">Encuestas</option><option value="dataset">Datasets</option></select>
        <select aria-label="Tipo" value={type} onChange={(event) => setType(event.target.value)} className={selectClass}>
          <option value="all">Todos los tipos</option>
          {typesPresent.map((value) => <option key={value} value={value}>{CHART_TYPE_LABEL[value]}</option>)}</select>
        <select aria-label="Orden" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={selectClass}>
          <option value="recent">Más recientes</option><option value="name">Nombre A–Z</option><option value="type">Tipo</option></select>
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5" role="group" aria-label="Vista">
          <button type="button" aria-pressed={view === "grid"} aria-label="Vista de cuadrícula" title="Cuadrícula" onClick={() => chooseView("grid")} className={toggleClass(view === "grid")}>
            <LayoutGrid className="size-4" aria-hidden="true" /></button>
          <button type="button" aria-pressed={view === "list"} aria-label="Vista de lista" title="Lista" onClick={() => chooseView("list")} className={toggleClass(view === "list")}>
            <List className="size-4" aria-hidden="true" /></button>
        </div>
      </div>
    </div>

    {visible.length === 0 ? <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">Ninguna gráfica coincide con los filtros.</p>
      <button type="button" onClick={clearFilters} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Limpiar filtros</button>
    </div> : scope === "all" ? <div className="space-y-8">
      {(mine.length > 0 || counts.mine === 0) && <section>{heading("Mis gráficas", mine.length)}
        {mine.length ? renderItems(mine) : team.length > 0 && counts.mine === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Aún no has creado gráficas. Usa «Nueva gráfica» para empezar.</div>}</section>}
      {team.length > 0 && <section>{heading("Compartidas por tu equipo", team.length)}{renderItems(team)}</section>}
    </div> : renderItems(visible)}

    <ConfirmDialog open={toDelete !== null} onClose={() => setToDelete(null)} onConfirm={() => void confirmDelete()} busy={deleting}
      title="Eliminar gráfica" confirmLabel="Eliminar" cancelLabel="Cancelar"
      description={`Se eliminará «${toDelete?.name ?? ""}» con sus publicaciones, anotaciones y su lugar en dashboards. Esta acción no se puede deshacer.`} />
    {toast && <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg">{toast}</div>}
  </div>;
}
