"""
TRADEZEN — DETECTORES DE REVERSÃO
==================================

Fundo Duplo, OCO Invertido, Topo Triplo e Fundo Triplo.

Mesma mecânica do detector de OCO (classicos.py): pivôs → candidatos →
confirmação por rompimento → veredicto do que veio depois. A saída tem o
mesmo formato, e as chaves dos pontos são as MESMAS da marcação manual
(padroes_extras.py / padroesExtras.js), pra um padrão detectado poder ser
guardado e desenhado pelos mesmos caminhos do que foi marcado à mão.
"""

from typing import Dict, List, Optional

from patterns.comum import (
    TOLERANCIA_REVERSAO, melhor_por_regiao, nivel_medio, parecidos, ponto,
    rompimento_apos, score, veredicto,
)
from patterns.pivos import calcular_atr, encontrar_pivos

# Distância mínima entre o nível dos extremos e o miolo do padrão, em ATR.
# Sem isso qualquer serrilhado do gráfico virava "fundo duplo".
RELEVO_MINIMO_ATR = 1.0


def _relevo_ok(candles: List[Dict], atrs: List[float], i: int, distancia: float) -> bool:
    atr = atrs[i] if i < len(atrs) and atrs[i] > 0 else candles[i]["fechamento"] * 0.01
    return distancia >= atr * RELEVO_MINIMO_ATR


def _entre(pivos: List[Dict], i_ini: int, i_fim: int) -> List[Dict]:
    return [p for p in pivos if i_ini < p["i"] < i_fim]


def _detectar_duplo_fundo(candles, topos, fundos, atrs) -> List[Dict]:
    """Dois fundos no mesmo nível separados por um pico, mais a confirmação."""
    achados = []
    for a in range(len(fundos) - 1):
        for b in range(a + 1, len(fundos)):
            v1, v2 = fundos[a], fundos[b]
            if not parecidos(v1["preco"], v2["preco"], TOLERANCIA_REVERSAO):
                continue

            meio = _entre(topos, v1["i"], v2["i"])
            if not meio:
                continue
            pico = max(meio, key=lambda t: t["preco"])
            base = nivel_medio([v1["preco"], v2["preco"]])
            altura = pico["preco"] - base
            if altura <= 0 or not _relevo_ok(candles, atrs, pico["i"], altura):
                continue

            # Confirmação: fechar acima do pico depois do segundo fundo.
            confirmacao = rompimento_apos(candles, v2["i"], pico["preco"], para_cima=True)
            if not confirmacao:
                continue

            alvo = pico["preco"] + altura
            simetria = 1 - abs(v1["preco"] - v2["preco"]) / max(abs(v1["preco"]), 1e-9)
            achados.append({
                "tipo": "fundo_duplo",
                "nome": "Fundo Duplo",
                "direcao": "alta",
                "confiabilidade": score(60, simetria * 25, min(15, altura / max(base, 1e-9) * 100)),
                "resultado": veredicto(candles, confirmacao["i"], alvo, min(v1["preco"], v2["preco"]), para_cima=True),
                "pontos": {
                    "vale1": ponto(v1), "pico": ponto(pico),
                    "vale2": ponto(v2), "confirmacao": confirmacao,
                },
                "lampada": {"i": v2["i"], "preco": round(v2["preco"] * 0.98, 4)},
                "operacao": {"entrada": round(pico["preco"], 4), "alvo": round(alvo, 4),
                             "stop": round(min(v1["preco"], v2["preco"]), 4)},
                "explicacao": (
                    "O Fundo Duplo é um padrão de REVERSÃO de baixa para alta. O preço "
                    "testa duas vezes o mesmo suporte e não consegue furá-lo; quando "
                    "fecha acima do pico entre os dois fundos, confirma a virada. O alvo "
                    "teórico é a altura do padrão projetada para cima."
                ),
                "intervalo_candles": {"inicio": v1["i"], "fim": confirmacao["i"]},
            })
    return achados


def _detectar_oco_invertido(candles, topos, fundos, atrs) -> List[Dict]:
    """Três fundos com o do meio mais baixo, confirmado acima do pescoço."""
    achados = []
    for k in range(1, len(fundos) - 1):
        oe, cabeca, od = fundos[k - 1], fundos[k], fundos[k + 1]
        if cabeca["preco"] >= oe["preco"] or cabeca["preco"] >= od["preco"]:
            continue
        if not parecidos(oe["preco"], od["preco"], TOLERANCIA_REVERSAO):
            continue

        esquerdo = _entre(topos, oe["i"], cabeca["i"])
        direito = _entre(topos, cabeca["i"], od["i"])
        if not esquerdo or not direito:
            continue

        # O pescoço é a reta entre os dois topos do meio; o ponto guardado é
        # o mais alto deles, que é o que a marcação manual pede (um ponto só,
        # acima dos três fundos).
        t1 = max(esquerdo, key=lambda t: t["preco"])
        t2 = max(direito, key=lambda t: t["preco"])
        pescoco = t1 if t1["preco"] >= t2["preco"] else t2
        neckline = nivel_medio([t1["preco"], t2["preco"]])

        altura = neckline - cabeca["preco"]
        if altura <= 0 or not _relevo_ok(candles, atrs, cabeca["i"], altura):
            continue

        confirmacao = rompimento_apos(candles, od["i"], neckline, para_cima=True)
        if not confirmacao:
            continue

        simetria = 1 - abs(oe["preco"] - od["preco"]) / max(abs(oe["preco"]), 1e-9)
        achados.append({
            "tipo": "oco_invertido",
            "nome": "OCO Invertido",
            "direcao": "alta",
            "confiabilidade": score(62, simetria * 25, min(13, altura / max(neckline, 1e-9) * 100)),
            "resultado": veredicto(candles, confirmacao["i"], neckline + altura, cabeca["preco"], para_cima=True),
            "pontos": {
                "ombro_esq": ponto(oe), "cabeca": ponto(cabeca),
                "ombro_dir": ponto(od), "pescoco": ponto(pescoco),
            },
            "neckline": round(neckline, 4),
            "lampada": {"i": cabeca["i"], "preco": round(cabeca["preco"] * 0.98, 4)},
            "operacao": {"entrada": round(neckline, 4), "alvo": round(neckline + altura, 4),
                         "stop": round(cabeca["preco"], 4)},
            "explicacao": (
                "O Ombro-Cabeça-Ombro Invertido é o espelho do OCO: um padrão de "
                "REVERSÃO de baixa para alta. São três fundos, com o do meio (a cabeça) "
                "mais profundo que os dois ombros. O rompimento da linha de pescoço para "
                "cima confirma, e o alvo é a altura da cabeça projetada acima dela."
            ),
            "intervalo_candles": {"inicio": oe["i"], "fim": confirmacao["i"]},
        })
    return achados


