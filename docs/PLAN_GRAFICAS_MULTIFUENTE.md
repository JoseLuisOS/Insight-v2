# Plan: editor único y gráficas multifuente

**Estado:** aprobado por el usuario el 2026-10-07. Se ejecuta por fases; cada fase se entrega, verifica y documenta por separado. Fase 1 implementada el 2026-10-07. **Siguiente: Fase 2.**

Para empezar en una conversación nueva: lee este archivo, la skill `insight-dev`, `insight-ux-ui` + [`patrones/graficas-v2.md`](../.claude/skills/insight-ux-ui/patrones/graficas-v2.md) y la ficha [`modulos/visualizacion.md`](modulos/visualizacion.md). No releas la bitácora completa ni la especificación de Gráficas v2 salvo una sección concreta.

## Decisiones del usuario

- Un **solo editor** para crear y editar, cualquiera que sea la fuente.
- Panel **Fuentes** como primera sección del panel de herramientas (izquierda). Cascada por fuente:
  1. Tipo: Encuesta / Dataset (por defecto **Encuesta**).
  2. Estudio (por defecto el primero) — solo Encuesta.
  3. Instrumento (por defecto el primero) — solo Encuesta.
  4. Versión: **solo visible si el instrumento tiene más de una** (por defecto la más reciente).
  Para Dataset: Dataset (por defecto el más reciente), con opción de subir uno nuevo.
- Se pueden **agregar fuentes** con la misma cascada. Cada fuente adicional elige su modo: **Comparar**, **Capas** o **Unir** (expansión de datos). Se pueden **mezclar** Encuesta y Dataset en una misma gráfica.
- «Nueva gráfica» abre **directamente el editor** con los valores por defecto. Se retiran la página de selección de encuesta (`/charts/survey/new` sin parámetros), la de dataset (`/charts/dataset/new` sin parámetros) y el diálogo «¿De dónde vienen los datos?» (`src/components/charts/new-chart-dialog.tsx`).
- Selector de **tipo de gráfica** como cuadrícula de **3 por fila**; cada opción con una miniatura fija (SVG estático ilustrativo, no datos reales) y su nombre.
- El panel no debe ser invasivo: pocos elementos visibles a la vez.

## Diseño de interfaz (Fase 1 y base para las demás)

- **Fuente plegada = una línea**: punto de color de la serie + «Encuesta · Estudio A › Instrumento 1 · v3» (truncado con `title` completo). Clic o Enter la despliega para editar la cascada; solo una fuente desplegada a la vez.
- **Cascada desplegada**: control segmentado Encuesta/Dataset y `select` dependientes; al cambiar un nivel, los inferiores toman su primer valor. Sin encuestas accesibles, el tipo por defecto pasa a Dataset; sin ninguna fuente, estado vacío con enlace a importar una encuesta o subir un dataset.
- **«+ Agregar fuente»**: botón de texto discreto bajo la lista (visible a partir de la Fase 2). La fuente nueva entra desplegada con su cascada y, arriba, el modo en control segmentado (Comparar · Capas · Unir) con una línea de ayuda por modo. Cada fuente adicional tiene menú (⋯) para quitarla.
- **Tipo de gráfica**: cuadrícula `grid-cols-3`, opción como `role="radio"` con miniatura de unos 56 px de alto y su etiqueta; los tipos que la fuente o los campos elegidos no admiten se ven deshabilitados con `title` que explica por qué. La miniatura usa tokens (`currentColor`, `text-primary`, `text-accent-teal`, `text-accent-violet`) para funcionar en ambos temas.
- Las demás secciones (campos, métrica, filtros, estilo) siguen debajo; las exclusivas de Encuestas (base porcentual, ponderación, ausentes, advertencias) solo aparecen si alguna fuente es Encuesta.

## Modelo de datos

- **Definición v3** (`src/lib/chart-v2.ts` o un `chart-v3.ts` nuevo):
  ```ts
  type ChartSourceRef =
    | { key: string; kind: "survey"; studyId: string; instrumentId: string; versionId: string; mode: SourceMode }
    | { key: string; kind: "dataset"; datasetId: string; mode: SourceMode };
  type SourceMode = "base" | "compare" | "layer" | "union"; // la primera fuente siempre "base"
  ```
  Los campos se referencian por **clave de campo** estable entre fuentes: código de variable (Encuesta) o nombre de columna (Dataset); no por UUID de variable. Las capas guardan su propia configuración de campos y métrica.
- **Compatibilidad**: un adaptador lee las definiciones v2 (Encuesta y Dataset) como v3 con una sola fuente; no se reescriben filas existentes.
- **Persistencia**: la fuente principal sigue en `core_charts.source_kind/source_id/source_version_id` (lo usan triggers, índices, galería y dashboards). Las fuentes adicionales van en una tabla nueva `insight_core.core_chart_sources` (organization_id, chart_id, position, kind, source_id, version_id, mode) con FK compuesta a `core_charts` y validación de organización por trigger, como en 024/025. Migración `scripts/030_…` solo en la Fase 2 (la Fase 1 no la necesita).
- **Autorización**: cada fuente se autoriza al cargar (`surveyChartContext` para Encuesta, dataset propio para Dataset). Una gráfica compartida exige al visitante acceso a todas sus fuentes de Encuesta (extender `galleryRows` en `src/lib/chart-gallery.ts`).

