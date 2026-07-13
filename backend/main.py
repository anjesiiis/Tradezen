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
"""

import asyncio
import time
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn

from data.fetcher import buscar_candles, buscar_resumo_mercado, buscar_ativo_info
from admin_auth import router as admin_auth_router
from admin_templates import router as admin_templates_router
from admin_templates_topo_duplo import router as admin_templates_topo_duplo_router

# ── APP ───────────────────────────────────────────────────────
app = FastAPI(
    title="TradeUp API",
    description="Backend de análise técnica educacional — padrões gráficos",
    version="1.3.0"
)

# CORS — permite o frontend React conectar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_auth_router)
app.include_router(admin_templates_router)
app.include_router(admin_templates_topo_duplo_router)

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
def resumo_mercado():
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
def dados_ativo(
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
async def ativos_batch(
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
def buscar_ativo(q: str = Query(..., description="Nome ou ticker do ativo")):
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


@app.get("/cache/limpar")
def limpar_cache():
    """Limpa o cache em memória (útil pra debug)."""
    total = len(_cache)
    _cache.clear()
    return {"status": "ok", "removidos": total}


@app.get("/cache/status")
def status_cache():
    """Mostra o que está em cache no momento."""
    agora = time.time()
    itens = [
        {"chave": chave, "idade_seg": int(agora - ts)}
        for chave, (ts, _) in _cache.items()
    ]
    return {"status": "ok", "total": len(itens), "itens": itens}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)