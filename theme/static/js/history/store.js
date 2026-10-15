// Histórico local das dez últimas experiências.
// Guarda somente { id, spellId, at }. Sem DOM: o armazenamento é injetado.

export const STORAGE_KEY = 'simpatias-da-marie:historico:v1';
export const MAX_ENTRIES = 10;

const SPELL_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ENTRY_ID = /^[A-Za-z0-9-]{8,64}$/;

export function isValidEntry(entry) {
  return Boolean(entry)
    && typeof entry === 'object'
    && typeof entry.id === 'string' && ENTRY_ID.test(entry.id)
    && typeof entry.spellId === 'string' && entry.spellId.length <= 60 && SPELL_ID.test(entry.spellId)
    && typeof entry.at === 'string' && !Number.isNaN(Date.parse(entry.at));
}

/** Converte qualquer valor lido em lista válida, ordenada (mais recente primeiro) e limitada. */
export function sanitize(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const clean = [];
  for (const item of raw) {
    if (!isValidEntry(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    clean.push({ id: item.id, spellId: item.spellId, at: item.at }); // descarta campos extras
  }
  clean.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || (a.id < b.id ? 1 : -1));
  return clean.slice(0, MAX_ENTRIES);
}

function defaultMakeId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Retorna window.localStorage, ou null se estiver bloqueado ou indisponível. */
export function getBrowserStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Sem `storage` utilizável, o histórico continua funcionando só em memória
 * (`persistent` fica false) e se perde ao fechar a página.
 */
export function createHistory({ storage = null, now = () => new Date(), makeId = defaultMakeId } = {}) {
  let memory = [];
  let persistent = Boolean(storage);

  function read() {
    if (!persistent) return memory;
    try {
      const text = storage.getItem(STORAGE_KEY);
      let parsed = [];
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = []; }
      }
      memory = sanitize(parsed);
    } catch {
      persistent = false;
    }
    return memory;
  }

  function write(entries) {
    memory = entries;
    if (!persistent) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      persistent = false; // cota excedida ou armazenamento bloqueado
    }
  }

  return {
    get persistent() { return persistent; },
    list() { return [...read()]; },
    add(spellId) {
      const entry = { id: makeId(), spellId: String(spellId), at: now().toISOString() };
      if (!isValidEntry(entry)) throw new Error('Registro de histórico inválido');
      write(sanitize([entry, ...read()]));
      return entry;
    },
    remove(id) {
      const before = read();
      const after = before.filter((entry) => entry.id !== id);
      if (after.length !== before.length) write(after);
      return after.length !== before.length;
    },
    clear() {
      write([]);
      if (persistent) {
        try { storage.removeItem(STORAGE_KEY); } catch { persistent = false; }
      }
    },
  };
}

let shared;
/** Instância única usada pelas páginas. */
export function getHistory() {
  if (!shared) shared = createHistory({ storage: getBrowserStorage() });
  return shared;
}
