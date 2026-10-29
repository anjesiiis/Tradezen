"""
TRADETEC — BUSCADOR DE DADOS
Fontes: Yahoo Finance (B3, Forex, Ações EUA, Commodities) + Binance (Cripto)

v1.1 — Paralelismo com ThreadPoolExecutor + cache interno
"""

import math
import yfinance as yf

from ativos import DO_RESUMO, periodo_valido, por_ticker
import requests
import pandas as pd
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Os ativos vêm todos do catálogo central (backend/ativos.py). Aqui fica
# só o subconjunto do resumo da home: é a lista que o aquecimento busca
# inteira, em paralelo, a cada ciclo — com os quase 300 do catálogo isso
# viraria centenas de requisições ao Yahoo por ciclo, e ele já derruba
# algumas quando são 69.
MERCADO_PRINCIPAL = DO_RESUMO

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
    """Busca candles da Binance, paginando pra trás com `endTime` quando
    limite > 1000 (o cap da API por request). Pra pra na primeira página
    incompleta — sinal de que já chegou no início do histórico do par."""
    symbol = BINANCE_SYMBOLS.get(ticker.upper())
    if not symbol:
        return []
    interval = BINANCE_INTERVALS.get(intervalo, "1d")
    try:
        klines = []
        end_time = None
        restante = limite
        while restante > 0:
            pedido = min(restante, 1000)
            params = {"symbol": symbol, "interval": interval, "limit": pedido}
            if end_time is not None:
                params["endTime"] = end_time
            resp = requests.get(f"{BINANCE_URL}/klines", params=params, timeout=10)
            resp.raise_for_status()
            lote = resp.json()
            if not lote:
                break
            klines = lote + klines
            end_time = lote[0][0] - 1
            restante -= len(lote)
            if len(lote) < pedido:
                break  # veio menos que o pedido: chegou no início do histórico

        return [_kline_para_candle(k) for k in klines[-limite:]]
    except Exception as e:
        print(f"[Binance] Erro {ticker}: {e}")
        return []


def _kline_para_candle(k):
    """Formato da Binance → o formato interno do TradeZen."""
    return {
        "timestamp": int(k[0]),
        "data": datetime.fromtimestamp(k[0] / 1000).strftime("%Y-%m-%d %H:%M"),
        "abertura": float(k[1]),
        "maxima": float(k[2]),
        "minima": float(k[3]),
        "fechamento": float(k[4]),
        "volume": float(k[5]),
        "fonte": "binance",
    }


def buscar_pagina_cripto(ticker, intervalo="60m", antes_de=None, limite=1000):
    """Uma página de candles de cripto, do mais recente pro passado.

    É o que permite o gráfico abrir rápido e ir buscando o resto
    conforme se rola pra trás: sem `antes_de` vem a página mais recente;
    depois, passando o timestamp do candle mais antigo que já se tem,
    vem a anterior.

    Devolve (candles, tem_mais). `tem_mais` é um palpite honesto: veio a
    página cheia, provavelmente ainda há passado — a Binance não diz.
    """
    symbol = BINANCE_SYMBOLS.get(ticker.upper())
    if not symbol:
        return None, False   # None = ticker que a Binance não conhece

    limite = max(1, min(int(limite), 1000))   # 1000 é o teto da API por request
    params = {
        "symbol": symbol,
        "interval": BINANCE_INTERVALS.get(intervalo, "1h"),
        "limit": limite,
    }
    if antes_de:
        # -1 pra não repetir o candle que o frontend já tem na ponta
        params["endTime"] = int(antes_de) - 1

    resp = requests.get(f"{BINANCE_URL}/klines", params=params, timeout=15)
    resp.raise_for_status()
    lote = resp.json()
    return [_kline_para_candle(k) for k in lote], len(lote) == limite


