# Bitácora de desarrollo — Insight-v2

Entradas del mes en curso; agrega las nuevas al final leyendo solo las últimas líneas. Meses anteriores en [`bitacora/`](bitacora/) (`AAAA-MM.md`); al iniciar un mes nuevo, mueve allí las entradas del anterior. Para buscar un motivo, usa `rg` sobre `docs/BITACORA.md docs/bitacora/`.

## 2026-10-05 — Aviso para eliminaciones grandes

- **¿Qué?**
  - Los diálogos de estudio e instrumento muestran un aviso antes de sus botones cuando la estimación supera 100,000 respuestas.
- **¿Por qué?**
  - El borrado por lotes puede tardar un par de minutos en catálogos grandes.
- **¿Para qué?**
  - Informar el tiempo esperado y pedir que se mantenga abierto el diálogo mientras termina la operación.

## 2026-10-05 — Eliminación por lotes de datos de encuesta

- **¿Qué?**
  - La eliminación de estudios, instrumentos y versiones procesa respuestas y observaciones en lotes de 1,000 filas dentro de la transacción.
- **¿Por qué?**
  - Una sola sentencia para borrar todos los datos de un estudio excedía el `statement_timeout`.
- **¿Para qué?**
  - Mantener la eliminación atómica y evitar que una sentencia masiva agote su límite de ejecución.

## 2026-10-05 — Borrado de estudios con observaciones

- **¿Qué?**
  - La eliminación de un estudio borra las observaciones de todas sus versiones antes de eliminar el estudio y sus instrumentos.
- **¿Por qué?**
  - La FK de `survey_observations.instrument_version_id` restringe el borrado en cascada de las versiones.
- **¿Para qué?**
  - Permitir que la eliminación confirmada del estudio complete en una transacción junto con sus respuestas y demás datos dependientes.

## 2026-10-04 — Búsqueda del instrumento al importar

- **¿Qué?**
  - El buscador de instrumento sugiere instrumentos de estudios seleccionados o coincidentes con el texto del estudio, e identifica el estudio asociado al elegir una sugerencia.
- **¿Por qué?**
  - Las sugerencias solo aparecían después de seleccionar exactamente el estudio, por lo que el campo parecía un texto simple.
- **¿Para qué?**
  - Hacer visible la búsqueda de instrumentos previos y mantener la posibilidad de escribir nombres nuevos.

## 2026-10-04 — Nombres en las barras y borrado de observaciones

- **¿Qué?**
  - Las barras de estudio e instrumento muestran sus nombres en negritas. La eliminación de versiones borra antes sus observaciones y respuestas dependientes.
- **¿Por qué?**
  - Las barras tenían etiquetas genéricas y la restricción de clave foránea de las observaciones impedía eliminar versiones.
- **¿Para qué?**
  - Identificar claramente el elemento administrado y permitir eliminar versiones junto con los datos que pertenecen a ellas.

## 2026-10-04 — Eliminar cuestionario desde su resumen

- **¿Qué?**
  - La acción y el diálogo para eliminar versiones se movieron del detalle interno al pie del resumen del instrumento, junto a su metadata y antes de abrir el cuestionario.
- **¿Por qué?**
  - La barra debía estar disponible desde la vista de resumen del instrumento, como la acción del estudio.
- **¿Para qué?**
  - Mantener la administración del instrumento en su contexto de catálogo y dejar el cuestionario dedicado al análisis.

## 2026-10-04 — Barra de eliminación al pie del cuestionario

- **¿Qué?**
  - La acción para eliminar versiones del cuestionario se reubicó al pie del área de trabajo, debajo de los paneles de análisis o de la tabla, con el estilo del pie de eliminación del estudio.
- **¿Por qué?**
  - La barra anterior aparecía dentro de la columna de análisis y se desplazaba con su contenido.
- **¿Para qué?**
  - Mantener la acción accesible en el mismo lugar mientras se navega por las preguntas, las respuestas y la tabla.

## 2026-10-04 — Eliminación de estudios y confirmación por nombre

- **¿Qué?**
  - Se añadió la eliminación de estudios con todos sus instrumentos y datos descendientes. El estudio y el cuestionario ahora exigen escribir su nombre para confirmar; la selección de versiones del cuestionario se conserva.
- **¿Por qué?**
  - Faltaba administrar el estudio completo y la confirmación anterior podía activarse sin identificar explícitamente el elemento que se iba a borrar.
- **¿Para qué?**
  - Permitir una eliminación consciente, con permisos y visibilidad comprobados en el servidor, y conservar el historial de importaciones desvinculado.

## 2026-10-04 — Título por vista en Encuestas

- **¿Qué?**
  - Encuestas, Estudios, Importar cuestionario, Cuestionario, Tabla de registros y Registros declaran metadatos de título en sus rutas; las vistas activas también actualizan el título y se reflejan en la URL. Se fijó como regla que cada vista tenga título de documento y encabezado visible.
- **¿Por qué?**
  - El título dependía solo de un efecto del cliente y no estaba presente de forma fiable en la respuesta inicial; tampoco distinguía las vistas que se seleccionan mediante parámetros.
- **¿Para qué?**
  - Identificar la vista activa al navegar y conservar títulos claros en todas las páginas.

## 2026-10-04 — Búsqueda de estudios e instrumentos al importar

- **¿Qué?**
  - Los nombres del formulario sugieren coincidencias del catálogo visible según organización y estudio, admiten texto nuevo y muestran el código existente cuando hay coincidencia exacta.
