# Manual técnico y de operación — carga de encuestas

**Audiencia:** desarrollo, administración de la aplicación y operación de datos  
**Alcance:** carga de instrumentos y respuestas mediante `/surveys/imports`  
**Estado:** describe el código y el esquema implementados en `insight_survey` al 2 de octubre de 2026. No sustituye la arquitectura funcional general de [`ARQUITECTURA_BBDD.md`](ARQUITECTURA_BBDD.md).

## 1. Propósito y límites

Este proceso crea un instrumento de encuesta a partir de un archivo tabular o JSON, conserva el valor original de cada respuesta y publica una versión cuando todos sus bloques se guardaron. El flujo está pensado para una aplicación desplegada en Vercel y Supabase, sin un proceso worker que deba permanecer activo.

La aplicación admite TXT, CSV, XLSX, XLS, ODS y JSON. No requiere una hoja diccionario. En hojas de cálculo usa solo la primera hoja. En datos tabulares identifica las preguntas a partir de los encabezados y muestra los valores distintos de cada columna antes de importar.

El importador no puede deducir por sí solo el significado de una columna. Si dos encabezados o etiquetas no describen correctamente sus valores, se debe corregir el archivo y volver a subirlo. El tipo de pregunta inferido también es heurístico; los archivos JSON permiten declarar el tipo explícitamente.

## 2. Componentes de la solución

| Capa | Archivo o servicio | Función |
| --- | --- | --- |
| Interfaz | `src/app/(app)/surveys/imports/page.tsx`, `src/components/insight/survey-imports-view.tsx` | Captura organización, nombres, versión entera y archivo; presenta códigos generados, valores distintos, advertencias, eliminación de cargas previas al procesamiento y estados. |
| API | `src/app/api/surveys/imports/route.ts` | `POST` prepara una subida; `PUT` valida el archivo; `PATCH` encola el trabajo e inicia Workflow. |
| Autorización y Storage | `src/lib/insight-survey-imports.ts` | Valida usuario, módulo, membresía y permisos; crea bucket privado si falta; autoriza subidas firmadas; persiste la tarea. |
| Lector | `scripts/survey-file.js` | Reconoce extensión y analiza formatos, estructura, IDs, preguntas, respuestas, límites y vista previa. |
| Orquestador | `src/workflows/survey-import.ts` | Ejecuta los pasos durables `prepare`, bloques de 100, `complete` y `fail`. |
| Procesador | `scripts/survey-import-processor.js` | Descarga y verifica el archivo; escribe el dominio en transacciones PostgreSQL con el rol `insight_app`. |
| Persistencia de trabajos | `scripts/021_survey_import_jobs.sql`, `scripts/022_serverless_survey_imports.sql`, `scripts/023_organization_prefix_survey_codes.sql` | Define trabajos, versión, secuencias de códigos, rutas de Storage, huella, mapeo, ejecución y registro transaccional de bloques. |
| Catálogo de encuestas | `src/lib/insight-surveys.ts` | Consulta instrumentos; oculta instrumentos vinculados a trabajos que no estén completados. |

El dominio creado sigue esta jerarquía:

```text
organización
└── estudio
    └── instrumento (encuesta visible)
        └── versión solicitada (1.0 por defecto)
            └── sección Cuestionario
                └── pregunta + variable + opciones
            └── observaciones (registros)
                └── respuestas
```

## 3. Requisitos de operación y seguridad

### 3.1 Acceso

El usuario debe tener sesión, acceso al módulo gestionable **Encuestas**, una membresía activa en la organización y los permisos `survey.access` y `survey.create`. Sysadmin puede operar las organizaciones activas desde el acceso global. La API vuelve a verificar autorización al crear el trabajo, validar el archivo e iniciar la importación.

