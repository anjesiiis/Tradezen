"""
╔══════════════════════════════════════════════════════════════╗
║              TRADEUP — BACKEND API                          ║
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
import time
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from data.fetcher import buscar_candles, buscar_resumo_mercado, buscar_ativo_info
from config import FRONTEND_URL
from admin_auth import router as admin_auth_router, require_admin
from admin_templates import router as admin_templates_router
from admin_templates_topo_duplo import router as admin_templates_topo_duplo_router
from admin_templates_niveis import router as admin_templates_niveis_router
from padroes_marcados import router as padroes_marcados_router

# ── APP ───────────────────────────────────────────────────────
app = FastAPI(
    title="TradeUp API",
    description="Backend de análise técnica educacional — padrões gráficos",
    version="1.3.0"
)

# Rate limiting por IP — sem isso, /ativo e /ativos/batch eram um jeito de
# graça de martelar o Yahoo Finance/Binance através da nossa API até tomar
# rate-limit/ban deles, ou só inflar nossa conta. default_limits cobre
# qualquer rota sem decorator explícito.
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — só os domínios reais do frontend. Antes tinha um "*" junto com os
# domínios explícitos, o que o Starlette trata como "libera geral" (o "*"
# vence) — qualquer site podia chamar a API. FRONTEND_URL cobre produção.
_origens_permitidas = {FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(_origens_permitidas),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(admin_auth_router)
app.include_router(admin_templates_router)
app.include_router(admin_templates_topo_duplo_router)
app.include_router(admin_templates_niveis_router)
app.include_router(padroes_marcados_router)

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


# ── LISTA COMPLETA DE ATIVOS DISPONÍVEIS ──────────────────────
ATIVOS_DISPONIVEIS = [
    # ── ÍNDICES ───────────────────────────────────────────────
    {"ticker": "^BVSP",     "nome": "Ibovespa",             "mercado": "INDICE", "simbolo": "IBOV"},
    {"ticker": "^GSPC",     "nome": "S&P 500",              "mercado": "INDICE", "simbolo": "SPX"},
    {"ticker": "^IXIC",     "nome": "Nasdaq Composite",     "mercado": "INDICE", "simbolo": "NASDAQ"},
    {"ticker": "^DJI",      "nome": "Dow Jones",            "mercado": "INDICE", "simbolo": "DJI"},

    # ── AÇÕES B3 (IBOV principais) ─────────────────────────────
    {"ticker": "PETR4.SA",  "nome": "Petrobras PN",          "mercado": "B3", "simbolo": "PETR4"},
    {"ticker": "PETR3.SA",  "nome": "Petrobras ON",          "mercado": "B3", "simbolo": "PETR3"},
    {"ticker": "VALE3.SA",  "nome": "Vale ON",               "mercado": "B3", "simbolo": "VALE3"},
    {"ticker": "ITUB4.SA",  "nome": "Itaú Unibanco PN",      "mercado": "B3", "simbolo": "ITUB4"},
    {"ticker": "ITUB3.SA",  "nome": "Itaú Unibanco ON",      "mercado": "B3", "simbolo": "ITUB3"},
    {"ticker": "BBDC4.SA",  "nome": "Bradesco PN",           "mercado": "B3", "simbolo": "BBDC4"},
    {"ticker": "BBDC3.SA",  "nome": "Bradesco ON",           "mercado": "B3", "simbolo": "BBDC3"},
    {"ticker": "BBAS3.SA",  "nome": "Banco do Brasil ON",    "mercado": "B3", "simbolo": "BBAS3"},
    {"ticker": "SANB11.SA", "nome": "Santander Brasil UNT",  "mercado": "B3", "simbolo": "SANB11"},
    {"ticker": "ABEV3.SA",  "nome": "Ambev ON",              "mercado": "B3", "simbolo": "ABEV3"},
    {"ticker": "B3SA3.SA",  "nome": "B3 ON",                 "mercado": "B3", "simbolo": "B3SA3"},
    {"ticker": "WEGE3.SA",  "nome": "WEG ON",                "mercado": "B3", "simbolo": "WEGE3"},
    {"ticker": "MGLU3.SA",  "nome": "Magazine Luiza ON",     "mercado": "B3", "simbolo": "MGLU3"},
    {"ticker": "LREN3.SA",  "nome": "Lojas Renner ON",       "mercado": "B3", "simbolo": "LREN3"},
    {"ticker": "SUZB3.SA",  "nome": "Suzano ON",             "mercado": "B3", "simbolo": "SUZB3"},
    {"ticker": "GGBR4.SA",  "nome": "Gerdau PN",             "mercado": "B3", "simbolo": "GGBR4"},
    {"ticker": "CSNA3.SA",  "nome": "CSN ON",                "mercado": "B3", "simbolo": "CSNA3"},
    {"ticker": "USIM5.SA",  "nome": "Usiminas PNA",          "mercado": "B3", "simbolo": "USIM5"},
    {"ticker": "JBSS3.SA",  "nome": "JBS ON",                "mercado": "B3", "simbolo": "JBSS3"},
    {"ticker": "BRFS3.SA",  "nome": "BRF ON",                "mercado": "B3", "simbolo": "BRFS3"},
    {"ticker": "RAIL3.SA",  "nome": "Rumo ON",               "mercado": "B3", "simbolo": "RAIL3"},
    {"ticker": "RENT3.SA",  "nome": "Localiza ON",           "mercado": "B3", "simbolo": "RENT3"},
    {"ticker": "EQTL3.SA",  "nome": "Equatorial ON",         "mercado": "B3", "simbolo": "EQTL3"},
    {"ticker": "ELET3.SA",  "nome": "Eletrobras ON",         "mercado": "B3", "simbolo": "ELET3"},
    {"ticker": "ELET6.SA",  "nome": "Eletrobras PNB",        "mercado": "B3", "simbolo": "ELET6"},
    {"ticker": "CMIG4.SA",  "nome": "Cemig PN",              "mercado": "B3", "simbolo": "CMIG4"},
    {"ticker": "VIVT3.SA",  "nome": "Telefônica Brasil ON",  "mercado": "B3", "simbolo": "VIVT3"},
    {"ticker": "TIMS3.SA",  "nome": "TIM ON",                "mercado": "B3", "simbolo": "TIMS3"},
    {"ticker": "RADL3.SA",  "nome": "Raia Drogasil ON",      "mercado": "B3", "simbolo": "RADL3"},
    {"ticker": "HAPV3.SA",  "nome": "Hapvida ON",            "mercado": "B3", "simbolo": "HAPV3"},
    {"ticker": "EMBR3.SA",  "nome": "Embraer ON",            "mercado": "B3", "simbolo": "EMBR3"},
    {"ticker": "CIEL3.SA",  "nome": "Cielo ON",              "mercado": "B3", "simbolo": "CIEL3"},
    {"ticker": "AZUL4.SA",  "nome": "Azul PN",               "mercado": "B3", "simbolo": "AZUL4"},
    {"ticker": "GOLL4.SA",  "nome": "Gol PN",                "mercado": "B3", "simbolo": "GOLL4"},
    {"ticker": "PRIO3.SA",  "nome": "PetroRio ON",           "mercado": "B3", "simbolo": "PRIO3"},
    {"ticker": "CSAN3.SA",  "nome": "Cosan ON",              "mercado": "B3", "simbolo": "CSAN3"},
    {"ticker": "UGPA3.SA",  "nome": "Ultrapar ON",           "mercado": "B3", "simbolo": "UGPA3"},
    {"ticker": "NTCO3.SA",  "nome": "Natura ON",             "mercado": "B3", "simbolo": "NTCO3"},
    {"ticker": "ASAI3.SA",  "nome": "Assaí ON",              "mercado": "B3", "simbolo": "ASAI3"},
    {"ticker": "PCAR3.SA",  "nome": "Pão de Açúcar ON",      "mercado": "B3", "simbolo": "PCAR3"},

    # ── CRIPTOMOEDAS ──────────────────────────────────────────
    {"ticker": "BTC-USD",   "nome": "Bitcoin",          "mercado": "CRIPTO", "simbolo": "BTC"},
    {"ticker": "ETH-USD",   "nome": "Ethereum",         "mercado": "CRIPTO", "simbolo": "ETH"},
    {"ticker": "SOL-USD",   "nome": "Solana",           "mercado": "CRIPTO", "simbolo": "SOL"},
    {"ticker": "BNB-USD",   "nome": "Binance Coin",     "mercado": "CRIPTO", "simbolo": "BNB"},
    {"ticker": "XRP-USD",   "nome": "Ripple",           "mercado": "CRIPTO", "simbolo": "XRP"},
    {"ticker": "ADA-USD",   "nome": "Cardano",          "mercado": "CRIPTO", "simbolo": "ADA"},
    {"ticker": "DOGE-USD",  "nome": "Dogecoin",         "mercado": "CRIPTO", "simbolo": "DOGE"},
    {"ticker": "AVAX-USD",  "nome": "Avalanche",        "mercado": "CRIPTO", "simbolo": "AVAX"},
    {"ticker": "DOT-USD",   "nome": "Polkadot",         "mercado": "CRIPTO", "simbolo": "DOT"},
    {"ticker": "MATIC-USD", "nome": "Polygon",          "mercado": "CRIPTO", "simbolo": "MATIC"},
    {"ticker": "LINK-USD",  "nome": "Chainlink",        "mercado": "CRIPTO", "simbolo": "LINK"},
    {"ticker": "UNI-USD",   "nome": "Uniswap",          "mercado": "CRIPTO", "simbolo": "UNI"},
    {"ticker": "ATOM-USD",  "nome": "Cosmos",           "mercado": "CRIPTO", "simbolo": "ATOM"},
    {"ticker": "LTC-USD",   "nome": "Litecoin",         "mercado": "CRIPTO", "simbolo": "LTC"},
    {"ticker": "BCH-USD",   "nome": "Bitcoin Cash",     "mercado": "CRIPTO", "simbolo": "BCH"},

    # ── COMMODITIES ───────────────────────────────────────────
    {"ticker": "GC=F",      "nome": "Ouro (futuro)",          "mercado": "COMMODITY", "simbolo": "OURO"},
    {"ticker": "SI=F",      "nome": "Prata (futuro)",         "mercado": "COMMODITY", "simbolo": "PRATA"},
    {"ticker": "HG=F",      "nome": "Cobre (futuro)",         "mercado": "COMMODITY", "simbolo": "COBRE"},
    {"ticker": "PL=F",      "nome": "Platina (futuro)",       "mercado": "COMMODITY", "simbolo": "PLATINA"},
    {"ticker": "CL=F",      "nome": "Petróleo WTI",           "mercado": "COMMODITY", "simbolo": "WTI"},
    {"ticker": "BZ=F",      "nome": "Petróleo Brent",         "mercado": "COMMODITY", "simbolo": "BRENT"},
    {"ticker": "NG=F",      "nome": "Gás Natural",            "mercado": "COMMODITY", "simbolo": "GAS"},
    {"ticker": "ZC=F",      "nome": "Milho",                  "mercado": "COMMODITY", "simbolo": "MILHO"},
    {"ticker": "ZS=F",      "nome": "Soja",                   "mercado": "COMMODITY", "simbolo": "SOJA"},
    {"ticker": "KC=F",      "nome": "Café",                   "mercado": "COMMODITY", "simbolo": "CAFE"},
    {"ticker": "SB=F",      "nome": "Açúcar",                 "mercado": "COMMODITY", "simbolo": "ACUCAR"},
    {"ticker": "CT=F",      "nome": "Algodão",                "mercado": "COMMODITY", "simbolo": "ALGODAO"},

    # ── FOREX ─────────────────────────────────────────────────
    {"ticker": "USDBRL=X",  "nome": "Dólar / Real",      "mercado": "FOREX", "simbolo": "USD/BRL"},
    {"ticker": "EURBRL=X",  "nome": "Euro / Real",       "mercado": "FOREX", "simbolo": "EUR/BRL"},
    {"ticker": "GBPBRL=X",  "nome": "Libra / Real",      "mercado": "FOREX", "simbolo": "GBP/BRL"},
    {"ticker": "EURUSD=X",  "nome": "Euro / Dólar",      "mercado": "FOREX", "simbolo": "EUR/USD"},
    {"ticker": "GBPUSD=X",  "nome": "Libra / Dólar",     "mercado": "FOREX", "simbolo": "GBP/USD"},
    {"ticker": "USDJPY=X",  "nome": "Dólar / Iene",      "mercado": "FOREX", "simbolo": "USD/JPY"},
    {"ticker": "USDCNY=X",  "nome": "Dólar / Yuan",      "mercado": "FOREX", "simbolo": "USD/CNY"},
    {"ticker": "GBPJPY=X",  "nome": "Libra / Iene",           "mercado": "FOREX", "simbolo": "GBP/JPY"},
    {"ticker": "EURJPY=X",  "nome": "Euro / Iene",            "mercado": "FOREX", "simbolo": "EUR/JPY"},
    {"ticker": "EURGBP=X",  "nome": "Euro / Libra",           "mercado": "FOREX", "simbolo": "EUR/GBP"},
    {"ticker": "AUDUSD=X",  "nome": "Dólar Australiano / Dólar", "mercado": "FOREX", "simbolo": "AUD/USD"},
    {"ticker": "NZDUSD=X",  "nome": "Dólar Neozelandês / Dólar", "mercado": "FOREX", "simbolo": "NZD/USD"},
    {"ticker": "USDCAD=X",  "nome": "Dólar / Dólar Canadense", "mercado": "FOREX", "simbolo": "USD/CAD"},
    {"ticker": "USDCHF=X",  "nome": "Dólar / Franco Suíço",   "mercado": "FOREX", "simbolo": "USD/CHF"},
    {"ticker": "AUDJPY=X",  "nome": "Dólar Australiano / Iene", "mercado": "FOREX", "simbolo": "AUD/JPY"},
    {"ticker": "CHFJPY=X",  "nome": "Franco Suíço / Iene",    "mercado": "FOREX", "simbolo": "CHF/JPY"},
    {"ticker": "USDMXN=X",  "nome": "Dólar / Peso Mexicano",  "mercado": "FOREX", "simbolo": "USD/MXN"},

    # ── AÇÕES INTERNACIONAIS (big techs/blue chips) ──────────
    {"ticker": "AAPL",      "nome": "Apple",              "mercado": "NASDAQ", "simbolo": "AAPL"},
    {"ticker": "MSFT",      "nome": "Microsoft",          "mercado": "NASDAQ", "simbolo": "MSFT"},
    {"ticker": "NVDA",      "nome": "Nvidia",             "mercado": "NASDAQ", "simbolo": "NVDA"},
    {"ticker": "GOOGL",     "nome": "Alphabet (Google)",  "mercado": "NASDAQ", "simbolo": "GOOGL"},
    {"ticker": "AMZN",      "nome": "Amazon",             "mercado": "NASDAQ", "simbolo": "AMZN"},
    {"ticker": "META",      "nome": "Meta Platforms",     "mercado": "NASDAQ", "simbolo": "META"},
    {"ticker": "TSLA",      "nome": "Tesla",              "mercado": "NASDAQ", "simbolo": "TSLA"},
]


# ── ROTAS ─────────────────────────────────────────────────────

@app.get("/")
def raiz():
    return {"status": "online", "produto": "TradeUp API", "versao": "1.2.0"}


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

    try:
        dados = buscar_resumo_mercado()
        cache_set("resumo_mercado", dados)
        return {"status": "ok", "dados": dados, "cache": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ativo/{ticker}")
@limiter.limit("30/minute")
def dados_ativo(
    request: Request,
    ticker: str,
    periodo: str = Query("5y", description="1mo, 3mo, 6mo, 1y, 2y, 5y, max"),
    intervalo: str = Query("1d", description="1d, 60m, 1wk")
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
def listar_ativos(mercado: Optional[str] = Query(None, description="Filtra por mercado: B3, CRIPTO, FOREX...")):
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
    periodo: str = Query("3mo"),
    intervalo: str = Query("1d")
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


# ── DADOS MOCKADOS (página Mercados estilo TradingView) ────────
# TODO: substituir por fonte de dados real quando integrarmos:
#   - market cap total de cripto + dominância → CoinGecko/CoinMarketCap API
#   - yield BR10Y, inflação (BRIRYY) e Selic/previsão → Trading Economics
#     ou API do Banco Central (SGS) / IBGE (SIDRA)
# Até lá, isso aqui é só pra a página não ficar com espaço vazio — os
# valores abaixo são fixos, não refletem o mercado real.
import random as _random


def _serie_mock(base: float, pontos: int, variacao_pct: float) -> list:
    """Passeio aleatório determinístico só pra desenhar um mini-gráfico
    plausível — não é dado de mercado de verdade."""
    rnd = _random.Random(int(base))  # seed fixa: mesma série a cada request
    serie = [base]
    for _ in range(pontos - 1):
        passo = serie[-1] * (rnd.uniform(-1, 1) * variacao_pct / 100)
        serie.append(round(serie[-1] + passo, 4))
    return serie


@app.get("/mercado/visao-geral")
@limiter.limit("60/minute")
def visao_geral_mercado(request: Request):
    """
    Dados extras pra página Mercados (cards estilo TradingView): market cap
    de cripto, dominância do Bitcoin, e indicadores econômicos do Brasil.
    MOCK — ver TODO acima. Front já sabe que "mock": true significa isso.
    """
    return {
        "status": "ok",
        "mock": True,
        "cripto": {
            "market_cap_usd": 2_380_000_000_000,
            "market_cap_variacao_pct": 2.41,
            "market_cap_serie": _serie_mock(2_280_000_000_000, 30, 2.5),
            "dominancia": {"bitcoin": 54.2, "ethereum": 17.8, "outros": 28.0},
        },
        "economia_brasil": {
            "yield_10a": {
                "valor": 11.85,
                "variacao_pct": -0.34,
                "serie": _serie_mock(11.9, 30, 1.2),
            },
            "inflacao_mensal": [
                {"mes": "Set/25", "valor": 0.35}, {"mes": "Out/25", "valor": 0.21},
                {"mes": "Nov/25", "valor": 0.18}, {"mes": "Dez/25", "valor": 0.52},
                {"mes": "Jan/26", "valor": 0.61}, {"mes": "Fev/26", "valor": 0.44},
                {"mes": "Mar/26", "valor": 0.29}, {"mes": "Abr/26", "valor": 0.15},
                {"mes": "Mai/26", "valor": 0.09}, {"mes": "Jun/26", "valor": 0.33},
                {"mes": "Jul/26", "valor": 0.40}, {"mes": "Ago/26", "valor": 0.27},
            ],
            "juros": {
                "atual": 10.75,
                "previsao": 10.50,
                "proximo_lancamento": "2026-09-17",
            },
        },
    }


@app.get("/cache/limpar")
def limpar_cache(admin: str = Depends(require_admin)):
    """Limpa o cache em memória (útil pra debug). Só admin — sem isso,
    qualquer um podia forçar toda requisição seguinte a bater de novo
    no Yahoo Finance/Binance, de graça."""
    total = len(_cache)
    _cache.clear()
    return {"status": "ok", "removidos": total}


@app.get("/cache/status")
def status_cache(admin: str = Depends(require_admin)):
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