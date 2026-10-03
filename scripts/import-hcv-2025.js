// One-time, source-preserving import of the two HCV 2025 workbooks.
// Usage: node scripts/import-hcv-2025.js [--check | --apply]
// --check is the default and never connects to the database.
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { Client } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');
const readExcelFile = require('read-excel-file/node').default;

const root = path.resolve(__dirname, '..');
const files = [
  { letter: 'A', filename: 'Base Cuestionario A - Encuesta HCV 2025.xlsx' },
  { letter: 'B', filename: 'Base Cuestionario B - Encuesta HCV 2025.xlsx' },
];
const studyCode = 'HCV_PERCEPCION_2025';
const organizationName = 'Hermosillo ¿Cómo vamos?';
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f\u200e\u200f]/g, '').trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
const isAbsent = (value) => ['na', 'n/a', 'ns/nc'].includes(normalize(value));
const sourceToTargetA = new Map([
  [92, 95], [93, 96], [94, 92], [95, 94], [96, 93],
  ...Array.from({ length: 11 }, (_, index) => [152 + index, 153 + index]),
  [163, 152],
]);

function csvCell(value) {
  if (value === null || value === undefined) return '\\N';
  return `"${String(value).replaceAll('"', '""')}"`;
}

function* csvBatches(rows) {
  let batch = '';
  let count = 0;
  for (const row of rows) {
    batch += row.map(csvCell).join(',') + '\n';
    if (++count === 1000) { yield batch; batch = ''; count = 0; }
  }
  if (batch) yield batch;
}

async function copyRows(client, table, columns, rows) {
  const stream = client.query(copyFrom(`COPY insight_survey.${table} (${columns.join(',')}) FROM STDIN WITH (FORMAT csv, NULL '\\N')`));
  await pipeline(Readable.from(csvBatches(rows)), stream);
  console.log(`${table}: ${stream.rowCount} filas`);
  return stream.rowCount;
}

function parseOption(value) {
  const match = String(value).trim().match(/^([^=]+?)\s*=\s*(.+)$/);
  if (!match) throw new Error(`Opción ilegible: ${value}`);
  return { code: match[1].trim(), label: match[2].trim() };
}

async function inspectWorkbook(item) {
  const buffer = fs.readFileSync(path.join(root, item.filename));
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const sheets = await readExcelFile(buffer);
  if (sheets.length !== 2 || sheets[0].sheet !== 'Base' || !sheets[1].sheet.startsWith(`Cuestionario${item.letter}`)) {
    throw new Error(`${item.letter}: se esperaban las hojas Base y Cuestionario${item.letter}.`);
  }
  const base = sheets[0].data;
  const dictionary = sheets[1].data;
  const columns = base[2].length - 1;
  if (dictionary.length !== columns + 2) throw new Error(`${item.letter}: el diccionario no coincide con las columnas de Base.`);
  const targetToSource = new Map();
  const remap = item.letter === 'A' ? sourceToTargetA : new Map();
  for (let source = 1; source <= columns; source++) {
    const target = remap.get(source) ?? source;
    if (targetToSource.has(target)) throw new Error(`${item.letter}: dos columnas apuntan a ${target}.`);
    targetToSource.set(target, source);
  }
  const codes = new Set();
  const variables = [];
  for (let target = 1; target <= columns; target++) {
    const source = targetToSource.get(target);
    const row = dictionary[target + 1];
    const code = String(base[2][target] ?? '').trim();
    const label = String(base[1][target] ?? '').trim();
    if (!code || codes.has(code) || String(row[0] ?? '').trim() !== code || Number(row[1]) !== target || String(row[2] ?? '').trim() !== label) {
      throw new Error(`${item.letter}: código, posición o etiqueta incoherente en columna ${target}.`);
    }
    codes.add(code);
    const options = row.slice(4).filter((value) => value !== null && value !== undefined && value !== '').map(parseOption);
    if (new Set(options.map((option) => option.code)).size !== options.length) throw new Error(`${item.letter}: opciones duplicadas en ${code}.`);
    variables.push({ target, source, code, label, level: String(row[3] ?? '').trim(), options });
  }
  const ids = new Set();
  for (let index = 3; index < base.length; index++) {
    const row = base[index];
    if (row.length !== columns + 1 || !Number.isInteger(row[0]) || ids.has(row[0])) throw new Error(`${item.letter}: registro inválido en fila ${index + 1}.`);
    ids.add(row[0]);
  }
  // These HCV A exports placed values in a different order than the three header rows.
  // Every remapped categorical column must match its target's codebook exactly.
  for (const variable of variables.filter((entry) => entry.source !== entry.target)) {
    if (variable.options.length < 2) continue;
    const choices = new Set(variable.options.flatMap((option) => [normalize(option.code), normalize(option.label)]));
    const values = base.slice(3).map((row) => row[variable.source]).filter((value) => !isAbsent(value));
    const matches = values.filter((value) => choices.has(normalize(value))).length;
    if (values.length && matches / values.length < 0.99) throw new Error(`${item.letter}: el remapeo de ${variable.code} ya no coincide con el diccionario.`);
  }
  const missing = new Map();
  for (const row of base.slice(3)) for (const variable of variables) {
    const value = row[variable.source];
    if (isAbsent(value)) missing.set(String(value), (missing.get(String(value)) ?? 0) + 1);
  }
  return { ...item, sha256, base, variables, records: base.length - 3, missing: Object.fromEntries(missing) };
}

