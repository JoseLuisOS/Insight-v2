# Intersel Insight

Plataforma SaaS **multi-tenant** para crear, visualizar y **publicar** dashboards. Une la capa
de análisis (datasets, SQL, dashboards con filtros) con una capa de publicación/embed de
primera clase: cualquier gráfica o dashboard puede pasar de privado a embebible en un sitio
externo con un flujo limpio, sobre infraestructura multi-tenant segura.

## Stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui
- **Gráficas:** Apache ECharts
- **Backend:** Supabase (Postgres 17 · Auth · Edge Functions · Storage)
- **Deploy:** Vercel + Supabase cloud

## Documentación

| Documento | Contenido |
|---|---|
| [docs/MANUAL.md](docs/MANUAL.md) | **Manual de configuración, uso y recomendaciones** |
| [docs/PLAN.md](docs/PLAN.md) | **Fuente de verdad:** alcance, arquitectura, modelo de datos, seguridad, roadmap |
| [docs/LOG.md](docs/LOG.md) | Bitácora cronológica de desarrollo |
| [docs/APRENDIZAJES.md](docs/APRENDIZAJES.md) | Aprendizajes técnicos y del dominio |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Registro de decisiones (ADR ligero) |
| [CLAUDE.md](CLAUDE.md) | Guía operativa para desarrollo asistido |

## Desarrollo

```bash
cp .env.example .env.local   # y rellena los valores de Supabase
npm install
npm run dev                  # http://localhost:3000
```

## Seguridad (resumen)

Dos rutas de ejecución asimétricas: la **interna autenticada** corre bajo RLS del usuario; la
**pública/anónima** sólo sirve *snapshots* pre-computados con el tenant forzado del lado
servidor. Aislamiento cross-tenant verificado por suite de tests (gate de CI). Detalle en
[docs/PLAN.md](docs/PLAN.md) §3 y §6.

---

© Intersel. Acento de marca `#4377BC`.
