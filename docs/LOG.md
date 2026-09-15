# Bitácora de desarrollo — Intersel Insight

## 2026-06-28 — Documentación actualizada (MANUAL v1.1 + APRENDIZAJES)

`docs/MANUAL.md` v1.1: mapas, edición de gráficas, export PDF (gráficas + dashboard), Postgres
externo, renumeración de secciones y referencia rápida con toda la navegación.
`docs/APRENDIZAJES.md`: A-014 ampliado (no duplicar estado: derivar el layout de la fuente de
verdad, no de una copia que puede quedar "envenenada"). LOG al día.

---

## 2026-06-28 — Edición de gráficas existentes

**Hecho:** Acción `updateChart` (RLS capa 2: editores/admins o grant). `ChartEditor` ahora
acepta `chartId` + `initialName` + `initialConfig` → en modo edición actualiza en vez de crear.
Nueva página `/charts/[id]/edit` (precarga dataset, temas, métricas, mapas y la config actual).
Botón **Editar** en el detalle de la gráfica (solo editores/admins). Se puede modificar nombre,
tipo, ejes/categoría, valor, agregación, estilo (paleta/leyenda/etc.), métrica y mapa. El dataset
base se mantiene (para otro dataset, "Nueva similar"). Build OK.

**Fix previo confirmado:** el grid de dashboards ya funciona (causa: WidthProvider/findDOMNode en
React 19 + layouts_json envenenado; ahora se mide con ResizeObserver y se deriva de los items).

---


## 2026-06-28 — Export de dashboard completo a PDF

**Hecho:** Botón "Exportar dashboard a PDF" en la vista de dashboard (interna y enlace público
no-embed). Captura el grid con `html2canvas-pro` (soporta oklch de Tailwind v4) y arma el PDF con
`jsPDF`, **paginando** tableros altos. Carga diferida (no engorda el bundle). Respeta filtros y
layout actuales. Build OK.

**Nota:** gráficas individuales ya exportaban PDF/PNG para tipos ECharts; KPI/Tabla siguen solo
con CSV individual (se exportan bien dentro del PDF del dashboard).

---


## 2026-06-28 — Mapas en dashboards y embeds públicos (completado)

**Hecho:** Helper `getGeoForConfig` (resuelve el GeoJSON de un chart `map`). `getDashboardData`
adjunta `geo` a cada item de mapa → `DashboardView` lo pasa a `ChartRenderer` (mapas en la vista
interna de dashboards). Al publicar, el snapshot incluye el `geo` (chart y por item de dashboard)
→ `PublicRender` lo pasa → **los mapas ahora renderizan en enlaces públicos y embeds**. Build OK.
Con esto se cierra la limitación anotada antes.

---

## 2026-06-28 — Ola 3: Mapas (ECharts choropleth con GeoJSON)

**Hecho:** Migración `0023` (`maps`: GeoJSON por tenant + `name_property`, RLS editor/admin).
Página `/maps` para subir GeoJSON (archivo o pegado). Tipo de gráfica **`map`**:
`buildMapOption` (visualMap + serie `map`), `ChartRenderer` registra el GeoJSON vía import
dinámico de echarts (`registerMap`, evita SSR). El editor ofrece selector de mapa + campo de
región + valor; el detalle de gráfica carga el GeoJSON. Diseño **flexible**: el usuario sube el
GeoJSON de la geografía que necesite (México por estado/municipio, ciudades, etc.). Build OK (21 rutas).

**Limitación conocida:** maps en **embeds públicos y dashboards** requiere incluir el GeoJSON en
el snapshot/items (follow-up); por ahora los mapas renderizan en la app (editor + detalle).
También corrigió la imagen OG (satori: texto envuelto, runtime node) — ya verificada.

---


## 2026-06-27 — Estado consolidado + manual de usuario

**Resumen de capacidades entregadas (todo en producción):**
- **Fase 0:** multi-tenant, auth, onboarding, RLS capa 1, deploy Vercel + Supabase.
- **MVP (8 épicas):** ingesta CSV, SQL Lab seguro, gráficas (6 tipos), export PNG/CSV,
  dashboards drag-and-drop + filtros, permisos (RLS capa 2), publicación + embeds + OG, frescura.
