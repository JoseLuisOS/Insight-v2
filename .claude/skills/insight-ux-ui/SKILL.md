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
- La página 404 usa una ilustración SVG de una gráfica con un punto fuera de rango, un mensaje ligero y enlaces a inicio y Gráficas; respeta los tokens de ambos temas y reduce el movimiento cuando el sistema lo solicita.
- El tema claro combina fondo porcelana y tarjetas blancas con cabeceras azul/turquesa muy suaves; el oscuro usa fondos azul tinta, superficies elevadas y cabeceras azul petróleo. El header sigue el tono de las superficies; el sidebar es profundo en ambos temas. Conserva las tintas con los tokens correspondientes y reutiliza `.insight-card-header`, `.insight-shell-chrome` y `.insight-sidebar-surface` en lugar de fijar colores por componente.
- La tipografía global usa Geist Sans y Geist Mono. Reserva la variante monoespaciada para identificadores, códigos y datos que la justifiquen.
- Los estados de foco y los nombres accesibles deben seguir disponibles cuando un control se simplifique visualmente. Un indicador basado solo en color necesita una etiqueta accesible y, cuando aporte contexto, un título al pasar el cursor.
- Cada página y vista tiene un título de documento con el formato «Módulo · Submódulo · Intersel Insight». En App Router, declara `metadata` o `generateMetadata` en la ruta para que el título exista desde la respuesta inicial; las vistas internas también lo actualizan al cambiar de estado. Cada pantalla conserva además un encabezado visible que identifica su contenido.
- Todo estado de carga reutiliza el componente compartido `CubeLoader` de `src/components/cube-loader.tsx`; no se agregan círculos, íconos giratorios ni animaciones alternativas como loader. En estados de carga dedicados, el cubo va centrado y el texto aparece en una segunda fila debajo. En acciones compactas, como un botón ocupado, el mismo cubo puede acompañar la etiqueta.
- Al navegar entre módulos del panel, el área de trabajo muestra `CubeLoader` con «Cargando…» desde el clic (tras un umbral breve que evita destellos en transiciones instantáneas) hasta que la ruta destino se monta; sidebar y header siguen operables. Los cambios que solo alteran parámetros de búsqueda dentro de una pantalla conservan sus loaders locales.
- En el panel, las acciones habilitadas del header y del área de trabajo usan cursor de mano; los controles deshabilitados no se presentan como accionables.
- Conserva la estructura adaptable del shell existente. Antes de reutilizar un patrón de navegación o tamaño, inspecciona los componentes de `src/components/navigation/` y el espacio real de la vista afectada.
- El documento raíz del panel queda limitado a la altura visible; el contenido principal y la navegación del sidebar se desplazan por separado dentro de esa altura.
- En navegadores compatibles con `::-webkit-scrollbar`, las barras del panel usan pista transparente, pulgar de 6 px en tono derivado de `--primary` y botones de flecha ocultos. No declares `scrollbar-width` ni `scrollbar-color` junto a esas reglas: Chromium prioriza esas propiedades y vuelve a mostrar el control nativo.
- El selector segmentado del header muestra el módulo actual y sus pares para todos los grupos de navegación, incluso si un grupo tiene un solo módulo.

## Patrones locales por pantalla

Lee solo el archivo de la pantalla que vas a tocar. Un patrón local no es regla global.

- catálogo Insight de grupos y módulos: [`patrones/catalogo.md`](patrones/catalogo.md)
- Encuestas: [`patrones/encuestas.md`](patrones/encuestas.md)
- editor de Gráficas v2: [`patrones/graficas-v2.md`](patrones/graficas-v2.md)
- organizaciones de Insight: [`patrones/organizaciones.md`](patrones/organizaciones.md)
- permisos Insight: [`patrones/permisos.md`](patrones/permisos.md)
- roles de Administración: [`patrones/roles.md`](patrones/roles.md)
- usuarios de Administración: [`patrones/usuarios.md`](patrones/usuarios.md)

Al crear el patrón de una pantalla nueva, agrégalo como archivo en `patrones/` y enlázalo aquí.
