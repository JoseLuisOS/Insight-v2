# Intersel Insight

Plataforma **multi-organización** de creación y visualización de dashboards. Una instalación
puede alojar varias organizaciones (aislamiento lógico vía `organization_id`, no una BD por
cliente); los usuarios son globales a la instalación y pueden pertenecer a una o varias
organizaciones con roles distintos en cada una. Combina la capa de análisis (datasets, SQL,
dashboards) con una capa de publicación/embed para gráficas publication-ready.

> ⚠️ **En refactor activo (desde 2026-09-21).** El diseño original (multi-tenant clásico,
> documentado en `docs/PLAN.md`) fue reemplazado por el modelo multi-organización de
> [`ARQUITECTURA_BBDD.md`](ARQUITECTURA_BBDD.md). La fuente de verdad viva es
> **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** — léelo antes de asumir nada del código o
> de `docs/PLAN.md`.

## Stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui
- **Gráficas:** Apache ECharts
- **Backend:** Supabase (Postgres 17 · Auth · Edge Functions · Storage)
- **Deploy:** Vercel + Supabase cloud

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | **Fuente de verdad viva** (índice) — BD, IAM, dominios, seguridad, despliegue |
| [ARQUITECTURA_BBDD.md](ARQUITECTURA_BBDD.md) | Spec original del modelo IAM multi-organización que originó el refactor |
| [docs/MANUAL.md](docs/MANUAL.md) | Manual de configuración, uso y recomendaciones |
| [docs/PLAN.md](docs/PLAN.md) | *Legacy* — alcance/UI/stack siguen vigentes; modelo de datos y seguridad, no |
| [docs/LOG.md](docs/LOG.md) | Bitácora cronológica de desarrollo |
| [docs/APRENDIZAJES.md](docs/APRENDIZAJES.md) | Aprendizajes técnicos y del dominio |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Registro de decisiones (ADR ligero) |
| [CLAUDE.md](CLAUDE.md) | Guía operativa para desarrollo asistido |
| [.claude/skills/insight-v2](.claude/skills/insight-v2/SKILL.md) | Skill del proyecto: conexión de BD, qué es legacy, gotchas |

## Base de datos

Una sola base de datos Supabase para toda la instalación (proyecto ref `bkeiyculoypaisbpjvln`,
documentado con credenciales en `.env`, gitignored — ver `.env.example` para las variables
requeridas). Detalle de roles/permisos en [docs/ARQUITECTURA.md §1](docs/ARQUITECTURA.md#1-base-de-datos).

## Desarrollo

```bash
cp .env.example .env   # rellena con los valores reales (pídeselos a otro miembro del equipo)
npm install
npm run dev             # http://localhost:3000
```

Verificado funcionando (2026-09-21). Detalle en
[docs/ARQUITECTURA.md §5](docs/ARQUITECTURA.md#5-frontend--despliegue-local).

---

© Intersel. Acento de marca `#4377BC`.
