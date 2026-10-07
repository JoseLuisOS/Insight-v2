# Patrón local: usuarios de Administración

- En cada fila, Sysadmin ve la acción **Ver Como** con nombre accesible; para membresías inactivas se muestra deshabilitada con una explicación. Durante la máscara, una banda muy delgada aparece encima de la cabecera, muestra el correo del usuario (o su nombre si no está disponible) y la organización, y coloca **Salir** a la derecha. La máscara no cambia los permisos de Sysadmin.

- Sigue la composición de BAIOS adaptada a Insight: cabecera con contexto de organización, resumen de usuarios y activos, tabla ordenable con búsqueda expandible y filtros multiselección con iconos Lucide y conteos. Rol y estado se encadenan; las opciones se derivan de los miembros disponibles y el limpiador restablece todos los criterios. Al abrir búsqueda, los filtros se compactan a iconos. Conserva el estado tipo switch y las acciones discretas de contraseña, edición y retiro.
- Usa un modal con identidad global primero y roles de la organización después. El correo de una cuenta existente es de solo lectura; los roles admiten selección múltiple. Muestra la contraseña temporal únicamente en el modal de resultado, con acción de copiar.
- El retiro confirma el nombre y explica que solo quita la membresía de la organización. El reseteo de contraseña global tiene confirmación y resultado separados; el estado se cambia en la fila con etiqueta además del color.
- La cuenta maestra `sysadmin` se gestiona fuera de Usuarios: no aparece en la tabla, los filtros ni los formularios de asignación. Su rol global tampoco aparece en Roles de organización.
