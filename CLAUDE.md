# Guía de trabajo para Intersel Insight

Sigue [`AGENTS.md`](AGENTS.md) para las reglas de trabajo del repositorio. Empieza por [`docs/MAPA_MODULOS.md`](docs/MAPA_MODULOS.md) al ubicar código y dependencias.

## Modelo objetivo

La aplicación será **multi-organización, no multitenant**. Una instalación equivale a un deployment y puede alojar varias organizaciones. Los usuarios son globales a la instalación; memberships, roles y permisos determinan su acceso por organización. `organization_id` es el ámbito de pertenencia y aislamiento de los datos. La referencia de diseño es [`ARQUITECTURA_BBDD.md`](ARQUITECTURA_BBDD.md).

El código actual aún tiene contratos heredados (`tenant_id`, `profiles`, `tenants`). Separa siempre el modelo objetivo del estado que realmente implementa el archivo que vas a cambiar.

## Fuentes y documentación

- Código ejecutable: evidencia del comportamiento implementado.
- `ARQUITECTURA_BBDD.md`: referencia objetivo de multi-organización e IAM.
- `docs/MAPA_MODULOS.md`: índice de navegación del código.
- Otros documentos Markdown: referencias no verificadas hasta su revisión.

No copies credenciales ni valores de `.env` a documentación. No asumas que una migración está aplicada solo porque existe en el repositorio.

@AGENTS.md
