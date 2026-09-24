# TradeZen — Instruções do Projeto

> Este arquivo é lido automaticamente pelo Claude Code no início de cada sessão.
> NÃO editar sem necessidade. Toda alteração afeta o comportamento da IA no projeto inteiro.

## Identidade

- **Nome:** TradeZen (nunca traduzir, nunca abreviar)
- **O que é:** Plataforma educacional brasileira de análise técnica com detecção de padrões gráficos via Machine Learning
- **Público:** Traders iniciantes brasileiros
- **Idioma:** Interface e textos em português brasileiro

## Stack obrigatória

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React + Vite | Latest |
| Backend | Python + FastAPI | 3.11.x |
| Banco | Supabase (PostgreSQL) | - |
| Gráficos | TradingView Lightweight Charts | v5 |
| Dados mercado | Yahoo Finance (B3/Forex) + Binance API (cripto) | - |
| ML | DTW (dtaidistance) + Random Forest (scikit-learn) | - |
| Auth | Supabase Auth (magic link por email) | - |
| Deploy frontend | Vercel | - |
| Deploy backend | Render | - |
| Testes | Vitest + Testing Library | - |

**NÃO introduzir** bibliotecas, frameworks ou dependências novas sem justificativa explícita. Se precisar de algo novo, PERGUNTE antes de instalar.

## Estrutura do projeto

```
tradezen/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Uma página por rota (Landing, Login, Cadastro, Dashboard, Grafico, Admin)
│   │   ├── components/     # Componentes reutilizáveis (Header, NavBar, AssetList, etc.)
│   │   ├── assets/         # Imagens e arquivos estáticos
│   │   ├── test/           # Testes automatizados (setup.js + *.test.jsx)
│   │   └── App.jsx         # Apenas rotas com lazy loading — NÃO colocar lógica aqui
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── main.py             # FastAPI app principal
│   ├── ml/                 # Pipeline de Machine Learning (DTW, Random Forest, features)
│   ├── detectors/          # Detectores por padrão (oco.py, topo_duplo.py, classicos.py)
│   ├── requirements.txt
│   └── .env                # Variáveis de ambiente (NÃO commitar)
├── CLAUDE.md               # Este arquivo
└── .gitignore
```

## Comandos

```bash
# Frontend
cd frontend && npm install && npm run dev          # Dev server (porta 5173)
cd frontend && npm run build                       # Build de produção
cd frontend && npm run test:run                    # Rodar testes

# Backend
cd backend && source venv/bin/activate             # Mac/Linux
cd backend && venv\Scripts\activate                # Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000    # Dev server (porta 8000)

# Git
git add . && git commit -m "mensagem" && git push origin principal
```

**Branch:** `principal` (NÃO `main`)

## Regras de desenvolvimento

### Antes de qualquer mudança
1. Rodar `npm run test:run` no frontend ANTES de começar
2. Se algum teste falhar, corrigir ANTES de implementar a feature nova

### Durante o desenvolvimento
3. Cada componente novo deve ter um arquivo `.test.jsx` correspondente
4. NÃO colocar lógica de negócio no App.jsx — usar páginas e componentes separados
5. Usar lazy loading para todas as rotas: `const Page = lazy(() => import('./pages/Page'))`
6. Mockar chamadas de API nos testes (fetch, supabase) — testes nunca dependem do backend
7. CSS: usar as variáveis de cor definidas abaixo, NÃO inventar cores novas
8. Mobile first: toda feature deve funcionar em tela de 375px antes de ajustar desktop

