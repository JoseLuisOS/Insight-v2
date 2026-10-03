"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ViewAsBanner({ identifier, organization }: { identifier: string; organization: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function stop() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/insight/view-as", { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo salir de Ver Como.");
      router.refresh();
    } catch { setError("No se pudo salir de Ver Como. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }
  return <div role="status" className="flex h-[29px] shrink-0 items-center justify-between gap-3 bg-[#385fe5] px-4 text-[10px] text-white sm:px-5">
    <span className="min-w-0 truncate" title={`${identifier} · ${organization}`}><strong>Ver Como:</strong> {identifier} <span className="text-white/75">· {organization}</span></span>
    {error && <span role="alert" className="truncate text-danger">{error}</span>}
    <button type="button" onClick={stop} disabled={busy} aria-label="Salir de Ver Como" className="shrink-0 rounded px-2 py-0.5 font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white disabled:opacity-50">Salir</button>
  </div>;
}
