"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Ctx = {
  /** Bumps after a reload finishes → remounts the page subtree with fresh data. */
  reloadNonce: number;
  /** True while router.refresh() runs. */
  reloading: boolean;
  requestReload: () => void;
};

const PanelHeaderCtx = createContext<Ctx>({ reloadNonce: 0, reloading: false, requestReload: () => {} });

/**
 * Reload mechanism for the header button: `router.refresh()` re-runs the
 * server components; once it settles, `reloadNonce` changes so
 * `PanelReloadBoundary` remounts the content and client-side state re-seeds
 * from the fresh props.
 */
export function PanelHeaderProvider({ children }: { children: React.ReactNode }) {
  const [reloadNonce, setReloadNonce] = useState(0);
  const router = useRouter();
  const [reloading, startTransition] = useTransition();
  const wasReloading = useRef(false);

  useEffect(() => {
    if (reloading) {
      wasReloading.current = true;
      return;
    }
    if (wasReloading.current) {
      wasReloading.current = false;
      setReloadNonce((n) => n + 1);
    }
  }, [reloading]);

  const requestReload = () => {
    startTransition(() => router.refresh());
  };

  return (
    <PanelHeaderCtx.Provider value={{ reloadNonce, reloading, requestReload }}>
      {children}
    </PanelHeaderCtx.Provider>
  );
}

export function usePanelHeader() {
  return useContext(PanelHeaderCtx);
}

export function PanelReloadBoundary({
  children,
  id,
  className,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const { reloadNonce } = usePanelHeader();
  return (
    <div id={id} key={reloadNonce} className={className}>
      {children}
    </div>
  );
}
