"use client";

import { useState, useTransition } from "react";
import { publishSurveyChart, revokeSurveyPublication } from "@/app/(app)/charts/survey/actions";
import { publishCoreDatasetChart } from "@/app/(app)/charts/dataset/actions";

export function SurveyChartPublication({ chartId, initial, source = "survey" }: {
  chartId: string;
  source?: "survey" | "dataset";
  initial: { id: string; token: string; publishedAt: string }[];
}) {
  const [publications, setPublications] = useState(initial);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const publish = () => start(async () => {
    setError("");
    const response = source === "survey" ? await publishSurveyChart(chartId) : await publishCoreDatasetChart(chartId);
    if ("error" in response) setError(response.error);
    else setPublications((current) => [{ id: response.id, token: response.token, publishedAt: new Date().toISOString() }, ...current]);
  });
  const revoke = (id: string) => start(async () => {
    setError("");
    const response = await revokeSurveyPublication(id);
    if ("error" in response) setError(response.error);
    else setPublications((current) => current.filter((item) => item.id !== id));
  });
  return <section className="mt-6 rounded-xl border border-border bg-card p-5">
    <h2 className="font-semibold">Publicación</h2>
    <p className="mt-1 text-sm text-muted-foreground">La gráfica solo es visible para ti. Al publicar se crea una copia agregada con un enlace público independiente.</p>
    <button type="button" disabled={busy} onClick={publish} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">Crear enlace público</button>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {!!publications.length && <ul className="mt-4 space-y-2">{publications.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
      <a className="min-w-0 flex-1 break-all text-primary hover:underline" href={`/p/charts/${item.token}`} target="_blank" rel="noreferrer">/p/charts/{item.token}</a>
      <button type="button" disabled={busy} onClick={() => revoke(item.id)} className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50">Revocar</button>
    </li>)}</ul>}
  </section>;
}
