// Usado pelo teste de paridade Python/JS: imprime a elongação e a categoria de cada instante (ISO) recebido.
import { elongation, classify } from '../../theme/static/js/lunar/lunar.js';

const result = process.argv.slice(2).map((iso) => {
  const e = elongation(new Date(iso));
  return { iso, elongation: e, category: classify(e) };
});
console.log(JSON.stringify(result));