- **¿Por qué?**
  - Era necesario localizar y reutilizar estudios e instrumentos previos sin perder la posibilidad de crear otros.
- **¿Para qué?**
  - Reducir errores de nombre y anticipar el código que conservará una carga reutilizada.

## 2026-10-04 — Aviso de versión duplicada

- **¿Qué?**
  - La versión repetida aparece en un único aviso rojo con borde punteado y fondo translúcido, junto con el enlace para revisar la encuesta o carga. Se usa el token `danger` del tema y la representación excluye el error general.
- **¿Por qué?**
  - El mensaje se duplicaba entre un error general y un banner azul; el primer ajuste usó el token inexistente `destructive`, por lo que tampoco se veía rojo.
- **¿Para qué?**
  - Hacer evidente el conflicto y la siguiente versión disponible sin repetir el aviso.

## 2026-10-04 — Folios previos al importar encuestas

- **¿Qué?**
  - El formulario muestra el siguiente folio de estudio e instrumento según los contadores de la organización, con el mismo formato que usa la reserva definitiva.
- **¿Por qué?**
  - Las dos vistas previas estaban fijas en `A001` aunque ya existieran cargas nuevas.
- **¿Para qué?**
  - Anticipar códigos coherentes al crear un estudio e instrumento sin alterar la reserva atómica al preparar la carga.

## 2026-10-04 — Enlace del registro en el análisis

- **¿Qué?**
  - El acceso a la tabla pasó del valor de respuesta al código del registro; la flecha se muestra en hover y foco de teclado.
- **¿Por qué?**
  - El código identifica el registro completo y es el punto natural para volver a la tabla.
- **¿Para qué?**
  - Mantener legibles los valores y conservar el foco en la fila y celda relacionadas.

## 2026-10-04 — Regreso de respuestas a la tabla

- **¿Qué?**
  - Cada respuesta de una pregunta abre la página de tabla que contiene su registro y destaca la celda de la variable correspondiente.
- **¿Por qué?**
  - La navegación desde la tabla al análisis de pregunta necesitaba un camino de regreso al dato concreto.
- **¿Para qué?**
  - Mantener el contexto de registro y respuesta al alternar entre ambas vistas.

## 2026-10-04 — Foco y carga de preguntas en el cuestionario

- **¿Qué?**
  - El menú centra la pregunta activa después de navegar y la carga se muestra desde el clic, tanto en el panel como al entrar desde la tabla.
- **¿Por qué?**
  - El menú volvía al inicio y las transiciones breves no siempre mostraban una señal de carga.
- **¿Para qué?**
  - Mantener visible la selección y confirmar de inmediato que el análisis está cargando.

## 2026-10-04 — Navegación desde columnas del cuestionario

- **¿Qué?**
  - Los encabezados de la tabla abren la pregunta exacta en «Por pregunta»; los IDs de registro dejaron de ser enlaces y la antigua pantalla de respuestas redirige al cuestionario.
- **¿Por qué?**
  - La tabla ya concentra la lectura por registro y la pantalla separada duplicaba esa función.
- **¿Para qué?**
  - Pasar de la matriz al análisis de una pregunta sin abandonar el cuestionario.

## 2026-10-04 — Vista tabular del cuestionario

- **¿Qué?**
  - Se agregó el selector «Tabla / Por pregunta» y una matriz paginada de registros y variables con tamaños de 25 a 500 filas.
- **¿Por qué?**
  - El cuestionario solo permitía revisar el análisis de una pregunta a la vez.
- **¿Para qué?**
  - Consultar respuestas completas por registro sin salir del instrumento y cargar solo el bloque visible.

## 2026-10-04 — Registros de pregunta en el panel de análisis

- **¿Qué?**
  - «Ver registros» ahora sustituye las estadísticas por respuestas paginadas dentro del mismo panel, con «Volver a Estadísticas»; la ruta anterior redirige a la vista integrada.
- **¿Por qué?**
  - Consultar respuestas por pregunta obligaba a abandonar el análisis del cuestionario.
- **¿Para qué?**
  - Alternar entre estadísticas y registros sin salir del cuestionario.

## 2026-10-04 — Títulos de pestaña por módulo

- **¿Qué?**
  - El título del navegador ahora identifica el módulo activo y agrega el submódulo en rutas anidadas.
- **¿Por qué?**
  - La pestaña mantenía siempre el nombre genérico de la aplicación.
- **¿Para qué?**
  - Reconocer la sección abierta al cambiar entre módulos y páginas internas.

## 2026-10-04 — Barra de acciones y formato de fechas en Encuestas

- **¿Qué?**
  - Se movió Eliminar a una barra debajo del análisis y se formatearon las fechas de vigencia antes de renderizarlas.
- **¿Por qué?**
  - La acción debía quedar separada del panel y los valores `Date` de PostgreSQL provocaban un error de renderizado en React.
- **¿Para qué?**
  - Mantener el análisis despejado y mostrar fechas sin pasar objetos directamente como contenido.

## 2026-10-04 — Bloqueo de scroll durante el análisis

- **¿Qué?**
  - El área de análisis de Encuestas vuelve arriba y bloquea el desplazamiento mientras carga una pregunta; lo libera al recibirla.
- **¿Por qué?**
  - El indicador de carga debe permanecer visible y el contenido anterior no debe seguir desplazándose durante la espera.
- **¿Para qué?**
  - Mantener el foco en el estado de carga hasta mostrar el análisis solicitado.

## 2026-10-04 — Loader compartido en Encuestas

- **¿Qué?**
  - Se reutilizó `CubeLoader` en la carga del cuestionario y del análisis de pregunta, con el texto centrado debajo.
