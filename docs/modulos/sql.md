# 6. Consultas y SQL — v1

- **Descripción:** edición de consultas SQL, generación de SQL desde una interfaz visual, ejecución y guardado de consultas.
- **Archivo principal:** `src/app/(app)/sql/actions.ts` (ejecución/guardado) y `src/lib/query-builder.ts` (generación pura de SQL).
- **Archivos relacionados:** `src/app/(app)/sql/page.tsx`; `src/app/(app)/query/new/page.tsx`; `src/components/sql-lab.tsx`; `src/components/query-builder.tsx`; `src/lib/datasets.ts`; `src/lib/supabase/server.ts`.
- **Funciones importantes:** `runSql`, `saveSqlQuery`, `buildSql`, `SqlLab`, `QueryBuilder`.
- **Padres:** shell y Supabase.
- **Hijos:** editor SQL y constructor sin código.
- **Hermanos/interacciones:** consulta datasets y produce resultados que pueden guardarse como consultas/datasets y alimentar visualizaciones.
- **Dependencia sensible:** la acción de ejecución y los privilegios/RPC de base de datos definen el límite real de seguridad; revisar ambos antes de modificar SQL ejecutable.
