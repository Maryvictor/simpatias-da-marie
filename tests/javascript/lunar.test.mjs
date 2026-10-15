import { test, strict as assert } from './harness.mjs';
import { elongation, classify, illumination, phaseFor, nextPrincipalPhases } from '../../theme/static/js/lunar/lunar.js';
import { litPath } from '../../theme/static/js/lunar/moon-shape.js';

// Fases publicadas (UTC), conferidas em almanaques astronômicos.
const REFERENCES = [
  ['2000-01-06T18:14:00Z', 0],   // Lua Nova
  ['2024-04-08T18:21:00Z', 0],   // Lua Nova
  ['2024-10-10T18:55:00Z', 90],  // Quarto Crescente
  ['2024-04-23T23:49:00Z', 180], // Lua Cheia
  ['2024-10-17T11:26:00Z', 180], // Lua Cheia
];

function angularError(actual, expected) {
  return Math.abs(((actual - expected + 540) % 360) - 180);
}

test('elongação nas fases principais publicadas fica dentro de 0,5°', () => {
  for (const [iso, expected] of REFERENCES) {
    const error = angularError(elongation(new Date(iso)), expected);
    assert.ok(error < 0.5, `${iso}: erro de ${error.toFixed(3)}°`);
  }
});

test('classificação nos limites das quatro categorias', () => {
  assert.equal(classify(0), 'nova');
  assert.equal(classify(44.9), 'nova');
  assert.equal(classify(45), 'crescente');
  assert.equal(classify(134.9), 'crescente');
  assert.equal(classify(135), 'cheia');
  assert.equal(classify(224.9), 'cheia');
  assert.equal(classify(225), 'minguante');
  assert.equal(classify(314.9), 'minguante');
  assert.equal(classify(315), 'nova');
  assert.equal(classify(359.9), 'nova');
  assert.equal(classify(-10), 'nova');
});

test('iluminação: 0 na nova, 1 na cheia, 0,5 nos quartos', () => {
  assert.ok(illumination(0) < 1e-9);
  assert.ok(Math.abs(illumination(180) - 1) < 1e-9);
  assert.ok(Math.abs(illumination(90) - 0.5) < 1e-9);
  assert.ok(Math.abs(illumination(270) - 0.5) < 1e-9);
});

test('phaseFor devolve categoria e idade coerentes', () => {
  const full = phaseFor(new Date('2024-04-23T23:49:00Z'));
  assert.equal(full.category, 'cheia');
  assert.ok(full.illumination > 0.99);
  assert.ok(Math.abs(full.ageDays - 14.77) < 0.2);
  assert.equal(phaseFor(new Date('2024-04-08T18:21:00Z')).category, 'nova');
});

test('próximas fases principais: ordenadas, no futuro e coerentes com o almanaque', () => {
  const start = new Date('2026-10-14T12:00:00Z');
  const phases = nextPrincipalPhases(start, 4);
  assert.equal(phases.length, 4);
  assert.deepEqual(phases.map((p) => p.phase), ['crescente', 'cheia', 'minguante', 'nova']);
  for (let i = 0; i < phases.length; i += 1) {
    assert.ok(phases[i].at > start);
    if (i > 0) assert.ok(phases[i].at > phases[i - 1].at);
  }
  // Lua Cheia de 26/10/2026 ≈ 04h12 UTC; tolerância de 2 horas.
  const full = phases.find((p) => p.phase === 'cheia');
  assert.ok(Math.abs(full.at - new Date('2026-10-26T04:12:00Z')) < 2 * 3600 * 1000);
});

test('desenho da Lua: nova sem parte iluminada; crescente à esquerda, minguante à direita', () => {
  assert.equal(litPath(0), '');
  assert.ok(litPath(90).startsWith('M 0 -48 A 48 48 0 0 0 0 48'), 'crescente: metade esquerda');
  assert.ok(litPath(270).startsWith('M 0 -48 A 48 48 0 0 1 0 48'), 'minguante: metade direita');
  assert.ok(litPath(180).includes('A 48.00 48'), 'cheia: terminador é um círculo completo');
});
