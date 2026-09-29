"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, ShieldCheck, X } from "lucide-react";
import { catalogCodeFromName } from "@/lib/catalog-code";
import type { InsightRole, RoleOrganization, RolePermission } from "@/lib/insight-roles";
import { RolePermissionWorkspace } from "@/components/insight/role-permission-workspace";

type Mode = "create" | "edit";
const field = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/10";

export function RoleFormModal({ mode, role, organizations, defaultOrganizationId, permissions, onClose, onSaved }: {
  mode: Mode;
  role: InsightRole | null;
  organizations: RoleOrganization[];
  defaultOrganizationId: string;
  permissions: RolePermission[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [organizationId, setOrganizationId] = useState(role?.organization_id ?? defaultOrganizationId);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role?.permission_ids ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const original = useMemo(() => new Set(role?.permission_ids ?? []), [role]);
  const code = catalogCodeFromName(name);
  const organizationName = organizations.find((organization) => organization.id === organizationId)?.name ?? "Organización";

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape" && !busy) onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/insight/roles", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(mode === "create" ? { organizationId } : { id: role?.id }), name, description, permissionIds: [...selected] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el rol.");
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el rol."); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
    <div className="relative flex max-h-[94dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <header className="insight-card-header flex shrink-0 items-start gap-3 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">{mode === "create" ? <Plus size={19} /> : <Pencil size={19} />}</span>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Administración · Roles</p><h2 id="role-modal-title" className="mt-0.5 text-lg font-semibold">{mode === "create" ? "Nuevo rol" : `Editar rol · ${role?.name}`}</h2><p className="mt-0.5 text-xs text-muted-foreground">{mode === "create" ? "Define la identidad y los accesos del nuevo rol." : `Actualiza nombre, descripción y permisos en ${organizationName}.`}</p></div>
        <button type="button" aria-label="Cerrar" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button>
      </header>
      <form id="role-form" onSubmit={save} className="min-h-0 overflow-y-auto p-4 sm:p-6">
        {error && <p role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-semibold text-primary">01 · Identidad</span><span>Organización, nombre y descripción</span><span className="mx-1 hidden text-border sm:inline">/</span><span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-semibold text-primary">02 · Accesos</span><span>Permisos por módulo</span></div>
        <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5" aria-labelledby="role-identity-heading">
          <div className="mb-4 flex items-start gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck size={16} /></span><div><h3 id="role-identity-heading" className="text-sm font-semibold text-foreground">Identidad del rol</h3><p className="text-[11px] text-muted-foreground">El código se genera automáticamente al crear el rol y permanece estable.</p></div></div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,.85fr)]">
            <label className="block text-xs font-semibold text-foreground">Organización{mode === "create" ? <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={`${field} mt-1.5`}><option value="">Selecciona una organización</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select> : <span className={`${field} mt-1.5 block truncate text-muted-foreground`}>{organizationName}</span>}</label>
            <label className="block text-xs font-semibold text-foreground">Nombre <span className="text-danger">*</span><input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className={`${field} mt-1.5`} placeholder="Ej. Analista de datos" /></label>
            <div><p className="text-xs font-semibold text-foreground">Código</p><div className="mt-1.5 flex min-h-10 items-center truncate rounded-xl border border-border bg-card px-3.5 font-mono text-xs text-primary" title={mode === "edit" ? role?.code : code}>{mode === "edit" ? role?.code : code || "Se genera del nombre"}</div></div>
          </div>
          <label className="mt-4 block text-xs font-semibold text-foreground">Descripción <span className="font-normal text-muted-foreground">(opcional)</span><textarea maxLength={240} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className={`${field} mt-1.5 resize-none`} placeholder="Explica el alcance de este rol en la organización" /><span className="mt-1 block text-right text-[10px] font-normal tabular-nums text-muted-foreground">{description.length}/240</span></label>
        </section>
        <section className="mt-5" aria-labelledby="role-access-heading"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">02 · Accesos</p><h3 id="role-access-heading" className="mt-0.5 text-sm font-semibold text-foreground">Permisos del rol</h3><p className="mt-0.5 text-xs text-muted-foreground">Selecciona grupos, módulos y acciones. «Operar» habilita el acceso base.</p></div><span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">{selected.size} seleccionados</span></div><RolePermissionWorkspace permissions={permissions} selected={selected} original={original} onChange={setSelected} /></section>
      </form>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/25 px-5 py-4 sm:px-6"><span className="hidden text-xs text-muted-foreground sm:block">Los cambios se guardan juntos.</span><div className="ml-auto flex gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">Cancelar</button><button type="submit" form="role-form" disabled={busy || name.trim().length < 2 || !organizationId} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"><Check size={15} />{busy ? "Guardando…" : mode === "create" ? "Crear rol" : "Guardar cambios"}</button></div></footer>
    </div>
  </div>;
}