Los códigos de estudio e instrumento se generan en el servidor: `XXX-YYY-A###` y `XXX-YYY-ZZZ-A###`. `XXX` procede del prefijo único de la organización; `YYY` y `ZZZ` se derivan de las primeras palabras de los nombres (tres iniciales, dos letras de la primera palabra y una de la segunda, o tres letras de una sola palabra; `X` completa los huecos). Los folios avanzan globalmente en la organización con contadores independientes para estudio e instrumento; después de 999 cambia la serie a B. Los nombres deben tener entre 2 y 150 caracteres. Se reutiliza un estudio o instrumento del mismo nombre dentro de la organización, con su código histórico si lo tiene. La versión visible debe ser un entero de 1 a 9999; se almacena con `.0` y el esquema permite subversiones posteriores.

### 3.2 Configuración

El runtime necesita:

- `NEXT_PUBLIC_SUPABASE_URL` y la clave pública ya usadas por la aplicación.
- `SUPABASE_SERVICE_ROLE_KEY` disponible solo en el servidor para administrar y descargar objetos de Storage. Nunca debe exponerse al cliente.
- `APP_DATABASE_POOLER` o `APP_DATABASE_URL` para los pasos del procesador. La conexión se comprueba y debe resolver al rol `insight_app`.
- Workflow habilitado en el build y runtime de Next.js mediante el plugin configurado en `next.config.ts`. `src/proxy.ts` deja pasar las rutas internas `/.well-known/workflow/`.