- **Ola 1:** constructor visual de consultas (+JOINs), embeds con expiración/contraseña,
  anotaciones, cross-filtering, **Postgres externo** (Vault + Edge Function).
- **Ola 2:** estilo avanzado, temas, filtros en embeds, analytics, export PDF, layouts por breakpoint.
- **Ola 3 (parcial):** capa semántica (métricas), RLS a nivel de dato, embeds firmados (HMAC).
- **Artefactos:** 22 migraciones (`supabase/migrations/`), 5 suites de tests (`supabase/tests/`),
  1 Edge Function (`import-external`), pg_cron horario.

**Creado:** `docs/MANUAL.md` — manual detallado de configuración, uso y recomendaciones.

**Pendiente:** verificar Postgres externo contra DB real; (autónomo) gate de CI, rate-limiting,
mapas, Realtime, archivos grandes; (requiere externos) SMTP/alertas, Stripe/billing; (refactor)
tenancy avanzada.

---


## 2026-06-27 — Ola 1: Postgres externo (solo lectura, importar-materializar)

**Hecho:** Migración `0022` (Vault: `store_external_source`/`delete_external_source` +
`read_vault_secret` solo service_role). **Edge Function `import-external`** (deploy ACTIVE,
verify_jwt): verifica tenant (RLS) → descifra con service_role → conecta a la PG externa →
un solo `SELECT` (LIMIT 5000 + statement_timeout + guard anti-SSRF) → materializa vía
`ingest_dataset`. UI `/sources` (admin): agregar/eliminar fuente + importar tabla/consulta como
dataset. Excluí `supabase/functions` del tsconfig de Next. Vault verificado; el connect real
requiere una DB externa de prueba.

---


## 2026-06-27 — Lote autónomo: embeds firmados, cron dashboards, breakpoint layouts

**Hecho (sin sistemas externos):**
- **Embeds firmados por-espectador** (`0019`): `embed_secret` por publicación + `sign_embed_params`
  (dueño) y `verify_embed_signature` (anon, HMAC-SHA256). La página pública verifica `f`+`sig`
  y filtra el snapshot al alcance firmado (tamper-proof, verificado). UI generadora en el diálogo.
- **Refresh cron de dashboards** (`0020`): `refresh_due_snapshots` ahora reconstruye también
  snapshots de dashboards (items materializados + filtros). Verificado.
- **Layouts por breakpoint** (`0021`): `dashboards.layouts_json` guarda los layouts responsivos;
  el editor los captura por breakpoint y la vista interna los honra.

Build OK (19 rutas). Con esto: Ola 1 (4/5), Ola 2 (8/8), Ola 3 (capa semántica + RLS de dato +
signed embeds). Diferidos: Postgres externo, alertas, billing (todos requieren sistemas externos).

---


## 2026-06-27 — Ola 3: RLS a nivel de dato

**Hecho:** Migración `0018` (`dataset_row_policies`: columna + valor permitido por usuario/rol,
RLS admin). Enforcement en `fetchDatasetData`: admins ven todo; los demás se filtran por sus
valores permitidos (cero filas si una columna restringida no tiene valor para ellos),
envolviendo la consulta con un `where` antes de pasar por `run_query` (sandbox `app_readonly`).
UI `RowPolicyManager` en el detalle del dataset (solo admin). Build OK.

---


## 2026-06-27 — Ola 3 (inicio): Capa semántica — métricas reutilizables

**Hecho:** Migración `0017` (`metrics`: agg + columna sobre un dataset, RLS editor/admin).
Página `/metrics` (crear/listar/eliminar métricas con nombre y descripción). El editor de
gráficas ofrece "Métrica guardada" que aplica columna + agregación + título de un solo clic.
Feature 100% autónoma (sin sistemas externos). Build OK (19 rutas).

