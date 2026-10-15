import json
import shutil
import subprocess
from datetime import timedelta

import pytest

import lunar

# Fases publicadas em almanaques astronômicos (UTC).
REFERENCIAS = [
    ((2000, 1, 6, 18, 14), 0.0),     # Lua Nova
    ((2024, 4, 8, 18, 21), 0.0),     # Lua Nova
    ((2024, 10, 2, 18, 49), 0.0),    # Lua Nova
    ((2024, 10, 10, 18, 55), 90.0),  # Quarto Crescente
    ((2024, 4, 23, 23, 49), 180.0),  # Lua Cheia
    ((2024, 10, 17, 11, 26), 180.0), # Lua Cheia
]


def erro_angular(a, b):
    return abs((a - b + 540) % 360 - 180)


@pytest.mark.parametrize("quando,esperado", REFERENCIAS)
def test_elongacao_nas_fases_publicadas(quando, esperado):
    assert erro_angular(lunar.elongation(lunar.utc(*quando)), esperado) < 0.5


@pytest.mark.parametrize("graus,categoria", [
    (0, "nova"), (44.99, "nova"), (45, "crescente"), (134.99, "crescente"),
    (135, "cheia"), (224.99, "cheia"), (225, "minguante"), (314.99, "minguante"),
    (315, "nova"), (359.99, "nova"), (-10, "nova"), (370, "nova"),
])
def test_classificacao_nos_limites(graus, categoria):
    assert lunar.classify(graus) == categoria


def test_iluminacao():
    assert lunar.illumination(0) == pytest.approx(0, abs=1e-12)
    assert lunar.illumination(180) == pytest.approx(1)
    assert lunar.illumination(90) == pytest.approx(0.5)


def test_phase_for_lua_cheia():
    info = lunar.phase_for(lunar.utc(2024, 4, 23, 23, 49))
    assert info["category"] == "cheia"
    assert info["illumination"] > 0.99
    assert info["age_days"] == pytest.approx(14.77, abs=0.2)
    assert info["waxing"] is False or info["elongation"] >= 179.5


def test_exige_fuso_horario():
    from datetime import datetime
    with pytest.raises(ValueError):
        lunar.elongation(datetime(2024, 1, 1))


def test_proximas_fases_principais_ordenadas_e_futuras():
    inicio = lunar.utc(2026, 10, 14, 12)
    fases = lunar.next_principal_phases(inicio, 4)
    assert [f["phase"] for f in fases] == ["crescente", "cheia", "minguante", "nova"]
    assert all(f["at"] > inicio for f in fases)
    assert fases == sorted(fases, key=lambda f: f["at"])
    cheia = next(f for f in fases if f["phase"] == "cheia")
    assert abs(cheia["at"] - lunar.utc(2026, 10, 26, 4, 12)) < timedelta(hours=2)


def test_ciclo_sinodico_aproximadamente_29_5_dias():
    inicio = lunar.utc(2025, 1, 1)
    novas = []
    cursor = inicio
    for _ in range(14):
        proxima = next(f for f in lunar.next_principal_phases(cursor, 4) if f["phase"] == "nova")
        novas.append(proxima["at"])
        cursor = proxima["at"] + timedelta(days=1)
    intervalos = [(b - a).total_seconds() / 86400 for a, b in zip(novas, novas[1:])]
    assert all(29.2 < i < 29.9 for i in intervalos), intervalos
    assert sum(intervalos) / len(intervalos) == pytest.approx(29.53, abs=0.1)


@pytest.mark.skipif(shutil.which("node") is None, reason="Node.js não encontrado")
def test_paridade_python_javascript(root):
    instantes = [lunar.utc(2000 + i * 3, 1 + (i * 5) % 12, 1 + (i * 7) % 28, (i * 5) % 24).isoformat() for i in range(25)]
    instantes += [lunar.utc(2026, 10, 14, 12).isoformat(), lunar.utc(2030, 6, 15, 3, 30).isoformat()]
    saida = subprocess.run(
        ["node", str(root / "tests" / "javascript" / "print_phases.mjs"), *[i.replace("+00:00", "Z") for i in instantes]],
        capture_output=True, text=True, check=True,
    ).stdout
    for item in json.loads(saida):
        python = lunar.elongation(lunar.utc(*map(int, [item["iso"][0:4], item["iso"][5:7], item["iso"][8:10], item["iso"][11:13], item["iso"][14:16]])))
        assert abs(python - item["elongation"]) < 1e-6, item["iso"]
        assert lunar.classify(python) == item["category"]
