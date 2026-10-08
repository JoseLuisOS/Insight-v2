"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChartMapUpload({ organizationId, onUploaded }: { organizationId: string; onUploaded?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameProperty, setNameProperty] = useState("name");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    if (file.size > 4_000_000) { setError("El mapa debe medir hasta 4 MB."); return; }
    setBusy(true); setError("");
    const form = new FormData();
    form.set("organizationId", organizationId); form.set("name", name);
    form.set("nameProperty", nameProperty); form.set("file", file);
    try {
      const response = await fetch("/api/charts/maps", { method: "POST", body: form });
      const body = await response.json().catch(() => ({ error: "El servidor rechazó el mapa. Comprueba que mida hasta 4 MB." }));
      if (!response.ok) throw new Error(body.error || "No se pudo cargar el mapa.");
      setName(""); setFile(null);
      if (onUploaded) onUploaded(); else router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el mapa."); }
    finally { setBusy(false); }
  };
  return <details className="mt-6 rounded-xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Cargar mapa GeoJSON</summary>
    <form onSubmit={upload} className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-xs">Nombre<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
      <label className="text-xs">Propiedad de región<input required maxLength={120} value={nameProperty} onChange={(event) => setNameProperty(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
      <label className="text-xs">Archivo .geojson (hasta 4 MB)<input required type="file" accept=".geojson,application/geo+json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 w-full text-sm" /></label>
      {error && <p role="alert" className="text-sm text-danger sm:col-span-3">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 sm:col-span-3">{busy ? "Cargando…" : "Añadir mapa"}</button>
    </form>
  </details>;
}
