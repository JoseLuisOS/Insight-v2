import { AuthBackdrop } from "@/components/auth-backdrop";
import { SubmitButton } from "@/components/submit-button";
import { changePassword } from "./actions";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050b18] px-4 text-white">
      <AuthBackdrop />

      <div className="relative z-10 w-full max-w-sm animate-[fade-in_0.6s_ease-out] rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Actualiza tu contraseña
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          Tu contraseña es temporal. Elige una nueva antes de continuar.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <form action={changePassword} className="mt-7 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
              Nueva contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
              className="auth-input px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-white/80">
              Confirmar contraseña
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="auth-input px-3 py-2.5 text-sm"
            />
          </div>
          <SubmitButton
            pendingLabel="Guardando..."
            className="w-full rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-3 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(67,119,188,0.28)] transition hover:shadow-[0_4px_18px_rgba(67,119,188,0.4)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-80"
          >
            Guardar contraseña
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
