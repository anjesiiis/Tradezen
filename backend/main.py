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
# "5d" e "60d" são os tetos dos intraday (ver PERIODO_MAXIMO/_ESCALA em
# ativos.py) — e justamente eles faltavam aqui. O frontend pedia
# periodo=60d&intervalo=60m e levava 422: TODOS os tempos intraday (1m,
# 5m, 15m, 60m) abriam o gráfico em branco, só o diário e o semanal
# funcionavam. A regra do projeto sempre contou com os dois; era a lista
# aceita pela rota que estava fora de sincronia com ela.
PeriodoAtivo = Literal["5d", "1mo", "60d", "3mo", "6mo", "1y", "2y", "3y", "5y", "max"]
IntervaloAtivo = Literal["1m", "5m", "15m", "60m", "1d", "1wk"]
import uvicorn
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from ativos import ATIVOS
from data.fetcher import _eh_cripto, buscar_candles, buscar_candles_em_lote, buscar_pagina_cripto, buscar_resumo_mercado, buscar_ativo_info, limpar_cache_fetcher
from patterns.classicos import detectar_padroes_classicos
from patterns.consolidacao import detectar_consolidacoes
from patterns.reversao import detectar_reversoes
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
from admin_templates_extras import ROUTERS as admin_templates_extras_routers
from admin_templates_fracasso import ROUTERS as admin_templates_fracasso_routers
from admin_templates_canal_baixa import router as admin_templates_canal_baixa_router
from admin_usuarios import router as admin_usuarios_router
from padroes_marcados import router as padroes_marcados_router
from planos import router as usuario_router
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
# Fundo duplo, OCO invertido, topos/fundos triplos, triângulos e retângulo
for _router in admin_templates_extras_routers:
    app.include_router(_router)
# Fracassos — o que PARECE um padrão e não é (hard negatives de forma)
for _router in admin_templates_fracasso_routers:
    app.include_router(_router)
app.include_router(padroes_marcados_router)
# Plano do usuário logado (/eu) e o painel de planos do admin
app.include_router(usuario_router)
app.include_router(admin_usuarios_router)
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


def _aquecer_volateis():
    """Deixa o ranking de cada grupo pronto ANTES de alguém pedir.

    A primeira pessoa a abrir a busca não tem por que pagar a busca
    inteira: aqui ela já encontra o ranking feito. Roda na mesma thread do
    resumo, e depois dele, pra não disputarem o Yahoo ao mesmo tempo.
    """
    for grupo in GRUPOS_VOLATEIS:
        if cache_get(f"volateis:{grupo}:5", TTL_CURTO) is not None:
            continue
        try:
            _medir_grupo(grupo, 5)
        except Exception as e:
            print(f"[aquecimento] volateis de {grupo} falhou: {e}")


def _loop_aquecimento():
    while True:
        try:
            _resumo_mercado_atualizado()
        except Exception as e:  # nunca deixa a thread morrer
            print(f"[aquecimento] resumo de mercado falhou: {e}")
        try:
            _aquecer_volateis()
        except Exception as e:
            print(f"[aquecimento] volateis falharam: {e}")
        time.sleep(_INTERVALO_AQUECIMENTO)


# A thread arranca no FIM do arquivo (ver o final de main.py): ela chama
# _aquecer_volateis, que depende de coisas definidas mais abaixo. Arrancar
# aqui seria uma corrida com o próprio import.


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
    periodo: PeriodoAtivo = Query("5y", description="5d, 1mo, 60d, 3mo, 6mo, 1y, 2y, 3y, 5y, max"),
    intervalo: IntervaloAtivo = Query("1d", description="1m, 5m, 15m, 60m, 1d, 1wk")
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