El bucket `survey-imports` se crea al primer uso con privacidad y límite de 10 MB si no existe. Si existe como público, el proceso lo rechaza. La subida usa una autorización firmada y los bytes van directamente del navegador a Supabase Storage; la API recibe metadatos e identificadores. Esta ruta evita pasar el archivo por el cuerpo de una Vercel Function, que tiene un máximo de 4.5 MB según [los límites vigentes de Functions](https://vercel.com/docs/functions/limitations). La API `uploadToSignedUrl` de Supabase requiere el token generado para ese objeto y que el bucket exista ([referencia de Storage](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl)).

La app impone 10 MB tanto al tamaño declarado por el navegador como al tamaño del objeto descargado. Los archivos se guardan en rutas que incluyen organización e ID de trabajo. El bucket es privado; el servidor genera autorizaciones de subida y la clave de servicio solo se usa en código de servidor.

Las tablas de tareas y bloques tienen RLS activado y acceso revocado a `anon` y `authenticated`. La app consulta y cambia esos registros en el servidor con su conexión SQL; los usuarios no acceden a esas tablas directamente por la Data API. `organization_id` conserva el límite multi-organización.

### 3.3 Dependencias de despliegue

`workflow` compila la función marcada con `"use workflow"` y sus pasos `"use step"`. La llamada `start()` inicia la ejecución y devuelve el identificador sin esperar todos los bloques. Vercel documenta su motor como ejecución durable; las reglas de reintento dependen del runtime y de cada paso ([Vercel Workflows](https://vercel.com/docs/workflows)). Este proyecto registra además los bloques confirmados en PostgreSQL para que una repetición no vuelva a insertarlos.

## 4. Validaciones compartidas

Se aplican a todos los formatos, además de las validaciones específicas de la matriz siguiente:

| Regla | Condición implementada |
| --- | --- |
| Extensión | Solo `.txt`, `.csv`, `.xlsx`, `.xls`, `.ods` o `.json`, sin distinguir mayúsculas. La clasificación se hace por extensión del nombre. |
| Tamaño | Archivo no vacío y hasta 10 MiB (10 × 1 024 × 1 024 bytes). El tamaño real se comprueba al descargarlo. |
| Conteos | Entre 1 y 500 preguntas; entre 1 y 20 000 registros; máximo de 5 000 000 respuestas (preguntas × registros). |
| Encabezados/códigos | Encabezados no vacíos y únicos después de normalizarlos. JSON exige códigos de origen válidos y únicos. El código almacenado de cada pregunta es `P###` según su posición. |
| Identificadores de registro | No vacíos y únicos. En tabulares sin columna ID se generan consecutivos y se añade advertencia. JSON exige `id` o `external_id`. |
| Filas y celdas | Se omiten filas completamente vacías; se rechaza una fila con celdas adicionales no vacías fuera del ancho del encabezado. Celdas de más de 32 767 caracteres o con byte nulo se rechazan. |
| Archivo entre validación e importación | Se calcula SHA-256 al validar. Antes de encolar y de cada ejecución del procesador se compara la huella; cambios del objeto hacen fallar el proceso. |
| Formato estructural | Debe poder analizarse y contener encabezado/preguntas y al menos un registro. Un libro de cálculo debe contener primera hoja. |
| Publicación | La versión permanece `draft` mientras procesa. Se publica y el trabajo pasa a `completed` únicamente si el número de bloques, observaciones y respuestas guardadas coincide con el conteo validado. |

La validación de estructura no evalúa el sentido estadístico o sustantivo de las respuestas. Por ejemplo, no conoce rangos válidos por pregunta en un CSV, XLSX, XLS u ODS; el usuario debe revisar las muestras y los valores originales.

## 5. Matriz de validaciones por formato

| Formato | Lectura | Validaciones particulares | Advertencias / límites |
| --- | --- | --- | --- |
| TXT | Texto delimitado; si encuentra tabuladores usa tabulador, en otro caso PapaParse autodetecta el separador. | Errores de análisis del delimitador; encabezado y filas; códigos normalizados únicos; IDs reconocidos; celdas sobrantes; límites comunes. Decodifica UTF-8 y recurre a Windows-1252 si detecta caracteres de reemplazo. | Se omiten filas vacías. No tiene esquema o tipos declarados: se infieren. Un archivo de ancho fijo no queda reconocido como tabla delimitada. |
| CSV | PapaParse con autodetección del delimitador y omisión de filas vacías. | Errores del parser; encabezado y filas; códigos normalizados únicos; IDs reconocidos; celdas sobrantes; límites comunes. Misma estrategia UTF-8/Windows-1252 que TXT. | No hay diccionario ni declaración de tipos. CSV mal formado falla; la autodetección no garantiza interpretar correctamente delimitadores no estándar o comillas defectuosas. |
| XLSX | SheetJS; primera hoja del libro y valores de celdas en forma de matriz. | Libro legible, nombre de hoja presente, encabezado, filas, códigos únicos, IDs, celdas sobrantes y límites comunes. | Ignora todas las hojas posteriores. Admite la estructura HCV histórica de 3 filas (`Posición:`, `Etiqueta:`, `Variable`) y advierte que se revise la alineación de valores. No consulta el diccionario. |
| XLS | Igual que XLSX: SheetJS y exclusivamente la primera hoja. | Igual que XLSX. Rechaza libros dañados o sin datos útiles. | La compatibilidad depende de lo que SheetJS pueda leer del libro binario. Las hojas restantes se ignoran y no se usan como diccionario. |
| ODS | Igual que XLSX: SheetJS y exclusivamente la primera hoja. | Igual que XLSX. Rechaza libros dañados o sin datos útiles. | Las hojas restantes se ignoran. No se consulta un diccionario en otra hoja. |
| JSON | `JSON.parse` en UTF-8, acepta BOM inicial; documento con arreglos `questions` y `responses`. | Preguntas con `code`, `text`, `type` admitido; códigos únicos; opciones con códigos/etiquetas no vacíos y códigos únicos; respuestas con ID único y `answers` como objeto; claves de respuestas deben existir en `questions`; valida finitud numérica y entero seguro para tipo `integer`; compara valores de opción para `single_choice`. | Tipos admitidos: `text`, `number`, `integer`, `single_choice`, `scale`. Preguntas de selección sin opciones y valores de selección no coincidentes producen advertencia. Respuestas omitidas se guardan como vacías/faltantes. El orden de propiedades JSON no importa porque se relacionan por código. |

### 5.1 Cómo infiere preguntas tabulares

Para cada encabezado de valor, el lector conserva el texto de origen, pero asigna el código público `P001`, `P002`, etc., según la posición de la pregunta, sin contar la columna de ID. La etiqueta visible procede del propio encabezado; en el formato HCV histórico, procede de la fila `Etiqueta:` y el origen de la fila `Variable`. En JSON, los códigos originales identifican las claves de `answers`, mientras que el código almacenado también es `P###`.

Los trabajos que ya estaban encolados o procesándose conservan los códigos registrados en su vista previa para que sus bloques sigan usando el mismo identificador. La nueva secuencia `P###` se aplica a las cargas que aún se validan o importan después del cambio.

Los valores no faltantes determinan el tipo inicial:

1. Si todos son numéricos (entero o decimal con punto/coma), se interpreta `number`.
2. Si no son numéricos, tienen de 2 a 20 valores distintos y estos representan como máximo el 30 % de las respuestas no faltantes, se interpreta `single_choice` y esos valores se convierten en opciones.
3. En los demás casos se interpreta `text`.

Por ello una categoría codificada con números se inferirá como numérica. Este es un límite deliberado del modo sin diccionario, no un error del parser. Para mantener categorías con tipo explícito, se debe usar JSON o corregir la configuración del flujo en una iteración posterior; la pantalla actual no edita el tipo inferido.

## 6. Especificación por archivo

### 6.1 TXT

**Estructura esperada:** primera fila con nombres de columnas; filas siguientes con un registro cada una. Una columna de identificador es opcional. La codificación usual es UTF-8; se intenta Windows-1252 cuando UTF-8 produce caracteres `�`.

**Separador:** si el contenido tiene tabulador, el lector lo fija como separador. Si no, se lo deja a la autodetección de PapaParse (por ejemplo, coma o punto y coma). Para una importación predecible, utilizar tabulador o un CSV válido con delimitadores y comillas consistentes.

**Qué revisar:** encabezados sin duplicados una vez normalizados; primera fila no desplazada; que los valores distintos de cada columna correspondan a la pregunta; y que la columna identificadora se llame `id`, `external_id`, `id_externo`, `folio`, `registro`, `record_id` o `respondent_id`. Si no se identifica, se asignan `1`, `2`, … según el orden de las filas no vacías.

**Falla frecuente:** texto plano con espacios como separador o ancho fijo no se reconoce necesariamente como tabla. Vuelve a exportarlo con tabuladores o CSV.

### 6.2 CSV

**Estructura esperada:** encabezados en la primera fila y un registro por fila. Admite delimitador detectado automáticamente. El parser quita BOM inicial, interpreta UTF-8 con alternativa Windows-1252 y omite filas completamente vacías.

**Validación:** si PapaParse devuelve errores estructurales, se rechaza el archivo. Los encabezados se normalizan para formar códigos y colisiones como `¿Tiene acceso?` frente a `Tiene acceso` pueden producir el mismo código y rechazarse. Se detectan filas con datos después del último encabezado.

**Qué revisar:** delimitador detectado, caracteres acentuados, comillas que encierran texto con comas, columnas de folio y valores distintos. En la pantalla se muestran todos los valores distintos cuando son hasta 25; por encima de ese límite se eligen 25 al azar. Si al menos un valor de la columna supera siete palabras, el límite baja a 10. No constituyen una revisión estadística de todo el contenido.

### 6.3 XLSX

**Estructura ordinaria:** la primera fila de la primera hoja contiene encabezados y cada fila siguiente representa un registro. La selección del ID sigue los mismos alias de los formatos delimitados.

**Estructura heredada HCV:** cuando las celdas iniciales de las primeras filas son `Posición:`, `Etiqueta:` y `Variable`, se usa la fila `Variable` para el código y la fila `Etiqueta:` para el nombre de pregunta; los registros empiezan en la fila siguiente. La primera columna se trata como identificador. Se agrega una advertencia para comprobar la correspondencia etiqueta/variable/valores.

**Hojas posteriores:** no se leen. Un diccionario, catálogos u hojas de apoyo adicionales no cambian los códigos, las opciones ni el tipo de la importación.

**Qué revisar:** que la primera hoja sea realmente la base, que no haya títulos antes de los encabezados (salvo la estructura HCV detectada), que no existan columnas vacías o duplicadas y que los valores distintos correspondan a las preguntas. La vista muestra todos los valores si no superan el límite de la columna (25, o 10 cuando alguna respuesta tiene más de siete palabras); cuando lo superan, elige una muestra aleatoria. Si hay un desfase, corrige el archivo y vuelve a subirlo.

### 6.4 XLS

El procedimiento es el mismo que para XLSX: se abre con SheetJS, se convierte la primera hoja en filas y se aplican las reglas de encabezados, ID, tipos inferidos y límites comunes. Las hojas posteriores se omiten. Si el libro no puede decodificarse, no tiene primera hoja o no produce registros tabulares útiles, se rechaza.

Para obtener mejores resultados, guardar el libro binario con encabezados y datos tabulares simples. La vista previa se debe validar porque estilos, celdas combinadas, fórmulas sin resultado almacenado o variantes del formato antiguo pueden hacer que las celdas leídas no coincidan con lo que se ve visualmente en una hoja de cálculo.

### 6.5 ODS

El procedimiento es el mismo que para XLSX: solo se analiza la primera hoja; la primera fila ordinaria actúa como encabezado, salvo que la hoja tenga el patrón HCV histórico. Las hojas de apoyo se ignoran. Se validan las mismas filas, códigos, IDs, valores y límites.

Antes de confirmar, verificar los valores distintos: que LibreOffice muestre la misma primera hoja y encabezados que la vista previa. El lector no usa hojas de diccionario ni metadatos externos para corregir el contenido.

### 6.6 JSON

**Forma raíz:** objeto JSON, sin arreglo raíz:

```json
{
  "questions": [
    { "code": "P01", "text": "Edad", "type": "integer" },
    {
      "code": "P02",
      "text": "Zona",
      "type": "single_choice",
      "options": [
        { "code": "N", "label": "Norte" },
        { "code": "S", "label": "Sur" }
      ]
    }
  ],
  "responses": [
    { "id": "R001", "answers": { "P01": 34, "P02": "N" } },
    { "id": "R002", "answers": { "P01": 28, "P02": "Sur" } }
  ]
}
```

**Pregunta:** `code` de 1 a 100 caracteres Unicode alfanuméricos, `_` o `-`; `text` no vacío; `type` uno de `text`, `number`, `integer`, `single_choice` o `scale`. `type` omitido se trata como `text`. `options` es opcional; cada opción, si se proporciona, requiere `code` y `label` no vacíos y código único. Para `single_choice`, no proporcionar opciones deja la respuesta sin categoría normalizada y genera advertencia.

**Respuesta:** debe declarar `id` o `external_id` único y un objeto `answers`. Cada clave de `answers` debe coincidir con un código de pregunta. Una respuesta puede omitir códigos; se almacena como no proporcionada. El importador no exige que todas las claves estén presentes y no admite claves de preguntas desconocidas.

**Valores:** `number`, `integer` y `scale` deben producir valores finitos; `integer` también debe ser entero seguro. Para `single_choice`, un valor que no coincide por código o etiqueta, ignorando mayúsculas, acentos y espacios exteriores/repetidos, genera advertencia. La advertencia requiere confirmación antes de iniciar. Los valores de texto no se convierten a categorías.

JSON ya expresa la relación respuesta-pregunta por código; la vista previa también muestra sus valores distintos.

## 7. Flujo de operación

### 7.1 Carga y validación

1. En `/surveys/imports`, seleccionar organización, nombres del estudio/instrumento, versión entera precargada en 1 y archivo. El frontend comprueba extensión visual y tamaño; los códigos no se editan.
2. `POST /api/surveys/imports` valida sesión, acceso, permisos, organización, versión, nombres, tamaño declarado y duplicados conocidos. Bloquea la organización para reservar folios, conserva códigos existentes y genera los nuevos; asegura el bucket privado, genera una ruta única y obtiene una autorización de subida firmada. Registra el trabajo como `uploading`.
3. El navegador envía el archivo directamente al bucket usando `uploadToSignedUrl`; los bytes no atraviesan el cuerpo de la función API.
4. `PUT /api/surveys/imports` vuelve a comprobar autorización, descarga el objeto, comprueba tamaño real, analiza el archivo y calcula SHA-256. Guarda huella y vista previa y cambia a `ready`.
5. El usuario revisa conteos, valores distintos y advertencias. Confirmar advertencias es obligatorio si las hay. Una carga sin procesamiento puede eliminarse con confirmación.

Si la subida o validación falla en la interfaz, `DELETE /api/surveys/imports` marca el trabajo `uploading` como fallido. Si se cierra la pestaña, el siguiente intento en esa organización marca como fallidos los trabajos `uploading` con más de una hora. El folio reservado no se recicla.

### 7.2 Inicio del Workflow

`PATCH /api/surveys/imports` vuelve a autorizar al usuario, requiere estado `ready`, exige confirmación de advertencias, vuelve a descargar el archivo y compara SHA-256. Valida el mapeo como una permutación de las columnas de valor, guarda `column_mapping` y cambia el estado a `queued`. Después llama a `start(surveyImportWorkflow, [id])` y guarda el `runId`.

Si `start()` falla después de guardar `queued`, el trabajo queda con `workflow_run_id` nulo y la pantalla ofrece **Reintentar inicio**. Si ya se inició, se puede actualizar la página para consultar su estado; la interfaz no presenta un progreso porcentual de cada bloque.

### 7.3 Preparación del dominio

El paso `prepare` vuelve a descargar el archivo, compara su huella y reanaliza su estructura. En una transacción PostgreSQL:

1. Bloquea la fila de trabajo y comprueba que siga `queued`, `processing` o `completed`.
2. Verifica que la organización siga activa.
3. Reutiliza un estudio existente de la misma organización o crea uno.
4. Reutiliza el instrumento por código si existe y rechaza una versión duplicada.
5. Crea el instrumento si es nuevo y la versión solicitada en estado `draft`, una sección `Cuestionario`, preguntas, variables y opciones inferidas/declaradas.
6. Conserva `import_job_id`, nombre de archivo y huella de origen en metadatos de procedencia. Marca la tarea `processing`.

Si la transacción no termina, se revierten sus inserciones. En un reintento tras commit, el procesador localiza la versión por `metadata.import_job_id` para no crearla de nuevo.

### 7.4 Inserción por bloques

Se procesa un bloque de 100 registros por paso Workflow. Cada bloque vuelve a descargar y analizar el archivo, aplica el mapeo guardado y abre una transacción:

1. Bloquea la fila de la tarea.
2. Consulta `survey_import_job_chunks`. Si ya existe el índice del bloque, termina sin repetir inserciones.
3. Inserta observaciones y una respuesta por cada pregunta de cada registro usando `COPY` de PostgreSQL.
4. Conserva `raw_value`; para valores no faltantes también llena `value_text`. Si una variable es numérica y el valor se puede convertir, llena `value_integer` o `value_decimal`.
5. Vincula `answer_option_id` cuando el código/etiqueta coincide de forma normalizada y no ambigua. Los tokens `NA`, `N/A`, `NS/NC` se consideran faltantes; los nulos se guardan como `not_provided`. Una selección única sin opción vinculable queda con calidad `warning`.
6. Inserta el marcador del bloque y confirma todo en la misma transacción.

Si falla una inserción antes del commit, PostgreSQL revierte observaciones, respuestas y marcador del bloque juntos. Los bloques anteriores ya confirmados permanecen almacenados.

### 7.5 Cierre y publicación

El paso `complete` compara cantidad de bloques, observaciones y respuestas con la vista previa persistida. Si no coincide, falla. Si coincide, en una transacción cambia la versión a `published` y el trabajo a `completed`. El catálogo y el detalle de encuesta excluyen instrumentos cuyo trabajo no esté completado.

### 7.6 Manejo de fallos actual

El `catch` del Workflow invoca el paso `fail` y guarda el mensaje, el estado `failed` y hora de fin. La vista oculta del catálogo un instrumento importado incompleto, aunque `prepare` o uno o más bloques pudieron haber confirmado datos antes del error. Actualmente:

- No hay botón de continuar o reiniciar trabajos `failed`.
- No hay rutina de limpieza automática de instrumentos draft, observaciones parciales, tareas abandonadas ni objetos de Storage.
- Volver a iniciar el mismo trabajo no es una operación ofrecida por la interfaz. Un trabajo nuevo con el mismo instrumento y versión puede encontrar el borrador parcial y se rechaza como duplicado.
- La recuperación de un fallo parcial requiere diagnóstico operativo antes de decidir si se conserva, limpia o repara información; no borrar filas a mano sin revisar referencias y bloques confirmados.

Estos límites se incluyen para operación transparente. La política de retención y limpieza y la función de reanudación de trabajos fallidos son temas de una mejora posterior.

## 8. Modelo de datos de la importación

### `insight_survey.survey_import_jobs`

Una fila representa una solicitud. Incluye organización, creador, códigos y nombres generados, versión completa, nombre de archivo, `storage_path`, `source_sha256`, vista previa JSON, mapeo JSON, `workflow_run_id`, estado, mensaje de error, instrumento resultante y marcas temporales. `source_bytes` es nullable por compatibilidad con el importador anterior; el flujo actual usa Storage. `survey_code_sequences` mantiene los contadores independientes por organización.

Estados posibles: `uploading` → `ready` → `queued` → `processing` → `completed` o `failed`. Un fallo de inicio de Workflow puede dejar `queued` sin `workflow_run_id`; una subida incompleta puede dejar `uploading`.

### `insight_survey.survey_import_job_chunks`

Clave primaria `(job_id, chunk_index)`. Cada fila registra organización, índice de bloque, cantidad de observaciones y cantidad de respuestas confirmadas. La clave impide registrar dos veces el mismo bloque. Un bloque registra más de cero observaciones y respuestas.

### Tablas de dominio

El procesador escribe `survey_studies`, `survey_instruments`, `survey_instrument_versions`, `survey_sections`, `survey_questions`, `survey_variables`, `survey_answer_options`, `survey_observations` y `survey_responses`. `organization_id` se lleva a las entidades correspondientes para sostener el aislamiento organizacional. La respuesta enlaza con una variable; cuando se puede resolver, también con una opción. `raw_value` preserva el valor importado para consulta y auditoría.

## 9. Capacidad, límites y consideraciones de rendimiento

El límite de carga actual es 10 MiB. Con 20 000 registros, el Workflow puede ejecutar 200 pasos de bloque; con 5 000 000 de respuestas cada bloque puede representar hasta 500 preguntas × 100 registros. Estos son límites de validación y no una garantía de duración o capacidad del despliegue.

**Comportamiento actual relevante:** `prepareImport` y cada llamada `importChunk` descargan y vuelven a analizar el archivo completo para obtener su estructura y filas. Por tanto, el volumen de lecturas/parsing crece con el número de bloques (hasta 201 descargas/análisis para 20 000 registros, contando preparación). Con archivos grandes o muchos registros, esta repetición puede alargar y encarecer una importación. La prueba sintética de 100 registros verifica formato y mapeo, pero no mide ese máximo.

La función serverless de inicio solo confirma la tarea y arranca Workflow; el trabajo de dominio ocurre en pasos durables. Los límites de tiempo/memoria de cada función siguen dependiendo del plan y configuración del despliegue. Consultar [límites de Vercel Functions](https://vercel.com/docs/functions/limitations) y [Workflows](https://vercel.com/docs/workflows) antes de elevar los máximos de archivo o filas.

## 10. Procedimiento del operador

### Carga normal

1. Confirmar que la organización esté activa y que el usuario tenga `encuestas`, `survey.access` y `survey.create`.
2. Preparar nombres descriptivos de estudio e instrumento y elegir la versión entera; los códigos se asignan automáticamente.
3. Elegir el archivo, validar y comprobar conteos, códigos `P###`, nombres de preguntas, hasta 25 valores distintos por pregunta (10 ante respuestas de más de siete palabras) y advertencias. Para XLSX/XLS/ODS, comprobar que la primera hoja sea la correcta.
4. Si los datos no corresponden con los encabezados, corregir el archivo y volver a subirlo. Confirmar las advertencias y comenzar.
5. Actualizar el historial de importaciones hasta observar `Completado` o `Falló`.
6. Al completar, abrir encuesta y revisar conteo de preguntas/observaciones, versión publicada, un conjunto de registros y respuestas originales.

### Diagnóstico inicial

| Síntoma | Comprobaciones |
| --- | --- |
| `uploading` sin vista previa | Confirmar que terminó la subida directa al bucket y que el navegador alcanzó el endpoint `PUT`; revisar Storage privado y credenciales de servidor. La UI no ofrece reinicio/borrado de este estado. |
| Error de formato o encabezado | Verificar extensión, primera fila, primera hoja, separador, IDs, encabezados duplicados y conteos; regenerar CSV/TXT delimitado si es texto de ancho fijo. |
| `ready` con advertencias | Revisar muestras y opciones; en tabulares revisar tipo inferido y correspondencia de columnas. Corregir el archivo de origen cuando falten metadatos que el importador no puede deducir. |
| `queued` sin identificador Workflow | Usar **Reintentar inicio**. Revisar configuración de Workflow en el build/deploy si continúa. |
| `processing` o `failed` | Correlacionar `workflow_run_id` con los registros de ejecución de Vercel; revisar `error_message`, `survey_import_job_chunks` y los metadatos `import_job_id`. Verificar rol SQL `insight_app`, conexión y descarga Storage. Antes de reintentar, considerar que no hay interfaz de reanudación/limpieza para `failed`. |
| Tarea completa sin acceso visible | Revisar organización, acceso al módulo, `survey.access`, `survey.view` y eventuales permisos de recurso del instrumento. |

No registrar ni pegar `SUPABASE_SERVICE_ROLE_KEY` en trazas, tickets o capturas. Para investigar errores, compartir IDs de tarea/Workflow y mensajes sin secretos ni datos personales de respuestas.

## 11. Referencias del repositorio y materiales de prueba

- [`ARQUITECTURA_BBDD.md`](ARQUITECTURA_BBDD.md): modelo multi-organización objetivo y estado aplicado de base de datos.
- [`MAPA_MODULOS.md`](MAPA_MODULOS.md): ubicación y dependencias del módulo.
- [`IMPORTAR_ENCUESTAS.md`](IMPORTAR_ENCUESTAS.md): guía breve para quien carga archivos.
- [`ENCUESTAS_HCV_2025.md`](ENCUESTAS_HCV_2025.md): carga inicial y particularidades de esos libros.
- [`MATRIZ_PRUEBAS_ENCUESTAS.md`](MATRIZ_PRUEBAS_ENCUESTAS.md): validaciones locales y casos pendientes de prueba extremo a extremo.
- `scripts/generate-survey-fixture.js` y `scripts/verify-survey-fixture.js`: generación y verificación de una encuesta cotidiana de 20 preguntas y 100 registros en ocho archivos que cubren los seis formatos admitidos.

## 12. Referencias externas

- [Vercel Workflows](https://vercel.com/docs/workflows)
- [Límites de Vercel Functions](https://vercel.com/docs/functions/limitations)
- [Supabase Storage: `uploadToSignedUrl`](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl)
