const fs = require('node:fs');
const path = require('node:path');
const { parseSurveyFile, applyColumnMapping } = require('./survey-file');

(async () => {
  const root = path.resolve(__dirname, '..');
  const name = 'encuesta_sintetica_20p_100r';
  const expected = JSON.parse(fs.readFileSync(path.join(root, `${name}.json`), 'utf8'));
  const codeByQuestion = new Map(expected.questions.map((question) => [question.text, question.code]));
  if (expected.questions.length !== 20 || expected.questions.some((question) =>
    !question.text.includes('¿') || !question.text.endsWith('?') || question.text === question.code)) {
    throw new Error('Cada encabezado debe ser una pregunta redactada, no un identificador.');
  }
  const files = [
    ['txt tabulado', `${name}.txt`], ['csv', `${name}.csv`], ['xlsx', `${name}.xlsx`],
    ['xls', `${name}.xls`], ['ods', `${name}.ods`], ['json', `${name}.json`],
    ['txt delimitado por pipe', `${name}_pipe.txt`], ['txt delimitado por punto y coma', `${name}_punto_y_coma.txt`],
  ];
  for (const [label, filename] of files) {
    const book = await parseSurveyFile(fs.readFileSync(path.join(root, filename)), filename);
    if (book.preview.questions !== 20 || book.preview.records !== 100 || book.preview.responses !== 2000) {
      throw new Error(`${label}: conteos incorrectos`);
    }
    if (book.variables.some((variable, index) => variable.code !== `P${String(index + 1).padStart(3, '0')}`)) {
      throw new Error(`${label}: códigos de pregunta fuera de secuencia`);
    }
    if (['xlsx','xls','ods'].some((extension) => filename.endsWith(`.${extension}`)) && book.preview.sheet !== 'Respuestas') {
      throw new Error(`${label}: no se leyó la primera hoja`);
    }
    for (let row = 0; row < 100; row++) {
      if (book.records[row].externalId !== expected.responses[row].id) throw new Error(`${label}: ID ${row}`);
      for (let column = 0; column < 20; column++) {
        const code = codeByQuestion.get(book.variables[column].label);
        if (!code) throw new Error(`${label}: la columna ${column + 1} no conserva una pregunta legible`);
        if (String(book.records[row].values[column]) !== String(expected.responses[row].answers[code])) {
          throw new Error(`${label}: valor ${row}/${code}`);
        }
      }
    }
    if (filename !== `${name}.json`) {
      const [first, second] = book.variables;
      const swapped = applyColumnMapping(book, { [first.code]: second.position, [second.code]: first.position });
      if (swapped.records[0].values[0] !== book.records[0].values[1] ||
          swapped.records[0].values[1] !== book.records[0].values[0]) throw new Error(`${label}: remapeo`);
    }
    console.log(`${label}: 20 preguntas redactadas, 100 registros y 2000 respuestas correctos`);
  }
  for (const [label, input] of [
    ['encabezado duplicado', 'id,P01,P01\n1,a,b'],
    ['ID duplicado', 'id,P01\n1,a\n1,b'],
    ['columna extra', 'id,P01\n1,a,b'],
  ]) {
    try { await parseSurveyFile(Buffer.from(input), 'invalido.csv'); throw new Error(`Aceptó ${label}`); }
    catch (error) { if (error.message === `Aceptó ${label}`) throw error; }
  }
  console.log('CSV inválidos: encabezado, ID y columna extra rechazados');
})().catch((error) => { console.error(error); process.exitCode = 1; });
