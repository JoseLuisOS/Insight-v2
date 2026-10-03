---
name: insight-ux-ui
description: Consultar y mantener las decisiones de diseño e interacción de Insight al crear, modificar o revisar interfaces. No aplica a tareas exclusivas de datos, API o infraestructura.
---

# UX/UI de Insight

Esta skill reúne decisiones vigentes de interfaz para mantener coherencia entre pantallas. Úsala solo cuando la tarea afecte experiencia, presentación, interacción, accesibilidad o diseño adaptable. Complementa la [skill maestra](../insight-v2/SKILL.md); para ubicar código y dependencias, empieza por [`docs/MAPA_MODULOS.md`](../../../docs/MAPA_MODULOS.md).

## Cómo mantenerla

- Confirma cada convención en el código actual o en una decisión explícita del usuario antes de aplicarla a otra pantalla.
- Al recibir una decisión nueva de UX/UI, edita la regla correspondiente: sustituye lo obsoleto, agrega lo nuevo y elimina lo que dejó de servir. Conserva aquí el criterio vigente, no una cronología.
- Distingue reglas compartidas de patrones de una pantalla. Un diseño local no se convierte por sí solo en regla para todo Insight.
- Registra el motivo del cambio de producto en la [bitácora breve](../../../docs/BITACORA.md), con listas bajo ¿Qué?, ¿Por qué? y ¿Para qué?; no dupliques allí esta guía.
- Evita inventarios de componentes, rutas o dependencias aquí: eso pertenece al mapa. Mantén esta skill corta y orientada a decisiones que guían el diseño.
- Para cambios de interfaz importantes, sigue la sección **Sincronización con GitHub y Vercel** de `insight-v2/SKILL.md`: conserva `main` como rama de desarrollo y valida el despliegue de Vercel asociado cuando la tarea deba verse allí.

## Base visual compartida confirmada

- La fuente de verdad de color y tipografía es [`src/app/globals.css`](../../../src/app/globals.css). Insight usa una identidad de azul intenso con acentos turquesa y violeta. Los componentes deben consumir tokens semánticos como `background`, `foreground`, `card`, `muted`, `border`, `primary`, `accent-teal` y `accent-violet` para responder a los temas claro y oscuro.
- El tema claro combina fondo porcelana y tarjetas blancas con cabeceras azul/turquesa muy suaves; el oscuro usa fondos azul tinta, superficies elevadas y cabeceras azul petróleo. El header sigue el tono de las superficies; el sidebar es profundo en ambos temas. Conserva las tintas con los tokens correspondientes y reutiliza `.insight-card-header`, `.insight-shell-chrome` y `.insight-sidebar-surface` en lugar de fijar colores por componente.
- La tipografía global usa Geist Sans y Geist Mono. Reserva la variante monoespaciada para identificadores, códigos y datos que la justifiquen.
- Los estados de foco y los nombres accesibles deben seguir disponibles cuando un control se simplifique visualmente. Un indicador basado solo en color necesita una etiqueta accesible y, cuando aporte contexto, un título al pasar el cursor.
- Conserva la estructura adaptable del shell existente. Antes de reutilizar un patrón de navegación o tamaño, inspecciona los componentes de `src/components/navigation/` y el espacio real de la vista afectada.
- El selector segmentado del header muestra el módulo actual y sus pares para todos los grupos de navegación, incluso si un grupo tiene un solo módulo.

## Patrón local: catálogo Insight de grupos y módulos

Referencia actual: [`catalog-manager.tsx`](../../../src/components/insight/catalog-manager.tsx) y [`state-gauge.tsx`](../../../src/components/insight/state-gauge.tsx).

