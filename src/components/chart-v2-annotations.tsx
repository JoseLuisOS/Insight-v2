"use client";

import { useState, useTransition } from "react";
import { addChartV2Annotation, deleteChartV2Annotation } from "@/app/(app)/charts/v2-actions";

export function ChartV2Annotations({ chartId, initial }: {
  chartId: string;
  initial: { id: string; body: string; created_at: string }[];
}) {
  const [annotations, setAnnotations] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const add = () => start(async () => {
    setError("");
    const response = await addChartV2Annotation(chartId, body);
    if ("error" in response) setError(response.error);
    else { setAnnotations((items) => [response.annotation, ...items]); setBody(""); }
  });
  const remove = (id: string) => start(async () => {
    setError("");
    const response = await deleteChartV2Annotation(id);
    if ("error" in response) setError(response.error);
    else setAnnotations((items) => items.filter((item) => item.id !== id));
  });
  return <section className="mt-6 rounded-xl border border-border bg-card p-5">
    <h2 className="font-semibold">Anotaciones</h2>
    <p className="mt-1 text-xs text-muted-foreground">Notas privadas de esta gráfica.</p>
    <label htmlFor="annotation-body" className="mt-4 block text-sm">Nueva anotación</label>
    <textarea id="annotation-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000}
      className="mt-1 min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" />
    <button type="button" disabled={busy || !body.trim()} onClick={add} className="mt-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">Añadir nota</button>
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    {!!annotations.length && <ul className="mt-4 space-y-2">{annotations.map((item) => <li key={item.id} className="rounded-md border border-border p-3 text-sm">
      <p className="whitespace-pre-wrap">{item.body}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{new Date(item.created_at).toLocaleString("es-MX")}</span><button type="button" disabled={busy} onClick={() => remove(item.id)} className="text-danger hover:underline">Eliminar</button></div>
    </li>)}</ul>}
  </section>;
}
