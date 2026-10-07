# Ver Como — v2

- **Descripción:** Sysadmin activa una máscara desde la fila de un miembro activo en Usuarios, dentro de la organización seleccionada. La sesión de Supabase y el actor de las operaciones siguen siendo Sysadmin; la máscara añade el contexto visible del miembro y sus accesos al catálogo, sin retirar las capacidades administrativas. Una banda delgada encima de la cabecera identifica al usuario y la organización y permite salir de la máscara.
- **Archivo principal:** `src/lib/view-as.ts` y `src/app/api/insight/view-as/route.ts`.
- **Archivos relacionados:** `src/components/insight/users-manager.tsx`, `src/components/insight/view-as-banner.tsx`, `src/app/(app)/team/page.tsx`, `src/app/(app)/surveys/page.tsx`, `src/components/insight/surveys-manager.tsx`, `src/app/(app)/layout.tsx`, `src/app/auth/signout/route.ts` y `src/lib/insight-catalog.ts`.
- **Funciones importantes:** `getViewedUser`, `POST/DELETE /api/insight/view-as`, `ViewAsBanner`.
- **Padres:** Usuarios y sesión autenticada de Sysadmin. La API valida la identidad real, la membresía activa y la organización activa en cada activación; el contexto se vuelve a validar al leerlo.
- **Hermanos/interacciones:** Usuarios y Encuestas seleccionan inicialmente la organización de la máscara; Sysadmin puede elegir las demás organizaciones que administra. Se conserva el aislamiento y la autorización de cada módulo con el actor real. Los módulos v1 aún usan `profiles`/`tenants`; esta máscara no los convierte en flujos v2 ni suplanta el JWT de Supabase.
