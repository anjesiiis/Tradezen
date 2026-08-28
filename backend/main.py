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

from data.fetcher import buscar_candles, buscar_resumo_mercado, buscar_ativo_info
from config import FRONTEND_URL
from rate_limit import limiter
from admin_auth import router as admin_auth_router, require_admin
from admin_templates import router as admin_templates_router
from admin_templates_topo_duplo import router as admin_templates_topo_duplo_router
from admin_templates_niveis import router as admin_templates_niveis_router
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
_origens_permitidas = {FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"}
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
    {"ticker": "BRKM5.SA",  "nome": "Braskem PNA",           "mercado": "B3", "simbolo": "BRKM5"},
    {"ticker": "ITSA4.SA",  "nome": "Itaúsa PN",             "mercado": "B3", "simbolo": "ITSA4"},
    {"ticker": "BPAC11.SA", "nome": "BTG Pactual UNT",       "mercado": "B3", "simbolo": "BPAC11"},
    {"ticker": "KLBN11.SA", "nome": "Klabin UNT",            "mercado": "B3", "simbolo": "KLBN11"},
    {"ticker": "MBRF3.SA",  "nome": "MBRF (Marfrig+BRF) ON", "mercado": "B3", "simbolo": "MBRF3"},
    {"ticker": "CYRE3.SA",  "nome": "Cyrela ON",             "mercado": "B3", "simbolo": "CYRE3"},
    {"ticker": "MRVE3.SA",  "nome": "MRV Engenharia ON",     "mercado": "B3", "simbolo": "MRVE3"},
    {"ticker": "SBSP3.SA",  "nome": "Sabesp ON",             "mercado": "B3", "simbolo": "SBSP3"},
    {"ticker": "CPLE3.SA",  "nome": "Copel ON",              "mercado": "B3", "simbolo": "CPLE3"},
    {"ticker": "TAEE11.SA", "nome": "Taesa UNT",             "mercado": "B3", "simbolo": "TAEE11"},
    {"ticker": "ENGI11.SA", "nome": "Energisa UNT",          "mercado": "B3", "simbolo": "ENGI11"},
    {"ticker": "CPFE3.SA",  "nome": "CPFL Energia ON",       "mercado": "B3", "simbolo": "CPFE3"},
    {"ticker": "ENEV3.SA",  "nome": "Eneva ON",              "mercado": "B3", "simbolo": "ENEV3"},
    {"ticker": "TOTS3.SA",  "nome": "Totvs ON",              "mercado": "B3", "simbolo": "TOTS3"},
    {"ticker": "YDUQ3.SA",  "nome": "Yduqs ON",              "mercado": "B3", "simbolo": "YDUQ3"},
    {"ticker": "COGN3.SA",  "nome": "Cogna ON",              "mercado": "B3", "simbolo": "COGN3"},
    {"ticker": "BEEF3.SA",  "nome": "Minerva ON",            "mercado": "B3", "simbolo": "BEEF3"},
    {"ticker": "SMTO3.SA",  "nome": "São Martinho ON",       "mercado": "B3", "simbolo": "SMTO3"},
    {"ticker": "SLCE3.SA",  "nome": "SLC Agrícola ON",       "mercado": "B3", "simbolo": "SLCE3"},
    {"ticker": "VBBR3.SA",  "nome": "Vibra Energia ON",      "mercado": "B3", "simbolo": "VBBR3"},
    {"ticker": "BRAV3.SA",  "nome": "Brava Energia ON",      "mercado": "B3", "simbolo": "BRAV3"},
    {"ticker": "DXCO3.SA",  "nome": "Dexco ON",              "mercado": "B3", "simbolo": "DXCO3"},
    {"ticker": "BRAP4.SA",  "nome": "Bradespar PN",          "mercado": "B3", "simbolo": "BRAP4"},
    {"ticker": "MULT3.SA",  "nome": "Multiplan ON",          "mercado": "B3", "simbolo": "MULT3"},
    {"ticker": "ALPA4.SA",  "nome": "Alpargatas PN",         "mercado": "B3", "simbolo": "ALPA4"},
    {"ticker": "IRBR3.SA",  "nome": "IRB Brasil ON",         "mercado": "B3", "simbolo": "IRBR3"},
    {"ticker": "ECOR3.SA",  "nome": "EcoRodovias ON",        "mercado": "B3", "simbolo": "ECOR3"},
    {"ticker": "GOAU4.SA",  "nome": "Gerdau Metalúrgica PN", "mercado": "B3", "simbolo": "GOAU4"},
    {"ticker": "HYPE3.SA",  "nome": "Hypera ON",             "mercado": "B3", "simbolo": "HYPE3"},
    {"ticker": "AZZA3.SA",  "nome": "Azzas 2154 ON",         "mercado": "B3", "simbolo": "AZZA3"},
    {"ticker": "RDOR3.SA",  "nome": "Rede D'Or ON",          "mercado": "B3", "simbolo": "RDOR3"},

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
    {"ticker": "USDBRL=X",  "nome": "USD/BRL",           "mercado": "FOREX", "simbolo": "USD/BRL"},
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
    {"ticker": "USDINR=X",  "nome": "Dólar / Rupia Indiana",  "mercado": "FOREX", "simbolo": "USD/INR"},
    {"ticker": "USDKRW=X",  "nome": "Dólar / Won Sul-Coreano","mercado": "FOREX", "simbolo": "USD/KRW"},
    {"ticker": "USDSGD=X",  "nome": "Dólar / Dólar de Cingapura", "mercado": "FOREX", "simbolo": "USD/SGD"},
    {"ticker": "USDHKD=X",  "nome": "Dólar / Dólar de Hong Kong", "mercado": "FOREX", "simbolo": "USD/HKD"},
    {"ticker": "USDZAR=X",  "nome": "Dólar / Rand Sul-Africano",  "mercado": "FOREX", "simbolo": "USD/ZAR"},

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