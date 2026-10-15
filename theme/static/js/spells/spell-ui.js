// Interface das simpatias: liga formulário, animações CSS (data-state) e a máquina de estados.
import { createRitual } from './ritual.js';
import { getHistory } from '../history/store.js';
import { readJson, wait } from '../shared/motion.js';

const PETAL_COUNT = 16;

function setState(stage, state) {
  stage.dataset.state = state;
  stage.querySelectorAll('[data-show]').forEach((node) => {
    node.hidden = !node.dataset.show.split(' ').includes(state);
  });
}

function showError(root, text) {
  const node = root.querySelector('[data-error]');
  node.textContent = text;
  node.hidden = !text;
}

function showMessage(root, ritual) {
  root.querySelector('[data-message]').textContent = ritual.message; // texto puro, nunca HTML
  const echo = root.querySelector('[data-echo]');
  if (echo) echo.hidden = true;
}

function buildPetals(container) {
  container.replaceChildren();
  for (let i = 0; i < PETAL_COUNT; i += 1) {
    const petal = document.createElement('span');
    petal.className = 'petal';
    petal.style.setProperty('--y', `${10 + ((i * 37) % 70)}%`);
    petal.style.setProperty('--delay', `${(i * 0.28).toFixed(2)}s`);
    petal.style.setProperty('--dur', `${4 + (i % 4) * 0.7}s`);
    petal.style.setProperty('--rot', `${(i * 53) % 360}deg`);
    petal.style.setProperty('--sway', `${20 + (i % 5) * 12}px`);
    container.append(petal);
  }
}

async function runApple(root, ritual, stage) {
  setState(stage, ritual.state); // macas
  await wait(2200);
  setState(stage, ritual.advance()); // mel
  await wait(4200);
  setState(stage, ritual.advance()); // mensagem
  showMessage(root, ritual);
}

async function runRose(root, ritual, stage) {
  buildPetals(stage.querySelector('[data-petals]'));
  setState(stage, ritual.state); // petalas
  await wait(6500);
  setState(stage, ritual.advance()); // mensagem
  showMessage(root, ritual);
}

function wireLetter(root, ritual, stage) {
  const paper = root.querySelector('[data-paper]');
  const toEnvelope = root.querySelector('[data-to-envelope]');
  const toStamp = root.querySelector('[data-to-stamp]');

  root.addEventListener('letter:start', () => {
    paper.textContent = ritual.input; // pré-visualização como texto puro
    setState(stage, ritual.state); // papel
  });
  toEnvelope.addEventListener('click', async () => {
    setState(stage, ritual.advance()); // envelope
    await wait(1600);
    stage.dataset.ready = 'stamp';
    toStamp.hidden = false;
    toStamp.focus();
  });
  toStamp.addEventListener('click', async () => {
    toStamp.hidden = true;
    setState(stage, ritual.advance()); // selo
    await wait(1200);
    setState(stage, ritual.advance()); // voo
    paper.textContent = '';
    await wait(4200);
    setState(stage, ritual.advance()); // fim
    showMessage(root, ritual);
  });
}

function init() {
  const root = document.querySelector('[data-ritual]');
  if (!root) return;
  const spellId = root.dataset.ritual;
  const spells = readJson('spells-data') ?? [];
  const spell = spells.find((item) => item.id === spellId);
  const ritual = createRitual(spellId, { messages: spell?.messages ?? [], history: getHistory() });
  const stage = root.querySelector('[data-stage]');
  const form = root.querySelector('[data-form]');
  const field = form.querySelector('[data-input]');
  const counter = root.querySelector('[data-counter]');

  setState(stage, ritual.state);
  const updateCounter = () => { if (counter) counter.textContent = `${field.value.length}/${field.maxLength}`; };
  field.addEventListener('input', updateCounter);
  updateCounter();

  if (spellId === 'correios-imaginarios') wireLetter(root, ritual, stage);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = ritual.submit(field.value);
    showError(root, result.ok ? '' : result.error);
    if (!result.ok) { field.focus(); return; }
    form.hidden = true;
    const echo = root.querySelector('[data-echo]');
    if (echo) { echo.textContent = ritual.input; echo.hidden = false; }
    if (spellId === 'maca-fuji-com-mel') await runApple(root, ritual, stage);
    else if (spellId === 'rosa-branca-no-vento') await runRose(root, ritual, stage);
    else root.dispatchEvent(new Event('letter:start'));
    field.value = ''; // o texto digitado não fica no campo
    updateCounter();
  });

  root.querySelector('[data-restart]').addEventListener('click', () => {
    ritual.reset();
    form.hidden = false;
    field.value = '';
    updateCounter();
    delete stage.dataset.ready;
    const stamp = root.querySelector('[data-to-stamp]');
    if (stamp) stamp.hidden = true;
    setState(stage, ritual.state);
    root.querySelector('[data-message]').textContent = '';
    field.focus();
  });
}

init();
