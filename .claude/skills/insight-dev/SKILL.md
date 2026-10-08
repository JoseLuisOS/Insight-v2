---
name: insight-dev
description: Use when planning, implementing, fixing or reviewing code in Intersel Insight — new features, bugs, refactors or performance. Defines the development team (lead model reasons; haiku/sonnet subagents do bounded tasks), token economy rules and Insight development best practices.
---

# Desarrollo en Insight

Complementa [`insight-v2`](../insight-v2/SKILL.md) (contexto, seguridad y datos) y [`insight-ux-ui`](../insight-ux-ui/SKILL.md) (interfaz). Aquí está **cómo** se trabaja: quién hace qué, cuánto contexto se gasta y qué se considera terminado.

## Equipo y modelos

La sesión principal es el **líder técnico** y usa el modelo que el usuario eligió (el más capaz). Se reserva para lo que exige razonamiento; lo acotado y repetitivo va a subagentes de `.claude/agents/` con modelos más pequeños.

| Rol | Quién | Hace | No hace |
| --- | --- | --- | --- |
| Líder técnico | sesión principal | entender el pedido, decidir diseño y alcance, partir el trabajo, escribir briefs, revisar el resultado final, hablar con el usuario | barridos de archivos, salidas largas de comandos, ediciones mecánicas que caben en un brief |
| `insight-explorador` | haiku | localizar código y dependencias; devolver `ruta:línea` | diseñar, editar |
| `insight-implementador` | sonnet | implementar un cambio ya diseñado y acotado; verificar tipos y lint | decidir arquitectura, ampliar alcance |
| `insight-verificador` | haiku | correr tsc, eslint, build o filtrar logs y resumir errores | corregir |
| `insight-revisor` | sonnet | revisar el diff: corrección, autorización, organización, límites servidor/cliente, rendimiento | reescribir |
| `insight-documentador` | haiku | bitácora, fichas e índice del mapa, skills de UX según el resumen del líder | verificar comportamiento |

### Cuándo delegar

Cada subagente arranca sin contexto: paga su definición, el brief y sus lecturas. Delegar conviene cuando lo que devuelve es mucho más pequeño que lo que lee o produce.

- **Delega** búsquedas que recorren varios módulos, verificaciones con salida larga, implementación de partes independientes ya especificadas y la documentación de cierre.
- **Hazlo tú** si son 1–3 llamadas a herramientas, si necesita el contexto de la conversación o si la decisión de diseño aún no está tomada.
- **En paralelo** solo tareas sin archivos compartidos: un implementador por archivo o módulo y, a la vez, el explorador del siguiente paso.
- No delegues dos veces lo mismo ni pidas a un subagente que vuelva a descubrir lo que ya sabes: ponlo en el brief.

### Brief para un subagente

```
Objetivo: <resultado verificable en una frase>
Contexto ya conocido: <hallazgos con ruta:línea; decisiones tomadas>
Archivos: <qué tocar / qué no tocar>
Contrato: <firmas, tipos, rutas, textos de UI exactos>
Aceptación: <cómo se comprueba: tsc, eslint, comportamiento esperado>
Respuesta: <formato y límite de líneas>
```

## Economía de tokens

El **protocolo de lectura de `AGENTS.md`** es obligatorio para el líder y para cada subagente: índice → una ficha de `docs/modulos/` → `rg` → fragmento. Además:

- **Skills según la tarea, no todas:** esta siempre que haya código; [`insight-v2`](../insight-v2/SKILL.md) solo si toca auth, permisos, catálogo, organizaciones, datos/SQL, migración v1→v2 o publicación; [`insight-ux-ui`](../insight-ux-ui/SKILL.md) solo con interfaz; `supabase-postgres-best-practices` solo con SQL o esquema. Las skills genéricas de proceso no se usan salvo que el usuario las pida.
- **Contexto en el brief:** pasa al subagente las rutas, líneas y la ficha ya identificadas; no le pidas redescubrirlas.
- **Lee una vez:** no releas lo editado ni lo que está en la conversación; revisa con `git diff --stat` y fragmentos.
- **Salidas filtradas:** `| tail`, `rg`, `--stat`; logs por `request_id`, evento o ruta, nunca completos.
- **Respuestas al usuario:** qué cambió, cómo se verificó y qué falta; sin repetir el diff.

## Flujo para una funcionalidad o corrección

