# Aprendizajes — Intersel Insight

Cosas no obvias descubiertas durante el desarrollo. Antes de tropezar dos veces con lo
mismo, anótalo aquí. Formato: contexto → aprendizaje → cómo aplicarlo.

---

## A-001 — Next.js 16 tiene breaking changes vs. conocimiento previo

**Contexto:** `create-next-app@latest` generó un proyecto con **Next.js 16.2.9 / React 19.2**
y un `AGENTS.md` que advierte explícitamente que las APIs y convenciones difieren de lo
conocido.

**Aprendizaje:** No asumir las APIs de Next 13/14/15. Hay cambios en routing, params
asíncronos, caching, etc.

**Cómo aplicarlo:** Antes de escribir código de Next, leer la guía relevante en
`node_modules/next/dist/docs/`. Respetar los avisos de deprecación.

---

## A-002 — Aislamiento multi-tenant: orden de capas RLS

**Contexto:** El modelo de seguridad del PLAN.md depende de aplicar RLS en el orden correcto.

**Aprendizaje:**
- **Capa 1** (antecede a todo): aislamiento por `tenant_id`, leído del JWT como custom claim
  inyectado por un *custom access token hook* desde `profiles`.
- **Capa 2:** permisos por objeto (rol + `resource_grants`), sobre la capa 1.
- **Capa 3:** la ruta pública NO usa RLS de usuario; lee `snapshots` validando `publish_token`.
- El rol de ejecución `app_readonly` debe ser `NOBYPASSRLS` para que el aislamiento aplique
  incluso sobre SQL arbitrario de editores/admins.

**Cómo aplicarlo:** Toda tabla nueva con `tenant_id` necesita su política capa 1 + un test de
aislamiento que falle al leer datos de otro tenant. Ver PLAN.md §4 y §5.2.

---

## A-009 — react-grid-layout: usar v1.4.4, no v2

**Contexto:** `npm install react-grid-layout` trae **v2.2.3**, que reescribió la API y **ya no
exporta `WidthProvider`** (el build de Next falla: "Export WidthProvider doesn't exist").

**Aprendizaje:** Para la API clásica (`WidthProvider`, `Responsive`, `layouts`, `breakpoints`,
`cols`) hay que fijar **`react-grid-layout@1.4.4`** (`--legacy-peer-deps` por React 19). Importar
las CSS: `react-grid-layout/css/styles.css` y `react-resizable/css/styles.css` en el componente
cliente. ECharts dentro de celdas necesita altura en px (derivarla de `layout.h`).

**Bonus tipos:** los joins anidados de supabase-js infieren la relación como **array**; al
castear a objeto único hay que pasar por `as unknown as {...}`.

---

## A-014 — react-grid-layout `WidthProvider` se rompe en React 19 (findDOMNode)

**Contexto:** En producción el grid de dashboards se **colapsaba** (gráficas apiladas y
angostas, sin dibujarse), pese a que el build pasaba. El editor a veces medía full-width, la
vista no.

**Causa raíz:** `react-grid-layout@1.4.4` usa **`ReactDOM.findDOMNode`** en su `WidthProvider`
para medir el ancho. **React 19 eliminó `findDOMNode`** → `WidthProvider` no mide → el grid
recibe ancho ~0/default y colapsa (o elige el breakpoint móvil). Forzar `window resize` NO
ayuda porque el método ya no existe.

**Solución:** No usar `WidthProvider`. Medir el ancho con un **`ResizeObserver`** propio
(`src/lib/use-container-width.ts`) y pasar `width` directo a `<Responsive width={width} …>`.
Aplica a la vista y al editor de dashboards.

**Regla general:** cualquier HOC/lib que dependa de `findDOMNode` (o refs string, ciclos
legacy) puede romperse silenciosamente en React 19. Preferir medición propia con ResizeObserver.

**Bug secundario (importante):** habíamos guardado el layout por-breakpoint en
`dashboards.layouts_json`. Cuando el grid estaba roto, se guardó "envenenado" (breakpoint móvil)
y la **vista** lo leía → seguía colapsando aun con el ancho ya arreglado. Lección: **no
dupliques estado**; deriva el layout de la **única fuente de verdad** (la posición de cada
item en `dashboard_items.layout_json`) y replícalo a los breakpoints, en vez de guardar una
copia paralela que puede quedar inconsistente.

