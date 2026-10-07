"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDashboardV2Chart, removeDashboardV2Chart, publishDashboardV2, revokeDashboardV2Publication, renameDashboardV2, moveDashboardV2Chart } from "@/app/(app)/dashboards/v2/actions";

export function DashboardV2Controls({ dashboardId, initialName, available, items, initialPublications }: {
  dashboardId: string;
  initialName: string;
  available: { id: string; name: string; source_kind: string }[];
  items: { id: string; name: string }[];
  initialPublications: { id: string; token: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(available[0]?.id ?? "");
  const [name, setName] = useState(initialName);
  const [publications, setPublications] = useState(initialPublications);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const add = () => start(async () => {
    setError(""); const response = await addDashboardV2Chart(dashboardId, selected);
    if ("error" in response) setError(response.error); else router.refresh();
  });
  const remove = (id: string) => start(async () => {
    setError(""); const response = await removeDashboardV2Chart(dashboardId, id);
    if ("error" in response) setError(response.error); else router.refresh();
  });
  const rename = () => start(async () => {
    setError(""); const response = await renameDashboardV2(dashboardId, name);
    if ("error" in response) setError(response.error); else router.refresh();
  });
  const move = (id: string, direction: -1 | 1) => start(async () => {
    setError(""); const response = await moveDashboardV2Chart(dashboardId, id, direction);
    if ("error" in response) setError(response.error); else router.refresh();
  });
  const publish = () => start(async () => {
    setError(""); const response = await publishDashboardV2(dashboardId);
    if ("error" in response) setError(response.error);
    else setPublications((current) => [{ id: response.id, token: response.token }, ...current]);
  });
  const revoke = (id: string) => start(async () => {
    setError(""); const response = await revokeDashboardV2Publication(id);
    if ("error" in response) setError(response.error);
    else setPublications((current) => current.filter((item) => item.id !== id));
  });
  return <div className="mb-6 grid gap-4 lg:grid-cols-2">
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">Gráficas del dashboard</h2>
      <div className="mt-3 flex gap-2"><input aria-label="Nombre del dashboard" maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-2 text-sm" />
        <button type="button" disabled={busy || !name.trim()} onClick={rename} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">Renombrar</button></div>
      <div className="mt-3 flex gap-2"><select aria-label="Gráfica que se agregará" value={selected} onChange={(event) => setSelected(event.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-2 text-sm">
        {available.map((chart) => <option key={chart.id} value={chart.id}>{chart.name} · {chart.source_kind === "survey" ? "Encuesta" : "Dataset"}</option>)}
      </select><button type="button" disabled={busy || !selected} onClick={add} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">Añadir</button></div>
      <ul className="mt-3 space-y-1">{items.map((item, index) => <li key={item.id} className="flex items-center justify-between gap-2 text-sm"><span>{item.name}</span><div className="flex gap-2">
        <button type="button" aria-label={`Subir ${item.name}`} disabled={busy || index === 0} onClick={() => move(item.id, -1)} className="text-xs text-primary disabled:opacity-30">↑</button>
        <button type="button" aria-label={`Bajar ${item.name}`} disabled={busy || index === items.length - 1} onClick={() => move(item.id, 1)} className="text-xs text-primary disabled:opacity-30">↓</button>
        <button type="button" disabled={busy} onClick={() => remove(item.id)} className="text-xs text-danger hover:underline">Quitar</button>
      </div></li>)}</ul>
    </section>
    <section className="rounded-xl border border-border bg-card p-4"><h2 className="font-semibold">Publicar dashboard</h2>
      <p className="mt-1 text-xs text-muted-foreground">El enlace incluye una copia de las gráficas actuales. Los cambios posteriores requieren crear otra publicación.</p>
      <button type="button" disabled={busy || !items.length} onClick={publish} className="mt-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">Crear enlace público</button>
      <ul className="mt-3 space-y-2">{publications.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-2 text-xs"><a href={`/p/dashboards/${item.token}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-primary hover:underline">/p/dashboards/{item.token}</a><button type="button" disabled={busy} onClick={() => revoke(item.id)} className="text-danger hover:underline">Revocar</button></li>)}</ul>
    </section>
    {error && <p role="alert" className="text-sm text-danger lg:col-span-2">{error}</p>}
  </div>;
}
