# Instrucciones del repositorio

## Protocolo de lectura (obligatorio)

Lee solo lo necesario, en este orden. Los documentos grandes nunca se leen completos.

| Necesitas | Lee | Nunca |
| --- | --- | --- |
| Ubicar código | [`docs/MAPA_MODULOS.md`](docs/MAPA_MODULOS.md) (índice, ~4 KB) → una ficha de `docs/modulos/` → `rg` del símbolo → fragmentos con `offset`/`limit` | todas las fichas; archivos completos cuando basta un fragmento |
| Ir de una URL a su código | [`docs/modulos/rutas.md`](docs/modulos/rutas.md) | recorrer `src/app/` |
| Datos, SQL, IAM u organizaciones | «Índice rápido» de [`docs/ARQUITECTURA_BBDD.md`](docs/ARQUITECTURA_BBDD.md) → la sección con `rg -n "^#{1,2} "` + `offset`/`limit` | el documento completo (~42 KB) |
| Interfaz | [`.claude/skills/insight-ux-ui/SKILL.md`](.claude/skills/insight-ux-ui/SKILL.md) + solo `patrones/<pantalla>.md` | los patrones de otras pantallas |
| El porqué de una decisión | `rg` sobre `docs/BITACORA.md docs/bitacora/` | la bitácora completa |
| Otro documento | la fila de la tarea en [`docs/README.md`](docs/README.md) | recorrer `docs/` o los históricos por rutina |

- El código es la evidencia del comportamiento; los demás Markdown son referencias no verificadas hasta contrastarlas. Confirma en el archivo afectado, sus imports y consumidores inmediatos.
- No releas lo que ya está en la conversación ni lo que acabas de editar. Filtra la salida de comandos y logs (`rg`, `tail`, `--stat`).

## Modelo y fuentes

- El producto es **multi-organización, no multitenant**: una instalación equivale a un deployment y puede alojar varias organizaciones; `organization_id` delimita pertenencia y aislamiento. El usuario designó [`docs/ARQUITECTURA_BBDD.md`](docs/ARQUITECTURA_BBDD.md) como referencia del modelo objetivo. El código aún tiene contratos heredados (`tenant_id`, `profiles`, `tenants`): distingue el objetivo del estado que implementa el archivo que cambias.
- La base aplicada usa `insight_core`, `insight_iam` e `insight_survey`; `auth` sigue administrado por Supabase. Antes de cambiar SQL, consulta «Estado aplicado» de `ARQUITECTURA_BBDD.md`; tras una migración verificada, actualízalo, igual que cuando cambie el modelo o el contrato de datos. `scripts/run-sql.js` usa `insight_app` por defecto y `postgres` solo con `--admin` explícito. No asumas que una migración está aplicada porque exista en el repositorio.
- `../intersel-insight` es la primera versión: referencia de comparación de solo lectura; no la modifiques ni copies su implementación sin adaptarla al modelo objetivo.
- No copies credenciales ni valores de `.env` a código, respuestas o documentación.

## Desarrollo y documentación

- Flujo de trabajo, reparto entre modelos y buenas prácticas: [`.claude/skills/insight-dev/SKILL.md`](.claude/skills/insight-dev/SKILL.md).
- Al agregar, quitar o mover un componente, ruta o servicio, actualiza en el mismo cambio su ficha en `docs/modulos/`, su fila en `docs/MAPA_MODULOS.md` y, si es una URL, `docs/modulos/rutas.md`.
- Al cerrar cambios de código o documentación de producto, agrega al final de [`docs/BITACORA.md`](docs/BITACORA.md) una entrada breve con listas bajo **¿Qué?**, **¿Por qué?** y **¿Para qué?**, leyendo solo sus últimas líneas. Sin tablas ni diff.

## Next.js

Esta aplicación usa la versión de Next.js declarada en `package.json`. Antes de modificar código que use APIs o convenciones de Next.js, consulta la guía correspondiente en `node_modules/next/dist/docs/` para esa versión y sigue sus indicaciones vigentes.

## UX/UI

Cuando la tarea afecte la interfaz, aplica [`.claude/skills/insight-ux-ui/SKILL.md`](.claude/skills/insight-ux-ui/SKILL.md) y el patrón de la pantalla tocada. Actualiza esa skill solo al agregar, cambiar o retirar decisiones de UX/UI; no la uses para tareas exclusivas de datos, API o infraestructura.
