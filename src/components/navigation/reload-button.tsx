"use client";

import { useEffect, useState } from "react";
import { Check, RotateCw } from "lucide-react";
import { usePanelHeader } from "./panel-header-context";

/** Reloads the current page's data. Spins while loading, flashes green when done. */
export function ReloadButton({ className }: { className?: string }) {
  const { requestReload, reloading } = usePanelHeader();
  const [done, setDone] = useState(false);
  const [wasReloading, setWasReloading] = useState(false);

  // Detect the reloading → idle edge while rendering (avoids setState in an effect).
  if (reloading !== wasReloading) {
    setWasReloading(reloading);
    setDone(wasReloading && !reloading);
  }

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 900);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <button
      type="button"
      onClick={requestReload}
      title="Recargar"
      aria-label="Recargar"
      className={`grid h-8 w-8 place-items-center rounded-md border transition ${
        done
          ? "border-success/40 bg-success/10 text-success"
          : "shell-control border text-muted-foreground hover:border-primary/40 hover:text-primary"
      } ${className ?? ""}`}
    >
      {done ? <Check size={15} /> : <RotateCw size={15} className={reloading ? "animate-spin" : ""} />}
    </button>
  );
}
