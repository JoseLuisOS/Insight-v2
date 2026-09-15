"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVALS = [
  { label: "Manual", value: 0 },
  { label: "30 s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
];

/** Internal auto-refresh: re-renders the server component on an interval. */
export function AutoRefresh() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!seconds) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [seconds, router]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Auto-actualizar:</span>
      <select
        value={seconds}
        onChange={(e) => setSeconds(Number(e.target.value))}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        {INTERVALS.map((i) => (
          <option key={i.value} value={i.value}>
            {i.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => router.refresh()}
        className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-muted"
      >
        Actualizar
      </button>
    </div>
  );
}
