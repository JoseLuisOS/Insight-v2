# Instrucciones del repositorio

## Orientación eficiente

- Antes de tocar código, empieza por [`docs/MAPA_MODULOS.md`](docs/MAPA_MODULOS.md). Úsalo para localizar el componente, versión, archivo principal y dependencias inmediatas; después confirma el comportamiento en el código.
- Inspecciona primero el archivo afectado y sus imports, usos y dependencias inmediatas con búsquedas dirigidas (`rg`). No recorras todo el repositorio si el cambio está acotado.
- Trata los demás documentos existentes como referencias no verificadas: pueden estar desactualizados. No los uses como contrato de comportamiento sin corroborar sus afirmaciones en el código o en una fuente que el usuario haya designado como vigente.
- Para el modelo objetivo de producto y datos, el usuario designó `ARQUITECTURA_BBDD.md` como referencia. El producto será multi-organización, no multitenant: una instalación equivale a un deployment y puede alojar varias organizaciones; `organization_id` delimita pertenencia y aislamiento de datos. Distingue este objetivo del estado implementado, que debes verificar en el código.
- La base aplicada usa `insight_core`, `insight_iam` e `insight_survey`; `auth` sigue administrado por Supabase. Antes de cambiar SQL, consulta el estado aplicado de `ARQUITECTURA_BBDD.md`; después de una migración verificada, actualiza allí la arquitectura y el mapa. `scripts/run-sql.js` usa `insight_app` por defecto y solo usa `postgres` con `--admin` explícito.
- `../intersel-insight` es la primera versión y debe tratarse como referencia de comparación de solo lectura; no modificarla ni copiar su implementación sin adaptarla al modelo objetivo. El mapa marca el linaje actual de módulos como v1 o v2.
- Evita cargar archivos completos cuando basten símbolos, fragmentos o resultados de búsqueda. Amplía el contexto solo cuando una dependencia inmediata lo requiera.
- Al cambiar arquitectura, límites entre módulos o flujos, actualiza el mapa de módulos para que siga siendo un punto de entrada confiable.
- Si agregas, quitas o reubicas un componente, ruta o servicio, actualiza el mapa en el mismo cambio.
- Existe una bitácora de referencia en [`docs/BITACORA.md`](docs/BITACORA.md). Consúltala si el historial es relevante; al cerrar cambios de código o documentación de producto, agrega una entrada breve con listas bajo **¿Qué?**, **¿Por qué?** y **¿Para qué?**. No uses tablas ni repitas el diff.

## Next.js

Esta aplicación usa la versión de Next.js declarada en `package.json`. Antes de modificar código que use APIs o convenciones de Next.js, consulta la guía correspondiente en `node_modules/next/dist/docs/` para esa versión y sigue sus indicaciones vigentes.

## UX/UI

Cuando la tarea afecte la interfaz, consulta [`.claude/skills/insight-ux-ui/SKILL.md`](.claude/skills/insight-ux-ui/SKILL.md) para las decisiones visuales e interactivas vigentes. Actualiza esa skill solo al agregar, cambiar o retirar decisiones de UX/UI; no la uses para tareas exclusivas de datos, API o infraestructura.
