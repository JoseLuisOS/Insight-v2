# Bitácora de desarrollo — Insight-v2

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

## 2026-09-29 — Carga reutilizable de Encuestas

- **¿Qué?**
  - Se añadió la carga de XLSX con validación previa, confirmación de advertencias, cola persistente y trabajador separado. Se aplicó `scripts/021_survey_import_jobs.sql`.
- **¿Por qué?**
  - Los archivos HCV tardan varios minutos en importarse y la carga puntual no servía para otros cuestionarios del mismo formato.
- **¿Para qué?**
  - Incorporar nuevos instrumentos desde la app sin mantener abierta la petición web y consultar el resultado o error de cada tarea.

## 2026-09-29 — Consulta de respuestas de Encuestas

- **¿Qué?**
  - Se añadió la vista de registros paginados, búsqueda por ID externo y detalle de respuestas de la versión vigente.
- **¿Por qué?**
  - Los cuestionarios HCV 2025 ya estaban cargados, pero sus respuestas individuales no podían revisarse desde el módulo.
- **¿Para qué?**
  - Auditar registros y valores originales desde la aplicación con los mismos permisos de organización y recurso que el instrumento.

## 2026-09-29 — Carga de cuestionarios HCV 2025

- **¿Qué?**
  - Se importaron los cuestionarios A y B como dos instrumentos de un estudio, con 3,231 observaciones y 689,036 respuestas. Se añadió un importador reproducible y un registro de validación y procedencia.
- **¿Por qué?**
  - Los archivos son el primer entregable real de Encuestas y A contenía dos bloques de valores en distinto orden al de sus encabezados.
- **¿Para qué?**
  - Consultar ambos cuestionarios desde el módulo y preservar respuestas y origen para las siguientes funciones de análisis.

## 2026-09-29 — Primera entrega de Encuestas

- **¿Qué?**
  - Se creó el grupo y módulo Encuestas, con catálogo por organización y detalle de instrumentos, cuestionarios y versiones. Se aplicó `scripts/020_survey_catalog.sql`.
- **¿Por qué?**
  - El dominio de encuestas necesitaba navegación y consulta propias antes de cargar los cuestionarios A y B de HCV 2025.
- **¿Para qué?**
  - Revisar el demo vigente desde la app y disponer de una base de interfaz y autorización para la importación posterior.

## 2026-09-28 — Administrador de módulos Insight

- **¿Qué?**
  - Se creó el catálogo de módulos/submódulos, su pantalla y API exclusivas de `sysadmin`, el grupo **Insight**, concesiones por organización, guardas de ruta y auditoría de cambios.
- **¿Por qué?**
  - El menú fijo no permitía gestionar estados y `iam_modules` representa permisos, no componentes de navegación.
- **¿Para qué?**
  - Administrar la disponibilidad de la app desde un módulo propio y preparar el crecimiento multi-organización.

Registro de cambios del producto y de su documentación operativa. Se conserva como una lista cronológica; cada entrada usa las mismas tres preguntas y no tablas.

## 2026-09-28 — Base documental v2 multi-organización

- **¿Qué?**
  - Se alinearon mapa, guía e instrucciones al modelo multi-organización; Perfil quedó marcado v2 y el resto de la aplicación v1. Se creó esta bitácora breve de referencia.
- **¿Por qué?**
  - La documentación previa mezclaba el modelo antiguo con el objetivo actual, y el código aún conserva contratos v1.
- **¿Para qué?**
  - Guiar la migración por módulo y reducir lecturas repetidas del repositorio.

## 2026-09-28 — Correo del administrador de plataforma

- **¿Qué?**
  - Se cambió el correo de la cuenta `sysadmin` a `sysadminodin@temikia.com` y se actualizó su referencia en `scripts/004_iam_seed_hcv.sql`.
- **¿Por qué?**
  - El script seguía buscando el correo anterior.
- **¿Para qué?**
  - Mantener el acceso administrativo y permitir que futuras inicializaciones encuentren la cuenta vigente.

## 2026-09-28 — Rol SQL dedicado

- **¿Qué?**
  - Se renombró el rol existente a `insight_app`, se actualizaron sus conexiones en `.env` y se dejó como opción predeterminada del ejecutor SQL. Se documentó el destino de schemas acordado.
- **¿Por qué?**
  - Las tareas SQL comunes dependían por defecto de la conexión `postgres`.
- **¿Para qué?**
  - Operar con una cuenta propia de la plataforma y reservar `postgres` para tareas puntuales de DBA antes de migrar los schemas.

## 2026-09-28 — Schemas de dominio aplicados

