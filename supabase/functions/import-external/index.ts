import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESERVED = new Set(["tenant_id"]);
function sanitizeKey(header: string, used: Set<string>): string {
  let key = (header ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!key || !/^[a-z]/.test(key)) key = `col_${key}`;
  if (RESERVED.has(key)) key = `${key}_col`;
  if (key.length > 58) key = key.slice(0, 58);
  let cand = key;
  let i = 2;
  while (used.has(cand)) cand = `${key}_${i++}`;
  used.add(cand);
  return cand;
}

function inferType(values: unknown[]): string {
  const v = values.find((x) => x !== null && x !== undefined && x !== "");
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "numeric";
  if (typeof v === "boolean") return "boolean";
  return "text";
}

// Reject obvious internal/metadata targets (light SSRF guard).
function hostLooksInternal(conn: string): boolean {
  const m = conn.match(/@([^:/?]+)/);
  const host = (m?.[1] ?? "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("169.254.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.endsWith(".internal")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data_source_id, query, dataset_name } = await req.json();
    if (!data_source_id || !query) return json({ error: "Faltan parámetros." }, 400);

    let clean = String(query).trim().replace(/;\s*$/, "");
    if (!/^select\s/i.test(clean)) return json({ error: "Solo se permite SELECT." }, 400);
    if (clean.includes(";")) return json({ error: "Una sola sentencia." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) User-scoped client: RLS ensures the source belongs to the caller's tenant.
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: source } = await userClient
      .from("data_sources")
      .select("id, type, config_json")
      .eq("id", data_source_id)
      .maybeSingle();
    if (!source || source.type !== "external_pg") {
      return json({ error: "Fuente no encontrada." }, 404);
    }
    const secretId = (source.config_json as { secret_id?: string })?.secret_id;
    if (!secretId) return json({ error: "Fuente sin credenciales." }, 400);

    // 2) Service-role client decrypts the connection string from Vault.
    const adminClient = createClient(url, service);
    const { data: conn, error: secretErr } = await adminClient.rpc("read_vault_secret", {
      p_id: secretId,
    });
    if (secretErr || !conn) return json({ error: "No se pudo leer la credencial." }, 500);
    if (hostLooksInternal(conn)) return json({ error: "Host no permitido." }, 400);

    // 3) Connect to the external Postgres and run the read-only query.
    const client = new Client(conn);
    await client.connect();
    let rows: Record<string, unknown>[];
    try {
      await client.queryArray("set statement_timeout to 8000");
      const res = await client.queryObject(`select * from (${clean}) _ext limit 5000`);
      rows = res.rows as Record<string, unknown>[];
    } finally {
      await client.end();
    }

    if (rows.length === 0) {
      return json({ error: "La consulta no devolvió filas." }, 400);
    }

    // 4) Build columns + materialize via ingest_dataset (runs under the user).
    const headers = Object.keys(rows[0]);
    const used = new Set<string>();
    const columns = headers.map((h) => {
      const key = sanitizeKey(h, used);
      const sample = rows.slice(0, 200).map((r) => r[h]);
      return { name: h, key, type: inferType(sample) };
    });
    const outRows = rows.map((r) => {
      const o: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const v = r[h];
        o[columns[idx].key] = v === null || v === undefined ? "" : String(v);
      });
      return o;
    });

    const { data: datasetId, error: ingestErr } = await userClient.rpc("ingest_dataset", {
      p_name: dataset_name || "Importado de Postgres",
      p_columns: columns,
      p_rows: outRows,
    });
    if (ingestErr) return json({ error: ingestErr.message }, 500);

    return json({ datasetId, rowCount: outRows.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
