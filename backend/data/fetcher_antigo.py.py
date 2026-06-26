"""
TRADETEC — BUSCADOR DE DADOS
Fontes: Yahoo Finance (B3, Forex, Ações EUA, Commodities) + Binance (Cripto)
"""

import yfinance as yf
import requests
import pandas as pd
from datetime import datetime

MERCADO_PRINCIPAL = [
    {"ticker": "^BVSP",    "nome": "Ibovespa",     "simbolo": "IBOV",     "mercado": "B3",        "moeda": "BRL"},
    {"ticker": "BTC-USD",  "nome": "Bitcoin",      "simbolo": "BTC",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "ETH-USD",  "nome": "Ethereum",     "simbolo": "ETH",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "SOL-USD",  "nome": "Solana",       "simbolo": "SOL",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "BNB-USD",  "nome": "Binance Coin", "simbolo": "BNB",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "XRP-USD",  "nome": "Ripple",       "simbolo": "XRP",      "mercado": "CRIPTO",    "moeda": "USD"},
    {"ticker": "ADA-USD",  "nome": "Cardano",      "simbolo": "ADA",      "mercado": "CRIPTO",    "moeda": "USD"},
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
    {"ticker": "NG=F",     "nome": "Gás Natural",  "simbolo": "GÁS",      "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "ZC=F",     "nome": "Milho",        "simbolo": "MILHO",    "mercado": "COMMODITY", "moeda": "USD"},
    {"ticker": "ZS=F",     "nome": "Soja",         "simbolo": "SOJA",     "mercado": "COMMODITY", "moeda": "USD"},
]

BINANCE_URL = "https://api.binance.com/api/v3"
BINANCE_SYMBOLS = {
    "BTC-USD": "BTCUSDT", "ETH-USD": "ETHUSDT", "SOL-USD": "SOLUSDT",
    "BNB-USD": "BNBUSDT", "XRP-USD": "XRPUSDT", "ADA-USD": "ADAUSDT",
    "DOGE-USD": "DOGEUSDT", "AVAX-USD": "AVAXUSDT", "DOT-USD": "DOTUSDT",
}
BINANCE_INTERVALS = {
    "1m":"1m","5m":"5m","15m":"15m","1h":"1h","60m":"1h",
    "4h":"4h","1d":"1d","1wk":"1w",
}

def _eh_cripto(ticker):
    return ticker.upper() in BINANCE_SYMBOLS

def _buscar_binance(ticker, intervalo="1d", limite=200):
    symbol = BINANCE_SYMBOLS.get(ticker.upper())
    if not symbol:
        return []
    interval = BINANCE_INTERVALS.get(intervalo, "1d")
    try:
        resp = requests.get(f"{BINANCE_URL}/klines",
            params={"symbol": symbol, "interval": interval, "limit": limite},
            timeout=10)
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
                "fonte": "binance"
            })
        return candles
    except Exception as e:
        print(f"[Binance] Erro {ticker}: {e}")
        return []

def _buscar_yahoo(ticker, periodo="3mo", intervalo="1d"):
    try:
        df = yf.download(ticker, period=periodo, interval=intervalo,
                         auto_adjust=True, progress=False)
        if df.empty:
            return []
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.dropna(inplace=True)
        candles = []
        for idx, row in df.iterrows():
            ts = int(idx.timestamp() * 1000) if hasattr(idx, 'timestamp') else 0
            candles.append({
                "timestamp": ts,
                "data": idx.strftime("%Y-%m-%d %H:%M") if hasattr(idx, 'strftime') else str(idx),
                "abertura": round(float(row["Open"]), 4),
                "maxima": round(float(row["High"]), 4),
                "minima": round(float(row["Low"]), 4),
                "fechamento": round(float(row["Close"]), 4),
                "volume": int(float(row.get("Volume", 0))),
                "fonte": "yahoo"
            })
        return candles
    except Exception as e:
        print(f"[Yahoo] Erro {ticker}: {e}")
        return []

def buscar_candles(ticker, periodo="3mo", intervalo="1d"):
    if _eh_cripto(ticker):
        limites = {"1mo":30,"3mo":90,"6mo":180,"1y":365,"2y":500}
        limite = limites.get(periodo, 120)
        candles = _buscar_binance(ticker, intervalo, limite)
        if candles:
            return candles
    return _buscar_yahoo(ticker, periodo, intervalo)

def buscar_ativo_info(ticker):
    for m in MERCADO_PRINCIPAL:
        if m["ticker"].upper() == ticker.upper():
            return {"nome": m["nome"], "simbolo": m["simbolo"],
                    "mercado": m["mercado"], "moeda": m["moeda"]}
    try:
        info = yf.Ticker(ticker).info
        return {
            "nome": info.get("longName") or info.get("shortName") or ticker,
            "simbolo": info.get("symbol", ticker),
            "mercado": info.get("exchange", "—"),
            "moeda": info.get("currency", "—")
        }
    except:
        return {"nome": ticker, "simbolo": ticker, "mercado": "—", "moeda": "—"}

def buscar_resumo_mercado():
    resultado = []
    for ativo in MERCADO_PRINCIPAL:
        try:
            candles = buscar_candles(ativo["ticker"], periodo="1mo", intervalo="1d")
            if not candles or len(candles) < 2:
                continue
            ultimo = candles[-1]
            anterior = candles[-2]
            fechamento = ultimo["fechamento"]
            variacao = ((fechamento - anterior["fechamento"]) / anterior["fechamento"]) * 100
            fechamentos = [c["fechamento"] for c in candles[-30:]]
            resultado.append({
                "ticker": ativo["ticker"],
                "nome": ativo["nome"],
                "simbolo": ativo["simbolo"],
                "mercado": ativo["mercado"],
                "moeda": ativo["moeda"],
                "preco": round(fechamento, 4),
                "variacao_pct": round(variacao, 2),
                "alta": variacao >= 0,
                "serie": fechamentos,
                "fonte": ultimo.get("fonte", "yahoo")
            })
        except Exception as e:
            print(f"[Resumo] Erro {ativo['ticker']}: {e}")
            continue
    return resultado
