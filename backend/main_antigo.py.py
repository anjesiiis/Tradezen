"""
╔══════════════════════════════════════════════════════════════╗
║              TRADETEC — BACKEND API                         ║
║              FastAPI + Yahoo Finance + Binance              ║
╚══════════════════════════════════════════════════════════════╝

INSTALAÇÃO:
    pip install fastapi uvicorn yfinance pandas numpy requests python-dotenv

RODAR:
    uvicorn main:app --reload --port 8000

ENDPOINTS:
    GET /mercado              → resumo do mercado (página inicial)
    GET /ativo/{ticker}       → candles + padrões de um ativo
    GET /ativos/buscar?q=...  → busca de ativos
    GET /padroes/{ticker}     → só os padrões detectados
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn

from data.fetcher import buscar_candles, buscar_resumo_mercado, buscar_ativo_info
from patterns.detector import detectar_todos_padroes
from patterns.classicos import detectar_padroes_classicos

# ── APP ───────────────────────────────────────────────────────
app = FastAPI(
    title="TradeTec API",
    description="Backend de análise técnica — padrões gráficos",
    version="1.0.0"
)

# CORS — permite o frontend React conectar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROTAS ─────────────────────────────────────────────────────

@app.get("/")
def raiz():
    return {"status": "online", "produto": "TradeTec API", "versao": "1.0.0"}


@app.get("/mercado")
def resumo_mercado():
    """
    Retorna resumo do mercado para a página inicial.
    Inclui: IBOV, BTC, ETH, SOL, PETR4, VALE3, USD/BRL, EUR/USD
    """
    try:
        dados = buscar_resumo_mercado()
        return {"status": "ok", "dados": dados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ativo/{ticker}")
def dados_ativo(
    ticker: str,
    periodo: str = Query("3mo", description="1mo, 3mo, 6mo, 1y"),
    intervalo: str = Query("1d", description="1d, 1h, 60m")
):
    """
    Retorna candles + padrões detectados para um ativo.
    Exemplo: /ativo/PETR4.SA?periodo=3mo&intervalo=1d
    """
    try:
        # Busca candles
        candles = buscar_candles(ticker, periodo, intervalo)
        if not candles:
            raise HTTPException(status_code=404, detail=f"Ativo '{ticker}' não encontrado.")

        # Detecta padrões clássicos
        padroes_classicos = detectar_padroes_classicos(candles)

        # Info do ativo
        info = buscar_ativo_info(ticker)

        return {
            "status": "ok",
            "ticker": ticker.upper(),
            "info": info,
            "periodo": periodo,
            "intervalo": intervalo,
            "total_candles": len(candles),
            "candles": candles,
            "padroes": padroes_classicos,
            "total_padroes": len(padroes_classicos)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/padroes/{ticker}")
def padroes_ativo(
    ticker: str,
    periodo: str = Query("3mo"),
    intervalo: str = Query("1d")
):
    """
    Retorna apenas os padrões detectados, sem os candles completos.
    Mais leve — usado pra atualizar marcações no gráfico.
    """
    try:
        candles = buscar_candles(ticker, periodo, intervalo)
        if not candles:
            raise HTTPException(status_code=404, detail=f"Ativo '{ticker}' não encontrado.")

        padroes = detectar_padroes_classicos(candles)

        return {
            "status": "ok",
            "ticker": ticker.upper(),
            "padroes": padroes,
            "total": len(padroes)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ativos/buscar")
def buscar_ativo(q: str = Query(..., description="Nome ou ticker do ativo")):
    """
    Busca ativos por nome ou ticker.
    Exemplo: /ativos/buscar?q=petro
    """
    ATIVOS_DISPONIVEIS = [
        {"ticker": "^BVSP",    "nome": "Ibovespa",         "mercado": "B3",     "simbolo": "IBOV"},
        {"ticker": "PETR4.SA", "nome": "Petrobras PN",      "mercado": "B3",     "simbolo": "PETR4"},
        {"ticker": "VALE3.SA", "nome": "Vale ON",           "mercado": "B3",     "simbolo": "VALE3"},
        {"ticker": "ITUB4.SA", "nome": "Itaú Unibanco PN",  "mercado": "B3",     "simbolo": "ITUB4"},
        {"ticker": "BBDC4.SA", "nome": "Bradesco PN",       "mercado": "B3",     "simbolo": "BBDC4"},
        {"ticker": "MGLU3.SA", "nome": "Magazine Luiza ON", "mercado": "B3",     "simbolo": "MGLU3"},
        {"ticker": "BTC-USD",  "nome": "Bitcoin",           "mercado": "CRIPTO", "simbolo": "BTC"},
        {"ticker": "ETH-USD",  "nome": "Ethereum",          "mercado": "CRIPTO", "simbolo": "ETH"},
        {"ticker": "SOL-USD",  "nome": "Solana",            "mercado": "CRIPTO", "simbolo": "SOL"},
        {"ticker": "BNB-USD",  "nome": "Binance Coin",      "mercado": "CRIPTO", "simbolo": "BNB"},
        {"ticker": "USDBRL=X", "nome": "Dólar / Real",      "mercado": "FOREX",  "simbolo": "USD/BRL"},
        {"ticker": "EURUSD=X", "nome": "Euro / Dólar",      "mercado": "FOREX",  "simbolo": "EUR/USD"},
        {"ticker": "EURBRL=X", "nome": "Euro / Real",       "mercado": "FOREX",  "simbolo": "EUR/BRL"},
        {"ticker": "AAPL",     "nome": "Apple",             "mercado": "NYSE",   "simbolo": "AAPL"},
        {"ticker": "MSFT",     "nome": "Microsoft",         "mercado": "NASDAQ", "simbolo": "MSFT"},
        {"ticker": "NVDA",     "nome": "Nvidia",            "mercado": "NASDAQ", "simbolo": "NVDA"},
    ]

    q_lower = q.lower()
    resultados = [
        a for a in ATIVOS_DISPONIVEIS
        if q_lower in a["ticker"].lower() or q_lower in a["nome"].lower() or q_lower in a["simbolo"].lower()
    ]

    return {"status": "ok", "resultados": resultados, "total": len(resultados)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
