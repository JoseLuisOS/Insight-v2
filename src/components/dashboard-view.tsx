"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useMemo, useRef, useState, useTransition } from "react";
import { Responsive, type Layout } from "react-grid-layout";
import { ChartRenderer } from "@/components/chart-renderer";
import { useContainerWidth } from "@/lib/use-container-width";
import { slugify } from "@/lib/export";
import type { ChartConfig, Row } from "@/lib/charts";

type Item = {
  id: string;
  name: string;
  config: ChartConfig;
  layout: { x: number; y: number; w: number; h: number };
  columns: string[];
  rows: Row[];
  geo?: { name: string; geojson: object; nameProperty?: string };
};
type Filter = {
  id: string;
  type: "date_range" | "dropdown";
  config: { column: string; label?: string };
};

type FilterState = Record<string, { value?: string; from?: string; to?: string }>;

export function DashboardView({
  items,
  filters,
  exportName = "dashboard",
  showExport = true,
}: {
  items: Item[];
  filters: Filter[];
  exportName?: string;
  showExport?: boolean;
}) {
  const [state, setState] = useState<FilterState>({});
  const [crossFilter, setCrossFilter] = useState<{ column: string; value: string } | null>(
    null,
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const { ref: widthRef, width } = useContainerWidth();
  const [exporting, startExport] = useTransition();

  function exportPdf() {
    if (!gridRef.current) return;
    startExport(async () => {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(gridRef.current!, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgW = pw;
      const imgH = (canvas.height * pw) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(img, "PNG", 0, position, imgW, imgH);
      heightLeft -= ph;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, imgW, imgH);
        heightLeft -= ph;
      }
      pdf.save(`${slugify(exportName)}.pdf`);
    });
  }

  const layout: Layout[] = useMemo(
    () => items.map((it) => ({ i: it.id, ...it.layout, static: true })),
    [items],
  );

  // Distinct values for dropdown filters (across charts that have the column).
  const dropdownOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of filters) {
      if (f.type !== "dropdown") continue;
      const set = new Set<string>();
      for (const it of items) {
        if (!it.columns.includes(f.config.column)) continue;
        for (const r of it.rows) {
          const v = r[f.config.column];
          if (v != null && v !== "") set.add(String(v));
        }
      }
      map[f.id] = [...set].sort().slice(0, 500);
    }
    return map;
  }, [filters, items]);

  function applyFilters(rows: Row[], columns: string[]): Row[] {
    let out = rows;
    if (filters.length > 0) {
      out = out.filter((row) =>
        filters.every((f) => {
          const col = f.config.column;
          if (!columns.includes(col)) return true; // filter not applicable to this chart
          const st = state[f.id];
          if (!st) return true;
          const v = String(row[col] ?? "");
          if (f.type === "dropdown") return !st.value || v === st.value;
          if (st.from && v < st.from) return false;
          if (st.to && v > st.to) return false;
          return true;
        }),
      );
    }
    if (crossFilter && columns.includes(crossFilter.column)) {
      out = out.filter((row) => String(row[crossFilter.column] ?? "") === crossFilter.value);
    }
    return out;
  }

  return (
    <div className="space-y-4" ref={widthRef}>
      {filters.length > 0 && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
          {filters.map((f) => (
            <div key={f.id}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {f.config.label || f.config.column}
              </label>
              {f.type === "dropdown" ? (
                <select
                  value={state[f.id]?.value ?? ""}
                  onChange={(e) =>
                    setState((s) => ({ ...s, [f.id]: { value: e.target.value } }))
                  }
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {(dropdownOptions[f.id] ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={state[f.id]?.from ?? ""}
                    onChange={(e) =>
                      setState((s) => ({ ...s, [f.id]: { ...s[f.id], from: e.target.value } }))
                    }
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  />
                  <span className="text-muted-foreground">→</span>
                  <input
                    type="date"
                    value={state[f.id]?.to ?? ""}
                    onChange={(e) =>
                      setState((s) => ({ ...s, [f.id]: { ...s[f.id], to: e.target.value } }))
                    }
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setState({})}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
          >
            Limpiar
          </button>
        </div>
      )}

      {crossFilter && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            Filtrado por <strong>{crossFilter.column}</strong> = {crossFilter.value}
          </span>
          <button
            onClick={() => setCrossFilter(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕ limpiar
          </button>
        </div>
      )}

      {showExport && items.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={exportPdf}
            disabled={exporting}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {exporting ? "Generando PDF…" : "Exportar dashboard a PDF"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center text-sm text-muted-foreground">
          Este dashboard no tiene gráficas todavía.
        </div>
      ) : (
        <div ref={gridRef} className="bg-background">
        <Responsive
          className="layout"
          width={width}
          layouts={{ lg: layout, md: layout, sm: layout }}
          breakpoints={{ lg: 1024, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 12, sm: 6 }}
          rowHeight={48}
          isDraggable={false}
          isResizable={false}
        >
          {items.map((it) => (
            <div key={it.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border bg-muted px-3 py-1.5 text-sm font-medium">
                {it.name}
              </div>
              <div className="h-[calc(100%-34px)] p-2">
                <ChartRenderer
                  config={it.config}
                  rows={applyFilters(it.rows, it.columns)}
                  columns={it.columns}
                  height={Math.max(120, it.layout.h * 48 - 52)}
                  geo={it.geo}
                  onSelect={(col, val) =>
                    setCrossFilter(col && val ? { column: col, value: val } : null)
                  }
                />
              </div>
            </div>
          ))}
        </Responsive>
        </div>
      )}
    </div>
  );
}
