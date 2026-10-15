"""Cálculo da fase da Lua (elongação Lua-Sol).

Usa a série truncada de Jean Meeus (Astronomical Algorithms, cap. 47) para a
longitude eclíptica da Lua e uma fórmula simples para a do Sol. O mesmo
algoritmo está implementado em theme/static/js/lunar/lunar.js; um teste de
paridade garante que os dois produzem os mesmos números.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

SYNODIC_MONTH = 29.530588853  # dias
MEAN_ELONGATION_RATE = 12.190749  # graus por dia
UNIX_EPOCH_JD = 2440587.5

# Quartos de 90° centrados nas fases principais (0°, 90°, 180°, 270°).
PHASE_ORDER = ("nova", "crescente", "cheia", "minguante")
PRINCIPAL_ANGLES = {"nova": 0.0, "crescente": 90.0, "cheia": 180.0, "minguante": 270.0}
QUARTER_NAMES = {"nova": "Lua Nova", "crescente": "Quarto Crescente",
                 "cheia": "Lua Cheia", "minguante": "Quarto Minguante"}


def _rad(deg: float) -> float:
    return math.radians(deg)


def julian_day(moment: datetime) -> float:
    if moment.tzinfo is None:
        raise ValueError("datetime precisa ter fuso horário (use UTC)")
    return moment.timestamp() / 86400.0 + UNIX_EPOCH_JD


def elongation(moment: datetime) -> float:
    """Ângulo Lua-Sol em graus [0, 360): 0 = Lua Nova, 180 = Lua Cheia."""
    t = (julian_day(moment) - 2451545.0) / 36525.0
    d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t
    m = 357.5291092 + 35999.0502909 * t
    mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t
    f = 93.2720950 + 483202.0175233 * t
    lp = 218.3164477 + 481267.88123421 * t

    moon = (
        lp
        + 6.288774 * math.sin(_rad(mp))
        + 1.274027 * math.sin(_rad(2 * d - mp))
        + 0.658314 * math.sin(_rad(2 * d))
        + 0.213618 * math.sin(_rad(2 * mp))
        - 0.185116 * math.sin(_rad(m))
        - 0.114332 * math.sin(_rad(2 * f))
        + 0.058793 * math.sin(_rad(2 * d - 2 * mp))
        + 0.057066 * math.sin(_rad(2 * d - m - mp))
        + 0.053322 * math.sin(_rad(2 * d + mp))
        + 0.045758 * math.sin(_rad(2 * d - m))
        - 0.040923 * math.sin(_rad(m - mp))
        - 0.034720 * math.sin(_rad(d))
        - 0.030383 * math.sin(_rad(m + mp))
    )
    sun = 280.46646 + 36000.76983 * t + 1.914602 * math.sin(_rad(m)) + 0.019993 * math.sin(_rad(2 * m))
    return (moon - sun) % 360.0


def classify(elong: float) -> str:
    """Quatro categorias da marca, cada uma com 90° centrados na fase principal."""
    e = elong % 360.0
    if e >= 315.0 or e < 45.0:
        return "nova"
    if e < 135.0:
        return "crescente"
    if e < 225.0:
        return "cheia"
    return "minguante"


def illumination(elong: float) -> float:
    """Fração iluminada do disco (0 a 1), ignorando a latitude da Lua."""
    return (1.0 - math.cos(_rad(elong))) / 2.0


def phase_for(moment: datetime) -> dict:
    e = elongation(moment)
    return {
        "elongation": e,
        "illumination": illumination(e),
        "age_days": e / 360.0 * SYNODIC_MONTH,
        "waxing": e < 180.0,
        "category": classify(e),
    }


def _signed_diff(a: float, b: float) -> float:
    """Menor diferença angular a - b em (-180, 180]."""
    return (a - b + 180.0) % 360.0 - 180.0


def next_principal_phases(moment: datetime, count: int = 4) -> list[dict]:
    """Próximos instantes (UTC) em que a elongação cruza 0°, 90°, 180° ou 270°."""
    results = []
    for key, target in PRINCIPAL_ANGLES.items():
        diff = (target - elongation(moment)) % 360.0
        cursor = moment + timedelta(days=diff / MEAN_ELONGATION_RATE)
        for _ in range(6):  # Newton com diferença assinada: corrige a variação da velocidade da Lua
            adjust = _signed_diff(target, elongation(cursor)) / MEAN_ELONGATION_RATE
            cursor = cursor + timedelta(days=adjust)
        if cursor < moment:
            cursor = cursor + timedelta(days=SYNODIC_MONTH)
        results.append({"phase": key, "name": QUARTER_NAMES[key], "at": cursor})
    results.sort(key=lambda item: item["at"])
    return results[:count]


def utc(year, month, day, hour=0, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)
