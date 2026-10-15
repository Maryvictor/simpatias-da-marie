import { test, data, strict as assert } from './harness.mjs';
import { respond, classify, isCrisis } from '../../theme/static/js/guidance/engine.js';

const scenarioData = data('guidance/scenarios.json');
const characters = { lacan: data('guidance/lacan.json'), marcia: data('guidance/marcia.json') };
const configFor = (id) => ({
  character: characters[id],
  scenarios: scenarioData.scenarios,
  crisisKeywords: scenarioData.crisis_keywords,
  crisisMessage: scenarioData.crisis_message,
});

test('cada cenário de cada personagem responde com uma mensagem do próprio conjunto', () => {
  for (const id of Object.keys(characters)) {
    for (const scenario of scenarioData.scenarios) {
      const result = respond(configFor(id), { scenarioId: scenario.id });
      assert.equal(result.kind, 'message');
      assert.ok(characters[id].messages[scenario.id].includes(result.text), `${id}/${scenario.id}`);
      assert.equal(result.suggestion.spell, scenario.suggestion.spell);
    }
  }
});

test('classifica texto livre (com acentos e caixa alta) no cenário certo', () => {
  const { scenarios } = scenarioData;
  assert.equal(classify('Quero RECONQUISTAR meu ex', scenarios), 'reconquista');
  assert.equal(classify('não consigo desapegar do meu ex', scenarios), 'desapego');
  assert.equal(classify('Estou apaixonada por uma pessoa comprometida', scenarios), 'comprometido');
  assert.equal(classify('não consigo desapegar, sinto saudade', scenarios), 'desapego');
  assert.equal(classify('preciso melhorar minha autoestima', scenarios), 'amor-proprio');
  assert.equal(classify('quero recomeçar do zero', scenarios), 'recomeco');
  assert.equal(classify('bolo de cenoura', scenarios), null);
});

test('palavra-chave com espaços nas pontas só vale como palavra inteira', () => {
  const scenarios = [{ id: 'x', keywords: [' ex '] }];
  assert.equal(classify('o texto está complexo', scenarios), null);
  assert.equal(classify('penso no meu ex todo dia', scenarios), 'x');
});

test('mesma entrada gera sempre a mesma resposta; tentativas percorrem as mensagens', () => {
  const config = configFor('marcia');
  const a = respond(config, { scenarioId: 'desapego', text: 'oi' });
  const b = respond(config, { scenarioId: 'desapego', text: 'oi' });
  assert.equal(a.text, b.text);
  const seen = new Set();
  for (let attempt = 0; attempt < 4; attempt += 1) seen.add(respond(config, { scenarioId: 'desapego', text: 'oi', attempt }).text);
  assert.equal(seen.size, characters.marcia.messages.desapego.length);
});

test('os dois personagens têm vozes diferentes para a mesma pergunta', () => {
  const lacan = respond(configFor('lacan'), { scenarioId: 'recomeco' }).text;
  const marcia = respond(configFor('marcia'), { scenarioId: 'recomeco' }).text;
  assert.notEqual(lacan, marcia);
});

test('sem cenário reconhecido usa mensagens gerais, sem sugestão', () => {
  const result = respond(configFor('lacan'), { text: 'qualquer coisa aleatória' });
  assert.equal(result.scenarioId, null);
  assert.equal(result.suggestion, null);
  assert.ok(characters.lacan.messages.geral.includes(result.text));
});

test('botão de cenário prevalece sobre o texto livre; id desconhecido é ignorado', () => {
  const config = configFor('lacan');
  assert.equal(respond(config, { scenarioId: 'recomeco', text: 'quero reconquistar' }).scenarioId, 'recomeco');
  assert.equal(respond(config, { scenarioId: '__proto__', text: '' }).scenarioId, null);
});

test('sinais de sofrimento grave retornam acolhimento com o CVV, sem sugestão de ritual', () => {
  for (const text of ['quero me matar', 'Penso em SUICÍDIO', 'não quero mais viver, quero morrer']) {
    assert.equal(isCrisis(text, scenarioData.crisis_keywords), true, text);
    const result = respond(configFor('marcia'), { text, scenarioId: 'recomeco' });
    assert.equal(result.kind, 'crisis');
    assert.ok(result.text.includes('188'));
    assert.equal(result.suggestion, null);
  }
});

test('nenhuma mensagem faz promessa ou diagnóstico', () => {
  const forbidden = /garanto|garantid|vai voltar|com certeza|diagnóstico|depressão|transtorno/i;
  for (const character of Object.values(characters)) {
    for (const messages of Object.values(character.messages)) {
      for (const message of messages) assert.equal(forbidden.test(message), false, message);
    }
  }
});
