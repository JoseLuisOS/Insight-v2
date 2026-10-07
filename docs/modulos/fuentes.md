# 5. Fuentes externas — v1

- **Descripción:** administración de conexiones externas y acción de importar su contenido hacia datasets.
- **Archivo principal:** `src/app/(app)/sources/page.tsx` y `src/app/(app)/sources/actions.ts`.
- **Archivos relacionados:** `src/components/external-sources.tsx`; `supabase/functions/import-external/index.ts`; `src/lib/supabase/server.ts`.
- **Funciones/componentes importantes:** `addExternalSource`, `deleteExternalSource`, `ExternalSources`, `SourceCard`; Edge Function contiene `sanitizeKey`, `inferType`, `hostLooksInternal`.
- **Padres:** shell, autenticación y Supabase.
- **Hijos:** gestión de fuentes y proceso Edge de importación.
- **Hermanos/interacciones:** la importación entrega datos al módulo Datasets; depende del almacenamiento/funciones de Supabase.