function* responseRows(workbooks, orgId) {
  for (const book of workbooks) {
    for (const [index, data] of book.base.slice(3).entries()) {
      const observationId = book.observationIds[index];
      for (const variable of book.variables) {
        const value = data[variable.source];
        const raw = value === null || value === undefined ? null : String(value);
        const option = raw === null ? null : variable.optionByValue.get(normalize(raw));
        const missing = raw !== null && (isAbsent(raw) || option?.isMissing === true);
        const missingType = isAbsent(raw)
          ? (normalize(raw) === 'ns/nc' ? 'unknown' : 'not_applicable')
          : option?.missingType ?? null;
        yield [randomUUID(), observationId, variable.variableId, raw,
          missing ? null : raw, !missing && typeof value === 'number' && Number.isInteger(value) ? value : null,
          !missing && typeof value === 'number' && !Number.isInteger(value) ? value : null,
          option?.id ?? null, missing, missingType,
          orgId];
      }
    }
  }
}

async function apply(workbooks) {
  process.loadEnvFile(path.join(root, '.env'));
  if (!process.env.APP_DATABASE_URL) throw new Error('Falta APP_DATABASE_URL.');
  const client = new Client({ connectionString: process.env.APP_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const role = await client.query('select current_user');
    if (role.rows[0].current_user !== 'insight_app') throw new Error('Se requiere la conexión insight_app.');
    await client.query('BEGIN');
    try {
      await client.query("set local lock_timeout = '10s'");
      await client.query("set local statement_timeout = '15min'");
      const org = await client.query("select id, name from insight_core.core_organizations where name = $1 and status = 'active'", [organizationName]);
      if (org.rows.length !== 1) throw new Error('No se encontró la organización HCV activa.');
      const orgId = org.rows[0].id;
      const existing = await client.query('select id from insight_survey.survey_studies where code = $1', [studyCode]);
      if (existing.rows.length) throw new Error(`${studyCode} ya existe. La importación es de una sola ejecución y no reemplaza datos.`);
      const studyId = randomUUID();
      await copyRows(client, 'survey_studies', ['id','code','name','description','organization','metadata','organization_id'], [[
        studyId, studyCode, 'Encuesta de Percepción Ciudadana 2025',
        'Levantamiento HCV 2025 con cuestionarios A y B.', org.rows[0].name,
        JSON.stringify({ source: 'HCV 2025', instruments: workbooks.map((book) => book.letter) }), orgId,
      ]]);
      const instruments = [], versions = [], sections = [], questions = [], variables = [], options = [], observations = [];
      for (const book of workbooks) {
        book.instrumentId = randomUUID(); book.versionId = randomUUID(); book.sectionId = randomUUID();
        book.observationIds = book.base.slice(3).map(() => randomUUID());
        const title = `Cuestionario ${book.letter} · HCV 2025`;
        instruments.push([book.instrumentId, studyId, `HCV_2025_${book.letter}`, title,
          `Instrumento ${book.letter} del estudio de percepción ciudadana 2025.`, 'survey',
          JSON.stringify({ source_file: book.filename, sha256: book.sha256 }), orgId]);
        versions.push([book.versionId, book.instrumentId, '1.0', title, 'published',
          JSON.stringify({ source_file: book.filename, sha256: book.sha256,
            response_column_remap: Object.fromEntries(book.variables.filter((entry) => entry.source !== entry.target).map((entry) => [entry.source, entry.target])) }), orgId]);
        sections.push([book.sectionId, book.versionId, 'CUESTIONARIO', `Cuestionario ${book.letter}`, 1, orgId]);
        for (const variable of book.variables) {
          variable.questionId = randomUUID(); variable.variableId = randomUUID(); variable.optionByValue = new Map();
          const categorized = variable.options.length > 1;
          const numeric = !categorized && normalize(variable.level) === 'numerico';
          questions.push([variable.questionId, book.versionId, book.sectionId, variable.code, variable.label,
            categorized ? 'single_choice' : numeric ? 'number' : 'text', variable.target, false,
            JSON.stringify({ source_position: variable.target, value_source_position: variable.source,
              source_measurement_level: variable.level }), orgId]);
          variables.push([variable.variableId, variable.questionId, variable.code, variable.label,
            categorized ? 'categorical' : numeric ? 'number' : 'text', null,
            JSON.stringify({ source_position: variable.target, value_source_position: variable.source }), orgId]);
          for (const [index, option] of variable.options.entries()) {
            const id = randomUUID();
            const missing = /^(no aplica|na|ns.?nc|no sabe)/i.test(normalize(option.label));
            const missingType = missing ? (/^ns.?nc|^no sabe/i.test(normalize(option.label)) ? 'unknown' : 'not_applicable') : null;
            options.push([id, variable.questionId, option.code, option.code, option.label, index + 1,
              missing, missingType, '{}', orgId]);
            for (const key of [normalize(option.code), normalize(option.label)]) {
              const existing = variable.optionByValue.get(key);
              if (existing === null || (existing && existing.id !== id)) variable.optionByValue.set(key, null);
              else variable.optionByValue.set(key, { id, isMissing: missing, missingType });
            }
          }
        }
        for (const [index, data] of book.base.slice(3).entries()) {
          observations.push([book.observationIds[index], book.versionId, String(data[0]), 'completed',
            JSON.stringify({ source_row: index + 4 }), orgId]);
        }
      }
      await copyRows(client, 'survey_instruments', ['id','study_id','code','name','description','instrument_type','metadata','organization_id'], instruments);
      await copyRows(client, 'survey_instrument_versions', ['id','instrument_id','version','name','status','metadata','organization_id'], versions);
      await copyRows(client, 'survey_sections', ['id','instrument_version_id','code','title','position','organization_id'], sections);
      await copyRows(client, 'survey_questions', ['id','instrument_version_id','section_id','code','text','question_type','position','required','metadata','organization_id'], questions);
      await copyRows(client, 'survey_variables', ['id','question_id','code','label','data_type','measurement_level','metadata','organization_id'], variables);
      await copyRows(client, 'survey_answer_options', ['id','question_id','code','value','label','position','is_missing','missing_type','metadata','organization_id'], options);
      await copyRows(client, 'survey_observations', ['id','instrument_version_id','external_id','status','metadata','organization_id'], observations);
      const responseCount = await copyRows(client, 'survey_responses',
        ['id','observation_id','variable_id','raw_value','value_text','value_integer','value_decimal','answer_option_id','is_missing','missing_type','organization_id'],
        responseRows(workbooks, orgId));
      const expected = workbooks.reduce((total, book) => total + book.records * book.variables.length, 0);
      if (responseCount !== expected) throw new Error(`Respuestas incompletas: ${responseCount}/${expected}.`);
      await client.query('COMMIT');
      console.log(`Importación confirmada: ${expected} respuestas en dos instrumentos.`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally { await client.end(); }
}

(async () => {
  const mode = process.argv[2] ?? '--check';
  if (!['--check', '--apply'].includes(mode) || process.argv.length > 3) throw new Error('Uso: node scripts/import-hcv-2025.js [--check | --apply]');
  const workbooks = [];
  for (const item of files) workbooks.push(await inspectWorkbook(item));
  console.log(JSON.stringify({ study: studyCode, mode, workbooks: workbooks.map((book) => ({
    file: book.filename, sha256: book.sha256, records: book.records, variables: book.variables.length,
    responses: book.records * book.variables.length, missing: book.missing,
    remapped_columns: book.variables.filter((entry) => entry.source !== entry.target).map((entry) => ({
      code: entry.code, header_position: entry.target, value_position: entry.source,
    })),
  })) }, null, 2));
  if (mode === '--apply') await apply(workbooks);
})().catch((error) => { console.error(error); process.exitCode = 1; });
