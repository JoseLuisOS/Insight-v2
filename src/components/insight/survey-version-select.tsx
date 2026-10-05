"use client";

import { useRouter } from "next/navigation";
import type { SurveyVersion } from "@/lib/insight-surveys";

export function SurveyVersionSelect({ surveyId, versions, selectedId }: {
  surveyId: string; versions: SurveyVersion[]; selectedId: string;
}) {
  const router = useRouter();
  return <label className="flex min-w-0 items-center gap-2 text-sm">
    <span className="shrink-0 text-muted-foreground">Versión</span>
    <select aria-label="Versión del cuestionario" value={selectedId} onChange={(event) => router.push(`/surveys/${surveyId}?version=${event.target.value}`)} className="min-w-0 cursor-pointer rounded-xl border border-border bg-card px-3 py-2 font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {versions.map((version) => <option key={version.id} value={version.id}>v{version.version}</option>)}
    </select>
  </label>;
}