1. **Entender** (líder): objetivo, criterio de aceptación y lo que queda fuera. Pregunta solo lo que cambia la implementación.
2. **Localizar** (líder o explorador): archivos, consumidores y contratos afectados, con `ruta:línea`.
3. **Diseñar** (líder): el cambio mínimo que cumple; contratos, estados de carga/error, autorización y datos por organización. En cambios grandes, plan breve antes de tocar código.
4. **Implementar** (implementador, o líder si es pequeño): por partes independientes con brief completo.
5. **Verificar** (verificador o líder): `npx tsc --noEmit -p .` y `npx eslint <archivos tocados>`; build solo si cambian configuración, bundling o rutas.
6. **Revisar** (revisor) en cambios no triviales, de seguridad, datos o rendimiento. El líder decide qué hallazgos corregir.
7. **Documentar** (documentador): bitácora, ficha de `docs/modulos/` y fila del índice si cambió el módulo, `rutas.md` si cambió una URL, y skill de UX si hubo decisión de interfaz.
8. **Cerrar** (líder): reporte al usuario. Commit y publicación solo cuando el usuario lo pida (ver `insight-v2` § GitHub y Vercel).

## Buenas prácticas de Insight

### Servidor, cliente y runtime
- Módulos de servidor con `import "server-only"`; los componentes cliente reciben datos ya autorizados, nunca credenciales.
- En archivos que Next compila para varios runtimes (`instrumentation.ts`, `proxy`), importa lo exclusivo de Node (`pg`, `node:fs`) solo dentro de `if (process.env.NEXT_RUNTIME === "nodejs") { await import(...) }`, en un módulo aparte. Un `return` anticipado no basta: Webpack lo empaqueta para Edge y el servidor no arranca.
- Antes de usar una API de Next, consulta su guía en `node_modules/next/dist/docs/` para la versión instalada.

### Datos, permisos y organización
- Autentica y autoriza en cada Server Action y route handler; la guarda de UI o del proxy no protege la operación.
- Todo dato propio se filtra por `organization_id` y membresía; no introduzcas `tenant_id`. `createAdminClient()` solo con justificación en servidor.
- SQL propio mediante `insightQuery(stage, sql, params)` con una etiqueta de etapa estable; parámetros siempre, nunca interpolación.
- Cambios de esquema: aplica `supabase-postgres-best-practices`, migración verificada y luego `ARQUITECTURA_BBDD.md`.

### Rendimiento
- Consultas independientes en `Promise.all`; consultas por conjunto en vez de una por elemento.
- Datos repetidos dentro de un render con `cache()` de React (como `getSessionUser`).
- Bibliotecas pesadas (ECharts, XLSX, jsPDF) fuera del bundle inicial: carga perezosa o módulo separado del que solo lista.
- Evita módulos que declaran cientos de `import()` (p. ej. `lucide-react/dynamic`): multiplican chunks y tiempos de compilación. Iconos habituales en el registro estático de `nav-icon.tsx`.
- Llamadas de red con tope de tiempo (Auth usa `authFetchWithTimeout`); un fallo transitorio se muestra como error recuperable, no como espera indefinida.
- Toda navegación muestra respuesta inmediata (loader del shell y `loading.tsx`); las acciones largas, `CubeLoader` desde el clic.

### Logs y diagnóstico
- Usa `logEvent`, `logDuration` y `logError` de `src/lib/server-log.ts`: formato `[fecha] [NIVEL] evento request_id=… campo=valor`. Solo valores acotados: nunca SQL, parámetros, tokens, correos ni contenido de registros. Rutas con `logPath()`.
- Una etapa nueva y potencialmente lenta lleva `logDuration` con nombre `modulo.etapa`.
- Diagnostica desde `logs/application.log` y `logs/dev-local/app.log` por `request_id` antes de cambiar código.

### Entorno local
- El servidor de desarrollo del usuario (`dev_local.py`, puerto 4102) es suyo: no lo detengas ni lo reinicies. Para comparar, usa otro puerto con `INSIGHT_DIST_DIR` distinto, apágalo al terminar y revierte cualquier cambio que Next haga en `tsconfig.json`.
- No ejecutes pruebas largas ni builds si el usuario no lo pidió; tsc y eslint focalizados sí.
- Verificación visual con la CLI `agent-browser` (usa Edge vía `AGENT_BROWSER_EXECUTABLE_PATH`), delegada al `insight-verificador`; nunca la extensión de Chrome. Úsala solo si hay dudas reales de visualización o si el usuario la pide; por defecto el usuario revisa la interfaz. Redirige su salida a un archivo (`agent-browser open <url> > f.txt 2>&1 < /dev/null`) y nunca con tubería (`| tail`): el proceso de fondo hereda la tubería y el comando no termina. Comandos útiles: `open`, `get title`, `snapshot -i`, `screenshot`, `close`.

## Terminado significa

- Cumple el criterio de aceptación y no amplía el alcance.
- tsc y eslint de los archivos tocados sin errores (o el fallo reportado tal cual).
- Autorización y aislamiento por organización revisados en las operaciones tocadas.
- Ficha del módulo, índice, `rutas.md`, bitácora y skills actualizados cuando cambian rutas, módulos, contratos o decisiones de UX.
- El reporte distingue lo verificado de lo no verificado.
