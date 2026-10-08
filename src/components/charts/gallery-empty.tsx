import { NewChartButton } from "@/components/charts/new-chart-button";

const STEPS = [
  { title: "Elige la fuente", text: "Una encuesta o un dataset." },
  { title: "Diseña y analiza", text: "Tipos de gráfica, filtros y estilo." },
  { title: "Comparte", text: "Con tu organización, en dashboards o con enlace público." },
];

function FloatingCard({ className, children }: { className: string; children: React.ReactNode }) {
  return <svg viewBox="0 0 96 72" className={`h-20 w-28 motion-safe:animate-[gallery-float_5s_ease-in-out_infinite] motion-reduce:animate-none ${className}`} aria-hidden="true">
    <rect x="1" y="1" width="94" height="70" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />
    {children}
  </svg>;
}

function EmptyIllustration() {
  return <div className="mx-auto mb-8 flex items-end justify-center gap-4" aria-hidden="true">
    <style>{"@keyframes gallery-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}"}</style>
    <FloatingCard className="text-primary [animation-delay:0s]">
      <rect x="16" y="38" width="12" height="22" rx="3" fill="currentColor" opacity=".45" />
      <rect x="34" y="24" width="12" height="36" rx="3" fill="currentColor" opacity=".7" />
      <rect x="52" y="14" width="12" height="46" rx="3" fill="currentColor" />
      <rect x="70" y="30" width="12" height="30" rx="3" fill="currentColor" opacity=".6" />
    </FloatingCard>
    <FloatingCard className="-mb-3 text-accent-teal [animation-delay:.8s]">
      <circle cx="48" cy="36" r="20" fill="none" stroke="currentColor" strokeWidth="10" opacity=".35" />
      <circle cx="48" cy="36" r="20" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray="78 126" transform="rotate(-90 48 36)" />
    </FloatingCard>
    <FloatingCard className="text-accent-violet [animation-delay:1.6s]">
      <path d="M14 52 L32 36 L48 44 L66 22 L82 28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 52 L32 36 L48 44 L66 22 L82 28 L82 60 L14 60 Z" fill="currentColor" opacity=".15" />
    </FloatingCard>
  </div>;
}

export function GalleryEmpty() {
  return <div className="rounded-3xl border border-border bg-card px-6 py-14 text-center">
    <EmptyIllustration />
    <h2 className="text-xl font-semibold">Tu galería de gráficas está lista</h2>
    <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
      Crea una visualización a partir de una encuesta o un dataset. Lo que compartas con tu organización aparecerá aquí para tu equipo, y lo que tu equipo comparta, también.</p>
    <div className="mt-6"><NewChartButton variant="hero" label="Crear mi primera gráfica" /></div>
    <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
      {STEPS.map((step, index) => <li key={step.title} className="rounded-xl border border-border bg-muted/30 p-4">
        <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
        <p className="mt-2 text-sm font-medium">{step.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{step.text}</p></li>)}
    </ol>
  </div>;
}
