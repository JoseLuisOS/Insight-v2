# Pendientes de producto

Este archivo reúne ideas que el usuario dejó para una etapa posterior. Se agregan entradas **solo cuando el usuario lo pida**; no conviertas un pendiente en requisito de la entrega actual sin una decisión explícita. Para ubicar código y documentos vigentes, consulta el [índice](README.md).

## Gráficas v2 — organización y reutilización

**Origen:** observaciones del desarrollador en la [entrevista de Gráficas v2](ENTREVISTA_GRAFICAS_V2.md), 2026-10-06. **Estado:** por definir después del primer alcance del editor avanzado.

- Carpetas o proyectos para organizar gráficas.
- Favoritos.
- Biblioteca de gráficas guardadas, con posible uso interno y compartido.
- Reglas de acceso y navegación de esa biblioteca cuando se defina su alcance.

## Gráficas v2 — catálogo avanzado posterior al alcance inicial

**Origen:** solicitud del usuario del 2026-10-06 de preparar una biblioteca amplia de visualizaciones avanzadas. **Estado:** ampliación posterior; la arquitectura inicial se describe en la [especificación](ESPECIFICACION_GRAFICAS_V2.md).

- Ampliar el catálogo más allá de dispersión, histograma y boxplot según necesidades analíticas concretas.
- Evaluar un adaptador G2 para tipos donde demuestre ventajas sobre ECharts, antes de añadir otra dependencia de renderizado.
- Evaluar [D3.js](https://d3js.org/) para visualizaciones especiales que requieran construir geometría o interacción a medida; compararlo con ECharts y G2 mediante un caso concreto antes de integrarlo.

## Visualización — módulos heredados de v1

**Origen:** solicitud del usuario del 2026-10-07, tras la galería de Gráficas y Dashboards. **Estado:** por definir; son pantallas de v1 que leen tablas `public` que ya no existen en la base conectada.

- Mapas (`/maps`): convertirlo en biblioteca de mapas GeoJSON de la organización sobre `insight_core.core_chart_maps`, usable desde el editor de Gráficas.
- Temas (`/themes`): convertirlo en paletas de la organización en v2 (requiere tabla nueva) y ofrecerlas en el editor.
- Dashboards: visibilidad dentro de la organización (como en Gráficas) y vista de solo lectura para el equipo.
- `/charts/new?dataset=…`, `/charts/[id]` y `/charts/[id]/edit`: retirar el editor y visor heredados.
- Compartir dispersiones de Dataset: hoy la instantánea guarda hasta 600 puntos individuales; decidir si se permite, se agrega en celdas o se bloquea.