**Nota Ola 2:** layouts por breakpoint (auto-responsive ya cubre el MVP) y Realtime (alto
costo, plan lo deprioriza) quedan diferidos.

---


## 2026-06-27 — Ola 2: Query builder con JOINs

**Hecho:** `query-builder.ts` reescrito para soportar JOIN de 2 tablas con alias (`t0`/`t1`),
identificadores calificados y saneados. `QueryBuilder` con sección "Combinar con otra tabla"
(inner/left join + columnas de unión); dimensiones/métricas/filtros eligen columnas de ambas
tablas. Corre bajo el sandbox `app_readonly` (ambas tablas con RLS por tenant). Build OK.

**Siguiente:** evaluar layouts por breakpoint y colaboración en vivo (Realtime).

---


## 2026-06-27 — Ola 2: Filtros en embeds + analytics + PDF

**Hecho:**
- **Filtros en embeds públicos**: el snapshot de dashboard ahora incluye sus filtros;
  `PublicRender` los renderiza (la vista pública filtra y hace cross-filter).
- **Embed analytics**: migración `0016` (`embed_views` + `log_publication_view` anon +
  RLS de lectura para el dueño). La página pública registra cada vista; el diálogo de
  publicación muestra "👁 N vistas".
- **Export PDF**: `ChartRenderer` agrega botón PDF (jsPDF con import diferido; PNG de ECharts
  embebido). Build OK (18 rutas).

**Siguiente:** query builder con JOINs; evaluar layouts por breakpoint y Realtime.

---

## 2026-06-27 — Ola 2: Estilo avanzado + temas reutilizables

**Hecho:**
- **Estilo no-code**: `ChartConfig` con paleta/leyenda/apilado/suave/etiquetas/ejes/título;
  `buildEChartsOption` los aplica; `PRESET_PALETTES`. Panel "Estilo" en el editor.
- **Temas reutilizables**: migración `0015` (`themes`: paleta a nivel tenant, RLS editor/admin).
  Página `/themes` (crear/eliminar paletas con preview), y el editor de gráficas ofrece los
  temas del tenant en el selector de paleta. Nav actualizada. Build OK (18 rutas).

**Siguiente:** filtros dentro de embeds públicos; embed analytics + export PDF; JOINs.

---


## 2026-06-27 — Ola 1 cerrada (4/5); Postgres externo diferido

**Estado:** Ola 1 entrega constructor visual de consultas, personalización de embed con
expiración/contraseña, anotaciones y cross-filtering. **Postgres externo diferido** por
decisión (manejo de credenciales + sin DB de prueba) — ver DECISIONES D-007.

---

## 2026-06-27 — Ola 1: Cross-filtering en dashboards

**Hecho:** `ChartRenderer` emite `onSelect(column, value)` al hacer clic en una categoría
(ECharts `onEvents.click`). `DashboardView` mantiene un cross-filter y lo aplica a todas las
gráficas que tengan esa columna, con chip para limpiar. Funciona también en dashboards
públicos. Sin migración. Build OK.

**Siguiente:** Postgres externo (solo lectura) — última pieza de Ola 1.

---

## 2026-06-27 — Ola 1: Anotaciones sobre gráficas

**Hecho:** Migración `0014` (`annotations`: tenant_id, chart_id, body, RLS — lectura miembros,
escritura editores/admins, borrado por autor o editor). `AnnotationsPanel` en el detalle de la
gráfica (agregar/eliminar notas con autor y fecha). Build OK.

**Siguiente:** cross-filtering en dashboards; Postgres externo.

---

## 2026-06-27 — Ola 1: Personalización de embed + expiración/contraseña

**Hecho:** Migración `0013` — `publications` gana `expires_at` + `password_hash`; pgcrypto;
`render_publication(token, password)` ahora valida **expiración** y **contraseña** (hash bcrypt)
y devuelve `settings`; `get_publication_meta` (para decidir si pedir contraseña);
`set_publication_password` (tenant-checked). Verificado = PASS. `PublishDialog` con **opciones
avanzadas** (ocultar título, tema claro/oscuro/auto, expiración 1/7/30 días, contraseña).
Front público refactor: `PublicRender` (aplica tema vía `.light`/`.dark` + ocultar título) y
`PasswordGate` (compuerta de contraseña anónima). Build OK (17 rutas).