### Depois de qualquer mudança
9. Rodar `npm run test:run` — TODOS os testes devem passar
10. Se algum teste quebrou, corrigir ANTES de commitar
11. Commit com mensagem descritiva: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`

### Nunca fazer
- NÃO editar `.env` ou variáveis de ambiente sem pedir
- NÃO deletar arquivos sem confirmar
- NÃO mudar a estrutura de pastas sem justificativa
- NÃO instalar dependências novas sem perguntar
- NÃO usar `any` em TypeScript nem ignorar erros de tipo
- NÃO escrever CSS inline longo — extrair para arquivo CSS/módulo

## Design system

### Cores (usar SEMPRE estas, nunca inventar)
```css
--azul-primario: #2962ff;
--azul-claro: #4d8bff;
--verde: #26a69a;
--vermelho: #ef5350;
--fundo-escuro: #0f1118;
--fundo-card: #131722;
--texto-primario: #d1d4dc;
--texto-secundario: #787b86;
--borda: #1e222d;
```

### Tipografia
- Fonte: Inter (Google Fonts), fallback system sans-serif
- Headlines: 400-600 weight
- Body: 400 weight
- Monospace para dados numéricos: font-variant-numeric: tabular-nums

### Responsividade
- Mobile: < 768px (prioridade máxima — a maioria dos usuários será mobile)
- Desktop: >= 768px
- Nav bar inferior: SEMPRE `position: fixed; bottom: 0; z-index: 9999` no mobile
- Header: SEMPRE fixo no topo, nunca esconder no scroll

### Componentes padrão
- Botão primário: fundo azul #2962ff, border-radius: 28px, padding: 14px 32px
- Botão secundário: fundo transparente, borda branca, mesmo border-radius
- Cards: fundo #131722, borda 0.5px rgba(255,255,255,0.08), border-radius: 12px

## Machine Learning

### Arquitetura
- DTW (Dynamic Time Warping) para similaridade de forma entre séries temporais
- Random Forest para classificação supervisionada com features extraídas
- Meta de acurácia: 85-90%
- Validação: 5-fold cross-validation

### Features obrigatórias do modelo
F1: dtw_distance_mean, F2: dtw_distance_min, F3: shoulder_ratio, F4: head_shoulder_ratio,
F5: neckline_slope, F6: volume_ratio, F7: pivot_distance, F8: trend_strength, F9: volatility_ratio

### Métricas de avaliação
- Accuracy >= 85%
- Precision >= 80%
- Recall >= 75%
- F1-Score >= 78%

### Tabelas Supabase (ML)
- `templates_oco` — templates OCO marcados manualmente
- `rotulagens_oco` — candidatos OCO rotulados (confirmado/falhou)
- `templates_topo_duplo` — templates Topo Duplo
- `rotulagens_topo_duplo` — candidatos Topo Duplo rotulados
- `templates_niveis` — suporte e resistência
- `analises_diarias` — resultados da detecção diária

## Variáveis de ambiente

### Backend (Render)
- `SUPABASE_URL` — URL do projeto Supabase
- `SUPABASE_KEY` — Chave secret do Supabase
- `ADMIN_EMAILS` — Emails com acesso admin
- `PYTHON_VERSION=3.11.9`

### Frontend (Vercel — tipo Config, NÃO Secret)
- `VITE_API_URL` — URL do backend no Render
- `VITE_SUPABASE_URL` — URL do Supabase
- `VITE_SUPABASE_ANON_KEY` — Chave anon do Supabase

## Performance

- Bundle frontend: manter abaixo de 300KB no chunk principal (usar lazy loading)
- Backend: cache com `cachetools` TTL 5min para dados de mercado
- Imagens: WebP quando possível, max 200KB por imagem
- Gráfico: não renderizar mais de 500 candles por vez no mobile

## Acessibilidade e SEO

- `<meta name="google" content="notranslate">` — impedir tradução automática
- Classe `.notranslate` no nome TradeZen
- Tag `<title>` em português: "TradeZen — Análise Técnica com Inteligência Artificial"
- Favicon e meta tags Open Graph configurados

## Mapa de arquivos — LEIA ANTES DE EXPLORAR O CÓDIGO

> **REGRA CRÍTICA:** NÃO leia o projeto inteiro. Use este mapa para ir direto ao arquivo certo.
> Isso economiza tokens e tempo. Só explore além se o mapa não cobrir o pedido.

### Frontend — Páginas (frontend/src/pages/)
| Pedido sobre... | Arquivo |
|---|---|
| Landing page / página inicial | `pages/Landing.jsx` |
| Tela de login | `pages/Login.jsx` |
| Tela de cadastro | `pages/Cadastro.jsx` |
| Dashboard / lista de ativos | `pages/Dashboard.jsx` |
| Gráfico de candles | `pages/Grafico.jsx` |
| Painel admin | `pages/Admin.jsx` |
| Favoritos | `pages/Favoritos.jsx` |
| Criptomoedas | `pages/Criptomoedas.jsx` |
| Mercados | `pages/MercadosOverview.jsx` |
| Principais ativos | `pages/PrincipaisAtivos.jsx` |
| Página 404 | `pages/NaoEncontrada.jsx` |

### Frontend — Componentes (frontend/src/components/)
| Pedido sobre... | Arquivo |
|---|---|
| Header / navbar topo | `components/Header.jsx` |
| Nav bar inferior mobile | `components/NavBarMobile.jsx` |
| Lista de ativos | `components/AssetList.jsx` |
| Card de ativo | `components/AssetCard.jsx` |
| Gráfico de candles (componente) | `components/CandleChart.jsx` |
| Sidebar desktop | `components/Sidebar.jsx` |
| Barra de busca | `components/SearchBar.jsx` |
| Mini gráfico de linha | `components/MiniLine.jsx` |
| Ícone de ativo | `components/IconeAtivo.jsx` |
| Skeleton loading | `components/Skeleton.jsx` |
| Toggle de tema | `components/ThemeToggle.jsx` |

### Frontend — Libs (frontend/src/lib/)
| Pedido sobre... | Arquivo |
|---|---|
| Chamadas API ao backend | `lib/api.js` |
| Config do gráfico TradingView | `lib/grafico/config.js` |
| Desenhos no gráfico (linhas, markers) | `lib/grafico/desenhos.js` |
| Indicadores técnicos (médias, volume) | `lib/grafico/indicadores.js` |
| Detecção de padrões no frontend | `lib/grafico/padroes.js` |
| Dados de mercado (tickers, categorias) | `lib/mercado.js` |
| Cliente Supabase | `lib/supabaseClient.js` |

### Frontend — Auth (frontend/src/auth/)
| Pedido sobre... | Arquivo |
|---|---|
| Contexto de autenticação | `auth/AuthContext.jsx` |
| Callback OAuth | `auth/AuthCallback.jsx` |
| Tela de cadastro (auth) | `auth/Cadastro.jsx` |
| Tela de login (auth) | `auth/Login.jsx` |
| Recuperar senha | `auth/RecuperarSenha.jsx` |
| Redefinir senha | `auth/RedefinirSenha.jsx` |
| Proteção de rota | `auth/RequireAuth.jsx` |

### Frontend — Admin / Templates ML (frontend/src/admin/)
| Pedido sobre... | Arquivo |
|---|---|
| Painel de templates (hub) | `admin/AdminTemplates.jsx` |
| Marcação de Bandeira de Alta | `admin/AdminTemplatesBandeiraAlta.jsx` |
| Marcação de Bandeira de Baixa | `admin/AdminTemplatesBandeiraBaixa.jsx` |
| Marcação de Flâmula de Alta | `admin/AdminTemplatesFlamulaAlta.jsx` |
| Marcação de Flâmula de Baixa | `admin/AdminTemplatesFlamulaBaixa.jsx` |
| Tela de marcação compartilhada (bandeira/flâmula) | `admin/PainelMarcacao.jsx` |
| Marcação de Topo Duplo | `admin/AdminTemplatesTopoDuplo.jsx` |
| Marcação de Níveis (suporte/resistência) | `admin/AdminTemplatesNiveis.jsx` |
| Gráfico de marcação (clique → ponto) | `admin/TemplateMarkerChart.jsx` |
| Gráfico de marcação de níveis | `admin/NivelMarkerChart.jsx` |
| Lógica dos padrões de continuação (pontos, validação, linhas) | `admin/bandeira.js` |
| API calls do admin | `admin/adminApi.js` |
| Seletor de ativo | `admin/AtivoPicker.jsx` |
| Login admin | `admin/AdminLogin.jsx` |
| Proteção de rota admin | `admin/RequireAdmin.jsx` |

### Frontend — Outros
| Pedido sobre... | Arquivo |
|---|---|
| Rotas do app (lazy loading) | `App.jsx` |
| CSS global | `index.css` |
| Estilos inline do app | `styles/appCss.js` |
| Hook mobile detect | `hooks/useIsMobile.js` |
| Entry point | `main.jsx` |

### Backend (backend/)
| Pedido sobre... | Arquivo |
|---|---|
| App principal FastAPI (rotas) | `main.py` |
| Config (env vars, Supabase URL) | `config.py` |
| Cliente Supabase | `supabase_client.py` |
| Auth admin | `admin_auth.py` |
| CRUD templates (hub) | `admin_templates.py` |
| Templates Bandeira de Alta | `admin_templates_bandeira_alta.py` |
| Templates Bandeira de Baixa | `admin_templates_bandeira_baixa.py` |
| Templates Flâmula de Alta | `admin_templates_flamula_alta.py` |
| Templates Flâmula de Baixa | `admin_templates_flamula_baixa.py` |
| Templates Topo Duplo | `admin_templates_topo_duplo.py` |
| Templates Níveis | `admin_templates_niveis.py` |
| Pontos de bandeira/flâmula (validação) | `bandeira_pontos.py` |
| Busca de dados de mercado | `data/fetcher.py` |
| DTW (similaridade de formas) | `ml/dtw.py` |
| Teste DTW topo duplo | `ml/testar_dtw_topo_duplo.py` |
| Padrões marcados | `padroes_marcados.py` |
| Detecção clássica | `patterns/classicos.py` |
| Detecção de níveis | `patterns/niveis.py` |
| Detecção de pivôs | `patterns/pivos.py` |
| Alertas | `alertas.py` |
| Análises diárias | `analises.py` |
| Backtest | `backtest.py` |
| Rate limiting | `rate_limit.py` |

### Testes (frontend/src/test/)
| Pedido sobre... | Arquivo de teste |
|---|---|
| Setup do Vitest | `test/setup.js` |
| Dados fake para testes | `test/dadosFake.js` |
| Helpers de teste | `test/helpers.jsx` |
| Teste do App.jsx | `test/App.test.jsx` |
| Teste de bandeira | `test/bandeira.test.js` |
| Teste do admin bandeira | `test/AdminBandeira.test.jsx` |
| Teste rotas admin | `test/AdminRotas.test.jsx` |
| Teste cadastro | `test/Cadastro.test.jsx` |
| Teste dashboard | `test/Dashboard.test.jsx` |
| Teste gráfico | `test/Grafico.test.jsx` |
| Teste header | `test/Header.test.jsx` |
| Teste login | `test/Login.test.jsx` |
| Teste nav bar | `test/NavBar.test.jsx` |
| Teste skeleton | `test/Skeleton.test.jsx` |

## O que NÃO faz parte deste projeto

- Deep learning / redes neurais (usamos Random Forest, não precisa de GPU)
- Trading automatizado / sinais operacionais (somos educacionais)
- Dados fundamentalistas / notícias (descartado do MVP)
- App nativo mobile (é web responsivo)
