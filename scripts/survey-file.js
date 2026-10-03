/* eslint-disable @typescript-eslint/no-require-imports */
const XLSX = require('xlsx');
const Papa = require('papaparse');

const missingTokens = new Set(['na', 'n/a', 'ns/nc', 'ns-nc']);
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f\u200e\u200f]/g, '').trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
const absent = (value) => missingTokens.has(normalize(value));
const codeFromHeader = (value) => normalize(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100);
const supported = new Set(['txt', 'csv', 'xlsx', 'xls', 'ods', 'json']);

function formatOf(filename) {
  const extension = String(filename).split('.').pop()?.toLowerCase();
  if (!supported.has(extension)) throw new Error('Formato no admitido. Usa TXT, CSV, XLSX, XLS, ODS o JSON.');
  return extension;
}

function safeCell(value, row, column) {
  if (value === undefined || value === null) return null;
  const text = String(value);
  if (text.length > 32767 || text.includes('\u0000')) throw new Error(`Valor inválido en fila ${row}, columna ${column}.`);
  return typeof value === 'string' ? value.trim() || null : value;
}

function inspectLimits(questionCount, recordCount) {
  if (questionCount < 1 || questionCount > 500) throw new Error('El archivo debe tener entre 1 y 500 preguntas.');
  if (recordCount < 1 || recordCount > 20000 || questionCount * recordCount > 5000000) {
    throw new Error('El archivo supera el máximo de 20,000 registros o 5 millones de respuestas.');
  }
}

function inferVariable(code, label, values, position, sourceHeader) {
  const nonmissing = values.filter((value) => value !== null && value !== '' && !absent(value));
  const textValues = nonmissing.map(String);
  const unique = [...new Set(textValues)];
  const numeric = nonmissing.length > 0 && nonmissing.every((value) => typeof value === 'number' || /^-?\d+(?:[.,]\d+)?$/.test(String(value)));
  const categorical = !numeric && unique.length >= 2 && unique.length <= 20 && unique.length / Math.max(1, nonmissing.length) <= 0.3;
  return {
    code, label, position, sourceHeader,
    questionType: numeric ? 'number' : categorical ? 'single_choice' : 'text',
    dataType: numeric ? 'number' : categorical ? 'categorical' : 'text',
    options: categorical ? unique.map((value) => ({ code: value, label: value })) : [],
  };
}

function fromRows(inputRows, sheet, format) {
  const rows = inputRows.filter((row) => Array.isArray(row) && row.some((value) => value !== null && value !== undefined && String(value).trim() !== ''));
  if (rows.length < 2) throw new Error('Faltan encabezados o registros.');
  const legacy = normalize(rows[0][0]) === 'posicion:' && normalize(rows[1]?.[0]) === 'etiqueta:' && normalize(rows[2]?.[0]) === 'variable';
  const headerIndex = legacy ? 2 : 0;
  const header = rows[headerIndex];
  const labels = legacy ? rows[1] : header;
  const firstData = headerIndex + 1;
  const idNames = new Set(['id', 'external_id', 'id_externo', 'folio', 'registro', 'record_id', 'respondent_id']);
  const idIndex = legacy ? 0 : header.findIndex((value) => idNames.has(codeFromHeader(value)));
  const warnings = [];
  if (idIndex < 0) warnings.push('No se encontró una columna de ID; se asignará un ID consecutivo a cada registro.');
  if (legacy) warnings.push('La hoja usa etiquetas y códigos separados. Revisa que cada columna de valores corresponda a la pregunta indicada.');
  const columnIndexes = header.map((_, index) => index).filter((index) => index !== idIndex);
  inspectLimits(columnIndexes.length, rows.length - firstData);
  const codes = new Set();
  const variables = columnIndexes.map((position) => {
    const sourceHeader = String(header[position] ?? '').trim();
    const code = codeFromHeader(sourceHeader);
    const label = String(labels[position] ?? sourceHeader).trim();
    if (!code || !label || codes.has(code)) throw new Error(`Encabezado vacío o duplicado en la columna ${position + 1}.`);
    codes.add(code);
    const values = rows.slice(firstData).map((row) => row[position]);
    return inferVariable(code, label, values, position, sourceHeader);
  });
  const ids = new Set();
  const records = rows.slice(firstData).map((row, index) => {
    if (row.length > header.length && row.slice(header.length).some((value) => value !== null && value !== undefined && String(value).trim() !== '')) {
      throw new Error(`La fila ${firstData + index + 1} tiene más columnas que el encabezado.`);
    }
    const externalId = idIndex >= 0 ? String(row[idIndex] ?? '').trim() : String(index + 1);
    if (!externalId || ids.has(externalId)) throw new Error(`ID vacío o repetido en la fila ${firstData + index + 1}.`);
    ids.add(externalId);
    return { externalId, values: variables.map((variable) => safeCell(row[variable.position], firstData + index + 1, variable.position + 1)) };
  });
  return { format, variables, records, preview: {
    format, sheet, records: records.length, questions: variables.length,
    responses: records.length * variables.length, warnings,
    columns: variables.map((variable, index) => ({ code: variable.code, label: variable.label,
      position: variable.position, questionType: variable.questionType,
      samples: records.map((record) => record.values[index]).filter((value) => value !== null && value !== '').slice(0, 3).map((value) => String(value).slice(0, 120)) })),
  } };
}

