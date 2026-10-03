/* eslint-disable @typescript-eslint/no-require-imports */
const { createHash, randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { Client } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');
const { createClient } = require('@supabase/supabase-js');
const { parseSurveyFile, applyColumnMapping, normalize, absent } = require('./survey-file');

const bucket = 'survey-imports';
const chunkSize = 100;

async function connect() {
  const connectionString = process.env.APP_DATABASE_POOLER || process.env.APP_DATABASE_URL;
  if (!connectionString) throw new Error('Falta APP_DATABASE_POOLER/APP_DATABASE_URL.');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const role = await client.query('select current_user');
  if (role.rows[0].current_user !== 'insight_app') {
    await client.end();
    throw new Error('La importación requiere la conexión insight_app.');
  }
  return client;
}

function csv(value) { return value === null || value === undefined ? '\\N' : `"${String(value).replaceAll('"', '""')}"`; }
function* batches(rows) {
  let batch = '', count = 0;
  for (const row of rows) {
    batch += row.map(csv).join(',') + '\n';
    if (++count === 1000) { yield batch; batch = ''; count = 0; }
  }
  if (batch) yield batch;
}
async function copy(client, table, columns, rows) {
  const stream = client.query(copyFrom(`COPY insight_survey.${table} (${columns.join(',')}) FROM STDIN WITH (FORMAT csv, NULL '\\N')`));
  await pipeline(Readable.from(batches(rows)), stream);
  return stream.rowCount;
}

async function loadJob(client, jobId) {
  const result = await client.query('select * from insight_survey.survey_import_jobs where id = $1', [jobId]);
  if (!result.rows.length) throw new Error('Importación no encontrada.');
  return result.rows[0];
}

async function loadBook(job) {
  let bytes = job.source_bytes;
  if (!bytes) {
    if (!job.storage_path || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Falta el archivo o la configuración de almacenamiento.');
    }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } });
    const downloaded = await admin.storage.from(bucket).download(job.storage_path);
    if (downloaded.error || !downloaded.data) throw new Error('No se pudo leer el archivo almacenado.');
    bytes = Buffer.from(await downloaded.data.arrayBuffer());
  }
  if (bytes.length > 10 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== job.source_sha256) {
    throw new Error('El archivo no coincide con la validación.');
  }
  const parsed = await parseSurveyFile(bytes, job.source_filename);
  if (parsed.preview.records !== job.preview.records || parsed.preview.questions !== job.preview.questions ||
      parsed.preview.responses !== job.preview.responses || parsed.preview.format !== job.preview.format) {
    throw new Error('La estructura del archivo cambió desde la validación.');
  }
  return applyColumnMapping(parsed, job.column_mapping);
}

async function preparedInstrument(client, jobId, organizationId) {
  const result = await client.query(`select i.id, v.id as version_id
    from insight_survey.survey_instruments i
    join insight_survey.survey_instrument_versions v on v.instrument_id = i.id and v.organization_id = i.organization_id
    where i.organization_id = $1 and v.metadata->>'import_job_id' = $2`,
    [organizationId, jobId]);
  return result.rows[0] ?? null;
}

