"""
TRADEZEN — DETECTORES DE CONSOLIDAÇÃO
======================================

Triângulo Ascendente, Descendente, Simétrico e Retângulo.

Diferente dos padrões de reversão, aqui não existe "o ponto": existem
duas BORDAS, cada uma com pelo menos dois toques. O detector procura
janelas de pivôs em que os topos e os fundos formam duas retas com a
inclinação certa, e guarda as pontas de cada reta — que é exatamente o
que a marcação manual pede (res_esq/res_dir/sup_esq/sup_dir).
"""

from typing import Dict, List, Optional

from patterns.comum import (
    TOLERANCIA_BORDA, inclinacao, melhor_por_regiao, nivel_medio, parecidos,
    ponto, rompimento_apos, score, veredicto,
)
from patterns.pivos import calcular_atr, encontrar_pivos

# Toques por borda. Dois já definem a reta; é o mínimo que o padrão exige.
TOQUES_MINIMOS = 2
# Quanto a borda inclinada precisa andar, em % do preço, pra ser "subindo"
# ou "descendo" de verdade e não ruído de pivô.
INCLINACAO_MINIMA = 0.01


def _alinhados(pivos: List[Dict], tolerancia: float) -> bool:
    precos = [p["preco"] for p in pivos]
    return parecidos(min(precos), max(precos), tolerancia)


def _monotonos(pivos: List[Dict], subindo: bool) -> bool:
    for a, b in zip(pivos, pivos[1:]):
        if (b["preco"] <= a["preco"]) if subindo else (b["preco"] >= a["preco"]):
            return False
    extremos = (pivos[-1]["preco"] - pivos[0]["preco"]) / max(abs(pivos[0]["preco"]), 1e-9)
    return abs(extremos) >= INCLINACAO_MINIMA


def _janelas(topos: List[Dict], fundos: List[Dict]):
    """Trechos candidatos: sequências de topos e fundos que se sobrepõem no
    tempo, com pelo menos 2 toques de cada lado."""
    for a in range(len(topos) - (TOQUES_MINIMOS - 1)):
        for b in range(a + TOQUES_MINIMOS - 1, len(topos)):
            grupo_topos = topos[a:b + 1]
            inicio, fim = grupo_topos[0]["i"], grupo_topos[-1]["i"]
            grupo_fundos = [f for f in fundos if inicio <= f["i"] <= fim]
            if len(grupo_fundos) >= TOQUES_MINIMOS:
                yield grupo_topos, grupo_fundos


def _pontos_do_triangulo(res: List[Dict], sup: List[Dict]) -> Dict[str, Dict]:
    """Os 3 pontos que a marcação manual usa: a base e o vértice.

    A tela guarda o triângulo como P1, P2 e P3 — posições, sem papel de
    topo ou fundo. Aqui P1/P2 são as pontas da linha de baixo e P3 é o
    começo da de cima, que é por onde o triângulo abre.
    """
    return {"p1": ponto(sup[0]), "p2": ponto(sup[-1]), "p3": ponto(res[0])}


def _pontos_do_retangulo(res: List[Dict], sup: List[Dict]) -> Dict[str, Dict]:
    """P1/P2 fecham a linha de baixo; P3/P4, a de cima."""
    return {
        "p1": ponto(sup[0]), "p2": ponto(sup[-1]),
        "p3": ponto(res[0]), "p4": ponto(res[-1]),
    }


