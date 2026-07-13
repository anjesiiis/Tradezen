"""
DTW (Dynamic Time Warping) — comparação de forma entre séries de preço.

Usado pra medir o quão parecida é a FORMA de um trecho de candles com os
templates de referência marcados manualmente. Não sabe nada sobre nenhum
padrão específico (OCO, topo duplo, etc.) — só compara duas sequências.
"""

from typing import List


def normalizar(serie: List[float]) -> List[float]:
    """Min-max scale pra [0, 1] — remove a escala absoluta de preço,
    só sobra a forma (um ativo de R$5 e um de R$50000 ficam comparáveis)."""
    lo, hi = min(serie), max(serie)
    if hi == lo:
        return [0.0] * len(serie)
    return [(x - lo) / (hi - lo) for x in serie]


def dtw_distancia(s1: List[float], s2: List[float]) -> float:
    """
    Distância DTW clássica (programação dinâmica O(n*m)).
    Quanto menor, mais parecidas as duas formas.
    """
    n, m = len(s1), len(s2)
    anterior = [float("inf")] * (m + 1)
    anterior[0] = 0.0

    for i in range(1, n + 1):
        atual = [float("inf")] * (m + 1)
        for j in range(1, m + 1):
            custo = abs(s1[i - 1] - s2[j - 1])
            atual[j] = custo + min(anterior[j], atual[j - 1], anterior[j - 1])
        anterior = atual

    return anterior[m]


def dtw_distancia_normalizada(s1: List[float], s2: List[float]) -> float:
    """DTW sobre as séries já normalizadas — o que de fato usamos pra comparar forma."""
    return dtw_distancia(normalizar(s1), normalizar(s2))
