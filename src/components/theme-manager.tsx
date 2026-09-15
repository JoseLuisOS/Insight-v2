"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTheme, deleteTheme } from "@/app/(app)/themes/actions";

type Theme = { id: string; name: string; config_json: { palette?: string[] } };

export function ThemeManager({
  themes,
  canWrite,
}: {
  themes: Theme[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [colors, setColors] = useState("#4377BC, #2E5A98, #6B97CE, #84abdf");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    start(async () => {
      const res = await createTheme(name, colors.split(","));
      if ("error" in res) setError(res.error);
      else {
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-card-foreground">Nuevo tema</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define una paleta reutilizable (colores hex separados por coma).
          </p>
          {error && (
            <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del tema"
              className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            />
            <div className="flex gap-1">
              {colors.split(",").map((c, i) => (
                <span
                  key={i}
                  className="h-6 w-6 rounded border border-border"
                  style={{ background: c.trim() }}
                />
              ))}
            </div>
            <button
              onClick={add}
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Crear tema"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {themes.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay temas.</p>
        )}
        {themes.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-card-foreground">{t.name}</div>
              {canWrite && (
                <button
                  onClick={() => start(async () => { await deleteTheme(t.id); router.refresh(); })}
                  className="text-xs text-muted-foreground hover:text-danger"
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="mt-3 flex gap-1">
              {(t.config_json.palette ?? []).map((c, i) => (
                <span
                  key={i}
                  className="h-8 flex-1 rounded"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