- **¿Qué?**
  - Se migraron 23 tablas a `insight_core`, `insight_iam` e `insight_survey`, se actualizaron las RPC y referencias SQL, y se documentó la arquitectura aplicada.
- **¿Por qué?**
  - Los schemas antiguos mezclaban responsabilidades y conservaban nombres heredados.
- **¿Para qué?**
  - Iniciar el trabajo funcional de la app sobre límites de datos claros, manteniendo `auth` bajo Supabase.

## 2026-09-28 — Insight fuera del catálogo editable

- **¿Qué?**
  - Insight quedó fijo para `sysadmin`, se retiró del catálogo gestionable y se rediseñó la pantalla con tarjetas y detalle por módulo.
- **¿Por qué?**
  - El gestor podía apagarse a sí mismo y la interfaz anterior dificultaba explorar la estructura.
- **¿Para qué?**
  - Conservar siempre el acceso al control de módulos y facilitar su administración.

## 2026-09-28 — Ajustes de la vista de módulos

- **¿Qué?**
  - Se quitó la píldora de estado de la lista, se ocultaron los lápices hasta hover y se movió el selector del módulo al pie derecho de la cabecera de detalle.
- **¿Por qué?**
  - Reducir ruido visual y dejar el cambio de estado junto al contexto del módulo seleccionado.
- **¿Para qué?**
  - Hacer más clara y rápida la administración del catálogo.

## 2026-09-28 — Distribución de tarjetas

- **¿Qué?**
  - El selector muestra el conteo de submódulos donde estaba su lápiz; los encabezados de módulo y submódulo alinean ícono, información y acciones en tres columnas.
- **¿Por qué?**
  - Mantener las acciones en el contexto del componente y ordenar la jerarquía visual.
- **¿Para qué?**
  - Facilitar la selección y lectura del catálogo.

## 2026-09-28 — Nomenclatura del catálogo

- **¿Qué?**
  - Se normalizó la jerarquía a grupos y módulos en interfaz, API, servicio, navegación, documentación y tablas de base de datos.
- **¿Por qué?**
  - “Módulo/submódulo” no representaba los nombres acordados para los dos niveles del catálogo.
- **¿Para qué?**
  - Mantener el mismo lenguaje en la administración, el código y el esquema de datos.

## 2026-09-28 — Ajustes visuales del catálogo

- **¿Qué?**
  - Se alinearon los iconos con los nombres, se retiraron divisores y pastillas de estado de módulos, y se actualizó la leyenda de acceso.
- **¿Por qué?**
  - La jerarquía y sus estados debían leerse con menos ruido visual.
- **¿Para qué?**
  - Hacer más clara la administración de grupos y módulos.

## 2026-09-28 — Selector de estado tipo manómetro

- **¿Qué?**
  - Se sustituyeron los selectores de estado de grupos y módulos por un manómetro compacto con cuatro posiciones, también en el formulario de edición.
- **¿Por qué?**
  - El usuario eligió el diseño de `selector_man_metro.html` como control de referencia.
- **¿Para qué?**
  - Cambiar estados de forma visual desde las tarjetas y el detalle, con soporte para pulsación, arrastre y teclado.

## 2026-09-28 — Catálogo con tres estados

- **¿Qué?**
  - Se retiró el estado `listo` de interfaz, validación y base; el grupo afectado pasó a `desarrollo`. Se eliminaron las concesiones por organización sin asignaciones activas.
- **¿Por qué?**
  - La selección particular de módulos se decidió para permisos de usuario en IAM.
- **¿Para qué?**
  - Mantener el catálogo como control de disponibilidad general y evitar un segundo sistema de asignaciones.

## 2026-09-28 — Ajuste del manómetro y estados en el detalle

- **¿Qué?**
  - Se redujo el manómetro un 15 %, se vinculó su fondo al tema y se movieron las píldoras junto a los nombres de grupo y módulo dentro del detalle.
- **¿Por qué?**
  - El estado debía leerse junto al elemento y el control ocupar menos espacio.
- **¿Para qué?**
  - Mantener la jerarquía visual y adaptarse a la colorimetría clara u oscura.

## 2026-09-28 — Píldora puntual y manómetro compacto

- **¿Qué?**
  - La píldora de estado quedó después del nombre y solo muestra el punto; el manómetro se redujo un 20 % adicional.
- **¿Por qué?**
  - El nombre debe tener prioridad y el control debe ocupar menos espacio en las tarjetas.
- **¿Para qué?**
  - Dar más claridad al detalle sin perder la identificación accesible del estado.

## 2026-09-28 — Separadores en las tarjetas de estructura

