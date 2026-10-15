import { respond, MAX_TEXT } from './engine.js';
import { readJson } from '../shared/motion.js';

function init() {
  const root = document.querySelector('[data-guidance]');
  if (!root) return;
  const data = readJson('guidance-data');
  const form = root.querySelector('[data-form]');
  const field = root.querySelector('[data-input]');
  const output = root.querySelector('[data-answer]');
  const bubble = root.querySelector('[data-bubble]');
  const link = root.querySelector('[data-suggestion]');
  const again = root.querySelector('[data-again]');
  const chips = [...root.querySelectorAll('[data-scenario]')];
  const siteRoot = root.dataset.root;
  let scenarioId = '';
  let attempt = 0;
  let lastKey = '';

  field.maxLength = MAX_TEXT;

  function show() {
    const key = `${scenarioId}|${field.value}`;
    attempt = key === lastKey ? attempt + 1 : 0;
    lastKey = key;
    const result = respond(data, { scenarioId, text: field.value, attempt });
    bubble.textContent = result.text; // texto puro
    output.hidden = false;
    again.hidden = result.kind === 'crisis';
    link.hidden = true;
    if (result.suggestion) {
      const spell = data.spells.find((item) => item.id === result.suggestion.spell);
      link.textContent = result.suggestion.text;
      link.href = spell?.page ? `${siteRoot}/${spell.page}/` : `${siteRoot}/catalogo/#${result.suggestion.spell}`;
      link.hidden = false;
    }
  }

  chips.forEach((chip) => chip.addEventListener('click', () => {
    scenarioId = chip.dataset.scenario === scenarioId ? '' : chip.dataset.scenario;
    chips.forEach((other) => other.setAttribute('aria-pressed', String(other.dataset.scenario === scenarioId)));
  }));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    show();
    bubble.focus();
  });
  again.addEventListener('click', () => { show(); bubble.focus(); });
}

init();
