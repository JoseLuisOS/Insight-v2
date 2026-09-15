<!--
  Marca Intersel — acento primario #4377BC. Para una versión Word/PDF con el
  logotipo de Intersel en el encabezado, ver la nota al final del documento.
-->

# Manual de Intersel Insight

**Plataforma multi-tenant para crear, visualizar y publicar dashboards.**
Versión del manual: 1.1 · Aplica al estado actual de producción.

> **Novedades en esta versión:** gráficas de **mapa** (GeoJSON), **edición** de gráficas
> existentes, export a **PDF** de cualquier gráfica y del **dashboard completo**, conexión a
> **Postgres externo**, y arreglo del render de dashboards.

- **App:** https://intersel-insight.vercel.app
- **Repositorio:** https://github.com/arturodiazmo/intersel-insight
- Fuente de verdad técnica: [PLAN.md](PLAN.md) · Bitácora: [LOG.md](LOG.md)

---

## Índice

1. [Qué es y cómo está construido](#1-qué-es-y-cómo-está-construido)
2. [Conceptos clave](#2-conceptos-clave)
3. [Configuración inicial (administrador de la plataforma)](#3-configuración-inicial)
4. [Roles y permisos](#4-roles-y-permisos)
5. [Guía de uso paso a paso](#5-guía-de-uso-paso-a-paso)
6. [Frescura de datos](#6-frescura-de-datos)
7. [Seguridad](#7-seguridad)
8. [Recomendaciones para mayor aprovechamiento](#8-recomendaciones)
9. [Límites actuales](#9-límites-actuales)
10. [Solución de problemas](#10-solución-de-problemas)
11. [Referencia rápida](#11-referencia-rápida)

---

## 1. Qué es y cómo está construido

Intersel Insight une dos mundos que suelen estar separados: el **análisis** (datasets, SQL,
dashboards) y la **publicación** (gráficas listas para presentar, embebibles en sitios externos).
Cada gráfica o dashboard puede pasar de privado a público/embebible con un flujo limpio, sobre
infraestructura **multi-tenant con aislamiento estricto**.

**Stack:** Next.js 16 + React 19 + Tailwind (frontend en Vercel) · Supabase (Postgres 17, Auth,
Edge Functions, Storage, Vault, pg_cron) · Apache ECharts (gráficas).

**Principio de seguridad rector:** dos rutas de ejecución asimétricas.
- **Interna autenticada:** corre bajo el contexto del usuario (su tenant + rol), con un rol de
  base de datos de solo lectura (`app_readonly`) que respeta RLS.
- **Pública/anónima:** nunca toca datos en vivo; sólo sirve **snapshots** pre-computados con el
  tenant forzado del lado servidor.

---

## 2. Conceptos clave

| Concepto | Qué es |
|---|---|
| **Tenant (organización)** | Espacio de trabajo aislado. Tus datos nunca se mezclan con los de otra organización. |
| **Perfil / rol** | Cada usuario pertenece a un tenant con un rol: `admin`, `editor` o `viewer`. |
| **Dataset** | Una fuente de datos: un CSV materializado, una consulta SQL guardada, o una importación de Postgres externo. |
| **Fuente externa** | Conexión a una base Postgres externa (solo lectura) desde la cual importas datos. |
| **Métrica** | Definición reutilizable (ej. *Ingresos = suma(ingresos)*) que aplicas a gráficas con consistencia. |
| **Gráfica** | Visualización de un dataset (KPI, barra, línea, área, pastel, tabla, **mapa**) con estilo configurable y **editable**. |
| **Dashboard** | Tablero con varias gráficas en un grid, con filtros globales y cross-filtering. |
| **Tema** | Paleta de colores reutilizable a nivel de organización. |
| **Mapa** | GeoJSON subido por la organización para gráficas tipo *choropleth* (regiones por valor). |
| **Publicación** | Estado de visibilidad de una gráfica/dashboard (privado → interno → enlace → embed). |
| **Snapshot** | Copia congelada de los datos en el momento de publicar; es lo que ven los visitantes públicos. |

---

## 3. Configuración inicial

> Esta sección es para quien administra la **infraestructura** (no el uso diario).

### 3.1 Variables de entorno (Vercel)
En el proyecto de Vercel → Settings → Environment Variables (Production y Preview):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kytvxyjvnxamqdrhwezw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la *publishable key* del proyecto |
| `NEXT_PUBLIC_SITE_URL` | `https://intersel-insight.vercel.app` |

Tras cambiarlas, **Redeploy**. (`SUPABASE_SERVICE_ROLE_KEY` la inyecta Supabase en las Edge
Functions automáticamente; no se pone en Vercel.)

### 3.2 Autenticación (Supabase → Authentication)
- **URL Configuration:** Site URL = la URL de Vercel; Redirect URLs = `https://…vercel.app/**`
  y `http://localhost:3000/**`.
- **Email provider:** activar *Confirm email*.
- **Email template "Confirm signup":** el enlace debe apuntar a
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
- *Para producción real:* configurar SMTP propio (SendGrid/Resend) — el correo gratuito de
  Supabase tiene límites bajos.

### 3.3 Base de datos
- Migraciones versionadas en `supabase/migrations/` (fuente de verdad del esquema).
- `pg_cron` corre `refresh-snapshots-hourly` cada hora (refresca snapshots públicos).
- **Opcional (optimización):** habilitar el *Access Token Hook* (`app.custom_access_token_hook`)
  en Authentication → Hooks. No es obligatorio: la app resuelve el tenant desde el perfil.

### 3.4 Despliegue
Cada push a `main` en GitHub redespliega Vercel automáticamente (CI/CD).

---

## 4. Roles y permisos

| Capacidad | viewer | editor | admin |
|---|:---:|:---:|:---:|
| Ver datasets, gráficas, dashboards del tenant | ✅ | ✅ | ✅ |
| Crear/editar datasets, gráficas, dashboards | — | ✅ | ✅ |
| Editar una gráfica/dashboard específico por *grant* | ✅* | ✅ | ✅ |
| Gestionar miembros, roles y `can_publish` | — | — | ✅ |
| Gestionar fuentes externas, temas, métricas | — | ✅** | ✅ |
| Definir seguridad a nivel de fila | — | — | ✅ |
| Publicar al exterior (enlace/embed) | según `can_publish` | según `can_publish` | ✅ |

\* Si un admin le otorga permiso de edición sobre ese objeto. \*\* Fuentes externas: sólo admin.

- **`can_publish`**: capacidad independiente del rol para exponer contenido al exterior. Un admin
  la asigna en **Equipo**.
- **Invitar miembros:** Equipo → genera un **enlace de invitación** con rol; compártelo. La persona
  se registra, abre el enlace y queda en tu organización con ese rol.

---

## 5. Guía de uso paso a paso

### 5.1 Cargar datos (Datasets)
**Opción A — CSV / pegar tabla:** Datasets → *Nuevo dataset* → arrastra un CSV o pega una tabla
(de Excel/Sheets). Se infieren los tipos (ajustables) → *Crear dataset*. Verás la tabla
materializada.

**Opción B — Constructor visual (sin SQL):** Datasets → *Constructor visual*. Elige una tabla
base, marca columnas para agrupar, agrega métricas (suma/promedio/conteo/min/max), filtros, y
opcionalmente **combina dos tablas (JOIN)**. Previsualiza y guarda como dataset.

**Opción C — SQL Lab:** escribe SQL de solo lectura sobre tus tablas; guarda la consulta como
dataset. (Aislado a tu organización, máximo 5,000 filas por consulta.)

**Opción D — Postgres externo (admin):** Fuentes → guarda una conexión (cifrada en Vault) →
importa una tabla/consulta como dataset. Usa un **usuario de solo lectura** y el *Session pooler*.

### 5.2 Métricas (capa semántica)
Métricas → define una métrica con nombre (ej. *Ventas netas = suma(monto)*) sobre un dataset.
Luego, en el editor de gráficas, el selector **"Métrica guardada"** la aplica con un clic →
consistencia entre todas tus gráficas.

### 5.3 Crear una gráfica
Gráficas → *Nueva gráfica* → elige el dataset. Configura:
- **Tipo:** KPI, barras, línea, área, pastel, tabla o **mapa**.
- **Ejes/categoría/valor** y **agregación** (para mapa: campo de **región** + valor + el **mapa**).
- **Métrica guardada** (opcional): aplica una métrica de la capa semántica de un clic.
- **Estilo** (panel desplegable): título, paleta (presets o tus **temas**), leyenda, valores,
  apilado (barras), línea suave, etiquetas de ejes.
Previsualiza en vivo y **Guarda**.

### 5.4 Editar una gráfica
Abre la gráfica → botón **Editar** (editores/admins). Se abre el mismo editor **pre-cargado** con
su configuración; puedes cambiar nombre, tipo, encodings, agregación, estilo, métrica y mapa, con
preview en vivo. **Guardar cambios** actualiza la gráfica (se refleja en dashboards y
publicaciones). El **dataset base** no cambia en edición; para otro dataset usa *Nueva similar*.

### 5.5 Temas
Temas → crea una paleta reutilizable (colores hex). Aparecerá en el selector de paleta del editor
como *"Tema: …"*. Mantiene la identidad visual de tu organización.

### 5.6 Mapas
Mapas → sube un **GeoJSON** (archivo o pegado) e indica la **propiedad de nombre** (la propiedad de
cada región que coincide con tu columna de datos, ej. `name`, `estado`, `ENTIDAD`). Luego crea una
gráfica tipo **mapa** que colorea cada región por su valor. Sirve para cualquier geografía
(México por estado/municipio, ciudades, etc.); el GeoJSON lo consigues de fuentes públicas (INEGI,
repos abiertos). Los mapas funcionan también en dashboards y embeds públicos.

### 5.7 Dashboards
Dashboards → *Crear* → editor:
- **Agrega gráficas** desde el panel izquierdo y **acomódalas arrastrando** (grid responsivo;
  las nuevas se colocan en dos columnas por defecto).
- Define **filtros globales** (rango de fechas / dropdown) sobre una columna.
- **Guardar y ver.**
En la **vista**: los filtros aplican a las gráficas con esa columna; **hacer clic en una barra/
segmento filtra las demás** (cross-filtering); auto-refresh configurable; botón **Exportar
dashboard a PDF**.

### 5.8 Publicar y embeber
En una gráfica o dashboard → panel **Publicar**:
- **Privado** → solo tu equipo con acceso. **Interno** → tu organización.
- **Enlace público** → cualquiera con el enlace (`/p/<token>`).
- **Embebible** → genera un `<iframe>` para insertar en sitios externos.
- **Opciones avanzadas:** ocultar título, tema claro/oscuro, **expiración** (1/7/30 días),
  **contraseña**.
- **Embed firmado por espectador** (embed): genera un enlace con un filtro firmado
  (`columna=valor`) — el visitante ve solo su porción y **no puede alterar el filtro**.
- **Revocar:** cambia a *Privado* (invalida el enlace al instante).
- **Analítica:** el panel muestra el conteo de **vistas** del contenido publicado.

> Los embeds sirven un **snapshot** (datos congelados al publicar; se refrescan cada hora o al
> pulsar *Actualizar datos publicados*). Nunca exponen tu base en vivo.

### 5.9 Exportar
- **Cualquier gráfica** (incl. KPI y tabla): botones **PNG**, **PDF** y **CSV** en su vista.
- **Dashboard completo**: botón **Exportar dashboard a PDF** (captura el grid con los filtros y el
  layout actuales; pagina si es alto).

### 5.10 Seguridad a nivel de fila (admin)
En el detalle de un dataset → *Seguridad a nivel de fila*: define que un **rol** o **usuario** solo
vea filas donde una columna = cierto valor (ej. `region = Norte` para el rol viewer). Los admins
ven todo. Aplica a la vista interna (gráficas/dashboards).

---

## 6. Frescura de datos

| Superficie | Fuente | Frescura |
|---|---|---|
| Vista interna (gráficas/dashboards) | `query_cache` (por consulta + tenant) | TTL corto (~120 s) |
| Auto-refresh de dashboard | re-render en intervalo elegido | Manual / 30 s / 1 min / 5 min |
| Embed público | `snapshots` | Refresco **horario** (pg_cron) o manual al publicar |

El visitante de un embed ve "Datos al {hora del último snapshot}", no en vivo — por diseño.

---

## 7. Seguridad

- **Aislamiento multi-tenant (RLS capa 1):** toda tabla filtra por `tenant_id`. Verificado con
  suite de tests (0 fugas).
- **Permisos por rol (RLS capa 2):** viewers leen; editores/admins escriben; *grants* por objeto.
- **Seguridad a nivel de dato (RLS de fila):** restringe filas por usuario/rol.
- **Ejecución de SQL sandboxeada:** rol `app_readonly` (`NOBYPASSRLS`, solo SELECT), una sentencia,
  `statement_timeout`, tope de filas.
- **Ruta pública:** sólo snapshots; tokens revocables; expiración/contraseña; embeds firmados (HMAC);
  `frame-ancestors` restringido (la app no es embebible; sólo `/p/*` lo es).
- **Credenciales externas:** cifradas en Supabase Vault; sólo `service_role` las descifra.

**Buenas prácticas:** usa usuarios de BD de solo lectura para fuentes externas; revoca enlaces que
ya no uses; usa contraseña/expiración para embeds sensibles; revisa el conteo de vistas.

---

## 8. Recomendaciones para mayor aprovechamiento

1. **Empieza por las métricas.** Define tus KPIs como métricas reutilizables antes de hacer
   muchas gráficas: garantiza que "Ventas" signifique lo mismo en todos lados.
2. **Crea un tema con tus colores** (azul Intersel `#4377BC` u otros) y úsalo en todas las gráficas
   para una identidad consistente y presentaciones más profesionales.
3. **Modela los datos en el dataset, no en cada gráfica.** Usa el constructor visual o SQL Lab para
   dejar un dataset limpio (agregado/filtrado); las gráficas quedan simples y rápidas.
4. **Dashboards temáticos y enfocados** (6–8 gráficas) con 1–2 filtros globales relevantes; el
   cross-filtering hace el resto. Acomódalos para móvil revisando el layout en pantalla angosta.
5. **Para compartir afuera:** usa *Enlace público* para audiencias generales y *Embed firmado* para
   mostrar a cada cliente/región solo lo suyo. Añade expiración a enlaces temporales.
6. **Redes sociales:** las plataformas no renderizan iframes en el feed. Usa el **export PNG** para
   subir la imagen, y comparte el **enlace público** (que trae tarjeta OG con miniatura).
7. **Controla costos y frescura:** deja los embeds en refresco horario salvo que necesites datos
   más frescos; usa el botón *Actualizar datos publicados* para un refresco puntual.
8. **Higiene de permisos:** la mayoría de la gente debería ser `viewer`; reserva `editor` para
   quienes construyen y `admin` para quienes administran. Usa *grants* por objeto para excepciones.
9. **Postgres externo:** importa vistas/consultas ya agregadas (no tablas crudas enormes) para
   mantener los datasets dentro de los límites y rápidos.
10. **Versiona y documenta:** las decisiones y aprendizajes viven en `docs/`. Mantén esa disciplina.

---

## 9. Límites actuales

- Datasets medianos: hasta ~decenas de miles de filas / CSV de pocos MB.
- SQL Lab y consultas: máximo 5,000 filas por ejecución.
- Postgres externo: modelo **importar-materializar** (no consulta en vivo por render).
- Snapshots de embeds: refresco horario (gráficas y dashboards con datasets materializados).

**Aún no disponible (roadmap):** alertas/notificaciones por correo, billing por tenant,
colaboración en vivo (Realtime), archivos grandes por streaming, tenancy física por cliente.

---

## 10. Solución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| El registro no llega al correo | Configurar SMTP propio; revisar plantilla y URL Configuration en Supabase Auth. |
| `/dashboard` me manda a `/login` | No hay sesión; inicia sesión (es el guard de rutas). |
| Una gráfica sale vacía | El dataset no tiene filas, o una **política de fila** te restringe (pide a un admin un valor permitido). |
| Importación de Postgres externo falla | Usa **Session pooler (5432)** + `sslmode=require`; usuario con permiso SELECT; si la tabla tiene RLS, da acceso al rol o usa un usuario con permisos. |
| El embed muestra datos viejos | Es un snapshot; pulsa *Actualizar datos publicados* o espera el refresco horario. |
| "Firma de embed inválida" | El enlace firmado fue alterado o regeneraron el secreto; genera uno nuevo. |

---

## 11. Referencia rápida

**Navegación:** Inicio · Dashboards · Datasets · Fuentes · Gráficas · Métricas · SQL Lab · Temas · Mapas · Equipo.

**Rutas públicas:** `/p/<token>` (vista pública), `/p/<token>?embed=1` (embed), `/join/<token>` (invitación).

**Soporte técnico:** ver `docs/PLAN.md` (arquitectura), `docs/APRENDIZAJES.md` (notas técnicas),
`docs/DECISIONES.md` (decisiones).

---

> **Versión Word/PDF con marca Intersel:** este manual está en Markdown para vivir versionado con el
> proyecto. Si quieres una versión **Word o PDF** con el **logotipo de Intersel** en el encabezado y
> tablas en la colorimetría azul `#4377BC`, comparte el archivo del logotipo y la genero.

*© Intersel · Intersel Insight.*
