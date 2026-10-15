import { filterProducts, readFilters, writeFilters, FILTER_KEYS } from './filters.js';
import { readJson } from '../shared/motion.js';

function init() {
  const root = document.querySelector('[data-shop]');
  if (!root) return;
  const products = readJson('products-data') ?? [];
  const selects = Object.fromEntries(FILTER_KEYS.map((key) => [key, root.querySelector(`[data-filter="${key}"]`)]));
  const allowed = Object.fromEntries(FILTER_KEYS.map((key) => (
    [key, [...selects[key].options].map((option) => option.value).filter(Boolean)]
  )));
  const cards = new Map([...root.querySelectorAll('[data-product-id]')].map((card) => [card.dataset.productId, card]));
  const status = root.querySelector('[data-shop-status]');
  const empty = root.querySelector('[data-shop-empty]');

  function apply(filters) {
    const visible = new Set(filterProducts(products, filters).map((product) => product.id));
    for (const [id, card] of cards) card.hidden = !visible.has(id);
    empty.hidden = visible.size > 0;
    status.textContent = visible.size === 1 ? '1 produto encontrado.' : `${visible.size} produtos encontrados.`;
  }

  function current() {
    return Object.fromEntries(FILTER_KEYS.map((key) => [key, selects[key].value]));
  }

  function sync(updateUrl) {
    const filters = current();
    apply(filters);
    if (updateUrl) {
      const query = writeFilters(filters);
      history.replaceState(null, '', query ? `?${query}` : location.pathname);
    }
  }

  const initial = readFilters(location.search, allowed);
  for (const key of FILTER_KEYS) selects[key].value = initial[key];
  sync(false);

  for (const key of FILTER_KEYS) selects[key].addEventListener('change', () => sync(true));
  root.querySelector('[data-filter-reset]').addEventListener('click', () => {
    for (const key of FILTER_KEYS) selects[key].value = '';
    sync(true);
  });
}

init();
