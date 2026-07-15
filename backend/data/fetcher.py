"""
TRADETEC — BUSCADOR DE DADOS
Fontes: Yahoo Finance (B3, Forex, Ações EUA, Commodities) + Binance (Cripto)

v1.1 — Paralelismo com ThreadPoolExecutor + cache interno
"""

import yfinance as yf
import requests
import pandas as pd
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

MERCADO_PRINCIPAL = [
    {"ticker": "^BVSP",    "nome": "Ibovespa",     "simbolo": "IBOV",     "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "BTC-USD",  "nome": "Bitcoin",      "simbolo": "BTC",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "ETH-USD",  "nome": "Ethereum",     "simbolo": "ETH",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "SOL-USD",  "nome": "Solana",       "simbolo": "SOL",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "BNB-USD",  "nome": "Binance Coin", "simbolo": "BNB",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "XRP-USD",  "nome": "Ripple",       "simbolo": "XRP",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "ADA-USD",  "nome": "Cardano",      "simbolo": "ADA",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "DOGE-USD", "nome": "Dogecoin",     "simbolo": "DOGE",     "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "AVAX-USD", "nome": "Avalanche",    "simbolo": "AVAX",     "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "PETR4.SA", "nome": "Petrobras",    "simbolo": "PETR4",    "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "VALE3.SA", "nome": "Vale",         "simbolo": "VALE3",    "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "ITUB4.SA", "nome": "Itaú",         "simbolo": "ITUB4",    "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "BBDC4.SA", "nome": "Bradesco",     "simbolo": "BBDC4",    "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "WEGE3.SA", "nome": "WEG",          "simbolo": "WEGE3",    "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "MGLU3.SA", "nome": "Magalu",       "simbolo": "MGLU3",    "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "USDBRL=X", "nome": "Dólar/Real",   "simbolo": "USD/BRL",  "mercado": "FOREX",     "moeda": "BRL"},
    {"ticker": "EURUSD=X", "nome": "Euro/Dólar",   "simbolo": "EUR/USD",  "mercado": "FOREX",     "moeda": "USD"},
    {"ticker": "EURBRL=X", "nome": "Euro/Real",    "simbolo": "EUR/BRL",  "mercado": "FOREX",     "moeda": "BRL"},
    {"ticker": "GBPUSD=X", "nome": "Libra/Dólar",  "simbolo": "GBP/USD",  "mercado": "FOREX",     "moeda": "USD"},
    {"ticker": "GC=F",     "nome": "Ouro",         "simbolo": "OURO",     "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "SI=F",     "nome": "Prata",        "simbolo": "PRATA",    "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "CL=F",     "nome": "Petróleo WTI", "simbolo": "PETRÓLEO", "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "BZ=F",     "nome": "Petróleo Brent","simbolo": "BRENT",   "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "NG=F",     "nome": "Gás Natural",  "simbolo": "GÁS",      "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "ZC=F",     "nome": "Milho",        "simbolo": "MILHO",    "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "ZS=F",     "nome": "Soja",         "simbolo": "SOJA",     "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "KC=F",     "nome": "Café",         "simbolo": "CAFÉ",     "mercado": "COMMODITY", "moeda": "USD"},
]

BINANCE_URL = "https://api.binance.com/api/v3"
BINANCE_SYMBOLS = {
    "BTC-USD": "BTCUSDT", "ETH-USD": "ETHUSDT", "SOL-USD": "SOLUSDT",
    "BNB-USD": "BNBUSDT", "XRP-USD": "XRPUSDT", "ADA-USD": "ADAUSDT",
    "DOGE-USD": "DOGEUSDT", "AVAX-USD": "AVAXUSDT", "DOT-USD": "DOTUSDT",
    "MATIC-USD": "MATICUSDT", "LINK-USD": "LINKUSDT", "UNI-USD": "UNIUSDT",
    "ATOM-USD": "ATOMUSDT", "LTC-USD": "LTCUSDT", "BCH-USD": "BCHUSDT",
}
BINANCE_INTERVALS = {
    "1m":"1m","5m":"5m","15m":"15m","1h":"1h","60m":"1h",
    "4h":"4h","1d":"1d","1wk":"1w","1mo":"1M",
}

# ── CACHE INTERNO DO FETCHER ──────────────────────────────────
# Reforça o cache do main.py; também ajuda quando funções internas
# chamam buscar_candles em sequência (resumo de mercado por ex).
_cache_fetcher: dict = {}
_TTL_CACHE = 300  # 5 minutos

def _cache_get(chave: str):
    if chave in _cache_fetcher:
        ts, dados = _cache_fetcher[chave]
        if time.time() - ts < _TTL_CACHE:
            return dados
    return None

def _cache_set(chave: str, dados):
    _cache_fetcher[chave] = (time.time(), dados)


def _eh_cripto(ticker):
    return ticker.upper() in BINANCE_SYMBOLS


def _buscar_binance(ticker, intervalo="1d", limite=1000):
    """Busca candles da Binance. limite máximo: 1000."""
    symbol = BINANCE_SYMBOLS.get(ticker.upper())
    if not symbol:
        return []
    interval = BINANCE_INTERVALS.get(intervalo, "1d")
    try:
        resp = requests.get(
            f"{BINANCE_URL}/klines",
            params={"symbol": symbol, "interval": interval, "limit": min(limite, 1000)},
            timeout=10,
        )
        resp.raise_for_status()
        candles = []
        for k in resp.json():
            candles.append({
                "timestamp": int(k[0]),
                "data": datetime.fromtimestamp(k[0]/1000).strftime("%Y-%m-%d %H:%M"),
                "abertura": float(k[1]),
                "maxima": float(k[2]),
                "minima": float(k[3]),
                "fechamento": float(k[4]),
                "volume": float(k[5]),
                "fonte": "binance",
            })
        return candles
    except Exception as e:
        print(f"[Binance] Erro {ticker}: {e}")
        return []


def _buscar_yahoo(ticker, periodo="3mo", intervalo="1d"):
    """Busca candles do Yahoo Finance."""
    try:
        df = yf.download(
            ticker,
            period=periodo,
            interval=intervalo,
            auto_adjust=True,
            progress=False,
            threads=False,  # já paralelizamos por fora
        )
        if df.empty:
            return []
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.dropna(inplace=True)
        candles = []
        for idx, row in df.iterrows():
            ts = int(idx.timestamp() * 1000) if hasattr(idx, "timestamp") else 0
            candles.append({
                "timestamp": ts,
                "data": idx.strftime("%Y-%m-%d %H:%M") if hasattr(idx, "strftime") else str(idx),
                "abertura": round(float(row["Open"]), 4),
                "maxima": round(float(row["High"]), 4),
                "minima": round(float(row["Low"]), 4),
                "fechamento": round(float(row["Close"]), 4),
                "volume": int(float(row.get("Volume", 0))),
                "fonte": "yahoo",
            })

        # Yahoo às vezes publica o candle do pregão ainda em formação (ex: B3
        # antes do fechamento oficial do dia) com abertura/máxima/mínima
        # zeradas e só o último preço no fechamento — descarta esse candle
        # incompleto pra não virar um "marubozo" indo até zero no gráfico.
        if candles and candles[-1]["maxima"] == 0 and candles[-1]["minima"] == 0:
            candles.pop()

        return candles
    except Exception as e:
        print(f"[Yahoo] Erro {ticker}: {e}")
        return []


def buscar_candles(ticker, periodo="5y", intervalo="1d"):
    """
    Busca candles de um ativo. Cripto vai pra Binance (mais rápido e tempo real);
    o resto vai pro Yahoo. Resultado é cacheado por 5 min.
    """
    chave = f"{ticker.upper()}:{periodo}:{intervalo}"
    em_cache = _cache_get(chave)
    if em_cache is not None:
        return em_cache

    if _eh_cripto(ticker):
        # Binance: traduz periodo em quantidade de candles
        limites = {
            "1mo": 30, "3mo": 90, "6mo": 180,
            "1y": 365, "2y": 730, "5y": 1000, "10y": 1000, "max": 1000,
        }
        limite = limites.get(periodo, 365)
        candles = _buscar_binance(ticker, intervalo, limite)
        if candles:
            _cache_set(chave, candles)
            return candles
        # Fallback pro Yahoo se Binance falhar

    candles = _buscar_yahoo(ticker, periodo, intervalo)
    if candles:
        _cache_set(chave, candles)
    return candles


def buscar_ativo_info(ticker):
    """Pega info básica (nome, mercado, moeda). Sem ida à internet quando possível."""
    for m in MERCADO_PRINCIPAL:
        if m["ticker"].upper() == ticker.upper():
            return {
                "nome": m["nome"], "simbolo": m["simbolo"],
                "mercado": m["mercado"], "moeda": m["moeda"],
            }

    # Cache pra info de ativos fora da lista principal (evita yf.Ticker.info que é caro)
    chave = f"info:{ticker.upper()}"
    em_cache = _cache_get(chave)
    if em_cache is not None:
        return em_cache

    try:
        info = yf.Ticker(ticker).info
        resultado = {
            "nome": info.get("longName") or info.get("shortName") or ticker,
            "simbolo": info.get("symbol", ticker),
            "mercado": info.get("exchange", "—"),
            "moeda": info.get("currency", "—"),
        }
        _cache_set(chave, resultado)
        return resultado
    except Exception:
        fallback = {"nome": ticker, "simbolo": ticker, "mercado": "—", "moeda": "—"}
        _cache_set(chave, fallback)
        return fallback


def _processar_resumo_ativo(ativo):
    """Função auxiliar que busca dados de UM ativo pro resumo do mercado."""
    try:
        candles = buscar_candles(ativo["ticker"], periodo="1mo", intervalo="1d")
        if not candles or len(candles) < 2:
            return None
        ultimo = candles[-1]
        anterior = candles[-2]
        fechamento = ultimo["fechamento"]
        variacao = ((fechamento - anterior["fechamento"]) / anterior["fechamento"]) * 100
        fechamentos = [c["fechamento"] for c in candles[-30:]]
        return {
            "ticker": ativo["ticker"],
            "nome": ativo["nome"],
            "simbolo": ativo["simbolo"],
            "mercado": ativo["mercado"],
            "moeda": ativo["moeda"],
            "preco": round(fechamento, 4),
            "variacao_pct": round(variacao, 2),
            "alta": variacao >= 0,
            "serie": fechamentos,
            "fonte": ultimo.get("fonte", "yahoo"),
        }
    except Exception as e:
        print(f"[Resumo] Erro {ativo['ticker']}: {e}")
        return None


def buscar_resumo_mercado():
    """
    Busca resumo de todos os ativos do MERCADO_PRINCIPAL em PARALELO.
    Tempo total ≈ tempo do ativo mais lento, não a soma de todos.
    """
    resultado = []
    # max_workers=10: suficiente pra 23 ativos sem stress no Yahoo/Binance
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submete todas as buscas e mantém a ordem original
        futuros = {
            executor.submit(_processar_resumo_ativo, ativo): ativo
            for ativo in MERCADO_PRINCIPAL
        }
        # Coleta na ordem original do MERCADO_PRINCIPAL
        mapa = {id(ativo): None for ativo in MERCADO_PRINCIPAL}
        for futuro in as_completed(futuros):
            ativo = futuros[futuro]
            dados = futuro.result()
            if dados is not None:
                mapa[id(ativo)] = dados

        # Devolve na mesma ordem da MERCADO_PRINCIPAL (UI mais previsível)
        for ativo in MERCADO_PRINCIPAL:
            if mapa[id(ativo)] is not None:
                resultado.append(mapa[id(ativo)])

    return resultado


def limpar_cache_fetcher():
    """Limpa o cache interno do fetcher (útil pra debug)."""
    total = len(_cache_fetcher)
    _cache_fetcher.clear()
    return total