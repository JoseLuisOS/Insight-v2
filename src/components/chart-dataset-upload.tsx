"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChartDatasetUpload({ organizations }: { organizations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) { setError("Selecciona un archivo."); return; }
    if (file.size > 4_000_000) { setError("El archivo debe medir hasta 4 MB."); return; }
    setBusy(true); setError("");
    const form = new FormData();
    form.set("name", name);
    form.set("organizationId", organizationId);
    form.set("file", file);
    try {
      const response = await fetch("/api/charts/datasets", { method: "POST", body: form });
      const body = await response.json().catch(() => ({ error: "El servidor rechazó el archivo. Comprueba que mida hasta 4 MB." }));
      if (!response.ok) throw new Error(body.error || "No se pudo cargar el archivo.");
      router.push(`/charts/dataset/new?dataset=${body.datasetId}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el archivo."); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
    <h2 className="font-semibold">Cargar dataset plano</h2>
    <p className="text-xs text-muted-foreground">CSV, TSV o TXT con encabezados. Hasta 4 MB y 50,000 registros.</p>
    <div><label className="mb-1 block text-sm" htmlFor="dataset-name">Nombre</label><input id="dataset-name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
    <div><label className="mb-1 block text-sm" htmlFor="dataset-organization">Organización</label><select id="dataset-organization" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
      {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
    </select></div>
    <div><label className="mb-1 block text-sm" htmlFor="dataset-file">Archivo</label><input id="dataset-file" required type="file" accept=".csv,.tsv,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full text-sm" /></div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button type="submit" disabled={busy || !organizations.length} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Cargando…" : "Cargar y crear gráfica"}</button>
  </form>;
}
