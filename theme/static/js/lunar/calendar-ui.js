import { phaseFor, nextPrincipalPhases } from './lunar.js';
import { moonSvg } from './moon-shape.js';
import { readJson } from '../shared/motion.js';

const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function renderToday(root, phases, now) {
  const info = phaseFor(now);
  const meta = phases.find((phase) => phase.id === info.category);
  const card = root.querySelector('[data-lunar-today]');
  card.replaceChildren(moonSvg(info.elongation, { size: 120, label: `${meta.name}, ${Math.round(info.illumination * 100)}% iluminada` }));
  const text = document.createElement('div');
  const title = document.createElement('h2');
  title.textContent = meta.name;
  const detail = document.createElement('p');
  detail.textContent = `${Math.round(info.illumination * 100)}% iluminada · idade aproximada de ${info.ageDays.toFixed(1).replace('.', ',')} dias · ${info.waxing ? 'crescendo' : 'minguando'}`;
  const theme = document.createElement('p');
  theme.className = 'lead';
  theme.textContent = `${meta.theme}. ${meta.meaning}`;
  text.append(title, detail, theme);
  card.append(text);

  root.querySelectorAll('[data-phase-panel]').forEach((panel) => {
    const active = panel.dataset.phasePanel === info.category;
    panel.classList.toggle('is-current', active);
    const badge = panel.querySelector('[data-current-badge]');
    if (badge) badge.hidden = !active;
  });

  const list = root.querySelector('[data-lunar-next]');
  list.replaceChildren();
  for (const item of nextPrincipalPhases(now, 4)) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = item.name;
    li.append(strong, ` — ${dateTimeFormat.format(item.at)}`);
    list.append(li);
  }
}

function renderMonth(root, phases, year, month, today) {
  const grid = root.querySelector('[data-lunar-grid]');
  root.querySelector('[data-lunar-month]').textContent = monthFormat.format(new Date(year, month, 1));
  grid.replaceChildren();
  for (const name of WEEKDAYS) {
    const head = document.createElement('div');
    head.className = 'cal-head';
    head.textContent = name;
    head.setAttribute('role', 'columnheader');
    grid.append(head);
  }
  const first = new Date(year, month, 1);
  for (let i = 0; i < first.getDay(); i += 1) {
    const blank = document.createElement('div');
    blank.setAttribute('aria-hidden', 'true');
    grid.append(blank);
  }
  const days = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    const info = phaseFor(new Date(year, month, day, 12));
    const meta = phases.find((phase) => phase.id === info.category);
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.setAttribute('role', 'gridcell');
    cell.dataset.phase = info.category;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    if (isToday) cell.classList.add('is-today');
    cell.setAttribute('aria-label', `${day}: ${meta.name}, ${Math.round(info.illumination * 100)}% iluminada${isToday ? ', hoje' : ''}`);
    const number = document.createElement('span');
    number.textContent = String(day);
    cell.append(moonSvg(info.elongation, { size: 34 }), number);
    grid.append(cell);
  }
}

function init() {
  const root = document.querySelector('[data-lunar]');
  if (!root) return;
  const phases = readJson('phases-data');
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  renderToday(root, phases, now);
  renderMonth(root, phases, year, month, now);
  const shift = (delta) => {
    const target = new Date(year, month + delta, 1);
    year = target.getFullYear();
    month = target.getMonth();
    renderMonth(root, phases, year, month, now);
  };
  root.querySelector('[data-lunar-prev]').addEventListener('click', () => shift(-1));
  root.querySelector('[data-lunar-next-month]').addEventListener('click', () => shift(1));
}

init();
