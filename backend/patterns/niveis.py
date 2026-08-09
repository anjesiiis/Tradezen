"""
TRADEZEN — SUPORTES E RESISTÊNCIAS
====================================

Agrupa os pivôs (topos/fundos) de `patterns.pivos` em níveis horizontais de
preço testados mais de uma vez, e classifica cada nível como suporte
(abaixo do preço atual) ou resistência (acima).
"""

from typing import List, Dict

from patterns.pivos import calcular_atr, encontrar_pivos


def detectar_niveis(candles: List[Dict], janela: int = 5, top_n: int = 3) -> List[Dict]:
    n = len(candles)
    if n < (janela * 2 + 3):
        return []

    topos, fundos = encontrar_pivos(candles, janela=janela)
    pivos = sorted(topos + fundos, key=lambda p: p["preco"])
    if not pivos:
        return []

    atrs = calcular_atr(candles)
    atr_medio = sum(a for a in atrs if a > 0) / max(1, sum(1 for a in atrs if a > 0))
    preco_atual = candles[-1]["fechamento"]
    tolerancia = atr_medio * 0.3 if atr_medio > 0 else preco_atual * 0.003

    # Clusteriza pivôs próximos em níveis
    clusters = [[pivos[0]]]
    for p in pivos[1:]:
        if p["preco"] - clusters[-1][-1]["preco"] <= tolerancia:
            clusters[-1].append(p)
        else:
            clusters.append([p])

    niveis = []
    for cluster in clusters:
        preco = sum(p["preco"] for p in cluster) / len(cluster)
        toques = len(cluster)
        ultimo_toque_i = max(p["i"] for p in cluster)
        tipo = "suporte" if preco < preco_atual else "resistencia"
        score = toques + (ultimo_toque_i / (n - 1))
        niveis.append({
            "preco": round(preco, 4),
            "tipo": tipo,
            "toques": toques,
            "score": score,
        })

    resultado = []
    for tipo in ("suporte", "resistencia"):
        do_tipo = sorted((nv for nv in niveis if nv["tipo"] == tipo), key=lambda nv: -nv["score"])
        for rank, nv in enumerate(do_tipo[:top_n]):
            resultado.append({**nv, "rank": rank})

    for nv in resultado:
        del nv["score"]

    return resultado
