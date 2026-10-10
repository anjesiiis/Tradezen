"""
TRADEZEN — PADRÕES DE REVERSÃO E CONSOLIDAÇÃO (pontos e validação)
==================================================================

Oito padrões marcados ponto a ponto, cada um com os seus: Fundo Duplo,
OCO Invertido, Topo Triplo, Fundo Triplo, os três triângulos e o
Retângulo.

Aqui só fica o que IMPEDE de salvar, e de propósito é quase nada: falta
de ponto e topo/fundo trocados de lugar. Nível fora de ±5%, ordem no
tempo e borda pouco horizontal são conferências do analista — viram
aviso amarelo na tela (padroesExtras.js) e o template salva assim mesmo.

A regra é a mesma do frontend. Ela existe aqui de novo porque validação
de front é conveniência, não segurança: a rota aceita requisição direta.
"""

from typing import Any, Callable, Dict, List

from fastapi import HTTPException
from pydantic import BaseModel, Field

# Mesmas tolerâncias do frontend: 5% entre topos/fundos de um padrão de
# reversão, 3% nas bordas horizontais do triângulo e do retângulo.
TOLERANCIA_REVERSAO = 0.05
TOLERANCIA_BORDA = 0.03


class Ponto(BaseModel):
    i: int = Field(ge=0)
    preco: float


# Pontos como dicionário: cada padrão tem as suas chaves, conferidas em
# `garantir_valido` — um modelo por padrão seriam oito classes quase
# iguais.
PontosExtras = Dict[str, Ponto]


def _parecidos(a: float, b: float, tolerancia: float) -> bool:
    base = max(abs(a), abs(b))
    return True if base == 0 else abs(a - b) / base <= tolerancia


def _fundo_duplo(p: Dict[str, Ponto]) -> List[str]:
    if p["pico"].preco <= p["vale1"].preco or p["pico"].preco <= p["vale2"].preco:
        return ['O "Pico" está abaixo dos vales — topo e fundo trocados de lugar.']
    return []


def _oco_invertido(p: Dict[str, Ponto]) -> List[str]:
    if p["cabeca"].preco >= p["ombro_esq"].preco or p["cabeca"].preco >= p["ombro_dir"].preco:
        return ['A "Cabeça" está acima dos ombros — num OCO invertido ela é o fundo mais baixo.']
    if p["pescoco"].preco <= max(p["ombro_esq"].preco, p["cabeca"].preco, p["ombro_dir"].preco):
        return ['A "Linha de Pescoço" está abaixo dos fundos — ela fica por cima do padrão.']
    return []


def _tres_niveis(chaves_nivel: List[str], chaves_meio: List[str], alta: bool):
    """Topo Triplo e Fundo Triplo: o miolo não pode estar do lado errado."""
    def validar(p: Dict[str, Ponto]) -> List[str]:
        extremos = [p[k].preco for k in chaves_nivel]
        meios = [p[k].preco for k in chaves_meio]
        if alta and max(meios) >= min(extremos):
            return ["Tem vale acima de topo — os pontos estão trocados."]
        if not alta and min(meios) <= max(extremos):
            return ["Tem pico abaixo de fundo — os pontos estão trocados."]
        return []
    return validar


# Triângulos e retângulo: os pontos são POSIÇÕES, sem papel de topo ou
# fundo, e sem regra de preço entre eles. Quem sabe se aquilo é um
# triângulo ascendente ou descendente é quem marcou — e a resposta está
# na tabela em que foi salvo. As regras antigas ("o suporte precisa ficar
# abaixo da resistência") recusavam marcação boa.
def _sem_regra(p: Dict[str, Ponto]) -> List[str]:
    return []


_TRIANGULO = ["p1", "p2", "p3"]
_RETANGULO = ["p1", "p2", "p3", "p4"]

# tipo → (rota, tabela, chaves obrigatórias, validação)
PADROES_EXTRAS: Dict[str, Dict[str, Any]] = {
    "fundo_duplo": {
        "rota": "fundo-duplo", "tabela": "templates_fundo_duplo",
        "pontos": ["vale1", "pico", "vale2", "confirmacao"], "validar": _fundo_duplo,
    },
    "oco_invertido": {
        "rota": "oco-invertido", "tabela": "templates_oco_invertido",
        "pontos": ["ombro_esq", "cabeca", "ombro_dir", "pescoco"], "validar": _oco_invertido,
    },
    "topo_triplo": {
        "rota": "topo-triplo", "tabela": "templates_topo_triplo",
        "pontos": ["topo1", "vale1", "topo2", "vale2", "topo3"],
        "validar": _tres_niveis(["topo1", "topo2", "topo3"], ["vale1", "vale2"], alta=True),
    },
    "fundo_triplo": {
        "rota": "fundo-triplo", "tabela": "templates_fundo_triplo",
        "pontos": ["fundo1", "pico1", "fundo2", "pico2", "fundo3"],
        "validar": _tres_niveis(["fundo1", "fundo2", "fundo3"], ["pico1", "pico2"], alta=False),
    },
    "triangulo_ascendente": {
        "rota": "triangulo-ascendente", "tabela": "templates_triangulo_ascendente",
        "pontos": _TRIANGULO, "validar": _sem_regra,
    },
    "triangulo_descendente": {
        "rota": "triangulo-descendente", "tabela": "templates_triangulo_descendente",
        "pontos": _TRIANGULO, "validar": _sem_regra,
    },
    "triangulo_simetrico": {
        "rota": "triangulo-simetrico", "tabela": "templates_triangulo_simetrico",
        "pontos": _TRIANGULO, "validar": _sem_regra,
    },
    "retangulo": {
        "rota": "retangulo", "tabela": "templates_retangulo",
        "pontos": _RETANGULO, "validar": _sem_regra,
    },
}


def garantir_valido(tipo: str, pontos: PontosExtras) -> None:
    """400 com a lista de problemas, no mesmo texto que a tela mostra."""
    espec = PADROES_EXTRAS[tipo]
    faltando = [k for k in espec["pontos"] if k not in pontos]
    if faltando:
        raise HTTPException(status_code=400, detail=f"Faltam pontos: {', '.join(faltando)}.")

    validar: Callable[[Dict[str, Ponto]], List[str]] = espec["validar"]
    erros = validar({k: pontos[k] for k in espec["pontos"]})
    if erros:
        raise HTTPException(status_code=400, detail=" ".join(erros))
