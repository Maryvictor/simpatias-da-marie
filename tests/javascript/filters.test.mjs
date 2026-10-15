import { test, data, strict as assert } from './harness.mjs';
import { filterProducts, readFilters, writeFilters } from '../../theme/static/js/shop/filters.js';

const products = data('products/products.json');
const taxonomy = data('products/taxonomy.json');
const allowed = {
  category: taxonomy.categories.map((c) => c.id),
  intention: taxonomy.intentions.map((i) => i.id),
  phase: ['nova', 'crescente', 'cheia', 'minguante'],
};

test('sem filtros devolve todos os produtos', () => {
  assert.equal(filterProducts(products, {}).length, products.length);
});

test('filtra por categoria', () => {
  const result = filterProducts(products, { category: 'velas' });
  assert.ok(result.length >= 3);
  assert.ok(result.every((p) => p.category === 'velas'));
});

test('filtra por intenção', () => {
  const result = filterProducts(products, { intention: 'deixar-ir' });
  assert.ok(result.length > 0);
  assert.ok(result.every((p) => p.intentions.includes('deixar-ir')));
});

test('filtra por fase da Lua', () => {
  for (const phase of allowed.phase) {
    const result = filterProducts(products, { phase });
    assert.ok(result.length > 0, phase);
    assert.ok(result.every((p) => p.phases.includes(phase)));
  }
});

test('combina filtros com E lógico', () => {
  const result = filterProducts(products, { category: 'kits', intention: 'recomeco', phase: 'nova' });
  assert.deepEqual(result.map((p) => p.id), ['kit-recomeco']);
});

test('combinação sem resultado retorna lista vazia', () => {
  assert.deepEqual(filterProducts(products, { category: 'velas', phase: 'cheia', intention: 'prosperidade' }), []);
});

test('os cinco kits pedidos existem', () => {
  const kits = filterProducts(products, { category: 'kits' }).map((p) => p.id).sort();
  assert.deepEqual(kits, ['kit-amor-proprio', 'kit-deixar-ir', 'kit-novo-ciclo', 'kit-prosperidade', 'kit-recomeco']);
});

test('lê e escreve filtros na query string, ignorando valores inválidos', () => {
  const filters = readFilters('?categoria=velas&fase=cheia&intencao=inexistente', allowed);
  assert.deepEqual(filters, { category: 'velas', intention: '', phase: 'cheia' });
  assert.equal(writeFilters(filters), 'categoria=velas&fase=cheia');
  assert.equal(writeFilters({ category: '', intention: '', phase: '' }), '');
  assert.deepEqual(readFilters('?categoria=<script>', allowed), { category: '', intention: '', phase: '' });
});
