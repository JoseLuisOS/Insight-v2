"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addExternalSource, deleteExternalSource } from "@/app/(app)/sources/actions";

type Source = { id: string; name: string };

export function ExternalSources({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [conn, setConn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    start(async () => {
      const res = await addExternalSource(name, conn);
      if ("error" in res) setError(res.error);
      else {
        setName("");
        setConn("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-card-foreground">Conectar Postgres externo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La cadena de conexión se guarda cifrada (Vault) y nunca se expone. Usa un usuario de
          <strong> solo lectura</strong>. Formato:{" "}
          <code className="text-xs">postgresql://usuario:clave@host:5432/basedatos?sslmode=require</code>
        </p>
        {error && (
          <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <div className="mt-4 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (ej. ERP producción)"
            className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={conn}
            onChange={(e) => setConn(e.target.value)}
            type="password"
            placeholder="postgresql://…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          />
          <button
            onClick={add}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar fuente"}
          </button>
        </div>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay fuentes externas.</p>
      ) : (
        <div className="space-y-4">
          {sources.map((s) => (
            <SourceCard key={s.id} source={s} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceCard({ source, onChanged }: { source: Source; onChanged: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("select * from public.mi_tabla");
  const [datasetName, setDatasetName] = useState(source.name);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function importNow() {
    setStatus(null);
    start(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("import-external", {
        body: { data_source_id: source.id, query, dataset_name: datasetName },
      });
      if (error || data?.error) {
        setStatus(`Error: ${data?.error ?? error?.message ?? "falló la importación"}`);
        return;
      }
      router.push(`/datasets/${data.datasetId}`);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="font-medium text-card-foreground">{source.name}</div>
        <button
          onClick={() => start(async () => { await deleteExternalSource(source.id); onChanged(); })}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          Eliminar
        </button>
      </div>
      <div className="mt-3 space-y-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="Nombre del dataset"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={importNow}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Importando…" : "Importar como dataset"}
          </button>
        </div>
        {status && <p className="text-sm text-danger">{status}</p>}
      </div>
    </div>
  );
}
