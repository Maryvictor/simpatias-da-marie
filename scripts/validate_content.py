"""Valida a estrutura dos dados (simpatias, produtos, lunar e personagens).

Uso: python scripts/validate_content.py
Sai com código 1 se houver erros.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

PHASES = ("nova", "crescente", "cheia", "minguante")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
SPELL_KINDS = {"interativa", "ritual"}
REQUIRED_SCENARIOS = {"reconquista", "comprometido", "desapego", "amor-proprio", "recomeco"}
MIN_MESSAGES = 3
# Promessas e diagnósticos que os personagens não podem fazer.
FORBIDDEN_TERMS = ("garanto", "garantido", "vai voltar", "com certeza", "diagnóstico",
                   "depressão", "transtorno", "ansiedade patológica", "obsessão doentia")


def load(relative: str):
    with open(DATA / relative, encoding="utf-8") as handle:
        return json.load(handle)


def load_all() -> dict:
    return {
        "spells": load("spells/spells.json"),
        "products": load("products/products.json"),
        "taxonomy": load("products/taxonomy.json"),
        "lunar": load("lunar/phases.json"),
        "scenarios": load("guidance/scenarios.json"),
        "lacan": load("guidance/lacan.json"),
        "marcia": load("guidance/marcia.json"),
    }


def _unique(items, label, errors):
    seen = set()
    for item in items:
        identifier = item.get("id")
        if not isinstance(identifier, str) or not SLUG.match(identifier):
            errors.append(f"{label}: id inválido {identifier!r}")
        elif identifier in seen:
            errors.append(f"{label}: id duplicado {identifier!r}")
        seen.add(identifier)
    return seen


def _text(value, minimum=1):
    return isinstance(value, str) and len(value.strip()) >= minimum


def validate_lunar(lunar, errors):
    ids = [p.get("id") for p in lunar]
    if sorted(ids) != sorted(PHASES):
        errors.append(f"lunar: devem existir exatamente as fases {PHASES}, encontrado {ids}")
    for phase in lunar:
        for key in ("name", "theme", "meaning", "tip"):
            if not _text(phase.get(key)):
                errors.append(f"lunar/{phase.get('id')}: campo '{key}' vazio")


def validate_products(products, taxonomy, errors):
    categories = {c["id"] for c in taxonomy["categories"]}
    intentions = {i["id"] for i in taxonomy["intentions"]}
    ids = _unique(products, "produto", errors)
    by_id = {p["id"]: p for p in products if "id" in p}
    for product in products:
        label = f"produto/{product.get('id')}"
        for key in ("name", "description"):
            if not _text(product.get(key)):
                errors.append(f"{label}: campo '{key}' vazio")
        if product.get("category") not in categories:
            errors.append(f"{label}: categoria inválida {product.get('category')!r}")
        price = product.get("price_cents")
        if not isinstance(price, int) or isinstance(price, bool) or price <= 0:
            errors.append(f"{label}: price_cents deve ser inteiro positivo")
        for key, allowed in (("intentions", intentions), ("phases", set(PHASES))):
            values = product.get(key)
            if not isinstance(values, list) or not values:
                errors.append(f"{label}: '{key}' deve ser lista não vazia")
            else:
                for value in values:
                    if value not in allowed:
                        errors.append(f"{label}: {key} contém valor desconhecido {value!r}")
        contents = product.get("contents")
        if product.get("category") == "kits":
            if not isinstance(contents, list) or len(contents) < 2:
                errors.append(f"{label}: kit precisa de 'contents' com pelo menos 2 itens")
            else:
                for item in contents:
                    if item not in ids:
                        errors.append(f"{label}: item de kit inexistente {item!r}")
                    elif by_id[item].get("category") == "kits":
                        errors.append(f"{label}: kit não pode conter outro kit ({item})")
        elif contents is not None:
            errors.append(f"{label}: apenas kits têm 'contents'")
    for needed in ("amor-proprio", "prosperidade", "recomeco", "deixar-ir", "novo-ciclo"):
        if f"kit-{needed}" not in ids:
            errors.append(f"produto: kit obrigatório ausente: kit-{needed}")
    used = {p.get("category") for p in products}
    for category in categories - used:
        errors.append(f"produto: categoria sem produtos: {category}")


def validate_spells(spells, products, taxonomy, errors):
    ids = _unique(spells, "simpatia", errors)
    product_ids = {p["id"] for p in products if "id" in p}
    intentions = {i["id"] for i in taxonomy["intentions"]}
    for spell in spells:
        label = f"simpatia/{spell.get('id')}"
        if spell.get("kind") not in SPELL_KINDS:
            errors.append(f"{label}: kind inválido")
        for key in ("title", "summary"):
            if not _text(spell.get(key)):
                errors.append(f"{label}: campo '{key}' vazio")
        steps = spell.get("steps")
        if not isinstance(steps, list) or len(steps) < 3 or not all(_text(s) for s in steps):
            errors.append(f"{label}: 'steps' precisa de pelo menos 3 textos")
        for phase in spell.get("phases", []):
            if phase not in PHASES:
                errors.append(f"{label}: fase inválida {phase!r}")
        if not spell.get("phases"):
            errors.append(f"{label}: sem fases")
        for intention in spell.get("intentions", []):
            if intention not in intentions:
                errors.append(f"{label}: intenção inválida {intention!r}")
        for product in spell.get("products", []):
            if product not in product_ids:
                errors.append(f"{label}: produto inexistente {product!r}")
        if spell.get("kind") == "interativa":
            messages = spell.get("messages")
            if not isinstance(messages, list) or len(messages) < MIN_MESSAGES:
                errors.append(f"{label}: 'messages' precisa de pelo menos {MIN_MESSAGES} textos")
            if not _text(spell.get("page")):
                errors.append(f"{label}: 'page' ausente")
    interactive = {s["id"] for s in spells if s.get("kind") == "interativa"}
    expected = {"maca-fuji-com-mel", "rosa-branca-no-vento", "correios-imaginarios"}
    if interactive != expected:
        errors.append(f"simpatias interativas devem ser {sorted(expected)}, encontrado {sorted(interactive)}")
    return ids


def validate_phase_coverage(spells, products, errors):
    for phase in PHASES:
        if not any(phase in s.get("phases", []) for s in spells):
            errors.append(f"lunar/{phase}: nenhuma simpatia associada")
        if not any(phase in p.get("phases", []) for p in products):
            errors.append(f"lunar/{phase}: nenhum produto associado")


def validate_guidance(character, scenarios, spell_ids, errors):
    label = f"personagem/{character.get('id')}"
    for key in ("name", "tagline", "greeting", "again"):
        if not _text(character.get(key)):
            errors.append(f"{label}: campo '{key}' vazio")
    messages = character.get("messages", {})
    for scenario in list(REQUIRED_SCENARIOS) + ["geral"]:
        group = messages.get(scenario)
        if not isinstance(group, list) or len(group) < MIN_MESSAGES:
            errors.append(f"{label}: cenário '{scenario}' precisa de {MIN_MESSAGES}+ mensagens")
            continue
        for text in group:
            if not _text(text):
                errors.append(f"{label}/{scenario}: mensagem vazia")
            lowered = str(text).lower()
            for term in FORBIDDEN_TERMS:
                if term in lowered:
                    errors.append(f"{label}/{scenario}: termo proibido {term!r}")
            if "<" in str(text) or "&" in str(text):
                errors.append(f"{label}/{scenario}: mensagens devem ser texto puro (sem HTML)")


def validate_scenarios(data, spell_ids, errors):
    ids = _unique(data["scenarios"], "cenário", errors)
    if ids != REQUIRED_SCENARIOS:
        errors.append(f"cenários devem ser {sorted(REQUIRED_SCENARIOS)}")
    for scenario in data["scenarios"]:
        label = f"cenário/{scenario.get('id')}"
        if not _text(scenario.get("label")):
            errors.append(f"{label}: label vazio")
        if not scenario.get("keywords"):
            errors.append(f"{label}: sem palavras-chave")
        suggestion = scenario.get("suggestion", {})
        if suggestion.get("spell") not in spell_ids:
            errors.append(f"{label}: simpatia sugerida inexistente {suggestion.get('spell')!r}")
        if not _text(suggestion.get("text")):
            errors.append(f"{label}: texto de sugestão vazio")
    if not data.get("crisis_keywords") or "188" not in data.get("crisis_message", ""):
        errors.append("cenários: mensagem de segurança (CVV 188) e palavras-chave são obrigatórias")


def validate(data: dict) -> list[str]:
    errors: list[str] = []
    validate_lunar(data["lunar"], errors)
    validate_products(data["products"], data["taxonomy"], errors)
    spell_ids = validate_spells(data["spells"], data["products"], data["taxonomy"], errors)
    validate_phase_coverage(data["spells"], data["products"], errors)
    validate_scenarios(data["scenarios"], spell_ids, errors)
    for key in ("lacan", "marcia"):
        validate_guidance(data[key], data["scenarios"], spell_ids, errors)
    return errors


def main() -> int:
    errors = validate(load_all())
    if errors:
        print(f"{len(errors)} erro(s) de validação:")
        for error in errors:
            print(f"  - {error}")
        return 1
    print("Dados válidos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
