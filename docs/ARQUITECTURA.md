# Intersel Insight — Arquitectura

Documento vivo. Fuente de verdad **actual** de arquitectura (reemplaza a `docs/PLAN.md` como
tal — ver nota de vigencia abajo). Se llena por secciones conforme cada pieza se libera; una
sección marcada `pendiente` documenta la intención pero aún no está implementada.

> **Nota de vigencia:** `docs/PLAN.md` documentaba una arquitectura multi-tenant clásica
> (tabla `tenants`, proyecto Supabase `kytvxyjvnxamqdrhwezw`, 23 migraciones en
> `supabase/migrations/`). El 2026-09-21 se decidió reemplazarla por el modelo
> **multi-organización** descrito en [`ARQUITECTURA_BBDD.md`](../ARQUITECTURA_BBDD.md) (raíz
> del repo), sobre la base de datos ya existente documentada en `.env`. `PLAN.md` sigue siendo
> válido para lo que no depende del modelo de datos/tenencia (idioma, marca, stack, Next 16);
> para tenencia, IAM y seguridad de datos, **este documento manda**.

## Índice

1. [Base de datos](#1-base-de-datos)
2. [Identidad y organizaciones (IAM)](#2-identidad-y-organizaciones-iam)
3. [Dominios de datos](#3-dominios-de-datos)
4. [Seguridad de ejecución de queries](#4-seguridad-de-ejecución-de-queries) — *pendiente*
5. [Frontend / despliegue local](#5-frontend--despliegue-local) — *pendiente*
6. [Publicación y embeds](#6-publicación-y-embeds) — *pendiente*

---

## 1. Base de datos

**Una sola base de datos** para toda la instalación (no una por tenant/organización — ver
§2, el aislamiento es lógico vía `organization_id`, no físico).

- **Proyecto Supabase:** ref `bkeiyculoypaisbpjvln`, Postgres 17.6. Documentado (con
  credenciales) en `.env`, gitignored. **No** es el proyecto `kytvxyjvnxamqdrhwezw` que
  aparece en `CLAUDE.md`/`docs/PLAN.md` — ese quedó obsoleto con el refactor.
- **Dos schemas, misma BD:** `platform` (administración: `core_*`/`iam_*`, ver §2) e
  `intersel_insight` (dominios de negocio: `survey_*`, ver §3). El nombre del segundo es
  histórico (heredado del schema original), no implica más apps compartiendo la BD hoy.
  Hoy ambos son propiedad del mismo rol (`intersel_insight_app`), así que la separación es
  organizativa; se vuelve un límite de privilegios real el día que exista un rol más angosto
  que deba poder leer `intersel_insight` pero nunca `platform`.
- **El MCP de Supabase de esta sesión de desarrollo no tiene acceso a este proyecto**
  (pertenece a otra organización de Supabase). Toda operación de BD se hace por conexión
  directa (`pg`/`psql`) con las cadenas de `.env`, no con `mcp__plugin_supabase_supabase__*`.

### Roles de conexión

| Rol | Variable(s) `.env` | Uso | Atributos |
|---|---|---|---|
| `postgres` | `CENTRAL_DATABASE_URL`, `CENTRAL_DATABASE_POOLER` | Solo tareas puntuales de DBA (crear/alterar roles, grants entre esquemas). **Nunca** lo usa la app. | Admin del proyecto Supabase (no es superusuario real de Postgres: `rolsuper=false`, pero sí dueño efectivo de los objetos del proyecto). |
| `intersel_insight_app` | `APP_DATABASE_URL`, `APP_DATABASE_POOLER` | **Rol maestro de la aplicación.** Dueño de los schemas `platform` e `intersel_insight` (y de `private`, ver §2) y de todas sus tablas. Lo usan la app y las migraciones. **Sin `FORCE ROW LEVEL SECURITY`** en ninguna tabla — como dueño, este rol pasa por encima de RLS (igual que `service_role` en Supabase estándar); las políticas de aislamiento solo restringen al rol `authenticated` real. | `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`. `statement_timeout` de sesión: 30s. |

**Limitación conocida:** `intersel_insight_app` no tiene `USAGE` sobre el schema `auth`
(Supabase no le da a `postgres` grant option ahí, así que no se puede otorgar). Tiene `SELECT`
sobre `auth.users` pero no puede usarse hasta resolver el `USAGE` de schema. Cualquier DDL que
declare una FK hacia `auth.users` (p. ej. `core_user_profiles`, ver §2) debe ejecutarse con la
conexión admin (`CENTRAL_DATABASE_URL`) y luego transferir ownership de la tabla nueva a
`intersel_insight_app` (mismo patrón ya usado para las tablas `survey_*` existentes).

### Estado del schema `intersel_insight` (al 2026-09-21)

11 tablas `survey_*` ya en producción (datos de encuestas), todas propiedad de
`intersel_insight_app` desde este refactor: `survey_instruments`, `survey_instrument_versions`,
`survey_sections`, `survey_questions`, `survey_answer_options`, `survey_logic_rules`,
`survey_variables`, `survey_studies`, `survey_observations`, `survey_responses`,
`survey_response_selections`. Todas llevan `organization_id` desde §3 (backfilled a
"Hermosillo ¿Cómo Vamos?").

### Migraciones

`supabase/migrations/0001..0023` corresponden a la arquitectura **abandonada** (tenant única,
proyecto `kytvxyjvnxamqdrhwezw`) — no se aplican a este proyecto. La arquitectura nueva vive en
`scripts/NNN_descripcion.sql` (continúa la numeración ya usada por `001_initial_base_survey.sql`
/ `002_carga_survey_test.sql`), aplicados con `node scripts/run-sql.js <archivo> [--app]`. Ver
el plan [`docs/superpowers/plans/2026-09-21-iam-multi-org-migration.md`](superpowers/plans/2026-09-21-iam-multi-org-migration.md)
para el detalle tarea-por-tarea.

---

## 2. Identidad y organizaciones (IAM)

**Implementado** (2026-09-21) — `scripts/003_platform_iam_foundation.sql` +
`scripts/004_iam_seed_hcv.sql` + `scripts/006_rls_layer1.sql`. Modelo multi-organización de
[`ARQUITECTURA_BBDD.md`](../ARQUITECTURA_BBDD.md) §3–§15, en el schema `platform`:
`core_organizations`, `core_user_profiles`, `iam_platform_admins`,
`iam_organization_memberships`, `iam_roles`, `iam_membership_roles`, `iam_modules`,
`iam_permissions`, `iam_role_permissions`, `iam_user_permission_overrides`, `iam_resources`,
`iam_resource_permissions`.

- Organización única sembrada: `hermosillo-como-vamos` ("Hermosillo ¿Cómo Vamos?"), 6 módulos,
  24 permisos, 5 roles preset (Owner/Administrator/Analyst/Operator/Viewer) con permisos
  asignados.
- Sysadmin "god mode" de la instalación: `joseluis.o.santana@hotmail.com`, vía
  `iam_platform_admins`. **Bootstrap pendiente** — esa persona todavía no tiene cuenta en
  Supabase Auth de este proyecto; `scripts/004_iam_seed_hcv.sql` se re-corre (es idempotente)
  después de su primer login para completarlo.
- **RLS = solo aislamiento por organización** (spec §22–§23, decisión deliberada). La
  autorización por permiso (¿tiene `survey.export`? ¿hay un `iam_user_permission_overrides`?)
  **no** está en RLS — sigue siendo responsabilidad de la capa de aplicación, que debe
  consultar `iam_role_permissions`/overrides antes de una escritura. RLS solo responde "¿esta
  fila es de tu organización?", vía las funciones `private.is_platform_admin()` /
  `private.active_organization_ids()` (`SECURITY DEFINER`, schema `private` no expuesto).
- Cada política `to authenticated` tiene su `GRANT` correspondiente (`USAGE` de schema +
  `SELECT`/`INSERT`/`UPDATE`/`DELETE` por tabla) — RLS por sí sola no basta sin el grant base.
- Ninguna tabla usa `FORCE ROW LEVEL SECURITY`: el rol dueño (`intersel_insight_app`) necesita
  poder migrar/sembrar datos sin que sus propias políticas se lo impidan (ver tabla de roles en
  §1). Las políticas siguen restringiendo por completo al rol `authenticated`.
- Gate de aislamiento: [`scripts/tests/001_iam_isolation_test.sql`](../scripts/tests/001_iam_isolation_test.sql)
  (transaccional, hace `rollback`) — `PASS: cross-organization isolation holds` verificado.
- Si el frontend llega a consultar `platform.*` directo vía `supabase-js`/PostgREST, falta un
  paso manual: agregar `platform` en **Project Settings → Data API → Exposed schemas** del
  dashboard de Supabase (los `GRANT` de SQL no exponen un schema por sí solos).

## 3. Dominios de datos

**Implementado** (2026-09-21) — `scripts/005_survey_organization_id.sql`. `survey_*` (schema
`intersel_insight`) es el primer dominio de negocio bajo `platform.core_organizations`: las 11
tablas llevan `organization_id uuid not null references platform.core_organizations(id)`,
backfilled a `hermosillo-como-vamos`, cada una indexada por `organization_id`.

**Gap conocido, deliberado:** esto es una FK plana en cada tabla, no la cadena de FKs
compuestas `(organization_id, id)` que sugiere `ARQUITECTURA_BBDD.md` §20 para blindar la
consistencia interna (que un `survey_instrument` nunca pueda apuntar a un `survey_study` de
otra organización por un bug de un rol con privilegios). El aislamiento de RLS (§2) **no**
depende de esa cadena — cada tabla valida su propia columna `organization_id`, así que no hay
fuga cross-organización aunque falte la integridad compuesta. Queda como hardening futuro, no
como bloqueante.

Dominios futuros (`analytics_*`, `dashboard_*`, `dataset_*`, `indicator_*`) se documentan aquí
cuando existan, siguiendo el mismo patrón: tablas en `intersel_insight`, `organization_id` +
FK a `platform.core_organizations` desde el día uno.

## 4. Seguridad de ejecución de queries

*Pendiente.* `docs/PLAN.md` §5.2 (Edge Function + rol read-only `app_readonly` +
`NOBYPASSRLS` + límites duros) sigue siendo un buen punto de partida conceptual, pero debe
re-evaluarse contra el modelo de organizaciones de §2 antes de implementarse (los claims RLS
cambian de `tenant_id` a `organization_id` + membership).

## 5. Frontend / despliegue local

**Funciona** (verificado 2026-09-21). El código en `src/` (Next.js 16) usa
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cliente) y
`SUPABASE_SERVICE_ROLE_KEY` (servidor) contra el proyecto `bkeiyculoypaisbpjvln`. Usamos el
**sistema de claves nuevo de Supabase** (`sb_publishable_...` / `sb_secret_...`), no las
legacy en formato JWT — ambas funcionan pero nos quedamos con el formato recomendado actual.

```bash
cp .env.example .env   # rellena con los valores reales
npm install
npm run dev             # http://localhost:3000
```

Verificado: `/` (200), `/login` (200), `/onboarding` y `/(app)/dashboard` (307 → redirigen a
`/login`, comportamiento esperado sin sesión — no hay crash del cliente de Supabase).

*Pendiente:* el código todavía asume el modelo de datos/RLS de `docs/PLAN.md` (tenant único).
Cuando entre la migración IAM de §2, hay que revisar `src/lib/supabase/*` y las queries que
asuman `tenant_id` en vez de `organization_id`.

## 6. Publicación y embeds

*Pendiente.* Ver `docs/PLAN.md` §6 como punto de partida conceptual (snapshots, sin RLS de
usuario en la ruta pública); pendiente de re-evaluar contra §2.
