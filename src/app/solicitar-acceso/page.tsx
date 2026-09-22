import Link from "next/link";
import { AuthBackdrop } from "@/components/auth-backdrop";

export default function SolicitarAccesoPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050b18] px-4 text-white">
      <AuthBackdrop />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <h1 className="mb-2 text-xl font-semibold text-white">Solicitar acceso</h1>
        <p className="mb-6 text-sm text-white/60">
          Esta función todavía no está disponible. Intersel Insight es una
          plataforma de acceso restringido — si necesitas una cuenta, pídesela
          directamente a tu administrador.
        </p>
        <Link href="/login" className="text-sm font-medium text-brand-300 hover:text-brand-200 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
