"""Pontos do canal (de alta e de baixa) — modelo + validações.

O canal é marcado por TOQUES, não por pares como a bandeira:

    Linha de suporte     p1_fundo1 → p3_fundo2 → p5_fundo3 (opcional)
    Linha de resistência p2_topo1  → p4_topo2  → p6_topo3  (opcional)

Com dois toques de cada lado já dá pra traçar as duas linhas — por isso
P5 e P6 são opcionais. A mediana (50%) desenhada no gráfico é calculada,
não marcada.

As mesmas regras rodam no navegador (frontend/src/admin/canal.js), pra o
analista ver o erro na hora. Aqui elas existem de novo porque validação de
front é conveniência, não segurança: a rota aceita requisição direta.
"""

from typing import List, Optional

from fastapi import HTTPException
from pydantic import BaseModel

SUPORTE = ["p1_fundo1", "p3_fundo2", "p5_fundo3"]
RESISTENCIA = ["p2_topo1", "p4_topo2", "p6_topo3"]

ROTULOS = {
    "p1_fundo1": "Fundo 1",
    "p2_topo1": "Topo 1",
    "p3_fundo2": "Fundo 2",
    "p4_topo2": "Topo 2",
    "p5_fundo3": "Fundo 3",
    "p6_topo3": "Topo 3",
}


class Ponto(BaseModel):
    i: int
    preco: float


class PontosCanal(BaseModel):
    """Os 4 primeiros são obrigatórios; o terceiro toque de cada lado, não."""

    p1_fundo1: Ponto
    p2_topo1: Ponto
    p3_fundo2: Ponto
    p4_topo2: Ponto
    p5_fundo3: Optional[Ponto] = None
    p6_topo3: Optional[Ponto] = None


def _toques(pontos: PontosCanal, chaves: List[str]) -> List[tuple]:
    marcados = [(k, getattr(pontos, k)) for k in chaves if getattr(pontos, k) is not None]
    return sorted(marcados, key=lambda par: par[1].i)


def _preco_na_polilinha(toques: List[tuple], i: float) -> Optional[float]:
    """Preço da linha que passa por todos os toques, no índice `i` (extrapola)."""
    pts = [p for _, p in toques]
    if not pts:
        return None
    if len(pts) == 1:
        return pts[0].preco

    def entre(a, b):
        if b.i == a.i:
            return a.preco
        return a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i)

    if i <= pts[0].i:
        return entre(pts[0], pts[1])
    if i >= pts[-1].i:
        return entre(pts[-2], pts[-1])
    for n in range(len(pts) - 1):
        if pts[n].i <= i <= pts[n + 1].i:
            return entre(pts[n], pts[n + 1])
    return pts[-1].preco


def validar(pontos: PontosCanal, alta: bool = True) -> List[str]:
    erros: List[str] = []
    suporte = _toques(pontos, SUPORTE)
    resistencia = _toques(pontos, RESISTENCIA)

    # Cronologia dentro de cada linha
    for lado in (SUPORTE, RESISTENCIA):
        marcados = [k for k in lado if getattr(pontos, k) is not None]
        for anterior, atual in zip(marcados, marcados[1:]):
            if getattr(pontos, atual).i <= getattr(pontos, anterior).i:
                erros.append(
                    f'"{ROTULOS[atual]}" precisa vir depois de "{ROTULOS[anterior]}" no tempo.'
                )

    # Direção: no canal de alta fundos e topos sobem; no de baixa, descem
    sentido = "acima" if alta else "abaixo"
    movimento = "sobem" if alta else "descem"
    for lado, nome in ((SUPORTE, "fundos"), (RESISTENCIA, "topos")):
        marcados = [k for k in lado if getattr(pontos, k) is not None]
        for anterior, atual in zip(marcados, marcados[1:]):
            a, b = getattr(pontos, anterior), getattr(pontos, atual)
            fora = b.preco <= a.preco if alta else b.preco >= a.preco
            if fora:
                erros.append(
                    f'"{ROTULOS[atual]}" precisa estar {sentido} de "{ROTULOS[anterior]}" — '
                    f'num canal de {"alta" if alta else "baixa"} os {nome} {movimento}.'
                )

    # Resistência acima do suporte, medido no meio (os toques dos dois lados
    # caem em tempos diferentes)
    if suporte and resistencia:
        inicio = min(suporte[0][1].i, resistencia[0][1].i)
        fim = max(suporte[-1][1].i, resistencia[-1][1].i)
        meio = (inicio + fim) / 2
        acima = _preco_na_polilinha(resistencia, meio)
        abaixo = _preco_na_polilinha(suporte, meio)
        if acima is not None and abaixo is not None and acima <= abaixo:
            erros.append(
                "A linha de resistência (topos) precisa ficar acima da linha de suporte (fundos)."
            )

    return erros


def garantir_valido(pontos: PontosCanal, alta: bool = True) -> None:
    """Levanta 400 com a mensagem exata do que está errado."""
    erros = validar(pontos, alta=alta)
    if erros:
        raise HTTPException(status_code=400, detail=" ".join(erros))
