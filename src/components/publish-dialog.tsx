"use client";

import { useState, useTransition } from "react";
import {
  signEmbed,
  type PublishOptions,
  type PublishState,
} from "@/app/(app)/charts/publish-actions";

type PublishResult = { token: string | null } | { error: string };
type PublishAction = (
  resourceId: string,
  visibility: PublishState["visibility"],
  options?: PublishOptions,
) => Promise<PublishResult>;

const OPTIONS: { value: PublishState["visibility"]; label: string; desc: string }[] = [
  { value: "private", label: "Privado", desc: "Sólo tú y tu equipo con acceso." },
  { value: "internal", label: "Interno", desc: "Visible para tu organización." },
  { value: "public_link", label: "Enlace público", desc: "Cualquiera con el enlace." },
  { value: "public_embed", label: "Embebible", desc: "Insertable en sitios externos." },
];

export function PublishDialog({
  resourceId,
  resourceType,
  action,
  initial,
  siteUrl,
  canPublish,
  viewCount = 0,
}: {
  resourceId: string;
  resourceType: "chart" | "dashboard";
  action: PublishAction;
  initial: PublishState;
  siteUrl: string;
  canPublish: boolean;
  viewCount?: number;
}) {
  const [state, setState] = useState<PublishState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [hideTitle, setHideTitle] = useState(!!initial.settings?.hideTitle);
  const [theme, setTheme] = useState<NonNullable<PublishOptions["theme"]>>(
    initial.settings?.theme ?? "auto",
  );
  const [expiresInDays, setExpiresInDays] = useState(0);
  const [password, setPassword] = useState("");
  const [signCol, setSignCol] = useState("");
  const [signVal, setSignVal] = useState("");
  const [signedUrl, setSignedUrl] = useState("");
  const [signing, startSign] = useTransition();

  function generateSignedEmbed() {
    if (!signCol.trim() || !state.token) return;
    const payload = `${signCol.trim()}=${signVal}`;
    startSign(async () => {
      const res = await signEmbed(resourceType, resourceId, payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSignedUrl(
        `${siteUrl}/p/${state.token}?embed=1&f=${encodeURIComponent(payload)}&sig=${res.sig}`,
      );
    });
  }

  const options: PublishOptions = {
    hideTitle,
    theme,
    expiresInDays: expiresInDays || null,
    password: password.trim() === "" ? null : password,
  };

  const publicUrl = state.token ? `${siteUrl}/p/${state.token}` : "";
  const embedCode = state.token
    ? `<iframe src="${siteUrl}/p/${state.token}?embed=1" width="100%" height="360" style="border:0" loading="lazy"></iframe>`
    : "";

  function change(visibility: PublishState["visibility"]) {
    setError(null);
    start(async () => {
      const res = await action(resourceId, visibility, options);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setState({ visibility, token: res.token, settings: { hideTitle, theme } });
    });
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const isPublic = state.visibility === "public_link" || state.visibility === "public_embed";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">Publicar</h2>
        {isPublic && (
          <span className="text-sm text-muted-foreground">
            👁 {viewCount.toLocaleString("es-MX")} vistas
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Controla quién puede ver este recurso.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const isExternal = o.value === "public_link" || o.value === "public_embed";
          const disabled = isExternal && !canPublish;
          return (
            <button
              key={o.value}
              onClick={() => change(o.value)}
              disabled={disabled || pending}
              className={`rounded-lg border p-3 text-left transition ${
                state.visibility === o.value
                  ? "border-primary bg-brand-50"
                  : "border-border hover:bg-muted"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <div className="text-sm font-medium text-foreground">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.desc}</div>
              {disabled && (
                <div className="mt-1 text-xs text-warning">Requiere permiso para publicar</div>
              )}
            </button>
          );
        })}
      </div>

      {isPublic && state.token && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Enlace público
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={publicUrl}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={() => copy(publicUrl, "url")}
                className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                {copied === "url" ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          </div>

          {state.visibility === "public_embed" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Código para incrustar
              </label>
              <div className="flex gap-2">
                <textarea
                  readOnly
                  value={embedCode}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                />
                <button
                  onClick={() => copy(embedCode, "embed")}
                  className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  {copied === "embed" ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {state.visibility === "public_embed" && (
            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Embed firmado por espectador
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Genera un enlace que muestra sólo las filas donde una columna = un valor. La
                firma impide que el espectador cambie el filtro.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={signCol}
                  onChange={(e) => setSignCol(e.target.value)}
                  placeholder="columna (ej. region)"
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                />
                <span className="text-muted-foreground">=</span>
                <input
                  value={signVal}
                  onChange={(e) => setSignVal(e.target.value)}
                  placeholder="valor (ej. Norte)"
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                />
                <button
                  onClick={generateSignedEmbed}
                  disabled={signing}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  {signing ? "Firmando…" : "Generar enlace firmado"}
                </button>
              </div>
              {signedUrl && (
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={signedUrl}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs"
                  />
                  <button
                    onClick={() => copy(signedUrl, "signed")}
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    {copied === "signed" ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              )}
            </details>
          )}

          <details className="rounded-md border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">Opciones avanzadas</summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hideTitle}
                  onChange={(e) => setHideTitle(e.target.checked)}
                />
                Ocultar título
              </label>
              <label className="text-sm">
                Tema
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as typeof theme)}
                  className="ml-2 rounded border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="auto">Automático</option>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                </select>
              </label>
              <label className="text-sm">
                Expira en
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="ml-2 rounded border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value={0}>Nunca</option>
                  <option value={1}>1 día</option>
                  <option value={7}>7 días</option>
                  <option value={30}>30 días</option>
                </select>
              </label>
              <label className="text-sm">
                Contraseña
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="(sin contraseña)"
                  className="ml-2 rounded border border-input bg-background px-2 py-1 text-sm"
                />
              </label>
            </div>
          </details>

          <div className="flex items-center gap-3">
            <button
              onClick={() => change(state.visibility)}
              disabled={pending}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Aplicando…" : "Aplicar y actualizar datos"}
            </button>
            <span className="text-xs text-muted-foreground">
              Regenera el snapshot y guarda las opciones.
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Se publica un <strong>snapshot</strong> de los datos al momento (refresco
            automático cada hora). Cambia a “Privado” para revocar el enlace al instante.
          </p>
        </div>
      )}
    </div>
  );
}
