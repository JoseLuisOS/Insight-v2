import { ImageResponse } from "next/og";
import {
  aggregateByCategory,
  computeKpi,
  formatNumber,
  type ChartConfig,
  type Row,
} from "@/lib/charts";

export const alt = "Intersel Insight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Snapshot = {
  kind: string;
  name: string;
  config?: ChartConfig;
  rows?: Row[];
};

export default async function OgImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let snap: Snapshot | null = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/render_publication`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ p_token: token }),
      },
    );
    const data = await res.json();
    snap = data?.snapshot ?? null;
  } catch {
    snap = null;
  }

  const name = snap?.name ?? "Intersel Insight";
  const config = snap?.config;
  const rows = snap?.rows ?? [];

  let bars: number[] = [];
  let kpi: string | null = null;
  if (config?.type === "kpi") {
    kpi = formatNumber(computeKpi(rows, config.y, config.aggregation ?? "sum"));
  } else if (config?.x && ["bar", "line", "area", "pie"].includes(config.type)) {
    bars = aggregateByCategory(rows, config.x, config.y, config.aggregation ?? "sum").values.slice(0, 8);
  }
  const max = Math.max(1, ...bars.map((v) => Math.abs(v)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#2E5A98",
          padding: 64,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: "white",
              color: "#4377BC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              marginRight: 16,
            }}
          >
            i
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>Intersel Insight</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 800 }}>{name}</div>
          {bars.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", height: 220, marginTop: 24 }}>
              {bars.map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    width: 70,
                    height: Math.max(8, (Math.abs(v) / max) * 200),
                    backgroundColor: "rgba(255,255,255,0.9)",
                    borderRadius: 8,
                    marginRight: 14,
                  }}
                />
              ))}
            </div>
          ) : kpi ? (
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, marginTop: 16 }}>{kpi}</div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>

        <div style={{ display: "flex", fontSize: 26, opacity: 0.85 }}>
          {snap?.kind === "dashboard" ? "Dashboard publicado" : "Visualización publicada"}
        </div>
      </div>
    ),
    { ...size },
  );
}
