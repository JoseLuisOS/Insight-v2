# 13. Base de datos y funciones Edge — v1/v2 mixto

- **Descripción:** persistencia y lógica delegada fuera de Next.js. Conviven SQL antiguo basado en tenant y scripts nuevos del modelo multi-organización; el número de versión se indica por archivo/módulo y no se deduce solo por la carpeta.
- **Archivos principales:** `supabase/functions/import-external/index.ts`; SQL bajo `scripts/` y `supabase/migrations/`.
- **Archivos relacionados:** `scripts/run-sql.js`, scripts SQL y de provisionamiento, pruebas SQL, clientes Supabase y RPC referenciados en `src/`.
- **Funciones importantes:** Edge Function `import-external`; RPCs llamados desde la aplicación (por ejemplo `run_query`; identificar otros buscando `.rpc(` en el código al trabajar un flujo).
- **Padres:** Supabase/Postgres externo a la aplicación Next.js.
- **Hijos:** esquemas, tablas, políticas, funciones SQL y almacenamiento.
- **Hermanos/interacciones:** módulos de dominio invocan Supabase mediante clientes compartidos; la Edge Function importa fuentes externas.
- **Confianza del inventario:** la presencia de un archivo SQL no confirma que esté aplicado ni vigente. No aplicar ni usar una migración como contrato sin verificar su consumidor y estado por separado.
- **Estado SQL confirmado (2026-09-29):** `auth` es de Supabase. `insight_app` es el rol SQL dedicado y propietario de 28 tablas propias: 6 en `insight_core`, 10 en `insight_iam`, 12 en `insight_survey`. El catálogo gestionable observado tras `020` tiene 5 grupos y 14 módulos; Insight está fuera. La base aún contiene el módulo provisional `organizacion` que `019` documenta como retirado. `platform`, `intersel_insight` y el schema vacío `survey` ya no existen. `scripts/run-sql.js` usa `APP_DATABASE_URL` por defecto y requiere `--admin` para la conexión `postgres`.
- **Dependencias inmediatas de base:** `auth.users` → perfiles, administradores y membresías; `insight_core.core_organizations` → membresías, roles, encuestas y concesiones de módulos; `private` → funciones de RLS; `public` → RPC consumidas por Next.js. Migraciones de encuestas hasta `scripts/023_organization_prefix_survey_codes.sql`; confirma el estado aplicado de cada una antes de reutilizarla. Los tres schemas propios no se exponen directamente por la Data API.