---

## A-010 — Credenciales externas: Vault + pooler Session + anti-SSRF

**Contexto:** Conectar a una Postgres externa de solo lectura desde una Edge Function.

**Aprendizajes:**
- Guardar la connection string en **Supabase Vault** (`vault.create_secret`), referenciarla por
  `secret_id` desde `data_sources.config_json`. Descifrar (`vault.decrypted_secrets`) sólo desde
  una función `SECURITY DEFINER` con `grant execute ... to service_role` (no a authenticated/anon).
- La Edge Function verifica pertenencia al tenant con el **cliente del usuario (RLS)** y luego
  descifra con el **cliente service_role** — dos pasos.
- Para conectar a otra Supabase usar el **Session pooler (puerto 5432)**, no el Transaction
  pooler (6543): `deno-postgres` usa prepared statements que el transaction pooler no soporta.
  Usuario del pooler = `<rol>.<project_ref>`.
- Guard anti-SSRF: rechazar hosts `localhost`/`127.*`/`10.*`/`192.168.*`/`169.254.*`/`.internal`.
- Modelo **importar-materializar** (un SELECT → dataset) en vez de consulta en vivo por render:
  más seguro y sin egress por petición.

**Cómo aplicarlo:** Migración `0022` + `supabase/functions/import-external/`.

---

## A-011 — Edge Functions conviven con Next: excluir del tsconfig

**Contexto:** `npm run build` falló: "Cannot find module 'jsr:@supabase/supabase-js@2'".

**Aprendizaje:** El código Deno de `supabase/functions/` usa imports `jsr:`/`https://` que el
type-check de Next no resuelve. Añadir `"supabase/functions"` a `exclude` en `tsconfig.json`.
Desplegar siempre con `verify_jwt: true` salvo webhooks con auth propia.

---

## A-012 — Tarjetas OG sin navegador headless

**Contexto:** Generar la miniatura social de una publicación.

**Aprendizaje:** `next/og` (`ImageResponse`, satori) renderiza una imagen desde JSX con divs/flex
en el Edge runtime, **sin canvas ni navegador**. Se puede dibujar un mini-gráfico de barras con
divs de altura proporcional a los datos del snapshot. Evita `@resvg`/headless Chrome.

---

## A-013 — Overloads de funciones Postgres y llamadas ambiguas

**Contexto:** Al agregar `render_publication(text, text default null)` junto a la vieja
`render_publication(text)`, las llamadas con un argumento daban "function is not unique".

**Aprendizaje:** Al introducir un parámetro con default sobre una función existente, **elimina la
versión anterior** (`drop function ... (firma vieja)`) para que las llamadas resuelvan sin
ambigüedad. PostgREST/`rpc` también se confunde con overloads.

**Bonus WAF:** mandar SQL con `drop table` por el API de Supabase puede ser bloqueado por
Cloudflare (parece inyección); en tests evita esas cadenas literales.

---

## A-008 — `SET ROLE` y el rol read-only para ejecutar SQL de usuario

**Contexto:** Ejecutar SQL arbitrario del usuario bajo el rol `app_readonly` (NOBYPASSRLS)
para sandboxearlo manteniendo RLS.

**Aprendizajes (varios tropiezos):**
1. **No se puede `SET ROLE` dentro de una función `SECURITY DEFINER`** (error 42501). Hay que
   usar `SECURITY INVOKER`.
2. Para que `authenticated` pueda `SET ROLE app_readonly`, debe ser **miembro**:
   `grant app_readonly to authenticated`.
