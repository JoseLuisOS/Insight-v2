"use client";

import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useRef, useState, useTransition } from "react";
import { buildTable, type Column, type ColumnType, type ParsedTable } from "@/lib/csv";
import { ingestDataset } from "@/app/(app)/datasets/new/actions";

const TYPE_LABELS: Record<ColumnType, string> = {
  integer: "Entero",
  numeric: "Número",
  boolean: "Booleano",
  text: "Texto",
};

export function CsvUploader() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function ingestText(text: string, fallbackName?: string) {
    setError(null);
    const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
    if (parsed.errors.length) {
      setError("No se pudo leer el contenido. Revisa el formato.");
      return;
    }
    const matrix = parsed.data as string[][];
    if (matrix.length < 2) {
      setError("Se necesita al menos una fila de encabezados y una de datos.");
      return;
    }
    const [headers, ...rows] = matrix;
    setTable(buildTable(headers, rows));
    if (fallbackName && !name) setName(fallbackName.replace(/\.csv$/i, ""));
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => ingestText(String(reader.result), file.name);
    reader.readAsText(file);
  }

  function setColumnType(idx: number, type: ColumnType) {
    if (!table) return;
    const columns: Column[] = table.columns.map((c, i) =>
      i === idx ? { ...c, type } : c,
    );
    setTable({ ...table, columns });
  }

  function save() {
    if (!table) return;
    setError(null);
    startTransition(async () => {
      const res = await ingestDataset(name || "Dataset", table.columns, table.rows);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(`/datasets/${res.datasetId}`);
    });
  }

  return (
    <div className="space-y-6">
      {!table && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onFile(file);
            }}
            onClick={() => fileInput.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition ${
              dragging
                ? "border-primary bg-brand-50"
                : "border-border bg-muted/40 hover:border-primary"
            }`}
          >
            <p className="text-sm font-medium text-foreground">
              Arrastra tu archivo CSV aquí
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              o haz clic para seleccionarlo
            </p>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
              }}
            />
          </div>

          <div className="text-center text-sm text-muted-foreground">o</div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Pega una tabla (CSV o desde Excel/Sheets)
            </label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={6}
              placeholder={"mes,ingresos\nEnero,1000\nFebrero,2300"}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => ingestText(pasted)}
              disabled={!pasted.trim()}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              Procesar tabla
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {table && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre del dataset</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ventas Q1"
              className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {table.rows.length.toLocaleString("es-MX")} filas · {table.columns.length}{" "}
            columnas. Vista previa de las primeras 10.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {table.columns.map((c, idx) => (
                    <th key={c.key} className="px-3 py-2 text-left font-medium">
                      <div className="text-foreground">{c.name}</div>
                      <select
                        value={c.type}
                        onChange={(e) =>
                          setColumnType(idx, e.target.value as ColumnType)
                        }
                        className="mt-1 rounded border border-input bg-background px-1 py-0.5 text-xs font-normal text-muted-foreground"
                      >
                        {(Object.keys(TYPE_LABELS) as ColumnType[]).map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {table.columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 text-muted-foreground">
                        {row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={pending}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Crear dataset"}
            </button>
            <button
              onClick={() => {
                setTable(null);
                setError(null);
              }}
              className="rounded-md border border-border px-5 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
