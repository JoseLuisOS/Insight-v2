import { CubeLoader } from "@/components/cube-loader";

/**
 * Next.js shows this automatically while an (app)/* route segment is being
 * prepared (including first-visit compilation in dev) — instead of the
 * screen looking frozen after login, as reported.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-primary">
        <CubeLoader size={40} />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  );
}
