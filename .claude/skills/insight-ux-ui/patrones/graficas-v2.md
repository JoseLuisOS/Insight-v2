# Patrón local: editor de Gráficas v2

- La creación y edición de una gráfica ocupan el área de trabajo. Las herramientas, fuente y filtros están a la izquierda; el lienzo de visualización y edición, a la derecha. En pantallas estrechas, conserva el acceso a ambos sin reducir el lienzo a un tamaño inutilizable.
- El selector de tipos muestra solo los tipos implementados. Los que la fuente no admite aparecen deshabilitados con su motivo (p. ej. Mapa solo con Dataset; tipos numéricos sin variable numérica). Los controles de ejes, colores y leyendas dependen de las capacidades del tipo elegido. En Encuestas, presenta claramente versión del instrumento, base porcentual, ponderación y tratamiento de respuestas ausentes o con advertencia.

## Editor único y fuentes

- Un solo editor (`ChartStudio`) crea y edita gráficas de Encuesta y Dataset; no hay editores ni pantallas de selección separados por fuente.
- El panel Fuentes es la primera sección del panel izquierdo. La fuente se muestra plegada en una línea (punto de color y «Encuesta · Estudio › Instrumento · vN» o «Dataset · nombre»). Al desplegarla: control segmentado Encuesta/Dataset y cascada desplegable Estudio → Instrumento → Versión; la versión solo aparece con más de una. Con Dataset, «Subir dataset» va incrustado. Sin fuentes, enlaza a la importación de Encuestas y ofrece subir un dataset.
- Las secciones exclusivas de Encuestas solo aparecen con fuente Encuesta.
- El selector de tipos es una cuadrícula de 3 por fila con miniaturas SVG; los tipos no admitidos quedan deshabilitados con una explicación.

## Galería y compartición

- La portada de Gráficas es una galería con miniaturas reales de cada gráfica, propias y compartidas por la organización.
- «Nueva gráfica» abre directamente el editor con valores por defecto; no hay diálogo de fuente. La portada no tiene botones de fuente.
- El estado vacío muestra un solo llamado a la acción.
- La visibilidad Privada/Organización está en el extremo derecho de la fila superior del lienzo, frente al nombre editable de la gráfica, al crear y al editar; al crear se guarda junto con la gráfica.
- Las gráficas compartidas se abren en solo lectura; la acción principal es «Duplicar en mis gráficas».
- Dashboards usa el mismo lenguaje de galería, con miniaturas que reproducen la composición.
