# Registro de decisiones (ADR ligero) — Intersel Insight

Cada decisión de arquitectura o proceso relevante. Formato: ID, fecha, estado, contexto,
decisión, consecuencias. Las decisiones de producto/alcance ya viven en
[PLAN.md](PLAN.md) §11; aquí van las operativas y las que se confirman durante la ejecución.

---

## D-001 — Tenencia: esquema compartido + `tenant_id` + RLS

- **Fecha:** 2026-06-27 · **Estado:** Aceptada (confirmada en PLAN.md §5.1 / §11.1)
- **Contexto:** Multi-tenant sobre Supabase, escala de decenas de usuarios por tenant.
- **Decisión:** Esquema compartido con `tenant_id` indexado + RLS estricta. No schema/DB-per-tenant en el MVP.
- **Consecuencias:** Operación simple y una sola migración; exige disciplina total en
  políticas. La migración a schema-per-tenant queda como opción de Ola 3 sin reescribir la app.

## D-002 — Todo en cloud: Supabase hosted + Vercel

- **Fecha:** 2026-06-27 · **Estado:** Aceptada
- **Contexto:** El usuario pidió explícitamente no desarrollar local; todo en la nube.
- **Decisión:** Proyecto **Supabase hosted** (`intersel-insight`, ref `kytvxyjvnxamqdrhwezw`,
  `us-east-1`, $10/mes) gestionado vía MCP, y deploy en **Vercel** importando el repo de GitHub.
- **Consecuencias:** No se usa Docker/`supabase start` local. Migraciones aplican directo al
  proyecto cloud — hacerlo con cuidado. CI/CD automático vía Vercel + GitHub.

## D-003 — Estructura de repo: app en subcarpeta `intersel-insight/`

- **Fecha:** 2026-06-27 · **Estado:** Aceptada
- **Contexto:** El directorio de trabajo "Plataforma Dashboards" tiene espacios/mayúsculas
  (inválido como nombre de paquete npm).
- **Decisión:** La app Next.js vive en `intersel-insight/` con nombre válido; esa carpeta es la
  raíz del repo git y mapea 1:1 a GitHub y al proyecto de Vercel.
- **Consecuencias:** Vercel toma `intersel-insight/` como root del proyecto. El PLAN y la doc
  viven dentro de esa misma carpeta en `docs/`.

## D-004 — Librería de gráficas: Apache ECharts

- **Fecha:** 2026-06-27 · **Estado:** Aceptada (confirmada en PLAN.md §5.5 / §11.5)
- **Contexto:** Se necesita export PNG nativo, transiciones, rendimiento en datasets medianos
  y breadth para olas futuras (mapas).
- **Decisión:** ECharts vía `echarts-for-react`, imports por componente (tree-shaking).
- **Consecuencias:** API imperativa (mitigada por el wrapper React); habilita render SSR a PNG
  para miniaturas OG sin navegador headless.

## D-007 — Conexión a Postgres externo (Ola 1)

- **Fecha:** 2026-06-27 · **Estado:** Implementada (modelo importar-materializar)
- **Implementación:** Credenciales en **Supabase Vault** (cifradas), referenciadas desde
  `data_sources.config_json.secret_id`. Edge Function `import-external` (verify_jwt) verifica
  pertenencia al tenant (RLS), descifra con service_role (`read_vault_secret`), corre **un solo
  SELECT** (LIMIT 5000 + statement_timeout, guard anti-SSRF de hosts internos) y materializa
  vía `ingest_dataset`. Sólo admins gestionan fuentes. Modelo **importar-materializar** (no
  consulta en vivo por render) por seguridad/rendimiento. Página `/sources`.
- **Pendiente de verificación:** el connect+query real requiere una DB externa de prueba; la
  parte de Vault (guardar/descifrar) está verificada. Consulta en vivo continua = futuro.

### (Histórico) — Diferida
- **Fecha:** 2026-06-27 · **Estado original:** Diferida (decisión del usuario)
- **Contexto:** Es la única pieza de Ola 1 con manejo de credenciales externas + egress
  (SSRF), y no hay una base externa de prueba para verificar end-to-end.
- **Decisión:** Posponerla. Hacerla después con cuidado (credenciales cifradas vía Vault/
  pgsodium, Edge Function de salida con rol read-only, validación) y contra un objetivo real.
- **Consecuencias:** Ola 1 se cierra con 4/5 features entregadas. `data_sources.type`
  ya contempla `external_pg`, así que el modelo está listo para retomarla sin migración disruptiva.

---

## D-005 — Esquemas: metadatos en `public`, datos materializados en `tenant_data`

- **Fecha:** 2026-06-27 · **Estado:** Aceptada (matiz al PLAN.md §4)
- **Contexto:** El PLAN sugiere un esquema `app` para metadatos. Exponer esquemas no-`public`
  vía la API de Supabase requiere configuración extra (Exposed schemas).
- **Decisión:** Tablas de **metadatos** (tenants, datasets, charts, ...) en `public` para que
  `supabase-js`/PostgREST funcionen sin fricción. El esquema `app` queda para **funciones
  internas** (helpers RLS + auth hook, no expuestas). Los **datos materializados de tenants**
  (CSV, etc.) van en `tenant_data`, **no expuesto**, accesible sólo vía Edge Functions.
- **Consecuencias:** Se preserva la frontera de seguridad crítica (los datos crudos de tenant
  nunca se exponen por API). Mismo modelo de RLS por `tenant_id` en todo.

## D-006 — Resolución de tenant en RLS: claim JWT + fallback a `profiles`

- **Fecha:** 2026-06-27 · **Estado:** Aceptada (matiz al PLAN.md §4, que prevé sólo el hook)
- **Contexto:** El plan inyecta `tenant_id` en el JWT vía access token hook, que requiere un
  paso de configuración manual en el dashboard. Sin él, la app no arranca (huevo-gallina).
- **Decisión:** Los helpers (`app.current_tenant_id()`, etc.) leen primero el claim del JWT y,
  si falta, hacen fallback a `public.profiles` por `auth.uid()`, usando `SECURITY DEFINER`
  para evitar recursión de RLS.
- **Consecuencias:** La app funciona sin habilitar el hook. El hook queda como optimización
  opcional (evita un lookup por request). El aislamiento se mantiene intacto (la suite de
  tests sigue en PASS).

---
