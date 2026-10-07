"""
╔══════════════════════════════════════════════════════════════╗
║              TRADEZEN — BACKEND API                        ║
║              FastAPI + Yahoo Finance + Binance              ║
║                                                              ║
║   v1.3 — Cache em memória + batch + paralelismo             ║
╚══════════════════════════════════════════════════════════════╝

INSTALAÇÃO:
    pip install fastapi uvicorn yfinance pandas numpy requests python-dotenv

RODAR:
    uvicorn main:app --reload --port 8000

ENDPOINTS:
    GET /mercado                    → resumo do mercado (página inicial)
    GET /ativo/{ticker}             → candles de um ativo
    GET /ativos                     → lista TODOS os ativos disponíveis
    GET /ativos/batch?tickers=...   → vários ativos numa só request
    GET /ativos/buscar?q=...        → busca de ativos

    POST /admin/auth/magic-link     → login admin via Supabase (magic link)
    GET/POST/PUT/DELETE /admin/templates             → CRUD de templates OCO (marcação manual)
    GET/POST/PUT/DELETE /admin/templates-topo-duplo  → CRUD de templates Topo Duplo (marcação manual)
    GET/POST/PUT/DELETE /admin/templates-niveis      → CRUD de templates Suporte/Resistência (marcação manual)
"""

import asyncio
import threading
import time
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal, Optional

