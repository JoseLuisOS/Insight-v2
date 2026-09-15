# supabase/

Esquema, migraciones y tests de la base de datos de Intersel Insight.

- **Project ref:** `kytvxyjvnxamqdrhwezw` · región `us-east-1` · Postgres 17.
- Las migraciones se aplican vía el **MCP de Supabase** (`apply_migration`). Esta carpeta
  guarda la copia versionada (fuente de verdad del esquema).

```
supabase/
├── migrations/
│   ├── 0001_foundation_schemas_roles_helpers.sql   # schemas, rol read-only, helpers RLS, auth hook
│   └── 0002_core_tables_and_rls_layer1.sql          # modelo de datos + RLS capa 1 (aislamiento)
└── tests/
    └── isolation_test.sql                           # gate de aislamiento cross-tenant (Fase 0)
```

## ⚠️ Paso manual pendiente — habilitar el access token hook

El aislamiento por tenant depende de que el JWT lleve `tenant_id`. La función
`app.custom_access_token_hook` ya existe, pero **debe habilitarse** en el dashboard:

1. Supabase → **Authentication → Hooks** (o *Auth Hooks*).
2. **Customize Access Token (JWT) Claims** → habilitar.
3. Apuntar a `app.custom_access_token_hook` (schema `app`).

Hasta que se habilite, los usuarios autenticados no tendrán `tenant_id` en su JWT y la RLS
los bloqueará (comportamiento seguro por defecto). Las pruebas de aislamiento no dependen del
hook: simulan los claims con `set_config('request.jwt.claims', ...)`.

## Modelo de seguridad (resumen)

- **RLS capa 1** (aislamiento por tenant): activa en todas las tablas. `TO authenticated`.
- **service_role** omite RLS — sólo para Edge Functions (ingesta, snapshots).
- **anon** no tiene acceso a estas tablas; la ruta pública usará una función
  `SECURITY DEFINER` sobre `snapshots` (épica Publicación).
- Rol `app_readonly` (`NOBYPASSRLS`): ejecución segura de SQL de usuario (épica SQL).

Ver `../docs/PLAN.md` §4–§6 para el detalle.
