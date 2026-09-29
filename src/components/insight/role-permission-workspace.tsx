"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, KeyRound, Layers3, LockKeyhole, RotateCcw, Search } from "lucide-react";
import type { RolePermission } from "@/lib/insight-roles";

type Filter = "all" | "assigned" | "unassigned" | "changed";
const labels: Record<string, string> = { operar: "Acceso base", crear: "Crear", editar: "Editar", eliminar: "Eliminar", exportar: "Exportar" };

export function RolePermissionWorkspace({ permissions, selected, original, onChange }: {
  permissions: RolePermission[];
  selected: Set<string>;
  original: Set<string>;
  onChange: (value: Set<string>) => void;
}) {
  const [groupCode, setGroupCode] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = useMemo(() => {
    const map = new Map<string, { code: string; name: string; modules: Map<string, { code: string; name: string; permissions: RolePermission[] }> }>();
    for (const permission of permissions) {
      const group = map.get(permission.group_code) ?? { code: permission.group_code, name: permission.group_name, modules: new Map() };
      const module = group.modules.get(permission.module_code) ?? { code: permission.module_code, name: permission.module_name, permissions: [] };
      module.permissions.push(permission);
      group.modules.set(module.code, module);
      map.set(group.code, group);
    }
    return [...map.values()];
  }, [permissions]);
  const active = groups.find((group) => group.code === groupCode) ?? groups[0];
  const changed = permissions.filter((permission) => selected.has(permission.id) !== original.has(permission.id));
  const changedIds = new Set(changed.map((permission) => permission.id));
  const visibleModules = [...(active?.modules.values() ?? [])].map((module) => ({
    ...module,
    permissions: module.permissions.filter((permission) => {
      const text = `${permission.code} ${permission.action} ${permission.description ?? ""} ${module.name}`.toLocaleLowerCase("es");
      if (query.trim() && !text.includes(query.toLocaleLowerCase("es").trim())) return false;
      if (filter === "assigned") return selected.has(permission.id);
      if (filter === "unassigned") return !selected.has(permission.id);
      if (filter === "changed") return changedIds.has(permission.id);
      return true;
    }),
  })).filter((module) => module.permissions.length > 0);

  function toggle(permission: RolePermission) {
    const next = new Set(selected);
    if (next.has(permission.id)) {
      next.delete(permission.id);
      if (permission.action === "operar") for (const related of permissions) if (related.module_code === permission.module_code) next.delete(related.id);
    } else {
      next.add(permission.id);
      if (permission.action !== "operar") {
        const base = permissions.find((item) => item.module_code === permission.module_code && item.action === "operar");
        if (base) next.add(base.id);
      }
    }
    onChange(next);
  }
  function toggleModule(modulePermissions: RolePermission[]) {
    const next = new Set(selected);
    const allSelected = modulePermissions.every((permission) => selected.has(permission.id));
    for (const permission of modulePermissions) allSelected ? next.delete(permission.id) : next.add(permission.id);
    if (!allSelected) for (const permission of modulePermissions) if (permission.action !== "operar") {
      const base = permissions.find((item) => item.module_code === permission.module_code && item.action === "operar");
      if (base) next.add(base.id);
    }
    onChange(next);
  }
  function toggleExpanded(code: string) {
    setExpanded((current) => { const next = new Set(current); next.has(code) ? next.delete(code) : next.add(code); return next; });
  }

  return <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
    <div className="grid lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_210px]">
      <aside className="border-b border-border bg-muted/35 p-3 lg:border-b-0 lg:border-r">
        <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><span>Grupos</span><span>{groups.length}</span></div>
        <nav aria-label="Grupos de permisos" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {groups.map((group) => {
            const items = [...group.modules.values()].flatMap((module) => module.permissions);
            const count = items.filter((permission) => selected.has(permission.id)).length;
            const current = active?.code === group.code;
            return <button key={group.code} type="button" onClick={() => setGroupCode(group.code)} className={`flex min-w-max items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition lg:w-full ${current ? "border-primary/25 bg-primary/10 text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"}`}>
              <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${current ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}><Layers3 size={13} /></span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{group.name}</span><span className="text-[10px] tabular-nums">{count}/{items.length}</span>
            </button>;
          })}
        </nav>
      </aside>
      <section className="min-w-0">
        <div className="border-b border-border bg-card/90 p-3">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted-foreground focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar permisos, acciones o módulos…" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/55" /></label>
          <div className="mt-2 flex gap-1 overflow-x-auto" role="group" aria-label="Filtro de permisos">{([[
            "all", `Todos ${permissions.length}`], ["assigned", `Asignados ${selected.size}`], ["unassigned", "Sin asignar"], ["changed", `Modificados ${changed.length}`],
          ] as [Filter, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${filter === value ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</button>)}</div>
        </div>
        <div className="max-h-[39dvh] min-h-56 space-y-2 overflow-y-auto p-3 sm:max-h-[44dvh]">
          <div className="flex items-end justify-between gap-2 px-1 pb-1"><div><h4 className="text-sm font-semibold text-foreground">{active?.name ?? "Permisos"}</h4><p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona el acceso que necesita este rol.</p></div><span className="text-[10px] tabular-nums text-muted-foreground">{visibleModules.reduce((total, module) => total + module.permissions.length, 0)} resultados</span></div>
          {visibleModules.map((module) => { const count = module.permissions.filter((permission) => selected.has(permission.id)).length; const open = expanded.has(module.code); const all = count === module.permissions.length; return <article key={module.code} className="overflow-hidden rounded-xl border border-border bg-card/80">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
              <button type="button" onClick={() => toggleExpanded(module.code)} aria-label={`${open ? "Contraer" : "Expandir"} ${module.name}`} aria-expanded={open} className="grid size-7 place-items-center rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
              <div className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">{module.name}</p><p className="truncate text-[10px] text-muted-foreground">{module.code}</p></div>
              <span className="hidden rounded-full border border-border px-2 py-1 text-[10px] tabular-nums text-muted-foreground sm:inline">{count}/{module.permissions.length}</span>
              <button type="button" onClick={() => toggleModule(module.permissions)} className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10">{all ? "Desmarcar todo" : "Marcar todo"}</button>
            </div>
            {open && <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">{module.permissions.map((permission) => { const checked = selected.has(permission.id); const locked = permission.action === "operar" && module.permissions.some((item) => item.action !== "operar" && selected.has(item.id)); return <label key={permission.id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${checked ? "border-primary/30 bg-primary/[0.07]" : "border-border/70 bg-background/60 hover:border-primary/20"} ${permission.action === "operar" ? "sm:col-span-2" : ""}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(permission)} className="mt-0.5 size-4 shrink-0 accent-primary" />
              <span className="min-w-0"><span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-foreground">{labels[permission.action] ?? permission.action}{permission.action === "operar" && <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-teal)]">ACCESO BASE</span>}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-primary">{permission.code}</span><span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">{locked ? <><LockKeyhole size={10} className="mr-1 inline" />Requerido por otras acciones; al quitarlo se retiran esas acciones.</> : permission.description ?? "Acceso al módulo"}</span></span>
            </label>; })}</div>}
          </article>; })}
          {!visibleModules.length && <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">No hay permisos que coincidan.</div>}
        </div>
      </section>
      <aside className="hidden border-l border-border bg-muted/30 p-4 xl:block">
        <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Resumen</p><h4 className="mt-1 text-sm font-semibold text-foreground">Cambios del rol</h4></div><span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{changed.length}</span></div>
        <div className="mt-5 flex items-end justify-between border-b border-border pb-4"><span className="text-xs text-muted-foreground">Permisos asignados</span><strong className="text-2xl font-semibold tabular-nums text-foreground">{selected.size}</strong></div>
        <div className="mt-3 space-y-2">{changed.length ? changed.slice(0, 5).map((permission) => <div key={permission.id} className="flex gap-2 border-b border-border/60 pb-2"><span className={`grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold ${selected.has(permission.id) ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"}`}>{selected.has(permission.id) ? "+" : "−"}</span><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-foreground">{permission.module_name} · {labels[permission.action]}</p><p className="truncate font-mono text-[9px] text-muted-foreground">{permission.code}</p></div></div>) : <p className="text-xs leading-relaxed text-muted-foreground">Aquí verás los permisos añadidos o retirados antes de guardar.</p>}</div>
        {changed.length > 5 && <p className="mt-2 text-[10px] text-muted-foreground">+ {changed.length - 5} cambios más</p>}
        <button type="button" onClick={() => onChange(new Set(original))} disabled={!changed.length} className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-[10px] font-semibold text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-40"><RotateCcw size={12} />Restablecer cambios</button>
      </aside>
    </div>
    <div className="flex items-center gap-2 border-t border-border bg-primary/[0.03] px-4 py-2 text-[11px] text-primary"><Check size={13} />{changed.length} cambio{changed.length === 1 ? "" : "s"} pendiente{changed.length === 1 ? "" : "s"} en permisos</div>
  </div>;
}
