# 8. Dashboards — v1

- **Continuidad v2 en construcción:** `/dashboards` es una galería de dashboards con miniaturas que reproducen la composición (hasta seis mosaicos): `listDashboardGallery` en `src/lib/chart-gallery.ts` la alimenta y `src/components/charts/{dashboard-gallery,new-dashboard-dialog}.tsx` arman la pantalla y el diálogo «Nuevo dashboard»; ya no consulta la tabla heredada `dashboards`; `/dashboards/v2/[id]` reúne gráficas v2 de Encuestas y datasets; `/p/dashboards/[token]` muestra snapshots públicos. `src/lib/dashboard-v2.ts` resuelve datos y permisos; `src/components/{dashboard-v2-controls,dashboard-v2-view}.tsx` gestiona composición, layout arrastrable, filtros interactivos por campo de dataset o pregunta categórica de Encuestas, y exportación. El filtro de Encuestas se autoriza y recalcula en `filterDashboardV2Surveys` (`src/app/(app)/dashboards/v2/actions.ts`) para gráficas de la misma versión; los snapshots públicos conservan los resultados al publicarse. La ruta heredada `/dashboards/[id]` permanece, pero depende de tablas `public` ausentes en el PostgreSQL conectado.

- **Descripción:** lista, creación, edición y visualización de paneles que combinan gráficas, filtros y layouts.
- **Archivo principal:** `src/lib/dashboards.ts` (`getDashboardData`).
- **Archivos relacionados:** `src/app/(app)/dashboards/{page.tsx,actions.ts,publish-actions.ts,[id]/page.tsx,[id]/edit/page.tsx}`; `src/components/{dashboard-editor,dashboard-view,auto-refresh,publish-dialog}.tsx`; `src/lib/{charts,datasets,maps}.ts`.
- **Funciones/componentes importantes:** `getDashboardData`, `createDashboard`, `createDashboardAndEdit`, `saveDashboard`, acciones de publicación; `DashboardEditor`, `DashboardView`.
- **Padres:** shell y Supabase.
- **Hijos:** gráficas, filas de datos, filtros, layouts y diálogo de publicación.
- **Hermanos/interacciones:** consume módulos de datasets, visualización y mapas; comparte el flujo de publicación con Gráficas.
- **Entidades observadas:** `dashboards`, `dashboard_items`, `dashboard_filters`, `charts`.
