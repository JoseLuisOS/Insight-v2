import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getProfileContext } from "@/lib/auth";

export default async function Home() {
  const { user, profile } = await getProfileContext();
  if (user) redirect(profile ? "/dashboard" : "/onboarding");

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Brand />
        <Link
          href="/login"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          Iniciar sesión
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Crea, visualiza y <span className="text-primary">publica</span> tus
          dashboards
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Plataforma multi-tenant para convertir tus datos en gráficas
          publication-ready y embeberlas donde quieras.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/login?mode=signup"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium transition hover:bg-muted"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Intersel · Intersel Insight
      </footer>
    </main>
  );
}