def _detectar_triplo(candles, extremos, meios, atrs, alta: bool) -> List[Dict]:
    """Topo Triplo e Fundo Triplo — o mesmo desenho, espelhado.

    `extremos` são os três no mesmo nível (topos no topo triplo, fundos no
    fundo triplo) e `meios` os dois pivôs entre eles.
    """
    achados = []
    for k in range(len(extremos) - 2):
        e1, e2, e3 = extremos[k], extremos[k + 1], extremos[k + 2]
        precos = [e1["preco"], e2["preco"], e3["preco"]]
        if not parecidos(min(precos), max(precos), TOLERANCIA_REVERSAO):
            continue

        m1 = _entre(meios, e1["i"], e2["i"])
        m2 = _entre(meios, e2["i"], e3["i"])
        if not m1 or not m2:
            continue
        # o miolo mais fundo (ou mais alto) é o que define o nível a romper
        meio1 = min(m1, key=lambda p: p["preco"]) if alta else max(m1, key=lambda p: p["preco"])
        meio2 = min(m2, key=lambda p: p["preco"]) if alta else max(m2, key=lambda p: p["preco"])

        nivel = nivel_medio(precos)
        suporte = nivel_medio([meio1["preco"], meio2["preco"]])
        altura = abs(nivel - suporte)
        if altura <= 0 or not _relevo_ok(candles, atrs, e2["i"], altura):
            continue

        confirmacao = rompimento_apos(candles, e3["i"], suporte, para_cima=not alta)
        if not confirmacao:
            continue

        alvo = suporte - altura if alta else suporte + altura
        achados.append({
            "tipo": "topo_triplo" if alta else "fundo_triplo",
            "nome": "Topo Triplo" if alta else "Fundo Triplo",
            "direcao": "baixa" if alta else "alta",
            "confiabilidade": score(64, (1 - (max(precos) - min(precos)) / max(abs(nivel), 1e-9)) * 20,
                                    min(16, altura / max(abs(nivel), 1e-9) * 100)),
            "resultado": veredicto(candles, confirmacao["i"], alvo, nivel, para_cima=not alta),
            "pontos": (
                {"topo1": ponto(e1), "vale1": ponto(meio1), "topo2": ponto(e2),
                 "vale2": ponto(meio2), "topo3": ponto(e3)}
                if alta else
                {"fundo1": ponto(e1), "pico1": ponto(meio1), "fundo2": ponto(e2),
                 "pico2": ponto(meio2), "fundo3": ponto(e3)}
            ),
            "lampada": {"i": e2["i"], "preco": round(e2["preco"] * (1.02 if alta else 0.98), 4)},
            "operacao": {"entrada": round(suporte, 4), "alvo": round(alvo, 4), "stop": round(nivel, 4)},
            "explicacao": (
                "O Topo Triplo é um padrão de REVERSÃO de alta para baixa: o preço bate "
                "três vezes na mesma resistência e não passa. A perda do suporte entre os "
                "topos confirma a queda."
                if alta else
                "O Fundo Triplo é um padrão de REVERSÃO de baixa para alta: o preço testa "
                "três vezes o mesmo suporte e não fura. O rompimento da resistência entre "
                "os fundos confirma a subida."
            ),
            "intervalo_candles": {"inicio": e1["i"], "fim": confirmacao["i"]},
        })
    return achados


def detectar_reversoes(candles: List[Dict], janela: int = 5,
                       tipos: Optional[List[str]] = None) -> List[Dict]:
    """Fundo Duplo, OCO Invertido, Topo Triplo e Fundo Triplo no histórico."""
    if not candles or len(candles) < (janela * 2 + 5):
        return []

    topos, fundos = encontrar_pivos(candles, janela=janela)
    atrs = calcular_atr(candles)
    quer = (lambda t: True) if not tipos else (lambda t: t in tipos)

    achados: List[Dict] = []
    if quer("fundo_duplo"):
        achados += _detectar_duplo_fundo(candles, topos, fundos, atrs)
    if quer("oco_invertido"):
        achados += _detectar_oco_invertido(candles, topos, fundos, atrs)
    if quer("topo_triplo"):
        achados += _detectar_triplo(candles, topos, fundos, atrs, alta=True)
    if quer("fundo_triplo"):
        achados += _detectar_triplo(candles, fundos, topos, atrs, alta=False)

    return melhor_por_regiao(achados)
