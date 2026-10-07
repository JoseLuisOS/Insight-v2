# Área provisional de módulos — v2

- **Descripción:** destino automático del menú para módulos del catálogo sin ruta implementada. Muestra nombre, descripción y aviso de construcción; exige el mismo acceso de catálogo que la página final.
- **Archivo principal:** `src/app/(app)/workspace/[code]/page.tsx`.
- **Archivos relacionados:** `src/app/(app)/layout.tsx`, `src/lib/nav.ts`, `src/lib/insight-catalog.ts`, `src/lib/insight-db.js`, `src/components/navigation/nav-icon.tsx` y `scripts/018_managed_admin_modules.sql`.
- **Funciones importantes:** `ModuleWorkspace`, `userCatalogAccess`, `requireCatalogAccess`.
- **Padres:** grupo y módulo de `app_groups`/`app_modules`, shell y permiso `<code>.operar`.
- **Hijos:** tarjeta provisional; la ruta definitiva sustituye este destino al registrarse en `NAV`.
- **Hermanos/interacciones:** el trigger de catálogo crea el permiso y su asignación inicial; el shell genera el enlace provisional cuando no encuentra un código en `NAV`.

> **Estado:** inventario actualizado con la integración del catálogo y Organizaciones. El modelo objetivo de organización se documenta en [`ARQUITECTURA_BBDD.md`](../ARQUITECTURA_BBDD.md).
> **Propósito:** ubicar procesos, archivos y dependencias antes de modificar la aplicación, sin tener que recorrer todo el repositorio en cada tarea.