- Usa los nombres **grupos** y **módulos**. La vista presenta un selector de grupos y un detalle «Interior del grupo». En las cabeceras del detalle, ícono, información y acciones ocupan tres columnas visuales sin separadores verticales. El modal ordena el formulario Nombre → ID autogenerado de solo lectura; normaliza acentos, comprime espacios en un guion bajo y descarta caracteres no admitidos. Los íconos se eligen en cuadrícula visual; «Otro» valida localmente el nombre contra `iconNames` de Lucide antes de guardar y muestra el resultado.
- El selector de grupos muestra la cantidad de módulos. Las cabeceras de los pasos 01 y 02 tienen una línea de separación sutil. El lápiz de edición aparece en hover y foco de teclado.
- Solo en «Interior del grupo», el estado aparece después del nombre del grupo o módulo como una píldora con un punto de color, sin texto visible. Conserva el nombre accesible del estado. No añadas esa píldora a la lista de grupos.
- El estado se edita como select dentro del modal. `StateGauge` solo se usa en la vista principal del catálogo, en la cabecera del grupo y en las tarjetas de módulos.
- El manómetro del grupo queda al pie derecho de su cabecera. En cada módulo se alinea a la derecha de la tarjeta. Los estados del resumen inferior se muestran como texto con punto de color, sin píldoras.
- Roles y Permisos aparecen como módulos del grupo Administración y pueden cambiar de estado desde Componentes. Un módulo nuevo aparece en la navegación y abre una tarjeta provisional con su nombre, descripción y aviso de construcción hasta tener una pantalla implementada.

## Patrón local: Encuestas

- Encuestas tiene grupo propio y un módulo inicial. La lista muestra instrumentos (encuestas visibles) con organización, estudio, versión vigente y conteos; la búsqueda y el filtro por organización trabajan sobre los elementos autorizados.
- El detalle organiza la información en Resumen, Cuestionario y Versiones. Las secciones agrupan preguntas y opciones. El resumen enlaza a una vista de registros paginada de la versión actual; permite buscar un ID externo exacto y abrir sus respuestas. Cada respuesta muestra la etiqueta de opción cuando existe y el valor original para preservar la lectura de la fuente.
- La pantalla principal muestra las cargas sin completar antes del catálogo, con estado, error y acceso directo para continuar o reintentar. «Importar cuestionario» inicia una carga nueva. La carga tiene dos pasos visibles: validar TXT, CSV, XLSX, XLS, ODS o JSON y revisar su resumen, luego confirmar la importación. En archivos tabulares muestra preguntas y muestras de valores, permite reasignar columnas y exige confirmar las advertencias antes de iniciar. El historial permite actualizar estados sin perder la página.
- El formulario de carga solicita organización, nombres, archivo y versión entera precargada en 1. Muestra debajo de cada nombre la vista previa de su código en un campo de solo lectura; los segmentos se completan al escribir y `A001` es ilustrativo hasta preparar la carga. Ante una versión repetida, muestra la versión existente, enlaza su encuesta o carga y propone el siguiente entero.

## Patrón local: organizaciones de Insight

- Organizaciones pertenece al grupo fijo Insight y solo se muestra a sysadmin. Usa cabecera de control, resumen de totales y directorio en tarjeta con búsqueda, estado, cantidad de miembros y roles.
- El modal de alta/edición ordena Nombre → ID autogenerado y permanente → zona horaria; al editar también muestra Estado. Explica que el alta crea roles base sin añadir miembros, y que archivar conserva datos y membresías.
- El alta precarga el prefijo de código de tres caracteres a partir del nombre; sysadmin puede editarlo antes de guardar. En edición se muestra como identificador fijo.

## Patrón local: permisos Insight

