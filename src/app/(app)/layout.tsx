import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getProfileContext } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getProfileContext();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Inicio
            </Link>
            <Link
              href="/dashboards"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Dashboards
            </Link>
            <Link
              href="/datasets"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Datasets
            </Link>
            <Link
              href="/sources"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Fuentes
            </Link>
            <Link
              href="/charts"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Gráficas
            </Link>
            <Link
              href="/metrics"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Métricas
            </Link>
            <Link
              href="/sql"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              SQL Lab
            </Link>
            <Link
              href="/themes"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Temas
            </Link>
            <Link
              href="/maps"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Mapas
            </Link>
            <Link
              href="/team"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Equipo
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="font-medium text-card-foreground">
              {profile.tenants?.name ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {profile.display_name ?? user.email} · {profile.role}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
