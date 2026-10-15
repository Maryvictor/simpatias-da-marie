import { test, strict as assert } from './harness.mjs';
import { createHistory, sanitize, STORAGE_KEY, MAX_ENTRIES } from '../../theme/static/js/history/store.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

function clockFrom(start = Date.UTC(2026, 0, 1)) {
  let tick = 0;
  return () => new Date(start + (tick++) * 60000);
}

function makeHistory(storage = fakeStorage()) {
  let counter = 0;
  const history = createHistory({ storage, now: clockFrom(), makeId: () => `registro-${String(++counter).padStart(4, '0')}` });
  return { history, storage };
}

test('histórico guarda somente id, simpatia e data', () => {
  const { history, storage } = makeHistory();
  history.add('rosa-branca-no-vento');
  const saved = JSON.parse(storage.map.get(STORAGE_KEY));
  assert.equal(saved.length, 1);
  assert.deepEqual(Object.keys(saved[0]).sort(), ['at', 'id', 'spellId']);
  assert.equal(saved[0].spellId, 'rosa-branca-no-vento');
});

test('limita a dez registros e mantém os mais recentes', () => {
  const { history, storage } = makeHistory();
  for (let i = 1; i <= 13; i += 1) history.add(`simpatia-${i}`);
  const list = history.list();
  assert.equal(MAX_ENTRIES, 10);
  assert.equal(list.length, 10);
  assert.equal(list[0].spellId, 'simpatia-13');
  assert.equal(list[9].spellId, 'simpatia-4');
  assert.equal(JSON.parse(storage.map.get(STORAGE_KEY)).length, 10, 'o limite vale também para o que é gravado');
});

test('ordena do mais recente para o mais antigo', () => {
  const { history } = makeHistory();
  history.add('a-um');
  history.add('b-dois');
  history.add('c-tres');
  const times = history.list().map((e) => Date.parse(e.at));
  assert.deepEqual(times, [...times].sort((x, y) => y - x));
});

test('exclui um registro e limpa tudo', () => {
  const { history, storage } = makeHistory();
  const first = history.add('a-um');
  history.add('b-dois');
  assert.equal(history.remove(first.id), true);
  assert.equal(history.remove('inexistente-123'), false);
  assert.equal(history.list().length, 1);
  history.clear();
  assert.deepEqual(history.list(), []);
  assert.equal(storage.map.has(STORAGE_KEY), false);
});

test('descarta dados inválidos, duplicados e campos extras', () => {
  const good = { id: 'abcdefgh-1', spellId: 'rosa-branca-no-vento', at: '2026-01-02T10:00:00.000Z' };
  const raw = [
    good,
    good,
    { ...good, id: 'abcdefgh-2', nome: 'Fulana' },
    { id: 'curto', spellId: 'x-y', at: '2026-01-02T10:00:00.000Z' },
    { id: 'abcdefgh-3', spellId: '<script>', at: '2026-01-02T10:00:00.000Z' },
    { id: 'abcdefgh-4', spellId: 'ok-ok', at: 'ontem' },
    null,
    'texto',
    42,
  ];
  const clean = sanitize(raw);
  assert.equal(clean.length, 2);
  assert.ok(clean.every((e) => Object.keys(e).length === 3));
  assert.deepEqual(sanitize('não é lista'), []);
});

test('JSON corrompido no storage vira histórico vazio e continua funcionando', () => {
  const { history } = makeHistory(fakeStorage({ [STORAGE_KEY]: '{quebrado' }));
  assert.deepEqual(history.list(), []);
  history.add('a-um');
  assert.equal(history.list().length, 1);
});

test('storage bloqueado: funciona em memória e informa persistent=false', () => {
  const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
  };
  const { history } = makeHistory(blocked);
  history.add('a-um');
  history.add('b-dois');
  assert.equal(history.list().length, 2);
  assert.equal(history.persistent, false);
  history.clear();
  assert.equal(history.list().length, 0);
});

test('sem storage (null): histórico em memória', () => {
  const history = createHistory({ storage: null });
  history.add('a-um');
  assert.equal(history.persistent, false);
  assert.equal(history.list().length, 1);
});

test('cota excedida ao gravar: mantém os dados em memória', () => {
  const storage = fakeStorage();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const { history } = makeHistory(storage);
  history.add('a-um');
  assert.equal(history.persistent, false);
  assert.equal(history.list().length, 1);
});

test('rejeita simpatia com id inválido', () => {
  const { history } = makeHistory();
  assert.throws(() => history.add('Nome da Pessoa'));
  assert.throws(() => history.add(''));
});
