import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada · Intersel Insight",
};

export default function NotFound() {
  return <main className="flex min-h-[70vh] w-full items-center justify-center bg-background px-5 py-12 text-foreground">
    <div className="w-full max-w-2xl text-center">
      <div className="relative mx-auto max-w-[460px] rounded-[2rem] border border-border bg-card p-5 shadow-[0_24px_80px_-48px_var(--primary)] sm:p-8">
        <div className="absolute left-6 top-6 rounded-full border border-border bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground">ERROR 404</div>
        <svg viewBox="0 0 440 260" className="mx-auto mt-5 h-auto w-full" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="lost-point-line" x1="0" x2="1" y1="1" y2="0">
              <stop stopColor="var(--primary)" />
              <stop offset="1" stopColor="var(--accent-violet)" />
            </linearGradient>
          </defs>
          <path d="M54 28v186h332" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
          <path d="M54 168h332M54 122h332M54 76h332M118 28v186M182 28v186M246 28v186M310 28v186M374 28v186"
            fill="none" stroke="var(--border)" strokeDasharray="4 7" />
          <path d="M82 181c34-9 53-74 82-67s54 68 87 53 52-82 82-74" fill="none"
            stroke="url(#lost-point-line)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="82" cy="181" r="7" fill="var(--primary)" />
          <circle cx="164" cy="114" r="7" fill="var(--primary)" />
          <circle cx="251" cy="167" r="7" fill="var(--accent-teal)" />
          <circle cx="333" cy="93" r="7" fill="var(--accent-violet)" />
          <path d="M334 92c20-20 41-43 57-54" fill="none" stroke="var(--accent-violet)" strokeWidth="2" strokeDasharray="4 6" />
          <g className="motion-safe:animate-bounce">
            <circle cx="392" cy="38" r="15" fill="var(--accent-violet)" opacity=".15" />
            <circle cx="392" cy="38" r="8" fill="var(--accent-violet)" />
          </g>
          <path d="M293 218h110" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
          <text x="346" y="238" textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">fuera de la gráfica</text>
        </svg>
      </div>
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-primary">Punto fuera de rango</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Esta página se nos escapó de la gráfica.</h1>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">La dirección puede haber cambiado o el contenido ya no estar disponible. Volvamos a un punto conocido.</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Ir al inicio</Link>
        <Link href="/charts" className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Ver gráficas</Link>
      </div>
    </div>
  </main>;
}