@app.get("/detectar/{ticker}")
@limiter.limit("30/minute")
def detectar_padroes(
    request: Request,
    ticker: str,
    periodo: PeriodoAtivo = Query("5y"),
    intervalo: IntervaloAtivo = Query("1d"),
    janela: int = Query(5, ge=2, le=20, description="sensibilidade dos pivôs"),
):
    """Roda os detectores automáticos no histórico do ativo.

    Cobertos hoje: OCO (patterns/classicos.py), os quatro de reversão
    (patterns/reversao.py) e os quatro de consolidação
    (patterns/consolidacao.py). Bandeira, flâmula, cunha, canal e topo
    duplo ainda dependem do modelo que está sendo treinado com os
    templates marcados à mão — por isso a rota devolve `cobertos`: a tela
    só promete o que alguém realmente procurou.
    """
    chave_cache = f"detectar:{ticker}:{periodo}:{intervalo}:{janela}"
    em_cache = cache_get(chave_cache, TTL_MEDIO)
    if em_cache is not None:
        return {**em_cache, "cache": True}

    candles = buscar_candles(ticker, periodo, intervalo)
    if not candles:
        raise HTTPException(status_code=404, detail=f"Ativo '{ticker}' não encontrado.")

    achados = (
        detectar_padroes_classicos(candles, janela=janela)
        + detectar_reversoes(candles, janela=janela)
        + detectar_consolidacoes(candles, janela=janela)
    )
    # o índice do candle não serve pra outra janela de tempo; o timestamp sim
    for p in achados:
        intervalo_c = p.get("intervalo_candles") or {}
        for chave in ("inicio", "fim"):
            i = intervalo_c.get(chave)
            if isinstance(i, int) and 0 <= i < len(candles):
                intervalo_c[f"{chave}_timestamp"] = candles[i]["timestamp"]
        for nome, ponto in (p.get("pontos") or {}).items():
            i = ponto.get("i") if isinstance(ponto, dict) else None
            if isinstance(i, int) and 0 <= i < len(candles):
                ponto["timestamp"] = candles[i]["timestamp"]

    resposta = {
        "status": "ok",
        "ticker": ticker.upper(),
        "total_candles": len(candles),
        "cobertos": [
            "oco", "fundo_duplo", "oco_invertido", "topo_triplo", "fundo_triplo",
            "triangulo_ascendente", "triangulo_descendente", "triangulo_simetrico",
            "retangulo",
        ],
        "padroes": achados,
    }
    cache_set(chave_cache, resposta)
    return resposta


@app.get("/ativo/{ticker}/pagina")
@limiter.limit("60/minute")
def pagina_de_candles(
    request: Request,
    ticker: str,
    intervalo: IntervaloAtivo = Query("60m", description="1m, 5m, 15m, 60m, 1d, 1wk"),
    antes_de: Optional[int] = Query(None, description="timestamp em ms — devolve os candles ANTES dele"),
    limite: int = Query(1000, ge=1, le=1000, description="candles por página (teto da Binance)"),
):
    """Uma página de candles, do mais recente pro passado.

    É o que deixa o gráfico abrir rápido num intraday longo: a primeira
    tela vem no /ativo/{ticker} e o resto chega conforme se rola pra
    trás. Sem `antes_de` vem a página mais recente; depois, passando o
    timestamp do candle mais antigo que já se tem, vem a anterior.

    Só cripto: o histórico vem da Binance, que dá anos de intraday de
    graça. Ação e forex vêm do Yahoo, que corta 60 minutos em 60 dias
    (ver PERIODO_MAXIMO em ativos.py) — ali a primeira resposta já traz
    tudo o que existe, e paginar não acrescentaria nada.
    """
    if not _eh_cripto(ticker):
        raise HTTPException(
            status_code=400,
            detail=f"Paginação só existe para cripto. Para '{ticker}', use /ativo/{ticker} — "
                   "o histórico do Yahoo já vem inteiro na primeira resposta.",
        )

    chave_cache = f"pagina:{ticker}:{intervalo}:{antes_de}:{limite}"
    em_cache = cache_get(chave_cache, TTL_LONGO)
    if em_cache is not None:
        return {**em_cache, "cache": True}

    try:
        candles, tem_mais = buscar_pagina_cripto(ticker, intervalo, antes_de, limite)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Binance indisponível: {e}")

    if candles is None:
        raise HTTPException(status_code=404, detail=f"'{ticker}' não existe na Binance.")

    resposta = {
        "status": "ok",
        "ticker": ticker.upper(),
        "intervalo": intervalo,
        "candles": candles,
        "total": len(candles),
        # palpite honesto: a página veio cheia, então provavelmente ainda
        # há passado. A Binance não informa isso.
        "tem_mais": tem_mais,
        "mais_antigo_ts": candles[0]["timestamp"] if candles else None,
    }
    cache_set(chave_cache, resposta)
    return {**resposta, "cache": False}


