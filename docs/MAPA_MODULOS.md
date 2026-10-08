# Mapa de módulos — Intersel Insight

Índice de navegación del código. **Lee solo este archivo y después el archivo del módulo afectado**; no abras todos. Cada ficha de `modulos/` describe archivo principal, relacionados, funciones, padres, hijos e interacciones. El código es la evidencia final: confirma ahí antes de cambiar.

## Módulos

| Módulo | Ficha | Ver. | Archivo principal | Palabras clave |
| --- | --- | --- | --- | --- |
| Rutas y raíz | [aplicacion](modulos/aplicacion.md) | v1 | `src/app/layout.tsx` | App Router, metadata, `loading.tsx` |
| Sesión y proxy | [sesion](modulos/sesion.md) | v1 | `src/proxy.ts`, `src/lib/supabase/proxy.ts` | login, `getClaims`, guardas, cambio de contraseña |
| Shell y navegación | [shell](modulos/shell.md) | v1 | `src/app/(app)/layout.tsx` | sidebar, header, iconos, loader de navegación, tema |
| Datasets | [datasets](modulos/datasets.md) | v1 | `src/lib/datasets.ts` | ingestión CSV, políticas de fila |
| Fuentes externas | [fuentes](modulos/fuentes.md) | v1 | `src/app/(app)/sources/` | conexiones, Edge `import-external` |
| SQL y consultas | [sql](modulos/sql.md) | v1 | `src/app/(app)/sql/actions.ts` | SQL Lab, query builder |
| Gráficas, mapas, métricas | [visualizacion](modulos/visualizacion.md) | v1 + v2 | `src/lib/charts.ts`, `src/lib/insight-charts.ts` | ECharts, Gráficas v2, editor único, galería, compartidas, instantáneas, temas |
| Dashboards | [dashboards](modulos/dashboards.md) | v1 + v2 | `src/lib/dashboards.ts` | layout, filtros, dashboards v2 |
| Publicación | [publicacion](modulos/publicacion.md) | v1 | `src/app/p/[token]/page.tsx` | embeds, contraseña |
| Usuarios | [usuarios](modulos/usuarios.md) | v2 | `src/components/insight/users-manager.tsx` | membresías, invitaciones |
| Perfil | [perfil](modulos/perfil.md) | v2 | `src/app/(app)/profile/page.tsx` | avatar, contraseña |
| Servicios compartidos | [servicios](modulos/servicios.md) | v1 | `src/lib/supabase/server.ts`, `src/lib/server-log.ts`, `src/lib/insight-db.js` | logs, pool SQL, instrumentación |
| Base de datos y Edge | [base-datos](modulos/base-datos.md) | mixto | `scripts/`, `supabase/` | migraciones, funciones Edge |
| Encuestas | [encuestas](modulos/encuestas.md) | v2 | `src/app/(app)/surveys/`, `src/lib/insight-surveys.ts` | importación, cuestionario, workflow |
| Componentes (catálogo) | [componentes](modulos/componentes.md) | v2 | `src/components/insight/catalog-manager.tsx` | grupos, módulos, estados |
| Organizaciones | [organizaciones](modulos/organizaciones.md) | v2 | `src/components/insight/organizations-manager.tsx` | alta, archivo, zona horaria |
| Permisos | [permisos](modulos/permisos.md) | v2 | `src/components/insight/permissions-manager.tsx` | acciones, `operar` |
| Roles | [roles](modulos/roles.md) | v2 | `src/components/insight/roles-manager.tsx` | matriz de permisos |
| Ver Como | [ver-como](modulos/ver-como.md) | v2 | `src/lib/view-as.ts` | máscara de sysadmin |
| Módulo sin página | [area-provisional](modulos/area-provisional.md) | v2 | `src/app/(app)/workspace/[code]/page.tsx` | aviso de construcción |

## Fichas transversales

- [rutas](modulos/rutas.md): tabla de cada URL → archivo → módulo → versión. Úsala para ir de una URL a su código.
- [relaciones](modulos/relaciones.md): relaciones por flujo entre módulos y contratos técnicos observados.
- [general](modulos/general.md): autoridad del mapa, reglas de versión v1/v2 por archivo y diagrama de conjunto. Ábrela solo si la tarea depende del linaje v1/v2.

## Mantenimiento

1. Al agregar, quitar o mover una ruta o módulo: crea o edita su ficha en `modulos/`, su fila en esta tabla y la tabla de [rutas](modulos/rutas.md).
2. Al cambiar imports o composición entre módulos: actualiza la ficha afectada y, si cruza módulos, [relaciones](modulos/relaciones.md).
3. Al cambiar una acción de servidor, consulta, RPC, autorización o publicación: actualiza la ficha y los contratos de [relaciones](modulos/relaciones.md).
4. Marca como pendiente de verificación lo que no se comprobó en el código; no copies afirmaciones de documentos antiguos.
5. Mantén las fichas cortas: describen dónde está y cómo se relaciona, no reproducen el código.
