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
2. [Identidad y organizaciones (IAM)](#2-identidad-y-organizaciones-iam) — *pendiente*
3. [Dominios de datos](#3-dominios-de-datos) — *pendiente*
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
- **Schema de la app:** `intersel_insight` (una sola BD compartida a nivel de instalación;
  el nombre del schema es histórico, no implica más apps compartiendo la BD hoy).
- **El MCP de Supabase de esta sesión de desarrollo no tiene acceso a este proyecto**
  (pertenece a otra organización de Supabase). Toda operación de BD se hace por conexión
  directa (`pg`/`psql`) con las cadenas de `.env`, no con `mcp__plugin_supabase_supabase__*`.

### Roles de conexión

| Rol | Variable(s) `.env` | Uso | Atributos |
|---|---|---|---|
| `postgres` | `CENTRAL_DATABASE_URL`, `CENTRAL_DATABASE_POOLER` | Solo tareas puntuales de DBA (crear/alterar roles, grants entre esquemas). **Nunca** lo usa la app. | Admin del proyecto Supabase (no es superusuario real de Postgres: `rolsuper=false`, pero sí dueño efectivo de los objetos del proyecto). |
| `intersel_insight_app` | `APP_DATABASE_URL`, `APP_DATABASE_POOLER` | **Rol maestro de la aplicación.** Dueño del schema `intersel_insight` y de todas sus tablas/secuencias. Lo usan la app y las migraciones. | `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`. `statement_timeout` de sesión: 30s. |

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
`survey_response_selections`. Todavía sin `organization_id` — la migración de §2/§3 lo añade.

### Migraciones

`supabase/migrations/0001..0023` corresponden a la arquitectura **abandonada** (tenant única,
proyecto `kytvxyjvnxamqdrhwezw`) — no se aplican a este proyecto. La convención de migraciones
para la arquitectura nueva se define al iniciar el trabajo de §2 (pendiente).

---

## 2. Identidad y organizaciones (IAM)

*Pendiente.* Diseño ya fijado en [`ARQUITECTURA_BBDD.md`](../ARQUITECTURA_BBDD.md) — modelo
multi-organización (`core_organizations`, `iam_platform_admins`,
`iam_organization_memberships`, `iam_roles`/`iam_permissions` con RBAC + overrides +
autorización por recurso). Falta: convertirlo en migración SQL ejecutable contra
`intersel_insight`, con tests de aislamiento cross-organización antes de darlo por hecho.

## 3. Dominios de datos

*Pendiente.* Integrar `survey_*` como el primer dominio bajo `core_organizations`
(agregar `organization_id`, backfill al tenant único "Hermosillo ¿Cómo Vamos?", FKs
compuestas, índices — ver §24 de `ARQUITECTURA_BBDD.md`). Dominios futuros
(`analytics_*`, `dashboard_*`, `dataset_*`, `indicator_*`) se documentan aquí cuando existan.

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
