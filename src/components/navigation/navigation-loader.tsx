"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CubeLoader } from "@/components/cube-loader";
import { NAVIGATION_START_EVENT, type NavigationStart } from "@/lib/navigation-events";

// Fast (prefetched/cached) transitions finish before this and never flash.
const SHOW_DELAY_MS = 120;
// Never leave the work area covered if a navigation is aborted without a route change.
const MAX_VISIBLE_MS = 60_000;

type Pending = { id: number; from: string };

/**
 * Covers the work area from the click until the destination route commits.
 * `loading.tsx` only appears once the server answers, which in development
 * includes on-demand compilation, so this bridges that silent gap.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [pending, setPending] = useState<Pending | null>(null);
  const [shownId, setShownId] = useState<number | null>(null);
  const [committedPath, setCommittedPath] = useState(pathname);

  // The destination committed: finish the pending navigation during render.
  if (committedPath !== pathname) {
    setCommittedPath(pathname);
    setPending(null);
  }

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let nextId = 0;
    const onStart = (event: Event) => {
      const { path } = (event as CustomEvent<NavigationStart>).detail;
      const from = pathnameRef.current;
      // Search-param changes stay inside the page, which shows its own loaders.
      setPending(path === from ? null : { id: ++nextId, from });
    };
    window.addEventListener(NAVIGATION_START_EVENT, onStart);
    return () => window.removeEventListener(NAVIGATION_START_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const show = window.setTimeout(() => setShownId(pending.id), SHOW_DELAY_MS);
    const reset = window.setTimeout(() => setPending(null), MAX_VISIBLE_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(reset);
    };
  }, [pending]);

  const visible = pending !== null && pending.from === pathname && shownId === pending.id;
  if (!visible) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/75 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-primary">
        <CubeLoader size={40} />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  );
}