- **¿Por qué?**
  - Encuestas usaba un indicador distinto al estado de carga inicial del panel.
- **¿Para qué?**
  - Mantener una señal de carga consistente en las dos navegaciones de Encuestas.

## 2026-10-04 — Metadatos y gestión de versiones en Encuestas

- **¿Qué?**
  - Se expandió automáticamente el estudio activo, se añadieron fecha, autor y procedencia al detalle del instrumento, indicadores de carga para el cuestionario y sus preguntas, y eliminación selectiva de versiones con confirmación.
- **¿Por qué?**
  - La navegación no reflejaba la selección activa, el análisis tardaba sin señal visible y faltaba contexto y control sobre versiones cargadas.
- **¿Para qué?**
  - Consultar mejor el origen del instrumento, percibir la carga y retirar versiones o cuestionarios desde su vista con autorización `survey.delete`.

## 2026-10-04 — Espacio de Encuestas y análisis por pregunta

- **¿Qué?**
  - Se organizó la pantalla principal en catálogo por estudio, resumen contextual y tarjeta de importación; el cuestionario ahora muestra preguntas, métricas, distribución y selector de versión.
- **¿Por qué?**
  - El listado y el detalle anteriores separaban el contexto del análisis y dejaban las respuestas fuera de la vista inmediata.
- **¿Para qué?**
  - Localizar instrumentos por estudio y analizar cada pregunta y versión dentro del área de trabajo.

## 2026-10-04 — Respuestas por pregunta en Encuestas

- **¿Qué?**
  - Cada pregunta del Cuestionario abre sus respuestas paginadas por registro, con enlace al detalle completo de cada registro.
- **¿Por qué?**
  - Las filas de preguntas parecían seleccionables, pero no tenían ninguna acción.
- **¿Para qué?**
  - Consultar una pregunta en todos los registros sin perder la vista existente por registro.

## 2026-10-04 — Marca de tiempo en logs de aplicación

- **¿Qué?**
  - Se centralizó la emisión de errores del servidor con fecha y hora `YYYY/MM/DD HH24:MI:SS.SSS` y se agregó escritura en `logs/application.log`.
- **¿Por qué?**
  - Los mensajes existentes no indicaban cuándo ocurrió cada error.
- **¿Para qué?**
  - Facilitar la correlación de errores de la aplicación con solicitudes y tareas tanto en la terminal como en un archivo local.

## 2026-10-02 — Prefijos, códigos y versiones de Encuestas

- **¿Qué?**
  - Se agregó el prefijo editable durante el alta de organizaciones, dos secuencias globales independientes por organización y la generación automática de códigos de estudio e instrumento. La carga solicita una versión entera, conserva la subversión en base y señala las cargas duplicadas.
- **¿Por qué?**
  - Los códigos manuales permitían inconsistencias y el flujo no distinguía versiones de un instrumento existente.
- **¿Para qué?**
  - Reutilizar estudio e instrumento por nombre, mantener sus códigos y crear nuevas versiones sin repetir la misma encuesta y versión en una organización.

## 2026-10-02 — Corrección de Ver Como

- **¿Qué?**
  - Se corrigió la validación de UUID y se colocó la banda de la máscara encima de la cabecera, con el correo y la acción «Salir».
- **¿Por qué?**
  - La validación rechazaba IDs válidos y el indicador ocupaba más espacio del solicitado.
- **¿Para qué?**
  - Permitir activar la máscara y mantener su identidad visible sin desplazar el contenido del panel.

## 2026-10-02 — Ver Como en Usuarios

- **¿Qué?**
  - Se añadió la acción Ver Como para Sysadmin en miembros activos, con contexto visible y salida desde el shell.
- **¿Por qué?**
  - Sysadmin necesita revisar la experiencia de un miembro sin perder sus facultades de administración.
- **¿Para qué?**
  - Identificar el usuario y la organización bajo revisión mientras las operaciones siguen atribuidas a la cuenta real.

## 2026-10-02 — Manual técnico de carga de Encuestas

- **¿Qué?**
  - Se documentaron validaciones por formato, contratos de entrada, pasos de Workflow, tablas, controles de acceso, diagnóstico y límites operativos.
- **¿Por qué?**
  - El flujo tiene particularidades por formato y detalles de operación que no estaban reunidos en un manual técnico.
- **¿Para qué?**
  - Permitir que desarrollo y operación preparen archivos, interpreten fallos y comprendan el recorrido de los datos desde la subida hasta su publicación.

## 2026-10-03 — Seguimiento de cargas desde Encuestas

- **¿Qué?**
  - Las cargas incompletas aparecen en la pantalla principal de Encuestas con su estado y acciones para continuar, revisar errores o reintentar el inicio.
- **¿Por qué?**
  - Una carga ya enviada era visible únicamente tras entrar en «Importar cuestionario», una acción que sugiere crear otra carga.
- **¿Para qué?**
  - Encontrar y resolver una importación pendiente sin iniciar accidentalmente una nueva.

## 2026-10-03 — Fixtures de Encuestas con escenarios cotidianos

- **¿Qué?**
  - Se reemplazaron los identificadores que simulaban preguntas por preguntas sobre compras habituales de despensa y respuestas sintéticas coherentes en ocho archivos.
- **¿Por qué?**
  - Los fixtures anteriores ejercitaban el parser, pero no se parecían a una encuesta que respondería una persona en una situación real.
- **¿Para qué?**
  - Probar la importación con etiquetas comprensibles, opciones plausibles y respuestas que permiten revisar la experiencia completa.

