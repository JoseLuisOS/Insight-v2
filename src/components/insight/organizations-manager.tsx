"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, Check, Globe2, Pencil, Plus, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { catalogCodeFromName } from "@/lib/catalog-code";
import { threeLetterCode } from "@/lib/survey-codes";
import type { InsightOrganization } from "@/lib/insight-organizations";

const statusLabel: Record<InsightOrganization["status"], string> = {
  active: "Activa", inactive: "Inactiva", suspended: "Suspendida", archived: "Archivada",
};
const statusStyle: Record<InsightOrganization["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-500 ring-slate-500/20",
  suspended: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  archived: "bg-muted text-muted-foreground ring-border",
};
const timezones = ["America/Hermosillo", "America/Mexico_City", "America/Tijuana", "America/Monterrey", "UTC"];
const field = "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10";

export function OrganizationsManager({ initialOrganizations }: { initialOrganizations: InsightOrganization[] }) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [editing, setEditing] = useState<InsightOrganization | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const visible = organizations.filter((org) => `${org.name} ${org.slug}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  const active = organizations.filter((org) => org.status === "active").length;

  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <section className="relative overflow-hidden rounded-[28px] bg-[#10233c] text-white shadow-[0_22px_70px_-35px_rgba(16,35,60,0.8)]">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 82% 18%, rgba(91,149,225,.36), transparent 38%), linear-gradient(120deg, rgba(8,18,33,.15), transparent)" }} />
      <div className="relative flex flex-wrap items-end justify-between gap-5 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-blue-100"><Building2 size={13} /> Insight · Control de plataforma</p><h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Organizaciones</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">Gestiona las organizaciones de esta instalación y prepara sus roles antes de incorporar usuarios.</p></div>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#10233c] shadow-lg shadow-black/10 transition hover:bg-blue-50"><Plus size={16} />Nueva organización<ArrowUpRight size={15} className="opacity-60" /></button>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-3">
      <Summary icon={<Building2 size={19} />} value={organizations.length} label="Organizaciones" />
      <Summary icon={<ShieldCheck size={19} />} value={active} label="Activas" />
      <Summary icon={<UsersRound size={19} />} value={organizations.reduce((sum, item) => sum + item.member_count, 0)} label="Miembros activos" />
    </div>

    {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"><span>{error}</span><button type="button" aria-label="Cerrar error" onClick={() => setError("")}><X size={16} /></button></div>}
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="insight-card-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="text-base font-semibold">Directorio</h2><p className="mt-0.5 text-xs text-muted-foreground">Identidad, estado y acceso por organización</p></div><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar organización" aria-label="Buscar organización" className="w-56 rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/60" /></label></header>
      <div className="divide-y divide-border">
        {visible.map((org) => <article key={org.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-muted/30 sm:flex-nowrap"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Building2 size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{org.name}</h3><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${statusStyle[org.status]}`}>{statusLabel[org.status]}</span></div><p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{org.slug}</p></div><div className="flex items-center gap-5 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5" title="Miembros activos"><UsersRound size={14} />{org.member_count}</span><span className="inline-flex items-center gap-1.5" title="Roles"><ShieldCheck size={14} />{org.role_count}</span><span className="hidden items-center gap-1.5 md:inline-flex"><Globe2 size={14} />{org.timezone}</span></div><button type="button" onClick={() => setEditing(org)} aria-label={`Editar ${org.name}`} className="grid size-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"><Pencil size={15} /></button></article>)}
        {!visible.length && <p className="px-5 py-12 text-center text-sm text-muted-foreground">{organizations.length ? "No hay organizaciones que coincidan." : "Aún no hay organizaciones. Crea la primera para comenzar."}</p>}
      </div>
    </section>

    {editing && <OrganizationDialog key={editing === "new" ? "new" : editing.id} organization={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(row) => { setOrganizations((current) => [row, ...current.filter((item) => item.id !== row.id)]); setEditing(null); setError(""); router.refresh(); }} />}
  </div>;
}

