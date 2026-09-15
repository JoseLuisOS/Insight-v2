"use client";

import Link from "next/link";
import { ChartRenderer } from "@/components/chart-renderer";
import { DashboardView } from "@/components/dashboard-view";
import type { ChartConfig, Row } from "@/lib/charts";

type Geo = { name: string; geojson: object; nameProperty?: string };

type Snapshot = {
  kind: string;
  name: string;
  config?: ChartConfig;
  columns?: string[];
  rows?: Row[];
  geo?: Geo;
  items?: {
    id: string;
    name: string;
    config: ChartConfig;
    layout: { x: number; y: number; w: number; h: number };
    columns: string[];
    rows: Row[];
    geo?: Geo;
  }[];
  filters?: {
    id: string;
    type: "date_range" | "dropdown";
    config: { column: string; label?: string };
  }[];
};

export type PublicPayload = {
  snapshot: Snapshot;
  generated_at: string;
  settings?: { hideTitle?: boolean; theme?: "auto" | "light" | "dark" };
};

export function PublicRender({
  payload,
  isEmbed,
}: {
  payload: PublicPayload;
  isEmbed: boolean;
}) {
  const snap = payload.snapshot;
  const settings = payload.settings ?? {};
  const themeClass =
    settings.theme === "dark" ? "dark" : settings.theme === "light" ? "light" : "";
  const generated = new Date(payload.generated_at).toLocaleString("es-MX");

  return (
    <div className={`${themeClass} bg-background ${isEmbed ? "p-3" : "mx-auto max-w-5xl px-4 py-10"}`}>
      {!isEmbed && !settings.hideTitle && (
        <h1 className="mb-1 text-2xl font-semibold text-foreground">{snap.name}</h1>
      )}

      {snap.kind === "dashboard" ? (
        <DashboardView
          items={snap.items ?? []}
          filters={snap.filters ?? []}
          exportName={snap.name}
          showExport={!isEmbed}
        />
      ) : (
        <ChartRenderer
          config={snap.config as ChartConfig}
          rows={snap.rows ?? []}
          columns={snap.columns ?? []}
          height={isEmbed ? 320 : 420}
          exportable={!isEmbed}
          exportName={snap.name}
          geo={snap.geo}
        />
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Datos al {generated}</span>
        <Link href="/" className="font-medium text-primary hover:underline" target="_blank">
          Hecho con Intersel Insight
        </Link>
      </div>
    </div>
  );
}
