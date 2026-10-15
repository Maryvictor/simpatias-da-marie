// Preferência por movimento reduzido, esperas e leitura de dados embutidos.

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Espera `ms`; com movimento reduzido, a espera cai para `reducedMs`. */
export function wait(ms, reducedMs = 300) {
  const duration = prefersReducedMotion() ? Math.min(ms, reducedMs) : ms;
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/** Lê um bloco <script type="application/json" id="..."> da página. */
export function readJson(id) {
  const node = document.getElementById(id);
  return node ? JSON.parse(node.textContent) : null;
}