function fromJson(buffer) {
  let document;
  try { document = JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('JSON inválido.'); }
  if (!document || typeof document !== 'object' || Array.isArray(document) || !Array.isArray(document.questions) || !Array.isArray(document.responses)) {
    throw new Error('JSON debe contener questions y responses como arreglos.');
  }
  inspectLimits(document.questions.length, document.responses.length);
  const codes = new Set();
  const variables = document.questions.map((question, position) => {
    const code = String(question?.code ?? '').trim();
    const label = String(question?.text ?? '').trim();
    if (!/^[\p{L}\p{N}_-]{1,100}$/u.test(code) || codes.has(code) || !label) throw new Error(`Pregunta inválida o duplicada en la posición ${position + 1}.`);
    codes.add(code);
    const questionType = String(question.type ?? 'text');
    if (!['text', 'number', 'integer', 'single_choice', 'scale'].includes(questionType)) throw new Error(`Tipo de pregunta no admitido: ${questionType}.`);
    const options = Array.isArray(question.options) ? question.options.map((option) => ({
      code: String(option?.code ?? ''), label: String(option?.label ?? ''),
    })) : [];
    if (options.some((option) => !option.code || !option.label) || new Set(options.map((option) => option.code)).size !== options.length) {
      throw new Error(`Opciones inválidas en ${code}.`);
    }
    return { code, label, position, sourceHeader: code, questionType,
      dataType: ['number','integer','scale'].includes(questionType) ? 'number' : questionType === 'single_choice' ? 'categorical' : 'text', options };
  });
  const ids = new Set();
  const records = document.responses.map((response, index) => {
    const externalId = String(response?.id ?? response?.external_id ?? '').trim();
    const answers = response?.answers;
    if (!externalId || ids.has(externalId) || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new Error(`Respuesta inválida o ID repetido en la posición ${index + 1}.`);
    }
    ids.add(externalId);
    const unknown = Object.keys(answers).find((key) => !codes.has(key));
    if (unknown) throw new Error(`Respuesta ${externalId}: pregunta desconocida ${unknown}.`);
    return { externalId, values: variables.map((variable) => safeCell(answers[variable.code], index + 1, variable.position + 1)) };
  });
  const warnings = [];
  for (const [position, variable] of variables.entries()) {
    const values = records.map((record) => record.values[position]).filter((value) => value !== null && !absent(value));
    if (variable.dataType === 'number' && values.some((value) =>
      !Number.isFinite(typeof value === 'number' ? value : Number(String(value).replace(',', '.'))) ||
      (variable.questionType === 'integer' && !Number.isSafeInteger(Number(String(value).replace(',', '.')))))) {
      throw new Error(`Respuesta numérica inválida en ${variable.code}.`);
    }
    if (variable.questionType === 'single_choice') {
      if (!variable.options.length) {
        warnings.push(`La pregunta ${variable.code} no define opciones; sus respuestas quedarán sin categoría normalizada.`);
      } else {
        const allowed = new Set(variable.options.flatMap((option) => [normalize(option.code), normalize(option.label)]));
        const unmatched = values.filter((value) => !allowed.has(normalize(value)));
        if (unmatched.length) warnings.push(`${variable.code}: ${unmatched.length} respuestas no coinciden con sus opciones.`);
      }
    }
  }
  return { format: 'json', variables, records, preview: {
    format: 'json', sheet: null, records: records.length,
    questions: variables.length, responses: records.length * variables.length, warnings,
    columns: variables.map((variable, index) => ({ code: variable.code, label: variable.label,
      position: variable.position, questionType: variable.questionType,
      samples: records.map((record) => record.values[index]).filter((value) => value !== null && value !== '').slice(0, 3).map((value) => String(value).slice(0, 120)) })),
  } };
}

function applyColumnMapping(book, mapping) {
  if (!mapping || !Object.keys(mapping).length) return book;
  if (book.format === 'json') throw new Error('JSON ya relaciona cada respuesta por código de pregunta.');
  const positions = book.variables.map((variable) => variable.position);
  const assigned = book.variables.map((variable) => {
    const requested = mapping[variable.code];
    return requested === undefined ? variable.position : Number(requested);
  });
  if (assigned.some((position) => !positions.includes(position)) || new Set(assigned).size !== positions.length ||
      Object.keys(mapping).some((code) => !book.variables.some((variable) => variable.code === code))) {
    throw new Error('El mapeo de columnas debe asignar cada columna de valores una sola vez.');
  }
  const sourceIndexes = assigned.map((position) => positions.indexOf(position));
  const records = book.records.map((record) => ({ ...record, values: sourceIndexes.map((index) => record.values[index]) }));
  const variables = book.variables.map((variable, index) => ({
    ...inferVariable(variable.code, variable.label, records.map((record) => record.values[index]),
      variable.position, variable.sourceHeader), valueSourcePosition: assigned[index],
  }));
  return { ...book, variables, records };
}

async function parseSurveyFile(buffer, filename) {
  const format = formatOf(filename);
  if (format === 'json') return fromJson(buffer);
  if (format === 'csv' || format === 'txt') {
    let text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(buffer);
    text = text.replace(/^\uFEFF/, '');
    const delimiter = format === 'txt' && text.includes('\t') ? '\t' : '';
    const parsed = Papa.parse(text, { delimiter, skipEmptyLines: 'greedy' });
    if (parsed.errors.length) throw new Error(`Archivo delimitado inválido: ${parsed.errors[0].message}`);
    return fromRows(parsed.data, null, format);
  }
  if (format === 'xlsx' || format === 'xls' || format === 'ods') {
    let workbook;
    try { workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true }); }
    catch { throw new Error('Hoja de cálculo inválida o dañada.'); }
    const sheet = workbook.SheetNames[0];
    if (!sheet) throw new Error('La hoja de cálculo está vacía.');
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, raw: true, defval: null, blankrows: false });
    return fromRows(rows, sheet, format);
  }
  throw new Error('Formato no admitido.');
}

module.exports = { parseSurveyFile, applyColumnMapping, formatOf, normalize, absent };
