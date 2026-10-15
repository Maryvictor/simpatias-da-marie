# Simpatias da Marie

*Feito com fé, amor e imaginação criativa.*

Site estático de simpatias virtuais, calendário lunar, loja demonstrativa e dois personagens interativos. O Python só roda **na geração**; o site publicado é HTML, CSS e JavaScript puros, hospedado no GitHub Pages.

## Arquitetura

```
data/*.json ──► scripts/validate_content.py ──► Pelican + Jinja2 (theme/templates) ──► output/ (HTML estático)
                                                         │
                       theme/static/js (módulos ES, sem bibliotecas) roda no navegador
```

- **Dados** (`data/`): simpatias, produtos, fases lunares e mensagens dos personagens, separados de templates e scripts.
- **Validação** (`scripts/validate_content.py`): confere ids, categorias, kits, referências cruzadas, cobertura das quatro fases e regras de conteúdo (mensagens sem promessas nem diagnósticos). A geração é cancelada se algo estiver inválido.
- **Geração** (Pelican): páginas em `content/pages/` (Markdown só com metadados + templates). As páginas de produto (`loja/<id>/`) saem de `data/products` pelo plugin `scripts/product_pages.py`.
- **Navegador**: cada área tem seu módulo. A lógica fica em arquivos sem DOM e testáveis (`store.js`, `ritual.js`, `filters.js`, `engine.js`, `lunar.js`); `*-ui.js` só liga a lógica à página. Os dados chegam por `<script type="application/json">` gerado pelo Jinja, então não há `fetch` nem API.
- **URLs relativas** (`RELATIVE_URLS = True`): o site funciona em `usuario.github.io/repositorio/` sem configurar o nome do repositório.

### Decisão de versões

| Item | Escolha | Motivo |
|---|---|---|
| Pelican | 4.11.0 | Versão estável 4.11.0, com instalação e geração verificadas; requer Python 3.9+. |
| Python | CI: 3.12; local: 3.14.0 | Pelican 4.11 e suas dependências instalam sem problemas nas duas. O desenvolvimento local usou 3.14 porque a 3.9 da máquina não conseguiu criar o ambiente (falha no ensurepip). |
| Markdown | 3.11.1 | Leitura das páginas. |
| pytest | 9.1.1 | Testes Python. |
| Node (só testes) | CI: 20; local: 14.17.3 | Os testes JS usam apenas ES modules e `assert`, funcionam nas duas. |

Todas as versões estão fixas em `requirements.txt`.

### Testes JavaScript: por que um executor próprio

Os módulos testados não dependem do DOM (o `localStorage` é injetado), então bastam `assert` e um executor de 30 linhas (`tests/javascript/harness.mjs`). Isso evita `node_modules`, funciona em Node 14 (Jest/Vitest/`node:test` exigem versões mais novas) e mantém o CI simples. Se as interações ganharem muita lógica de DOM, o passo natural é adotar Vitest com jsdom.

### Calendário lunar: alternativas comparadas

| Alternativa | Problema |
|---|---|
| Calcular no Python durante o build | Fica desatualizado no dia seguinte; exigiria rebuild diário. |
| API externa | Dependência obrigatória e envio de dados a terceiros. |
| **Algoritmo no navegador (escolhida)** | Sem servidor, sem rede, sempre atual. |

O algoritmo (série truncada de Meeus, *Astronomical Algorithms*, cap. 47) existe duas vezes: `scripts/lunar.py` e `theme/static/js/lunar/lunar.js`. Um teste executa os dois sobre 27 datas e exige a mesma elongação (diferença < 1e-6°).

- **Precisão**: nas fases principais publicadas (Lua Nova 2000-01-06 18:14 UTC, 2024-04-08 18:21, Quarto Crescente 2024-10-10 18:55, Lua Cheia 2024-04-23 23:49 e 2024-10-17 11:26), a elongação calculada fica a menos de 0,05° do esperado; o teste exige menos de 0,5° (cerca de uma hora). A iluminação ignora a latitude da Lua.
- **Astronômico × simbólico**: a fase (ângulo Lua-Sol) é calculada. O significado de cada fase ("intenção e recomeço" etc.) é **simbólico**, criado pela marca, sem base científica. As quatro categorias são quartos de 90° centrados nas fases principais.
- A imagem da Lua segue o hemisfério sul (crescente iluminada à esquerda).

## Estrutura de diretórios

```
simpatias-da-marie/
├── content/pages/            # páginas (metadados Pelican); simpatias/ tem as 3 interativas
├── data/
│   ├── spells/spells.json    # 3 interativas + 5 rituais
│   ├── products/             # products.json (23 itens) e taxonomy.json
│   ├── guidance/             # scenarios.json, lacan.json, marcia.json
│   └── lunar/phases.json     # significado simbólico das 4 fases
├── theme/
│   ├── templates/            # base, index, catalog, spell, shop, product, lunar, guidance, history, about
│   │   └── partials/         # arte SVG de cada simpatia (apple, rose, letter)
│   └── static/
│       ├── css/              # base, components, spells, shop, lunar, guidance
│       ├── js/{spells,shop,lunar,guidance,history,shared}/
│       └── images/           # logo, favicon, ícones por categoria (SVG próprios)
├── scripts/                  # validate_content.py, build_site.py, lunar.py, product_pages.py
├── tests/{python,javascript}/
├── pelicanconf.py  publishconf.py  requirements.txt  package.json  pytest.ini
└── .github/workflows/deploy.yml
```

`articles/` não foi criado: o site não tem blog.

## Funcionalidades

