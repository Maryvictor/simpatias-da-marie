// Cálculo da fase da Lua no navegador. Espelha scripts/lunar.py (série truncada de Meeus, cap. 47).
// Um teste de paridade compara os dois. Precisão: elongação com erro típico < 0,5°.

export const SYNODIC_MONTH = 29.530588853;
const MEAN_ELONGATION_RATE = 12.190749;
const DAY_MS = 86400000;
const rad = (deg) => (deg * Math.PI) / 180;
const mod = (value, base) => ((value % base) + base) % base;

export const PRINCIPAL_ANGLES = { nova: 0, crescente: 90, cheia: 180, minguante: 270 };
export const QUARTER_NAMES = {
  nova: 'Lua Nova', crescente: 'Quarto Crescente', cheia: 'Lua Cheia', minguante: 'Quarto Minguante',
};

export function julianDay(date) {
  return date.getTime() / DAY_MS + 2440587.5;
}

/** Ângulo Lua-Sol em graus [0, 360): 0 = Lua Nova, 180 = Lua Cheia. */
export function elongation(date) {
  const t = (julianDay(date) - 2451545.0) / 36525.0;
  const d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t;
  const m = 357.5291092 + 35999.0502909 * t;
  const mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t;
  const f = 93.2720950 + 483202.0175233 * t;
  const lp = 218.3164477 + 481267.88123421 * t;

  const moon = lp
    + 6.288774 * Math.sin(rad(mp))
    + 1.274027 * Math.sin(rad(2 * d - mp))
    + 0.658314 * Math.sin(rad(2 * d))
    + 0.213618 * Math.sin(rad(2 * mp))
    - 0.185116 * Math.sin(rad(m))
    - 0.114332 * Math.sin(rad(2 * f))
    + 0.058793 * Math.sin(rad(2 * d - 2 * mp))
    + 0.057066 * Math.sin(rad(2 * d - m - mp))
    + 0.053322 * Math.sin(rad(2 * d + mp))
    + 0.045758 * Math.sin(rad(2 * d - m))
    - 0.040923 * Math.sin(rad(m - mp))
    - 0.034720 * Math.sin(rad(d))
    - 0.030383 * Math.sin(rad(m + mp));
  const sun = 280.46646 + 36000.76983 * t + 1.914602 * Math.sin(rad(m)) + 0.019993 * Math.sin(rad(2 * m));
  return mod(moon - sun, 360);
}

/** Quatro categorias da marca, cada uma com 90° centrados na fase principal. */
export function classify(elong) {
  const e = mod(elong, 360);
  if (e >= 315 || e < 45) return 'nova';
  if (e < 135) return 'crescente';
  if (e < 225) return 'cheia';
  return 'minguante';
}

export function illumination(elong) {
  return (1 - Math.cos(rad(elong))) / 2;
}

export function phaseFor(date) {
  const e = elongation(date);
  return {
    elongation: e,
    illumination: illumination(e),
    ageDays: (e / 360) * SYNODIC_MONTH,
    waxing: e < 180,
    category: classify(e),
  };
}

const signedDiff = (a, b) => mod(a - b + 180, 360) - 180;

/** Próximos instantes em que a elongação cruza 0°, 90°, 180° ou 270°. */
export function nextPrincipalPhases(date, count = 4) {
  const results = Object.entries(PRINCIPAL_ANGLES).map(([phase, target]) => {
    const first = mod(target - elongation(date), 360);
    let ms = date.getTime() + (first / MEAN_ELONGATION_RATE) * DAY_MS;
    for (let i = 0; i < 6; i += 1) {
      ms += (signedDiff(target, elongation(new Date(ms))) / MEAN_ELONGATION_RATE) * DAY_MS;
    }
    if (ms < date.getTime()) ms += SYNODIC_MONTH * DAY_MS;
    return { phase, name: QUARTER_NAMES[phase], at: new Date(ms) };
  });
  results.sort((a, b) => a.at - b.at);
  return results.slice(0, count);
}
