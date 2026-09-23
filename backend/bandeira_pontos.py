"""Pontos da bandeira (flag pattern) — modelo + validações.

São 6 pontos marcados na ORDEM em que o padrão acontece no tempo:

    P1 início do mastro → P2 topo do mastro → P3 fundo 1 → P4 topo 1
    → P5 fundo 2 → P6 rompimento

(na bandeira de BAIXA é tudo espelhado: o mastro cai, o canal sobe e o
rompimento fura pra baixo.)

As mesmas regras rodam no navegador (frontend/src/admin/bandeira.js), pra
o analista ver o erro na hora. Aqui elas existem de novo porque validação
de front é conveniência, não segurança: a rota aceita requisição direta.

Templates salvos ANTES desta mudança usavam 6 pontos "por função"
(mastro_inicio/mastro_fim/topo1/topo2/fundo1/fundo2), sem ordem no tempo.
Eles continuam válidos aqui — senão editar um template antigo passaria a
dar erro 422.
"""

from typing import Dict, List, Optional

from fastapi import HTTPException
from pydantic import BaseModel, RootModel, model_validator

PASSOS = [
    "p1_inicio_mastro",
    "p2_topo_mastro",
    "p3_fundo1",
    "p4_topo1",
    "p5_fundo2",
    "p6_rompimento",
]
PASSOS_LEGADO = ["mastro_inicio", "mastro_fim", "topo1", "topo2", "fundo1", "fundo2"]


class Ponto(BaseModel):
    i: int
    preco: float


class PontosBandeira(RootModel[Dict[str, Ponto]]):
    @model_validator(mode="after")
    def _checar_chaves(self):
        chaves = set(self.root)
        if chaves == set(PASSOS) or chaves == set(PASSOS_LEGADO):
            return self
        faltando = [k for k in PASSOS if k not in chaves]
        raise ValueError(f"Pontos da bandeira incompletos — faltam: {', '.join(faltando)}.")

    @property
    def e_legado(self) -> bool:
        return set(self.root) == set(PASSOS_LEGADO)


def preco_na_reta(a: Ponto, b: Ponto, i: int) -> Optional[float]:
    """Preço da reta que passa por `a` e `b`, no índice `i` (extrapola)."""
    if b.i == a.i:
        return a.preco
    return a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i)


def validar(pontos: PontosBandeira, alta: bool = True) -> List[str]:
    """Devolve a lista de problemas encontrados ([] = tudo certo)."""
    if pontos.e_legado:
        return []

    p = [pontos.root[k] for k in PASSOS]
    p1, p2, p3, p4, p5, p6 = p
    rotulos = (
        ["Início do Mastro", "Topo do Mastro", "Fundo 1", "Topo 1", "Fundo 2", "Rompimento"]
        if alta
        else ["Início do Mastro", "Fundo do Mastro", "Topo 1", "Fundo 1", "Topo 2", "Rompimento"]
    )
    erros: List[str] = []

    # 1) ordem cronológica obrigatória
    for k in range(1, len(p)):
        if p[k].i <= p[k - 1].i:
            erros.append(f'"{rotulos[k]}" precisa vir depois de "{rotulos[k - 1]}" no tempo.')

    # 2) o mastro tem que ser forte na direção do padrão
    if (p2.preco <= p1.preco) if alta else (p2.preco >= p1.preco):
        erros.append(
            '"Topo do Mastro" precisa estar acima do "Início do Mastro" — o mastro é de alta.'
            if alta
            else '"Fundo do Mastro" precisa estar abaixo do "Início do Mastro" — o mastro é de baixa.'
        )

    # 3) a consolidação começa contra o mastro
    if (p3.preco >= p2.preco) if alta else (p3.preco <= p2.preco):
        erros.append(
            '"Fundo 1" precisa estar abaixo do "Topo do Mastro".'
            if alta
            else '"Topo 1" precisa estar acima do "Fundo do Mastro".'
        )

    # 4) canal inclinado contra o mastro (ou lateral) — 1% de tolerância, pra
    #    não recusar marcação boa de canal quase horizontal
    tolerancia = abs(p3.preco) * 0.01
    if (p5.preco > p3.preco + tolerancia) if alta else (p5.preco < p3.preco - tolerancia):
        erros.append(
            '"Fundo 2" precisa estar no mesmo nível ou abaixo do "Fundo 1" — o canal da bandeira é descendente.'
            if alta
            else '"Topo 2" precisa estar no mesmo nível ou acima do "Topo 1" — o canal da bandeira é ascendente.'
        )

    # 5) rompimento confirmado: P6 fura a linha do canal no tempo dele
    linha = preco_na_reta(p2, p4, p6.i)
    if linha is not None and ((p6.preco <= linha) if alta else (p6.preco >= linha)):
        erros.append(
            f'"Rompimento" precisa fechar acima da linha superior do canal ({linha:.2f}).'
            if alta
            else f'"Rompimento" precisa fechar abaixo da linha inferior do canal ({linha:.2f}).'
        )

    return erros


def garantir_valido(pontos: PontosBandeira, alta: bool = True) -> None:
    """Levanta 400 com a mensagem exata do que está errado."""
    erros = validar(pontos, alta=alta)
    if erros:
        raise HTTPException(status_code=400, detail=" ".join(erros))
