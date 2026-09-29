"use client";

import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";

function formatTime(d: Date, tz?: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  try {
    return new Intl.DateTimeFormat("es-MX", { ...opts, timeZone: tz }).format(d);
  } catch {
    return new Intl.DateTimeFormat("es-MX", opts).format(d);
  }
}

/** Live clock; falls back to the browser's local time when no zone is given. */
export function Clock({ timeZone }: { timeZone?: string | null }) {
  const tz = timeZone || undefined;
  const [now, setNow] = useState<Date | null>(null);

  // Set after mount to avoid a server/client hydration mismatch.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (!now) return <div className="h-7 w-[72px] rounded-md border border-border" aria-hidden />;

  return (
    <div
      title={tz ?? "Hora local"}
      className="shell-control flex items-center gap-1.5 rounded-md border px-2.5 py-1"
    >
      <ClockIcon size={13} className="shrink-0 text-primary" />
      <span className="font-mono text-xs tabular-nums text-foreground">{formatTime(now, tz)}</span>
    </div>
  );
}
