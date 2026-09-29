"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Maximize, Minimize } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
function fsElement(): Element | null {
  const d = document as any;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

const subscribeNever = () => () => {};

function fullscreenSupported(): boolean {
  const el = document.documentElement as any;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function FullscreenButton({ className }: { className?: string }) {
  const [active, setActive] = useState(false);
  // Server snapshot is `true` so hydration matches; the client corrects it.
  const supported = useSyncExternalStore(subscribeNever, fullscreenSupported, () => true);

  useEffect(() => {
    const onChange = () => setActive(!!fsElement());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
    };
  }, []);

  // Browsers without support (e.g. iOS Safari): hide the button.
  if (!supported) return null;

  async function toggle() {
    try {
      const doc = document as any;
      const el = document.documentElement as any;
      if (!fsElement()) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } catch {
      /* user cancelled or the browser refused: nothing to do */
    }
  }

  const Icon = active ? Minimize : Maximize;
  const label = active ? "Salir de pantalla completa" : "Pantalla completa";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-8 w-8 place-items-center rounded-md border transition hover:border-primary/40 hover:text-primary ${
        active ? "border-primary/40 bg-primary/10 text-primary" : "shell-control border text-muted-foreground"
      } ${className ?? ""}`}
    >
      <Icon size={15} />
    </button>
  );
}
