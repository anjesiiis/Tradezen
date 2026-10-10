"""Pontos do canal (de alta e de baixa) — modelo + validações.

Quatro pontos, duas retas paralelas:

    Canal de ALTA    p1 Fundo Esq. → p2 Fundo Dir. → p3 Topo Esq. → p4 Topo Dir.
    Canal de BAIXA   p1 Topo Esq.  → p2 Topo Dir.  → p3 Fundo Esq. → p4 Fundo Dir.

As chaves são neutras (p1..p4) porque o papel de cada linha troca com a
direção; quem dá nome a cada ponto é o rótulo da tela. A mediana (50%)
desenhada no gráfico é calculada, não marcada.

As mesmas regras rodam no navegador (frontend/src/admin/canal.js), pra o
analista ver o erro na hora. Aqui elas existem de novo porque validação de
front é conveniência, não segurança: a rota aceita requisição direta.
"""

from typing import List

from fastapi import HTTPException
from pydantic import BaseModel




class Ponto(BaseModel):
    i: int
    preco: float


class PontosCanal(BaseModel):
    p1: Ponto
    p2: Ponto
    p3: Ponto
    p4: Ponto


def problemas(pontos: PontosCanal, alta: bool) -> List[str]:
    """O que impede de salvar: nada além dos 4 pontos.

    As regras de preço entre os pontos ("a linha de cima precisa ficar
    acima da de baixo") recusavam canal bem marcado — o que começa por um
    topo, o que estreita — e obrigavam a decidir qual par seria qual antes
    de desenhar. P1..P4 são posições; o sistema liga os pontos.
    """
    return []


def garantir_valido(pontos: PontosCanal, alta: bool) -> None:
    erros = problemas(pontos, alta)
    if erros:
        raise HTTPException(status_code=400, detail=" ".join(erros))
