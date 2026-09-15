import Link from "next/link";
import { Brand } from "@/components/brand";
import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; mode?: string }>;
}) {
  const { error, message, mode } = await searchParams;
  const isSignup = mode === "signup";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Brand className="text-lg" />
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-card-foreground">
          {isSignup ? "Crear cuenta" : "Iniciar sesión"}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {isSignup
            ? "Regístrate para crear tu organización"
            : "Accede a tu plataforma de dashboards"}
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {message === "check-email" && (
          <p className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Revisa tu correo para confirmar tu cuenta.
          </p>
        )}

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            formAction={isSignup ? signup : login}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {isSignup ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </Link>
            </>
          ) : (
            <>
              ¿No tienes cuenta?{" "}
              <Link
                href="/login?mode=signup"
                className="font-medium text-primary hover:underline"
              >
                Regístrate
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
