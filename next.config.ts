import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  // Lets a second local server (e.g. a bundler comparison) run without
  // sharing the default `.next` lock and cache.
  distDir: process.env.INSIGHT_DIST_DIR || ".next",
  // Editors move between several modules before finishing one task. Keep the
  // compiled development routes warm long enough to avoid repeated compiles.
  onDemandEntries: {
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 8,
  },
  experimental: {
    // Revisiting a module within 30 s reuses the client cache instead of a
    // server round trip. router.refresh() and server mutations still invalidate it.
    staleTimes: { dynamic: 30 },
    // The persistent Turbopack cache grew to ~16 GB; keep it in memory only.
    turbopackFileSystemCacheForDev: false,
  },
};

export default withWorkflow(nextConfig);