**Siguiente:** cross-filtering en dashboards; anotaciones; Postgres externo.

---

## 2026-06-27 — Ola 1: Constructor visual de consultas

**Hecho:** `src/lib/query-builder.ts` (genera SQL desde columnas/métricas/filtros, con
identificadores en whitelist y valores saneados). `QueryBuilder` (`/query/new`): elige dataset
base, agrupa por columnas, agrega métricas (sum/avg/count/min/max), filtros (=,!=,>,<,>=,<=,
contains), preview en vivo y guardar como dataset `sql_query`. Reusa el `run_query` seguro
(sandbox `app_readonly`) — sin nueva migración. Acceso desde Datasets. Build OK (17 rutas).

**Siguiente:** anotaciones sobre gráficas; personalización de embed + enlaces con
expiración/contraseña.

---


Registro cronológico de avances. Append-only: agrega entradas nuevas arriba (más reciente
primero). Cada entrada: fecha, qué se hizo, estado, siguiente paso.

Para logfiles detallados de una sesión/tarea, ver la carpeta [`../logs/`](../logs/).

---

## 2026-06-27 — Pendientes menores: publicar dashboards, invitaciones, OG real

**Hecho:**
- **Publicación de dashboards**: `publishDashboard`/`getDashboardPublication`; el snapshot
  empaqueta todas las gráficas (config + datos + layout). `PublishDialog` generalizado
  (recibe la acción). `/p/[token]` renderiza dashboards vía `DashboardView`.
- **Invitaciones por enlace** (sin email/SMTP): migración `0012` (`tenant_invites`,
  `get_invite`, `accept_invite` SECURITY DEFINER, admin-managed). `InviteManager` en `/team`
  (genera/copia/revoca enlaces por rol) + página pública `/join/[token]`. Verificado = PASS.
- **Tarjeta OG con datos reales**: `opengraph-image` ahora dibuja un mini-gráfico de barras
  (o KPI) a partir del snapshot, con la marca Intersel, usando satori (sin canvas).

**Nota:** el refresh por cron cubre gráficas; los snapshots de dashboard se refrescan al
publicar/manual (extensión a cron = futuro).

---

## 2026-06-27 — MVP Épica Frescura: caché + auto-refresh + cron 🎉 MVP COMPLETO

**Hecho:**
- **Caché interna** (`query_cache`): `fetchDatasetData` cachea por hash(sql+tenant) con TTL
  120s (contrato near-live §5.4); `skipCache` para snapshots frescos al publicar.
- **Refresh agendado**: migraciones `0010`/`0011` — `refresh_due_snapshots()` (regenera
  snapshots de publicaciones públicas con dataset materializado, tenant forzado, sin SQL
  arbitrario) + **pg_cron** cada hora (`refresh-snapshots-hourly`, activo). Verificado = PASS.
- **Auto-refresh** interno en dashboards (selector Manual/30s/1m/5m + botón) y **refresh
  manual** de datos publicados en el diálogo de publicación.
- Build OK.

**🎉 Las 8 épicas del MVP están completas y desplegadas.** TTFC cerrado, aislamiento
multi-tenant verificado en 4 suites de tests (aislamiento, permisos, publicación, ingesta/SQL),
publicación/embed con render anónimo seguro, y modelo de frescura coherente.

**Pendientes menores (post-MVP / pulido):** publicación de dashboards (reusa el modelo),
invitaciones por correo (service role + SMTP), miniatura real de gráfica en OG (ECharts SSR),
y el access token hook (opcional, optimización).

---

## 2026-06-27 — MVP Épica Publicación: snapshots + embed + OG (sección crítica §6)

