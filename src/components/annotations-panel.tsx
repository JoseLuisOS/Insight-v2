"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAnnotation, deleteAnnotation } from "@/app/(app)/charts/annotation-actions";

type Annotation = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  author?: string | null;
};

export function AnnotationsPanel({
  chartId,
  annotations,
  canWrite,
}: {
  chartId: string;
  annotations: Annotation[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    start(async () => {
      const res = await addAnnotation(chartId, body);
      if ("error" in res) setError(res.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-card-foreground">Notas</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Anotaciones del equipo sobre esta gráfica.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {canWrite && (
        <div className="mt-4 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Escribe una nota…"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={add}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {annotations.length === 0 && (
          <li className="text-sm text-muted-foreground">Aún no hay notas.</li>
        )}
        {annotations.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
          >
            <div>
              <p className="text-sm text-foreground">{a.body}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {a.author ?? "—"} · {new Date(a.created_at).toLocaleString("es-MX")}
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => start(async () => { await deleteAnnotation(a.id, chartId); router.refresh(); })}
                className="shrink-0 text-xs text-muted-foreground hover:text-danger"
              >
                Eliminar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
