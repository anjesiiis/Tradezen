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


def _preco_na_reta(a: Ponto, b: Ponto, x: float) -> float:
    if b.i == a.i:
        return a.preco
    return a.preco + ((b.preco - a.preco) * (x - a.i)) / (b.i - a.i)


def problemas(pontos: PontosCanal, alta: bool) -> List[str]:
    """O que impede de salvar: pontos faltando e topo/fundo trocados.

    Vale a GEOMETRIA das duas retas, não a posição de um clique em
    relação a outro: num canal que começa por um topo, o fundo esquerdo
    vem depois do topo esquerdo no tempo, e isso é normal. Mesmas regras
    de frontend/src/admin/canal.js.
    """
    p1, p2, p3, p4 = pontos.p1, pontos.p2, pontos.p3, pontos.p4
    r1, r2, r3, r4 = ROTULOS_ALTA if alta else ROTULOS_BAIXA
    erros: List[str] = []

    if p2.i == p1.i:
        erros.append(f'"{r1}" e "{r2}" estão no mesmo candle — a linha precisa de dois candles.')
    if p4.i == p3.i:
        erros.append(f'"{r3}" e "{r4}" estão no mesmo candle — a linha precisa de dois candles.')
    if erros:
        return erros

    # Única coisa que impede de salvar além dos pontos faltando: as duas
    # retas se cruzarem, ou seja, topo e fundo trocados de lugar. Canal
    # marcado contra a direção da tela é aviso amarelo no admin, não erro —
    # quem decide é quem está olhando o gráfico.
    de = min(p1.i, p2.i, p3.i, p4.i)
    ate = max(p1.i, p2.i, p3.i, p4.i)
    cruzam = any(
        (_preco_na_reta(p3, p4, x) <= _preco_na_reta(p1, p2, x)) if alta
        else (_preco_na_reta(p3, p4, x) >= _preco_na_reta(p1, p2, x))
        for x in (de, ate)
    )
    if cruzam:
        lado = "acima" if alta else "abaixo"
        erros.append(
            f'A linha de "{r3}" a "{r4}" precisa ficar {lado} da linha de "{r1}" a "{r2}" '
            "— do jeito que está, topo e fundo se cruzam."
        )

    return erros


def garantir_valido(pontos: PontosCanal, alta: bool) -> None:
    erros = problemas(pontos, alta)
    if erros:
        raise HTTPException(status_code=400, detail=" ".join(erros))