- **¿Qué?**
  - Se añadió una línea divisoria a las cabeceras de los pasos 01 y 02.
- **¿Por qué?**
  - La cabecera necesitaba distinguirse del contenido de cada tarjeta.
- **¿Para qué?**
  - Facilitar la lectura de las secciones del catálogo.

## 2026-09-28 — Selector de módulos en todos los grupos

- **¿Qué?**
  - El selector segmentado del header muestra también el módulo cuando el grupo solo tiene uno.
- **¿Por qué?**
  - Administración e Insight quedaban sin acceso directo visible en la cabecera.
- **¿Para qué?**
  - Mantener una forma uniforme de reconocer y abrir módulos desde cualquier grupo.

## 2026-09-28 — Skill de UX/UI para Insight

- **¿Qué?**
  - Se creó una skill local con decisiones visuales compartidas y patrones del catálogo, enlazada desde las instrucciones del proyecto.
- **¿Por qué?**
  - Las convenciones de interfaz necesitan una referencia vigente que pueda cambiar sin acumular reglas obsoletas.
- **¿Para qué?**
  - Mantener armonía entre pantallas y consultar solo el contexto de diseño pertinente.

## 2026-09-28 — Permisos por módulo

- **¿Qué?**
  - Se añadió Permisos a Administración, con modal de alta y acciones fijas, y se crearon 10 permisos `operar` para los 10 módulos gestionables.
- **¿Por qué?**
  - La visibilidad de módulos necesitaba una autorización IAM por usuario y organización.
- **¿Para qué?**
  - Gestionar acciones sin duplicados y controlar el acceso con roles y excepciones individuales.

## 2026-09-28 — Filtros heredados de Permisos

- **¿Qué?**
  - Se añadieron filtros Lucide en cascada, conteos, limpiador y buscador expandible con los filtros compactos.
- **¿Por qué?**
  - El catálogo debe ofrecer solo opciones disponibles y seguir el comportamiento usado en BAIOS.
- **¿Para qué?**
  - Encontrar permisos por grupo, módulo y acción con menos espacio y sin opciones vacías.

## 2026-09-28 — Alta múltiple de permisos

- **¿Qué?**
  - Se movió el formulario de alta a la página y sus botones permiten seleccionar varias acciones.
- **¿Por qué?**
  - El flujo sigue el patrón en página de BAIOS y reduce las altas repetitivas.
- **¿Para qué?**
  - Crear varios permisos disponibles del mismo módulo en una sola operación.

## 2026-09-28 — Presentación del catálogo de permisos

- **¿Qué?**
  - Se refinó la jerarquía visual de grupos, módulos y filas de permisos; el formulario de alta conserva su diseño.
- **¿Por qué?**
  - La lista necesitaba distinguir mejor sus niveles y acciones sin añadir complejidad a los controles.
- **¿Para qué?**
  - Facilitar la revisión y gestión de permisos en una interfaz más clara y profesional.

## 2026-09-28 — Estado inicial y color de grupos

- **¿Qué?**
  - Los grupos del catálogo ahora aparecen colapsados y sus cabeceras usan un color distinto según el tema.
- **¿Por qué?**
  - La vista inicial debía ser más compacta y conservar contraste en ambos temas.
- **¿Para qué?**
  - Facilitar la exploración del catálogo respetando la paleta definida para claro y oscuro.

## 2026-09-28 — Paleta compartida de cabeceras

- **¿Qué?**
  - Se extendieron `#9ebbff` y `#e3e3e3` a cabeceras de tarjetas, header, sidebar y navegación móvil, con tintas oscuras adaptadas.
- **¿Por qué?**
  - La paleta debía dar continuidad visual entre las pantallas sin perder contraste al cambiar de tema.
- **¿Para qué?**
  - Reforzar la jerarquía y coherencia visual de Insight en toda la plataforma.

## 2026-09-28 — Revisión integral de paleta

- **¿Qué?**
  - Se reemplazaron los fondos pastel extendidos por una paleta clara porcelana y una paleta oscura azul tinta, con acentos azul, turquesa y violeta.
- **¿Por qué?**
  - La aplicación necesitaba más energía y contraste, manteniendo superficies cómodas de leer.
- **¿Para qué?**
  - Dar identidad propia a ambos temas y hacer que cabeceras, shell y controles se sientan parte del mismo sistema visual.

## 2026-09-28 — Formulario de Componentes

- **¿Qué?**
  - Se renombró el módulo del sidebar y se rehízo el modal con ID autogenerado, selector visual y validación de íconos Lucide, y estado como lista.
