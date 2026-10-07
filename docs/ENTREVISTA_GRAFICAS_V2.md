# Entrevista breve para especificar Gráficas v2

**Estado:** respuestas y aclaraciones cerradas el 2026-10-06. Las respuestas originales se conservan abajo; las precisiones posteriores están en «Aclaraciones resueltas». La propuesta técnica está en [ESPECIFICACION_GRAFICAS_V2.md](ESPECIFICACION_GRAFICAS_V2.md).

Contexto: [intención del producto](CONTEXTO_PRODUCTO.md), [modelo de Encuestas](MAPA_DATOS_ENCUESTAS.md), [Gráficas v1 en el mapa](MAPA_MODULOS.md#7-visualización-gráficas-mapas-y-métricas--v1).

## 1. Primera entrega útil

¿Qué análisis de Encuestas debe poder guardar una persona como gráfica en la primera entrega? Puedes elegir varios y ordenarlos.

- [x] Distribución de una pregunta: conteos y porcentajes por respuesta.
- [x] Cruce de dos preguntas: categorías de una por categorías de otra, con barras agrupadas/apiladas o tabla.
- [x] Estadística de variable numérica por grupo: promedio, mediana, suma, mínimo o máximo.
- [ ] Comparación entre versiones, instrumentos o periodos.
- [ ] Otro caso concreto: El módulo de Gráficas v2 lo quiero para crear gráficas avanzadas, es decir, tener la capacidad para crear gráficas de dispersión, histogramas, boxplots, etc. Esto es para un equipo de estadísticas, ser capaz de hacer análisis más profundos y visualizaciones más complejas que las que ofrece la primera entrega, quiero un nivel tan alto como Tableau o Power BI, con la capacidad de personalizar los ejes, colores, leyendas y demás elementos de la gráfica.

**Un ejemplo real que quieres construir primero:** Una dimensión respecto a los datos estadísticos del estudio de Percepción Ciudadana, por ejemplo, el porcentaje de género en las personas entrevistadas, edades y nivel socioeconómico, o poder ver su percepción respecto a la seguridad.

## 2. Alcance de los datos

¿La gráfica debe fijar una versión concreta del instrumento o seguir automáticamente la versión más reciente? ¿Debe poder reunir varias versiones o instrumentos, y con qué regla se consideraría equivalente una pregunta entre ellos?

**Respuesta:** Poder elegir entre versiones de insntrumentos, pero por defecto la más reciente. Una versión a la vez.

## 3. Qué entra en el cálculo

Para conteos y porcentajes, ¿qué registros y respuestas deben incluirse por defecto? Señala cómo tratar observaciones parciales/inválidas, `is_missing`, opciones «No sabe/No contesta», respuestas con `quality_status=warning` y preguntas sin respuesta. ¿El porcentaje se calcula sobre todas las observaciones, las que contestaron esa pregunta o el subconjunto después de filtros?

**Respuesta:** Dichas respuestas se deben de incluir en el cálculo, pero con una etiqueta clara, además de tener la opción de excluirlas por medio de un filtro.

## 4. Selecciones múltiples y ponderación

En una pregunta con varias selecciones, ¿quieres porcentaje de personas que eligieron cada opción o porcentaje del total de selecciones? ¿La primera entrega debe aplicar `survey_observations.weight` cuando exista, mostrar ambos conteos o ignorar la ponderación hasta definirla?

**Respuesta:** Así es. Así.

## 5. Filtros y privacidad

¿Qué filtros necesita el creador: respuestas a otras preguntas, estado, fecha, contexto de observación u otros? ¿Una gráfica guardada debe exigir acceso vigente al instrumento a cada lector? Para enlaces públicos, ¿qué resultados agregados se pueden publicar y hay un mínimo de observaciones por celda para evitar mostrar grupos muy pequeños?

**Respuesta:** Una gráfica guardada solo la ve el creador, a menos que la haya puesto pública, pero esta es una función que ya cuenta la versión 1. Continúemos eso. No hay un mínimo. El filtro que se necesita dependerá del instrumento y las dimensiones que se estén usuando.

## 6. Continuidad con Gráficas v1

¿Prefieres que Gráficas v2 reúna en un mismo catálogo las gráficas de datasets y encuestas, o que el editor de Encuestas sea una ruta separada al inicio? De las capacidades actuales —tipos KPI/barras/línea/área/pastel/tabla/mapa, edición, temas, exportación, anotaciones, dashboards y publicación— indica cuáles deben estar disponibles desde la primera entrega para fuentes de Encuestas y cuáles pueden venir después.

**Respuesta:** Sí, V2 es una evolución, que incluso vamos a integrar más funcionalidades. 

## Cierre

Con estas respuestas se redactará una especificación comprobable: ejemplos de consultas, reglas de denominador, permisos, guardado, vistas, dashboards y publicación. Se distinguirá la primera entrega de ampliaciones posteriores.

## Aclaraciones resueltas

- **Selección múltiple:** mostrar ambos porcentajes: personas que seleccionaron cada opción y proporción respecto al total de selecciones; permitir alternar la base.
- **Ponderación:** permitir alternar resultados ponderados y sin ponderar.
- **Tipos avanzados:** dispersión, histograma y boxplot entran juntos en la primera entrega de Gráficas v2.
- **Catálogo futuro:** preparar el módulo para muchas visualizaciones avanzadas. Se evaluarán ECharts y G2; el alcance inicial solo requiere los tres tipos avanzados indicados.
- **Regla ya definida para v2:** una gráfica guardada es privada para su creador, salvo publicación explícita. La implementación v1 debe revisarse frente a esta regla.



## Observaciones del desarrollador
Eventualmente queremos un editor como un panel de herramientas y filtros y un canva para realizar la creación de las gráficas avanzadas. Por lo que uno de los cambios será que será de pantalla completa el módulo dentro de su área de trabajo, con el panel del de herramientas a la izquierda y a la derecha el canva, una vez que se haya entrado en la edición/creación de una gráfica. Además tenemos que tener la posibilidad de usar carpetas/proyectos, favoritos, y tener la posibilidad de tener una "biiblioteca" de gráficos guardados, quizá de uso interno y compartido, pero esto lo veremos más adelánte, ponlo en los pendientes (CREA UN ARCHIVO DE PENDIENTES PARA ESTO, que conforme avancemos en el proyecto iremos agregando pendientes que nos encontremos en diferentes módulos, funcionalidades, ideas, etc. se llena ON DEMAND, cada que te lo pidas).
