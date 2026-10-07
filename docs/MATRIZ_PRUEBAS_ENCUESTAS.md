# Matriz de pruebas — carga de encuestas

Fecha: 2026-10-03. `scripts/generate-survey-fixture.js` genera ocho archivos `encuesta_sintetica_20p_100r*`: JSON, CSV, TXT tabulado, TXT delimitado por pipe, TXT delimitado por punto y coma, XLSX, XLS y ODS. Todos representan una encuesta cotidiana de compras de despensa en Hermosillo con 20 preguntas redactadas, 100 respuestas y 2 000 valores. Los tabulares tienen columnas desordenadas; las hojas de cálculo incluyen una segunda hoja `Ignorar`.

Estados: **Automatizada** = cubierta por `node scripts/verify-survey-fixture.js`; **Pendiente E2E** = requiere probar la aplicación desplegada, Storage, Workflow y PostgreSQL con una organización de prueba.

| Caso | Entrada / acción | Resultado esperado | Estado |
| --- | --- | --- | --- |
| F01–F08 | Validar cada archivo sintético en los seis formatos admitidos y sus variantes delimitadas | 20 preguntas redactadas, 100 registros, 2 000 respuestas; IDs y valores coinciden | Automatizada |
| F09 | XLSX, XLS y ODS con segunda hoja `Ignorar` | Solo `Respuestas` se lee; no aparece `NO_IMPORTAR` | Automatizada |
| F10 | TXT tabulado, TXT pipe, TXT punto y coma y CSV con encabezados reordenados | Se detectan columnas por pregunta, no por posición; los encabezados son preguntas completas | Automatizada |
| F11 | Intercambiar dos orígenes en vista previa | La respuesta importada de cada pregunta procede de la nueva columna | Parser automatizado; UI pendiente E2E |
| V01 | Encabezado duplicado | Validación rechazada con columna indicada | Automatizada |
| V02 | ID duplicado | Validación rechazada con fila indicada | Automatizada |
| V03 | Dato en columna sin encabezado | Validación rechazada con fila indicada | Automatizada |
| V04 | Archivo vacío, ilegible, extensión ajena o mayor a 10 MB | Rechazo sin crear instrumento | Pendiente E2E |
| V05 | JSON sin `questions`/`responses`, pregunta repetida o respuesta con código desconocido | Rechazo con causa legible | Pendiente E2E |
| V06 | JSON numérico con valor no numérico o elección fuera de opciones | Rechazo numérico; advertencia de opción antes de iniciar | Pendiente E2E |
| V07 | Tabular sin columna ID | IDs consecutivos y advertencia visible | Pendiente E2E |
| V08 | Celdas nulas, `NA`, `N/A`, `NS/NC` | Se conservan `raw_value` y marca de faltante correspondiente | Pendiente E2E |
| V09 | 501 preguntas, 20 001 registros o más de 5 millones de respuestas | Rechazo antes de insertar datos de dominio | Pendiente E2E |
| S01 | Usuario sin sesión o sin `encuestas`/`survey.create` | No recibe autorización para subir ni puede iniciar | Pendiente E2E |
| S02 | Usuario de otra organización | No ve la tarea ni puede validarla o iniciarla | Pendiente E2E |
| S03 | Inspeccionar bucket y tablas como `anon`/`authenticated` | Bucket privado; tareas y bloques sin acceso directo | Pendiente E2E |
| P01 | Subir y confirmar archivo sintético en despliegue serverless | `uploading` → `ready` → `queued` → `processing` → `completed` sin worker residente | Pendiente E2E |
| P02 | Cerrar navegador después de confirmar | Workflow termina y el instrumento queda visible al volver | Pendiente E2E |
| P03 | Reintentar un bloque ya confirmado | No duplica observaciones ni respuestas | Pendiente E2E |
| P04 | Interrumpir un bloque a mitad de transacción | El bloque revierte; reintento lo completa una vez | Pendiente E2E |
| P05 | Error de un bloque o conteo final incorrecto | Tarea `failed`, versión no publicada y encuesta incompleta oculta | Pendiente E2E |
| P06 | Dos inicios simultáneos de la misma tarea | Un único instrumento y bloques sin duplicados | Pendiente E2E |
| P07 | Archivo almacenado modificado después de validar | Huella SHA-256 no coincide; importación rechazada | Pendiente E2E |
| D01 | Instrumento completado | Cuestionario, opciones, 100 registros y 2 000 respuestas consultables; `organization_id` correcto | Pendiente E2E |

## Ejecución local

```powershell
node scripts/generate-survey-fixture.js
node scripts/verify-survey-fixture.js
npx.cmd tsc --noEmit
```

Para los casos E2E, usa un estudio y un código de instrumento exclusivos de prueba. Compara conteos en la vista `/surveys/[id]` y en `insight_survey.survey_import_job_chunks`; confirma que la versión solo se publique tras el último bloque. Registra resultado, fecha, entorno y evidencia en una copia de esta matriz cuando se ejecute sobre el despliegue.