3. **`SET LOCAL ROLE` dura toda la transacción, no la función.** Si no se restaura, la 2ª
   llamada en la misma transacción corre como `app_readonly` y falla ("permission denied for
   function run_query"). Solución: guardar `current_user` y restaurarlo al final y en el
   handler de excepción. En producción cada RPC es su propia transacción, pero restaurar lo
   hace robusto.
4. Un objeto en `public` no puede ser **propiedad** de `app_readonly` (no tiene CREATE en el
   esquema), así que la idea de "función DEFINER owned by app_readonly" no aplica aquí.
5. El rol `app_readonly` necesita `usage` en schema `app` y `execute` en
   `app.current_tenant_id()` para evaluar la RLS; y la policy de las tablas `tenant_data`
   debe incluir `to authenticated, app_readonly`.

**Cómo aplicarlo:** Patrón final en migración `0007` (`public.run_query`).

**Nota WAF:** mandar SQL con frases como `drop table` por el API de Supabase puede ser
bloqueado por Cloudflare WAF (parece inyección). Para tests, evita esas cadenas.

---

## A-006 — Next 16: `middleware.ts` → `proxy.ts` (breaking change)

**Contexto:** El patrón estándar de `@supabase/ssr` usa `middleware.ts` para refrescar sesión.

**Aprendizaje:** En **Next.js 16, Middleware se renombró a Proxy**. El archivo va en
`src/proxy.ts`, exporta una función `proxy` (o default) y el mismo `config.matcher`. La
funcionalidad es idéntica; sólo cambia el nombre. El build lo reporta como
`ƒ Proxy (Middleware)`. Otros cambios de Next 16: `cookies()` y `searchParams` son **async**
(Promises) — hay que `await`.

**Cómo aplicarlo:** Lógica de sesión en `src/lib/supabase/proxy.ts`, invocada desde
`src/proxy.ts`. Server client en `cookies()` con `await`.

---

## A-007 — RLS helper sin recursión: SECURITY DEFINER lee `profiles`

**Contexto:** Si el access token hook no está habilitado, el JWT no trae `tenant_id` y la app
no puede leer ni el propio perfil (huevo-gallina). Hacer que `current_tenant_id()` lea
`profiles` directo causaría **recursión infinita** con la propia RLS de `profiles`.

**Aprendizaje:** Definir el helper como **`SECURITY DEFINER`** hace que la lectura de
`profiles` **omita RLS** → sin recursión. El helper sólo devuelve el tenant del propio
`auth.uid()`, así que no filtra nada. Da fallback robusto y refleja cambios de perfil sin
refrescar token.

**Cómo aplicarlo:** Patrón en migración `0005`. El hook queda opcional (mejora de
performance), no requisito.

---

## A-004 — Probar RLS vía MCP: `set local role` + `set_config` + ROLLBACK

**Contexto:** `execute_sql` (MCP) corre como rol admin que **omite RLS**. Para probar políticas
hay que cambiar de rol dentro de la misma llamada.

**Aprendizaje:** En un solo batch transaccional funciona:
`begin; ... ; set local role authenticated; select set_config('request.jwt.claims', '<json>', true); <checks>; rollback;`
El `rollback` revierte seed, rol y claims (no deja basura) **y aun así el MCP devuelve el
resultado del último `SELECT`** previo al rollback. Las violaciones de `WITH CHECK` lanzan
SQLSTATE `42501` (`insufficient_privilege`) — capturarlo es la señal de que el aislamiento
funciona.

**Cómo aplicarlo:** Patrón usado en `supabase/tests/isolation_test.sql`. Reusar para todo
test de RLS futuro.

---

## A-005 — Supabase advisor: `function_search_path_mutable`

**Contexto:** Tras crear funciones, el advisor de seguridad marca `search_path` mutable.

**Aprendizaje:** Toda función debe fijar `search_path` (`alter function ... set search_path = '';`)
y referenciar objetos con esquema explícito (`public.profiles`). Previene secuestro de
search_path. Las funciones built-in (`jsonb_set`, `now()`, `current_setting`) viven en
`pg_catalog`, siempre accesible, así que `''` no las rompe.

**Cómo aplicarlo:** Incluir el `set search_path = ''` en la misma migración que crea la función.

---

## A-003 — La ruta pública nunca ejecuta SQL en vivo

**Contexto:** Un embed público no tiene usuario autenticado, pero el aislamiento depende de
la identidad.

**Aprendizaje:** El render anónimo sólo sirve **snapshots** materializados (tenant ya forzado
al generarlos). Esto no es retrofiteable — debe diseñarse desde el día uno.

**Cómo aplicarlo:** El endpoint público (`public-render`) valida `publish_token` +
`revoked_at IS NULL` y devuelve sólo la fila del snapshot. Nunca acepta SQL ni params fuera
del allowlist. Ver PLAN.md §6.

---
