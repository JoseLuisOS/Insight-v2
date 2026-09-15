import type { Metadata } from "next";
import { PasswordGate } from "@/components/password-gate";
import { PublicRender, type PublicPayload } from "@/components/public-render";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_publication_meta", { p_token: token });
  const name =
    (data as { name?: string } | null)?.name ?? "Intersel Insight";
  return {
    title: name,
    description: "Visualización publicada con Intersel Insight",
    openGraph: { title: name, description: "Publicado con Intersel Insight" },
    twitter: { card: "summary_large_image", title: name },
  };
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ embed?: string; f?: string; sig?: string }>;
}) {
  const { token } = await params;
  const { embed, f, sig } = await searchParams;
  const isEmbed = embed === "1";

  const supabase = await createClient();

  // Try the unprotected render first.
  const { data } = await supabase.rpc("render_publication", { p_token: token });
  const payload = data as PublicPayload | null;

  if (payload?.snapshot) {
    await supabase.rpc("log_publication_view", { p_token: token }); // analytics

    // Signed per-viewer scope: verify the HMAC signature, then filter the snapshot.
    if (f && sig) {
      const { data: valid } = await supabase.rpc("verify_embed_signature", {
        p_token: token,
        p_payload: f,
        p_sig: sig,
      });
      if (!valid) {
        return (
          <main className="flex min-h-screen items-center justify-center bg-muted px-4">
            <p className="text-sm text-danger">Firma de embed inválida.</p>
          </main>
        );
      }
      const eq = f.indexOf("=");
      const col = eq >= 0 ? f.slice(0, eq) : f;
      const val = eq >= 0 ? f.slice(eq + 1) : "";
      const keep = (rows: { [k: string]: unknown }[]) =>
        rows.filter((r) => String(r[col] ?? "") === val);
      const snap = payload.snapshot;
      const filtered = {
        ...payload,
        snapshot: {
          ...snap,
          rows: snap.rows ? keep(snap.rows) : snap.rows,
          items: snap.items?.map((it) => ({ ...it, rows: keep(it.rows) })),
        },
      };
      return <PublicRender payload={filtered} isEmbed={isEmbed} />;
    }

    return <PublicRender payload={payload} isEmbed={isEmbed} />;
  }

  // Maybe it needs a password (or doesn't exist / expired).
  const { data: metaData } = await supabase.rpc("get_publication_meta", { p_token: token });
  const meta = metaData as
    | { exists: boolean; requires_password: boolean; available: boolean }
    | null;

  if (meta?.available && meta.requires_password) {
    return <PasswordGate token={token} isEmbed={isEmbed} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-foreground">Contenido no disponible</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Este enlace no existe, expiró o fue revocado.
        </p>
      </div>
    </main>
  );
}