# ─────────────────────────────────────────────────────────────────────
# TOP 5 MAIS VOLÁTEIS DO DIA — por grupo de mercado
#
# Volatilidade do dia = (máxima − mínima) ÷ abertura × 100. É a amplitude
# do pregão, não a direção: um papel que abriu a 10, foi a 11, caiu a 9 e
# fechou a 10 teve 20% de volatilidade e 0% de variação. É justamente o
# que interessa a quem procura movimento pra estudar.
#
# O universo sai do catálogo único (ativos.py), e não de uma lista nova
# aqui: ativo acrescentado lá entra neste ranking sozinho.
# ─────────────────────────────────────────────────────────────────────

# Quantos ativos de cada grupo entram na conta. Vinte e quatro é o ponto
# em que o ranking ainda significa alguma coisa e a resposta ainda chega:
# a B3 sozinha tem 109 papéis no catálogo, e buscar os 109 a cada clique
# derrubaria metade das requisições no Yahoo.
TETO_DO_UNIVERSO = 24

GRUPOS_VOLATEIS = {
    "b3":        ("B3",),
    "eua":       ("NYSE", "NASDAQ"),
    "forex":     ("FOREX",),
    "cripto":    ("CRIPTO",),
    "commodity": ("COMMODITY",),
    "indice":    ("INDICE",),
}


def _universo_do_grupo(grupo: str):
    """Os ativos daquele grupo, os do resumo primeiro.

    `resumo: True` marca os que o dono já escolheu como representativos —
    são eles que entram na fileira de cotações da home. Usar essa mesma
    escolha aqui evita inventar um segundo critério de "quais importam".
    """
    mercados = GRUPOS_VOLATEIS[grupo]
    do_grupo = [a for a in ATIVOS if a.get("mercado", "").upper() in mercados]
    do_grupo.sort(key=lambda a: not a.get("resumo"))
    return do_grupo[:TETO_DO_UNIVERSO]


def _volatilidade_do_candle(c):
    """Devolve (volatilidade, variação) em %, ou None se o candle não presta."""
    abertura, maxima = c.get("abertura"), c.get("maxima")
    minima, fechamento = c.get("minima"), c.get("fechamento")
    if not all(isinstance(v, (int, float)) for v in (abertura, maxima, minima, fechamento)):
        return None
    if abertura <= 0 or maxima < minima:
        return None
    return (
        (maxima - minima) / abertura * 100,
        (fechamento - abertura) / abertura * 100,
    )


@app.get("/mercados/top-volateis/{grupo}")
@limiter.limit("30/minute")
async def top_volateis(
    request: Request,
    grupo: str,
    limite: int = Query(5, ge=1, le=20),
):
    """Os ativos que mais se mexeram no último pregão daquele grupo."""
    grupo = grupo.lower()
    if grupo not in GRUPOS_VOLATEIS:
        raise HTTPException(
            status_code=404,
            detail=f"Grupo '{grupo}' não existe. Use: {', '.join(GRUPOS_VOLATEIS)}",
        )

    # Cache do RANKING pronto, além do cache por ativo que o fetcher já
    # tem. Sem ele, cada clique num ponto do globo refaz 24 leituras de
    # cache e 24 contas — barato, mas desnecessário a cada abertura.
    chave_cache = f"volateis:{grupo}:{limite}"
    em_cache = cache_get(chave_cache, TTL_CURTO)
    if em_cache is not None:
        return {**em_cache, "cache": True}

    loop = asyncio.get_event_loop()
    resposta = await loop.run_in_executor(None, _medir_grupo, grupo, limite)
    return {**resposta, "cache": False}


