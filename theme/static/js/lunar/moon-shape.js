// Geometria do disco lunar (sem DOM). Hemisfério sul: a Lua crescente fica iluminada à esquerda.

const R = 48;

/** Caminho SVG (viewBox -50 -50 100 100) da parte iluminada, ou '' se for Lua Nova. */
export function litPath(elongationDeg) {
  const e = ((elongationDeg % 360) + 360) % 360;
  const c = Math.cos((e * Math.PI) / 180); // 1 = nova, -1 = cheia
  const litLeft = e < 180;
  const rx = Math.abs(c) * R;
  if (rx > R - 0.4 && c > 0) return ''; // praticamente nova
  const mainSweep = litLeft ? 0 : 1;
  const crescent = c > 0;
  const termSweep = crescent === litLeft ? 1 : 0;
  return `M 0 ${-R} A ${R} ${R} 0 0 ${mainSweep} 0 ${R} A ${rx.toFixed(2)} ${R} 0 0 ${termSweep} 0 ${-R} Z`;
}

export function moonSvg(elongationDeg, { size = 64, label = '' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-50 -50 100 100');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.classList.add('moon');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  const disc = document.createElementNS(ns, 'circle');
  disc.setAttribute('r', R);
  disc.setAttribute('class', 'moon-dark');
  svg.append(disc);
  const path = litPath(elongationDeg);
  if (path) {
    const lit = document.createElementNS(ns, 'path');
    lit.setAttribute('d', path);
    lit.setAttribute('class', 'moon-lit');
    svg.append(lit);
  }
  return svg;
}
