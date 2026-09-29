# Módulo de alta de usuarios — Diseño

> **Diseño histórico, no contrato vigente.** Confirma sus endpoints, permisos, RPCs y estado implementado en el código antes de usarlo. El modelo objetivo multi-organización está en [`../../../ARQUITECTURA_BBDD.md`](../../../ARQUITECTURA_BBDD.md); consulta [`../../MAPA_MODULOS.md`](../../MAPA_MODULOS.md) para el estado de los módulos.

**Fecha:** 2026-09-24 · **Estado:** pendiente de revisión del usuario
**Base:** `ARQUITECTURA_BBDD.md` (mismo modelo que `C:\Users\chesh\Files\GitApps\temikia-app\docs\ARQUITECTURA_BBDD_RBAC.md`),
ya implementado en `scripts/003`–`006`.

## 1. Objetivo y alcance

Permitir que un administrador **cree cuentas de usuario** y las asigne a una organización con
uno o más roles, sin registro público. Es el reemplazo de la pantalla `/team` actual, que usa el
modelo anterior (`profiles`, `tenant_invites`).

**Dentro:**
- Alta de usuario: correo, nombre, organización, roles, contraseña temporal (autogenerada, editable).
- Correo ya existente (usuarios globales, spec §2) → solo se agrega a la organización; su
  contraseña no se toca.
- Lista de solo lectura de los miembros de la organización (para ver el resultado del alta).
- Quién puede crear: **sysadmin** en cualquier organización; cualquier miembro activo con
  `members.invite` (por rol, sin override `deny`) solo en sus organizaciones.

**Fuera (explícito):** editar/suspender/revocar usuarios, editor de roles/permisos, overrides
por usuario, ACL por recurso, correo de invitación, gestor de organizaciones.

## 2. Restricciones heredadas

- `platform` no está expuesto por la Data API (ni para `service_role`) → toda lectura/escritura
  de `platform.*` desde la app pasa por funciones en `public` (patrón de `scripts/007`/`008`).
  Esas funciones se crean con la **conexión admin** (`postgres`), no `--app`.
- Autorización por permiso vive en la capa de aplicación/funciones, no en RLS (spec §23);
  RLS solo aísla por organización.
- `DEFAULT = DENY` (spec §13).
- Cuentas admin-provisionadas: `email_confirm: true` y `app_metadata.must_change_password = true`
  (flujo existente en `src/app/change-password`).

## 3. Base de datos — `scripts/010_public_member_admin_rpc.sql`

Todas `SECURITY DEFINER`, `set search_path = ''`, `revoke ... from public, anon`.

| Función | Ejecutable por | Qué hace |
|---|---|---|
| `private.has_permission(p_org uuid, p_code text)` | `authenticated` | Regla §13: sysadmin → true; sin membresía `active` → false; override (`allow`/`deny`) gana; si no, unión de permisos de los roles de la membresía; si no, false. |
| `public.list_invitable_orgs()` | `authenticated` | `(id, name)` de las organizaciones donde `has_permission(id,'members.invite')`; todas si es sysadmin. |
| `public.list_org_roles(p_org)` | `authenticated` | Roles `(id, code, name)` de la organización; exige `members.invite` o `members.view`. |
| `public.list_org_members(p_org)` | `authenticated` | `(user_id, email, display_name, status, roles[])`; exige `members.view`. Lee el correo de `auth.users` dentro de la función. |
| `public.add_organization_member(p_org, p_user_id, p_display_name, p_role_ids uuid[])` | `authenticated` | Ver abajo. |
| `public.find_auth_user_by_email(p_email)` | **solo `service_role`** | Devuelve `uuid` o `null`. No está expuesta a usuarios. |

**`add_organization_member`** (re-verifica todo; no confía en la Server Action):
1. `has_permission(p_org,'members.invite')` o error.
2. `p_role_ids` no vacío y todos pertenecen a `p_org`; si incluye el rol `owner`, el llamador
   debe ser Owner de `p_org` o sysadmin (regla anti-escalamiento).
