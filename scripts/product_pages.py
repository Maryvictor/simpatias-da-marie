"""Plugin do Pelican: gera uma página por produto a partir de data/products.

O Pelican só gera páginas a partir de arquivos de conteúdo; como os produtos
vivem em JSON, este gerador escreve loja/<id>/index.html com o template product.html.
"""
from pelican import signals
from pelican.generators import Generator


class ProductPagesGenerator(Generator):
    def generate_output(self, writer):
        products = self.settings["JINJA_GLOBALS"]["PRODUCTS"]
        spells = self.settings["JINJA_GLOBALS"]["SPELLS"]
        by_id = {p["id"]: p for p in products}
        template = self.get_template("product")
        for product in products:
            related = [by_id[i] for i in product.get("contents", [])]
            writer.write_file(
                f"loja/{product['id']}/index.html",
                template,
                self.context,
                relative_urls=self.settings["RELATIVE_URLS"],
                product=product,
                kit_items=related,
                related_spells=[s for s in spells if product["id"] in s.get("products", [])],
                page_title=product["name"],
            )


def get_generators(pelican):
    return ProductPagesGenerator


def register():
    signals.get_generators.connect(get_generators)
