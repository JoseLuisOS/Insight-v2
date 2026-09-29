# Intersel Insight

Aplicación para crear, explorar y publicar visualizaciones y dashboards. El modelo objetivo es **multi-organización, no multitenant**: una instalación corresponde a un deployment y puede alojar varias organizaciones. Los usuarios pertenecen a la instalación y pueden tener memberships, roles y permisos distintos por organización. `organization_id` define pertenencia y aislamiento de datos; no existe un `installation_id` en el modelo objetivo.

> **Estado de implementación:** el código todavía contiene contratos heredados como `tenant_id`, `profiles` y `tenants`. No asumir que el modelo objetivo ya está implementado en toda la aplicación o en la base de datos. Consulta el código del flujo afectado y registra las diferencias antes de modificarlo.

## Documentos de referencia

| Documento | Uso |
|---|---|
| [docs/MAPA_MODULOS.md](docs/MAPA_MODULOS.md) | Índice del código actual, rutas, módulos y dependencias inmediatas. |
| [docs/BITACORA.md](docs/BITACORA.md) | Registro de cambios y motivación de la evolución v2. |
| [docs/GUIA_MIGRACION_V1_A_V2.md](docs/GUIA_MIGRACION_V1_A_V2.md) | Procedimiento enfocado para adaptar módulos v1 al modelo organizacional. |
| [ARQUITECTURA_BBDD.md](ARQUITECTURA_BBDD.md) | Modelo objetivo multi-organización e IAM, designado por el usuario. |
| [AGENTS.md](AGENTS.md) | Reglas de trabajo eficientes y consulta de documentación local de Next.js. |
| [.claude/skills/insight-v2/SKILL.md](.claude/skills/insight-v2/SKILL.md) | Contexto operativo para trabajar en este proyecto. |

Los demás Markdown del repositorio están pendientes de revisión y no se consideran contratos vigentes. Algunos conservan decisiones anteriores de producto, arquitectura, seguridad o infraestructura.

## Estado de versiones

El código de aplicación documentado se considera v1, excepto el módulo Perfil, que el usuario identificó como v2. Consulta [docs/MAPA_MODULOS.md](docs/MAPA_MODULOS.md) para ver rutas y archivos. La etiqueta v2 no implica que el módulo ya use `organization_id` o esté completamente integrado con memberships; eso se verifica por separado.

## Stack declarado

- Next.js `16.2.9`, React `19.2.4` y TypeScript.
- Supabase para autenticación, persistencia y funciones Edge.
- Apache ECharts para visualización.

Consulta `package.json` para dependencias y comandos vigentes.

## Desarrollo local

```bash
npm install
npm run dev
```

Configura las variables requeridas a partir de `.env.example`. No incluyas secretos en el repositorio ni en documentación.
