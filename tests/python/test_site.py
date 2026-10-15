"""Geração das páginas estáticas e integridade de links e recursos locais."""
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

import pytest

PAGINAS = [
    "index.html", "catalogo/index.html", "loja/index.html", "lua/index.html",
    "lacan-responde/index.html", "marcia-sensitiva/index.html", "historico/index.html",
    "sobre/index.html", "simpatias/maca-fuji-com-mel/index.html",
    "simpatias/rosa-branca-no-vento/index.html", "simpatias/correios-imaginarios/index.html",
]


class Coletor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []   # (tag, atributo, valor)
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        for attr in ("href", "src"):
            if attr in attrs and attrs[attr] is not None:
                self.links.append((tag, attr, attrs[attr]))


def analisar(path: Path):
    coletor = Coletor()
    coletor.feed(path.read_text(encoding="utf-8"))
    return coletor


def test_paginas_principais_existem(site):
    for pagina in PAGINAS:
        assert (site / pagina).is_file(), pagina


def test_uma_pagina_por_produto(site, data):
    for produto in data["products"]:
        arquivo = site / "loja" / produto["id"] / "index.html"
        assert arquivo.is_file(), produto["id"]
        assert produto["name"] in arquivo.read_text(encoding="utf-8")


def test_loja_lista_todos_os_produtos(site, data):
    html = (site / "loja" / "index.html").read_text(encoding="utf-8")
    for produto in data["products"]:
        assert f'data-product-id="{produto["id"]}"' in html


def test_catalogo_lista_todas_as_simpatias(site, data):
    html = (site / "catalogo" / "index.html").read_text(encoding="utf-8")
    for simpatia in data["spells"]:
        assert simpatia["title"] in html


def test_paginas_tem_estrutura_semantica_basica(site):
    for pagina in PAGINAS:
        html = (site / pagina).read_text(encoding="utf-8")
        assert '<html lang="pt-BR">' in html
        assert 'name="viewport"' in html
        assert html.count("<h1") == 1, pagina
        assert "<main" in html and "<nav" in html and "<footer" in html
        assert 'class="skip-link"' in html


def test_assinatura_da_marca_no_rodape(site):
    assert "Feito com fé, amor e imaginação criativa." in (site / "index.html").read_text(encoding="utf-8")


def test_links_e_recursos_locais_existem(site):
    arquivos_html = sorted(site.rglob("*.html"))
    assert len(arquivos_html) >= len(PAGINAS) + 23
    quebrados = []
    for arquivo in arquivos_html:
        coletor = analisar(arquivo)
        for tag, atributo, valor in coletor.links:
            partes = urlparse(valor)
            if partes.scheme in ("http", "https", "mailto", "data") or valor.startswith("//"):
                quebrados.append(f"{arquivo.relative_to(site)}: recurso externo {valor}")
                continue
            if not partes.path:  # âncora na própria página
                if partes.fragment and partes.fragment not in coletor.ids:
                    quebrados.append(f"{arquivo.relative_to(site)}: âncora #{partes.fragment}")
                continue
            destino = (arquivo.parent / unquote(partes.path)).resolve()
            if destino.is_dir():
                destino = destino / "index.html"
            if not destino.is_file():
                quebrados.append(f"{arquivo.relative_to(site)}: {valor}")
            elif partes.fragment and destino.suffix == ".html" and partes.fragment not in analisar(destino).ids:
                quebrados.append(f"{arquivo.relative_to(site)}: âncora {valor}")
    assert quebrados == []


def test_urls_relativas_funcionam_em_subdiretorio(site):
    """Nenhum caminho absoluto (/static/...) que quebraria em usuario.github.io/repo/."""
    for arquivo in site.rglob("*.html"):
        for _, _, valor in analisar(arquivo).links:
            assert not valor.startswith("/"), f"{arquivo.relative_to(site)}: {valor}"


def test_modulos_javascript_importados_existem(site):
    """Resolve imports relativos dentro dos módulos publicados."""
    importacao = re.compile(r"""from\s+['"](\.[^'"]+)['"]""")
    for js in (site / "static" / "js").rglob("*.js"):
        for caminho in importacao.findall(js.read_text(encoding="utf-8")):
            assert (js.parent / caminho).resolve().is_file(), f"{js.name} importa {caminho}"


def test_json_embutido_e_valido(site):
    import json
    padrao = re.compile(r'<script type="application/json" id="([^"]+)">(.*?)</script>', re.S)
    encontrados = 0
    for pagina in ("loja/index.html", "lua/index.html", "historico/index.html",
                   "lacan-responde/index.html", "simpatias/correios-imaginarios/index.html"):
        for _, corpo in padrao.findall((site / pagina).read_text(encoding="utf-8")):
            json.loads(corpo)
            encontrados += 1
    assert encontrados == 5


def test_json_embutido_nao_fecha_o_script(site):
    """Dados com '</script>' quebrariam a página; tojson escapa '<'."""
    for pagina in site.rglob("*.html"):
        html = pagina.read_text(encoding="utf-8")
        for bloco in re.findall(r'<script type="application/json"[^>]*>(.*?)</script>', html, re.S):
            assert "</" not in bloco


def test_sem_recursos_externos_nem_rastreadores(site):
    for pagina in site.rglob("*.html"):
        html = pagina.read_text(encoding="utf-8")
        assert not re.search(r'(src|href)="https?://', html), pagina


def test_cada_pagina_carrega_seus_scripts(site):
    esperado = {
        "loja/index.html": "shop/shop-ui.js",
        "lua/index.html": "lunar/calendar-ui.js",
        "historico/index.html": "history/history-ui.js",
        "lacan-responde/index.html": "guidance/guidance-ui.js",
        "marcia-sensitiva/index.html": "guidance/guidance-ui.js",
        "simpatias/maca-fuji-com-mel/index.html": "spells/spell-ui.js",
        "simpatias/rosa-branca-no-vento/index.html": "spells/spell-ui.js",
        "simpatias/correios-imaginarios/index.html": "spells/spell-ui.js",
    }
    for pagina, script in esperado.items():
        assert script in (site / pagina).read_text(encoding="utf-8"), pagina


@pytest.mark.parametrize("pagina,marcador", [
    ("simpatias/maca-fuji-com-mel/index.html", 'data-ritual="maca-fuji-com-mel"'),
    ("simpatias/rosa-branca-no-vento/index.html", 'data-ritual="rosa-branca-no-vento"'),
    ("simpatias/correios-imaginarios/index.html", 'data-ritual="correios-imaginarios"'),
])
def test_paginas_das_simpatias_interativas(site, pagina, marcador):
    html = (site / pagina).read_text(encoding="utf-8")
    assert marcador in html
    assert "data-form" in html and "data-stage" in html and "data-message" in html


def test_personagens_diferentes_em_paginas_diferentes(site):
    lacan = (site / "lacan-responde" / "index.html").read_text(encoding="utf-8")
    marcia = (site / "marcia-sensitiva" / "index.html").read_text(encoding="utf-8")
    assert "Lacan Responde" in lacan and "Márcia Sensitiva" not in lacan.split("<main")[1]
    assert "Márcia Sensitiva" in marcia
