# Guía breve: migrar módulos v1 a v2

Esta guía explica cómo adaptar una pieza de la aplicación al modelo multi-organización. No repite el modelo completo: usa [`ARQUITECTURA_BBDD.md`](ARQUITECTURA_BBDD.md) como contrato objetivo y [`MAPA_MODULOS.md`](MAPA_MODULOS.md) como índice del código y estado de versión.

Antes de tocar código, abre primero el mapa. Al agregar, quitar o reubicar componentes, rutas o servicios, actualízalo en el mismo cambio. Existe una bitácora de referencia en [`BITACORA.md`](BITACORA.md); al cerrar trabajo de código o documentación de producto, agrega una entrada breve con listas bajo **¿Qué?**, **¿Por qué?** y **¿Para qué?**, nunca una tabla.

## Modelo objetivo

- Intersel Insight es **multi-organización, no multitenant**. Un deployment puede contener varias organizaciones; no se agrega `installation_id`.
- El usuario es global a la instalación. La membresía activa vincula usuario y organización; los roles y permisos pertenecen a ese contexto.
- Las filas privadas se atribuyen con `organization_id`. Las consultas y políticas deben impedir acceso a organizaciones donde el usuario no tiene membresía autorizada.
- No crear ni conservar como modelo objetivo `tenants`, `tenant_id`, `profile.role` global, ni claims que seleccionen un único tenant. Esos términos solo describen partes de la versión 1 que aún existen.
- El aislamiento organizacional y la autorización de acciones son controles distintos. Usa RLS para limitar filas por organización y valida permisos en cada operación de servidor.

## Flujo de trabajo para una tarea de migración

1. **Localiza el módulo** en el mapa. Identifica ruta/archivo principal, acciones, servicios y consumidores inmediatos.
2. **Lee el flujo v1 afectado** en Insight-v2. Consulta la carpeta hermana `../intersel-insight` solo si hace falta recuperar un comportamiento original; úsala en modo lectura.
3. **Busca contratos heredados** dentro del alcance (`tenant_id`, `tenants`, `profiles`, `current_tenant`, roles simples, RPCs asociados). No hagas reemplazos globales: clasifica cada uso por responsabilidad.
4. **Consulta solo las secciones pertinentes** de `ARQUITECTURA_BBDD.md`: IAM/membresías para identidad y permisos; `organization_id`/RLS para datos; recursos/ACL para autorización por recurso.
5. **Adapta el flujo completo**: entrada y contexto de organización, consultas, escrituras, validación de permisos, políticas/RPC y UI que depende de esos resultados. Si falta una pieza de base de datos, describe el contrato/migración necesaria antes de asumir que existe.
6. **Actualiza el mapa** con archivos/relaciones cambiados. Cambia la etiqueta del módulo a v2 solo cuando su flujo use el modelo objetivo de extremo a extremo y se haya verificado; una edición parcial sigue siendo v1/en migración.

## Búsquedas de orientación

```text
rg -n "tenant_id|tenants|current_tenant|profiles" src scripts supabase
rg -n "organization_id|core_organizations|iam_organization_memberships|iam_has_permission" src scripts
```

Restringe las búsquedas a las rutas relacionadas cuando el módulo ya esté localizado. No leas todos los documentos o fuentes por rutina.

## Criterios de cierre de un módulo

- El usuario y la organización activa se resuelven con el modelo de memberships, no con una relación usuario→tenant única.
- Cada lectura/escritura queda acotada a las organizaciones autorizadas; no confía en un `organization_id` enviado por el navegador sin validación.
- Las acciones y operaciones de servidor verifican el permiso requerido; la presencia de un enlace o control en la UI no concede acceso.
- Las relaciones entre datos no permiten referencias cruzadas entre organizaciones; revisa integridad de claves y RLS.
- La UI representa claramente el contexto de organización si el flujo permite cambiar de organización.
- El mapa indica versión y archivos principales, y separa lo implementado de lo que depende de una migración pendiente.

## Precauciones

- La carpeta `supabase/migrations/` contiene SQL del modelo v1 basado en `tenants`; no aplicarlo al modelo v2 por el hecho de que esté versionado.
- Los scripts `scripts/003..010` contienen piezas del modelo organizacional, pero la presencia de un archivo no demuestra que esté aplicado en la base remota. Comprueba el estado requerido cuando la tarea opere sobre la base.
- Perfil es el único módulo marcado v2 por decisión del usuario. Conserva esa etiqueta; verifica sus RPCs y permisos antes de asumir que el resto del sistema ya comparte sus contratos.