def _padrao(candles, tipo, nome, direcao, res, sup, explicacao, atrs) -> Optional[Dict]:
    """Monta o padrão a partir das duas bordas, se houver confirmação.

    Os pontos saem no formato da tela: 3 no triângulo, 4 no retângulo.
    """
    res_esq, res_dir = res[0], res[-1]
    sup_esq, sup_dir = sup[0], sup[-1]
    inicio = min(res_esq["i"], sup_esq["i"])
    fim = max(res_dir["i"], sup_dir["i"])

    altura = nivel_medio([res_esq["preco"], res_dir["preco"]]) - nivel_medio([sup_esq["preco"], sup_dir["preco"]])
    if altura <= 0:
        return None

    # Rompimento: pro lado que o padrão sugere. No simétrico e no retângulo
    # ele pode sair pros dois lados — vale o primeiro que acontecer.
    nivel_cima = max(res_esq["preco"], res_dir["preco"])
    nivel_baixo = min(sup_esq["preco"], sup_dir["preco"])
    if direcao == "alta":
        confirmacao, para_cima = rompimento_apos(candles, fim, nivel_cima, True), True
    elif direcao == "baixa":
        confirmacao, para_cima = rompimento_apos(candles, fim, nivel_baixo, False), False
    else:
        acima = rompimento_apos(candles, fim, nivel_cima, True)
        abaixo = rompimento_apos(candles, fim, nivel_baixo, False)
        if acima and abaixo:
            para_cima = acima["i"] <= abaixo["i"]
            confirmacao = acima if para_cima else abaixo
        else:
            confirmacao, para_cima = (acima, True) if acima else (abaixo, False)
    if not confirmacao:
        return None

    entrada = nivel_cima if para_cima else nivel_baixo
    alvo = entrada + altura if para_cima else entrada - altura
    stop = nivel_baixo if para_cima else nivel_cima

    toques = len(res) + len(sup)
    pontos = (
        _pontos_do_retangulo(res, sup) if tipo == "retangulo"
        else _pontos_do_triangulo(res, sup)
    )
    return {
        "tipo": tipo,
        "nome": nome,
        "direcao": "alta" if para_cima else "baixa",
        "confiabilidade": score(58, min(20, (toques - 4) * 5), min(12, altura / max(entrada, 1e-9) * 100)),
        "resultado": veredicto(candles, confirmacao["i"], alvo, stop, para_cima=para_cima),
        "pontos": pontos,
        "toques": toques,
        "confirmacao": confirmacao,
        "lampada": {"i": inicio, "preco": round(nivel_cima * 1.02, 4)},
        "operacao": {"entrada": round(entrada, 4), "alvo": round(alvo, 4), "stop": round(stop, 4)},
        "explicacao": explicacao,
        "intervalo_candles": {"inicio": inicio, "fim": confirmacao["i"]},
    }


def detectar_consolidacoes(candles: List[Dict], janela: int = 5,
                           tipos: Optional[List[str]] = None) -> List[Dict]:
    """Os três triângulos e o retângulo no histórico."""
    if not candles or len(candles) < (janela * 2 + 5):
        return []

    topos, fundos = encontrar_pivos(candles, janela=janela)
    atrs = calcular_atr(candles)
    quer = (lambda t: True) if not tipos else (lambda t: t in tipos)
    achados: List[Dict] = []

    for res, sup in _janelas(topos, fundos):
        topos_planos = _alinhados(res, TOLERANCIA_BORDA)
        fundos_planos = _alinhados(sup, TOLERANCIA_BORDA)
        topos_caindo = _monotonos(res, subindo=False)
        fundos_subindo = _monotonos(sup, subindo=True)

        achado = None
        if quer("retangulo") and topos_planos and fundos_planos:
            achado = _padrao(
                candles, "retangulo", "Retângulo", "qualquer", res, sup,
                "O Retângulo é uma consolidação: o preço anda de lado entre um suporte e "
                "uma resistência horizontais, sem decidir o rumo. O rompimento de uma das "
                "bordas costuma vir com força, e o alvo é a altura do retângulo projetada "
                "para o lado do rompimento.", atrs)
        elif quer("triangulo_ascendente") and topos_planos and fundos_subindo:
            achado = _padrao(
                candles, "triangulo_ascendente", "Triângulo Ascendente", "alta", res, sup,
                "No Triângulo Ascendente a resistência é horizontal e o suporte sobe: os "
                "compradores aceitam pagar cada vez mais caro enquanto os vendedores "
                "seguram o mesmo teto. O rompimento costuma ser para cima.", atrs)
        elif quer("triangulo_descendente") and fundos_planos and topos_caindo:
            achado = _padrao(
                candles, "triangulo_descendente", "Triângulo Descendente", "baixa", res, sup,
                "No Triângulo Descendente o suporte é horizontal e a resistência cai: os "
                "vendedores aceitam vender cada vez mais barato enquanto o suporte segura. "
                "O rompimento costuma ser para baixo.", atrs)
        elif quer("triangulo_simetrico") and topos_caindo and fundos_subindo:
            achado = _padrao(
                candles, "triangulo_simetrico", "Triângulo Simétrico", "qualquer", res, sup,
                "No Triângulo Simétrico as duas bordas convergem: os topos caem e os fundos "
                "sobem, até o preço ficar sem espaço. É um padrão de continuação — o "
                "rompimento tende a seguir a tendência que vinha antes.", atrs)

        if achado:
            achados.append(achado)

    return melhor_por_regiao(achados)
