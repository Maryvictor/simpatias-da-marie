import { getHistory } from './store.js';
import { readJson } from '../shared/motion.js';

const formatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

function render(root, spells, history) {
  const list = root.querySelector('[data-history-list]');
  const empty = root.querySelector('[data-history-empty]');
  const clearButton = root.querySelector('[data-history-clear]');
  const notice = root.querySelector('[data-history-notice]');
  const entries = history.list();

  notice.hidden = history.persistent;
  empty.hidden = entries.length > 0;
  clearButton.hidden = entries.length === 0;
  list.replaceChildren();

  for (const entry of entries) {
    const spell = spells.find((item) => item.id === entry.spellId);
    const item = document.createElement('li');
    item.className = 'history-item';

    const info = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = spell ? spell.title : 'Experiência desconhecida';
    const time = document.createElement('time');
    time.dateTime = entry.at;
    time.textContent = formatter.format(new Date(entry.at));
    info.append(title, time);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-quiet';
    remove.textContent = 'Excluir';
    remove.setAttribute('aria-label', `Excluir ${title.textContent} de ${time.textContent}`);
    remove.addEventListener('click', () => {
      history.remove(entry.id);
      render(root, spells, history);
      root.querySelector('[data-history-status]').textContent = 'Registro excluído.';
    });

    item.append(info, remove);
    list.append(item);
  }
}

export function initHistory() {
  const root = document.querySelector('[data-history]');
  if (!root) return;
  const spells = readJson('spells-data') ?? [];
  const history = getHistory();
  render(root, spells, history);
  root.querySelector('[data-history-clear]').addEventListener('click', () => {
    if (window.confirm('Limpar todo o histórico deste navegador?')) {
      history.clear();
      render(root, spells, history);
      root.querySelector('[data-history-status]').textContent = 'Histórico limpo.';
    }
  });
}

initHistory();
