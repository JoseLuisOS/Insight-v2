import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  // Editors move between several modules before finishing one task. Keep the
  // compiled development routes warm long enough to avoid repeated compiles.
  onDemandEntries: {
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 8,
  },
};

export default withWorkflow(nextConfig);