## 2026-10-03 — Sidebar fijo durante el desplazamiento

- **¿Qué?**
  - El sidebar conserva la altura de la ventana y queda anclado arriba mientras el contenido principal se desplaza.
- **¿Por qué?**
  - Al recorrer Encuestas hasta el final, el sidebar se movía junto con la página.
- **¿Para qué?**
  - Mantener la navegación disponible y estable durante el uso del módulo.

## 2026-10-03 — Revisión de valores y eliminación de cargas

- **¿Qué?**
  - La revisión de preguntas muestra hasta 25 valores distintos aleatorios por columna y permite eliminar con confirmación una carga que aún no se procesó.
  - Las acciones Eliminar e Importar se alinean a la derecha y el área principal conserva su propio desplazamiento frente al sidebar.
- **¿Por qué?**
  - El selector anterior parecía editar respuestas en vez de revisar su contenido; una carga errónea necesitaba una salida clara.
- **¿Para qué?**
  - Detectar errores en los datos antes de importar y retirar archivos incorrectos sin dejar una carga pendiente.

## 2026-10-03 — Códigos de preguntas y límite de desplazamiento

- **¿Qué?**
  - Las preguntas importadas reciben códigos consecutivos `P###` y la muestra se limita a 10 valores cuando alguna respuesta de la columna supera siete palabras.
  - El documento del panel deja de desplazarse; el contenido principal y la navegación conservan scroll interno.
  - Las acciones habilitadas del panel muestran el cursor de mano, incluido el botón de pantalla completa del header.
- **¿Por qué?**
  - Los códigos basados en el texto eran largos y variables; las respuestas abiertas ocupaban demasiado espacio, y el scroll raíz permitía bajar más allá del sidebar.
- **¿Para qué?**
  - Mantener identificadores predecibles, revisar valores con una muestra proporcionada y estabilizar la navegación y sus acciones.

## 2026-10-03 — Orden y encabezados de la vista de valores

- **¿Qué?**
  - Los valores distintos se ordenan por texto o número; la etiqueta distingue los valores completos de la muestra aleatoria y la pastilla muestra cuántos se ven.
- **¿Por qué?**
  - El conteo total y la etiqueta anterior no describían con claridad los valores presentados.
- **¿Para qué?**
  - Hacer evidente qué tipo de muestra se revisa y cuántos valores contiene.

## 2026-10-03 — Barras de desplazamiento discretas

- **¿Qué?**
  - Las barras de desplazamiento del panel tienen pista transparente, pulgar de 6 px acorde al tema y no muestran flechas.
- **¿Por qué?**
  - Las barras visibles ocupaban demasiado espacio y añadían controles de flecha innecesarios.
- **¿Para qué?**
  - Mantener disponible el desplazamiento con menos peso visual.

## 2026-10-03 — Corrección de flechas y muestras de valores

- **¿Qué?**
  - Se retiró la propiedad que hacía prevalecer el scroll nativo con flechas; las muestras guardadas se ordenan al mostrarse y el conteo usa una pastilla azul.
  - El encabezado «Valores muestra» aparece cuando la columna supera 25 distintos o aplica el límite de respuestas extensas.
- **¿Por qué?**
  - El navegador seguía usando el scroll nativo y algunas cargas ya validadas conservaban valores desordenados.
- **¿Para qué?**
  - Mostrar la barra y la revisión de valores tal como se definieron para la pantalla.

## 2026-10-03 — Carga inicial de importaciones sin descarga

- **¿Qué?**
  - La lista de importaciones usa la vista previa guardada; el archivo se vuelve a leer al confirmar Importar y entonces se actualiza esa vista previa.
- **¿Por qué?**
  - Descargar archivos durante el render podía dejar la pantalla cargando si Storage tardaba o fallaba.
- **¿Para qué?**
  - Abrir la página sin depender de la descarga y conservar la validación antes de procesar.

## 2026-10-03 — Ejecutor local de importaciones con HTTPS

- **¿Qué?**
  - El arranque HTTPS configura Workflow con el mismo origen y la CA local de mkcert cuando existe.
- **¿Por qué?**
  - La cola llamaba por HTTP a un servidor que escucha por HTTPS y fallaba con `fetch failed`.
- **¿Para qué?**
  - Permitir que las importaciones en desarrollo avancen después de pulsar «Importar».

## 2026-10-03 — Actualización automática de cargas

- **¿Qué?**
  - Las secciones de cargas en Encuestas e Importaciones consultan sus estados mientras hay trabajos activos y la pestaña está visible; refrescan la vista solo cuando cambia un estado.
- **¿Por qué?**
  - El procesamiento terminaba en segundo plano, pero la pantalla conservaba el estado «En espera» hasta pulsar F5.
- **¿Para qué?**
  - Mostrar el estado final y el catálogo actualizado sin interrumpir filtros, formularios o desplazamiento.

## 2026-10-05 — Ajuste de eliminación de encuestas grandes

- ¿Qué?
  - Se redujeron a 100 filas los lotes de respuestas y observaciones, y las transacciones de eliminación permiten hasta cinco minutos por sentencia.
  - El aviso de operaciones grandes ahora usa fondo ámbar opaco y tinta ocre oscura tanto en tema claro como oscuro.
- ¿Por qué?
  - La eliminación de un estudio grande seguía alcanzando el límite de tiempo de PostgreSQL.
  - El texto claro usado en tema oscuro seguía viéndose amarillo y tenía poco contraste.
