# Importar encuestas

Para el detalle técnico, la matriz por formato y los procedimientos de diagnóstico, consulta el [Manual técnico de carga de Encuestas](MANUAL_TECNICO_CARGA_ENCUESTAS.md).

La página `/surveys/imports` incorpora un instrumento nuevo desde un archivo de hasta 10 MB. Se necesita acceso al módulo, una organización activa y los permisos `survey.access` y `survey.create` en ella.

## Archivos admitidos

- **CSV y TXT:** primera fila de encabezados, después una persona o registro por fila. Se detecta el separador; TXT puede estar tabulado. No se necesita diccionario.
- **XLSX, XLS y ODS:** se procesa exclusivamente la primera hoja; las demás se ignoran. El formato ordinario usa encabezados en la primera fila. También se reconoce la primera hoja de los archivos HCV 2025: filas `Posición:`, `Etiqueta:` y `Variable`, seguidas de los registros. No se lee la hoja de diccionario.
- **JSON:** objeto con `questions` y `responses`. Cada pregunta tiene `code`, `text`, `type` y, para elección única, `options` con `code` y `label`. Cada respuesta tiene `id` y `answers`, un objeto que relaciona el código de pregunta con su valor. Ejemplo: `{ "questions": [{ "code": "P01", "text": "Edad", "type": "integer" }], "responses": [{ "id": "R001", "answers": { "P01": 25 } }] }`.

Las columnas tabulares se identifican por encabezado, con independencia de su orden. Se reconoce una columna de ID si se llama `id`, `external_id`, `id_externo`, `folio`, `registro`, `record_id` o `respondent_id`; si no existe, se generan IDs consecutivos y se avisa. Las preguntas reciben códigos consecutivos `P001`, `P002`, etc. La vista previa ordena sus valores alfabética o numéricamente y muestra hasta 25 valores distintos; si alguno supera siete palabras, muestra una muestra aleatoria de hasta 10. El encabezado indica «Valores muestra» si se aplica alguno de esos límites y «Valores distintos» cuando se muestran todos los valores cortos. Si las etiquetas y valores no coinciden, hay que corregir el archivo y volver a subirlo. En JSON las respuestas siguen vinculadas mediante los códigos del archivo, aunque las preguntas importadas reciben también `P###`.

Se validan tamaño, encabezados y códigos únicos, IDs de registro únicos, estructura, columnas adicionales, caracteres nulos y límites de 500 preguntas, 20 000 registros y 5 millones de respuestas. Se conservan los valores originales. `NA`, `N/A` y `NS/NC` se tratan como faltantes. La inferencia de tipo y opciones en archivos tabulares es heurística: hay que revisar los valores distintos, especialmente para categorías numéricas y datos heredados.

## Proceso sin trabajador permanente

1. Completa organización, nombres de estudio e instrumento, versión entera (inicia en 1) y selecciona el archivo. El prefijo editable de la organización se define al crearla. Los códigos de estudio e instrumento se asignan automáticamente y no se editan durante la carga. Un estudio o instrumento existente con el mismo nombre conserva su código.
2. **Validar archivo** obtiene una autorización de subida y envía los bytes desde el navegador a un bucket privado de Supabase Storage. La aplicación descarga el archivo, valida la estructura y guarda su huella SHA-256 y vista previa en una tarea `ready`.
3. Revisa las preguntas, los valores distintos y las advertencias. Si el archivo es incorrecto, pulsa **Eliminar** y vuelve a cargarlo. Confirma las advertencias si aparecen y pulsa **Importar**.
4. La ruta inicia inmediatamente un Workflow de Vercel. Sus pasos preparan el instrumento, importan registros en bloques transaccionales de 100 y publican la versión solo al terminar todos los bloques. La tarea y cada bloque confirman su avance en PostgreSQL; los reintentos de un paso no duplican registros. El historial muestra `queued`, `processing`, `completed` o `failed`.

El estudio usa `XXX-YYY-A###` y el instrumento `XXX-YYY-ZZZ-A###`: `XXX` es el prefijo de la organización; `YYY` y `ZZZ` se derivan de los nombres; el folio de tres dígitos avanza globalmente dentro de la organización, con contadores separados para estudios e instrumentos. Tras 999 empieza la serie B. La versión visible 1 se guarda como `1.0`; el backend conserva subversiones como `1.542` para flujos posteriores. Si ya existe la misma organización, estudio, instrumento y versión, la carga se rechaza, enlaza la encuesta o carga existente y sugiere la siguiente versión entera.

No hay que ejecutar un proceso residente ni un cron. El archivo queda en el bucket privado `survey-imports`, asociado a `storage_path` y `source_sha256` en `insight_survey.survey_import_jobs`; los archivos de cargas antiguas pueden seguir en `source_bytes`. `survey_import_job_chunks` registra los bloques. Las tablas tienen RLS y no se conceden a `anon` o `authenticated`. La aplicación usa `SUPABASE_SERVICE_ROLE_KEY` para Storage y `APP_DATABASE_POOLER` o `APP_DATABASE_URL` con el rol `insight_app` para procesar los pasos.
