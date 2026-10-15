import copy

import validate_content as vc


def test_dados_reais_sao_validos(data):
    assert vc.validate(data) == []


def test_main_retorna_zero_para_dados_validos():
    assert vc.main() == 0


def _errors_after(data, mutate):
    mutate(data)
    return vc.validate(data)


def test_produto_com_categoria_invalida(data):
    errors = _errors_after(data, lambda d: d["products"][0].update(category="inexistente"))
    assert any("categoria inválida" in e for e in errors)


def test_produto_com_id_duplicado(data):
    errors = _errors_after(data, lambda d: d["products"][1].update(id=d["products"][0]["id"]))
    assert any("duplicado" in e for e in errors)


def test_preco_precisa_ser_inteiro_positivo(data):
    for bad in (0, -5, 10.5, "10", True):
        mutated = copy.deepcopy(data)
        mutated["products"][0]["price_cents"] = bad
        assert any("price_cents" in e for e in vc.validate(mutated)), bad


def test_intencao_e_fase_desconhecidas(data):
    data["products"][0]["intentions"] = ["inventada"]
    data["products"][1]["phases"] = ["eclipse"]
    errors = vc.validate(data)
    assert any("intentions" in e for e in errors)
    assert any("phases" in e for e in errors)


def test_kit_com_item_inexistente_ou_outro_kit(data):
    kit = next(p for p in data["products"] if p["id"] == "kit-recomeco")
    kit["contents"] = ["nao-existe", "kit-novo-ciclo"]
    errors = vc.validate(data)
    assert any("inexistente" in e for e in errors)
    assert any("outro kit" in e for e in errors)


def test_kit_obrigatorio_ausente(data):
    data["products"] = [p for p in data["products"] if p["id"] != "kit-deixar-ir"]
    assert any("kit-deixar-ir" in e for e in vc.validate(data))


def test_todas_as_categorias_pedidas_tem_produtos(data):
    names = {c["name"] for c in data["taxonomy"]["categories"]}
    assert names == {
        "Velas naturais", "Ervas e plantas", "Flores e pétalas", "Sais e banhos",
        "Papéis e envelopes", "Mel e especiarias", "Pedras e cristais", "Kits de intenções",
    }
    data["products"] = [p for p in data["products"] if p["category"] != "cristais"]
    assert any("categoria sem produtos" in e for e in vc.validate(data))


def test_simpatia_interativa_precisa_de_mensagens(data):
    spell = next(s for s in data["spells"] if s["id"] == "rosa-branca-no-vento")
    spell["messages"] = ["só uma"]
    assert any("messages" in e for e in vc.validate(data))


def test_simpatia_referencia_produto_inexistente(data):
    data["spells"][0]["products"].append("fantasma")
    assert any("produto inexistente" in e for e in vc.validate(data))


def test_fase_lunar_sem_simpatia_ou_produto(data):
    for spell in data["spells"]:
        spell["phases"] = [p for p in spell["phases"] if p != "minguante"] or ["nova"]
    assert any("lunar/minguante: nenhuma simpatia" in e for e in vc.validate(data))


def test_lunar_exige_exatamente_quatro_fases(data):
    data["lunar"] = data["lunar"][:3]
    assert any("exatamente as fases" in e for e in vc.validate(data))


def test_personagem_precisa_de_mensagens_em_todos_os_cenarios(data):
    del data["lacan"]["messages"]["recomeco"]
    assert any("recomeco" in e for e in vc.validate(data))


def test_mensagens_nao_podem_prometer_nem_diagnosticar(data):
    data["marcia"]["messages"]["reconquista"][0] = "Eu garanto que ele vai voltar."
    errors = vc.validate(data)
    assert any("termo proibido" in e for e in errors)


def test_mensagens_sao_texto_puro(data):
    data["lacan"]["messages"]["geral"][0] = "<b>negrito</b>"
    assert any("texto puro" in e for e in vc.validate(data))


def test_cenario_com_sugestao_inexistente(data):
    data["scenarios"]["scenarios"][0]["suggestion"]["spell"] = "nao-existe"
    assert any("simpatia sugerida inexistente" in e for e in vc.validate(data))


def test_mensagem_de_seguranca_obrigatoria(data):
    data["scenarios"]["crisis_message"] = "sem telefone"
    assert any("CVV 188" in e for e in vc.validate(data))
