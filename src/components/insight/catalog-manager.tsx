"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Boxes, Check, ChevronRight, CircleDashed, Layers3, Pencil, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { NAV_ICONS, NavIcon } from "@/components/navigation/nav-icon";
import { iconNames as LUCIDE_ICON_NAMES } from "lucide-react/dynamic";
import { StateGauge } from "@/components/insight/state-gauge";
import type { CatalogGroup, CatalogModule, State } from "@/lib/insight-catalog";
import { catalogCodeFromName, normalizeLucideIconName } from "@/lib/catalog-code";

const STATES: State[] = ["apagado", "desarrollo", "disponible"];
const ICON_NAMES = Object.keys(NAV_ICONS).sort();
const VALID_LUCIDE_ICON_NAMES = new Set<string>(LUCIDE_ICON_NAMES);
const STATE_DETAILS: Record<State, { label: string; hint: string; dot: string; badge: string }> = {
  apagado: { label: "Apagado", hint: "Nadie puede acceder", dot: "bg-slate-400", badge: "bg-slate-500/10 text-slate-500 ring-slate-500/20" },
  desarrollo: { label: "Desarrollo", hint: "Solo sysadmin", dot: "bg-amber-400", badge: "bg-amber-500/10 text-amber-600 ring-amber-500/20" },
  disponible: { label: "Disponible", hint: "Todos los usuarios con acceso", dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" },
};
const fieldClass = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/10";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const iconButton = "inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100";

type Editing = { kind: "group" | "module"; row?: CatalogGroup | CatalogModule };

function StateBadge({ state }: { state: State }) {
  const detail = STATE_DETAILS[state];
  return <span role="img" aria-label={`Estado: ${detail.label}`} title={detail.label} className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${detail.badge}`}>
    <span className={`size-2 rounded-full ${detail.dot}`} />
  </span>;
}

function IconTile({ icon, selected = false }: { icon: string | null; selected?: boolean }) {
  return <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border ${selected ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}>
    <NavIcon name={icon ?? undefined} className="size-5" />
  </span>;
}

export function CatalogManager({ initialGroups, initialModules }: { initialGroups: CatalogGroup[]; initialModules: CatalogModule[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [modules, setModules] = useState(initialModules);
  const [selectedCode, setSelectedCode] = useState(initialGroups[0]?.code ?? "");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = groups.find((group) => group.code === selectedCode) ?? groups[0];
  const groupModules = selected ? modules.filter((row) => row.group_code === selected.code) : [];
  const availableCount = modules.filter((row) => row.state === "disponible").length;
  const inProgressCount = modules.filter((row) => row.state === "desarrollo").length;

  async function patchState(kind: "group" | "module", code: string, state: State) {
    setBusy(code); setError(null);
    const previousGroups = groups, previousModules = modules;
    if (kind === "group") setGroups((rows) => rows.map((row) => row.code === code ? { ...row, state } : row));
    else setModules((rows) => rows.map((row) => row.code === code ? { ...row, state } : row));
    try {
      const endpoint = kind === "group" ? "groups" : "modules";
      const response = await fetch(`/api/insight/${endpoint}/${code}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "No se pudo cambiar el estado.");
      router.refresh();
    } catch (reason) {
      setGroups(previousGroups); setModules(previousModules);
      setError(reason instanceof Error ? reason.message : "Error de conexión.");
    } finally { setBusy(null); }
  }

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <section className="relative overflow-hidden rounded-[28px] bg-[#10233c] text-white shadow-[0_22px_70px_-35px_rgba(16,35,60,0.8)]">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 82% 18%, rgba(91,149,225,.36), transparent 38%), linear-gradient(120deg, rgba(8,18,33,.15), transparent)" }} />
      <div className="pointer-events-none absolute -right-10 -top-20 size-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-24 -top-6 size-72 rounded-full border border-white/10" />
      <div className="relative grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10 lg:py-10">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-blue-100"><Sparkles size={13} /> Insight · Control de plataforma</div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Arquitectura de grupos y módulos</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/80">Organiza los grupos de la aplicación, sus módulos y su disponibilidad en la plataforma.</p>
          <div className="mt-5 flex items-center gap-2 text-xs text-blue-100/75"><ShieldCheck size={15} className="text-blue-200" /> Acceso exclusivo de sysadmin · Este panel siempre está disponible</div>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#10233c] shadow-lg shadow-black/10 transition hover:bg-blue-50" onClick={() => setEditing({ kind: "group" })}><Plus size={17} /> Nuevo grupo <ArrowUpRight size={15} className="opacity-60" /></button>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard icon={<Boxes size={18} />} value={groups.length} label="Grupos" note="Áreas de la aplicación" />
      <StatCard icon={<Layers3 size={18} />} value={modules.length} label="Módulos" note={`${availableCount} disponibles`} />
      <StatCard icon={<Sparkles size={18} />} value={inProgressCount} label="En preparación" note="Solo sysadmin" />
    </div>

    {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">{error}</div>}

    <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.95fr)_minmax(0,1.6fr)]">
      <section className="rounded-[24px] border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="insight-card-header mb-4 flex items-center justify-between border-b px-3 py-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[.17em] text-primary">01 · Estructura</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Grupos</h2></div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{groups.length}</span>
        </div>
        <div className="space-y-2">
          {groups.map((group) => {
            const active = selected?.code === group.code;
            const count = modules.filter((row) => row.group_code === group.code).length;
            return <div key={group.code} className={`group rounded-2xl border p-3 transition ${active ? "border-primary/35 bg-primary/5 shadow-[0_8px_24px_-18px_rgba(67,119,188,.9)]" : "border-border/80 bg-background hover:border-primary/20 hover:bg-muted/40"}`}>
              <button className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 text-left" onClick={() => setSelectedCode(group.code)} aria-current={active ? "true" : undefined}>
                <IconTile icon={group.icon} selected={active} />
                <span className="min-w-0"><span className="flex items-center gap-1.5 font-semibold leading-5 text-foreground">{group.name}<ChevronRight size={15} className={`shrink-0 text-primary transition ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} /></span><span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">{group.code}</span></span>
                <span className="inline-flex min-w-9 flex-col items-center rounded-xl bg-muted px-2 py-1 text-center"><span className="text-sm font-semibold tabular-nums text-foreground">{count}</span><span className="text-[9px] leading-3 text-muted-foreground">mód.</span></span>
              </button>
              {(!group.active || !group.visible) && <p className="mt-2 text-xs font-medium text-amber-600">{!group.active ? "Inactivo" : "Oculto del menú"}</p>}
            </div>;
          })}
          {groups.length === 0 && <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Aún no hay grupos. Crea el primero para empezar.</p>}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
        {selected ? <>
          <div className="insight-card-header group border-b p-5 sm:p-6">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[.17em] text-primary">02 · Interior del grupo</p>
            <div className="grid grid-cols-[44px_minmax(0,1fr)_36px] items-start gap-x-4 gap-y-4 sm:grid-cols-[52px_minmax(0,1fr)_40px] sm:gap-x-5">
              <IconTile icon={selected.icon} selected />
              <div className="min-w-0"><h2 className="flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight">{selected.name}<StateBadge state={selected.state} /></h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{selected.description || "Administra sus módulos y su disponibilidad."}</p></div>
              <button className={`${iconButton} opacity-100 sm:opacity-0`} aria-label={`Editar grupo ${selected.name}`} onClick={() => setEditing({ kind: "group", row: selected })}><Pencil size={15} /></button>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4 sm:pl-[72px]">
              <p className="max-w-48 text-xs leading-5 text-muted-foreground">El estado controla el acceso y visualización a nivel plataforma.</p>
              <div className="ml-auto"><StateGauge value={selected.state} onChange={(state) => patchState("group", selected.code, state)} label={`Estado del grupo ${selected.name}`} disabled={busy === selected.code} /></div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold">Módulos</h3><p className="mt-0.5 text-xs text-muted-foreground">{groupModules.length} componentes en {selected.name}</p></div><button className={primaryButton} onClick={() => setEditing({ kind: "module" })}><Plus size={16} /> Nuevo módulo</button></div>
            <div className="grid gap-3 xl:grid-cols-2">
              {groupModules.map((module) => <div key={module.code} className="group flex min-h-44 flex-col justify-between rounded-2xl border border-border bg-background p-4 transition hover:border-primary/25 hover:shadow-[0_10px_30px_-20px_rgba(67,119,188,.65)]">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_36px] items-start gap-3"><IconTile icon={module.icon} /><div className="min-w-0"><p className="flex flex-wrap items-center gap-1.5 font-semibold leading-5">{module.name}<StateBadge state={module.state} /></p><p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{module.code}</p></div><button className={iconButton} aria-label={`Editar ${module.name}`} onClick={() => setEditing({ kind: "module", row: module })}><Pencil size={14} /></button></div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{module.description || STATE_DETAILS[module.state].hint}</p>
                <div className="mt-4 flex justify-end"><StateGauge value={module.state} onChange={(state) => patchState("module", module.code, state)} label={`Estado de ${module.name}`} disabled={busy === module.code} compact /></div>
                {(!module.active || !module.visible) && <p className="mt-2 text-xs font-medium text-amber-600">{!module.active ? "Inactivo" : "Oculto del menú"}</p>}
              </div>)}
            </div>
            {groupModules.length === 0 && <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center"><Layers3 className="mx-auto text-muted-foreground/60" size={24} /><p className="mt-3 text-sm font-medium">Este grupo aún está vacío</p><p className="mt-1 text-xs text-muted-foreground">Agrega un módulo para comenzar a organizarlo.</p></div>}
          </div>
        </> : <div className="p-12 text-center text-sm text-muted-foreground">Selecciona un módulo para ver sus componentes.</div>}
      </section>
    </div>

    <aside className="rounded-2xl border border-border bg-card px-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Estados de publicación</p><p className="mt-1 text-xs text-muted-foreground">El estado más restrictivo entre grupo y módulo define el acceso.</p></div><div className="flex flex-wrap gap-3">{STATES.map((state) => <span key={state} title={STATE_DETAILS[state].hint} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className={`size-1.5 rounded-full ${STATE_DETAILS[state].dot}`} />{STATE_DETAILS[state].label}</span>)}</div></div>
      <p className="border-t border-border py-3 text-xs text-muted-foreground">La asignación específica de módulos se resolverá mediante permisos de usuario en IAM.</p>
    </aside>

    {editing && <CatalogDialog key={`${editing.kind}-${editing.row?.code ?? selected?.code ?? "new"}`} editing={editing} groups={groups} selectedGroupCode={selected?.code ?? ""} onClose={() => setEditing(null)} onSaved={(code) => { if (editing.kind === "group") setSelectedCode(code); setEditing(null); router.refresh(); }} />}
  </div>;
}

function StatCard({ icon, value, label, note }: { icon: React.ReactNode; value: number; label: string; note: string }) {
  return <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</span><div className="min-w-0"><p className="text-2xl font-semibold leading-none tabular-nums">{value}</p><p className="mt-1 text-xs font-semibold">{label}<span className="ml-2 font-normal text-muted-foreground">{note}</span></p></div></div>;
}

function CatalogDialog({ editing, groups, selectedGroupCode, onClose, onSaved }: { editing: Editing; groups: CatalogGroup[]; selectedGroupCode: string; onClose: () => void; onSaved: (code: string) => void }) {
  const row = editing.row;
  const [groupCode, setGroupCode] = useState(row && "group_code" in row ? row.group_code : selectedGroupCode || groups[0]?.code || "");
  const [name, setName] = useState(row?.name ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [icon, setIcon] = useState(row?.icon ?? "");
  const existingCustomIcon = !!row?.icon && !NAV_ICONS[row.icon];
  const [otherIcon, setOtherIcon] = useState(existingCustomIcon ? row!.icon! : "");
  const [usingOtherIcon, setUsingOtherIcon] = useState<boolean>(existingCustomIcon);
  const [iconValidation, setIconValidation] = useState<"idle" | "valid" | "invalid">(existingCustomIcon ? "valid" : "idle");
  const [state, setState] = useState<State>(row?.state ?? "desarrollo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generatedCode = row?.code ?? catalogCodeFromName(name);

  function validateOtherIcon() {
    const candidate = otherIcon.trim();
    if (!candidate) { setIconValidation("invalid"); return; }
    const normalized = normalizeLucideIconName(candidate);
    if (VALID_LUCIDE_ICON_NAMES.has(normalized)) {
      setOtherIcon(normalized);
      setIcon(normalized);
      setIconValidation("valid");
    } else {
      setIcon("");
      setIconValidation("invalid");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const endpoint = editing.kind === "group" ? "groups" : "modules";
    const payload = { ...(editing.kind === "module" ? { group_code: groupCode } : {}), name,
      description: description || null, icon: icon || null, state };
    try {
      const response = await fetch(`/api/insight/${endpoint}${row ? `/${row.code}` : ""}`, {
        method: row ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      onSaved(result.code);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error de conexión."); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071321]/70 p-4 backdrop-blur-[3px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape" && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="catalog-title" className="max-h-[min(90dvh,820px)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-border bg-card shadow-[0_30px_90px_-20px_rgba(0,0,0,.45)]">
      <div className="insight-card-header flex items-center justify-between border-b px-6 py-5">
        <div className="flex items-center gap-3"><IconTile icon={icon || null} selected /><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-primary">Catálogo Insight</p><h2 id="catalog-title" className="mt-0.5 text-xl font-semibold">{row ? "Editar" : "Nuevo"} {editing.kind === "group" ? "grupo" : "módulo"}</h2></div></div>
        <button type="button" className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary" aria-label="Cerrar" title="Cerrar" onClick={onClose} disabled={busy}><X size={17} /></button>
      </div>
      <form onSubmit={submit} className="space-y-5 px-6 py-5">
        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold">Nombre<input className={`${fieldClass} mt-1.5`} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={60} placeholder="Nombre visible" /></label>
          <label className="block text-xs font-semibold">ID <span className="font-normal text-muted-foreground">· {row ? "permanente" : "se genera desde el nombre"}</span><output className={`${fieldClass} mt-1.5 flex min-h-[42px] items-center font-mono`} aria-live="polite">{generatedCode || <span className="font-sans text-muted-foreground/70">Escribe un nombre</span>}</output></label>
        </div>
        {!row && generatedCode.length < 2 && name.length >= 2 && <p className="-mt-3 text-xs text-danger">El nombre no contiene caracteres que puedan formar un ID válido.</p>}
        {editing.kind === "module" && <label className="block text-xs font-semibold">Grupo<select className={`${fieldClass} mt-1.5`} value={groupCode} onChange={(event) => setGroupCode(event.target.value)}>{groups.map((group) => <option key={group.code} value={group.code}>{group.name}</option>)}</select></label>}

        <fieldset>
          <legend className="mb-2 text-xs font-semibold">Ícono</legend>
          <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-xl border border-border bg-background p-2 sm:grid-cols-9">
            {ICON_NAMES.map((iconName) => {
              const Icon = NAV_ICONS[iconName];
              const selected = icon === iconName && !usingOtherIcon;
              return <button key={iconName} type="button" aria-label={iconName} title={iconName} aria-pressed={selected} onClick={() => { setIcon(iconName); setUsingOtherIcon(false); setIconValidation("idle"); }} className={`grid size-10 place-items-center rounded-lg border transition ${selected ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"}`}><Icon size={18} strokeWidth={1.8} /></button>;
            })}
            <button type="button" aria-label="Otro ícono Lucide" title="Otro" aria-pressed={usingOtherIcon} onClick={() => { setUsingOtherIcon(true); setIconValidation(icon && !NAV_ICONS[icon] ? "valid" : "idle"); setOtherIcon(icon && !NAV_ICONS[icon] ? icon : ""); }} className={`flex size-10 flex-col items-center justify-center gap-0.5 rounded-lg border text-[9px] font-semibold transition ${usingOtherIcon ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"}`}><Plus size={17} />Otro</button>
            <button type="button" aria-label="Quitar ícono" title="Sin ícono" aria-pressed={!icon} onClick={() => { setIcon(""); setUsingOtherIcon(false); setIconValidation("idle"); }} className={`grid size-10 place-items-center rounded-lg border transition ${!icon ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"}`}><CircleDashed size={18} /></button>
          </div>
          {usingOtherIcon && <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <input className={fieldClass} value={otherIcon} onChange={(event) => { setOtherIcon(event.target.value); setIcon(""); setIconValidation("idle"); }} maxLength={60} placeholder="Nombre Lucide, por ejemplo CalendarDays" aria-label="Nombre del ícono Lucide" />
            <button type="button" onClick={validateOtherIcon} disabled={!otherIcon.trim()} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">Validar</button>
            {iconValidation === "valid" ? <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><Check size={15} />Válido</span> : iconValidation === "invalid" ? <span role="status" className="text-sm font-semibold text-red-600">No válido</span> : <span className="text-xs text-muted-foreground sm:text-center">Pendiente</span>}
          </div>}
        </fieldset>

        <label className="block text-xs font-semibold">Estado<select className={`${fieldClass} mt-1.5`} value={state} onChange={(event) => setState(event.target.value as State)}>{STATES.map((option) => <option key={option} value={option}>{STATE_DETAILS[option].label} — {STATE_DETAILS[option].hint}</option>)}</select></label>
        {/* <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-3" aria-label="Significado de cada estado">{STATES.map((option) => <div key={option} className="flex items-start gap-2 text-xs"><span className={`mt-1 size-2 shrink-0 rounded-full ${STATE_DETAILS[option].dot}`} /><span><strong className="block font-semibold text-foreground">{STATE_DETAILS[option].label}</strong><span className="text-muted-foreground">{STATE_DETAILS[option].hint}</span></span></div>)}</div> */}
        <label className="block text-xs font-semibold">Descripción<input className={`${fieldClass} mt-1.5`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder="¿Cuál es la funcionalidad de este componente?" /></label>
        <div className="flex justify-end gap-2 border-t border-border pt-5"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button><button className={primaryButton} disabled={busy || (!row && generatedCode.length < 2) || (editing.kind === "module" && !groupCode) || (usingOtherIcon && iconValidation !== "valid")}>{busy ? "Guardando…" : <><Check size={16} /> Guardar cambios</>}</button></div>
      </form>
    </div>
  </div>;
}
