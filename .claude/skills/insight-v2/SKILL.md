---
name: insight-v2
description: Use when changing or understanding the Intersel Insight application in this repository. Provides a code-first workflow, module map, and project-specific context rules.
---

# Intersel Insight — skill maestra

## Orientación

- Antes de tocar código, consulta [`docs/MAPA_MODULOS.md`](../../../docs/MAPA_MODULOS.md). Localiza el componente, su versión, archivo principal y dependencias inmediatas; luego confirma esos detalles en el código.
- Confirma el comportamiento en el código ejecutable. El mapa es un índice y puede quedar desactualizado después de cambios.
- [`ARQUITECTURA_BBDD.md`](../../../ARQUITECTURA_BBDD.md) es la referencia designada por el usuario para el estado aplicado de la base y el modelo objetivo de datos. El producto es multi-organización, no multitenant: cada deployment es una instalación y puede contener varias organizaciones; el acceso a datos se delimita por organización.
- Distingue objetivo y estado: el código actual aún contiene contratos `tenant_id`/`profiles`/`tenants`; no los presentes como modelo objetivo ni asumas que ya fueron migrados. Confirma el estado en la ruta afectada.
- Los demás documentos Markdown preexistentes son referencias no verificadas hasta contrastar sus afirmaciones con el código o con una fuente que el usuario declare vigente.

## Flujo de trabajo con contexto acotado

1. Identifica la ruta, acción o componente principal con búsquedas dirigidas (`rg`).
2. Lee ese archivo y solo sus dependencias, consumidores y tipos inmediatos relevantes para la tarea.
3. Antes de modificar código que use Next.js, consulta la guía aplicable a la versión de `package.json` en `node_modules/next/dist/docs/`.
4. Implementa el cambio pedido sin cargar documentación o módulos no relacionados. Amplía la inspección si el código revela una dependencia necesaria.
5. Actualiza `docs/MAPA_MODULOS.md` cuando cambien rutas, relaciones, contratos compartidos o flujos. Mantén las afirmaciones separadas entre observaciones confirmadas e inferencias.
6. Si agregas, quitas o reubicas un componente, ruta o servicio, actualiza el mapa en el mismo cambio.
   Al cambiar schemas, tablas, permisos o RPC de la base, actualiza también el estado aplicado en `ARQUITECTURA_BBDD.md` después de verificar la migración.
7. Existe una bitácora de referencia en [`docs/BITACORA.md`](../../../docs/BITACORA.md). Consúltala solo si el historial aporta contexto. Al cerrar un cambio de código o documentación de producto, agrega una entrada breve al final: una lista bajo cada encabezado **¿Qué?**, **¿Por qué?** y **¿Para qué?**. No uses tablas ni repitas el diff.
8. Informa qué archivos cambiaste y qué verificación hiciste. No ejecutes pruebas si el usuario no las pidió.

En tareas de interfaz, consulta también [`insight-ux-ui`](../insight-ux-ui/SKILL.md) para las decisiones visuales e interactivas vigentes. Invócala y actualízala solo cuando haya trabajo o decisiones de UX/UI; mantenla fuera de cambios exclusivamente de datos, API o infraestructura.

## Versiones y evolución del código

- El producto objetivo de Insight-v2 usa organizaciones (`organization_id`), memberships y permisos. No introduzcas `tenant_id` ni una entidad `tenants` como modelo nuevo.
- La carpeta hermana `../intersel-insight` es la primera versión y sirve solo como referencia de comparación. No la modifiques al trabajar en Insight-v2 y no portes código automáticamente: adapta el comportamiento al modelo objetivo.
- Usa `docs/MAPA_MODULOS.md` para saber si un módulo/archivo se considera v1 o v2. El inventario original es v1 salvo Perfil. El administrador Insight y sus archivos nuevos son v2; las guardas agregadas a rutas v1 no migran por sí solas esos flujos.
- Al actualizar un módulo v1, revisa su flujo y dependencias para sustituir el contexto de tenant por organización/membership según el objetivo. Actualiza el mapa y el estado de versión cuando el módulo haya sido migrado y verificado; no marques como v2 solo por editarlo.

## Seguridad y datos

- `auth` es administrado por Supabase. Los objetos propios aplicados están en `insight_core`, `insight_iam` e `insight_survey`; `private` contiene auxiliares RLS y `public` las RPC expuestas. No recrees `platform` ni `intersel_insight` en código SQL nuevo.
- `insight_app` es la conexión SQL predeterminada de `scripts/run-sql.js`; usa `--admin` solamente cuando una tarea de DBA necesite explícitamente `postgres`. Los tres schemas propios no están expuestos directamente por la Data API.
- No leas, copies ni incluyas valores secretos de `.env` en respuestas o documentación.
- No asumas que un archivo SQL está aplicado o vigente por estar presente en el repositorio. Comprueba qué código lo consume y confirma el estado remoto solo si la tarea requiere operar con la base de datos.
- Trata `src/lib/supabase/admin.ts` como código privilegiado: `createAdminClient()` usa `SUPABASE_SERVICE_ROLE_KEY` y solo debe invocarse en operaciones de servidor justificadas.
- Comprueba autenticación y autorización en la operación concreta que vayas a cambiar; no des por hecho que una guarda de UI o el Proxy cubren una Server Action.
- El catálogo `insight_core.app_groups`/`app_modules` gobierna el menú y las guardas de página conocidas; `insight_iam.iam_modules` agrupa permisos. El permiso `<module_code>.operar` gobierna la visibilidad y entrada de usuarios no sysadmin, con excepciones individuales antes que roles. Al agregar una ruta, registra su ID y mapeo en `src/lib/nav.ts` y su guarda; crear una fila del catálogo no crea código ejecutable. Cada mutación del catálogo o de permisos exige `sysadmin` en el endpoint.
- El grupo **Insight / Componentes** es el plano de control fijo: solo lo ve `sysadmin` y nunca depende del estado del catálogo. **Administración / Permisos** y **Administración / Roles** también son fijos y exclusivos de `sysadmin`; no insertes esos controles en `app_modules`. **Administración / Usuarios** sí usa el catálogo gestionable y exige permisos de membresía por operación. Para los componentes gestionables: `apagado` excluye a todos, `desarrollo` es solo `sysadmin` y `disponible` permite a usuarios con membresía activa y permiso `operar`. No reintroduzcas concesiones por organización en el catálogo; las asignaciones particulares se resuelven mediante roles y excepciones individuales de IAM.

## Límites de esta guía

Esta guía describe cómo orientarse en el repositorio; no declara vigente una arquitectura de negocio o un esquema de base de datos que el código no confirme. Si el usuario establece una nueva fuente de verdad, actualiza esta guía y el mapa para reflejarla.
