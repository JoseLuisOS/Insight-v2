"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Check, Copy, Eye, KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { changeTeamMemberStatus, removeTeamMember, resetTeamMemberPassword } from "@/app/(app)/team/actions";
import { ClearFiltersButton, MultiCheckDropdown, SearchInput, useDelayedCollapse } from "@/components/insight/permission-filter-controls";
import { UserFormModal } from "@/components/insight/user-form-modal";
import type { ManagedUser } from "@/lib/insight-users";

type Org = { id: string; name: string };
type Role = { id: string; code: string; name: string };
type Modal = { mode: "create" | "edit"; user: ManagedUser | null };
const field = "w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10";
const statusLabel: Record<string, string> = { active: "Activo", suspended: "Suspendido", invited: "Invitado", revoked: "Revocado" };

function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("es") ?? "").join("") || "?"; }

export function UsersManager({ organization, organizations, roles, initialMembers, currentUserId, canCreate, canEdit, canRemove, canResetPassword, canViewAs }: {
  organization: Org;
  organizations: Org[];
  roles: Role[];
  initialMembers: ManagedUser[];
  currentUserId: string;
  canCreate: boolean;
  canEdit: boolean;
  canRemove: boolean;
  canResetPassword: boolean;
  canViewAs: boolean;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [modal, setModal] = useState<Modal | null>(null);
  const [created, setCreated] = useState<{ email: string; name: string; password?: string; existing: boolean } | null>(null);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Set<string>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const filtersCollapsed = useDelayedCollapse(searchOpen);
  const [sort, setSort] = useState<"name" | "email" | "roles" | "status">("name");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  useEffect(() => { setMembers(initialMembers); }, [initialMembers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter, sort, descending, perPage]);
  const matchingStatus = (member: ManagedUser) => !statusFilter.size || statusFilter.has(member.status);
  const matchingRole = (member: ManagedUser) => !roleFilter.size || member.role_ids.some((id) => roleFilter.has(id));
  const roleOptions = roles.filter((role) => members.some((member) => matchingStatus(member) && member.role_ids.includes(role.id)))
    .map((role) => ({ value: role.id, label: role.name }));
  const statusOptions = [...new Set(members.filter(matchingRole).map((member) => member.status))]
    .map((status) => ({ value: status, label: statusLabel[status] ?? status }));
  function toggleRole(id: string) {
    setRoleFilter((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleStatusFilter(status: string) {
    setStatusFilter((current) => { const next = new Set(current); next.has(status) ? next.delete(status) : next.add(status); return next; });
  }
  const filtered = useMemo(() => members.filter((member) => {
    const text = `${member.display_name ?? ""} ${member.email} ${member.roles.join(" ")}`.toLocaleLowerCase("es");
    return (!search.trim() || text.includes(search.toLocaleLowerCase("es").trim()))
      && matchingRole(member)
      && matchingStatus(member);
  }).sort((a, b) => {
    const aValue = sort === "name" ? a.display_name ?? "" : sort === "roles" ? a.roles.join(", ") : a[sort];
    const bValue = sort === "name" ? b.display_name ?? "" : sort === "roles" ? b.roles.join(", ") : b[sort];
    return String(aValue).localeCompare(String(bValue), "es") * (descending ? -1 : 1);
  }), [members, search, roleFilter, statusFilter, sort, descending, matchingRole, matchingStatus]);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);
  const activeCount = members.filter((member) => member.status === "active").length;
  const buttonIcon = "grid size-8 place-items-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35";
  function sortBy(key: typeof sort) { if (key === sort) setDescending(!descending); else { setSort(key); setDescending(false); } }
  function refresh() { router.refresh(); }
  async function viewAs(member: ManagedUser) {
    setBusy(`view-${member.user_id}`); setError("");
    try {
      const response = await fetch("/api/insight/view-as", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: member.user_id, organizationId: organization.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo activar Ver Como.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo activar Ver Como."); }
    finally { setBusy(""); }
  }
  async function toggleStatus(member: ManagedUser) {
    setBusy(member.user_id); setError("");
    try {
      const result = await changeTeamMemberStatus({ orgId: organization.id, userId: member.user_id, active: member.status !== "active" });
      if ("error" in result) throw new Error(result.error);
      setMembers((current) => current.map((item) => item.user_id === member.user_id ? { ...item, status: member.status === "active" ? "suspended" : "active" } : item));
      refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar el estado."); }
    finally { setBusy(""); }
  }
  async function remove() {
    if (!deleteTarget || deleteName !== (deleteTarget.display_name || deleteTarget.email)) return;
    setBusy("delete"); setError("");
    try {
      const result = await removeTeamMember({ orgId: organization.id, userId: deleteTarget.user_id });
      if ("error" in result) throw new Error(result.error);
      setMembers((current) => current.filter((member) => member.user_id !== deleteTarget.user_id));
      setDeleteTarget(null); setDeleteName(""); refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo quitar al usuario."); }
    finally { setBusy(""); }
  }
  async function reset() {
    if (!resetTarget) return;
    setBusy("reset"); setError("");
    try {
      const result = await resetTeamMemberPassword({ orgId: organization.id, userId: resetTarget.user_id });
      if ("error" in result) throw new Error(result.error);
      setResetPassword(result.password);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo restablecer la contraseña."); }
    finally { setBusy(""); }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setError("No se pudo copiar al portapapeles."); } }

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Administración · Accesos</p><h1 className="mt-1 text-2xl font-semibold text-foreground">Usuarios</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Tu equipo en un solo lugar. Administra sus roles y el acceso a {organization.name}.</p></div>{organizations.length > 1 && <label className="text-xs font-semibold text-muted-foreground">Organización<select value={organization.id} onChange={(event) => router.push(`/team?org=${event.target.value}`)} className={`${field} mt-1.5 min-w-52`}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</header>
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"><span>{error}</span><button type="button" aria-label="Cerrar error" onClick={() => setError("")}><X size={16} /></button></div>}
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-[var(--accent-soft)] opacity-60" /><div className="relative flex flex-wrap items-center justify-between gap-5 px-6 py-5"><div className="flex flex-wrap items-center gap-x-8 gap-y-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><UsersRound size={18} /></span><div><p className="text-xl font-semibold tabular-nums text-foreground">{members.length}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Usuarios</p></div></div><span className="hidden h-9 w-px bg-border sm:block" /><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-[var(--accent-violet)]/20 bg-[var(--accent-violet)]/10 text-[var(--accent-violet)]"><ShieldCheck size={18} /></span><div><p className="text-xl font-semibold tabular-nums text-foreground">{activeCount}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activos</p></div></div></div>{canCreate && <button type="button" onClick={() => setModal({ mode: "create", user: null })} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"><UserPlus size={16} />Nuevo usuario</button>}</div></section>
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><header className="insight-card-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><UsersRound size={17} /></span><div><h2 className="text-sm font-semibold">Equipo</h2><p className="text-[11px] text-muted-foreground">{activeCount} / {members.length} activos</p></div></div><div className="flex flex-wrap items-center justify-end gap-2"><MultiCheckDropdown label="Rol" icon={ShieldCheck} options={roleOptions} selected={roleFilter} onToggle={toggleRole} collapsed={filtersCollapsed} /><MultiCheckDropdown label="Estado" icon={Activity} options={statusOptions} selected={statusFilter} onToggle={toggleStatusFilter} collapsed={filtersCollapsed} /><SearchInput value={search} onChange={setSearch} isOpen={searchOpen} setIsOpen={setSearchOpen} placeholder="Buscar usuario..." />{(search.trim() || roleFilter.size > 0 || statusFilter.size > 0) && <ClearFiltersButton onClick={() => { setSearch(""); setRoleFilter(new Set()); setStatusFilter(new Set()); }} />}</div></header>
      <div className="max-h-[62vh] overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><tr>{[["Nombre","name"],["Correo","email"],["Roles","roles"],["Estado","status"]].map(([label, key]) => <th key={key} className="px-5 py-3"><button type="button" onClick={() => sortBy(key as typeof sort)} className="hover:text-primary">{label}{sort === key ? descending ? " ↓" : " ↑" : ""}</button></th>)}<th className="px-5 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-border">{visible.map((member) => { const self = member.user_id === currentUserId; const canToggle = canEdit && !self && ["active", "suspended"].includes(member.status); return <tr key={member.user_id} className="text-foreground transition hover:bg-muted/35"><td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--accent-violet)]/20 bg-[var(--accent-violet)]/10 text-xs font-bold text-[var(--accent-violet)]">{initials(member.display_name || member.email)}</span><div className="min-w-0"><p className="truncate font-semibold">{member.display_name || "Sin nombre"}</p>{self && <p className="text-[10px] text-muted-foreground">Tu cuenta</p>}</div></div></td><td className="px-5 py-3 text-muted-foreground">{member.email}</td><td className="px-5 py-3"><div className="flex max-w-64 flex-wrap gap-1">{member.roles.length ? member.roles.map((role) => <span key={role} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground"><ShieldCheck size={11} className="text-[var(--accent-violet)]" />{role}</span>) : <span className="text-xs text-muted-foreground">Sin rol</span>}</div></td><td className="px-5 py-3">{canToggle ? <button type="button" role="switch" aria-checked={member.status === "active"} aria-label={`${member.status === "active" ? "Suspender" : "Activar"} a ${member.display_name || member.email}`} disabled={busy === member.user_id} onClick={() => toggleStatus(member)} className="flex items-center gap-2.5 disabled:opacity-50"><span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${member.status === "active" ? "bg-gradient-to-r from-primary to-[var(--accent-violet)]" : "bg-muted"}`}><span className={`size-4 rounded-full bg-white shadow transition-transform ${member.status === "active" ? "translate-x-[24px]" : "translate-x-1"}`} /></span><span className={`text-xs font-semibold ${member.status === "active" ? "text-primary" : "text-muted-foreground"}`}>{statusLabel[member.status]}</span></button> : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><span className={`size-1.5 rounded-full ${member.status === "active" ? "bg-[var(--success)]" : "bg-muted-foreground"}`} />{statusLabel[member.status] ?? member.status}</span>}</td><td className="px-5 py-3 text-right"><div className="inline-flex gap-1.5">{canViewAs && !self && <button type="button" aria-label={`Ver como ${member.display_name || member.email}`} title={member.status === "active" ? "Ver Como" : "Requiere una membresía activa"} disabled={member.status !== "active" || busy === `view-${member.user_id}`} onClick={() => viewAs(member)} className={buttonIcon}><Eye size={15} /></button>}{canResetPassword && <button type="button" aria-label={`Restablecer contraseña de ${member.display_name || member.email}`} title="Restablecer contraseña" disabled={self} onClick={() => { setError(""); setResetTarget(member); setResetPassword(""); }} className={buttonIcon}><KeyRound size={15} /></button>}{canEdit && <button type="button" aria-label={`Editar ${member.display_name || member.email}`} title="Editar usuario" disabled={self} onClick={() => setModal({ mode: "edit", user: member })} className={buttonIcon}><Pencil size={15} /></button>}{canRemove && <button type="button" aria-label={`Quitar ${member.display_name || member.email}`} title="Quitar de la organización" disabled={self} onClick={() => { setError(""); setDeleteTarget(member); setDeleteName(""); }} className={`${buttonIcon} hover:border-danger/30 hover:bg-danger/10 hover:text-danger`}><Trash2 size={15} /></button>}</div></td></tr>; })}{!visible.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No hay usuarios que coincidan.</td></tr>}</tbody></table></div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground"><div className="flex items-center gap-3"><span>{filtered.length} resultados · página {Math.min(page, pages)} de {pages}</span><label className="flex items-center gap-1.5">Mostrar<select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label></div>{pages > 1 && <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Anterior</button><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Siguiente</button></div>}</footer>
    </section>
    {modal && <UserFormModal key={`${modal.mode}-${modal.user?.user_id ?? "new"}`} mode={modal.mode} user={modal.user} organization={organization} roles={roles} onClose={() => setModal(null)} onSaved={(result) => { setModal(null); if (result) setCreated(result); refresh(); }} />}
    {created && <div className="fixed inset-0 z-[75] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Usuario creado"><div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setCreated(null)} /><div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><header className="insight-card-header flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2 text-base font-semibold text-foreground"><Check size={18} className="text-[var(--success)]" />{created.existing ? "Usuario agregado" : "Usuario creado"}</div><button type="button" aria-label="Cerrar" onClick={() => setCreated(null)}><X size={17} /></button></header><div className="space-y-3 p-5 text-sm"><p className="text-muted-foreground">{created.name} ya puede acceder a {organization.name} con <strong className="text-foreground">{created.email}</strong>.</p>{created.password && <div className="rounded-xl border border-[var(--accent-teal)]/30 bg-[var(--accent-soft)] p-3"><p className="text-xs font-semibold text-foreground">Contraseña temporal · se muestra una sola vez</p><div className="mt-2 flex items-center justify-between gap-2"><code className="font-mono text-sm text-foreground">{created.password}</code><button type="button" onClick={() => copy(created.password!)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs text-primary"><Copy size={13} />{copied ? "Copiado" : "Copiar"}</button></div></div>}<div className="flex justify-end pt-2"><button type="button" onClick={() => setCreated(null)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Entendido</button></div></div></div></div>}
    {resetTarget && <div className="fixed inset-0 z-[75] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Restablecer contraseña"><div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => busy !== "reset" && setResetTarget(null)} /><div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><header className="insight-card-header flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-base font-semibold">{resetPassword ? "Contraseña restablecida" : "Restablecer contraseña"}</h2><button type="button" aria-label="Cerrar" onClick={() => setResetTarget(null)} disabled={busy === "reset"}><X size={17} /></button></header><div className="space-y-3 p-5 text-sm">{error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">{error}</p>}<p className="text-muted-foreground">{resetPassword ? "Entrega esta contraseña temporal por un canal seguro." : `Se cambiará la contraseña global de ${resetTarget.display_name || resetTarget.email}. Deberá cambiarla al entrar.`}</p>{resetPassword && <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3"><code className="font-mono text-foreground">{resetPassword}</code><button type="button" onClick={() => copy(resetPassword)} className="inline-flex items-center gap-1 text-xs text-primary"><Copy size={13} />{copied ? "Copiado" : "Copiar"}</button></div>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setResetTarget(null)} className="rounded-xl border border-border px-4 py-2">{resetPassword ? "Cerrar" : "Cancelar"}</button>{!resetPassword && <button type="button" disabled={busy === "reset"} onClick={reset} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">{busy === "reset" ? "Restableciendo…" : "Confirmar"}</button>}</div></div></div></div>}
    {deleteTarget && <div className="fixed inset-0 z-[75] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Quitar usuario"><div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => busy !== "delete" && setDeleteTarget(null)} /><div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><header className="insight-card-header flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-base font-semibold">Quitar usuario</h2><button type="button" aria-label="Cerrar" onClick={() => setDeleteTarget(null)} disabled={busy === "delete"}><X size={17} /></button></header><div className="space-y-3 p-5 text-sm">{error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">{error}</p>}<p className="text-muted-foreground">Se quitará a <strong className="text-foreground">{deleteTarget.display_name || deleteTarget.email}</strong> de {organization.name}. Su cuenta global y sus accesos a otras organizaciones permanecerán.</p><p className="text-xs text-muted-foreground">Escribe su nombre para confirmar:</p><input value={deleteName} onChange={(event) => setDeleteName(event.target.value)} placeholder={deleteTarget.display_name || deleteTarget.email} className={field} /><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-border px-4 py-2">Cancelar</button><button type="button" onClick={remove} disabled={busy === "delete" || deleteName !== (deleteTarget.display_name || deleteTarget.email)} className="rounded-xl bg-danger px-4 py-2 font-semibold text-white disabled:opacity-50">{busy === "delete" ? "Quitando…" : "Quitar usuario"}</button></div></div></div></div>}
  </div>;
}
