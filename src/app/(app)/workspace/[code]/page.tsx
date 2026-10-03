import { notFound } from "next/navigation";
import { ArrowLeft, Hammer } from "lucide-react";
import Link from "next/link";
import { NavIcon } from "@/components/navigation/nav-icon";
import { requireCatalogAccess } from "@/lib/insight-catalog";
import { insightDb } from "@/lib/insight-db";
import { NAV } from "@/lib/nav";

export default async function ModuleWorkspace({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9_]{2,40}$/.test(code) || NAV.some((group) => group.items.some((item) => item.code === code))) notFound();
  const { rows } = await insightDb().query(`select m.name, m.description, m.icon, g.name as group_name
    from insight_core.app_modules m join insight_core.app_groups g on g.code = m.group_code
    where m.code = $1`, [code]);
  const catalogModule = rows[0] as { name: string; description: string | null; icon: string | null; group_name: string } | undefined;
  if (!catalogModule) notFound();
  await requireCatalogAccess(code);

  return <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
    <section className="w-full overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
      <div className="insight-card-header flex items-center gap-3 border-b border-border px-6 py-5">
        <span className="grid size-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><NavIcon name={catalogModule.icon ?? undefined} className="size-5" /></span>
        <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-primary">{catalogModule.group_name}</p><h1 className="text-xl font-semibold text-foreground">{catalogModule.name}</h1></div>
      </div>
      <div className="px-6 py-12 text-center sm:px-10 sm:py-16">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl border border-primary/20 bg-primary/10 text-primary"><Hammer size={28} strokeWidth={1.7} /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-primary">Próximamente</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">Este módulo se encuentra en construcción</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{catalogModule.description || "Estamos preparando este espacio para que puedas usarlo dentro de Insight."}</p>
        <Link href="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary"><ArrowLeft size={16} />Volver al inicio</Link>
      </div>
    </section>
  </div>;
}
