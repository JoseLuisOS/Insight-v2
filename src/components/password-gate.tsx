"use client";

import { useState, useTransition } from "react";
import { PublicRender, type PublicPayload } from "@/components/public-render";
import { fetchPublicSnapshot } from "@/app/p/[token]/actions";

export function PasswordGate({ token, isEmbed }: { token: string; isEmbed: boolean }) {
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (payload) return <PublicRender payload={payload} isEmbed={isEmbed} />;

  function submit() {
    setError(null);
    start(async () => {
      const res = await fetchPublicSnapshot(token, password);
      if ("error" in res) setError(res.error);
      else setPayload(res.payload as PublicPayload);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold text-card-foreground">Contenido protegido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa la contraseña para ver esta publicación.
        </p>
        {error && (
          <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={submit}
          disabled={pending}
          className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Verificando…" : "Ver"}
        </button>
      </div>
    </main>
  );
}