function Summary({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"><span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</span><div><p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}

function OrganizationDialog({ organization, onClose, onSaved }: { organization: InsightOrganization | null; onClose: () => void; onSaved: (row: InsightOrganization) => void }) {
  const [name, setName] = useState(organization?.name ?? "");
  const [codePrefix, setCodePrefix] = useState(organization?.code_prefix ?? "");
  const [prefixEdited, setPrefixEdited] = useState(false);
  const [timezone, setTimezone] = useState(organization?.timezone ?? "America/Hermosillo");
  const [status, setStatus] = useState<InsightOrganization["status"]>(organization?.status ?? "active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slug = organization?.slug ?? catalogCodeFromName(name).replace(/_/g, "-");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/insight/organizations", { method: organization ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(organization ? { id: organization.id, status } : { code_prefix: codePrefix }), name, timezone }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la organización.");
      onSaved(result as InsightOrganization);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error de conexión."); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#071321]/70 p-4 backdrop-blur-[3px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="organization-title" className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
      <header className="insight-card-header flex items-center justify-between border-b border-border px-6 py-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 size={20} /></span><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-primary">Insight · Organizaciones</p><h2 id="organization-title" className="text-lg font-semibold">{organization ? "Editar organización" : "Nueva organización"}</h2></div></div><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-primary"><X size={17} /></button></header>
      <form onSubmit={submit} className="space-y-5 p-6">
        {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-foreground">Nombre<input className={field} value={name} onChange={(event) => { const value = event.target.value; setName(value); if (!organization && !prefixEdited) setCodePrefix(value.trim() ? threeLetterCode(value) : ""); }} minLength={2} maxLength={100} required placeholder="Nombre de la organización" /></label><label className="text-xs font-semibold text-foreground">ID <span className="font-normal text-muted-foreground">· {organization ? "permanente" : "automático"}</span><output className={`${field} flex min-h-10 items-center font-mono font-normal`} aria-live="polite">{slug || "Escribe un nombre"}</output></label></div>
        <label className="block text-xs font-semibold text-foreground">Prefijo de códigos <span className="font-normal text-muted-foreground">· {organization ? "permanente" : "sugerido, editable"}</span>{organization ? <output className={`${field} flex min-h-10 items-center font-mono font-normal`}>{codePrefix}</output> : <input className={`${field} font-mono uppercase`} value={codePrefix} onChange={(event) => { setCodePrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)); setPrefixEdited(true); }} minLength={3} maxLength={3} pattern="[A-Z0-9]{3}" required aria-describedby="organization-prefix-help" />}</label>
        {!organization && <p id="organization-prefix-help" className="text-xs text-muted-foreground">Se propone a partir del nombre. Puedes cambiarlo antes de crear la organización; se usará en los códigos de estudios e instrumentos.</p>}
        <label className="block text-xs font-semibold text-foreground">Zona horaria<select className={field} value={timezone} onChange={(event) => setTimezone(event.target.value)}>{!timezones.includes(timezone) && <option value={timezone}>{timezone}</option>}{timezones.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {organization && <label className="block text-xs font-semibold text-foreground">Estado<select className={field} value={status} onChange={(event) => setStatus(event.target.value as InsightOrganization["status"])}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1.5 block font-normal leading-5 text-muted-foreground">Solo las organizaciones activas aparecen en Usuarios. Archivar conserva sus datos y membresías.</span></label>}
        {!organization && <p className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground">Se crearán cinco roles base. La organización quedará sin miembros hasta que agregues usuarios desde Administración.</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-5"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">Cancelar</button><button type="submit" disabled={busy || slug.length < 2 || !/^[A-Z0-9]{3}$/.test(codePrefix)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"><Check size={16} />{busy ? "Guardando…" : organization ? "Guardar cambios" : "Crear organización"}</button></div>
      </form>
    </div>
  </div>;
}
