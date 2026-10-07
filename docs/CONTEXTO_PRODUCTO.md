# Contexto de producto — Intersel Insight

Este resumen separa la intención expresada por el usuario de las propuestas históricas del asistente y del estado implementado. Para detalles, consulta la [conversación de origen](historico/CONVERSACION_VOZ_2026-09-21.md), las [ideas registradas](historico/IDEAS_ORIGEN_2026-09-21.md), la [arquitectura designada](ARQUITECTURA_BBDD.md) y el [mapa del código](MAPA_MODULOS.md).

## Intención confirmada

- Insight se entrega primero a Hermosillo ¿Cómo Vamos? para trabajar datos estadísticos y encuestas. Intersel busca reutilizar el software en otras organizaciones o instalaciones.
- Una instalación es un deployment y puede contener varias organizaciones. Una persona puede pertenecer a varias, con datos y permisos separados por `organization_id`.
- El usuario pidió un administrador global, roles por organización, excepciones individuales de permiso y posibilidad de restringir el acceso a instrumentos concretos.
- Encuestas es un dominio de la plataforma. Los datos externos e indicadores públicos futuros no deben transformarse artificialmente en encuestas; tampoco se acordó exigir una jerarquía universal de proyectos o espacios de trabajo.
- El objetivo de Gráficas v2 comunicado el 2026-10-06 es conservar las capacidades útiles de Gráficas v1 y sumar Encuestas como fuente, con análisis que respete su estructura multidimensional.
- El editor de Gráficas v2 ocupará el área de trabajo: herramientas y filtros a la izquierda, lienzo de edición a la derecha. Incluye personalización de ejes, colores y leyendas, además de visualizaciones estadísticas como dispersión, histogramas y boxplots. La [entrevista](ENTREVISTA_GRAFICAS_V2.md) concreta el alcance de la primera entrega.
- Las gráficas guardadas deben ser visibles solo para su creador, salvo publicación explícita. Carpetas, favoritos y biblioteca interna o compartida están registrados como [pendientes](PENDIENTES.md).

## Estado que condiciona Gráficas v2

- El [mapa de Encuestas](MAPA_DATOS_ENCUESTAS.md) muestra estudio → instrumento → versión → preguntas/variables y observaciones → respuestas/selecciones. La observación es la unidad de registro; una respuesta no equivale a una persona.
- El [módulo Gráficas](MAPA_MODULOS.md#7-visualización-gráficas-mapas-y-métricas--v1) conserva `charts.dataset_id`, filas de dataset y configuración de ejes. Sus consumidores incluyen dashboards y publicación. El listado actual no filtra por `created_by`; la política de lectura versionada de v1 permite a los miembros del tenant leer sus gráficas. El estado aplicado de esa política en la base actual no se ha verificado. La privacidad indicada para v2 exige revisar esta brecha.
- El [plan v1](PLAN.md) y el [manual v1](MANUAL.md) articulan análisis, visualización y publicación como propuesta de producto. Sus detalles de tenencia, seguridad, despliegue y roadmap son históricos. Las capacidades concretas a conservar deben verificarse en el código y definirse en la especificación nueva.

## Decisiones para Gráficas v2

La [entrevista](ENTREVISTA_GRAFICAS_V2.md) confirma distribuciones, cruces, estadística numérica, una versión por gráfica (la más reciente por defecto al crear), inclusión visible de respuestas faltantes o con advertencias y posibilidad de excluirlas. En selección múltiple se podrán alternar porcentajes de personas y de selecciones; también se podrá alternar ponderación. Dispersión, histograma y boxplot entran en la primera entrega. El [diseño de Gráficas v2](ESPECIFICACION_GRAFICAS_V2.md) propone ECharts como primer motor y un catálogo propio, preparado para un adaptador G2 si un tipo futuro lo justifica.
