"""
TRADEUP — PIVÔS (topos/fundos) E ATR
======================================

Base compartilhada por detectores de padrões (OCO, suportes/resistências, ...).
"""

from typing import List, Dict


# ──────────────────────────────────────────────────────────────
# 0) ATR — Average True Range
# ──────────────────────────────────────────────────────────────
def calcular_atr(candles: List[Dict], periodo: int = 14) -> List[float]:
    n = len(candles)
    atrs = [0.0] * n
    if n < 2:
        return atrs

    trs = [0.0] * n
    for i in range(1, n):
        hi = candles[i]["maxima"]
        lo = candles[i]["minima"]
        pc = candles[i-1]["fechamento"]
        trs[i] = max(hi - lo, abs(hi - pc), abs(lo - pc))

    if n > periodo:
        atrs[periodo] = sum(trs[1:periodo+1]) / periodo
        for i in range(periodo + 1, n):
            atrs[i] = (atrs[i-1] * (periodo - 1) + trs[i]) / periodo
    else:
        for i in range(1, n):
            atrs[i] = sum(trs[1:i+1]) / i

    return atrs


# ──────────────────────────────────────────────────────────────
# 1) PIVÔS — com filtro ATR anti-duplicatas
# ──────────────────────────────────────────────────────────────
def encontrar_pivos(candles: List[Dict], janela: int = 5):
    atrs = calcular_atr(candles)
    topos, fundos = [], []
    n = len(candles)

    for i in range(janela, n - janela):
        h = candles[i]["maxima"]
        l = candles[i]["minima"]
        viz_e = candles[i - janela:i]
        viz_d = candles[i + 1:i + 1 + janela]
        atr_local = atrs[i] if atrs[i] > 0 else h * 0.005

        if (all(h >= c["maxima"] for c in viz_e) and
                all(h >= c["maxima"] for c in viz_d)):
            if (not topos or
                    abs(h - topos[-1]["preco"]) > atr_local * 0.3 or
                    (i - topos[-1]["i"]) > janela * 3):
                topos.append({"i": i, "preco": h})

        if (all(l <= c["minima"] for c in viz_e) and
                all(l <= c["minima"] for c in viz_d)):
            if (not fundos or
                    abs(l - fundos[-1]["preco"]) > atr_local * 0.3 or
                    (i - fundos[-1]["i"]) > janela * 3):
                fundos.append({"i": i, "preco": l})

    return topos, fundos
