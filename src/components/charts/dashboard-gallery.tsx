"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PanelsTopLeft, Search } from "lucide-react";
import type { GalleryDashboard } from "@/lib/chart-snapshot";
import { ChartThumbnail } from "@/components/charts/chart-thumbnail";

type Order = "recent" | "name";
const COLUMNS = 12;
const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60],
];

function relativeTime(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "hace un momento";
}

const plain = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Mosaic({ tiles }: { tiles: GalleryDashboard["tiles"] }) {
  if (!tiles.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
        <PanelsTopLeft size={32} aria-hidden="true" />
        <span className="text-xs">Dashboard vacío</span>
      </div>
    );
  }
  const rows = Math.max(1, ...tiles.map((tile) => tile.layout.y + tile.layout.h));
  return (
    <div className="relative h-full w-full">
      {tiles.map((tile, index) => (
        <div key={index} className="absolute p-[3px]"
          style={{
            left: `${(tile.layout.x / COLUMNS) * 100}%`, top: `${(tile.layout.y / rows) * 100}%`,
            width: `${(tile.layout.w / COLUMNS) * 100}%`, height: `${(tile.layout.h / rows) * 100}%`,
          }}>
          <div className="h-full w-full overflow-hidden rounded-md border border-border bg-card">
            <ChartThumbnail snapshot={tile.snapshot} type={tile.type} height="100%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardGallery({ dashboards }: { dashboards: GalleryDashboard[] }) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<Order>("recent");
  const multiOrg = useMemo(() => new Set(dashboards.map((d) => d.organizationName)).size > 1, [dashboards]);

  const visible = useMemo(() => {
    const term = plain(query.trim());
    const list = dashboards.filter((d) => !term || plain(d.name).includes(term));
    return list.sort((a, b) => order === "name"
      ? a.name.localeCompare(b.name, "es")
      : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [dashboards, query, order]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar dashboards" aria-label="Buscar dashboards"
            className="w-64 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <select value={order} onChange={(event) => setOrder(event.target.value as Order)} aria-label="Orden"
          className="cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="recent">Más recientes</option>
          <option value="name">Nombre A–Z</option>
        </select>
      </div>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Ningún dashboard coincide con la búsqueda.</p>
          <button type="button" onClick={() => setQuery("")}
            className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {visible.map((dashboard) => (
            <Link key={dashboard.id} href={`/dashboards/v2/${dashboard.id}`}
              className="group block overflow-hidden rounded-2xl border border-border bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none">
              <div className="relative h-48 border-b border-border bg-muted/30 p-2 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px]">
                <Mosaic tiles={dashboard.tiles} />
              </div>
              <div className="p-4">
                <div className="line-clamp-1 font-medium text-foreground" title={dashboard.name}>{dashboard.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {dashboard.chartCount} {dashboard.chartCount === 1 ? "gráfica" : "gráficas"}
                  {multiOrg && <> · {dashboard.organizationName}</>}
                  {" · "}
                  <span title={new Date(dashboard.updatedAt).toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" })}>
                    {relativeTime(dashboard.updatedAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
