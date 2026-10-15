import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import build_site  # noqa: E402
import validate_content  # noqa: E402


@pytest.fixture(scope="session")
def root():
    return ROOT


@pytest.fixture()
def data():
    """Cópia nova dos dados reais a cada teste (pode ser alterada à vontade)."""
    return validate_content.load_all()


@pytest.fixture(scope="session")
def site(tmp_path_factory):
    """Gera o site uma única vez com a configuração de publicação."""
    output = tmp_path_factory.mktemp("site")
    assert build_site.build(output) == 0
    return output
