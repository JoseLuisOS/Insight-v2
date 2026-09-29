"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "./confirm-dialog";
import { ThemeToggle } from "./theme-toggle";

export interface ShellUser {
  name: string | null;
  avatarUrl: string | null;
  orgName: string | null;
}

function initials(name: string | null) {
  return (
    (name ?? "U")
      .trim()
      .split(/\s+/)
      .map((part) => part.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export function SessionAccountFooter({ user, rail = false }: { user: ShellUser; rail?: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/auth/signout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  const avatar = user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt={`Foto de ${user.name ?? "usuario"}`}
      className="h-9 w-9 shrink-0 rounded-full border border-border bg-muted object-cover"
    />
  ) : (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
      {initials(user.name)}
    </span>
  );

  return (
    <>
      {rail ? (
        <div className="grid justify-items-center gap-2">
          <Link href="/profile" title="Perfil">
            {avatar}
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            title="Cerrar sesión"
            className="shell-control grid h-8 w-8 place-items-center rounded-md border transition hover:border-danger/40 hover:text-danger"
          >
            <LogOut size={15} />
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <Link href="/profile" className="flex min-w-0 items-center gap-2.5 rounded-lg p-1 transition hover:bg-muted">
            {avatar}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">{user.name ?? "Usuario"}</span>
              <span className="block text-[11px] text-muted-foreground">Perfil</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="shell-control flex min-h-8 flex-1 items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs transition hover:border-danger/40 hover:text-danger"
            >
              <LogOut size={15} />
              <span>Cerrar sesión</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={logout}
        title="¿Cerrar sesión?"
        description="Saldrás de tu cuenta en este dispositivo y tendrás que volver a ingresar tus credenciales para continuar."
        confirmLabel="Salir"
        cancelLabel="Cancelar"
        busy={busy}
      />
    </>
  );
}
