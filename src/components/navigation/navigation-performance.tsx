"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Report slow client route transitions in the browser console. */
export function NavigationPerformance() {
  const pathname = usePathname();

  useEffect(() => {
    const navigation = window.__insightNavigationStart;
    if (!navigation || navigation.path !== pathname) return;
    window.__insightNavigationStart = undefined;
    const durationMs = Math.round(performance.now() - navigation.started);
    if (durationMs >= 1000) {
      const path = pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id");
      console.warn(`[SLOW] browser.navigation path=${path} duration_ms=${durationMs}`);
    }
  }, [pathname]);

  return null;
}