# Uma busca por grupo de cada vez. Sem isto, a thread de aquecimento e um
# visitante podiam medir o MESMO grupo ao mesmo tempo, e o Yahoo responde
# mal quando as requisições se atropelam: medido, o grupo caía de 24
# ativos válidos pra 17. O segundo a chegar espera o primeiro e aproveita
# o resultado, em vez de martelar o Yahoo em dobro.
_locks_volateis = {g: threading.Lock() for g in GRUPOS_VOLATEIS}


def _medir_grupo(grupo: str, limite: int = 5):
    """Mede o grupo inteiro e devolve o ranking pronto, já cacheado."""
    chave_cache = f"volateis:{grupo}:{limite}"
    with _locks_volateis[grupo]:
        # Quem esperou na porta não refaz a busca: ela acabou de rodar.
        ja_pronto = cache_get(chave_cache, TTL_CURTO)
        if ja_pronto is not None:
            return ja_pronto
        resposta = _medir_grupo_sem_trava(grupo, limite)
        if resposta["top"]:
            cache_set(chave_cache, resposta)
        return resposta


def _medir_grupo_sem_trava(grupo: str, limite: int):
    universo = _universo_do_grupo(grupo)

    # Em LOTE, e não um ativo por vez. Medido com os 24 primeiros papéis
    # da B3: 24 requisições simultâneas levavam de 3 a 11 segundos e
    # traziam 14 ativos; uma requisição em lote leva 1,9 e traz os 24. O
    # Yahoo recusa parte das requisições quando elas chegam juntas, então
    # o jeito antigo não era só lento — apagava 10 ativos do ranking em
    # silêncio, e o ranking saía errado.
    #
    # 5 dias é o bastante: só o último candle entra na conta, e os outros
    # são a folga pra feriado e fim de semana.
    por_ticker = buscar_candles_em_lote([a["ticker"] for a in universo], "5d", "1d")

    def medir(ativo):
        try:
            candles = por_ticker.get(ativo["ticker"])
            if not candles:
                return None
            ultimo = candles[-1]
            medida = _volatilidade_do_candle(ultimo)
            if medida is None:
                return None
            volatilidade, variacao = medida
            return {
                "ticker": ativo["ticker"],
                "simbolo": ativo.get("simbolo") or ativo["ticker"],
                "nome": ativo.get("nome") or ativo["ticker"],
                "moeda": ativo.get("moeda", ""),
                "preco": ultimo["fechamento"],
                "maxima": ultimo["maxima"],
                "minima": ultimo["minima"],
                "variacao_pct": round(variacao, 2),
                "volatilidade_pct": round(volatilidade, 2),
                "volume": ultimo.get("volume", 0),
                "pregao": ultimo.get("data", ""),
            }
        except Exception:
            # Um ativo que falhou não derruba o ranking inteiro — ele só
            # não entra. É o Yahoo recusando uma requisição no meio de 24.
            return None

    # A conta em si é aritmética em cima de dado que já está na memória —
    # não precisa de thread nenhuma.
    validos = [m for m in (medir(a) for a in universo) if m]
    validos.sort(key=lambda m: m["volatilidade_pct"], reverse=True)

    return {
        "status": "ok",
        "grupo": grupo,
        "formula": "(máxima − mínima) ÷ abertura",
        "total_analisados": len(universo),
        "total_validos": len(validos),
        # A data do pregão medido: é ela que diz à tela se o número é de
        # hoje ou do último dia em que o mercado abriu.
        "pregao": validos[0]["pregao"] if validos else "",
        "top": validos[:limite],
    }


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
    # O fetcher tem cache PRÓPRIO, de 5 minutos. Sem limpar os dois, esta
    # rota dizia ter limpado tudo e a requisição seguinte continuava
    # respondendo de memória — o que fazia uma medição "a frio" parecer
    # rápida sem nunca ter ido ao Yahoo.
    do_fetcher = limpar_cache_fetcher()
    return {"status": "ok", "removidos": total, "removidos_fetcher": do_fetcher}


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


# ── AQUECIMENTO ───────────────────────────────────────────────
# No fim de tudo, de propósito: a thread usa funções e constantes
# definidas ao longo do arquivo, e começar antes seria uma corrida com o
# import do próprio módulo.
threading.Thread(target=_loop_aquecimento, daemon=True).start()
