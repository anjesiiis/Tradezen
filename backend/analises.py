"""
TRADEUP — RESUMO DE ANÁLISES / PADRÕES DETECTADOS
=====================================================

Agrega os templates marcados manualmente (mesma fonte de padroes_marcados.py)
numa visão "todos os ativos de uma vez", pro Dashboard mostrar quais ativos
têm padrão sem precisar consultar ticker por ticker.

TODO: hoje isso é 100% templates marcados à mão no admin — não existe
detecção automática rodando em produção (ver backend/patterns/classicos.py,
que existe mas não está plugado em nenhuma rota, e backend/backtest.py, um
script solto). Quando o detector automático (ML de verdade) for ligado, os
campos abaixo continuam os mesmos — só troca a fonte de "templates_*" pelo
resultado do modelo. Enquanto a tabela não tiver dado real suficiente (ou
não tiver marcação feita justamente hoje), cada bloco cai pra um mock
realista, sinalizado por "hoje_mock"/"destaques_mock": true.
"""

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter

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
        return None  # padrão que não confirmou não é mais "detectado ativo"
    return {
        "ticker": (row.get("ticker") or "").upper(),
        "tipo": tipo,
        "status": "confirmado" if resultado == "sucesso" else "em_formacao",
        "criado_em": row.get("criado_em") or "",
    }


def _linhas_reais() -> List[Dict[str, Any]]:
    """Junta templates_oco/topo_duplo/niveis num formato comum. Qualquer
    falha no Supabase (tabela vazia é normal e ok; erro de rede/RLS não) faz
    cair pro mock em vez de derrubar o Dashboard inteiro."""
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
        print(f"[analises/resumo] Supabase indisponível, caindo pro mock: {e}")
        return []


def _mock_destaques() -> List[Dict[str, Any]]:
    base = [
        ("PETR4.SA", "OCO",        "confirmado",  87, 3),
        ("ITUB4.SA", "OCO",        "confirmado",  91, 2),
        ("BBDC4.SA", "topo_duplo", "confirmado",  82, 2),
        ("VALE3.SA", "topo_duplo", "em_formacao", 74, 2),
        ("WEGE3.SA", "OCO",        "em_formacao", 68, 2),
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


@router.get("/analises/resumo")
def resumo_analises():
    """
    Contagem de padrões pro Dashboard ("X padrões hoje · Y confirmados ·
    Z em formação") + destaques (ativos com 2+ padrões no histórico, pro
    card "Padrões Detectados") + mapa ticker->padrão (pra lâmpada nos
    cards de Principais Ativos, que não tem o filtro de 2+).
    """
    linhas = _linhas_reais()

    hoje_str = datetime.now(timezone.utc).date().isoformat()
    linhas_hoje = [l for l in linhas if l["criado_em"][:10] == hoje_str]
    hoje_mock = len(linhas_hoje) == 0
    if hoje_mock:
        hoje = {"total": 7, "confirmados": 5, "em_formacao": 2}
    else:
        hoje = {
            "total": len(linhas_hoje),
            "confirmados": sum(1 for l in linhas_hoje if l["status"] == "confirmado"),
            "em_formacao": sum(1 for l in linhas_hoje if l["status"] == "em_formacao"),
        }

    por_ticker_ocorrencias: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for l in linhas:
        por_ticker_ocorrencias[l["ticker"]].append(l)

    destaques_mock = not any(len(v) >= 2 for v in por_ticker_ocorrencias.values())
    if destaques_mock:
        destaques = _mock_destaques()
    else:
        destaques = []
        for ticker, ocorrencias in por_ticker_ocorrencias.items():
            if len(ocorrencias) < 2:
                continue
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
        destaques.sort(key=lambda d: d["total_padroes_historico"], reverse=True)

    por_ticker = {d["ticker"]: {"nome_curto": d["nome_curto"], "status": d["status"]} for d in destaques}
    if not destaques_mock:
        # Cobre também tickers com só 1 padrão — não entram em "destaques"
        # (mudança 1 pede 2+), mas o card de Principais Ativos ainda deve
        # mostrar a lâmpada (mudança 2 não tem esse filtro).
        for ticker, ocorrencias in por_ticker_ocorrencias.items():
            if ticker in por_ticker:
                continue
            recente = max(ocorrencias, key=lambda l: l["criado_em"])
            por_ticker[ticker] = {
                "nome_curto": NOME_CURTO.get(recente["tipo"], recente["tipo"][:3].upper()),
                "status": recente["status"],
            }

    return {
        "status": "ok",
        "hoje": hoje, "hoje_mock": hoje_mock,
        "destaques": destaques, "destaques_mock": destaques_mock,
        "por_ticker": por_ticker,
    }
