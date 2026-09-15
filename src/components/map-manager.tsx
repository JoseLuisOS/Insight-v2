"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createMap, deleteMap } from "@/app/(app)/maps/actions";

type GeoMap = { id: string; name: string; name_property: string };

export function MapManager({ maps, canWrite }: { maps: GeoMap[]; canWrite: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameProperty, setNameProperty] = useState("name");
  const [geojson, setGeojson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setGeojson(String(reader.result));
    reader.readAsText(file);
  }

  function add() {
    setError(null);
    start(async () => {
      const res = await createMap(name, geojson, nameProperty);
      if ("error" in res) setError(res.error);
      else {
        setName("");
        setGeojson("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-card-foreground">Nuevo mapa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube un <strong>GeoJSON</strong> (FeatureCollection). El{" "}
            <em>nombre de propiedad</em> es la propiedad de cada región que coincide con la
            columna de tus datos (ej. <code>name</code>, <code>estado</code>, <code>ENTIDAD</code>).
            Puedes obtener GeoJSON de México por estado/municipio de fuentes públicas.
          </p>
          {error && (
            <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre (ej. México por estado)"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                value={nameProperty}
                onChange={(e) => setNameProperty(e.target.value)}
                placeholder="propiedad de nombre"
                className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <input
              type="file"
              accept=".json,.geojson,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              className="block text-sm"
            />
            <textarea
              value={geojson}
              onChange={(e) => setGeojson(e.target.value)}
              rows={4}
              placeholder='o pega aquí el GeoJSON… {"type":"FeatureCollection","features":[…]}'
              className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
            />
            <button
              onClick={add}
              disabled={pending || !geojson.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Crear mapa"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {maps.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay mapas.</p>}
        {maps.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <div className="font-medium text-card-foreground">{m.name}</div>
              <div className="font-mono text-xs text-muted-foreground">prop: {m.name_property}</div>
            </div>
            {canWrite && (
              <button
                onClick={() => start(async () => { await deleteMap(m.id); router.refresh(); })}
                className="text-xs text-muted-foreground hover:text-danger"
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
