const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const root = path.resolve(__dirname, '..');
const definitions = [
  ['Q01', '¿Qué edad tienes?', 'integer'],
  ['Q02', '¿En qué sector de Hermosillo vives?', 'single_choice', ['Norte', 'Centro', 'Sur', 'Oriente', 'Poniente']],
  ['Q03', '¿Cuál describe mejor tu actividad principal?', 'single_choice', ['Trabajo de tiempo completo', 'Trabajo de tiempo parcial', 'Estudio', 'Trabajo por cuenta propia', 'Labores del hogar o cuidados', 'Jubilación']],
  ['Q04', '¿Cuántas personas viven en tu hogar, incluyéndote?', 'integer'],
  ['Q05', '¿Cuántas personas menores de 12 años viven en tu hogar?', 'integer'],
  ['Q06', '¿Con qué frecuencia compras despensa para tu hogar?', 'single_choice', ['Varias veces por semana', 'Una vez por semana', 'Cada quince días', 'Una vez al mes']],
  ['Q07', '¿Dónde compras la mayor parte de los alimentos y artículos básicos?', 'single_choice', ['Supermercado', 'Mercado o tianguis', 'Tienda de barrio', 'Aplicación o sitio web', 'Combino varios lugares']],
  ['Q08', 'Aproximadamente, ¿cuánto gastas por semana en alimentos y artículos básicos?', 'single_choice', ['$500 a $999', '$1,000 a $1,499', '$1,500 a $2,499', '$2,500 o más']],
  ['Q09', '¿Qué forma de pago utilizas con más frecuencia al comprar despensa?', 'single_choice', ['Efectivo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Pago desde el celular']],
  ['Q10', '¿Sueles preparar una lista antes de hacer las compras?', 'single_choice', ['Siempre o casi siempre', 'Algunas veces', 'Casi nunca']],
  ['Q11', '¿Con qué frecuencia revisas ofertas o comparas precios antes de comprar?', 'single_choice', ['En casi todas mis compras', 'En algunas compras', 'Rara vez', 'Nunca']],
  ['Q12', '¿Cómo llegas normalmente al lugar donde compras despensa?', 'single_choice', ['Automóvil propio o familiar', 'Autobús', 'A pie', 'Bicicleta', 'Taxi o aplicación de transporte']],
  ['Q13', '¿Cuántos minutos tardas normalmente en llegar al lugar donde haces tu compra principal?', 'integer'],
  ['Q14', '¿Qué día acostumbras hacer la compra principal de la semana?', 'single_choice', ['Lunes a jueves', 'Viernes', 'Sábado', 'Domingo', 'No tengo un día fijo']],
  ['Q15', 'En una semana normal, ¿cuántos días preparas comida en casa?', 'integer'],
  ['Q16', 'En el último mes, ¿cuántas veces pediste comida preparada a domicilio?', 'integer'],
  ['Q17', 'En general, ¿qué tan satisfecho o satisfecha estás con la frescura de frutas y verduras?', 'scale', ['1', '2', '3', '4', '5']],
  ['Q18', 'En tu compra más reciente, ¿cuántos minutos esperaste para pagar en caja?', 'integer'],
  ['Q19', 'Si no encuentras un producto que buscabas, ¿qué haces normalmente?', 'single_choice', ['Lo reemplazo por otro parecido', 'Voy a otra tienda', 'Lo compro en otro momento', 'Sigo sin comprarlo']],
  ['Q20', '¿Qué mejorarías de tus compras habituales para que fueran más fáciles?', 'text'],
];

const questions = definitions.map(([code, text, type, values]) => ({
  code, text, type,
  ...(values ? { options: values.map((value) => ({ code: value, label: value })) } : {}),
}));

let seed = 20261003;
function random() {
  seed = (seed * 48271) % 2147483647;
  return (seed - 1) / 2147483646;
}
function pick(values) { return values[Math.floor(random() * values.length)]; }
function integer(min, max) { return min + Math.floor(random() * (max - min + 1)); }
function chance(probability) { return random() < probability; }

const activities = definitions[2][3];
const sectors = definitions[1][3];
const improvements = [
  'Me ayudaría que las ofertas y los precios por unidad fueran más fáciles de comparar; así podría planear mejor el gasto.',
  'Abrir más cajas en las horas de mayor afluencia reduciría el tiempo de espera, sobre todo los fines de semana.',
  'Preferiría encontrar más frutas y verduras frescas a precios accesibles durante toda la semana.',
  'Sería útil que los productos básicos estuvieran disponibles con regularidad; cuando falta algo tengo que ir a otra tienda.',
  'Me facilitaría la compra tener pasillos mejor señalizados y una lista de productos disponible en la aplicación.',
  'Un servicio de entrega con horarios claros ayudaría cuando no puedo cargar las bolsas o salir de casa.',
  'El acceso peatonal y el estacionamiento podrían ser más cómodos, especialmente cuando llevo varias bolsas.',
  'En general me funciona bien; solo agradecería que las promociones fueran más claras y no cambiaran tanto.',
  'Me gustaría que hubiera más opciones de tamaños pequeños para comprar lo necesario sin desperdiciar comida.',
  'Tener cajas rápidas para pocas cosas haría más sencilla una compra pequeña entre semana.',
];

