import { CubeLoader } from "@/components/cube-loader";

export default function SurveyLoading() {
  return <div className="flex min-h-[calc(100dvh-10rem)] w-full items-center justify-center lg:h-[calc(100dvh-8rem)] lg:min-h-0" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3 text-primary">
      <CubeLoader size={40} />
      <p className="text-sm text-muted-foreground">Cargando cuestionario…</p>
    </div>
  </div>;
}