- **Início, catálogo (3 interativas + 5 rituais), sobre.**
- **Maçãs Fuji com Mel**: nome ou intenção → duas maçãs → mel escorrendo (SVG animado por CSS) → mensagem.
- **Rosa Branca no Vento**: intenção → rosa → 16 pétalas atravessam a tela → mensagem.
- **Correios Imaginários**: carta → papel pautado → envelope (a carta entra e a aba fecha) → selo → voo → mensagem. A carta vive só na memória e é apagada ao concluir; nada dela vai ao histórico.
- **Histórico** (`localStorage`): guarda só `{id, spellId, at}`; máximo de 10, mais recente primeiro; exclusão individual e limpeza total; dados inválidos são descartados; com o armazenamento bloqueado, funciona em memória e a página avisa.
- **Loja demonstrativa**: 23 produtos em 8 categorias, 5 kits (Amor Próprio, Prosperidade, Recomeço, Deixar Ir, Novo Ciclo), páginas de produto, filtros por categoria, intenção e fase (sincronizados com a URL: `?categoria=kits&fase=nova`). Sem pagamento, estoque ou pedidos.
- **Calendário lunar**: fase de hoje, próximas fases principais, grade mensal navegável, quatro fases ligadas a simpatias e produtos.
- **Lacan Responde** (reflexivo, afetuoso) e **Márcia Sensitiva** (divertida, direta): cenários de reconquista, pessoa comprometida, desapego, amor-próprio e recomeço, com 4 mensagens cada, mais mensagens gerais. A seleção é determinística (hash do texto normalizado + tentativa). Cada cenário sugere uma simpatia simbólica (carta não enviada, ritual de encerramento). Sinais de sofrimento grave retornam uma mensagem de acolhimento com o CVV (188) em vez de qualquer ritual.
- **Acessibilidade e desempenho**: HTML semântico, link "ir para o conteúdo", foco visível, alvos de toque ≥ 44 px, regiões `aria-live`, `prefers-reduced-motion` (sem voos e quedas; esperas encurtadas), sem fontes ou bibliotecas externas (o site inteiro tem cerca de 400 KB).

## Privacidade e segurança

- Nada é enviado a servidores: sem `fetch`, sem analytics, sem recursos externos (um teste confere que nenhuma página referencia `http(s)://`).
- Entradas dos usuários só entram na página por `textContent`; os dados embutidos usam `tojson` (escapa `<`).
- Nenhuma credencial ou token no repositório; o workflow usa apenas o `GITHUB_TOKEN` temporário do Pages.
- Imagens: SVG desenhados para o projeto.

## Comandos

Criar o ambiente (Python 3.10+):

```bash
python -m venv .venv
.venv\Scripts\activate        # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

Desenvolvimento, validação, testes e geração:

```bash
python scripts/build_site.py --serve        # gera e serve em http://localhost:8000
python scripts/validate_content.py          # só valida os dados
python -m pytest                            # testes Python
npm test                                    # testes JavaScript (sem instalar nada)
python scripts/build_site.py                # gera o site final em output/
```

Abra o site por `http://` (o `--serve` já resolve): módulos ES não carregam via `file://`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie este projeto para a branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.
3. A cada push em `main`, `.github/workflows/deploy.yml` instala as dependências, valida os dados, roda os testes Python e JavaScript, gera o site e publica `output/`. Se algum passo falhar, nada é publicado.
4. O site fica em `https://<usuario>.github.io/<repositorio>/`.

## Testes: resultados reais

Executados em 2026-10-14 (Windows 10, Python 3.14.0, Pelican 4.11.0, pytest 9.1.1, Node 14.17.3):

| Comando | Resultado |
|---|---|
| `python scripts/validate_content.py` | Dados válidos |
| `python -m pytest` | **59 passed** (validação de dados, lunar, geração, links, paridade Python/JS) |
| `npm test` | **43/43** (histórico, simpatias, filtros, personagens, lunar) |
| `python scripts/build_site.py` | 11 páginas + 23 páginas de produto, 64 arquivos, ~395 KB |

Também foram verificados no navegador embutido do app (Chromium): os três rituais de ponta a ponta (estados, mensagem, registro no histórico, ausência da carta na página e no `localStorage`), os filtros da loja com URL, o calendário lunar do dia, as respostas e o modo de segurança dos personagens e o histórico (excluir e limpar), inclusive em viewport de 375 px. Para conferir que os testes detectam falhas, quebrei de propósito o limite de 10 registros, um link do site e um preço: os testes e a validação falharam como esperado (e um teste fraco do limite foi corrigido).

## Limitações conhecidas

- O CI (Python 3.12, Node 20) **ainda não foi executado**: o repositório não foi enviado ao GitHub. Localmente rodei Python 3.14 e Node 14.
- Não testei em celulares reais, Safari/Firefox nem com leitor de tela; só em Chromium com viewport emulado. As animações não têm teste automatizado (só os estados).
- Não há tema escuro.
- Fases lunares: erro típico de cerca de uma hora no instante das fases principais; as categorias de 90° são uma convenção da marca.
- A grade mensal avalia cada dia ao meio-dia do fuso do navegador.
- O histórico é por navegador e perde-se ao limpar os dados do site; em modo privado de alguns navegadores só dura enquanto a página estiver aberta.
- Preços e produtos são fictícios; não há compra.
- Os textos dos personagens são mensagens escritas à mão e regras simples: a classificação de texto livre é por palavras-chave e não entende contexto. Revisão por psicólogo(a) das mensagens seria recomendável antes de uso público.
