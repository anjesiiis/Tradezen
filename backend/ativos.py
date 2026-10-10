"""Catálogo central de ativos do TradeZen.

É a ÚNICA lista de ativos do backend: a busca do site, o resumo da home e
a detecção de padrões saem todas daqui. Acrescentar um ativo novo é
acrescentar uma linha nesta lista — nada mais precisa mudar.

Cada ativo tem:
    ticker   — como o Yahoo/Binance conhece (ações BR levam ".SA", as dos
               EUA vão sem sufixo, cripto vai "-USD", forex "=X",
               commodity "=F", índice começa com "^")
    nome     — como aparece na tela
    simbolo  — a sigla curta (PETR4, BTC, OURO)
    mercado  — a categoria
    moeda    — em que moeda o preço está
    resumo   — entra na fileira de cotações da home (ver NOTA, abaixo)

NOTA sobre `resumo`: o /mercado busca TODOS os ativos marcados assim a
cada aquecimento, em paralelo. Com a lista inteira (quase 300) isso
viraria centenas de requisições ao Yahoo a cada ciclo — ele já derruba
algumas quando são 69. Por isso o resumo fica num subconjunto; o catálogo
completo serve à busca, ao gráfico e à detecção, que pedem um ativo por
vez.

Todos os tickers aqui foram conferidos um a um contra o Yahoo antes de
entrar. Os que saíram (e por quê): BRFS3 e MRFG3 viraram MBRF3 na fusão
Marfrig+BRF; GNDI3 foi incorporada pela Hapvida (HAPV3); CIEL3, CRFB3,
AZUL4 e GOLL4 fecharam capital ou saíram de negociação; NTCO3 virou
NATU3; JBSS3 virou o BDR JBSS32; MATIC-USD virou Polygon (ainda sem
cotação no Yahoo) e UNI-USD virou UNI7083-USD.
"""

# Teto de histórico por timeframe, medido contra o Yahoo (PETR4.SA):
#     max  1d  → 6.719 candles, desde 2000
#     5y   1d  → 1.248 candles
#     max  1wk → 1.397 candles, desde 2000
#     60d  60m →   413 candles
#     5y   60m →       VAZIO  ← é por isso que existe este teto
# Ou seja: diário e semanal não têm limite prático (dá pra pedir "max"),
# mas intraday de 60 minutos o Yahoo só devolve dos últimos 60 dias de
# graça — e devolve VAZIO em vez de erro quando se pede mais, o que faz o
# gráfico abrir em branco e parecer ativo sem dados.
# Teto de histórico por timeframe intraday, medido contra o Yahoo. Pedir
# mais do que isso volta VAZIO (não dá erro), e o gráfico abriria em
# branco parecendo ativo sem dados.
PERIODO_MAXIMO = {"1m": "5d", "5m": "60d", "15m": "60d", "60m": "60d"}

# O que a detecção de padrões pede. Diário com 5 anos é o que dá exemplo
# suficiente de padrão estrutural sem puxar histórico que já não se parece
# com o mercado de hoje.
PERIODO_PADRAO = {"1d": "5y", "1wk": "5y", "60m": "60d"}

# Ordem de grandeza dos períodos, pra saber qual é "maior" que qual
_ESCALA = {"5d": 1, "1mo": 2, "60d": 3, "3mo": 4, "6mo": 5, "1y": 6, "2y": 7, "3y": 8, "5y": 9, "max": 10}


def periodo_valido(intervalo: str, periodo: str) -> str:
    """Corta o período pedido no máximo que o provedor devolve de graça.

    Sem isto, 60m com periodo=5y voltava uma lista VAZIA do Yahoo — o
    gráfico abria em branco e parecia ativo sem dados.
    """
    teto = PERIODO_MAXIMO.get(intervalo)
    if not teto:
        return periodo
    if _ESCALA.get(periodo, 0) > _ESCALA.get(teto, 99):
        return teto
    return periodo


