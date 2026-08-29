"""
TRADEZEN — PADRÕES MARCADOS
=============================

Expõe (sem autenticação, é dado educativo público) os templates marcados
manualmente no admin — não é detecção automática, é o histórico real e
confirmado por um analista, plugado no gráfico que o usuário comum vê.

Os pontos são devolvidos com `timestamp` (não índice `i`), porque o índice
salvo é relativo ao recorte de candles daquele template — quem resolve pro
índice do candle que o usuário está vendo agora é o frontend.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, Request

from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(tags=["padroes-marcados"])


def _resultado_normalizado(texto: Optional[str]) -> str:
    if not texto:
        return "pendente"
    t = texto.lower()
    if "sucesso" in t:
        return "sucesso"
    if "falh" in t:
        return "falhou"
    return "pendente"


def _ponto_ts(candles_janela: List[Dict[str, Any]], ponto: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not ponto:
        return None
    idx = ponto.get("i")
    if idx is None or idx < 0 or idx >= len(candles_janela):
        return None
    return {"timestamp": candles_janela[idx]["timestamp"], "preco": ponto["preco"]}


# A marcação manual de OCO usa 7 pontos com nomes próprios (admin_templates.py
# / PontosOCO) — diferentes dos nomes que o desenho do gráfico principal
# espera (f0/ombro_esq/neck1/cabeca/neck2/ombro_dir/f_final, herdados do
# antigo detector automático em classicos.py). Aqui é só o "de-para" dos
# nomes; `inicio_ombro_dir` não tem par no desenho, fica de fora.
_MAPA_PONTOS_OCO = {
    "f0": "comeco",
    "ombro_esq": "topo_ombro_esq",
    "neck1": "fundo_ombro_esq",
    "cabeca": "topo_cabeca",
    "neck2": "fundo_cabeca",
    "ombro_dir": "topo_ombro_dir",
}


def _formatar_oco(row: Dict[str, Any]) -> Dict[str, Any]:
    # `pontos[k].i` é relativo ao recorte pequeno (`candles`), não ao
    # histórico completo (`candles_contexto`) — ver janelaDoPadrao() no
    # admin, que reindexa os pontos na hora de salvar.
    janela = row.get("candles") or []
    pontos = row.get("pontos") or {}
    pontos_ts = {
        chave_desenho: _ponto_ts(janela, pontos.get(chave_marcacao))
        for chave_desenho, chave_marcacao in _MAPA_PONTOS_OCO.items()
    }
    neck1, neck2 = pontos_ts.get("neck1"), pontos_ts.get("neck2")
    neckline = round((neck1["preco"] + neck2["preco"]) / 2, 4) if neck1 and neck2 else None
    return {
        "tipo": "OCO",
        "nome": "Ombro-Cabeça-Ombro",
        "resultado": _resultado_normalizado(row.get("resultado")),
        "confiabilidade": 100,
        "explicacao": row.get("observacao") or "Ombro-Cabeça-Ombro confirmado manualmente por um analista.",
        "neckline": neckline,
        "pontos": pontos_ts,
        "lampada": pontos_ts.get("cabeca"),
    }


def _formatar_topo_duplo(row: Dict[str, Any]) -> Dict[str, Any]:
    janela = row.get("candles") or []
    pontos = row.get("pontos") or {}
    pontos_ts = {k: _ponto_ts(janela, v) for k, v in pontos.items()}
    return {
        "tipo": "topo_duplo",
        "nome": "Topo Duplo",
        "resultado": _resultado_normalizado(row.get("resultado")),
        "confiabilidade": 100,
        "explicacao": row.get("observacao") or "Topo Duplo confirmado manualmente por um analista.",
        "pontos": pontos_ts,
        "lampada": pontos_ts.get("topo2"),
    }


def _formatar_bandeira(row: Dict[str, Any], tipo: str) -> Dict[str, Any]:
    janela = row.get("candles") or []
    pontos = row.get("pontos") or {}
    pontos_ts = {k: _ponto_ts(janela, v) for k, v in pontos.items()}
    nome = "Bandeira de Alta" if tipo == "bandeira_alta" else "Bandeira de Baixa"
    return {
        "tipo": tipo,
        "nome": nome,
        "resultado": _resultado_normalizado(row.get("resultado")),
        "confiabilidade": 100,
        "explicacao": row.get("observacao") or f"{nome} confirmada manualmente por um analista.",
        "pontos": pontos_ts,
        "lampada": pontos_ts.get("mastro_fim"),
    }


def _formatar_nivel(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Diferente do antigo detector automático (que desenhava uma reta de
    # preço atravessando o gráfico inteiro, sem limite de tempo), aqui é
    # fiel à marcação manual: uma faixa que só existe entre o primeiro e o
    # último toque marcado — por isso os toques vão como pontos com
    # timestamp, igual OCO/Topo Duplo, em vez de virar uma "reta" solta.
    janela = row.get("candles") or []
    toques = (row.get("pontos") or {}).get("toques", [])
    toques_ts = [t for t in (_ponto_ts(janela, p) for p in toques) if t]
    if len(toques_ts) < 2:
        return None

    tipo = row.get("tipo")
    nome = "Resistência" if tipo == "resistencia" else "Suporte"
    return {
        "tipo": tipo,
        "nome": nome,
        "resultado": _resultado_normalizado(row.get("resultado")),
        "confiabilidade": 100,
        "explicacao": row.get("observacao") or f"{nome} confirmado manualmente por um analista, com {len(toques_ts)} toques.",
        "pontos": {"toques": toques_ts},
    }


@router.get("/padroes-marcados/{ticker}")
@limiter.limit("60/minute")
def padroes_marcados(request: Request, ticker: str, timeframe: Optional[str] = Query(None)):
    """Templates marcados manualmente pro ticker — não é detecção automática."""
    ticker_norm = ticker.strip().upper()
    padroes: List[Dict[str, Any]] = []

    q = supabase.table("templates_oco").select("*").eq("ticker", ticker_norm)
    if timeframe:
        q = q.eq("timeframe", timeframe)
    for row in q.execute().data:
        padroes.append(_formatar_oco(row))

    q = supabase.table("templates_topo_duplo").select("*").eq("ticker", ticker_norm)
    if timeframe:
        q = q.eq("timeframe", timeframe)
    for row in q.execute().data:
        padroes.append(_formatar_topo_duplo(row))

    q = supabase.table("templates_niveis").select("*").eq("ticker", ticker_norm)
    if timeframe:
        q = q.eq("timeframe", timeframe)
    for row in q.execute().data:
        formatado = _formatar_nivel(row)
        if formatado:
            padroes.append(formatado)

    # try/except aqui (diferente das tabelas acima): templates_bandeira_alta
    # e templates_bandeira_baixa só existem depois que a migration
    # sql/006_templates_bandeira.sql rodar no Supabase — até lá, a tabela
    # não existe e o Supabase responde com erro. Sem o try/except, isso
    # derrubaria a rota inteira (500) pra QUALQUER ticker, pra todo mundo,
    # não só pra bandeira — mesmo sem nenhum template de bandeira marcado
    # ainda em lugar nenhum.
    for tabela, tipo in (("templates_bandeira_alta", "bandeira_alta"), ("templates_bandeira_baixa", "bandeira_baixa")):
        try:
            q = supabase.table(tabela).select("*").eq("ticker", ticker_norm)
            if timeframe:
                q = q.eq("timeframe", timeframe)
            for row in q.execute().data:
                padroes.append(_formatar_bandeira(row, tipo))
        except Exception:
            pass

    # "niveis" fica sempre vazio agora — era o campo do detector automático
    # antigo (reta infinita); os níveis marcados manualmente já vão em
    # "padroes", como faixas limitadas no tempo.
    return {"status": "ok", "padroes": padroes, "niveis": []}
