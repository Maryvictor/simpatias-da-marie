// Filtros da loja demonstrativa: funções puras, sem DOM.

export const FILTER_KEYS = ['category', 'intention', 'phase'];
const PARAMS = { category: 'categoria', intention: 'intencao', phase: 'fase' };

/** Retorna os produtos que atendem a todos os filtros preenchidos. */
export function filterProducts(products, filters = {}) {
  const { category = '', intention = '', phase = '' } = filters;
  return products.filter((product) => (
    (!category || product.category === category)
    && (!intention || product.intentions.includes(intention))
    && (!phase || product.phases.includes(phase))
  ));
}

/** Lê os filtros da query string, aceitando só valores presentes na lista permitida. */
export function readFilters(search, allowed) {
  const params = new URLSearchParams(search);
  const filters = { category: '', intention: '', phase: '' };
  for (const key of FILTER_KEYS) {
    const value = params.get(PARAMS[key]) ?? '';
    if ((allowed[key] ?? []).includes(value)) filters[key] = value;
  }
  return filters;
}

export function writeFilters(filters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key]) params.set(PARAMS[key], filters[key]);
  }
  return params.toString();
}
