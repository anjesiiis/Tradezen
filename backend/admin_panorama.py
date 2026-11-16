"""TRADEZEN — PANORAMA DAS MARCAÇÕES (o Cérebro de Detecções)

Um pedido só com o placar de cada FAMÍLIA de padrão: quantas marcações,
quantas deram certo, quantas não, e a data da última. É o que o painel do
cérebro desenha — sem isto a tela faria 21 pedidos, um por tabela.

NÃO É DETECÇÃO AUTOMÁTICA. Tudo aqui é contagem do que foi marcado à mão;
não há modelo, não há inferência. O nome "cérebro" é da ilustração.

A classificação de `resultado` repete a do frontend (admin/resultado.js)
porque a coluna é TEXTO LIVRE e quem conta tem de entender o mesmo texto.
Duas listas de palavras que divergem fariam o placar do cérebro discordar
do placar da lista logo ao lado — por isso existe um teste que compara as
duas listas, e ele quebra se alguém mexer num lado só.

FALHA É TESTADA PRIMEIRO: "não teve sucesso" contém "sucesso".
"""
from __future__ import annotations

import re
import time
import unicodedata
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request

from admin_auth import require_admin
from admin_status_revisao import TABELAS
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(prefix="/admin/panorama", tags=["admin-panorama"],
                   dependencies=[Depends(require_admin)])

# As quatro famílias do desenho. Uma tabela em nenhuma família não aparece
# no cérebro, mas continua na lista do padrão dela — o cérebro é resumo,
# não é a verdade sobre o que existe.
FAMILIAS: Dict[str, Dict[str, Any]] = {
    "continuacao": {
        "nome": "Continuação",
        "tabelas": [
            "templates_bandeira_alta", "templates_bandeira_baixa",
            "templates_flamula_alta", "templates_flamula_baixa",
            "templates_cunha_alta", "templates_cunha_baixa",
        ],
    },
    "reversao": {
        "nome": "Reversão",
        "tabelas": [
            "templates_oco", "templates_oco_invertido",
            "templates_topo_duplo", "templates_fundo_duplo",
            "templates_topo_triplo", "templates_fundo_triplo",
        ],
    },
    "niveis": {
        "nome": "Suporte e Resistência",
        "tabelas": ["templates_niveis", "templates_retangulo"],
    },
    "triangulos": {
        "nome": "Canais e Triângulos",
        "tabelas": [
            "templates_canal_alta", "templates_canal_baixa",
            "templates_triangulo_ascendente", "templates_triangulo_descendente",
            "templates_triangulo_simetrico",
        ],
    },
}

# Meta por família. É só a régua da barrinha de progresso; ninguém é
# impedido de passar dela.
META = 100

FALHA = [r"falh", r"fracass", r"\bnao\b", r"\bsem\b", r"\berrou\b", r"\bruim\b",
         r"invalid", r"\bstop\b", r"\bperdeu\b", r"\bnegativ"]
SUCESSO = [r"\bsuc", r"\bcerto\b", r"funcionou", r"confirm", r"\bandou\b", r"\bok\b",
           r"\bbom\b", r"\batingiu\b", r"\balvo\b", r"\bganhou\b", r"\bpositiv"]


def _normalizar(texto: Optional[str]) -> str:
    sem_acento = unicodedata.normalize("NFD", str(texto or ""))
    sem_acento = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    return sem_acento.lower().strip()


def classificar_resultado(texto: Optional[str]) -> str:
    t = _normalizar(texto)
    if not t:
        return "indefinido"
    if any(re.search(p, t) for p in FALHA):
        return "falha"
    if any(re.search(p, t) for p in SUCESSO):
        return "sucesso"
    return "indefinido"


# Cache curto: o cérebro é um resumo, e 21 consultas por recarga de página
# seria custo sem retorno. 60s é menos que o tempo de marcar um template,
# então ninguém vê número velho do próprio trabalho.
_CACHE: Dict[str, Any] = {"em": 0.0, "dados": None}
_VALIDADE = 60.0


def _contar_tabela(tabela: str) -> Dict[str, Any]:
    """Conta uma tabela. Tabela que não existe conta zero em vez de estourar:
    o cérebro é um painel, e painel que derruba a tela por causa de uma
    migration que ainda não rodou é pior que painel com um lobo vazio."""
    try:
        resp = supabase.table(tabela).select("resultado,criado_em").execute()
        linhas: List[dict] = resp.data or []
    except Exception:
        return {"total": 0, "sucesso": 0, "falha": 0, "indefinido": 0, "ultimo": None, "faltando": True}

    contas = {"sucesso": 0, "falha": 0, "indefinido": 0}
    ultimo = None
    for linha in linhas:
        contas[classificar_resultado(linha.get("resultado"))] += 1
        criado = linha.get("criado_em")
        if criado and (ultimo is None or criado > ultimo):
            ultimo = criado
    return {"total": len(linhas), **contas, "ultimo": ultimo, "faltando": False}


@router.get("")
@limiter.limit("30/minute")
def panorama(request: Request):
    agora = time.monotonic()
    if _CACHE["dados"] is not None and agora - _CACHE["em"] < _VALIDADE:
        return _CACHE["dados"]

    por_tabela = {t: _contar_tabela(t) for t in set(TABELAS.values())}

    familias = {}
    for chave, familia in FAMILIAS.items():
        total = sucesso = falha = indefinido = 0
        ultimo = None
        for tabela in familia["tabelas"]:
            c = por_tabela.get(tabela) or {}
            total += c.get("total", 0)
            sucesso += c.get("sucesso", 0)
            falha += c.get("falha", 0)
            indefinido += c.get("indefinido", 0)
            if c.get("ultimo") and (ultimo is None or c["ultimo"] > ultimo):
                ultimo = c["ultimo"]
        # A taxa só considera o que TEM desfecho. Dividir pelo total faria
        # "ainda não sei" contar como fracasso, e com 79 indefinidos a taxa
        # diria 35% onde o que se sabe é 71%.
        decididos = sucesso + falha
        familias[chave] = {
            "nome": familia["nome"],
            "total": total,
            "sucesso": sucesso,
            "falha": falha,
            "indefinido": indefinido,
            "taxa_sucesso": round(100 * sucesso / decididos) if decididos else None,
            "ultimo": ultimo,
            "meta": META,
        }

    dados = {"familias": familias, "meta": META}
    _CACHE.update({"em": agora, "dados": dados})
    return dados
