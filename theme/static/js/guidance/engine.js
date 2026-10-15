// Regras determinísticas dos personagens: sem rede, sem IA, sem aleatoriedade.
// Mesma entrada + mesmo tentativa = mesma resposta.
import { normalize, pickDeterministic } from '../shared/text.js';

export const MAX_TEXT = 280;

function padded(text) {
  return ` ${normalize(text)} `;
}

/** Detecta sinais de sofrimento grave; nesse caso a resposta é sempre de acolhimento e ajuda. */
export function isCrisis(text, crisisKeywords) {
  const haystack = padded(text);
  return crisisKeywords.some((keyword) => haystack.includes(normalize(keyword)));
}

/** Escolhe o cenário com mais palavras-chave encontradas; empate fica com o primeiro da lista. */
export function classify(text, scenarios) {
  const haystack = padded(text);
  let best = null;
  let bestScore = 0;
  for (const scenario of scenarios) {
    let score = 0;
    for (const keyword of scenario.keywords) {
      const needle = keyword.startsWith(' ') ? ` ${normalize(keyword)} ` : normalize(keyword);
      if (needle.trim() && haystack.includes(needle)) score += 1;
    }
    if (score > bestScore) {
      best = scenario.id;
      bestScore = score;
    }
  }
  return best;
}

/**
 * @param {{character: {messages: Record<string,string[]>}, scenarios: object[],
 *          crisisKeywords: string[], crisisMessage: string}} config
 * @param {{scenarioId?: string, text?: string, attempt?: number}} input
 */
export function respond(config, { scenarioId = '', text = '', attempt = 0 } = {}) {
  const clean = String(text).slice(0, MAX_TEXT);
  if (clean && isCrisis(clean, config.crisisKeywords)) {
    return { kind: 'crisis', scenarioId: null, text: config.crisisMessage, suggestion: null };
  }
  const known = new Set(config.scenarios.map((scenario) => scenario.id));
  const chosen = known.has(scenarioId) ? scenarioId : (clean ? classify(clean, config.scenarios) : null);
  const key = chosen ?? 'geral';
  const pool = config.character.messages[key] ?? config.character.messages.geral;
  const seed = `${config.character.id}|${key}|${normalize(clean)}`;
  const scenario = config.scenarios.find((item) => item.id === chosen);
  return {
    kind: 'message',
    scenarioId: chosen,
    text: pickDeterministic(pool, seed, attempt),
    suggestion: scenario ? scenario.suggestion : null,
  };
}
