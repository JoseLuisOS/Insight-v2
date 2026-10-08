"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { CubeLoader } from "@/components/cube-loader";
import { createDashboardV2 } from "@/app/(app)/dashboards/v2/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? <><CubeLoader size={14} />Creando…</> : "Crear dashboard"}
    </button>
  );
}

export function NewDashboardButton({ organizations, label = "Nuevo dashboard", variant = "primary" }: {
  organizations: { id: string; name: string }[]; label?: string; variant?: "primary" | "hero";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const empty = organizations.length === 0;

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const size = variant === "hero" ? "px-5 py-2.5 text-base" : "px-4 py-2 text-sm";
  return (
    <>
      <button ref={triggerRef} type="button" disabled={empty} onClick={() => setOpen(true)}
        title={empty ? "No tienes organizaciones con acceso a Gráficas." : undefined}
        className={`inline-flex items-center gap-2 rounded-lg bg-primary ${size} font-medium text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}>
        <Plus size={variant === "hero" ? 18 : 16} aria-hidden="true" />{label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-lg font-semibold text-foreground">Nuevo dashboard</h2>
              <button type="button" aria-label="Cerrar" onClick={close}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <form action={createDashboardV2} className="space-y-4">
              <div>
                <label htmlFor={`${titleId}-name`} className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
                <input ref={nameRef} id={`${titleId}-name`} name="name" required maxLength={160}
                  placeholder="Ej. Resultados trimestrales"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              {organizations.length > 1 ? (
                <div>
                  <label htmlFor={`${titleId}-org`} className="mb-1 block text-sm font-medium text-foreground">Organización</label>
                  <select id={`${titleId}-org`} name="organizationId" required defaultValue={organizations[0]?.id}
                    className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                  </select>
                </div>
              ) : (
                <input type="hidden" name="organizationId" value={organizations[0]?.id ?? ""} />
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={close}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Cancelar
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