## Motor de cálculo

- Hoy: Encuestas carga observaciones en memoria y agrega en servidor (`src/lib/insight-charts.ts`, `computeSurveyChart`, ~93-302; carga en ~135-175, ya con forma «observación = peso + respuestas por variable»). Dataset agrega en el cliente (`src/lib/charts.ts`, `buildEChartsOption`; `src/components/chart-renderer.tsx`).
- Objetivo: **marco común** `Frame = { sourceKey; records: { weight; status; fields: Map<fieldKey, { labels: string[]; numeric: number | null; missing; warning }> }[] }` con un cargador por tipo de fuente, y la agregación actual de Encuestas generalizada sobre `Frame`. Dataset pasa a calcularse en servidor.
  - **Comparar**: agregar cada `Frame` por separado; los puntos llevan `group` = etiqueta de la fuente.
  - **Unir**: concatenar registros de todos los `Frame` y emparejar campos por clave; agregar una vez. Campos ausentes en una fuente cuentan como ausentes, con aviso.
  - **Capas**: cada capa se calcula con su configuración; el renderizador superpone series (p. ej. barras + línea) en los mismos ejes.
- Mapas (solo Dataset hoy) se conservan en Fase 1 por la ruta actual; su paso al motor común se decide en Fase 2.

## Fases

### Fase 1 — Editor único, panel Fuentes (una fuente) y tipos con miniatura
- Componente nuevo de editor (p. ej. `src/components/charts/chart-studio.tsx`) que reemplaza a `survey-chart-studio.tsx` y `chart-editor.tsx` (modo `coreDataset`); el modo heredado v1 de `chart-editor.tsx` queda fuera de alcance.
- Panel Fuentes con una sola fuente (cascada completa, cambio Encuesta↔Dataset). Hasta la Fase 2, cambiar de tipo de fuente usa el cálculo existente de cada tipo detrás de una interfaz común del editor.
- Rutas: `/charts/new` abre el editor con valores por defecto (reemplaza la página v1 heredada); `/charts/survey/[id]` y `/charts/dataset/[id]` usan el mismo editor (o se unifican en `/charts/[id]/edit` reemplazando la ruta v1, a decidir al implementar según el costo de redirecciones). «Nueva gráfica» de la galería y del estado vacío enlaza a `/charts/new`. Se borran el diálogo y las páginas de selección.
- Endpoint o acción de servidor para la cascada: estudios → instrumentos → versiones accesibles (reutilizar `listSurveys` de `src/lib/insight-surveys.ts`) y datasets (`listCoreDatasets` de `src/lib/chart-v2-datasets.ts`), cargados una vez al abrir el editor.
- Selector de tipos con miniaturas SVG (`src/components/charts/chart-type-picker.tsx`).
- Conserva: visibilidad Privada/Organización en la fila superior del lienzo, guardado con instantánea (`preview_json`), publicaciones y anotaciones.
- **Aceptación:** crear y editar gráficas de Encuesta y Dataset desde un único editor; la versión solo aparece con más de una; tsc/eslint limpios; revisión del revisor; documentación (ficha, rutas, patrón UX, bitácora).
- Decisión de rutas: se conservan `/charts/survey/[id]` y `/charts/dataset/[id]` (sin redirecciones); la URL sigue al tipo de la fuente principal tras guardar.

### Fase 2 — Motor común y modo Comparar
- `Frame` + cargadores; Dataset calculado en servidor; definición v3 con adaptador v2; tabla `core_chart_sources` (migración 030); «+ Agregar fuente» con modo Comparar; autorización multifuente en galería, vista compartida, dashboards y publicaciones; instantáneas multifuente.
- Pendientes heredados de la revisión de la Fase 1: (a) el trigger `insight_core.validate_core_chart_source` solo valida la organización de fuentes de Encuesta; agregar la rama Dataset en la migración 030. (b) `loadChartSource` de Dataset envía hasta 5000 filas y el GeoJSON de todos los mapas de la organización; al calcular Dataset en servidor, enviar solo resultados y cargar GeoJSON solo del mapa elegido. (c) La instantánea de galería de Dataset se calcula sobre las primeras 5000 filas.

### Fase 3 — Modos Unir y Capas
- Unir por clave de campo con aviso de campos faltantes; Capas con configuración por capa y superposición de series en el renderizador.

## Reparto sugerido (economía de tokens)

- Líder: diseño de contratos (tipos de v3, props del editor, firmas de acciones) y briefs; revisión final.
- `insight-explorador`: mapear consumidores de `ChartV2Definition`, `SurveyChartStudio` y `ChartEditor` antes de la Fase 1.
- `insight-implementador` en paralelo por archivos disjuntos: (a) selector de tipos con miniaturas; (b) panel Fuentes + carga de la cascada; (c) editor único y rutas.
- `insight-revisor` al cerrar cada fase; `insight-documentador` para ficha, rutas, patrón UX y bitácora.
- Verificación visual con `agent-browser` solo si hay dudas de visualización o el usuario la pide.
