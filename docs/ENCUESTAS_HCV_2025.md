# Importación HCV 2025

Esta carga se hizo a partir de los archivos `Base Cuestionario A - Encuesta HCV 2025.xlsx` y `Base Cuestionario B - Encuesta HCV 2025.xlsx`. Se ejecutó en la base configurada por `APP_DATABASE_URL` el 2026-09-29 mediante [`scripts/import-hcv-2025.js`](../scripts/import-hcv-2025.js). Los archivos fuente deben estar disponibles para repetir la comprobación o la carga.

## Modelo aplicado

- Organización: «Hermosillo ¿Cómo vamos?».
- Estudio: `HCV_PERCEPCION_2025`.
- Instrumentos: `HCV_2025_A` y `HCV_2025_B`, cada uno con versión publicada `1.0`.
- Cada columna del archivo es una pregunta y variable con el código y etiqueta del diccionario. Cada fila es una observación con `external_id` igual a la primera columna de la hoja `Base`.
- Se registran las opciones del diccionario. Una respuesta solo apunta a `survey_answer_options` cuando su código o etiqueta coincide sin ambigüedad; el valor original siempre permanece en `raw_value`.
- No se infirieron saltos, jerarquías de secciones ni selecciones múltiples a partir de columnas que no codifican esas relaciones explícitamente.

## Resultados verificados en la base

| Instrumento | SHA-256 del XLSX | Preguntas | Observaciones | Respuestas | Faltantes |
|---|---|---:|---:|---:|---:|
| A | `3ad05d96752685fba75727e1993e2c5b743ffb2bb917f6ea1e0f579613022473` | 164 | 1,607 | 263,548 | 90,632 |
| B | `cc6381af2bc40ff4e4a7c812886d4dc50673f9f24e7ee07b6eb312e7f970c7de` | 262 | 1,624 | 425,488 | 171,423 |

`NA`, `NS/NC` y sus variantes con marca Unicode se conservan en `raw_value` y se marcan como faltantes. Las opciones explícitas del diccionario que significan ausencia también se marcan así. Los demás valores, incluso los que no aparecen en el catálogo de opciones, permanecen sin reinterpretación.

## Corrección de posiciones en A

Los encabezados y el diccionario del cuestionario A coinciden entre sí, pero dos bloques de valores están en otro orden. El importador asigna los valores a la variable correcta y deja `source_position` y `value_source_position` en la metadata de cada pregunta y variable.

- Transporte: valores de las posiciones 92, 93, 94, 95 y 96 se asignan respectivamente a las posiciones 95, 96, 92, 94 y 93.
- Datos del hogar: valores de las posiciones 152 a 162 se asignan a 153 a 163; la posición 163 se asigna a 152.

La validación de los valores categóricos de esos bloques contra las opciones de destino dio 100 % de coincidencia. Una muestra de la primera observación confirmó `frec_uso_trans_pub = Varias veces por semana`, `tiempo_traslado = De 2:01 a 2:30 horas`, `ocupacion = Ama de casa` y `edad = 55 años o más`.

## Repetibilidad

`node scripts/import-hcv-2025.js --check` valida archivos y mapeo sin conectar a la base. `--apply` usa `insight_app` y una sola transacción; se revierte completa si falla. Si el estudio ya existe, aborta sin reemplazarlo ni duplicarlo. Los hashes de origen quedan guardados en la metadata de los instrumentos y versiones.
