"""
TRADEZEN — TOP PADRÕES (ativos com mais padrões marcados)
==========================================================
Usado pela seção "Análise Técnica" (bloqueada) do Dashboard — mostra os 3
ativos com mais padrões no histórico, vindos das tabelas de templates do
admin (templates_oco/templates_topo_duplo/templates_niveis).

TODO: isso é 100% marcação manual no admin, não detecção automática (ver
backend/patterns/classicos.py, que existe mas não está plugado em nenhuma
rota, e backend/backtest.py, um script solto). Quando o detector automático
de verdade entrar, só troca a fonte de "templates_*" pelo resultado do
modelo — o formato da resposta continua o mesmo.
"""

from collections import defaultdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request

from rate_limit import limiter
from supabase_client import supabase
from data.fetcher import buscar_ativo_info
from padroes_marcados import _resultado_normalizado

router = APIRouter(tags=["analises"])

NOME_CURTO = {"OCO": "OCO", "topo_duplo": "TD", "suporte": "SUP", "resistencia": "RES"}
NOME_PADRAO = {
    "OCO": "Ombro-Cabeça-Ombro", "topo_duplo": "Topo Duplo",
    "suporte": "Suporte", "resistencia": "Resistência",
}


def _linha(row: Dict[str, Any], tipo: str) -> Optional[Dict[str, Any]]:
    resultado = _resultado_normalizado(row.get("resultado"))
    if resultado == "falhou":
        return None  # padrão que não confirmou não conta pro ranking
    return {
        "ticker": (row.get("ticker") or "").upper(),
        "tipo": tipo,
        "status": "confirmado" if resultado == "sucesso" else "em_formacao",
        "criado_em": row.get("criado_em") or "",
    }


def _linhas_reais() -> List[Dict[str, Any]]:
    """Junta as 3 tabelas de template num formato comum. Qualquer falha no
    Supabase (tabela vazia é normal; erro de rede/RLS não) cai pro mock em
    vez de derrubar o Dashboard."""
    try:
        linhas: List[Dict[str, Any]] = []
        for row in supabase.table("templates_oco").select("ticker,resultado,criado_em").execute().data:
            l = _linha(row, "OCO")
            if l:
                linhas.append(l)
        for row in supabase.table("templates_topo_duplo").select("ticker,resultado,criado_em").execute().data:
            l = _linha(row, "topo_duplo")
            if l:
                linhas.append(l)
        for row in supabase.table("templates_niveis").select("ticker,tipo,resultado,criado_em").execute().data:
            l = _linha(row, row.get("tipo") or "suporte")
            if l:
                linhas.append(l)
        return linhas
    except Exception as e:
        print(f"[analises/top-padroes] Supabase indisponível, caindo pro mock: {e}")
        return []


def _mock_top3() -> List[Dict[str, Any]]:
    base = [
        ("PETR4.SA", "OCO", "confirmado", 87, 3),
        ("VALE3.SA", "topo_duplo", "em_formacao", 74, 2),
        ("BTC-USD", "OCO", "confirmado", 91, 2),
    ]
    destaques = []
    for ticker, tipo, status, confianca, total in base:
        info = buscar_ativo_info(ticker)
        destaques.append({
            "ticker": ticker, "simbolo": info["simbolo"], "nome_ativo": info["nome"],
            "tipo": tipo, "nome_padrao": NOME_PADRAO[tipo], "nome_curto": NOME_CURTO[tipo],
            "status": status, "confianca": confianca, "total_padroes_historico": total,
        })
    return destaques


@router.get("/analises/top-padroes")
@limiter.limit("60/minute")
def top_padroes(request: Request):
    """Os 3 ativos com mais padrões marcados no histórico — pro card
    bloqueado 'Análise Técnica' do Dashboard."""
    linhas = _linhas_reais()

    por_ticker: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for l in linhas:
        por_ticker[l["ticker"]].append(l)

    if not por_ticker:
        return {"status": "ok", "mock": True, "destaques": _mock_top3()}

    ranking = sorted(por_ticker.items(), key=lambda kv: len(kv[1]), reverse=True)[:3]
    destaques = []
    for ticker, ocorrencias in ranking:
        recente = max(ocorrencias, key=lambda l: l["criado_em"])
        info = buscar_ativo_info(ticker)
        destaques.append({
            "ticker": ticker, "simbolo": info["simbolo"], "nome_ativo": info["nome"],
            "tipo": recente["tipo"],
            "nome_padrao": NOME_PADRAO.get(recente["tipo"], recente["tipo"]),
            "nome_curto": NOME_CURTO.get(recente["tipo"], recente["tipo"][:3].upper()),
            "status": recente["status"], "confianca": 100,
            "total_padroes_historico": len(ocorrencias),
        })
    return {"status": "ok", "mock": False, "destaques": destaques}
