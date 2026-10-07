---
name: insight-v2
description: Insight domain rules — load when a task touches authentication, authorization, IAM/permissions, the module catalog, organizations, the data model or SQL, v1→v2 migration, or publishing to GitHub/Vercel. For the general development workflow use insight-dev.
---

# Intersel Insight — skill maestra

Reglas de dominio que no están en `AGENTS.md` (siempre cargado: protocolo de lectura, modelo y documentación) ni en [`insight-dev`](../insight-dev/SKILL.md) (flujo y buenas prácticas). Lee solo la sección que aplique a la tarea.

## Sincronización con GitHub y Vercel

- Este checkout, la rama `main` y el proyecto de Vercel que usa el usuario son el entorno de desarrollo, aunque Vercel etiquete un despliegue como **Production**. Antes de un cambio importante (autenticación, permisos, esquema, importación o configuración de despliegue), revisa `git status`, la rama, `HEAD`, `origin` y el commit del despliegue relevante en Vercel. Ejecuta `git fetch` para conocer el estado remoto; no hagas `pull`, `rebase`, `reset`, `checkout` ni descartes archivos mientras haya cambios locales sin preservar.
- Trata los cambios locales preexistentes como trabajo del usuario. Antes de sincronizar, separa los archivos de la tarea de los ajenos; nunca incluyas `.env`, secretos, datos de prueba sensibles ni cambios ajenos en un commit.
- Cuando el usuario solicite mantener GitHub actualizado, publica los cambios de tarea en `main` con un commit acotado. No mezcles cambios locales ajenos: prepara solo los archivos de la tarea y conserva los demás sin alterar.
- Para revisar una tarea en Vercel, publica primero el commit de `main`, espera a que el despliegue del entorno de desarrollo quede listo y comprueba su URL y logs, independientemente de la etiqueta de Vercel. Tras verificar, vuelve a comprobar rama, commit y estado local y reporta el commit y el ID/estado del despliegue.
- Antes de cerrar un cambio importante, confirma que GitHub contiene el commit revisado y que Vercel ejecutó ese mismo commit cuando la tarea requiera revisión visual o funcional allí. No reportes una tarea como vista en Vercel si solo se verificó localmente.

## Versiones y evolución del código

- El producto objetivo de Insight-v2 usa organizaciones (`organization_id`), memberships y permisos. No introduzcas `tenant_id` ni una entidad `tenants` como modelo nuevo.
- La carpeta hermana `../intersel-insight` es la primera versión y sirve solo como referencia de comparación. No la modifiques al trabajar en Insight-v2 y no portes código automáticamente: adapta el comportamiento al modelo objetivo.
- La columna «Ver.» de `docs/MAPA_MODULOS.md` indica si un módulo es v1 o v2; las reglas por archivo están en `docs/modulos/general.md`. El inventario original es v1 salvo Perfil. El administrador Insight y sus archivos nuevos son v2; las guardas agregadas a rutas v1 no migran por sí solas esos flujos.
- Al actualizar un módulo v1, revisa su flujo y dependencias para sustituir el contexto de tenant por organización/membership según el objetivo. Actualiza su ficha, la columna «Ver.» del índice y `docs/modulos/general.md` cuando el módulo haya sido migrado y verificado; no marques como v2 solo por editarlo.

## Seguridad y datos

- `auth` es administrado por Supabase. Los objetos propios aplicados están en `insight_core`, `insight_iam` e `insight_survey`; `private` contiene auxiliares RLS y `public` las RPC expuestas. No recrees `platform` ni `intersel_insight` en código SQL nuevo.
- `insight_app` es la conexión SQL predeterminada de `scripts/run-sql.js`; usa `--admin` solamente cuando una tarea de DBA necesite explícitamente `postgres`. Los tres schemas propios no están expuestos directamente por la Data API.
- Confirma el estado remoto de un SQL solo si la tarea requiere operar con la base de datos; antes, comprueba qué código lo consume.
- Trata `src/lib/supabase/admin.ts` como código privilegiado: `createAdminClient()` usa `SUPABASE_SERVICE_ROLE_KEY` y solo debe invocarse en operaciones de servidor justificadas.
- Comprueba autenticación y autorización en la operación concreta que vayas a cambiar; no des por hecho que una guarda de UI o el Proxy cubren una Server Action.
- El catálogo `insight_core.app_groups`/`app_modules` gobierna el menú y las guardas; `insight_iam.iam_modules` agrupa permisos. El alta de un módulo crea `<module_code>.operar` y lo asigna a los roles existentes. El permiso gobierna la visibilidad y entrada de usuarios no sysadmin, con excepciones individuales antes que roles. Un módulo nuevo sin página propia usa `/workspace/[code]` y muestra un aviso de construcción; al implementar su página, registra la ruta en `src/lib/nav.ts` y añade su guarda. Cada mutación del catálogo o de permisos exige `sysadmin` en el endpoint.
- El grupo fijo **Insight / Componentes y Organizaciones** solo lo ve `sysadmin` y nunca depende del estado del catálogo. **Administración / Permisos** y **Administración / Roles** sí están en `app_modules`: su estado gobierna menú, página y API, aunque su operación sigue reservada a `sysadmin`. **Administración / Usuarios** también usa el catálogo gestionable y exige permisos de membresía por operación. Para los componentes gestionables: `apagado` excluye a todos, `desarrollo` es solo `sysadmin` y `disponible` permite a usuarios con membresía activa y permiso `operar`, salvo controles exclusivos de sysadmin. No reintroduzcas concesiones por organización en el catálogo; las asignaciones particulares se resuelven mediante roles y excepciones individuales de IAM.
- `sysadmin` es un único rol global interno de `iam_platform_admins`, asignado a `sysadminodin@temikia.com`; nunca se crea en `iam_roles` ni se administra desde Usuarios o Roles. La cuenta maestra no tiene membresías de organización y accede mediante los privilegios globales existentes.
