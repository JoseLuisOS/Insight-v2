import Image from "next/image";
import Link from "next/link";
import { AuthBackdrop } from "@/components/auth-backdrop";
import { SubmitButton } from "@/components/submit-button";
import { login } from "./actions";

const FEATURES = [
  "Dashboards en tiempo real",
  "Encuestas y datasets centralizados",
  "Acceso seguro por organización",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050b18] text-white">
      <AuthBackdrop />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-12 sm:px-10 lg:flex-row lg:items-center lg:justify-center lg:gap-20 lg:px-16 xl:gap-28">
        {/* Login — izquierda */}
        <div className="order-2 w-full max-w-sm animate-[fade-in_0.6s_ease-out] lg:order-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Iniciar sesión
            </h1>
            <p className="mt-1.5 text-sm text-white/60">
              Accede con tu cuenta de Intersel Insight.
            </p>

            {error && (
              <p className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <form action={login} className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/80">
                  Usuario
                </label>
                <div className="relative">
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                  >
                    <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M3.5 17c1.2-3.2 4-4.5 6.5-4.5s5.3 1.3 6.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    className="auth-input py-2.5 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
                  Contraseña
                </label>
                <div className="relative">
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                  >
                    <rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="auth-input py-2.5 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>
              <SubmitButton
                pendingLabel="Verificando..."
                className="w-full rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-3 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(67,119,188,0.28)] transition hover:shadow-[0_4px_18px_rgba(67,119,188,0.4)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-80"
              >
                Entrar
              </SubmitButton>
            </form>

            <p className="mt-7 text-sm text-white/50">
              ¿No tienes cuenta?{" "}
              <Link href="/solicitar-acceso" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
                Solicitar acceso
              </Link>
            </p>
          </div>
        </div>

        {/* Comercial — derecha */}
        <div className="order-1 max-w-lg lg:order-2">
          <div className="flex items-center gap-4">
            <Image
              src="/images/brand/logo-intersel.webp"
              alt="Intersel"
              width={208}
              height={132}
              preload
              className="h-14 w-auto"
            />
            <div className="h-8 w-px bg-white/20" />
            <span className="text-lg font-semibold tracking-[0.2em] text-white/90">
              INSIGHT
            </span>
          </div>
          <h2 className="mt-8 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Convierte datos en decisiones.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">
            Dashboards, encuestas y análisis en un solo lugar, para las
            organizaciones que trabajan con Intersel.
          </p>

          <ul className="mt-10 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-white/70">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