3. El usuario `p_user_id` existe en `auth.users`.
4. `core_user_profiles`: crea la fila si falta con `display_name` (si ya existe, **no** sobrescribe).
5. Membresía `(p_org, p_user_id)`: si ya existe `active`/`invited`/`suspended` → error
   "ya es miembro"; si está `revoked` → error (reactivar queda fuera de alcance).
   Si no, inserta con `status='active'`, `joined_at=now()`.
6. Inserta `iam_membership_roles`. Devuelve `membership_id`.

**Test** `scripts/tests/002_member_admin_test.sql` (transaccional, `rollback`, patrón de `001`):
- miembro sin `members.invite` → error; Admin de A no puede sobre B; sysadmin sí.
- override `deny` sobre `members.invite` bloquea aunque el rol lo dé.
- rol de otra organización → error; rol `owner` por no-Owner → error.
- doble alta → "ya es miembro".

## 4. Aplicación

**Ruta `/team`** (se conserva la ruta y el ítem "Equipo" de `src/lib/nav.ts`; se renombra la
etiqueta a "Usuarios"). Se eliminan `team-table.tsx`, `invite-manager.tsx` y el código de
`(app)/team/actions.ts` sobre `tenant_invites`/`profiles`.

- `page.tsx` (server): carga organizaciones invitables; sin ninguna → mensaje de acceso
  restringido. Con una → esa; con varias → selector (`?org=`). Carga miembros con
  `list_org_members` y roles con `list_org_roles`.
- `member-list.tsx`: tabla de solo lectura.
- `new-user-form.tsx` (client): modal/panel con correo, nombre, organización, roles
  (multi-selección), contraseña temporal (autogenerada de 16 caracteres con `crypto.getRandomValues`,
  editable, mín. 12). Tras el éxito muestra la contraseña **una sola vez** con botón de copiar.
- `actions.ts` — `createUser(input)` (Server Action):
  1. Valida entrada (correo, nombre no vacío, ≥1 rol, contraseña ≥ 12 si se envía).
  2. Cliente de la sesión → `list_invitable_orgs` confirma que la organización es válida
     (fallo rápido; la autoridad real es el paso 5).
  3. Cliente admin → `find_auth_user_by_email`. Si no existe → `auth.admin.createUser`
     (`email_confirm`, `must_change_password`); marca `created = true`.
  4. Si ya existía, **no** se devuelve contraseña.
  5. Cliente de la sesión → `add_organization_member`.
  6. Si el paso 5 falla y `created`, `auth.admin.deleteUser` (sin cuentas huérfanas).
  7. `revalidatePath('/team')`; devuelve `{ ok, existing, tempPassword? }` o `{ error }` en español.
- Mensajes de error de la RPC se mapean a texto legible ("Ya es miembro de esta organización",
  "No tienes permiso…").

## 5. Manejo de errores y seguridad

- Ningún secreto en logs; el `service_role` solo en `lib/supabase/admin.ts` (server-only).
- La contraseña temporal solo viaja en la respuesta de la acción y no se persiste.
- Enumeración de correos: solo quien ya tiene `members.invite` obtiene la distinción
  "cuenta existente" (decisión aceptada).
- La Server Action nunca es la única barrera: `add_organization_member` decide.

## 6. Verificación

`node scripts/run-sql.js scripts/tests/002_member_admin_test.sql` (debe imprimir PASS),
`npm run lint`, `npm run build`, y flujo manual: sysadmin crea usuario nuevo, crea usuario con
correo existente en otra organización, Admin sin `members.invite` recibe restricción, primer
login del usuario nuevo fuerza cambio de contraseña. Registro en `docs/LOG.md` y sección de
`docs/ARQUITECTURA.md`.

## 7. Riesgos conocidos

- `bootstrap_first_organization` (`scripts/007`) solo da permisos al rol Owner; en una
  organización creada por ese camino, Administrator no tendría `members.invite`. La org actual
  (HCV, `scripts/004`) sí los tiene. Fuera de alcance aquí; se anota para el gestor de organizaciones.
- La BD es única y de producción: `010` se aplica una sola vez con la conexión admin, tras la
  aprobación del plan. Las funciones son idempotentes (`create or replace`).