- ¿Para qué?
  - Dar más margen a cada paso del borrado y facilitar la lectura del aviso antes de confirmar.

## 2026-10-05 — Revisión completa de preguntas al importar

- ¿Qué?
  - La validación permite desplegar todas las preguntas del archivo y volver a la vista inicial de 30.
  - El buscador de preguntas filtra el conjunto completo, incluso cuando está contraído.
- ¿Por qué?
  - Los archivos con más de 30 preguntas no permitían revisar todas antes de importarlos.
- ¿Para qué?
  - Inspeccionar cualquier pregunta y sus valores antes de confirmar la carga.

## 2026-10-05 — Carga y orden en Encuestas

- ¿Qué?
  - Los botones «Validar archivo» e «Importar» muestran `CubeLoader` durante sus operaciones.
  - La tabla del cuestionario ordena por registro, estado y cada pregunta; el registro inicia de menor a mayor, incluyendo orden numérico para identificadores numéricos.
  - Las opciones del cuestionario se presentan de menor a mayor usando comparación numérica natural.
- ¿Por qué?
  - Las cargas no indicaban visualmente que seguían en proceso, y la tabla y las opciones carecían del orden solicitado.
- ¿Para qué?
  - Hacer visibles los tiempos de espera y facilitar la inspección ordenada de respuestas y opciones.

## 2026-10-06 — Mapa de datos de Encuestas para Gráficas v2

- **¿Qué?**
  - Se documentaron las entidades, relaciones y granularidades de `insight_survey`, con enlaces desde la arquitectura y el mapa de módulos.
- **¿Por qué?**
  - El apartado conceptual de la arquitectura conserva nombres anteriores y no explicaba cómo cruzar variables, observaciones y selecciones.
- **¿Para qué?**
  - Diseñar las fuentes y agregaciones de Gráficas v2 sobre el modelo implementado sin volver a reconstruirlo desde archivos dispersos.

## 2026-10-06 — Organización documental previa a Gráficas v2

- **¿Qué?**
  - Se consolidó la arquitectura de base en `docs/`, se ordenaron los documentos de raíz y se prepararon un índice, un contexto de producto y una entrevista para Gráficas v2.
- **¿Por qué?**
  - Había una copia antigua de la arquitectura, enlaces a la raíz y documentos v1 mezclados con referencias vigentes.
- **¿Para qué?**
  - Empezar el diseño de Gráficas con fuentes claras y decisiones estadísticas explícitas.

## 2026-10-06 — Índice documental por tarea

- **¿Qué?**
  - El índice de `docs/` indica qué documento abrir según el trabajo y enlaza las referencias opcionales.
- **¿Por qué?**
  - La lista anterior no daba una ruta de lectura concreta y podía llevar a revisar todos los documentos.
- **¿Para qué?**
  - Recuperar contexto suficiente con pocas lecturas y conservar la diferencia entre fuentes vigentes e históricas.

## 2026-10-06 — Respuestas y pendientes de Gráficas v2

- **¿Qué?**
  - Se registró el editor avanzado, la privacidad deseada y las ideas diferidas de organización de gráficas; se señalaron tres aclaraciones estadísticas y de alcance.
- **¿Por qué?**
  - La entrevista recibió respuestas que fijan la dirección del producto, mientras dos «Así» dejan alternativas de cálculo abiertas.
- **¿Para qué?**
  - Redactar una especificación comprobable sin confundir requisitos de la primera entrega con ideas posteriores.

## 2026-10-06 — Alcance y catálogo extensible de Gráficas v2

- **¿Qué?**
  - Se cerraron las aclaraciones de la entrevista y se documentó la propuesta de consulta, catálogo y adaptadores de visualización para datasets y Encuestas.
- **¿Por qué?**
  - Los porcentajes de selección múltiple, la ponderación y los tipos estadísticos iniciales ya tienen una decisión de producto; el editor actual ata fuente y gráfica a campos planos de dataset.
- **¿Para qué?**
  - Implementar la primera entrega con ECharts y poder incorporar tipos o un motor G2 cuando aporten valor, sin cambiar el contrato analítico de las gráficas guardadas.

## 2026-10-06 — D3.js como candidato futuro

- **¿Qué?**
  - Se agregó D3.js a los pendientes de la biblioteca de gráficas.
- **¿Por qué?**
  - El usuario pidió considerarlo para futuras visualizaciones.
- **¿Para qué?**
  - Evaluar una implementación a medida cuando exista un tipo concreto que lo justifique.

## 2026-10-06 — Revisión de PostgreSQL antes de Gráficas v2

- **¿Qué?**
  - Se contrastó el PostgreSQL conectado con las tablas de v1 y se preparó, sin aplicar, el esquema privado de Gráficas v2 por organización.
- **¿Por qué?**
  - El código de Gráficas v1 usa `public.charts` y `tenant_id`, pero la base conectada no tiene tablas de usuario en `public`.
- **¿Para qué?**
  - Construir el almacenamiento de Encuestas sin romper la compatibilidad que se necesita para Datasets y aclarar si hay datos v1 en otra base.

## 2026-10-06 — Almacenamiento de Gráficas v2

- **¿Qué?**
  - Se aplicó la migración de gráficas, publicaciones y anotaciones en `insight_core`; se confirmaron las tres tablas, RLS y ausencia de lectura directa de `authenticated`.
  - El usuario aclaró que se conservan capacidades de v1 para contenido nuevo, sin migrar registros anteriores.
- **¿Por qué?**
  - El esquema v1 usa `tenant_id` y no existe en el PostgreSQL conectado, mientras Encuestas opera por `organization_id`.
