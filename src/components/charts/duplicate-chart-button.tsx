"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { CubeLoader } from "@/components/cube-loader";
import { duplicateChart } from "@/app/(app)/charts/gallery-actions";

export function DuplicateChartButton({ chartId }: { chartId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = () => start(async () => {
    setError("");
    const result = await duplicateChart(chartId);
    if ("error" in result) setError(result.error);
    else router.push(result.href);
  });
  return <div className="flex flex-col items-end gap-1">
    <button type="button" onClick={run} disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? <><CubeLoader size={14} /> Duplicando…</> : <><Copy size={14} aria-hidden="true" /> Duplicar en mis gráficas</>}
    </button>
    {error && <p role="alert" className="text-danger text-xs">{error}</p>}
  </div>;
}
