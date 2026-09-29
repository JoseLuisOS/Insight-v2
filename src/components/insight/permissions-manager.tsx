"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Check, ChevronDown, KeyRound, Layers3, Pencil, Plus, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/navigation/confirm-dialog";
import { NavIcon } from "@/components/navigation/nav-icon";
import { ClearFiltersButton, MultiCheckDropdown, SearchInput, useDelayedCollapse, type FilterOption } from "@/components/insight/permission-filter-controls";
import type { CatalogGroup, CatalogModule } from "@/lib/insight-catalog";
import type { ManagedPermission } from "@/lib/insight-permissions";

const ACTIONS = ["crear", "editar", "eliminar", "exportar"] as const;
const field = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
type Props = { initialGroups: CatalogGroup[]; initialModules: CatalogModule[]; initialPermissions: ManagedPermission[] };

export function PermissionsManager({ initialGroups, initialModules, initialPermissions }: Props) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const filtersCollapsed = useDelayedCollapse(searchOpen);
  const [groupSelection, setGroupSelection] = useState<Set<string>>(() => new Set(initialPermissions.flatMap((permission) => {
    const module = initialModules.find((item) => item.code === permission.module_code);
    return module ? [module.group_code] : [];
  })));
  const [moduleSelection, setModuleSelection] = useState<Set<string>>(() => new Set(initialPermissions.map((permission) => permission.module_code)));
  const [actionSelection, setActionSelection] = useState<Set<string>>(() => new Set(initialPermissions.map((permission) => permission.action)));
  const [collapsed, setCollapsed] = useState<string[]>(() => initialGroups.map((group) => group.code));
  const [showForm, setShowForm] = useState(false);
  const [groupCode, setGroupCode] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const moduleOptions = initialModules.filter((module) => !groupCode || module.group_code === groupCode);
  const available = ACTIONS.filter((candidate) => !permissions.some((permission) => permission.module_code === moduleCode && permission.action === candidate));
  const groupOptions: FilterOption[] = useMemo(() => {
    const availableGroups = new Set(permissions.map((permission) => initialModules.find((item) => item.code === permission.module_code)?.group_code).filter((value): value is string => Boolean(value)));
    return initialGroups.filter((group) => availableGroups.has(group.code)).map((group) => ({ value: group.code, label: group.name }));
  }, [permissions, initialGroups, initialModules]);
  const availableModules = useMemo(() => initialModules.filter((module) => permissions.some((permission) => permission.module_code === module.code)
    && (!groupSelection.size || groupSelection.has(module.group_code))), [permissions, initialModules, groupSelection]);
  const moduleFilterOptions: FilterOption[] = availableModules.map((module) => ({ value: module.code, label: module.name }));
  const availableActions = useMemo(() => [...new Set(permissions.filter((permission) => {
    const module = initialModules.find((item) => item.code === permission.module_code);
    return (!groupSelection.size || Boolean(module && groupSelection.has(module.group_code)))
      && (!moduleSelection.size || moduleSelection.has(permission.module_code));
  }).map((permission) => permission.action))].sort(), [permissions, initialModules, groupSelection, moduleSelection]);
  const actionFilterOptions: FilterOption[] = availableActions.map((value) => ({ value, label: value.charAt(0).toLocaleUpperCase("es") + value.slice(1) }));

  function toggleGroup(value: string) {
    const next = new Set(groupSelection);
    if (next.has(value)) next.delete(value); else next.add(value);
    setGroupSelection(next);
    const nextModules = new Set(initialModules.filter((module) => permissions.some((permission) => permission.module_code === module.code)
      && (!next.size || next.has(module.group_code))).map((module) => module.code));
    setModuleSelection(nextModules);
    setActionSelection(new Set(permissions.filter((permission) => nextModules.has(permission.module_code)).map((permission) => permission.action)));
  }
  function toggleModule(value: string) {
    const next = new Set(moduleSelection);
    if (next.has(value)) next.delete(value); else next.add(value);
    setModuleSelection(next);
    setActionSelection(new Set(permissions.filter((permission) => (!next.size || next.has(permission.module_code))
      && (!groupSelection.size || groupSelection.has(initialModules.find((module) => module.code === permission.module_code)?.group_code ?? ""))).map((permission) => permission.action)));
  }
  function toggleAction(value: string) {
    setActionSelection((current) => { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next; });
  }
  const filtered = useMemo(() => permissions.filter((permission) => {
    const module = initialModules.find((item) => item.code === permission.module_code);
    const group = initialGroups.find((item) => item.code === module?.group_code);
    const query = search.toLocaleLowerCase("es").trim();
    return (!groupSelection.size || Boolean(module && groupSelection.has(module.group_code)))
      && (!moduleSelection.size || moduleSelection.has(permission.module_code))
      && (!actionSelection.size || actionSelection.has(permission.action))
      && (!query || [permission.code, permission.description, module?.name, group?.name].some((value) => value?.toLocaleLowerCase("es").includes(query)));
  }), [permissions, initialModules, initialGroups, groupSelection, moduleSelection, actionSelection, search]);
  const filtering = filtered.length !== permissions.length || Boolean(search.trim());

  async function mutate(method: "POST" | "PATCH" | "DELETE", data: Record<string, string | string[]>) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/insight/permissions", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el permiso.");
      const listResponse = await fetch("/api/insight/permissions", { cache: "no-store" });
      if (!listResponse.ok) throw new Error("No se pudo actualizar la lista de permisos.");
      setPermissions(await listResponse.json());
      setShowForm(false); setEditing(null); setDeleteTarget(null); setSelectedActions(new Set());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ocurrió un error."); }
    finally { setBusy(false); }
  }

  function reset() { setSearch(""); setGroupSelection(new Set(groupOptions.map((option) => option.value))); setModuleSelection(new Set(initialModules.filter((module) => permissions.some((permission) => permission.module_code === module.code)).map((module) => module.code))); setActionSelection(new Set(permissions.map((permission) => permission.action))); }
  function toggleCreate() {
    setShowForm((open) => !open);
    setError(""); setGroupCode(""); setModuleCode(""); setSelectedActions(new Set());
  }
  function toggleCreateAction(candidate: string) {
    setSelectedActions((current) => { const next = new Set(current); if (next.has(candidate)) next.delete(candidate); else next.add(candidate); return next; });
  }
  const total = permissions.length;

  return <div className="mx-auto max-w-6xl space-y-6 pb-12 text-foreground">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><KeyRound size={21} /></span>
        <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Insight · Administración</p><h1 className="text-xl font-semibold text-card-foreground">Permisos</h1><p className="text-sm text-muted-foreground">Acciones disponibles por grupo y módulo.</p></div>
      </div>
      <div className="flex items-center gap-4 text-center sm:gap-6">
        {[[KeyRound, "Permisos", total], [Layers3, "Grupos", initialGroups.length], [Boxes, "Módulos", initialModules.length]].map(([Icon, label, value]) => {
          const Glyph = Icon as typeof KeyRound;
          return <div key={String(label)} className="min-w-16"><Glyph className="mx-auto mb-1 text-primary" size={16} /><div className="text-lg font-semibold tabular-nums">{value as number}</div><div className="text-[11px] text-muted-foreground">{String(label)}</div></div>;
        })}
      </div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

    {showForm && <form onSubmit={(event) => { event.preventDefault(); void mutate("POST", { moduleCode, actions: [...selectedActions] }); }} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="insight-card-header flex items-center gap-3 border-b px-6 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-white/40 text-[var(--surface-header-foreground)]"><KeyRound size={17} /></span>
        <div className="flex-1"><h2 className="text-sm font-semibold">Nuevo permiso</h2><p className="text-xs text-muted-foreground">Elige el módulo y una o varias acciones que todavía no tenga asignadas.</p></div>
        <button type="button" onClick={toggleCreate} aria-label="Cerrar formulario" title="Cerrar" className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"><X size={17} /></button>
      </header>
      <div className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium">Grupo
            <select required className={field} value={groupCode} onChange={(event) => { setGroupCode(event.target.value); setModuleCode(""); setSelectedActions(new Set()); }}>
              <option value="">Selecciona un grupo</option>{initialGroups.map((group) => <option key={group.code} value={group.code}>{group.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium">Módulo
            <select required disabled={!groupCode} className={`${field} disabled:cursor-not-allowed disabled:opacity-50`} value={moduleCode} onChange={(event) => { setModuleCode(event.target.value); setSelectedActions(new Set()); }}>
              <option value="">{groupCode ? "Selecciona un módulo" : "Elige primero un grupo"}</option>{moduleOptions.map((module) => <option key={module.code} value={module.code}>{module.name}</option>)}
            </select>
          </label>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium">Acciones</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {moduleCode && available.map((candidate) => {
              const active = selectedActions.has(candidate);
              return <button key={candidate} type="button" aria-pressed={active} disabled={!moduleCode} onClick={() => toggleCreateAction(candidate)} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>{candidate}</button>;
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{moduleCode ? available.length ? "Puedes seleccionar más de una acción. Solo aparecen las que aún no tiene el módulo." : "Este módulo ya tiene todas las acciones adicionales." : "Elige un módulo para consultar sus acciones disponibles."}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">{selectedActions.size ? <>Se crearán {selectedActions.size} permisos: <span className="ml-1 inline-flex flex-wrap gap-1">{[...selectedActions].map((item) => <code key={item} className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-primary">{moduleCode}.{item}</code>)}</span></> : "Selecciona al menos una acción."}</p>
          <button type="submit" disabled={busy || !moduleCode || !selectedActions.size} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Creando…" : <><Check size={15} />Crear permisos</>}</button>
        </div>
      </div>
    </form>}

    <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm" aria-label="Filtros de permisos">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <MultiCheckDropdown label="Grupo" icon={Layers3} collapsed={filtersCollapsed} options={groupOptions} selected={groupSelection} onToggle={toggleGroup} />
        <MultiCheckDropdown label="Módulo" icon={Boxes} collapsed={filtersCollapsed} options={moduleFilterOptions} selected={moduleSelection} onToggle={toggleModule} />
        <MultiCheckDropdown label="Acción" icon={KeyRound} collapsed={filtersCollapsed} options={actionFilterOptions} selected={actionSelection} onToggle={toggleAction} />
        <ClearFiltersButton onClick={reset} />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SearchInput value={search} onChange={setSearch} isOpen={searchOpen} setIsOpen={setSearchOpen} />
        <button type="button" onClick={toggleCreate} aria-expanded={showForm} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110">{showForm ? <><X size={16} />Cancelar</> : <><Plus size={16} />Nuevo permiso</>}</button>
      </div>
    </section>

    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1"><div><h2 className="font-semibold">Catálogo de permisos</h2><p className="text-xs text-muted-foreground">{filtering ? `Encontrados ${filtered.length} de ${total} permisos` : `${total} permisos en total`}</p></div><div className="flex gap-1 rounded-xl border border-border bg-card p-1 text-xs"><button className="rounded-lg px-2.5 py-1.5 hover:bg-muted" onClick={() => setCollapsed([])}>Expandir todo</button><button className="rounded-lg px-2.5 py-1.5 hover:bg-muted" onClick={() => setCollapsed(initialGroups.map((group) => group.code))}>Colapsar todo</button></div></div>
      <div className="space-y-4">
        {initialGroups.map((group, index) => {
          const modules = initialModules.filter((module) => module.group_code === group.code && (!filtering || filtered.some((permission) => permission.module_code === module.code)));
          if (!modules.length) return null;
          const count = modules.reduce((sum, module) => sum + filtered.filter((permission) => permission.module_code === module.code).length, 0);
          const isCollapsed = collapsed.includes(group.code) && !filtering;
          return <article key={group.code} className="overflow-hidden rounded-[26px] border border-border bg-card shadow-sm transition-colors hover:border-primary/20">
            <button type="button" onClick={() => setCollapsed((codes) => codes.includes(group.code) ? codes.filter((code) => code !== group.code) : [...codes, group.code])} className="insight-card-header group flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:brightness-[.97] sm:px-6" aria-expanded={!isCollapsed}>
              <span className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-white/35 text-primary"><NavIcon name={group.icon ?? undefined} /></span>
                <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: "var(--surface-header-secondary)" }}>Grupo {String(index + 1).padStart(2, "0")}</span><strong className="mt-0.5 block truncate text-base font-semibold tracking-tight" style={{ color: "var(--surface-header-foreground)" }}>{group.name}</strong><span className="mt-0.5 block text-xs" style={{ color: "var(--surface-header-secondary)" }}>{modules.length} {modules.length === 1 ? "módulo" : "módulos"} en este grupo</span></span>
              </span>
              <span className="flex shrink-0 items-center gap-3"><span className="rounded-full border border-primary/15 bg-card px-3 py-1.5 text-xs font-semibold tabular-nums text-primary">{count} {count === 1 ? "permiso" : "permisos"}</span><span className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition group-hover:border-primary/25 group-hover:text-primary"><ChevronDown size={16} className={`transition-transform ${isCollapsed ? "" : "rotate-180"}`} /></span></span>
            </button>
            {!isCollapsed && <div className="space-y-4 border-t border-border bg-muted/20 p-3 sm:p-5">{modules.map((module) => {
              const rows = filtered.filter((permission) => permission.module_code === module.code);
              return <section key={module.code} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="insight-card-header flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><NavIcon name={module.icon ?? undefined} className="size-4" /></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-foreground">{module.name}</h3><p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{module.code}</p></div></div>
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">{rows.length} {rows.length === 1 ? "acción" : "acciones"}</span>
                </div>
                <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm">
                  <thead className="insight-card-header text-[10px] font-semibold uppercase tracking-[.13em]"><tr><th className="w-28 px-5 py-3 font-semibold">Acción</th><th className="w-56 px-5 py-3 font-semibold">ID del permiso</th><th className="px-5 py-3 font-semibold">Descripción</th><th className="w-32 px-5 py-3 text-right font-semibold">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-border/80">{rows.map((permission) => <tr key={permission.code} className={`group/row transition-colors hover:bg-primary/[0.025] ${editing === permission.code ? "bg-primary/[0.035]" : ""}`}>
                    <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${permission.action === "operar" ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>{permission.action === "operar" && <span className="size-1.5 rounded-full bg-primary" />}{permission.action}</span></td>
                    <td className="px-5 py-3.5"><code className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">{permission.code}</code></td>
                    <td className="px-5 py-3.5 text-xs leading-5 text-muted-foreground">{editing === permission.code ? <input autoFocus maxLength={240} aria-label={`Descripción de ${permission.code}`} className={field} value={description} onChange={(event) => setDescription(event.target.value)} /> : permission.description || "—"}</td>
                    <td className="px-5 py-3.5 text-right">{editing === permission.code ? <span className="flex justify-end gap-1.5"><button type="button" disabled={busy} onClick={() => mutate("PATCH", { code: permission.code, description })} aria-label={`Guardar ${permission.code}`} className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-50"><Check size={14} /></button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground transition hover:text-foreground">Cancelar</button></span> : <span className="flex justify-end gap-1.5"><button type="button" title="Editar descripción" aria-label={`Editar ${permission.code}`} onClick={() => { setEditing(permission.code); setDescription(permission.description || ""); }} className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"><Pencil size={13} /></button>{permission.action !== "operar" && <button type="button" title="Eliminar permiso" aria-label={`Eliminar ${permission.code}`} onClick={() => { setError(""); setDeleteTarget(permission); }} className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-danger/30 hover:text-danger"><Trash2 size={13} /></button>}</span>}</td>
                  </tr>)}</tbody>
                </table></div>
              </section>;
            })}</div>}
          </article>;
        })}
      </div>
      {filtered.length === 0 && <div className="rounded-[26px] border border-dashed border-border bg-card px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><KeyRound size={21} /></span><p className="mt-4 text-sm font-semibold text-foreground">Sin permisos para mostrar</p><p className="mt-1 text-xs text-muted-foreground">Prueba con otra búsqueda o limpia los filtros.</p></div>}
    </section>

    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && mutate("DELETE", { code: deleteTarget.code })} title="Eliminar permiso" description={`Se eliminará ${deleteTarget?.code ?? ""} y las asignaciones existentes a roles o usuarios.`} confirmLabel="Eliminar permiso" cancelLabel="Cancelar" busy={busy} />
  </div>;
}
