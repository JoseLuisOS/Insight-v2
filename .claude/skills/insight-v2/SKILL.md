---
name: insight-v2
description: Use when working on Intersel Insight / Insight-v2 (this repo) — DB connection strategy, the refactor away from the original multi-tenant PLAN.md design toward multi-organization IAM, which docs are current vs. legacy, and gotchas around the Supabase project this app uses.
---

# Insight-v2 — project reference

## Current state (léelo antes de asumir nada del código heredado)

Este repo es la **evolución** de un primer entregable (`docs/PLAN.md`, arquitectura
multi-tenant clásica, 23 migraciones en `supabase/migrations/`, proyecto Supabase
`kytvxyjvnxamqdrhwezw`). **Esa arquitectura fue reemplazada** por el modelo
multi-organización de `ARQUITECTURA_BBDD.md` (raíz del repo) el 2026-09-21. No la uses
como fuente de verdad para diseño nuevo — es contexto histórico. La fuente de verdad viva es
**[docs/ARQUITECTURA.md](../../../docs/ARQUITECTURA.md)** (índice + secciones que se llenan
conforme se libera cada pieza).

## Base de datos — una sola, y no es la de CLAUDE.md/PLAN.md

- El proyecto Supabase real es el documentado en **`.env`** (`CENTRAL_DATABASE_URL` /
  `CENTRAL_DB_SCHEMA=intersel_insight`), ref `bkeiyculoypaisbpjvln` — **no**
  `kytvxyjvnxamqdrhwezw`. `CLAUDE.md` todavía referencia el ref viejo; no está actualizado.
- **El MCP de Supabase de esta sesión no tiene acceso a este proyecto** (`list_projects` no
  lo muestra — está en otra organización). Para cualquier tarea de BD usa conexión directa
  (`pg` / `psql`) con las cadenas del `.env`, no `mcp__plugin_supabase_supabase__*`.
- Dos roles de conexión, no los confundas:
  - `CENTRAL_DATABASE_URL` / `CENTRAL_DATABASE_POOLER` → rol `postgres` (admin). Solo para
    tareas puntuales de DBA (crear roles, grants entre esquemas). **Nunca** para la app.
  - `APP_DATABASE_URL` / `APP_DATABASE_POOLER` → rol `intersel_insight_app` (maestro de la
    app: dueño del schema `intersel_insight`, `NOSUPERUSER`/`NOCREATEDB`/`NOCREATEROLE`/
    `NOBYPASSRLS`). Esto es lo que usan la app y las migraciones.
  - `intersel_insight_app` **no** tiene `USAGE` sobre el schema `auth` (Supabase no deja que
    `postgres` lo otorgue — no tiene grant option ahí). Cualquier DDL que haga referencia a
    `auth.users` (p. ej. la FK de `core_user_profiles`) debe correr con la conexión admin.

## Migraciones

- `supabase/migrations/0001..0023` son de la arquitectura **abandonada** (tenant/PLAN.md).
  No las apliques a `bkeiyculoypaisbpjvln`. Ver docs/ARQUITECTURA.md para dónde viven las
  migraciones nuevas y con qué convención de nombres.
- El schema `intersel_insight` ya tenía 11 tablas `survey_*` antes de este refactor (datos de
  producción de encuestas). El cambio estructural las integra como dominio (`survey_*`) bajo
  el nuevo modelo de organizaciones — no se reconstruyen desde cero.

## Documentos, en orden de autoridad

1. [docs/ARQUITECTURA.md](../../../docs/ARQUITECTURA.md) — fuente de verdad viva (índice).
2. [ARQUITECTURA_BBDD.md](../../../ARQUITECTURA_BBDD.md) — spec original de la capa IAM
   multi-organización que originó el refactor.
3. [CLAUDE.md](../../../CLAUDE.md) / [docs/PLAN.md](../../../docs/PLAN.md) — **legacy**;
   útiles para entender decisiones de UI/stack/convenciones que siguen vigentes (idioma,
   marca, Next 16), pero su modelo de datos y de seguridad ya no aplica.
