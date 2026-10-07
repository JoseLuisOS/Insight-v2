# Patrón local: roles de Administración

- Conserva la composición de BAIOS: resumen con total y alta, tarjeta de listado ordenable y modal amplio con cabecera, identidad del rol, permisos agrupados y acciones de pie. Usa los tokens semánticos de Insight en ambos temas.
- En el modal, la organización sustituye al prefijo de tenant y el nivel jerárquico. El código se deriva del nombre al crear y queda fijo al editar; nombre y descripción se editan antes de la matriz de permisos.
- La matriz usa grupos a la izquierda, búsqueda/filtros y módulos plegables al centro, y resumen de cambios a la derecha en pantallas amplias. Cada acción muestra nombre, código y descripción; `operar` se distingue como acceso base. El resumen permite restablecer cambios antes de guardar.
- Seleccionar una acción adicional activa `operar`; quitar `operar` retira las acciones del mismo módulo. Cada fila presenta lápiz de edición y papelera. El rol `owner` conserva la papelera inactiva; los demás requieren confirmación por nombre y retirar miembros antes de eliminar.