**Hecho:**
- Migración `0009`: `public.render_publication(token)` (SECURITY DEFINER, `grant ... to anon`)
  — sirve **sólo el snapshot congelado** por token, valida `revoked_at is null` + visibilidad
  pública; **nunca toca datos en vivo**. Verificado con `supabase/tests/publication_test.sql`
  (sirve snapshot, bloquea token desconocido y revocado) → PASS.
- Server actions `publishChart`/`getChartPublication`: generan el snapshot bajo el tenant del
  usuario (tenant forzado server-side), crean/actualizan la publicación con token revocable;
  publicar al exterior requiere `can_publish`/admin.
- `PublishDialog`: espectro de visibilidad (privado→interno→enlace→embed), URL pública y
  **código iframe** para incrustar, copia y revocación instantánea (→ privado).
- Página pública **`/p/[token]`** (anónima, sin chrome; modo `?embed=1`), **tarjeta OG**
  generada (`opengraph-image` con `next/og`, marca Intersel) + metadata Open Graph/Twitter.
- **Anti-clickjacking**: el proxy fija `frame-ancestors *` en `/p/*` y `'self'` en el resto.
- Build OK (16 rutas + opengraph-image).

**Pendiente menor:** publicación de dashboards (mismo modelo, reusa publications); refresh
agendado de snapshots → Épica Frescura.

**Siguiente:** Épica Frescura (caché interna + auto-refresh + refresh agendado de snapshots).

---

## 2026-06-27 — MVP Épica Permisos: RLS capa 2 + roles

**Hecho:** Migración `0008` (**RLS capa 2**): lectura para cualquier miembro; escritura sólo
admin/editor; **grants por objeto** permiten a un usuario editar una gráfica/dashboard
específico; perfiles y grants gestionados sólo por admin (sin escalación de privilegios).
Verificado con suite `supabase/tests/permissions_test.sql` → PASS. UI `/team`: el admin
cambia roles y `can_publish` de los miembros. Invitación por correo **diferida** (requiere
service role + envío de correos). Build OK.

**Siguiente:** Épica Publicación (visibilidad + snapshots + endpoint público anónimo + embed
+ tarjetas OG) — la sección crítica de seguridad del plan (§6).

---

## 2026-06-27 — MVP Épica Dashboards: grid + filtros globales

**Hecho:** `react-grid-layout` (v1.4.4 — la v2 cambió la API y quitó `WidthProvider`).
Editor (`/dashboards/[id]/edit`) con grid drag-and-drop responsivo (agregar/quitar/acomodar
gráficas) + editor de filtros globales. Vista (`/dashboards/[id]`) renderiza el grid en modo
lectura con datos reales (pre-cargados server-side, deduplicados por dataset) y una barra de
filtros (dropdown + rango de fechas) aplicados en cliente a las gráficas con la columna
objetivo. Listado `/dashboards` con creación inline. Nav actualizada. Sin migraciones nuevas
(tablas `dashboards`/`dashboard_items`/`dashboard_filters` ya existían). Build OK (17 rutas).

**Siguiente:** Épica Permisos (roles admin/editor/viewer + grants por objeto + RLS capa 2).

---

## 2026-06-27 — MVP Épica Export: PNG + CSV

**Hecho:** `src/lib/export.ts` (descarga, CSV RFC-4180, slugify). `ChartRenderer` ahora
acepta `exportable`: PNG nativo de ECharts (`getDataURL` vía `onChartReady`, ya que
`next/dynamic` no reenvía refs) para gráficas, y CSV de datos para todos los tipos.
Habilitado en la vista de gráfica y en el preview del editor. Build OK.

**Siguiente:** Épica Dashboards (grid drag-and-drop + filtros globales).

---

## 2026-06-27 — MVP Épica Gráficas: constructor visual con ECharts

**Hecho:**
- ECharts (`echarts` + `echarts-for-react`). `src/lib/charts.ts`: paleta de marca accesible,
  agregación por categoría (sum/avg/count/min/max), KPI, y `buildEChartsOption` con defaults
  publication-ready (grid limpio, tooltips, modo oscuro, responsivo).