- **¿Para qué?**
  - Dar a las gráficas nuevas un almacenamiento multi-organización y planear la continuidad de Datasets sin depender de tablas v1 ausentes.

## 2026-10-06 — Fuentes iniciales de Gráficas v2

- **¿Qué?**
  - Se añadieron cálculo y editor de Encuestas, guardado privado, publicaciones por snapshot, anotaciones y un origen de datasets planos por organización con carga CSV/TSV/TXT.
  - La migración 025 de datasets se aplicó y se verificó que ambas tablas tienen RLS y no ofrecen lectura directa a `authenticated`.
- **¿Por qué?**
  - La base actual contiene Encuestas y organización, pero no las tablas `public` que usaba el editor plano heredado.
- **¿Para qué?**
  - Permitir crear contenido nuevo desde ambas fuentes sin reintroducir `tenant_id`.

## 2026-10-06 — Mapas y dashboards por organización

- **¿Qué?**
  - Se aplicaron y verificaron las migraciones 026 y 027 para mapas GeoJSON y dashboards v2 con ítems y publicaciones por organización.
  - El editor plano agregó dispersión, histograma y boxplot; los dashboards nuevos pueden combinar ambas fuentes, reordenar gráficas, filtrar datasets y exportar PDF.
- **¿Por qué?**
  - El tipo mapa y el módulo de dashboards heredados dependían de tablas `public` inexistentes en la base actual.
- **¿Para qué?**
  - Mantener la creación de visualizaciones y paneles nuevos dentro de los esquemas propios de Insight.

## 2026-10-06 — Layout persistente en dashboards v2

- **¿Qué?**
  - Se añadió y verificó `layout_json` en los ítems del dashboard y se conectó el cambio de posición y tamaño desde la interfaz.
- **¿Por qué?**
  - Ordenar tarjetas no recuperaba el layout libre que tenía el dashboard heredado.
- **¿Para qué?**
  - Permitir organizar las gráficas de ambas fuentes en el área de trabajo y conservar esa composición al volver o publicar.

## 2026-10-06 — Límite de carga de Gráficas v2

- **¿Qué?**
  - Se fijó en 4 MB el máximo de CSV/TSV/TXT y GeoJSON, con validación en cliente y servidor; la arquitectura documenta que las tablas nuevas están en `insight_core`.
- **¿Por qué?**
  - Las funciones de Vercel admiten cuerpos de petición de hasta 4.5 MB y el límite anunciado antes superaba esa capacidad.
- **¿Para qué?**
  - Evitar que el usuario prepare una carga que la plataforma rechazará antes de llegar a la aplicación.

## 2026-10-06 — Filtro de Encuestas en dashboards v2

- **¿Qué?**
  - Se añadió un selector de pregunta categórica y respuesta por instrumento y versión; las gráficas correspondientes se recalculan con el filtro del dashboard junto al filtro guardado.
- **¿Por qué?**
  - El dashboard solo filtraba filas de datasets y dejaba las gráficas de Encuestas sin exploración conjunta.
- **¿Para qué?**
  - Explorar varias visualizaciones de una encuesta con la misma población seleccionada sin alterar sus definiciones ni snapshots publicados.

## 2026-10-06 — Poblaciones combinadas en gráficas de Encuestas

- **¿Qué?**
  - El editor permite combinar hasta cuatro filtros de respuesta por gráfica; el contrato conserva la lectura de definiciones previas con un solo filtro.
- **¿Por qué?**
  - Una sola condición limita el análisis de segmentos multidimensionales de las encuestas.
- **¿Para qué?**
  - Comparar indicadores sobre poblaciones acotadas por varias preguntas sin duplicar ni transformar la fuente.

## 2026-10-06 — Acceso a gráficas de Encuestas y página 404

- **¿Qué?**
  - Gráficas carga instrumento y versión con su propia autorización de fuente, reutilizando la comprobación de acceso al recurso; se añadió una página 404 ilustrada con una gráfica SVG.
  - Se regeneró la caché local de desarrollo de Next después de observar una compilación atascada y compactaciones repetidas.
- **¿Por qué?**
  - La autorización de Gráficas debía poder comprobar la fuente sin depender de la pantalla de Encuestas. La ruta del instrumento seguía devolviendo 404; la caché de desarrollo alcanzó unos 15.9 GB.
- **¿Para qué?**
  - Abrir las encuestas permitidas desde Gráficas y ofrecer una salida clara y entretenida cuando un recurso realmente no existe.

## 2026-10-06 — Corrección del 404 de Gráficas v2

- **¿Qué?**
  - Se corrigió la validación de UUID en el editor, las gráficas guardadas, los datasets y los dashboards v2. El servidor HTTPS local usa Webpack y prioriza la conexión directa a PostgreSQL durante desarrollo.
- **¿Por qué?**
  - La expresión regular omitía un bloque de cuatro caracteres y enviaba identificadores válidos a la página 404. En la depuración, Turbopack generó una caché excesiva y el pooler remoto agotó el tiempo de conexión, aunque la URL directa respondió.
- **¿Para qué?**
  - Permitir abrir y guardar gráficas con IDs reales y distinguir los errores de acceso o conexión de un recurso inexistente.

## 2026-10-07 — Trazabilidad y carga de navegación