- **¿Por qué?**
  - El catálogo requería una captura más directa y coherente con los datos normalizados.
- **¿Para qué?**
  - Evitar IDs inconsistentes y facilitar la selección de íconos y estado al administrar componentes.

## 2026-09-28 — Ajustes del modal de Componentes

- **¿Qué?**
  - Se cambió la validación de íconos a la lista local de Lucide, se hizo más visible el ID derivado y se restauraron las leyendas breves de estado.
- **¿Por qué?**
  - La validación remota confundía errores de solicitud con iconos inexistentes y faltaba contexto en el selector.
- **¿Para qué?**
  - Confirmar iconos válidos como `user` y `wallet`, revisar el ID mientras se escribe y entender cada estado antes de guardar.

## 2026-09-28 — Roles por organización

- **¿Qué?**
  - Se añadió Roles en Administración con listado y modal basados en BAIOS, adaptados al modelo de organizaciones y permisos de Insight.
- **¿Por qué?**
  - Insight ya tiene roles y asignaciones IAM, pero faltaba administrarlos desde la aplicación.
- **¿Para qué?**
  - Crear y mantener roles por organización sin jerarquías ni prefijos de tenant, conservando los roles predefinidos protegidos.

## 2026-09-28 — Acciones de Roles

- **¿Qué?**
  - Se añadió «Editar permisos» a cada fila, incluidos los roles predefinidos, con guardado independiente.
- **¿Por qué?**
  - La acción presente en BAIOS faltaba y los roles iniciales aparecían sin operaciones disponibles.
- **¿Para qué?**
  - Ajustar permisos sin desbloquear el nombre, código ni eliminación de roles de sistema.

## 2026-09-28 — Edición unificada de Roles

- **¿Qué?**
  - El lápiz abre un modal amplio con nombre, descripción y matriz de permisos; la papelera aparece en cada rol y `owner` permanece obligatorio.
- **¿Por qué?**
  - La edición separada no seguía la composición de BAIOS y ocultaba acciones de los roles iniciales.
- **¿Para qué?**
  - Administrar identidad y accesos juntos, con filtros y resumen de cambios antes de guardar.

## 2026-09-29 — Usuarios por organización

- **¿Qué?**
  - Se rehízo Usuarios con la interfaz de BAIOS adaptada a organizaciones: modal de alta/edición, roles múltiples, filtros, estado y acciones de contraseña y retiro.
- **¿Por qué?**
  - La vista anterior solo permitía altas y mostraba una tabla básica.
- **¿Para qué?**
  - Administrar miembros de cada organización sin confundir su membresía con la cuenta global de Supabase.

## 2026-09-29 — Convención de filtros en Usuarios

- **¿Qué?**
  - La barra adoptó filtros multiselección encadenados, búsqueda expandible y limpiador, según Permisos.
- **¿Por qué?**
  - Los selects nativos no seguían la convención de filtros de Administración.
- **¿Para qué?**
  - Encontrar miembros con opciones disponibles y menos ruido visual.

## 2026-09-29 — Organización única y cuenta maestra

- **¿Qué?**
  - Se conservó la organización de José Luis, se retiró la sembrada y se fijó un único `sysadmin` global fuera de Usuarios.
- **¿Por qué?**
  - Había dos organizaciones Hermosillo y la cuenta maestra aparecía como miembro ordinario.
- **¿Para qué?**
  - Mantener el acceso global separado de los roles y operaciones de cada organización.

## 2026-09-29 — Organizaciones y alta completa de módulos

- **¿Qué?**
  - Se agregó Organizaciones a Insight y se retiró su placeholder antiguo; Roles y Permisos entraron en Componentes, y los módulos nuevos reciben `operar`, enlace de menú y área provisional.
- **¿Por qué?**
  - El catálogo no controlaba esos módulos y descartaba del menú cualquier ID sin ruta programada.
- **¿Para qué?**
  - Administrar organizaciones y publicar la estructura de un módulo desde su creación, antes de implementar su funcionalidad.

## 2026-09-29 — Carga autónoma de encuestas

- **¿Qué?**
  - La carga admite TXT, CSV, XLSX, XLS, ODS y JSON; usa la primera hoja, vista previa y reasignación de columnas. El archivo sube a Storage privado y un Workflow procesa los registros en bloques transaccionales.
- **¿Por qué?**
  - La aplicación se ejecuta sin trabajador permanente y los archivos reales pueden carecer de diccionario o variar el orden de columnas.
- **¿Para qué?**
  - Iniciar cargas bajo demanda, revisar la correspondencia de respuestas antes de guardar y retomar pasos sin duplicar registros.

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