- La vista conserva la jerarquía **grupo → módulo → acción** con totales en la cabecera, filtros y búsqueda, grupos plegables y tabla de acciones por módulo. Usa los tokens semánticos del tema de Insight.
- En el catálogo de permisos, cada grupo tiene una cabecera con icono, posición, nombre y conteo; sus módulos aparecen en tarjetas internas con nombre, identificador y tabla de permisos. La acción `operar` se distingue con un indicador discreto; los IDs usan tipografía monoespaciada y las acciones de fila mantienen controles accesibles.
- Los grupos aparecen colapsados al entrar. Sus cabeceras siguen el gradiente sutil azul/turquesa de las superficies compartidas y adaptan la tinta al tema.
- Los filtros usan menús multiselección con iconos Lucide y contador. Sus opciones se derivan de los permisos disponibles y se encadenan **grupo → módulo → acción**; no ofrezcas valores que no existan en los datos. Incluye un botón para limpiar filtros.
- El buscador se abre en línea y gana ancho con transición; al abrirse, los filtros se compactan a iconos. Al cerrarlo, el buscador limpia su texto y los filtros recuperan sus etiquetas. El botón «Nuevo permiso» permanece inmediatamente junto al buscador.
- «Nuevo permiso» despliega el formulario dentro de la página, como en BAIOS. Las acciones disponibles aparecen como botones del mismo estilo; permiten selección múltiple y no se sustituyen por checkboxes ni por un menú. Solo se ofrecen `crear`, `editar`, `eliminar` y `exportar` cuando el módulo aún no las tiene.
- `operar` es un permiso base automático: se muestra en la tabla, puede tener descripción, pero no se ofrece para alta ni eliminación. La eliminación de otras acciones exige confirmación y explica que también elimina asignaciones existentes.

## Patrón local: roles de Administración

- Conserva la composición de BAIOS: resumen con total y alta, tarjeta de listado ordenable y modal amplio con cabecera, identidad del rol, permisos agrupados y acciones de pie. Usa los tokens semánticos de Insight en ambos temas.
- En el modal, la organización sustituye al prefijo de tenant y el nivel jerárquico. El código se deriva del nombre al crear y queda fijo al editar; nombre y descripción se editan antes de la matriz de permisos.
- La matriz usa grupos a la izquierda, búsqueda/filtros y módulos plegables al centro, y resumen de cambios a la derecha en pantallas amplias. Cada acción muestra nombre, código y descripción; `operar` se distingue como acceso base. El resumen permite restablecer cambios antes de guardar.
- Seleccionar una acción adicional activa `operar`; quitar `operar` retira las acciones del mismo módulo. Cada fila presenta lápiz de edición y papelera. El rol `owner` conserva la papelera inactiva; los demás requieren confirmación por nombre y retirar miembros antes de eliminar.

## Patrón local: usuarios de Administración

- En cada fila, Sysadmin ve la acción **Ver Como** con nombre accesible; para membresías inactivas se muestra deshabilitada con una explicación. Durante la máscara, una banda muy delgada aparece encima de la cabecera, muestra el correo del usuario (o su nombre si no está disponible) y la organización, y coloca **Salir** a la derecha. La máscara no cambia los permisos de Sysadmin.

- Sigue la composición de BAIOS adaptada a Insight: cabecera con contexto de organización, resumen de usuarios y activos, tabla ordenable con búsqueda expandible y filtros multiselección con iconos Lucide y conteos. Rol y estado se encadenan; las opciones se derivan de los miembros disponibles y el limpiador restablece todos los criterios. Al abrir búsqueda, los filtros se compactan a iconos. Conserva el estado tipo switch y las acciones discretas de contraseña, edición y retiro.
- Usa un modal con identidad global primero y roles de la organización después. El correo de una cuenta existente es de solo lectura; los roles admiten selección múltiple. Muestra la contraseña temporal únicamente en el modal de resultado, con acción de copiar.
- El retiro confirma el nombre y explica que solo quita la membresía de la organización. El reseteo de contraseña global tiene confirmación y resultado separados; el estado se cambia en la fila con etiqueta además del color.
- La cuenta maestra `sysadmin` se gestiona fuera de Usuarios: no aparece en la tabla, los filtros ni los formularios de asignación. Su rol global tampoco aparece en Roles de organización.