async function prepareImport(jobId) {
  const client = await connect();
  try {
    const job = await loadJob(client, jobId);
    const book = await loadBook(job);
    await client.query('BEGIN');
    try {
      await client.query("set local lock_timeout = '10s'");
      const locked = await client.query('select status from insight_survey.survey_import_jobs where id = $1 for update', [jobId]);
      if (!['queued','processing','completed'].includes(locked.rows[0].status)) throw new Error('La importación no está encolada.');
      const existing = await preparedInstrument(client, jobId, job.organization_id);
      if (existing) { await client.query('COMMIT'); return book.records.length; }
      const org = await client.query("select name from insight_core.core_organizations where id = $1 and status = 'active'", [job.organization_id]);
      if (!org.rows.length) throw new Error('La organización ya no está activa.');
      await client.query("update insight_survey.survey_import_jobs set status = 'processing', started_at = coalesce(started_at, now()), updated_at = now() where id = $1", [jobId]);
      const study = await client.query('select id, organization_id from insight_survey.survey_studies where code = $1', [job.study_code]);
      let studyId = study.rows[0]?.id;
      if (studyId && study.rows[0].organization_id !== job.organization_id) throw new Error('El estudio pertenece a otra organización.');
      if (!studyId) {
        studyId = randomUUID();
        await copy(client, 'survey_studies', ['id','code','name','organization','metadata','organization_id'],
          [[studyId, job.study_code, job.study_name, org.rows[0].name, JSON.stringify({ import_job_id: jobId }), job.organization_id]]);
      }
      const prior = await client.query('select id from insight_survey.survey_instruments where study_id = $1 and code = $2', [studyId, job.instrument_code]);
      const instrumentId = prior.rows[0]?.id ?? randomUUID(), versionId = randomUUID(), sectionId = randomUUID();
      const provenance = JSON.stringify({ import_job_id: jobId, source_file: job.source_filename, sha256: job.source_sha256 });
      if (!prior.rows.length) await copy(client, 'survey_instruments', ['id','study_id','code','name','instrument_type','metadata','organization_id'],
        [[instrumentId, studyId, job.instrument_code, job.instrument_name, 'survey', provenance, job.organization_id]]);
      const duplicate = await client.query('select 1 from insight_survey.survey_instrument_versions where instrument_id = $1 and version = $2', [instrumentId, job.version]);
      if (duplicate.rows.length) throw new Error('Esta encuesta ya tiene cargada esa versión en la organización.');
      await copy(client, 'survey_instrument_versions', ['id','instrument_id','version','name','status','metadata','organization_id'],
        [[versionId, instrumentId, job.version, job.instrument_name, 'draft', provenance, job.organization_id]]);
      await copy(client, 'survey_sections', ['id','instrument_version_id','code','title','position','organization_id'],
        [[sectionId, versionId, 'CUESTIONARIO', 'Cuestionario', 1, job.organization_id]]);
      const questions = [], variables = [], options = [];
      for (const variable of book.variables) {
        const questionId = randomUUID(), variableId = randomUUID();
        questions.push([questionId, versionId, sectionId, variable.code, variable.label, variable.questionType,
          variable.position + 1, false, JSON.stringify({ source_column: variable.sourceHeader,
            source_position: variable.position, value_source_position: variable.valueSourcePosition ?? variable.position }), job.organization_id]);
        variables.push([variableId, questionId, variable.code, variable.label, variable.dataType, null,
          JSON.stringify({ source_column: variable.sourceHeader }), job.organization_id]);
        for (const [index, option] of variable.options.entries()) {
          const missing = /^(no aplica|na|ns.?nc|no sabe)/i.test(normalize(option.label));
          const missingType = missing ? (/^ns.?nc|^no sabe/i.test(normalize(option.label)) ? 'unknown' : 'not_applicable') : null;
          options.push([randomUUID(), questionId, option.code, option.code, option.label, index + 1,
            missing, missingType, '{}', job.organization_id]);
        }
      }
      await copy(client, 'survey_questions', ['id','instrument_version_id','section_id','code','text','question_type','position','required','metadata','organization_id'], questions);
      await copy(client, 'survey_variables', ['id','question_id','code','label','data_type','measurement_level','metadata','organization_id'], variables);
      await copy(client, 'survey_answer_options', ['id','question_id','code','value','label','position','is_missing','missing_type','metadata','organization_id'], options);
      await client.query('COMMIT');
      return book.records.length;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally { await client.end(); }
}

async function importChunk(jobId, chunkIndex) {
  const client = await connect();
  try {
    const job = await loadJob(client, jobId);
    const book = await loadBook(job);
    const start = chunkIndex * chunkSize;
    const records = book.records.slice(start, start + chunkSize);
    if (!records.length) throw new Error('Bloque de importación fuera de rango.');
    await client.query('BEGIN');
    try {
      await client.query("set local lock_timeout = '10s'");
      await client.query("set local statement_timeout = '4min'");
      await client.query('select id from insight_survey.survey_import_jobs where id = $1 for update', [jobId]);
      const done = await client.query('select 1 from insight_survey.survey_import_job_chunks where job_id = $1 and chunk_index = $2', [jobId, chunkIndex]);
      if (done.rows.length) { await client.query('COMMIT'); return; }
      const instrument = await preparedInstrument(client, jobId, job.organization_id);
      if (!instrument) throw new Error('El instrumento aún no está preparado.');
      const variableRows = await client.query(`select v.id, v.code, q.question_type, q.id as question_id
        from insight_survey.survey_variables v
        join insight_survey.survey_questions q on q.id = v.question_id and q.organization_id = v.organization_id
        where q.instrument_version_id = $1 and v.organization_id = $2`, [instrument.version_id, job.organization_id]);
      const optionRows = await client.query(`select ao.id, ao.question_id, ao.code, ao.label, ao.is_missing, ao.missing_type
        from insight_survey.survey_answer_options ao
        join insight_survey.survey_questions q on q.id = ao.question_id and q.organization_id = ao.organization_id
        where q.instrument_version_id = $1 and ao.organization_id = $2`, [instrument.version_id, job.organization_id]);
      const variableByCode = new Map(variableRows.rows.map((row) => [row.code, row]));
      const optionsByQuestion = new Map();
      for (const option of optionRows.rows) {
        if (!optionsByQuestion.has(option.question_id)) optionsByQuestion.set(option.question_id, new Map());
        const map = optionsByQuestion.get(option.question_id);
        for (const key of [normalize(option.code), normalize(option.label)]) {
          const existing = map.get(key);
          map.set(key, existing && existing.id !== option.id ? null : option);
        }
      }
      const observationIds = records.map(() => randomUUID());
      const observations = records.map((record, index) => [observationIds[index], instrument.version_id,
        record.externalId, 'completed', JSON.stringify({ source_record: start + index + 1 }), job.organization_id]);
      await copy(client, 'survey_observations', ['id','instrument_version_id','external_id','status','metadata','organization_id'], observations);
      function* responses() {
        for (const [recordIndex, record] of records.entries()) for (const [index, variable] of book.variables.entries()) {
          const definition = variableByCode.get(variable.code);
          if (!definition) throw new Error(`Falta la variable ${variable.code}.`);
          const value = record.values[index];
          const raw = value === null || value === undefined ? null : String(value);
          const option = raw === null ? null : optionsByQuestion.get(definition.question_id)?.get(normalize(raw));
          const missing = raw === null || absent(raw) || option?.is_missing === true;
          const missingType = raw === null ? 'not_provided' : absent(raw)
            ? (normalize(raw) === 'ns/nc' ? 'unknown' : 'not_applicable') : option?.missing_type ?? null;
          const parsedNumber = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
          const numeric = !missing && variable.dataType === 'number' && Number.isFinite(parsedNumber);
          const quality = !missing && variable.questionType === 'single_choice' && !option ? 'warning' : 'valid';
          yield [randomUUID(), observationIds[recordIndex], definition.id, raw, missing ? null : raw,
            numeric && Number.isSafeInteger(parsedNumber) ? parsedNumber : null,
            numeric && !Number.isSafeInteger(parsedNumber) ? parsedNumber : null,
            option?.id ?? null, missing, missingType, quality, job.organization_id];
        }
      }
      const responseCount = await copy(client, 'survey_responses',
        ['id','observation_id','variable_id','raw_value','value_text','value_integer','value_decimal','answer_option_id','is_missing','missing_type','quality_status','organization_id'], responses());
      if (responseCount !== records.length * book.variables.length) throw new Error('El bloque produjo respuestas incompletas.');
      await client.query(`insert into insight_survey.survey_import_job_chunks
        (job_id, chunk_index, organization_id, observation_count, response_count) values ($1,$2,$3,$4,$5)`,
      [jobId, chunkIndex, job.organization_id, records.length, responseCount]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally { await client.end(); }
}

async function finishImport(jobId) {
  const client = await connect();
  try {
    await client.query('BEGIN');
    try {
      const job = await loadJob(client, jobId);
      await client.query('select id from insight_survey.survey_import_jobs where id = $1 for update', [jobId]);
      if (job.status === 'completed') { await client.query('COMMIT'); return; }
      const chunks = await client.query(`select count(*)::int as chunks, coalesce(sum(observation_count),0)::int as observations,
        coalesce(sum(response_count),0)::int as responses from insight_survey.survey_import_job_chunks where job_id = $1`, [jobId]);
      const count = chunks.rows[0];
      if (count.chunks !== Math.ceil(job.preview.records / chunkSize) || count.observations !== job.preview.records || count.responses !== job.preview.responses) {
        throw new Error('La importación no terminó todos sus bloques.');
      }
      const instrument = await preparedInstrument(client, jobId, job.organization_id);
      if (!instrument) throw new Error('Instrumento no encontrado al finalizar.');
      await client.query("update insight_survey.survey_instrument_versions set status = 'published', published_at = now() where id = $1", [instrument.version_id]);
      await client.query(`update insight_survey.survey_import_jobs
        set status = 'completed', instrument_id = $2, error_message = null,
          finished_at = now(), updated_at = now() where id = $1`, [jobId, instrument.id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally { await client.end(); }
}

async function failImport(jobId, message) {
  const client = await connect();
  try {
    await client.query(`update insight_survey.survey_import_jobs
      set status = 'failed', error_message = $2, finished_at = now(), updated_at = now()
      where id = $1 and status <> 'completed'`, [jobId, String(message).slice(0, 1000)]);
  } finally { await client.end(); }
}

module.exports = { prepareImport, importChunk, finishImport, failImport, chunkSize };