- `ChartRenderer` (KPI como tarjeta, tabla HTML, resto ECharts con detección de tema) y
  `ChartEditor` (selector de 6 tipos, encodings X/Y, agregación, **preview en vivo**).
- `src/lib/datasets.ts`: `fetchDatasetData` unifica la lectura (CSV materializado y consultas
  SQL) vía el `run_query` seguro.
- Páginas `/charts`, `/charts/new` (selección de dataset → editor), `/charts/[id]` (vista).
  Nav actualizada. Sin migraciones (la tabla `charts` ya existía).
- `npm run build` OK (14 rutas).

**Estado:** Épica Gráficas completa. **TTFC cerrado**: CSV → dataset → gráfica publicable.

**Siguiente:** Épica Export (PNG de la gráfica + CSV de datos).

---

## 2026-06-27 — MVP Épica SQL: SQL Lab + ejecución segura

**Hecho:**
- Migración `0007`: `public.run_query(sql, limit)` — ejecución read-only del SQL del usuario
  bajo el rol `app_readonly` (`NOBYPASSRLS`): aislamiento por tenant, **escritura denegada**,
  una sola sentencia, `statement_timeout` 8s, tope 5,000 filas. `SECURITY INVOKER` con
  `SET ROLE` + restauración de rol (ver A-008). Policy/grants de `tenant_data` extendidos a
  `app_readonly`.
- **Verificado vía SQL**: ejecución, agregación, **aislamiento cross-tenant**, bloqueo de
  escritura, bloqueo de multi-sentencia, sin leak de rol → PASS.
- Front: `/sql` (SQL Lab con editor, ejecutar, tabla de resultados, lista de tablas para
  referenciar, guardar consulta como dataset `kind=sql_query`); detalle de dataset ahora
  soporta `sql_query` (re-ejecuta y muestra el SQL); SQL Lab en la navegación.
- `npm run build` OK (12 rutas).

**Estado:** Épica SQL completa. Datasets (CSV + SQL) listos para alimentar gráficas.

**Siguiente:** Épica Gráficas (constructor visual de 6 tipos con ECharts).

---

## 2026-06-27 — MVP Épica Datos: ingesta de CSV

**Hecho:**
- Migración `0006`: `public.ingest_dataset(name, columns, rows)` (SECURITY DEFINER) que
  materializa el CSV como tabla en `tenant_data.ds_<uuid>` con `tenant_id` forzado + RLS,
  registra el dataset (`kind=csv_materialized`, `row_count`, `columns_json`) y sanea
  identificadores con `%I` + valida tipos contra allowlist. `public.dataset_preview()` para
  leer filas de forma segura (tenant-checked). Verificado end-to-end vía SQL = PASS.
- Front: `src/lib/csv.ts` (saneo de headers + inferencia de tipos), `CsvUploader`
  (drag-drop CSV / pegar tabla, preview, ajuste de tipos), páginas `/datasets`,
  `/datasets/new`, `/datasets/[id]` (preview de hasta 100 filas), nav en el shell y estado
  vacío accionable en el dashboard. PapaParse para el parseo en cliente.
- `npm run build` OK (11 rutas).

**Estado:** Épica Datos lista para prueba en vivo (subir CSV → materializar → ver tabla).

**Siguiente:** Épica SQL (editor SQL Lab + ejecución segura con rol `app_readonly`).

---

## 2026-06-27 — Deploy en Vercel (producción viva)

**Hecho:**
- App desplegada en **https://intersel-insight.vercel.app** con auto-deploy desde `main`.
- Variables de entorno configuradas en Vercel (URL, anon key, site URL).
- Verificado en producción: landing/login en 200; `/dashboard` → 307 a `/login` (guard OK).

**Pendiente (config en dashboard Supabase, no automatizable por MCP):** agregar la URL de
Vercel a Authentication → URL Configuration (Site URL + Redirect URLs) para que los enlaces
de confirmación de correo funcionen en producción.

---

## 2026-06-27 — Fase 0 COMPLETA: Auth + onboarding + conexión del front

