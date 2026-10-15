// Utilidades de texto puras (sem DOM).

/** Minúsculas, sem acentos e com espaços normalizados. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Hash FNV-1a de 32 bits, determinístico entre navegadores e Node. */
export function hashString(text) {
  let hash = 0x811c9dc5;
  const input = String(text);
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Escolha determinística: o mesmo texto sempre retorna o mesmo item. */
export function pickDeterministic(items, seed, offset = 0) {
  if (!items.length) return undefined;
  return items[(hashString(seed) + offset) % items.length];
}
