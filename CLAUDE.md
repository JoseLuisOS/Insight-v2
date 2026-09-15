# CLAUDE.md — Intersel Insight

Guía operativa para Claude Code en este repositorio. Léela al inicio de cada sesión.

## Qué es esto

**Intersel Insight** — plataforma SaaS **multi-tenant** de creación y visualización de
dashboards. Combina la capa de análisis (datasets, SQL, dashboards) con la capa de
publicación/embed (gráficas publication-ready, embebibles en sitios externos).

La fuente de verdad del alcance, arquitectura y roadmap es **[docs/PLAN.md](docs/PLAN.md)**.
No re-deduzcas decisiones ya tomadas ahí; consúltalo.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS.
  ⚠️ Esta versión de Next tiene breaking changes vs. el conocimiento previo. **Antes de
  escribir código de Next, lee la guía relevante en `node_modules/next/dist/docs/`** (ver
  `AGENTS.md`).
- **UI:** shadcn/ui (pendiente de instalar) + tokens de marca.
- **Gráficas:** Apache ECharts (`echarts` + `echarts-for-react`).
- **Backend/DB:** Supabase (Postgres 17, Auth, Edge Functions, Storage).
- **Deploy:** Vercel (frontend) + Supabase cloud (backend).

## Infraestructura cloud (ya provisionada)

- **Supabase project:** `intersel-insight` — ref `kytvxyjvnxamqdrhwezw`, región `us-east-1`,
  organización `ioxyfptmrqcuetaotkua`. Gestionado vía el **MCP de Supabase** en la sesión.
- **GitHub:** repo bajo la cuenta `arturodiazmo` (ver `git remote -v`).
- **Vercel:** se importa el repo de GitHub (flujo de import en vercel.com).

> Las claves/secretos NUNCA se commitean. Variables de entorno en `.env.local` (gitignored)
> y en el dashboard de Vercel. Ver `.env.example` para la lista requerida.

## Principio de seguridad rector (no negociable)

**Dos rutas de ejecución asimétricas** (detalle en PLAN.md §3 y §6):

1. **Ruta interna autenticada** — corre bajo RLS del usuario (su `tenant_id` + rol). Toda
   ejecución de SQL pasa por una Edge Function con un rol read-only `app_readonly`
   (`NOBYPASSRLS`). El cliente nunca recibe credenciales ni manda SQL con `service_role`.
2. **Ruta pública/anónima** — NUNCA toca la BD en vivo. Sólo sirve **snapshots**
   pre-computados, con el `tenant_id` forzado del lado servidor al generarlos.

**Aislamiento cross-tenant = 0 fugas.** Es criterio de salida de Fase 0 y gate de CI.
Toda tabla con `tenant_id` lleva RLS capa 1. Ver PLAN.md §4.

## Convenciones

- **Idioma:** UI en **español (México)**, arquitectada para i18n. **Código y comentarios en
  inglés.** Documentación de proyecto (`docs/`) en español.
- **Marca:** acento primario `#4377BC` (azul Intersel); modo claro/oscuro como ciudadanos de
  primera clase (tokens semánticos, no colores hardcodeados). Paletas de datos seguras para
  daltonismo por defecto. Ver PLAN.md §7.
- **Migraciones:** vía MCP de Supabase (`apply_migration`), en `snake_case`. Mantener una
  copia versionada en `supabase/migrations/` cuando exista esa carpeta.
- **Secretos:** jamás en el repo ni en logs.

## Estructura del repo

```
intersel-insight/
├── CLAUDE.md            ← este archivo
├── AGENTS.md            ← reglas de Next.js 16 (leer docs locales antes de codear)
├── README.md
├── .env.example         ← variables de entorno requeridas (sin valores reales)
├── docs/
│   ├── PLAN.md          ← fuente de verdad: alcance, arquitectura, roadmap
│   ├── LOG.md           ← bitácora de desarrollo (cronológica, append-only)
│   ├── APRENDIZAJES.md  ← aprendizajes técnicos y del dominio
│   └── DECISIONES.md    ← registro de decisiones (ADR ligero)
├── logs/                ← logfiles de sesiones/tareas (gitignored salvo README)
├── src/app/             ← Next.js App Router
└── supabase/            ← migraciones / edge functions (cuando aplique)
```

## Flujo de trabajo (importante)

Mantén la disciplina de bitácora — el usuario lo pidió explícitamente:

1. **Al terminar una tarea o sesión relevante**, agrega una entrada a `docs/LOG.md`.
2. **Cuando descubras algo no obvio** (un gotcha de Next 16, un detalle de RLS, una API de
   Supabase), agrégalo a `docs/APRENDIZAJES.md`.
3. **Cuando tomes una decisión de arquitectura**, regístrala en `docs/DECISIONES.md`.
4. Sigue el roadmap del PLAN.md §8 (Fase 0 → MVP por épicas → Olas 1-3).

## Comandos

```bash
npm run dev      # desarrollo local
npm run build    # build de producción (lo que corre Vercel)
npm run lint     # eslint
```

@AGENTS.md
