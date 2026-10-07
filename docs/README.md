# Documentación de Intersel Insight

Usa este índice para elegir **solo los documentos pertinentes a la tarea**. Para cambios de código, empieza por la sección afectada de `MAPA_MODULOS.md` y confirma el comportamiento en el código. Abre las demás referencias únicamente cuando la dependencia o la decisión lo requiera. El código describe lo implementado; `ARQUITECTURA_BBDD.md` describe el modelo objetivo y el estado aplicado documentado. Las notas históricas no son contratos vigentes.

## Ruta de lectura según la tarea

| Si vas a trabajar en… | Abre primero | Amplía solo si hace falta |
| --- | --- | --- |
| Una ruta o componente existente | [MAPA_MODULOS.md](MAPA_MODULOS.md), sección del módulo | Código y dependencias inmediatas; [BITACORA.md](BITACORA.md) si importa el motivo de una decisión. |
| Esquema, SQL, organización o IAM | [ARQUITECTURA_BBDD.md](ARQUITECTURA_BBDD.md), «Estado aplicado» y sección pertinente | [MAPA_MODULOS.md](MAPA_MODULOS.md) para consumidores; [GUIA_MIGRACION_V1_A_V2.md](GUIA_MIGRACION_V1_A_V2.md) si se adapta un flujo v1. |
| Encuestas: consultas o análisis | [MAPA_DATOS_ENCUESTAS.md](MAPA_DATOS_ENCUESTAS.md) | [ARQUITECTURA_BBDD.md](ARQUITECTURA_BBDD.md) para aislamiento y permisos; código de `src/lib/insight-surveys.ts`. |
| Encuestas: importación u operación | [IMPORTAR_ENCUESTAS.md](IMPORTAR_ENCUESTAS.md) | [MANUAL_TECNICO_CARGA_ENCUESTAS.md](MANUAL_TECNICO_CARGA_ENCUESTAS.md), [MATRIZ_PRUEBAS_ENCUESTAS.md](MATRIZ_PRUEBAS_ENCUESTAS.md) o [ENCUESTAS_HCV_2025.md](ENCUESTAS_HCV_2025.md), según el caso. |
| Gráficas v2 y su especificación | [ESPECIFICACION_GRAFICAS_V2.md](ESPECIFICACION_GRAFICAS_V2.md) | [ENTREVISTA_GRAFICAS_V2.md](ENTREVISTA_GRAFICAS_V2.md) para las respuestas originales; [MAPA_DATOS_ENCUESTAS.md](MAPA_DATOS_ENCUESTAS.md) y secciones de Gráficas, Dashboards y Publicación en [MAPA_MODULOS.md](MAPA_MODULOS.md). |
| Una decisión visual o interacción | [skill de UX/UI](../.claude/skills/insight-ux-ui/SKILL.md) | Componente actual y sección pertinente de [MAPA_MODULOS.md](MAPA_MODULOS.md). |
| La razón histórica de una decisión | [BITACORA.md](BITACORA.md), buscando el término o fecha | [LOG.md](LOG.md) o el archivo histórico específico, tras comprobarlo con el estado actual. |

No recorras todo `docs/` por rutina. Busca el término en este índice o en el mapa, abre la sección indicada y amplía el contexto solo ante una dependencia concreta.

## Referencias para trabajo actual

| Documento | Uso |
| --- | --- |
| [MAPA_MODULOS.md](MAPA_MODULOS.md) | Primer punto de entrada para ubicar módulos, rutas y dependencias. |
| [ARQUITECTURA_BBDD.md](ARQUITECTURA_BBDD.md) | Modelo objetivo multi-organización y estado aplicado documentado de la base. |
| [MAPA_DATOS_ENCUESTAS.md](MAPA_DATOS_ENCUESTAS.md) | Relaciones implementadas de Encuestas y unidades de análisis. |
| [CONTEXTO_PRODUCTO.md](CONTEXTO_PRODUCTO.md) | Intención del producto y criterios que sobreviven a los documentos v1. |
| [GUIA_MIGRACION_V1_A_V2.md](GUIA_MIGRACION_V1_A_V2.md) | Ruta de revisión para migrar un flujo v1. |
| [BITACORA.md](BITACORA.md) | Motivos y resultados de cambios de Insight-v2. |
| [ENTREVISTA_GRAFICAS_V2.md](ENTREVISTA_GRAFICAS_V2.md) | Respuestas originales y aclaraciones cerradas para Gráficas v2. |
| [ESPECIFICACION_GRAFICAS_V2.md](ESPECIFICACION_GRAFICAS_V2.md) | Alcance inicial y propuesta de arquitectura del catálogo, fuentes y motores de Gráficas v2. |
| [PENDIENTES.md](PENDIENTES.md) | Ideas diferidas registradas cuando el usuario lo solicita; no son alcance aprobado. |

## Encuestas: operación y antecedentes

- [IMPORTAR_ENCUESTAS.md](IMPORTAR_ENCUESTAS.md): flujo de carga para operadores.
- [MANUAL_TECNICO_CARGA_ENCUESTAS.md](MANUAL_TECNICO_CARGA_ENCUESTAS.md): implementación, límites y diagnóstico de la carga.
- [ENCUESTAS_HCV_2025.md](ENCUESTAS_HCV_2025.md): procedencia y particularidades de los libros iniciales.
- [MATRIZ_PRUEBAS_ENCUESTAS.md](MATRIZ_PRUEBAS_ENCUESTAS.md): casos automatizados y pendientes de comprobación en despliegue.

## Archivo histórico; requiere contraste

- [ARQUITECTURA.md](ARQUITECTURA.md): estado técnico de septiembre de 2026, anterior a los schemas `insight_*`.
- [PLAN.md](PLAN.md), [MANUAL.md](MANUAL.md), [DECISIONES.md](DECISIONES.md) y [APRENDIZAJES.md](APRENDIZAJES.md): diseño y operación de v1; contienen supuestos de `tenant_id` y otros contratos superados.
- [LOG.md](LOG.md): bitácora de v1 y de la transición inicial; los cambios posteriores están en `BITACORA.md`.
- [Conversación de origen](historico/CONVERSACION_VOZ_2026-09-21.md) e [ideas de origen](historico/IDEAS_ORIGEN_2026-09-21.md): material de contexto preservado, no especificaciones ejecutables.
- `superpowers/plans/` y `superpowers/specs/`: planes y diseños históricos; comprobar estado en código y en la base antes de reutilizar pasos.