ATIVOS = [
    # ── ÍNDICES (12) ─────────────────────────────────────
    {"ticker": "^BVSP", "nome": "Ibovespa", "simbolo": "IBOV", "mercado": "INDICE", "moeda": "BRL", "resumo": True },
    {"ticker": "^DJI", "nome": "Dow Jones", "simbolo": "DJI", "mercado": "INDICE", "moeda": "USD", "resumo": False},
    {"ticker": "^FCHI", "nome": "CAC 40", "simbolo": "^FCHI", "mercado": "INDICE", "moeda": "EUR", "resumo": False},
    {"ticker": "^FTSE", "nome": "FTSE 100", "simbolo": "FTSE", "mercado": "INDICE", "moeda": "GBP", "resumo": False},
    {"ticker": "^GDAXI", "nome": "DAX", "simbolo": "DAX", "mercado": "INDICE", "moeda": "EUR", "resumo": False},
    {"ticker": "^GSPC", "nome": "S&P 500", "simbolo": "SPX", "mercado": "INDICE", "moeda": "USD", "resumo": False},
    {"ticker": "^HSI", "nome": "Hang Seng", "simbolo": "HSI", "mercado": "INDICE", "moeda": "HKD", "resumo": False},
    {"ticker": "^IXIC", "nome": "Nasdaq Composite", "simbolo": "NASDAQ", "mercado": "INDICE", "moeda": "USD", "resumo": False},
    {"ticker": "^N225", "nome": "Nikkei 225", "simbolo": "NIKKEI", "mercado": "INDICE", "moeda": "JPY", "resumo": False},
    {"ticker": "^RUT", "nome": "Russell 2000", "simbolo": "RUT", "mercado": "INDICE", "moeda": "USD", "resumo": False},
    {"ticker": "^STOXX50E", "nome": "Euro Stoxx 50", "simbolo": "^STOXX50E", "mercado": "INDICE", "moeda": "EUR", "resumo": False},
    {"ticker": "^VIX", "nome": "VIX (volatilidade)", "simbolo": "VIX", "mercado": "INDICE", "moeda": "USD", "resumo": False},

    # ── AÇÕES — B3 (Brasil) (105) ─────────────────────────
    {"ticker": "ABEV3.SA", "nome": "Ambev ON", "simbolo": "ABEV3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "ALOS3.SA", "nome": "Allos ON", "simbolo": "ALOS3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "ALPA4.SA", "nome": "Alpargatas PN", "simbolo": "ALPA4", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "ARML3.SA", "nome": "Armac ON", "simbolo": "ARML3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "ASAI3.SA", "nome": "Assaí ON", "simbolo": "ASAI3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "AURE3.SA", "nome": "Auren ON", "simbolo": "AURE3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "AZZA3.SA", "nome": "Azzas 2154 ON", "simbolo": "AZZA3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "B3SA3.SA", "nome": "B3 ON", "simbolo": "B3SA3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "BBAS3.SA", "nome": "Banco do Brasil ON", "simbolo": "BBAS3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "BBDC3.SA", "nome": "Bradesco ON", "simbolo": "BBDC3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "BBDC4.SA", "nome": "Bradesco PN", "simbolo": "BBDC4", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "BBSE3.SA", "nome": "BB Seguridade ON", "simbolo": "BBSE3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "BEEF3.SA", "nome": "Minerva ON", "simbolo": "BEEF3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "BPAC11.SA", "nome": "BTG Pactual UNT", "simbolo": "BPAC11", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "BRAP4.SA", "nome": "Bradespar PN", "simbolo": "BRAP4", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "BRAV3.SA", "nome": "Brava Energia ON", "simbolo": "BRAV3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "BRKM5.SA", "nome": "Braskem PNA", "simbolo": "BRKM5", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "CASH3.SA", "nome": "Méliuz ON", "simbolo": "CASH3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CBAV3.SA", "nome": "CBA ON", "simbolo": "CBAV3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CEAB3.SA", "nome": "C&A ON", "simbolo": "CEAB3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CMIG4.SA", "nome": "Cemig PN", "simbolo": "CMIG4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CMIN3.SA", "nome": "CSN Mineração ON", "simbolo": "CMIN3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "COGN3.SA", "nome": "Cogna ON", "simbolo": "COGN3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "CPFE3.SA", "nome": "CPFL Energia ON", "simbolo": "CPFE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "CPLE3.SA", "nome": "Copel ON", "simbolo": "CPLE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "CSAN3.SA", "nome": "Cosan ON", "simbolo": "CSAN3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CSMG3.SA", "nome": "Copasa ON", "simbolo": "CSMG3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CSNA3.SA", "nome": "CSN ON", "simbolo": "CSNA3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CVCB3.SA", "nome": "CVC Brasil ON", "simbolo": "CVCB3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "CYRE3.SA", "nome": "Cyrela ON", "simbolo": "CYRE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "DIRR3.SA", "nome": "Direcional ON", "simbolo": "DIRR3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "DXCO3.SA", "nome": "Dexco ON", "simbolo": "DXCO3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "ECOR3.SA", "nome": "EcoRodovias ON", "simbolo": "ECOR3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "ENEV3.SA", "nome": "Eneva ON", "simbolo": "ENEV3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "ENGI11.SA", "nome": "Energisa UNT", "simbolo": "ENGI11", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "EQTL3.SA", "nome": "Equatorial ON", "simbolo": "EQTL3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "EZTC3.SA", "nome": "EZTEC ON", "simbolo": "EZTC3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "FLRY3.SA", "nome": "Fleury ON", "simbolo": "FLRY3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "GGBR4.SA", "nome": "Gerdau PN", "simbolo": "GGBR4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "GMAT3.SA", "nome": "Grupo Mateus ON", "simbolo": "GMAT3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "GOAU3.SA", "nome": "Gerdau Metalúrgica ON", "simbolo": "GOAU3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "GOAU4.SA", "nome": "Gerdau Metalúrgica PN", "simbolo": "GOAU4", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "GRND3.SA", "nome": "Grendene ON", "simbolo": "GRND3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "HAPV3.SA", "nome": "Hapvida ON", "simbolo": "HAPV3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "HYPE3.SA", "nome": "Hypera ON", "simbolo": "HYPE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "IGTI11.SA", "nome": "Iguatemi UNT", "simbolo": "IGTI11", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "INTB3.SA", "nome": "Intelbras ON", "simbolo": "INTB3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "IRBR3.SA", "nome": "IRB Brasil ON", "simbolo": "IRBR3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "ISAE4.SA", "nome": "ISA Energia PN", "simbolo": "ISAE4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "ITSA4.SA", "nome": "Itaúsa PN", "simbolo": "ITSA4", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "ITUB3.SA", "nome": "Itaú Unibanco ON", "simbolo": "ITUB3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "ITUB4.SA", "nome": "Itaú Unibanco PN", "simbolo": "ITUB4", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "JBSS32.SA", "nome": "JBS BDR", "simbolo": "JBSS32", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "JHSF3.SA", "nome": "JHSF ON", "simbolo": "JHSF3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "KLBN11.SA", "nome": "Klabin UNT", "simbolo": "KLBN11", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "KLBN3.SA", "nome": "Klabin ON", "simbolo": "KLBN3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "LJQQ3.SA", "nome": "Lojas Quero-Quero ON", "simbolo": "LJQQ3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "LREN3.SA", "nome": "Lojas Renner ON", "simbolo": "LREN3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "LWSA3.SA", "nome": "Locaweb ON", "simbolo": "LWSA3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "MBRF3.SA", "nome": "MBRF (Marfrig+BRF) ON", "simbolo": "MBRF3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "MDIA3.SA", "nome": "M. Dias Branco ON", "simbolo": "MDIA3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "MGLU3.SA", "nome": "Magazine Luiza ON", "simbolo": "MGLU3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "MOTV3.SA", "nome": "Motiva ON", "simbolo": "MOTV3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "MRVE3.SA", "nome": "MRV Engenharia ON", "simbolo": "MRVE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "MULT3.SA", "nome": "Multiplan ON", "simbolo": "MULT3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "NATU3.SA", "nome": "Natura ON", "simbolo": "NATU3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "ONCO3.SA", "nome": "Oncoclínicas ON", "simbolo": "ONCO3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "PCAR3.SA", "nome": "Pão de Açúcar ON", "simbolo": "PCAR3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "PETR3.SA", "nome": "Petrobras ON", "simbolo": "PETR3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "PETR4.SA", "nome": "Petrobras PN", "simbolo": "PETR4", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "POMO4.SA", "nome": "Marcopolo PN", "simbolo": "POMO4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "PRIO3.SA", "nome": "PetroRio ON", "simbolo": "PRIO3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "PSSA3.SA", "nome": "Porto Seguro ON", "simbolo": "PSSA3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "QUAL3.SA", "nome": "Qualicorp ON", "simbolo": "QUAL3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "RADL3.SA", "nome": "Raia Drogasil ON", "simbolo": "RADL3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "RAIL3.SA", "nome": "Rumo ON", "simbolo": "RAIL3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "RAIZ4.SA", "nome": "Raízen PN", "simbolo": "RAIZ4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "RAPT4.SA", "nome": "Randon PN", "simbolo": "RAPT4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "RDOR3.SA", "nome": "Rede D'Or ON", "simbolo": "RDOR3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "RENT3.SA", "nome": "Localiza ON", "simbolo": "RENT3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "SANB11.SA", "nome": "Santander Brasil UNT", "simbolo": "SANB11", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "SANB3.SA", "nome": "Santander Brasil ON", "simbolo": "SANB3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "SBSP3.SA", "nome": "Sabesp ON", "simbolo": "SBSP3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "SIMH3.SA", "nome": "Simpar ON", "simbolo": "SIMH3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "SLCE3.SA", "nome": "SLC Agrícola ON", "simbolo": "SLCE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "SMFT3.SA", "nome": "Smart Fit ON", "simbolo": "SMFT3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "SMTO3.SA", "nome": "São Martinho ON", "simbolo": "SMTO3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "SUZB3.SA", "nome": "Suzano ON", "simbolo": "SUZB3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "TAEE11.SA", "nome": "Taesa UNT", "simbolo": "TAEE11", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "TAEE4.SA", "nome": "Taesa PN", "simbolo": "TAEE4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "TEND3.SA", "nome": "Tenda ON", "simbolo": "TEND3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "TIMS3.SA", "nome": "TIM ON", "simbolo": "TIMS3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "TOTS3.SA", "nome": "Totvs ON", "simbolo": "TOTS3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "TUPY3.SA", "nome": "Tupy ON", "simbolo": "TUPY3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "UGPA3.SA", "nome": "Ultrapar ON", "simbolo": "UGPA3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "UNIP6.SA", "nome": "Unipar PNB", "simbolo": "UNIP6", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "USIM5.SA", "nome": "Usiminas PNA", "simbolo": "USIM5", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "VALE3.SA", "nome": "Vale ON", "simbolo": "VALE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "VAMO3.SA", "nome": "Vamos ON", "simbolo": "VAMO3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "VBBR3.SA", "nome": "Vibra Energia ON", "simbolo": "VBBR3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "VIVA3.SA", "nome": "Vivara ON", "simbolo": "VIVA3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "VIVT3.SA", "nome": "Telefônica Brasil ON", "simbolo": "VIVT3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "WEGE3.SA", "nome": "WEG ON", "simbolo": "WEGE3", "mercado": "B3", "moeda": "BRL", "resumo": True },
    {"ticker": "WIZC3.SA", "nome": "Wiz ON", "simbolo": "WIZC3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "YDUQ3.SA", "nome": "Yduqs ON", "simbolo": "YDUQ3", "mercado": "B3", "moeda": "BRL", "resumo": True },

    {"ticker": "EGIE3.SA", "nome": "Engie Brasil ON", "simbolo": "EGIE3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "RECV3.SA", "nome": "PetroRecôncavo ON", "simbolo": "RECV3", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "SAPR4.SA", "nome": "Sanepar PN", "simbolo": "SAPR4", "mercado": "B3", "moeda": "BRL", "resumo": False},
    {"ticker": "SAPR11.SA", "nome": "Sanepar UNT", "simbolo": "SAPR11", "mercado": "B3", "moeda": "BRL", "resumo": False},

    # ── AÇÕES — NYSE (EUA) (50) ──────────────────────────
    {"ticker": "ABBV", "nome": "AbbVie", "simbolo": "ABBV", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "ABT", "nome": "Abbott", "simbolo": "ABT", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "BA", "nome": "Boeing", "simbolo": "BA", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "BAC", "nome": "Bank of America", "simbolo": "BAC", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "BLK", "nome": "BlackRock", "simbolo": "BLK", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "BRK-B", "nome": "Berkshire Hathaway B", "simbolo": "BRK.B", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "C", "nome": "Citigroup", "simbolo": "C", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "CAT", "nome": "Caterpillar", "simbolo": "CAT", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "COST", "nome": "Costco", "simbolo": "COST", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "CRM", "nome": "Salesforce", "simbolo": "CRM", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "CVX", "nome": "Chevron", "simbolo": "CVX", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "DE", "nome": "John Deere", "simbolo": "DE", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "DIS", "nome": "Walt Disney", "simbolo": "DIS", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "F", "nome": "Ford", "simbolo": "F", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "GE", "nome": "General Electric", "simbolo": "GE", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "GM", "nome": "General Motors", "simbolo": "GM", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "GOLD", "nome": "Barrick Gold", "simbolo": "GOLD", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "GS", "nome": "Goldman Sachs", "simbolo": "GS", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "HD", "nome": "Home Depot", "simbolo": "HD", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "HON", "nome": "Honeywell", "simbolo": "HON", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "JNJ", "nome": "Johnson & Johnson", "simbolo": "JNJ", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "JPM", "nome": "JPMorgan Chase", "simbolo": "JPM", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "KO", "nome": "Coca-Cola", "simbolo": "KO", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "LLY", "nome": "Eli Lilly", "simbolo": "LLY", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "LMT", "nome": "Lockheed Martin", "simbolo": "LMT", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "LOW", "nome": "Lowe's", "simbolo": "LOW", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "MA", "nome": "Mastercard", "simbolo": "MA", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "MCD", "nome": "McDonald's", "simbolo": "MCD", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "MMM", "nome": "3M", "simbolo": "MMM", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "MRK", "nome": "Merck", "simbolo": "MRK", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "MS", "nome": "Morgan Stanley", "simbolo": "MS", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "NKE", "nome": "Nike", "simbolo": "NKE", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "ORCL", "nome": "Oracle", "simbolo": "ORCL", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "PFE", "nome": "Pfizer", "simbolo": "PFE", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "PG", "nome": "Procter & Gamble", "simbolo": "PG", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "RTX", "nome": "RTX", "simbolo": "RTX", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "SBUX", "nome": "Starbucks", "simbolo": "SBUX", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "SCHW", "nome": "Charles Schwab", "simbolo": "SCHW", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "SPY", "nome": "SPDR S&P 500 ETF", "simbolo": "SPY", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "T", "nome": "AT&T", "simbolo": "T", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "TGT", "nome": "Target", "simbolo": "TGT", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "TMO", "nome": "Thermo Fisher", "simbolo": "TMO", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "UBER", "nome": "Uber", "simbolo": "UBER", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "UNH", "nome": "UnitedHealth", "simbolo": "UNH", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "UPS", "nome": "UPS", "simbolo": "UPS", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "V", "nome": "Visa", "simbolo": "V", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "VZ", "nome": "Verizon", "simbolo": "VZ", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "WFC", "nome": "Wells Fargo", "simbolo": "WFC", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "WMT", "nome": "Walmart", "simbolo": "WMT", "mercado": "NYSE", "moeda": "USD", "resumo": False},
    {"ticker": "XOM", "nome": "Exxon Mobil", "simbolo": "XOM", "mercado": "NYSE", "moeda": "USD", "resumo": False},

    # ── AÇÕES — NASDAQ (EUA) (31) ────────────────────────
    {"ticker": "AAPL", "nome": "Apple", "simbolo": "AAPL", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "ABNB", "nome": "Airbnb", "simbolo": "ABNB", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "ADBE", "nome": "Adobe", "simbolo": "ADBE", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "AMAT", "nome": "Applied Materials", "simbolo": "AMAT", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "AMD", "nome": "AMD", "simbolo": "AMD", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "AMGN", "nome": "Amgen", "simbolo": "AMGN", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "AMZN", "nome": "Amazon", "simbolo": "AMZN", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "AVGO", "nome": "Broadcom", "simbolo": "AVGO", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "BKNG", "nome": "Booking", "simbolo": "BKNG", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "COIN", "nome": "Coinbase", "simbolo": "COIN", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "CSCO", "nome": "Cisco", "simbolo": "CSCO", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "GOOGL", "nome": "Alphabet (Google)", "simbolo": "GOOGL", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "INTC", "nome": "Intel", "simbolo": "INTC", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "ISRG", "nome": "Intuitive Surgical", "simbolo": "ISRG", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "MELI", "nome": "MercadoLibre", "simbolo": "MELI", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "META", "nome": "Meta Platforms", "simbolo": "META", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "MRNA", "nome": "Moderna", "simbolo": "MRNA", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "MSFT", "nome": "Microsoft", "simbolo": "MSFT", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "MU", "nome": "Micron", "simbolo": "MU", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "NFLX", "nome": "Netflix", "simbolo": "NFLX", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "NVDA", "nome": "Nvidia", "simbolo": "NVDA", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "PEP", "nome": "PepsiCo", "simbolo": "PEP", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "PLTR", "nome": "Palantir", "simbolo": "PLTR", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "PYPL", "nome": "PayPal", "simbolo": "PYPL", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "QCOM", "nome": "Qualcomm", "simbolo": "QCOM", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "QQQ", "nome": "Invesco QQQ ETF", "simbolo": "QQQ", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "RIVN", "nome": "Rivian", "simbolo": "RIVN", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "SBAC", "nome": "SBA Comm", "simbolo": "SBAC", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "SHOP", "nome": "Shopify", "simbolo": "SHOP", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "TSLA", "nome": "Tesla", "simbolo": "TSLA", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},
    {"ticker": "TXN", "nome": "Texas Instruments", "simbolo": "TXN", "mercado": "NASDAQ", "moeda": "USD", "resumo": False},

    # ── CRIPTOMOEDAS (29) ────────────────────────────────
    {"ticker": "AAVE-USD", "nome": "Aave", "simbolo": "AAVE-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "ADA-USD", "nome": "Cardano", "simbolo": "ADA", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },
    {"ticker": "ALGO-USD", "nome": "Algorand", "simbolo": "ALGO-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "ARB-USD", "nome": "Arbitrum", "simbolo": "ARB-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "ATOM-USD", "nome": "Cosmos", "simbolo": "ATOM", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "AVAX-USD", "nome": "Avalanche", "simbolo": "AVAX", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },
    {"ticker": "BCH-USD", "nome": "Bitcoin Cash", "simbolo": "BCH", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "BNB-USD", "nome": "Binance Coin", "simbolo": "BNB", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },
    {"ticker": "BTC-USD", "nome": "Bitcoin", "simbolo": "BTC", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },
    {"ticker": "DOGE-USD", "nome": "Dogecoin", "simbolo": "DOGE", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },
    {"ticker": "DOT-USD", "nome": "Polkadot", "simbolo": "DOT", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "ETC-USD", "nome": "Ethereum Classic", "simbolo": "ETC", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "ETH-USD", "nome": "Ethereum", "simbolo": "ETH", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },
    {"ticker": "FIL-USD", "nome": "Filecoin", "simbolo": "FIL", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "HBAR-USD", "nome": "Hedera", "simbolo": "HBAR-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "ICP-USD", "nome": "Internet Computer", "simbolo": "ICP-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "INJ-USD", "nome": "Injective", "simbolo": "INJ-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "LINK-USD", "nome": "Chainlink", "simbolo": "LINK", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "LTC-USD", "nome": "Litecoin", "simbolo": "LTC", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "NEAR-USD", "nome": "NEAR", "simbolo": "NEAR", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "OP-USD", "nome": "Optimism", "simbolo": "OP-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "SAND-USD", "nome": "The Sandbox", "simbolo": "SAND-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "SHIB-USD", "nome": "Shiba Inu", "simbolo": "SHIB-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "SOL-USD", "nome": "Solana", "simbolo": "SOL", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },
    {"ticker": "TRX-USD", "nome": "TRON", "simbolo": "TRX", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "UNI7083-USD", "nome": "Uniswap", "simbolo": "UNI", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "VET-USD", "nome": "VeChain", "simbolo": "VET-USD", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "XLM-USD", "nome": "Stellar", "simbolo": "XLM", "mercado": "CRIPTO", "moeda": "USD", "resumo": False},
    {"ticker": "XRP-USD", "nome": "Ripple", "simbolo": "XRP", "mercado": "CRIPTO", "moeda": "USD", "resumo": True },

    # ── MOEDAS (forex) (30) ──────────────────────────────
    {"ticker": "AUDCAD=X", "nome": "Dólar australiano/Canadense", "simbolo": "AUDCAD=X", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "AUDJPY=X", "nome": "Dólar Australiano / Iene", "simbolo": "AUD/JPY", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "AUDUSD=X", "nome": "Dólar Australiano / Dólar", "simbolo": "AUD/USD", "mercado": "FOREX", "moeda": "USD", "resumo": True },
    {"ticker": "CADJPY=X", "nome": "Dólar canadense/Iene", "simbolo": "CAD/JPY", "mercado": "FOREX", "moeda": "JPY", "resumo": False},
    {"ticker": "CHFJPY=X", "nome": "Franco Suíço / Iene", "simbolo": "CHF/JPY", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "EURBRL=X", "nome": "Euro / Real", "simbolo": "EUR/BRL", "mercado": "FOREX", "moeda": "BRL", "resumo": True },
    {"ticker": "EURCAD=X", "nome": "Euro/Dólar canadense", "simbolo": "EURCAD=X", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "EURCHF=X", "nome": "Euro/Franco suíço", "simbolo": "EUR/CHF", "mercado": "FOREX", "moeda": "CHF", "resumo": False},
    {"ticker": "EURGBP=X", "nome": "Euro / Libra", "simbolo": "EUR/GBP", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "EURJPY=X", "nome": "Euro / Iene", "simbolo": "EUR/JPY", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "EURUSD=X", "nome": "Euro / Dólar", "simbolo": "EUR/USD", "mercado": "FOREX", "moeda": "USD", "resumo": True },
    {"ticker": "GBPBRL=X", "nome": "Libra / Real", "simbolo": "GBP/BRL", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "GBPJPY=X", "nome": "Libra / Iene", "simbolo": "GBP/JPY", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "GBPUSD=X", "nome": "Libra / Dólar", "simbolo": "GBP/USD", "mercado": "FOREX", "moeda": "USD", "resumo": True },
    {"ticker": "NZDUSD=X", "nome": "Dólar Neozelandês / Dólar", "simbolo": "NZD/USD", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "USDARS=X", "nome": "Dólar/Peso argentino", "simbolo": "USD/ARS", "mercado": "FOREX", "moeda": "ARS", "resumo": False},
    {"ticker": "USDBRL=X", "nome": "USD/BRL", "simbolo": "USD/BRL", "mercado": "FOREX", "moeda": "BRL", "resumo": True },
    {"ticker": "USDCAD=X", "nome": "Dólar / Dólar Canadense", "simbolo": "USD/CAD", "mercado": "FOREX", "moeda": "CAD", "resumo": True },
    {"ticker": "USDCHF=X", "nome": "Dólar / Franco Suíço", "simbolo": "USD/CHF", "mercado": "FOREX", "moeda": "CHF", "resumo": True },
    {"ticker": "USDCNY=X", "nome": "Dólar / Yuan", "simbolo": "USD/CNY", "mercado": "FOREX", "moeda": "CNY", "resumo": True },
    {"ticker": "USDHKD=X", "nome": "Dólar / Dólar de Hong Kong", "simbolo": "USD/HKD", "mercado": "FOREX", "moeda": "HKD", "resumo": True },
    {"ticker": "USDINR=X", "nome": "Dólar / Rupia Indiana", "simbolo": "USD/INR", "mercado": "FOREX", "moeda": "INR", "resumo": True },
    {"ticker": "USDJPY=X", "nome": "Dólar / Iene", "simbolo": "USD/JPY", "mercado": "FOREX", "moeda": "JPY", "resumo": True },
    {"ticker": "USDKRW=X", "nome": "Dólar / Won Sul-Coreano", "simbolo": "USD/KRW", "mercado": "FOREX", "moeda": "KRW", "resumo": True },
    {"ticker": "USDMXN=X", "nome": "Dólar / Peso Mexicano", "simbolo": "USD/MXN", "mercado": "FOREX", "moeda": "MXN", "resumo": True },
    {"ticker": "USDNOK=X", "nome": "Dólar/Coroa norueguesa", "simbolo": "USDNOK=X", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "USDSEK=X", "nome": "Dólar/Coroa sueca", "simbolo": "USDSEK=X", "mercado": "FOREX", "moeda": "USD", "resumo": False},
    {"ticker": "USDSGD=X", "nome": "Dólar / Dólar de Cingapura", "simbolo": "USD/SGD", "mercado": "FOREX", "moeda": "SGD", "resumo": True },
    {"ticker": "USDTRY=X", "nome": "Dólar/Lira turca", "simbolo": "USD/TRY", "mercado": "FOREX", "moeda": "TRY", "resumo": False},
    {"ticker": "USDZAR=X", "nome": "Dólar / Rand Sul-Africano", "simbolo": "USD/ZAR", "mercado": "FOREX", "moeda": "ZAR", "resumo": True },

    # ── COMMODITIES (21) ─────────────────────────────────
    {"ticker": "BZ=F", "nome": "Petróleo Brent", "simbolo": "BRENT", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "CC=F", "nome": "Cacau", "simbolo": "CACAU", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "CL=F", "nome": "Petróleo WTI", "simbolo": "WTI", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "CT=F", "nome": "Algodão", "simbolo": "ALGODAO", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "GC=F", "nome": "Ouro (futuro)", "simbolo": "OURO", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "HG=F", "nome": "Cobre (futuro)", "simbolo": "COBRE", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "HO=F", "nome": "Óleo de aquecimento", "simbolo": "HO=F", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "KC=F", "nome": "Café", "simbolo": "CAFE", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "LE=F", "nome": "Boi gordo (CME)", "simbolo": "BOI", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "NG=F", "nome": "Gás Natural", "simbolo": "GAS", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "OJ=F", "nome": "Suco de laranja", "simbolo": "SUCO", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "PA=F", "nome": "Paládio", "simbolo": "PALADIO", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "PL=F", "nome": "Platina (futuro)", "simbolo": "PLATINA", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "RB=F", "nome": "Gasolina RBOB", "simbolo": "RB=F", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "SB=F", "nome": "Açúcar", "simbolo": "ACUCAR", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "SI=F", "nome": "Prata (futuro)", "simbolo": "PRATA", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "ZC=F", "nome": "Milho", "simbolo": "MILHO", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "ZL=F", "nome": "Óleo de soja", "simbolo": "ZL=F", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "ZM=F", "nome": "Farelo de soja", "simbolo": "FARELO", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},
    {"ticker": "ZS=F", "nome": "Soja", "simbolo": "SOJA", "mercado": "COMMODITY", "moeda": "USD", "resumo": True },
    {"ticker": "ZW=F", "nome": "Trigo", "simbolo": "TRIGO", "mercado": "COMMODITY", "moeda": "USD", "resumo": False},

]

# Subconjunto que alimenta a fileira de cotações da home (ver NOTA acima)
DO_RESUMO = [a for a in ATIVOS if a["resumo"]]

_POR_TICKER = {a["ticker"].upper(): a for a in ATIVOS}


def por_ticker(ticker: str):
    return _POR_TICKER.get((ticker or "").upper())


def por_mercado(mercado: str):
    alvo = (mercado or "").upper()
    return [a for a in ATIVOS if a["mercado"].upper() == alvo]
