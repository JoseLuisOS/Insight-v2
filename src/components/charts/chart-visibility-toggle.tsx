"use client";

import { useState, useTransition } from "react";
import { Lock, Users } from "lucide-react";
import { CubeLoader } from "@/components/cube-loader";
import type { ChartVisibility } from "@/lib/chart-snapshot";
import { setChartVisibility } from "@/app/(app)/charts/gallery-actions";

const OPTIONS: { value: ChartVisibility; label: string; Icon: typeof Lock }[] = [
  { value: "private", label: "Privada", Icon: Lock },
  { value: "organization", label: "Organización", Icon: Users },
];

export function ChartVisibilityToggle({ chartId, initial, onChange }: { chartId?: string; initial: ChartVisibility; onChange?: (value: ChartVisibility) => void }) {
  const [value, setValue] = useState<ChartVisibility>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const choose = (next: ChartVisibility) => {
    if (next === value || saving) return;
    const previous = value;
    setValue(next);
    setError(null);
    onChange?.(next);
    if (!chartId) return;
    startSaving(async () => {
      const result = await setChartVisibility(chartId, next);
      if ("error" in result) { setValue(previous); onChange?.(previous); setError(result.error); }
    });
  };
  return <div className="flex flex-wrap items-center gap-2">
    <div role="radiogroup" aria-label="Visibilidad de la gráfica" title="Las gráficas de Organización aparecen en la galería de tu equipo; solo tú puedes editarlas."
      className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs">
      {OPTIONS.map(({ value: option, label, Icon }) => <button key={option} type="button" role="radio" aria-checked={value === option}
        disabled={saving} onClick={() => choose(option)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          value === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"} ${saving ? "" : "cursor-pointer"}`}>
        <Icon className="size-3.5" aria-hidden="true" />{label}</button>)}
    </div>
    {saving && <CubeLoader size={12} />}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </div>;
}