const responses = Array.from({ length: 100 }, (_, index) => {
  const number = index + 1;
  const activity = pick(activities);
  const age = activity === 'Estudio' ? integer(18, 29)
    : activity === 'Jubilación' ? integer(60, 76)
      : activity === 'Trabajo de tiempo completo' ? integer(24, 58)
        : integer(22, 64);
  const householdSize = activity === 'Jubilación' ? integer(1, 3)
    : activity === 'Estudio' ? integer(2, 5) : integer(1, 6);
  const children = activity === 'Jubilación' || activity === 'Estudio' || householdSize < 2
    ? 0 : integer(0, Math.min(3, householdSize - 1));
  const weeklyShopping = pick(['Varias veces por semana', 'Una vez por semana', 'Una vez por semana', 'Cada quince días', 'Una vez al mes']);
  const store = pick(['Supermercado', 'Supermercado', 'Mercado o tianguis', 'Tienda de barrio', 'Aplicación o sitio web', 'Combino varios lugares']);
  const spend = householdSize <= 2
    ? pick(['$500 a $999', '$500 a $999', '$1,000 a $1,499', '$1,500 a $2,499'])
    : householdSize <= 4
      ? pick(['$1,000 a $1,499', '$1,500 a $2,499', '$1,500 a $2,499', '$2,500 o más'])
      : pick(['$1,500 a $2,499', '$2,500 o más', '$2,500 o más']);
  const transport = pick(['Automóvil propio o familiar', 'Automóvil propio o familiar', 'Autobús', 'A pie', 'Bicicleta', 'Taxi o aplicación de transporte']);
  const minutesToStore = transport === 'Automóvil propio o familiar' ? integer(8, 30)
    : transport === 'Autobús' ? integer(20, 55)
      : transport === 'A pie' || transport === 'Bicicleta' ? integer(5, 20) : integer(10, 35);
  const deliveryCount = pick([0, 0, 1, 1, 2, 3, 4, 5, 6, 8]);
  const daysCooking = Math.max(1, Math.min(7, integer(6, 7) - Math.floor(deliveryCount / 2) - (householdSize > 4 && chance(0.25) ? 1 : 0)));
  const answers = {
    Q01: age,
    Q02: pick(sectors),
    Q03: activity,
    Q04: householdSize,
    Q05: children,
    Q06: weeklyShopping,
    Q07: store,
    Q08: spend,
    Q09: pick(['Efectivo', 'Tarjeta de débito', 'Tarjeta de débito', 'Tarjeta de crédito', 'Pago desde el celular']),
    Q10: pick(['Siempre o casi siempre', 'Siempre o casi siempre', 'Algunas veces', 'Casi nunca']),
    Q11: pick(['En casi todas mis compras', 'En algunas compras', 'En algunas compras', 'Rara vez', 'Nunca']),
    Q12: transport,
    Q13: minutesToStore,
    Q14: pick(['Lunes a jueves', 'Viernes', 'Sábado', 'Sábado', 'Domingo', 'No tengo un día fijo']),
    Q15: daysCooking,
    Q16: deliveryCount,
    Q17: pick(['2', '3', '3', '4', '4', '5']),
    Q18: pick([integer(2, 6), integer(5, 12), integer(8, 18), integer(15, 28)]),
    Q19: pick(['Lo reemplazo por otro parecido', 'Lo reemplazo por otro parecido', 'Voy a otra tienda', 'Lo compro en otro momento', 'Sigo sin comprarlo']),
    Q20: pick(improvements),
  };
  return { id: `HMO-RESP-${String(number).padStart(4, '0')}`, answers };
});

const base = 'encuesta_sintetica_20p_100r';
fs.writeFileSync(path.join(root, `${base}.json`), JSON.stringify({ questions, responses }, null, 2) + '\n');

// Reordena preguntas para ejercitar la detección por encabezado conservando el texto completo.
const order = ['Q11','Q03','Q19','Q01','Q08','Q14','Q06','Q20','Q02','Q16',
  'Q09','Q04','Q17','Q07','Q13','Q05','Q18','Q10','Q15','Q12'];
const questionByCode = new Map(questions.map((question) => [question.code, question]));
const headers = ['id_externo', ...order.map((code) => questionByCode.get(code).text)];
const rows = [headers, ...responses.map((response) => [response.id, ...order.map((code) => response.answers[code])])];
for (const [suffix, delimiter] of [['csv', ','], ['txt', '\t'], ['pipe.txt', '|'], ['punto_y_coma.txt', ';']]) {
  const filename = suffix.includes('.') ? `${base}_${suffix}` : `${base}.${suffix}`;
  const contents = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows), { FS: delimiter, RS: '\r\n' });
  fs.writeFileSync(path.join(root, filename), '\uFEFF' + contents);
}

for (const [extension, bookType] of [['xlsx','xlsx'], ['xls','biff8'], ['ods','ods']]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Respuestas');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['NO_IMPORTAR'], ['SEÑUELO']]), 'Ignorar');
  XLSX.writeFile(workbook, path.join(root, `${base}.${extension}`), { bookType });
}
console.log('Encuesta cotidiana: 20 preguntas redactadas, 100 respuestas sintéticas coherentes y ocho archivos en seis formatos compatibles.');
