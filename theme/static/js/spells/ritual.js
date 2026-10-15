// Máquina de estados das simpatias interativas. Sem DOM, sem timers:
// a interface decide quando chamar advance() (ao fim de cada animação).
import { normalize, pickDeterministic } from '../shared/text.js';

export const DEFINITIONS = {
  'maca-fuji-com-mel': {
    steps: ['intencao', 'macas', 'mel', 'mensagem'],
    input: { min: 2, max: 60, label: 'nome ou intenção' },
  },
  'rosa-branca-no-vento': {
    steps: ['intencao', 'petalas', 'mensagem'],
    input: { min: 2, max: 60, label: 'nome ou intenção' },
  },
  'correios-imaginarios': {
    steps: ['escrever', 'papel', 'envelope', 'selo', 'voo', 'fim'],
    input: { min: 10, max: 1200, label: 'carta' },
  },
};

/**
 * @param {string} spellId id da simpatia (chave de DEFINITIONS)
 * @param {{messages: string[], history: {add(id: string): unknown}}} deps
 */
export function createRitual(spellId, { messages, history }) {
  const definition = DEFINITIONS[spellId];
  if (!definition) throw new Error(`Simpatia desconhecida: ${spellId}`);
  const { steps } = definition;
  let index = 0;
  let input = null; // fica só em memória; apagado ao concluir ou reiniciar
  let message = null;
  let recorded = false;

  function finish() {
    message = pickDeterministic(messages, normalize(input), 0) ?? '';
    input = null; // a carta/intenção nunca é guardada depois do ritual
    if (!recorded) {
      history.add(spellId); // somente o id da simpatia; o conteúdo não é enviado
      recorded = true;
    }
  }

  return {
    spellId,
    get state() { return steps[index]; },
    get input() { return input; },
    get message() { return message; },
    get done() { return index === steps.length - 1; },
    get steps() { return [...steps]; },

    /** Primeiro passo: valida o texto informado e inicia o ritual. */
    submit(text) {
      if (index !== 0) return { ok: false, error: 'O ritual já começou.' };
      const value = String(text ?? '').trim();
      const { min, max, label } = definition.input;
      if (value.length < min) {
        return { ok: false, error: `Escreva ${label === 'carta' ? 'um pouco mais na sua carta' : `seu ${label}`} (mínimo de ${min} caracteres).` };
      }
      if (value.length > max) {
        return { ok: false, error: `O limite é de ${max} caracteres.` };
      }
      input = value;
      index = 1;
      return { ok: true, state: steps[index] };
    },

    /** Avança uma etapa. Ao chegar na última, escolhe a mensagem e registra no histórico. */
    advance() {
      if (index === 0 || index >= steps.length - 1) return steps[index];
      index += 1;
      if (index === steps.length - 1) finish();
      return steps[index];
    },

    reset() {
      index = 0;
      input = null;
      message = null;
      recorded = false;
    },
  };
}
