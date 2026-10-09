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

ROTULOS_ALTA = ["Fundo Esq.", "Fundo Dir.", "Topo Esq.", "Topo Dir."]
ROTULOS_BAIXA = ["Topo Esq.", "Topo Dir.", "Fundo Esq.", "Fundo Dir."]


class Ponto(BaseModel):
    i: int
    preco: float


class PontosCanal(BaseModel):
    p1: Ponto
    p2: Ponto
    p3: Ponto
    p4: Ponto


def problemas(pontos: PontosCanal, alta: bool) -> List[str]:
    p1, p2, p3, p4 = pontos.p1, pontos.p2, pontos.p3, pontos.p4
    r1, r2, r3, r4 = ROTULOS_ALTA if alta else ROTULOS_BAIXA
    erros: List[str] = []

    if p2.i == p1.i:
        erros.append(f'"{r1}" e "{r2}" estão no mesmo candle — a linha precisa de dois candles.')
    if p4.i == p3.i:
        erros.append(f'"{r3}" e "{r4}" estão no mesmo candle — a linha precisa de dois candles.')

    def na_direcao(a: Ponto, b: Ponto) -> bool:
        return b.preco > a.preco if alta else b.preco < a.preco

    sentido = "acima" if alta else "abaixo"
    if not na_direcao(p1, p2):
        erros.append(f'"{r2}" precisa estar {sentido} de "{r1}".')
    if not na_direcao(p1, p3):
        erros.append(f'"{r3}" precisa estar {sentido} de "{r1}".')
    if not na_direcao(p3, p4):
        erros.append(f'"{r4}" precisa estar {sentido} de "{r3}".')

    if p3.i <= p1.i:
        erros.append(f'"{r3}" precisa vir depois de "{r1}" no tempo.')
    if p4.i <= p2.i:
        erros.append(f'"{r4}" precisa vir depois de "{r2}" no tempo.')

    return erros


def garantir_valido(pontos: PontosCanal, alta: bool) -> None:
    erros = problemas(pontos, alta)
    if erros:
        raise HTTPException(status_code=400, detail=" ".join(erros))
