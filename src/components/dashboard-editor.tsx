"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Responsive, type Layout } from "react-grid-layout";
import { useContainerWidth } from "@/lib/use-container-width";
import {
  saveDashboard,
  type DashboardFilterInput,
  type DashboardItemInput,
} from "@/app/(app)/dashboards/actions";

type ChartRef = { id: string; name: string; type: string };
type Item = ChartRef & { x: number; y: number; w: number; h: number };
type Filter = { type: "date_range" | "dropdown"; column: string; label: string };

export function DashboardEditor({
  dashboardId,
  initialName,
  initialItems,
  initialFilters,
  availableCharts,
}: {
  dashboardId: string;
  initialName: string;
  initialItems: Item[];
  initialFilters: Filter[];
  availableCharts: ChartRef[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [filters, setFilters] = useState<Filter[]>(initialFilters);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const { ref: widthRef, width } = useContainerWidth();

  const layout: Layout[] = useMemo(
    () => items.map((it) => ({ i: it.id, x: it.x, y: it.y, w: it.w, h: it.h })),
    [items],
  );

  const addable = availableCharts.filter((c) => !items.some((i) => i.id === c.id));

  function addChart(c: ChartRef) {
    // Place items two-per-row by default (nicer starting grid than a column).
    const n = items.length;
    const x = (n % 2) * 6;
    const y = Math.floor(n / 2) * 5;
    setItems((prev) => [...prev, { ...c, x, y, w: 6, h: 5 }]);
  }

  function removeChart(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function onLayoutChange(l: Layout[]) {
    setItems((prev) =>
      prev.map((it) => {
        const lay = l.find((x) => x.i === it.id);
        return lay ? { ...it, x: lay.x, y: lay.y, w: lay.w, h: lay.h } : it;
      }),
    );
  }

  function save() {
    setError(null);
    startSave(async () => {
      const itemInputs: DashboardItemInput[] = items.map((it) => ({
        chart_id: it.id,
        layout_json: { x: it.x, y: it.y, w: it.w, h: it.h },
      }));
      const filterInputs: DashboardFilterInput[] = filters
        .filter((f) => f.column.trim())
        .map((f) => ({ type: f.type, config_json: { column: f.column.trim(), label: f.label.trim() || undefined } }));
      const res = await saveDashboard(dashboardId, name, itemInputs, filterInputs);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(`/dashboards/${dashboardId}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar y ver"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Agregar gráfica</h3>
            {addable.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Todas tus gráficas ya están en el dashboard.
              </p>
            ) : (
              <ul className="space-y-1">
                {addable.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => addChart(c)}
                      className="w-full rounded px-2 py-1 text-left text-sm transition hover:bg-muted"
                    >
                      + {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <FiltersEditor filters={filters} setFilters={setFilters} />
        </aside>

        <div ref={widthRef} className="rounded-xl border border-dashed border-border bg-muted/30 p-2">
          {items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Agrega gráficas desde el panel izquierdo y acomódalas arrastrando.
            </div>
          ) : (
            <Responsive
              className="layout"
              width={Math.max(1, width - 16)}
              layouts={{ lg: layout, md: layout, sm: layout }}
              breakpoints={{ lg: 1024, md: 768, sm: 0 }}
              cols={{ lg: 12, md: 12, sm: 6 }}
              rowHeight={48}
              onLayoutChange={(l) => onLayoutChange(l)}
              draggableHandle=".drag-handle"
            >
              {items.map((it) => (
                <div
                  key={it.id}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="drag-handle flex cursor-move items-center justify-between border-b border-border bg-muted px-3 py-1.5">
                    <span className="truncate text-sm font-medium">{it.name}</span>
                    <button
                      onClick={() => removeChart(it.id)}
                      className="text-xs text-muted-foreground hover:text-danger"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid h-[calc(100%-34px)] place-items-center p-2 text-xs text-muted-foreground">
                    {it.type}
                  </div>
                </div>
              ))}
            </Responsive>
          )}
        </div>
      </div>
    </div>
  );
}

function FiltersEditor({
  filters,
  setFilters,
}: {
  filters: Filter[];
  setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Filtros globales</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Aplican a las gráficas cuya columna coincida.
      </p>
      <div className="space-y-3">
        {filters.map((f, idx) => (
          <div key={idx} className="space-y-1 rounded-md border border-border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {f.type === "date_range" ? "Rango de fechas" : "Dropdown"}
              </span>
              <button
                onClick={() => setFilters((p) => p.filter((_, i) => i !== idx))}
                className="text-xs text-muted-foreground hover:text-danger"
              >
                Quitar
              </button>
            </div>
            <input
              value={f.column}
              onChange={(e) =>
                setFilters((p) => p.map((x, i) => (i === idx ? { ...x, column: e.target.value } : x)))
              }
              placeholder="columna objetivo"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setFilters((p) => [...p, { type: "dropdown", column: "", label: "" }])}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          + Dropdown
        </button>
        <button
          onClick={() => setFilters((p) => [...p, { type: "date_range", column: "", label: "" }])}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          + Fechas
        </button>
      </div>
    </div>
  );
}