- **¿Qué?**
  - Se añadieron tiempos de las etapas del shell, autorización de gráficas y lectura de respuestas, además de errores de petición capturados por Next.js y la duración de autenticación en el proxy.
  - Se compartieron identidad, permisos, organizaciones y fuentes repetidas dentro de cada render; el permiso por organización se obtiene en una sola consulta y el pool SQL mantiene conexiones inactivas 60 segundos, con máximo configurable.
  - El comando `npm run dev` usa Webpack, igual que el servidor HTTPS local, ante los antecedentes de caché y compilación Turbopack atascadas.
- **¿Por qué?**
  - La navegación y los dashboards repetían verificaciones de sesión y consultas. Los logs locales también mostraron demoras de 1–3 segundos en el shell y errores de timeout de conexión; el cierre tras 10 segundos de inactividad favorecía reconexiones frecuentes.
- **¿Para qué?**
  - Ubicar la etapa concreta de cada demora y reducir esperas al abrir módulos o dashboards con varias gráficas.

## 2026-10-07 — Diagnóstico de lentitud persistente

- **¿Qué?**
  - El proxy y el servidor validan la identidad con claims JWT; el shell dejó de consultar tablas heredadas inexistentes y carga sus fuentes independientes en paralelo.
  - Los logs relacionan proxy, shell y consultas por `request_id`, separan espera de conexión y ejecución SQL y miden transiciones del navegador. ECharts usa una entrada compartida con solo los módulos de visualización necesarios.
- **¿Por qué?**
  - Las consultas del catálogo tardaron 50–100 ms, pero abrir conexiones tardó 0.3–1.4 s y hubo timeouts. La compilación inicial de Gráficas en desarrollo también tardó decenas de segundos; el paquete completo de ECharts ocupaba un chunk de 1.12 MB. Se verificó que `public.profiles` y `public.tenants` no existen en la base aplicada.
- **¿Para qué?**
  - Evitar trabajo remoto innecesario en cada navegación, reducir el JavaScript de las gráficas y distinguir con precisión compilación, autenticación, conexión SQL, consulta y render.

## 2026-10-07 — Compilación y cambio de módulos

- **¿Qué?**
  - El listado de Encuestas ahora carga acceso y progreso desde un módulo ligero, separado del parser XLSX de importaciones.
  - Comparte los claims del render con el shell y resuelve la visibilidad de instrumentos del listado con consultas por conjunto; registra la duración total del listado y de las cargas pendientes.
  - Usuarios y Perfil reutilizan también la identidad verificada del shell en vez de repetir `getUser` al abrir la página.
  - El proxy limita cada petición remota de Auth a cinco segundos y la validación completa a siete; devuelve un error temporal con identificador de petición si la red impide validar la sesión.
  - El servidor de desarrollo conserva hasta ocho rutas compiladas por 10 minutos y el pool SQL de desarrollo admite cuatro conexiones simultáneas.
  - Los nombres de icono personalizados del catálogo se cargan en un componente separado, mientras que los iconos habituales del panel siguen en el registro estático.
- **¿Por qué?**
  - Una navegación a Encuestas tardó 28,8 segundos durante la primera compilación; su bundle de servidor incluía `xlsx` aunque solo mostrara el listado. Otra navegación esperó 24,5 segundos en Auth tras varios fallos de red.
  - El listado repetía llamadas de identidad y una consulta de visibilidad por instrumento, además de volver a consultar los instrumentos para calcular el permiso de eliminación.
  - Next descartaba rutas de desarrollo a los 60 segundos y solo retenía cinco; el pool de dos conexiones acumuló esperas superiores a dos segundos durante un render de Encuestas.
  - Tras separar el parser, el bundle de servidor de `/surveys` ya no referencia `xlsx` ni `survey-file.js`; una navegación posterior a la ruta compilada marcó 2,35 segundos. La primera compilación de `/team` todavía marcó 31,98 segundos en la misma sesión de desarrollo.
- **¿Para qué?**
  - Reducir el trabajo de compilación y los viajes de red al cambiar de módulos, sin perder trazabilidad ni invalidar la sesión por una interrupción temporal de Auth.

## 2026-10-07 — Indicador inmediato de navegación y compilación del panel

- **¿Qué?**
  - El área de trabajo muestra `CubeLoader` desde el clic en un módulo hasta que la ruta destino se monta, a partir del evento de inicio de navegación de Next.js.
  - Los iconos personalizados del catálogo dejaron de depender de `lucide-react/dynamic`; se resuelven con un único chunk perezoso de Lucide y `UserCog` pasó al registro estático.
  - El pool SQL conserva conexiones inactivas 5 minutos en desarrollo, configurable con `INSIGHT_DB_IDLE_MS`, y activa keepalive TCP.
- **¿Por qué?**
  - `loading.tsx` solo aparece cuando el servidor responde; en desarrollo eso ocurre después de compilar la ruta, y la pantalla quedaba congelada durante segundos.
  - `lucide-react/dynamic` declara unos 2100 `import()` y entraba a todas las rutas del panel a través del sidebar; `/insight/modules`, que lo importaba directamente, tardó 64 s en compilar. Roles era el único módulo del catálogo con un icono fuera del registro.
  - Los logs mostraron adquisiciones de conexión de 1–3 s al reabrir conexiones remotas después de periodos breves sin uso.
- **¿Para qué?**
  - Confirmar al usuario que la navegación está en curso y reducir la compilación y las reconexiones que hacían lenta la navegación entre módulos.

## 2026-10-07 — Logs unificados, tiempos de Auth y caché de navegación

