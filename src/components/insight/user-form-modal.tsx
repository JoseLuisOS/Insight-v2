"use client";

import { useEffect, useState } from "react";
import { Check, LockKeyhole, Mail, Pencil, ShieldCheck, UserPlus, X } from "lucide-react";
import { createUser, updateTeamMember } from "@/app/(app)/team/actions";
import type { ManagedUser } from "@/lib/insight-users";

type Role = { id: string; code: string; name: string };
type Org = { id: string; name: string };
const field = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/10";
function newPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  const bytes = crypto.getRandomValues(new Uint32Array(18));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

export function UserFormModal({ mode, user, organization, roles, onClose, onSaved }: {
  mode: "create" | "edit";
  user: ManagedUser | null;
  organization: Org;
  roles: Role[];
  onClose: () => void;
  onSaved: (result?: { email: string; name: string; password?: string; existing: boolean }) => void;
}) {
  const [name, setName] = useState(user?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [roleIds, setRoleIds] = useState<Set<string>>(() => new Set(user?.role_ids ?? []));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function key(event: KeyboardEvent) { if (event.key === "Escape" && !busy) onClose(); }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [busy, onClose]);
  useEffect(() => { if (mode === "create") setPassword(newPassword()); }, [mode]);
  function toggleRole(id: string) { setRoleIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (mode === "create") {
        const result = await createUser({ orgId: organization.id, email, displayName: name, roleIds: [...roleIds], password });
        if ("error" in result) throw new Error(result.error);
        onSaved({ email: email.trim().toLowerCase(), name: name.trim(), password: result.tempPassword, existing: result.existing });
      } else if (user) {
        const result = await updateTeamMember({ orgId: organization.id, userId: user.user_id, displayName: name, roleIds: [...roleIds] });
        if ("error" in result) throw new Error(result.error);
        onSaved();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el usuario."); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
    <div className="relative flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <header className="insight-card-header flex shrink-0 items-start gap-3 border-b border-border px-5 py-4 sm:px-6 sm:py-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">{mode === "create" ? <UserPlus size={19} /> : <Pencil size={19} />}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Administración · Usuarios</p><h2 id="user-modal-title" className="mt-0.5 text-lg font-semibold">{mode === "create" ? "Nuevo usuario" : `Editar usuario · ${user?.display_name ?? user?.email}`}</h2><p className="mt-0.5 text-xs text-muted-foreground">{mode === "create" ? "Alta segura con una contraseña temporal que se muestra una sola vez." : "Actualiza el nombre y los roles de esta membresía."}</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button></header>
      <form id="user-form" onSubmit={save} className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
        {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5"><div className="mb-4 flex items-start gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Mail size={16} /></span><div><h3 className="text-sm font-semibold text-foreground">Identidad</h3><p className="text-[11px] text-muted-foreground">La cuenta es global; la asignación de roles corresponde a {organization.name}.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-foreground">Nombre completo <span className="text-danger">*</span><input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={`${field} mt-1.5`} placeholder="Nombre y apellidos" /></label><label className="text-xs font-semibold text-foreground">Correo <span className="text-danger">*</span><input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} readOnly={mode === "edit"} className={`${field} mt-1.5 ${mode === "edit" ? "cursor-not-allowed bg-muted/50 text-muted-foreground" : ""}`} placeholder="correo@dominio.com" /></label></div>{mode === "edit" && <p className="mt-2 text-[11px] text-muted-foreground">El correo identifica la cuenta en toda la plataforma y no se cambia desde esta membresía.</p>}</section>
        <section><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Accesos</p><h3 className="mt-0.5 text-sm font-semibold text-foreground">Roles en {organization.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">Selecciona al menos un rol. Sus permisos se acumulan.</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{roleIds.size} seleccionados</span></div><div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-border bg-background p-3 sm:grid-cols-2">{roles.map((role) => { const checked = roleIds.has(role.id); return <label key={role.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${checked ? "border-primary/35 bg-primary/[0.07]" : "border-border bg-card hover:border-primary/20"}`}><input type="checkbox" checked={checked} onChange={() => toggleRole(role.id)} className="size-4 shrink-0 accent-primary" /><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck size={14} /></span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-foreground">{role.name}</span><span className="block truncate font-mono text-[10px] text-muted-foreground">{role.code}</span></span></label>; })}{!roles.length && <p className="p-3 text-sm text-muted-foreground">No hay roles disponibles para esta organización.</p>}</div></section>
        {mode === "create" && <section className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-teal)]"><LockKeyhole size={16} /></span><div className="min-w-0 flex-1"><label className="text-xs font-semibold text-foreground">Contraseña temporal<input required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className={`${field} mt-1.5 font-mono`} /></label><p className="mt-1.5 text-[11px] text-muted-foreground">Si el correo ya tiene cuenta, se añadirá a la organización y esta contraseña no se aplicará.</p></div></div></section>}
      </form>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/25 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">Cancelar</button><button type="submit" form="user-form" disabled={busy || name.trim().length < 2 || !roleIds.size || !roles.length} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"><Check size={15} />{busy ? "Guardando…" : mode === "create" ? "Crear usuario" : "Guardar cambios"}</button></footer>
    </div>
  </div>;
}