def _numero_valido(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v > 0


def _sanear_candles(candles):
    """Tira do caminho preço que não pode existir.

    Um único candle com mínima zero destrói a escala do gráfico inteiro:
    o eixo passa a ir de zero ao topo histórico, os candles de verdade
    viram um risco fino lá em cima, e o volume (que divide o eixo) vai
    parar fora do lugar. Não é hipótese — é o que o Yahoo devolve HOJE na
    vela semanal em formação de toda ação da B3:

        2026-10-26  abertura 205070  máxima 205089  mínima 0  fechamento 171006

    Abertura, máxima e fechamento batem com os diários da mesma semana; só
    a mínima vem zerada. Então o candle não é lixo, é um candle com um
    campo faltando — e jogá-lo fora apagaria a semana corrente de todo
    ativo brasileiro. O que falta se repõe pelo que sobrou; o que não dá
    pra repor cai fora.
    """
    saida = []
    for c in candles:
        abertura, maxima = c.get("abertura"), c.get("maxima")
        minima, fechamento = c.get("minima"), c.get("fechamento")

        # Sem abertura ou sem fechamento não há candle: não dá pra deduzir
        # o corpo a partir de nada.
        if not _numero_valido(abertura) or not _numero_valido(fechamento):
            continue

        # As DUAS pontas quebradas é outra coisa: é o pregão que o Yahoo
        # publica antes de começar de fato, sem faixa de preço nenhuma, só
        # com o último preço no fechamento. Esse candle sai fora — era o
        # que o código já fazia no diário, e continua fazendo.
        if not _numero_valido(maxima) and not _numero_valido(minima):
            continue

        # Uma ponta só quebrada se deduz do corpo: a máxima nunca é menor
        # que o maior dos dois, a mínima nunca é maior que o menor. É o
        # candle mais conservador compatível com o que sobrou — pavio curto
        # demais, nunca um extremo inventado.
        topo_do_corpo = max(abertura, fechamento)
        base_do_corpo = min(abertura, fechamento)
        if not _numero_valido(maxima) or maxima < topo_do_corpo:
            maxima = topo_do_corpo
        if not _numero_valido(minima) or minima > base_do_corpo:
            minima = base_do_corpo

        if maxima < minima:
            continue

        novo = {**c, "abertura": abertura, "maxima": maxima,
                "minima": minima, "fechamento": fechamento}
        # Marca o que foi remendado: é o sinal pra quem puder buscar o
        # valor de verdade (ver _refinar_ultima_vela).
        if (maxima, minima) != (c.get("maxima"), c.get("minima")):
            novo["reparado"] = True
        saida.append(novo)
    return saida


def _refinar_ultima_vela(ticker, candles, intervalo):
    """Reconstrói a vela em formação a partir dos candles diários.

    O remendo de _sanear_candles devolve o pavio mais curto possível, não
    o de verdade: no IBOV de hoje dá mínima 171.006 onde os diários da
    mesma semana mostram 169.516 — 0,87% de diferença, bem no lugar onde
    alguém traça um suporte. Os diários são a mesma fonte e já estão em
    cache na maioria das vezes (quem abre o semanal quase sempre viu o
    diário antes), então sai barato buscar o número certo.

    Se não der, fica o remendo: gráfico com pavio curto é um detalhe;
    gráfico com escala destruída é a tela inteira.
    """
    if intervalo not in ("1wk", "1w", "1mo") or not candles:
        return candles
    if not candles[-1].get("reparado"):
        return candles
    try:
        diarios = buscar_candles(ticker, "1mo", "1d")
        inicio = candles[-1]["timestamp"]
        da_vela = [d for d in diarios if d.get("timestamp", 0) >= inicio]
        if not da_vela:
            return candles
        ultima = {
            **candles[-1],
            "abertura": da_vela[0]["abertura"],
            "maxima": max(d["maxima"] for d in da_vela),
            "minima": min(d["minima"] for d in da_vela),
            "fechamento": da_vela[-1]["fechamento"],
        }
        ultima.pop("reparado", None)
        return candles[:-1] + [ultima]
    except Exception as e:
        print(f"[Yahoo] Nao deu pra refinar a ultima vela de {ticker}: {e}")
        return candles


def _buscar_yahoo(ticker, periodo="3mo", intervalo="1d", tentativas=2):
    """Busca candles do Yahoo Finance.

    `tentativas`: quando várias buscas rodam em paralelo (ex: resumo do
    mercado, um ThreadPoolExecutor por ativo), o Yahoo às vezes derruba
    ALGUMAS das requisições simultâneas mesmo com o ticker certo — testado
    isoladamente e em sequência, o mesmo ticker que falhou no paralelo
    funciona de primeira. Uma retentativa rápida resolve a maioria desses
    casos sem esconder erro de verdade (ticker inválido continua falhando
    nas duas tentativas).
    """
    for tentativa in range(tentativas):
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
                raise ValueError("resposta vazia")
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

            return _sanear_candles(candles)
        except Exception as e:
            if tentativa + 1 < tentativas:
                time.sleep(0.6)
                continue
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
        # A Binance pede QUANTIDADE de candles, não período. Com o mapa
        # antigo (só períodos longos, 1 candle = 1 dia), qualquer timeframe
        # intraday caía no padrão de 365 candles — 1 minuto virava 6 horas
        # de gráfico. Agora a conta é dias × candles por dia.
        dias = {
            "5d": 5, "1mo": 30, "60d": 60, "3mo": 90, "6mo": 180,
            "1y": 365, "2y": 730, "3y": 1095, "5y": 1825, "10y": 3650, "max": 3650,
        }.get(periodo, 365)
        por_dia = {"1m": 1440, "5m": 288, "15m": 96, "60m": 24, "1h": 24, "4h": 6}.get(intervalo, 1)
        if intervalo in ("1wk", "1w"):
            por_dia = 1 / 7
        # A Binance dá muito mais histórico que o Yahoo, e sem custo:
        # 26.280 = 3 anos de 60 minutos (1.095 dias × 24). O gráfico
        # aguenta porque o frontend carrega o resto sob demanda, conforme
        # se rola pro passado (ver /ativo/{ticker}/pagina).
        TETO_CANDLES_CRIPTO = 26_280
        limite = max(1, min(TETO_CANDLES_CRIPTO, int(dias * por_dia)))
        candles = _buscar_binance(ticker, intervalo, limite)
        if candles:
            _cache_set(chave, candles)
            return candles
        # Fallback pro Yahoo se Binance falhar

    # Pedir mais histórico do que o provedor dá de graça volta VAZIO (não
    # dá erro): 60m com 5y, por exemplo. O corte é aqui, num lugar só.
    candles = _buscar_yahoo(ticker, periodo_valido(intervalo, periodo), intervalo)
    candles = _refinar_ultima_vela(ticker, candles, intervalo)
    if candles:
        _cache_set(chave, candles)
    return candles


def buscar_ativo_info(ticker):
    """Pega info básica (nome, mercado, moeda). Sem ida à internet quando possível."""
    # O catálogo inteiro (282 ativos), não só os do resumo: assim o nome de
    # um ativo cadastrado nunca depende de uma consulta ao Yahoo.
    do_catalogo = por_ticker(ticker)
    if do_catalogo:
        return {
            "nome": do_catalogo["nome"], "simbolo": do_catalogo["simbolo"],
            "mercado": do_catalogo["mercado"], "moeda": do_catalogo["moeda"],
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
    # max_workers=6 (era 10) — com 10 threads batendo no Yahoo ao mesmo
    # tempo, ele começou a derrubar algumas das requisições simultâneas
    # (confirmado: os mesmos tickers funcionam de primeira quando testados
    # em sequência). Menos concorrência + retry em _buscar_yahoo juntos
    # resolvem a maioria das falhas sem deixar a busca muito mais lenta.
    with ThreadPoolExecutor(max_workers=6) as executor:
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

    # Segunda chance pros que falharam. Sem isso, um tropeço do Yahoo ou da
    # Binance em uma das threads some com o ativo da tela até a próxima
    # rodada de aquecimento — era por isso que o Bitcoin (e mais uns nove)
    # desapareciam do /mercado e o card do topo ficava vazio. Aqui a
    # tentativa é em sequência e só com os que faltaram: são poucos, e sem
    # concorrência o provedor costuma responder.
    faltando = [a for a in MERCADO_PRINCIPAL if mapa[id(a)] is None]
    for ativo in faltando:
        dados = _processar_resumo_ativo(ativo)
        if dados is not None:
            mapa[id(ativo)] = dados
    if faltando:
        ainda_sem = sum(1 for a in faltando if mapa[id(a)] is None)
        print(f"[Resumo] {len(faltando)} falharam na 1ª rodada, {ainda_sem} continuaram sem dados")

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