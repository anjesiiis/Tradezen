"""
TRADEZEN — PADRÕES DE REVERSÃO E CONSOLIDAÇÃO (pontos e validação)
==================================================================

Oito padrões marcados ponto a ponto, cada um com os seus: Fundo Duplo,
OCO Invertido, Topo Triplo, Fundo Triplo, os três triângulos e o
Retângulo.

As regras aqui são as MESMAS de frontend/src/admin/padroesExtras.js. A
tela já barra antes de enviar; isto é a rede de proteção do banco —
template torto entra no treino do modelo e estraga o dado.
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
    erros = []
    if p["vale2"].i <= p["pico"].i:
        erros.append('"Vale 2" precisa vir depois do "Pico" no tempo.')
    if p["confirmacao"].i <= p["vale2"].i:
        erros.append('"Confirmação" precisa vir depois do "Vale 2".')
    if not _parecidos(p["vale1"].preco, p["vale2"].preco, TOLERANCIA_REVERSAO):
        erros.append("Os dois vales precisam estar no mesmo nível (até 5%).")
    if p["pico"].preco <= p["vale1"].preco or p["pico"].preco <= p["vale2"].preco:
        erros.append('O "Pico" precisa estar acima dos dois vales.')
    return erros


def _oco_invertido(p: Dict[str, Ponto]) -> List[str]:
    erros = []
    if p["cabeca"].preco >= p["ombro_esq"].preco or p["cabeca"].preco >= p["ombro_dir"].preco:
        erros.append('A "Cabeça" precisa estar mais baixa que os dois ombros.')
    if not _parecidos(p["ombro_esq"].preco, p["ombro_dir"].preco, TOLERANCIA_REVERSAO):
        erros.append("Os dois ombros precisam estar no mesmo nível (até 5%).")
    if p["pescoco"].preco <= max(p["ombro_esq"].preco, p["cabeca"].preco, p["ombro_dir"].preco):
        erros.append('A "Linha de Pescoço" precisa estar acima dos três fundos.')
    return erros


def _tres_niveis(chaves_nivel, chaves_meio, nome_nivel, nome_meio):
    """Topo Triplo e Fundo Triplo: três extremos iguais, dois no meio."""
    def validar(p: Dict[str, Ponto]) -> List[str]:
        erros = []
        precos = [p[k].preco for k in chaves_nivel]
        if not _parecidos(min(precos), max(precos), TOLERANCIA_REVERSAO):
            erros.append(f"Os três {nome_nivel} precisam estar no mesmo nível (até 5%).")
        for n, meio in enumerate(chaves_meio):
            antes, depois = chaves_nivel[n], chaves_nivel[n + 1]
            if not (p[antes].i < p[meio].i < p[depois].i):
                erros.append(f'"{nome_meio} {n + 1}" precisa ficar entre os extremos vizinhos no tempo.')
        return erros
    return validar


def _triangulo_ascendente(p: Dict[str, Ponto]) -> List[str]:
    erros = []
    if not _parecidos(p["res_esq"].preco, p["res_dir"].preco, TOLERANCIA_BORDA):
        erros.append("A resistência precisa ser horizontal (até 3% de diferença).")
    if p["sup_dir"].preco <= p["sup_esq"].preco:
        erros.append('"Suporte Direito" precisa estar acima de "Suporte Esquerdo".')
    return erros


def _triangulo_descendente(p: Dict[str, Ponto]) -> List[str]:
    erros = []
    if not _parecidos(p["sup_esq"].preco, p["sup_dir"].preco, TOLERANCIA_BORDA):
        erros.append("O suporte precisa ser horizontal (até 3% de diferença).")
    if p["res_dir"].preco >= p["res_esq"].preco:
        erros.append('"Resistência Direita" precisa estar abaixo de "Resistência Esquerda".')
    return erros


def _triangulo_simetrico(p: Dict[str, Ponto]) -> List[str]:
    erros = []
    if p["topo_dir"].preco >= p["topo_esq"].preco:
        erros.append('"Topo Direito" precisa estar abaixo de "Topo Esquerdo".')
    if p["fundo_dir"].preco <= p["fundo_esq"].preco:
        erros.append('"Fundo Direito" precisa estar acima de "Fundo Esquerdo".')
    return erros


def _retangulo(p: Dict[str, Ponto]) -> List[str]:
    erros = []
    if not _parecidos(p["res_esq"].preco, p["res_dir"].preco, TOLERANCIA_BORDA):
        erros.append("As duas resistências precisam estar no mesmo nível (até 3%).")
    if not _parecidos(p["sup_esq"].preco, p["sup_dir"].preco, TOLERANCIA_BORDA):
        erros.append("Os dois suportes precisam estar no mesmo nível (até 3%).")
    if max(p["sup_esq"].preco, p["sup_dir"].preco) >= min(p["res_esq"].preco, p["res_dir"].preco):
        erros.append("Os suportes precisam estar abaixo das resistências.")
    return erros


_BORDAS = ["res_esq", "res_dir", "sup_esq", "sup_dir"]

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
        "validar": _tres_niveis(["topo1", "topo2", "topo3"], ["vale1", "vale2"], "topos", "Vale"),
    },
    "fundo_triplo": {
        "rota": "fundo-triplo", "tabela": "templates_fundo_triplo",
        "pontos": ["fundo1", "pico1", "fundo2", "pico2", "fundo3"],
        "validar": _tres_niveis(["fundo1", "fundo2", "fundo3"], ["pico1", "pico2"], "fundos", "Pico"),
    },
    "triangulo_ascendente": {
        "rota": "triangulo-ascendente", "tabela": "templates_triangulo_ascendente",
        "pontos": _BORDAS, "validar": _triangulo_ascendente,
    },
    "triangulo_descendente": {
        "rota": "triangulo-descendente", "tabela": "templates_triangulo_descendente",
        "pontos": _BORDAS, "validar": _triangulo_descendente,
    },
    "triangulo_simetrico": {
        "rota": "triangulo-simetrico", "tabela": "templates_triangulo_simetrico",
        "pontos": ["topo_esq", "topo_dir", "fundo_esq", "fundo_dir"], "validar": _triangulo_simetrico,
    },
    "retangulo": {
        "rota": "retangulo", "tabela": "templates_retangulo",
        "pontos": _BORDAS, "validar": _retangulo,
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
