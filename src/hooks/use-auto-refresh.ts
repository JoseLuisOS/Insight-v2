"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAutoRefresh(active: boolean, url: string, revision: string, intervalMs = 10_000) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    let timer: number | undefined;
    let checking = false;
    let lastRefresh = 0;

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, intervalMs);
    };

    const check = async () => {
      window.clearTimeout(timer);
      if (checking || controller.signal.aborted) return;
      if (document.visibilityState !== "visible") { schedule(); return; }

      checking = true;
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { revision: string };
        if (data.revision !== revision && Date.now() - lastRefresh > 20_000) {
          lastRefresh = Date.now();
          router.refresh();
        }
      } catch {
        // A temporary network error is retried on the next check.
      } finally {
        checking = false;
        if (!controller.signal.aborted) schedule();
      }
    };

    void check();
    const checkOnReturn = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", checkOnReturn);
    window.addEventListener("focus", checkOnReturn);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", checkOnReturn);
      window.removeEventListener("focus", checkOnReturn);
    };
  }, [active, intervalMs, revision, router, url]);
}
