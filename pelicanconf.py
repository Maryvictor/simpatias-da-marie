import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))

from validate_content import load_all  # noqa: E402

AUTHOR = "Marie"
SITENAME = "Simpatias da Marie"
SITESUBTITLE = "Feito com fé, amor e imaginação criativa."
SITEURL = ""
TIMEZONE = "America/Sao_Paulo"
DEFAULT_LANG = "pt-br"

PATH = "content"
PAGE_PATHS = ["pages"]
ARTICLE_PATHS = []
THEME = "theme"
THEME_STATIC_DIR = "static"
THEME_STATIC_PATHS = ["static"]

# Links relativos: o site funciona em qualquer subdiretório do GitHub Pages.
RELATIVE_URLS = True
PAGE_URL = "{slug}/"
PAGE_SAVE_AS = "{slug}/index.html"
DIRECT_TEMPLATES = []
AUTHOR_SAVE_AS = ""
CATEGORY_SAVE_AS = ""
TAG_SAVE_AS = ""
ARCHIVES_SAVE_AS = ""
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None
DISPLAY_PAGES_ON_MENU = False

PLUGIN_PATHS = [str(ROOT / "scripts")]
PLUGINS = ["product_pages"]

# Dados (data/) expostos aos templates como variáveis Jinja.
_data = load_all()
JINJA_GLOBALS = {
    "SPELLS": _data["spells"],
    "PRODUCTS": _data["products"],
    "CATEGORIES": _data["taxonomy"]["categories"],
    "INTENTIONS": _data["taxonomy"]["intentions"],
    "PHASES": _data["lunar"],
    "SCENARIOS": _data["scenarios"],
    "LACAN": _data["lacan"],
    "MARCIA": _data["marcia"],
}
JINJA_FILTERS = {
    "price": lambda cents: f"R$ {cents // 100},{cents % 100:02d}",
}

DEFAULT_PAGINATION = False
