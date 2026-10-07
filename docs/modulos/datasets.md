# 4. Datasets e ingestión — v1

- **Descripción:** lista y detalle de datasets, carga CSV y aplicación de filtros por fila al obtener datos.
- **Archivo principal:** `src/lib/datasets.ts` (`fetchDatasetData`) para lectura; `src/app/(app)/datasets/new/actions.ts` (`ingestDataset`) para ingestión.
- **Archivos relacionados:** `src/app/(app)/datasets/{page.tsx,[id]/page.tsx,policy-actions.ts,new/page.tsx,new/actions.ts}`; `src/components/csv-uploader.tsx`; `src/components/row-policy-manager.tsx`; `src/lib/csv.ts`; `src/lib/supabase/server.ts`.
- **Funciones importantes:** `fetchDatasetData`, `buildRowFilter`, `sanitizeKey`, `inferType`, `buildTable`, `ingestDataset`.
- **Padres:** shell para UI; Supabase para persistencia.
- **Hijos:** carga CSV, detalle, reglas de acceso por fila y consumo de datos por consultas, gráficas y dashboards.
- **Hermanos/interacciones:** SQL Lab y constructor de consulta leen datasets; visualización los convierte en filas/columnas. Fuentes externas materializan datos en este módulo.
- **Estado actual / entidades observadas:** `datasets`, `dataset_row_policies`, `query_cache`, RPC `run_query`; varias escrituras usan `tenant_id`. El objetivo es atribuir los datos privados a una organización mediante `organization_id` y aplicar el modelo de membresías/autorización descrito en `ARQUITECTURA_BBDD.md`.