**Hecho:**
- Integración **Supabase ↔ Next 16**: clientes browser/server (`@supabase/ssr`) y
  manejo de sesión en **`proxy.ts`** (Next 16 renombró `middleware` → `proxy`).
- **Flujo de auth completo**: landing, `/login` (sign in / sign up), `/auth/confirm`
  (OTP de email), `/auth/signout`, `/onboarding` (crea tenant + perfil admin vía RPC
  `public.bootstrap_tenant`), y shell autenticado `(app)` con header de marca + `/dashboard`.
- **Helpers de RLS resilientes** (migración 0005): leen `tenant_id`/rol del claim del JWT
  o, como fallback, del propio `profiles` (SECURITY DEFINER). La app funciona **sin** depender
  del paso manual de habilitar el access token hook. Ver DECISIONES D-006.
- **Tokens de marca Intersel** (`#4377BC`) en `globals.css` con modo claro/oscuro semántico.
- **Verificado:** `npm run build` OK; smoke test de rutas (`/`=200, `/login`=200,
  `/dashboard`→307 a `/login` sin sesión); test SQL end-to-end de onboarding + RLS = PASS.

**Estado:** **Fase 0 terminada.** App funcional con multi-tenancy aislado, auth y onboarding.

**Siguiente:** import en Vercel (paso del usuario) y arranque del MVP — Épica Datos
(ingesta CSV → materialización → dataset).

---

## 2026-06-27 — Fase 0: Base de datos, RLS capa 1 y tests de aislamiento

**Hecho:**
- Repo subido a **GitHub** (privado): https://github.com/arturodiazmo/intersel-insight.
- Migración `0001`: schemas `app` + `tenant_data`, rol read-only `app_readonly`
  (`NOBYPASSRLS`), helpers de RLS (`app.current_tenant_id()`, etc.) y el
  `app.custom_access_token_hook`. `search_path` fijado en todas las funciones (hardening).
- Migración `0002`: **modelo de datos completo** (12 tablas) en `public` + **RLS capa 1**
  (aislamiento por `tenant_id`) en todas, con índices y triggers `updated_at`.
- **Suite de tests de aislamiento** ejecutada contra el cloud: lectura, insert, update y
  delete cross-tenant **bloqueados** → `PASS`. Versionada en
  `supabase/tests/isolation_test.sql` (gate de CI). **Criterio de salida de Fase 0 cumplido.**
- Advisors de seguridad: 0 tablas sin RLS; corregidos los warnings de `search_path`.

**Estado:** Base de datos lista y aislada. Pendiente: habilitar el access token hook en el
dashboard (paso manual, ver `supabase/README.md`); auth + onboarding; import en Vercel.

**Siguiente:** auth + onboarding de tenant/usuario y conexión del front a Supabase; luego
épica Datos (ingesta CSV).

---

## 2026-06-27 — Fase 0: Cimientos del proyecto

**Hecho:**
- Definida la estrategia: todo en **cloud** (Supabase hosted + Vercel) por decisión del
  usuario. Ver [DECISIONES.md](DECISIONES.md) D-002.
- Creado el **proyecto Supabase cloud** `intersel-insight` (ref `kytvxyjvnxamqdrhwezw`,
  región `us-east-1`, Postgres 17, $10/mes). Vía MCP de Supabase.
- **Scaffold Next.js 16** (App Router, TS, Tailwind, ESLint, `src/`, alias `@/*`) en
  `intersel-insight/`. React 19.2, Next 16.2.9.
- Creada la **estructura de documentación**: `CLAUDE.md`, `docs/` (PLAN, LOG, APRENDIZAJES,
  DECISIONES), `logs/`.

**Estado:** Fase 0 en progreso. Falta: esquemas DB + rol read-only, modelo de datos +
migraciones, RLS capa 1 + access token hook, tests de aislamiento, auth + onboarding,
repo en GitHub + import en Vercel.

**Siguiente:** subir el repo a GitHub e importar en Vercel; luego migraciones del esquema
base (`app`, `tenant_data`) y RLS capa 1 con su suite de tests de aislamiento.

---
