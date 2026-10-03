const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const root = path.resolve(__dirname, '..');
const definitions = [
  ['P01', 'Edad', 'integer'], ['P02', 'Personas en el hogar', 'integer'],
  ['P03', 'Calificación del servicio', 'scale'], ['P04', 'Visitas en el último año', 'integer'],
  ['P05', 'Minutos de traslado', 'integer'], ['P06', 'Ingreso mensual estimado', 'number'],
  ['P07', 'Zona', 'single_choice', ['Norte', 'Centro', 'Sur']],
  ['P08', 'Medio de transporte', 'single_choice', ['Autobús', 'Auto', 'Bicicleta', 'A pie']],
  ['P09', 'Canal de atención', 'single_choice', ['Presencial', 'Teléfono', 'Web']],
  ['P10', 'Frecuencia de uso', 'single_choice', ['Diaria', 'Semanal', 'Mensual']],
  ['P11', 'Recomendaría el servicio', 'single_choice', ['Sí', 'No']],
  ['P12', 'Prioridad de mejora', 'single_choice', ['Tiempo', 'Costo', 'Cobertura']],
  ['P13', 'Colonia', 'text'], ['P14', 'Ocupación', 'text'],
  ['P15', 'Motivo de la visita', 'text'], ['P16', 'Aspecto positivo', 'text'],
  ['P17', 'Aspecto por mejorar', 'text'], ['P18', 'Comentario adicional', 'text'],
  ['P19', 'Punto de referencia', 'text'], ['P20', 'Actividad principal', 'text'],
];
const questions = definitions.map(([code, text, type, values]) => ({
  code, text, type,
  ...(values ? { options: values.map((value) => ({ code: value, label: value })) } : {}),
}));
const responses = Array.from({ length: 100 }, (_, index) => {
  const number = index + 1;
  const answers = {
    P01: 18 + index % 63, P02: 1 + index % 6, P03: 1 + index % 5,
    P04: index % 12, P05: 5 + index % 56, P06: 3500 + index * 125.5,
    P07: ['Norte', 'Centro', 'Sur'][index % 3],
    P08: ['Autobús', 'Auto', 'Bicicleta', 'A pie'][index % 4],
    P09: ['Presencial', 'Teléfono', 'Web'][index % 3],
    P10: ['Diaria', 'Semanal', 'Mensual'][index % 3],
    P11: index % 5 ? 'Sí' : 'No',
    P12: ['Tiempo', 'Costo', 'Cobertura'][index % 3],
    P13: `Colonia ${1 + index % 12}`, P14: `Ocupación ${1 + index % 7}`,
    P15: `Trámite ${1 + index % 9}`, P16: `Atención ${1 + index % 8}`,
    P17: `Mejora ${1 + index % 6}`,
    P18: `Comentario sintético ${number}`, P19: `Referencia ${1 + index % 11}`,
    P20: `Actividad ${1 + index % 10}`,
  };
  return { id: `TEST-${String(number).padStart(3, '0')}`, answers };
});

const base = 'encuesta_sintetica_20p_100r';
fs.writeFileSync(path.join(root, `${base}.json`), JSON.stringify({ questions, responses }, null, 2) + '\n');

// Scramble value columns to exercise header-based detection rather than a fixed position.
const order = ['P11','P03','P19','P01','P08','P14','P06','P20','P02','P16',
  'P09','P04','P17','P07','P13','P05','P18','P10','P15','P12'];
const headers = ['folio', ...order];
const rows = [headers, ...responses.map((response) => [response.id, ...order.map((code) => response.answers[code])])];
const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows), { FS: ',', RS: '\r\n' });
const txt = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows), { FS: '\t', RS: '\r\n' });
fs.writeFileSync(path.join(root, `${base}.csv`), '\uFEFF' + csv);
fs.writeFileSync(path.join(root, `${base}.txt`), '\uFEFF' + txt);

for (const [extension, bookType] of [['xlsx','xlsx'], ['xls','biff8'], ['ods','ods']]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Respuestas');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['NO_IMPORTAR'], ['SEÑUELO']]), 'Ignorar');
  XLSX.writeFile(workbook, path.join(root, `${base}.${extension}`), { bookType });
}
console.log('Encuesta sintética: 20 preguntas, 100 registros y 2000 respuestas en seis formatos.');