# Valores aceitos pelo yfinance de verdade — travar aqui em vez de "str"
# solto rejeita input malformado direto no FastAPI (422), antes de gastar
# uma chamada no Yahoo Finance com um período/intervalo inválido.
PeriodoAtivo = Literal["1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]
IntervaloAtivo = Literal["1d", "60m", "1wk"]
import uvicorn
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from ativos import ATIVOS
from data.fetcher import buscar_candles, buscar_resumo_mercado, buscar_ativo_info
from config import FRONTEND_URL
from rate_limit import limiter
from admin_auth import router as admin_auth_router, require_admin
from admin_templates import router as admin_templates_router
from admin_templates_topo_duplo import router as admin_templates_topo_duplo_router
from admin_templates_niveis import router as admin_templates_niveis_router
from admin_templates_bandeira_alta import router as admin_templates_bandeira_alta_router
from admin_templates_bandeira_baixa import router as admin_templates_bandeira_baixa_router
from admin_templates_flamula_alta import router as admin_templates_flamula_alta_router
from admin_templates_flamula_baixa import router as admin_templates_flamula_baixa_router
from admin_templates_cunha_alta import router as admin_templates_cunha_alta_router
from admin_templates_cunha_baixa import router as admin_templates_cunha_baixa_router
from admin_templates_canal_alta import router as admin_templates_canal_alta_router
from admin_templates_canal_baixa import router as admin_templates_canal_baixa_router
from padroes_marcados import router as padroes_marcados_router
from analises import router as analises_router
from alertas import router as alertas_router

# ── APP ───────────────────────────────────────────────────────
app = FastAPI(
    title="TradeZen API",
    description="Backend de análise técnica educacional — padrões gráficos",
    version="1.3.0"
)

# Rate limiting por IP — sem isso, /ativo e /ativos/batch eram um jeito de
# graça de martelar o Yahoo Finance/Binance através da nossa API até tomar
# rate-limit/ban deles, ou só inflar nossa conta. `limiter` vem de
# rate_limit.py (compartilhado com os routers) — default_limits ali cobre
# qualquer rota sem decorator explícito.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — só os domínios reais do frontend. Antes tinha um "*" junto com os
# domínios explícitos, o que o Starlette trata como "libera geral" (o "*"
# vence) — qualquer site podia chamar a API. Nunca usar allow_origins=["*"].
#
# TODO deploy: FRONTEND_URL (env var, backend/.env em produção) precisa
# estar setada pro domínio real do site (ex: https://tradezen.com.br) —
# sem isso, o navegador bloqueia toda chamada do frontend em produção pra
# essa API por CORS. Em dev, sem a var, cai no default "localhost:5173"
# (ver config.py) e as duas próximas linhas cobrem localhost/5173 e /3000.
#
# tradezen.com.br e www ficam fixos aqui (não só via FRONTEND_URL) — assim
# o domínio de produção nunca depende de alguém lembrar de setar a env var
# certa no Render; confirmado na prática que era exatamente isso que
# estava faltando (preflight OPTIONS sem access-control-allow-origin pro
# domínio real).
_origens_permitidas = {
    FRONTEND_URL,
    "https://tradezen.com.br",
    "https://www.tradezen.com.br",
    "http://localhost:5173",
    "http://localhost:3000",
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(_origens_permitidas),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Headers de segurança em toda resposta — API pura (só JSON), então o CSP
# fica no mínimo possível: nada aqui deveria ser interpretado como
# HTML/JS/CSS por um navegador, então "default-src 'none'" nunca quebra
# funcionalidade nenhuma, só fecha a porta caso algum dia um endpoint
# devolva algo que um browser mal-configurado tente renderizar.
@app.middleware("http")
async def adicionar_headers_seguranca(request: Request, call_next):
    resposta = await call_next(request)
    resposta.headers["X-Content-Type-Options"] = "nosniff"
    resposta.headers["X-Frame-Options"] = "DENY"
    resposta.headers["X-XSS-Protection"] = "1; mode=block"
    resposta.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resposta.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    # Só tem efeito quando a resposta já veio por HTTPS (é assim que todo
    # navegador trata HSTS) — inofensivo em dev (http://localhost), pronto
    # pra produção assim que o domínio tiver HTTPS (Render/Vercel já dão
    # isso de graça).
    resposta.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return resposta


app.include_router(admin_auth_router)
app.include_router(admin_templates_router)
app.include_router(admin_templates_topo_duplo_router)
app.include_router(admin_templates_niveis_router)
app.include_router(admin_templates_bandeira_alta_router)
app.include_router(admin_templates_bandeira_baixa_router)
app.include_router(admin_templates_flamula_alta_router)
app.include_router(admin_templates_flamula_baixa_router)
app.include_router(admin_templates_cunha_alta_router)
app.include_router(admin_templates_cunha_baixa_router)
app.include_router(admin_templates_canal_alta_router)
app.include_router(admin_templates_canal_baixa_router)
app.include_router(padroes_marcados_router)
app.include_router(analises_router)
app.include_router(alertas_router)

# ── CACHE EM MEMÓRIA ───────────────────────────────────────────
# Estrutura: { "chave": (timestamp, dados) }
_cache: dict = {}
TTL_CURTO    = 300    # 5 min  — resumo de mercado
TTL_MEDIO    = 1800   # 30 min — candles diários
TTL_LONGO    = 3600   # 1h    — candles semanais/mensais

def cache_get(chave: str, ttl: int):
    if chave in _cache:
        ts, dados = _cache[chave]
        if time.time() - ts < ttl:
            return dados
    return None

def cache_set(chave: str, dados):
    _cache[chave] = (time.time(), dados)


# ── AQUECIMENTO DO RESUMO DE MERCADO ──────────────────────────
# Montar o resumo custa ~26s: são 65 ativos buscados no Yahoo, de 6 em 6
# (mais que isso e o Yahoo derruba as requisições — ver buscar_resumo_
# mercado). Antes isso acontecia DENTRO da requisição do usuário, então:
#   1. quem chegava com o cache vencido esperava os 26s inteiros;
#   2. pior, enquanto a busca rolava o servidor ficava ocupado e as
#      outras requisições entravam na fila — um visitante atrasava o
#      outro (medido: 30s pra responder até a rota mais simples).
# Agora uma thread mantém o cache sempre quente por fora, e a rota nunca
# faz a busca pesada durante o atendimento.
_INTERVALO_AQUECIMENTO = 240  # 4 min — um pouco antes do TTL_CURTO vencer
_lock_resumo = threading.Lock()


def _resumo_mercado_atualizado():
    """Busca o resumo e guarda no cache. O lock evita que duas buscas
    iguais rodem ao mesmo tempo (thread de aquecimento + requisição de
    usuário no primeiro acesso, por exemplo) — a segunda espera a
    primeira e aproveita o resultado, em vez de martelar o Yahoo em
    dobro."""
    with _lock_resumo:
        ja_pronto = cache_get("resumo_mercado", TTL_CURTO)
        if ja_pronto is not None:
            return ja_pronto
        dados = buscar_resumo_mercado()
        if dados:
            cache_set("resumo_mercado", dados)
        return dados


def _loop_aquecimento():
    while True:
        try:
            _resumo_mercado_atualizado()
        except Exception as e:  # nunca deixa a thread morrer
            print(f"[aquecimento] resumo de mercado falhou: {e}")
        time.sleep(_INTERVALO_AQUECIMENTO)


threading.Thread(target=_loop_aquecimento, daemon=True).start()


# ── LISTA COMPLETA DE ATIVOS DISPONÍVEIS ──────────────────────
# Vem do catálogo central (backend/ativos.py): é o que a busca do site, o
# filtro por mercado e a detecção de padrões enxergam. Pra acrescentar um
# ativo, basta uma linha lá.
ATIVOS_DISPONIVEIS = ATIVOS


# ── ROTAS ─────────────────────────────────────────────────────

# HEAD também: monitores de uptime (UptimeRobot, cron do GitHub) costumam
# bater com HEAD, e só GET devolveria 405 — o monitor acharia que caiu.
# Essa rota é o alvo do keep-alive: leve, sem yfinance nem Supabase.
@app.api_route("/", methods=["GET", "HEAD"])
def raiz():
    return {"status": "online", "produto": "TradeZen API", "versao": "1.2.0"}


@app.get("/mercado")
@limiter.limit("60/minute")
def resumo_mercado(request: Request):
    """
    Retorna resumo do mercado para a página inicial.
    Cache de 5 minutos.
    """
    em_cache = cache_get("resumo_mercado", TTL_CURTO)
    if em_cache is not None:
        return {"status": "ok", "dados": em_cache, "cache": True}

    # Cache vencido, mas existe: devolve o antigo NA HORA. A thread de
    # aquecimento já está cuidando de atualizar. Preço de alguns minutos
    # atrás na hora é melhor que preço exato depois de 26 segundos de
    # tela branca — ainda mais porque o front recarrega sozinho a cada
    # 60s e pega o valor novo assim que ele existir.
    vencido = _cache.get("resumo_mercado")
    if vencido and vencido[1]:
        return {"status": "ok", "dados": vencido[1], "cache": True, "vencido": True}

    # Só cai aqui no primeiro acesso depois de subir o servidor, antes da
    # thread de aquecimento terminar a primeira rodada.
    try:
        dados = _resumo_mercado_atualizado()
        return {"status": "ok", "dados": dados, "cache": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ativo/{ticker}")
@limiter.limit("30/minute")
def dados_ativo(
    request: Request,
    ticker: str,
    periodo: PeriodoAtivo = Query("5y", description="1mo, 3mo, 6mo, 1y, 2y, 5y, max"),
    intervalo: IntervaloAtivo = Query("1d", description="1d, 60m, 1wk")
):
    """
    Retorna candles de um ativo.
    Timeframes suportados: 60m, 1d, 1wk
    Exemplo: /ativo/PETR4.SA?periodo=5y&intervalo=1d
    """
    chave_cache = f"ativo:{ticker}:{periodo}:{intervalo}"
    ttl = TTL_MEDIO if intervalo == "1d" else TTL_LONGO

    em_cache = cache_get(chave_cache, ttl)
    if em_cache is not None:
        return {**em_cache, "cache": True}

    try:
        candles = buscar_candles(ticker, periodo, intervalo)
        if not candles:
            raise HTTPException(status_code=404, detail=f"Ativo '{ticker}' não encontrado.")

        info = buscar_ativo_info(ticker)

        resposta = {
            "status": "ok",
            "ticker": ticker.upper(),
            "info": info,
            "periodo": periodo,
            "intervalo": intervalo,
            "total_candles": len(candles),
            "candles": candles,
            # Detector automático de suporte/resistência desligado até termos
            # 40+ templates marcados com resultado "sucesso" em templates_niveis
            # (hoje ainda são poucos — ver admin_templates_niveis.py). Mesmo
            # critério já valia pro detector de OCO (classicos.py), removido
            # daqui no commit 78a74cc.
            "niveis": [],
        }
        cache_set(chave_cache, resposta)
        return {**resposta, "cache": False}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ativos")
@limiter.limit("60/minute")
def listar_ativos(request: Request, mercado: Optional[str] = Query(None, description="Filtra por mercado: B3, CRIPTO, FOREX...")):
    """
    Lista TODOS os ativos disponíveis na plataforma.
    Exemplo: /ativos?mercado=CRIPTO
    """
    if mercado:
        lista = [a for a in ATIVOS_DISPONIVEIS if a["mercado"].upper() == mercado.upper()]
    else:
        lista = ATIVOS_DISPONIVEIS

    return {"status": "ok", "ativos": lista, "total": len(lista)}


@app.get("/ativos/batch")
@limiter.limit("15/minute")
async def ativos_batch(
    request: Request,
    tickers: str = Query(..., description="Tickers separados por vírgula"),
    periodo: PeriodoAtivo = Query("3mo"),
    intervalo: IntervaloAtivo = Query("1d")
):
    """
    Retorna candles de VÁRIOS ativos numa só requisição, em paralelo.
    Exemplo: /ativos/batch?tickers=BTC-USD,ETH-USD,SOL-USD&periodo=3mo&intervalo=1d
    """
    lista_tickers = [t.strip() for t in tickers.split(",") if t.strip()]
    if not lista_tickers:
        raise HTTPException(status_code=400, detail="Nenhum ticker informado.")
    if len(lista_tickers) > 20:
        raise HTTPException(status_code=400, detail="Máximo de 20 tickers por requisição.")

    ttl = TTL_MEDIO if intervalo == "1d" else TTL_LONGO

    def buscar_um(ticker: str):
        chave = f"ativo:{ticker}:{periodo}:{intervalo}"
        em_cache = cache_get(chave, ttl)
        if em_cache is not None:
            return {**em_cache, "cache": True}

        try:
            candles = buscar_candles(ticker, periodo, intervalo)
            if not candles:
                return {"status": "erro", "ticker": ticker, "erro": "não encontrado"}

            info = buscar_ativo_info(ticker)
            resposta = {
                "status": "ok",
                "ticker": ticker.upper(),
                "info": info,
                "periodo": periodo,
                "intervalo": intervalo,
                "total_candles": len(candles),
                "candles": candles,
            }
            cache_set(chave, resposta)
            return {**resposta, "cache": False}
        except Exception as e:
            return {"status": "erro", "ticker": ticker, "erro": str(e)}

    loop = asyncio.get_event_loop()
    tarefas = [loop.run_in_executor(None, buscar_um, t) for t in lista_tickers]
    resultados = await asyncio.gather(*tarefas)

    return {"status": "ok", "total": len(resultados), "resultados": resultados}


@app.get("/ativos/buscar")
@limiter.limit("60/minute")
def buscar_ativo(request: Request, q: str = Query(..., description="Nome ou ticker do ativo")):
    """
    Busca ativos por nome, ticker ou símbolo.
    Exemplo: /ativos/buscar?q=petro
    """
    q_lower = q.lower().strip()
    if not q_lower:
        return {"status": "ok", "resultados": [], "total": 0}

    resultados = [
        a for a in ATIVOS_DISPONIVEIS
        if q_lower in a["ticker"].lower()
        or q_lower in a["nome"].lower()
        or q_lower in a["simbolo"].lower()
    ]

    return {"status": "ok", "resultados": resultados, "total": len(resultados)}


# ── DADOS DA PÁGINA MERCADOS (cards estilo TradingView) ─────────
# Selic e inflação (IPCA) vêm de verdade da API pública do Banco Central
# (SGS — sem chave, sem cadastro). O resto ainda é mock:
# TODO: substituir por fonte de dados real quando integrarmos:
#   - market cap total de cripto + dominância → CoinGecko/CoinMarketCap API
#   - yield BR10Y → não tem fonte gratuita limpa (daria pra aproximar com o
#     CSV de preços do Tesouro Direto, mas é 14MB e pede mais trabalho de
#     parsing — deixado pra depois)
import random as _random
import requests as _requests
from datetime import datetime as _datetime

BCB_SGS_URL   = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json"
BCB_FOCUS_URL = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais"

# Calendário oficial do Copom pra 2026 (BC divulga com quase um ano de
# antecedência — não muda). Decisão sempre sai no 2º dia de cada reunião.
# TODO: atualizar quando o Banco Central divulgar o calendário de 2027.
_COPOM_2026 = [
    "2026-03-18", "2026-04-29", "2026-06-17", "2026-08-05",
    "2026-09-16", "2026-11-04", "2026-12-09",
]


def _proximo_copom() -> str:
    hoje = _datetime.now().strftime("%Y-%m-%d")
    for data in _COPOM_2026:
        if data >= hoje:
            return data
    return _COPOM_2026[-1]


def _buscar_selic_atual():
    try:
        r = _requests.get(BCB_SGS_URL.format(codigo=432, n=1), timeout=5)
        r.raise_for_status()
        return float(r.json()[0]["valor"])
    except Exception:
        return None


def _buscar_ipca_mensal_12m():
    try:
        r = _requests.get(BCB_SGS_URL.format(codigo=433, n=12), timeout=5)
        r.raise_for_status()
        meses_pt = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
        saida = []
        for item in r.json():
            _dia, mes, ano = item["data"].split("/")
            saida.append({"mes": f"{meses_pt[int(mes)-1]}/{ano[2:]}", "valor": float(item["valor"])})
        return saida
    except Exception:
        return None


def _buscar_selic_previsao():
    # OData da API do BC é exigente com a codificação da URL — passar por
    # `params=` (requests usa form-encoding, %27 pra aspas) faz o serviço
    # devolver 400. Montando a query string manualmente, do jeito que ele
    # espera (aspas literais, espaço como %20), funciona.
    try:
        ano_atual = _datetime.now().year
        url = (
            f"{BCB_FOCUS_URL}?$top=1"
            f"&$filter=Indicador%20eq%20'Selic'%20and%20DataReferencia%20eq%20'{ano_atual}'"
            f"&$orderby=Data%20desc&$format=json"
        )
        r = _requests.get(url, timeout=5)
        r.raise_for_status()
        valores = r.json().get("value", [])
        return round(float(valores[0]["Mediana"]), 2) if valores else None
    except Exception:
        return None


def _serie_mock(base: float, pontos: int, variacao_pct: float) -> list:
    """Passeio aleatório determinístico só pra desenhar um mini-gráfico
    plausível — não é dado de mercado de verdade."""
    rnd = _random.Random(int(base))  # seed fixa: mesma série a cada request
    serie = [base]
    for _ in range(pontos - 1):
        passo = serie[-1] * (rnd.uniform(-1, 1) * variacao_pct / 100)
        serie.append(round(serie[-1] + passo, 4))
    return serie


def _serie_mock_24h(base: float, variacao_pct: float, seed: int) -> list:
    """Igual a `_serie_mock`, mas devolve pontos horários das últimas 24h já
    com timestamp (ms) — formato que o HomeLineChart espera pro gráfico
    grande da página de Criptomoedas."""
    rnd = _random.Random(seed)
    agora = int(_datetime.now().timestamp() * 1000)
    valores = [base]
    for _ in range(23):
        passo = valores[-1] * (rnd.uniform(-1, 1) * variacao_pct / 100)
        valores.append(round(valores[-1] + passo, 2))
    return [
        {"timestamp": agora - (23 - i) * 3600_000, "fechamento": v}
        for i, v in enumerate(valores)
    ]


@app.get("/mercado/visao-geral")
@limiter.limit("60/minute")
def visao_geral_mercado(request: Request):
    """
    Dados extras pra página Mercados (cards estilo TradingView): market cap
    de cripto, dominância do Bitcoin, e indicadores econômicos do Brasil.
    Selic e inflação são reais (Banco Central); o resto é mock — ver TODO
    acima. Front já sabe que cada bloco tem seu próprio "mock": true/false.
    """
    chave_cache = "mercado_visao_geral"
    em_cache = cache_get(chave_cache, TTL_CURTO)
    if em_cache is not None:
        return em_cache

    selic_atual = _buscar_selic_atual()
    selic_previsao = _buscar_selic_previsao()
    inflacao = _buscar_ipca_mensal_12m()
    # Se a API do BC estiver fora do ar, cai pra um valor plausível em vez
    # de quebrar a página — mas sinaliza mock=True nesse caso específico.
    juros_e_inflacao_reais = selic_atual is not None and inflacao is not None

    resposta = {
        "status": "ok",
        "cripto": {
            # TODO: capitalização/volume total e dominância dependem de um
            # agregador de mercado (ex: CoinGecko /global, CoinMarketCap) —
            # a Binance só enxerga o volume negociado nela mesma, não o
            # mercado cripto inteiro. Preço e variação do BTC/ETH/BNB/XRP
            # nos cards do topo da página de Criptomoedas são reais (vêm de
            # /mercado, que já busca na Binance); só os blocos agregados
            # abaixo (cap. total, volume 24h, stablecoins, dominância,
            # volatilidade) seguem mock até integrarmos essa fonte.
            "mock": True,
            "market_cap_usd": 2_380_000_000_000,
            "market_cap_variacao_pct": 2.41,
            "market_cap_serie": _serie_mock(2_280_000_000_000, 30, 2.5),
            "market_cap_serie_24h": _serie_mock_24h(2_330_000_000_000, 1.4, seed=1),
            "volume_24h_usd": 71_890_000_000,
            "volume_24h_variacao_pct": -3.12,
            "dominancia": {"bitcoin": 54.2, "ethereum": 17.8, "outros": 28.0},
            "stablecoins": {
                "mock": True,
                "market_cap_usd": 168_400_000_000,
                "variacao_pct": 0.62,
                "serie": _serie_mock(166_800_000_000, 30, 0.8),
            },
            "volatilidade": {
                "mock": True,
                "bitcoin":  {"indice": 45.2, "variacao_pct": -1.8},
                "ethereum": {"indice": 58.7, "variacao_pct": 2.3},
            },
        },
        "economia_brasil": {
            "yield_10a": {
                "mock": True,
                "valor": 11.85,
                "variacao_pct": -0.34,
                "serie": _serie_mock(11.9, 30, 1.2),
            },
            "inflacao_mensal": {
                "mock": inflacao is None,
                "dados": inflacao or [
                    {"mes": "Set/25", "valor": 0.35}, {"mes": "Out/25", "valor": 0.21},
                    {"mes": "Nov/25", "valor": 0.18}, {"mes": "Dez/25", "valor": 0.52},
                    {"mes": "Jan/26", "valor": 0.61}, {"mes": "Fev/26", "valor": 0.44},
                    {"mes": "Mar/26", "valor": 0.29}, {"mes": "Abr/26", "valor": 0.15},
                    {"mes": "Mai/26", "valor": 0.09}, {"mes": "Jun/26", "valor": 0.33},
                    {"mes": "Jul/26", "valor": 0.40}, {"mes": "Ago/26", "valor": 0.27},
                ],
            },
            "juros": {
                "mock": not juros_e_inflacao_reais,
                "atual": selic_atual if selic_atual is not None else 10.75,
                "previsao": selic_previsao if selic_previsao is not None else 10.50,
                "proximo_lancamento": _proximo_copom(),
            },
        },
    }
    cache_set(chave_cache, resposta)
    return resposta


@app.get("/cache/limpar")
@limiter.limit("30/minute")
def limpar_cache(request: Request, admin: str = Depends(require_admin)):
    """Limpa o cache em memória (útil pra debug). Só admin — sem isso,
    qualquer um podia forçar toda requisição seguinte a bater de novo
    no Yahoo Finance/Binance, de graça."""
    total = len(_cache)
    _cache.clear()
    return {"status": "ok", "removidos": total}


@app.get("/cache/status")
@limiter.limit("30/minute")
def status_cache(request: Request, admin: str = Depends(require_admin)):
    """Mostra o que está em cache no momento. Só admin — os nomes das
    chaves revelam quais tickers estão sendo consultados."""
    agora = time.time()
    itens = [
        {"chave": chave, "idade_seg": int(agora - ts)}
        for chave, (ts, _) in _cache.items()
    ]
    return {"status": "ok", "total": len(itens), "itens": itens}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)