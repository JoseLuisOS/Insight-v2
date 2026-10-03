# Bitácora de desarrollo — Insight-v2

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
