import { test, data, strict as assert } from './harness.mjs';
import { createRitual, DEFINITIONS } from '../../theme/static/js/spells/ritual.js';

const spells = data('spells/spells.json');
const messagesFor = (id) => spells.find((s) => s.id === id).messages;

function spyHistory() {
  const calls = [];
  return { calls, add: (id) => { calls.push(id); return { id }; } };
}

function setup(id) {
  const history = spyHistory();
  const ritual = createRitual(id, { messages: messagesFor(id), history });
  return { ritual, history };
}

test('toda simpatia interativa tem definição e mensagens', () => {
  for (const spell of spells.filter((s) => s.kind === 'interativa')) {
    assert.ok(DEFINITIONS[spell.id], spell.id);
    assert.ok(spell.messages.length >= 3);
  }
});

test('maçãs com mel: intenção → maçãs → mel → mensagem', () => {
  const { ritual, history } = setup('maca-fuji-com-mel');
  assert.equal(ritual.state, 'intencao');
  assert.deepEqual(ritual.submit('Ana'), { ok: true, state: 'macas' });
  assert.equal(ritual.advance(), 'mel');
  assert.equal(history.calls.length, 0, 'ainda não registrou');
  assert.equal(ritual.advance(), 'mensagem');
  assert.equal(ritual.done, true);
  assert.ok(messagesFor('maca-fuji-com-mel').includes(ritual.message));
  assert.deepEqual(history.calls, ['maca-fuji-com-mel']);
});

test('rosa branca: intenção → pétalas → mensagem', () => {
  const { ritual, history } = setup('rosa-branca-no-vento');
  ritual.submit('paz em casa');
  assert.equal(ritual.state, 'petalas');
  assert.equal(ritual.advance(), 'mensagem');
  assert.deepEqual(history.calls, ['rosa-branca-no-vento']);
});

test('correios: escrever → papel → envelope → selo → voo → fim', () => {
  const { ritual, history } = setup('correios-imaginarios');
  const visited = [ritual.state];
  ritual.submit('Querida amiga, escrevo para dizer que estou bem.');
  visited.push(ritual.state);
  while (!ritual.done) visited.push(ritual.advance());
  assert.deepEqual(visited, ['escrever', 'papel', 'envelope', 'selo', 'voo', 'fim']);
  assert.deepEqual(history.calls, ['correios-imaginarios']);
});

test('validação do primeiro passo: vazio, curto e longo demais', () => {
  const { ritual } = setup('maca-fuji-com-mel');
  assert.equal(ritual.submit('').ok, false);
  assert.equal(ritual.submit('   ').ok, false);
  assert.equal(ritual.submit('a'.repeat(61)).ok, false);
  assert.equal(ritual.state, 'intencao', 'continua no início após erros');
  const letter = setup('correios-imaginarios').ritual;
  assert.equal(letter.submit('curta').ok, false);
  assert.equal(letter.submit('x'.repeat(1201)).ok, false);
});

test('não avança antes de começar nem passa do último estado', () => {
  const { ritual } = setup('rosa-branca-no-vento');
  assert.equal(ritual.advance(), 'intencao');
  ritual.submit('amor-próprio');
  ritual.advance();
  assert.equal(ritual.advance(), 'mensagem');
  assert.equal(ritual.submit('de novo').ok, false);
});

test('histórico recebe apenas o id da simpatia, nunca o conteúdo', () => {
  const history = spyHistory();
  const ritual = createRitual('correios-imaginarios', { messages: messagesFor('correios-imaginarios'), history });
  const secret = 'Segredo íntimo que ninguém deve guardar';
  ritual.submit(secret);
  while (!ritual.done) ritual.advance();
  assert.deepEqual(history.calls, ['correios-imaginarios']);
  assert.equal(JSON.stringify(history.calls).includes('Segredo'), false);
  assert.equal(ritual.input, null, 'a carta é apagada da memória ao concluir');
  assert.equal(String(ritual.message).includes('Segredo'), false);
});

test('mesma intenção gera a mesma mensagem (determinístico)', () => {
  const first = setup('maca-fuji-com-mel').ritual;
  const second = setup('maca-fuji-com-mel').ritual;
  for (const r of [first, second]) { r.submit('Gratidão'); r.advance(); r.advance(); }
  assert.equal(first.message, second.message);
});

test('reiniciar permite refazer e registra uma nova experiência', () => {
  const { ritual, history } = setup('rosa-branca-no-vento');
  ritual.submit('um'); ritual.advance();
  ritual.reset();
  assert.equal(ritual.state, 'intencao');
  assert.equal(ritual.message, null);
  ritual.submit('dois'); ritual.advance();
  assert.equal(history.calls.length, 2);
});

test('simpatia desconhecida lança erro', () => {
  assert.throws(() => createRitual('nao-existe', { messages: [], history: spyHistory() }));
});
