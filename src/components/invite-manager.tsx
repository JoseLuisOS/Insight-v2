"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInvite, revokeInvite } from "@/app/(app)/team/actions";

type Invite = {
  id: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
};

export function InviteManager({
  invites,
  siteUrl,
}: {
  invites: Invite[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function generate() {
    setError(null);
    start(async () => {
      const res = await createInvite(role);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  function copy(token: string) {
    navigator.clipboard.writeText(`${siteUrl}/join/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  const pendingInvites = invites.filter((i) => !i.accepted_at);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-card-foreground">Invitar miembros</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Genera un enlace de invitación con un rol. Compártelo; al abrirlo (tras registrarse) la
        persona se une a tu organización.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="viewer">viewer</option>
          <option value="editor">editor</option>
          <option value="admin">admin</option>
        </select>
        <button
          onClick={generate}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Generando…" : "Generar invitación"}
        </button>
      </div>

      {pendingInvites.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pendingInvites.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">Rol: {inv.role}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {siteUrl}/join/{inv.token}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => copy(inv.token)}
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
                >
                  {copied === inv.token ? "¡Copiado!" : "Copiar enlace"}
                </button>
                <button
                  onClick={() => start(async () => { await revokeInvite(inv.id); router.refresh(); })}
                  className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-danger"
                >
                  Revocar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
