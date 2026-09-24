"""Pontos da bandeira (flag pattern) — modelo + validações.

A bandeira de ALTA é marcada em 8 pontos, organizados em 4 PARES
independentes (2 cliques cada), e cada par vira uma linha no gráfico:

    Mastro 1          p1_inicio_mastro1 → p2_topo_mastro1   (verde)
    Fundo da Bandeira p3_inicio_fundo   → p4_fim_fundo      (azul tracejada)
    Topo da Bandeira  p5_inicio_topo    → p6_fim_topo       (azul tracejada)
    Mastro 2          p7_inicio_mastro2 → p8_topo_mastro2   (verde)

A bandeira de BAIXA ainda usa o formato anterior: 6 pontos encadeados em
ordem cronológica (mastro → consolidação → rompimento), espelhados.

As mesmas regras rodam no navegador (frontend/src/admin/bandeira.js), pra
o analista ver o erro na hora. Aqui elas existem de novo porque validação
de front é conveniência, não segurança: a rota aceita requisição direta.

Os dois formatos antigos continuam aceitos — senão editar um template já
salvo passaria a dar erro 422.
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

# Bandeira de ALTA, formato atual: 8 pontos em 4 pares independentes (cada
# par é uma linha; ver PARES_ALTA em frontend/src/admin/bandeira.js).
PARES_ALTA = [
    ("Mastro 1", "p1_inicio_mastro1", "p2_topo_mastro1"),
    ("Fundo da Bandeira", "p3_inicio_fundo", "p4_fim_fundo"),
    ("Topo da Bandeira", "p5_inicio_topo", "p6_fim_topo"),
    ("Mastro 2", "p7_inicio_mastro2", "p8_topo_mastro2"),
]
PASSOS_PARES = [k for _, de, ate in PARES_ALTA for k in (de, ate)]
ROTULOS_PARES = {
    "p1_inicio_mastro1": "Início Mastro 1",
    "p2_topo_mastro1": "Topo Mastro 1",
    "p3_inicio_fundo": "Início Fundo Bandeira",
    "p4_fim_fundo": "Fim Fundo Bandeira",
    "p5_inicio_topo": "Início Topo Bandeira",
    "p6_fim_topo": "Fim Topo Bandeira",
    "p7_inicio_mastro2": "Início Mastro 2",
    "p8_topo_mastro2": "Topo Mastro 2",
}


class Ponto(BaseModel):
    i: int
    preco: float


class PontosBandeira(RootModel[Dict[str, Ponto]]):
    @model_validator(mode="after")
    def _checar_chaves(self):
        chaves = set(self.root)
        if chaves in (set(PASSOS_PARES), set(PASSOS), set(PASSOS_LEGADO)):
            return self
        # A marcação em 4 pares é a atual; o erro aponta o que falta nela
        faltando = [k for k in PASSOS_PARES if k not in chaves]
        raise ValueError(f"Pontos da bandeira incompletos — faltam: {', '.join(faltando)}.")

    @property
    def e_legado(self) -> bool:
        return set(self.root) == set(PASSOS_LEGADO)

    @property
    def e_pares(self) -> bool:
        return set(self.root) == set(PASSOS_PARES)


def preco_na_reta(a: Ponto, b: Ponto, i: int) -> Optional[float]:
    """Preço da reta que passa por `a` e `b`, no índice `i` (extrapola)."""
    if b.i == a.i:
        return a.preco
    return a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i)


def validar_pares(pontos: PontosBandeira, alta: bool = True) -> List[str]:
    """Regras dos padrões de continuação em 4 pares (formato atual).

    Bloqueiam só o essencial: a ordem DENTRO de cada par e a direção dos
    dois mastros. Nada que compare um par com outro — os pares são
    independentes e os pontos podem se tocar ou cair dentro do trecho de
    outro par (o início do mastro 2 é o fundo da consolidação, por exemplo).
    """
    p = pontos.root
    rot = ROTULOS_PARES
    erros: List[str] = []

    # 1) cada par é cronológico
    for rotulo, de, ate in PARES_ALTA:
        if p[ate].i <= p[de].i:
            erros.append(f'{rotulo}: "{rot[ate]}" precisa vir depois de "{rot[de]}" no tempo.')

    # 2) os dois mastros vão na direção do padrão
    ponta = "Topo" if alta else "Fundo"
    sentido = "acima" if alta else "abaixo"
    movimento = "subida" if alta else "queda"
    for numero, de, ate in (("1", "p1_inicio_mastro1", "p2_topo_mastro1"), ("2", "p7_inicio_mastro2", "p8_topo_mastro2")):
        contra_mao = p[ate].preco <= p[de].preco if alta else p[ate].preco >= p[de].preco
        if contra_mao:
            erros.append(
                f'Mastro {numero}: "{ponta} Mastro {numero}" precisa estar {sentido} de '
                f'"Início Mastro {numero}" — o mastro é uma {movimento}.'
            )

    # A ordem ENTRE pares não bloqueia: é comum esticar as linhas do canal
    # pra direita, além do rompimento, e aí "Fim Fundo Bandeira" cai depois
    # de "Início Mastro 2" sem que a marcação esteja errada. No admin isso
    # aparece como aviso amarelo (avisosAltaPares em admin/bandeira.js).

    return erros


def validar(pontos: PontosBandeira, alta: bool = True) -> List[str]:
    """Devolve a lista de problemas encontrados ([] = tudo certo)."""
    if pontos.e_legado:
        return []
    if pontos.e_pares:
        return validar_pares(pontos, alta=alta)

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
