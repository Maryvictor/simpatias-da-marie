"""Valida os dados e gera o site estático.

Uso:
  python scripts/build_site.py              # gera em output/ (configuração de publicação)
  python scripts/build_site.py --dev        # configuração de desenvolvimento
  python scripts/build_site.py --serve      # gera e serve em http://localhost:8000
  python scripts/build_site.py --output DIR # outro diretório de saída
"""
from __future__ import annotations

import argparse
import functools
import http.server
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import validate_content  # noqa: E402


def build(output: Path, dev: bool = False) -> int:
    errors = validate_content.validate(validate_content.load_all())
    if errors:
        print("Dados inválidos; geração cancelada:")
        for error in errors:
            print(f"  - {error}")
        return 1
    settings = "pelicanconf.py" if dev else "publishconf.py"
    command = [sys.executable, "-m", "pelican", "content", "-s", settings,
               "-o", str(output), "--fatal", "errors"]
    result = subprocess.run(command, cwd=ROOT)
    return result.returncode


class Handler(http.server.SimpleHTTPRequestHandler):
    # No Windows o registro do sistema pode mapear .js para text/plain, o que
    # bloqueia módulos ES; o GitHub Pages já serve o tipo correto.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json",
    }


def serve(directory: Path, port: int = 8000) -> None:
    handler = functools.partial(Handler, directory=str(directory))
    with http.server.ThreadingHTTPServer(("", port), handler) as server:
        print(f"Servindo {directory} em http://localhost:{port} (Ctrl+C para sair)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dev", action="store_true")
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--output", default=str(ROOT / "output"))
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    output = Path(args.output)
    code = build(output, dev=args.dev or args.serve)
    if code == 0 and args.serve:
        serve(output, args.port)
    return code


if __name__ == "__main__":
    sys.exit(main())
