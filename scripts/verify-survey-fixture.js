const fs = require('node:fs');
const path = require('node:path');
const { parseSurveyFile, applyColumnMapping } = require('./survey-file');

(async () => {
  const root = path.resolve(__dirname, '..');
  const name = 'encuesta_sintetica_20p_100r';
  const expected = JSON.parse(fs.readFileSync(path.join(root, `${name}.json`), 'utf8'));
  for (const extension of ['txt','csv','xlsx','xls','ods','json']) {
    const filename = `${name}.${extension}`;
    const book = await parseSurveyFile(fs.readFileSync(path.join(root, filename)), filename);
    if (book.preview.questions !== 20 || book.preview.records !== 100 || book.preview.responses !== 2000) {
      throw new Error(`${extension}: conteos incorrectos`);
    }
    if (['xlsx','xls','ods'].includes(extension) && book.preview.sheet !== 'Respuestas') {
      throw new Error(`${extension}: no se leyó la primera hoja`);
    }
    for (let row = 0; row < 100; row++) {
      if (book.records[row].externalId !== expected.responses[row].id) throw new Error(`${extension}: ID ${row}`);
      for (let column = 0; column < 20; column++) {
        const code = book.variables[column].code.toUpperCase();
        if (String(book.records[row].values[column]) !== String(expected.responses[row].answers[code])) {
          throw new Error(`${extension}: valor ${row}/${code}`);
        }
      }
    }
    if (extension !== 'json') {
      const [first, second] = book.variables;
      const swapped = applyColumnMapping(book, { [first.code]: second.position, [second.code]: first.position });
      if (swapped.records[0].values[0] !== book.records[0].values[1] ||
          swapped.records[0].values[1] !== book.records[0].values[0]) throw new Error(`${extension}: remapeo`);
    }
    console.log(`${extension}: 20 preguntas, 100 registros, 2000 respuestas; valores y primera hoja correctos`);
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
