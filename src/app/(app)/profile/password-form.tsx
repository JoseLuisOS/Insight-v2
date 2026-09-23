"use client";

import { SubmitButton } from "@/components/submit-button";
import { updateOwnPassword } from "./actions";

export function PasswordForm() {
  return (
    <form action={updateOwnPassword} className="max-w-sm space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-foreground">
          Confirmar contraseña
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <SubmitButton
        pendingLabel="Guardando..."
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
