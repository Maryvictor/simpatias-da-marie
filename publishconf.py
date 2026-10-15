"""Configuração de publicação (GitHub Pages).

Os URLs são relativos, então o site funciona em https://usuario.github.io/repositorio/
sem precisar conhecer o nome do repositório. Defina SITE_ORIGIN apenas se quiser
URLs absolutos em metadados (ex.: Open Graph).
"""
import os
import sys

sys.path.append(os.curdir)
from pelicanconf import *  # noqa: E402,F401,F403

SITEURL = ""
RELATIVE_URLS = True
DELETE_OUTPUT_DIRECTORY = True