- **¿Qué?**
  - Los logs del servidor y del proxy comparten el formato `[fecha] [NIVEL] evento request_id=… campo=valor`, incluyen el código de red de los errores, el algoritmo del JWT verificado y rotan a los 5 MB.
  - Las peticiones de Auth tienen tope de 5 s en el proxy y 8 s en el render; el servidor abre dos conexiones SQL al arrancar.
  - El cliente reutiliza durante 30 s las páginas dinámicas ya visitadas y Turbopack deja de guardar su caché en disco.
- **¿Por qué?**
  - Una verificación de sesión del render quedó bloqueada 317 s por un `HeadersTimeoutError`, sin tope propio. Los logs mezclaban formatos y omitían el proxy en el archivo.
  - Se confirmó que los tokens usan ES256: la verificación es local y los 300–700 ms del proxy coinciden con compilaciones de Webpack en el mismo proceso.
  - La caché persistente de Turbopack llegó a ~16 GB, inviable en equipos modestos.
  - El precalentamiento en `instrumentation.ts` rompió el arranque con Webpack al empaquetar `pg` para Edge; se movió a `instrumentation-node.ts` bajo la condición de runtime documentada.
- **¿Para qué?**
  - Diagnosticar cada demora por `request_id` sin ruido, impedir esperas indefinidas y que volver a un módulo reciente se sienta inmediato.

## 2026-10-07 — Equipo de desarrollo y economía de contexto

- **¿Qué?**
  - Nueva skill `insight-dev` con el reparto de trabajo: la sesión principal razona y decide; subagentes de `.claude/agents/` (explorador, verificador y documentador en haiku; implementador y revisor en sonnet) hacen tareas acotadas. Incluye plantilla de brief, reglas de tokens, flujo de funcionalidades y buenas prácticas.
  - `MAPA_MODULOS.md` abre con un índice rápido; la skill de UX conserva las reglas compartidas y separa los patrones por pantalla en `patrones/`. `CLAUDE.md` e `insight-v2` dejaron de repetir `AGENTS.md`.
- **¿Por qué?**
  - Las reglas pedían empezar por un mapa de ~58 KB y la skill de UX cargaba 21 KB aunque la tarea tocara una sola pantalla; las mismas instrucciones se cargaban tres veces.
- **¿Para qué?**
  - Reservar el modelo más capaz para decisiones, abaratar búsquedas y verificaciones y que cada tarea lea solo el contexto que necesita.

## 2026-10-07 — Mapa por fichas y protocolo de lectura

- **¿Qué?**
  - `MAPA_MODULOS.md` pasó a ser un índice de ~4 KB con una ficha por módulo en `docs/modulos/`, más fichas de rutas, relaciones y reglas generales.
  - `ARQUITECTURA_BBDD.md` abre con un índice por tema; las entradas de septiembre de la bitácora se archivaron en `docs/bitacora/2026-09.md`.
  - `AGENTS.md` define un protocolo de lectura obligatorio que skills y subagentes referencian; `insight-v2` se limita a reglas de dominio y `CLAUDE.md` da precedencia a `insight-dev` sobre skills genéricas de proceso.
- **¿Por qué?**
  - Ubicar un módulo exigía cargar ~58 KB de mapa y las skills se activaban juntas aunque la tarea solo necesitara una.
- **¿Para qué?**
  - Que cada tarea lea un índice y una ficha, cargue solo las skills pertinentes y deje el razonamiento al modelo principal.

## 2026-10-07 — Galería de Gráficas y Dashboards

- **¿Qué?**
  - `/charts` pasó a galería con miniaturas reales, propias y compartidas por la organización, con búsqueda, filtros, orden, vista cuadrícula/lista y acciones por tarjeta (abrir, duplicar, compartir, actualizar vista previa, eliminar).
  - Nueva ruta `/charts/view/[id]` de solo lectura para gráficas compartidas, con «Duplicar en mis gráficas»; un único «Nueva gráfica» abre el diálogo de fuente.
  - `/dashboards` pasó a galería con miniaturas de composición y diálogo «Nuevo dashboard».
  - Migración `029_chart_gallery.sql` aplicada en `insight_core.core_charts`: visibilidad `private`/`organization`, `preview_json` y `preview_updated_at`, con índice parcial para compartidas.
- **¿Por qué?**
  - La portada solo mostraba títulos y botones de fuente redundantes, y no había forma de ver las gráficas del equipo.
- **¿Para qué?**
  - Descubrir y reutilizar visualizaciones como en las herramientas de BI, y compartir dentro de la organización sin exponer filas completas: solo lo que la gráfica dibuja.

## 2026-10-07 — Gráficas: editor único y panel Fuentes (Fase 1)

- **¿Qué?**
  - `/charts/new` abre el editor único `ChartStudio` con fuente por defecto; «Nueva gráfica» ya no abre diálogo. `/charts/survey/[id]` y `/charts/dataset/[id]` usan el mismo editor.
  - Panel Fuentes como primera sección (fuente plegada en una línea, cascada Estudio → Instrumento → Versión o Dataset) y selector de tipos con miniaturas; los tipos no admitidos quedan deshabilitados con su motivo.
  - Se retiraron `survey-chart-studio.tsx`, el modo Dataset de `chart-editor.tsx`, `/charts/survey/new`, `/charts/dataset/new` y el diálogo de origen de datos. Verificado con tsc y eslint.
  - Se puede cambiar la fuente de una gráfica existente, incluido Encuesta↔Dataset, dentro de la misma organización.
- **¿Por qué?**
  - Decisión del usuario: un solo editor para crear y editar, y menos pasos para crear una gráfica.
- **¿Para qué?**
  - Dejar la base para gráficas multifuente (Fase 2: motor común y modo Comparar).
