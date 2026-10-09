"""
TRADEZEN — BASE DOS DETECTORES
===============================

O que os detectores de padrão compartilham: comparação de nível, veredicto
de resultado e o recorte que vai pro banco.

Os pivôs (topos e fundos) vêm de pivos.py; o detector de OCO em
classicos.py é o modelo que os daqui seguem — mesmo formato de saída, pra
a rota /detectar e o gráfico tratarem todos igual.
"""

from typing import Dict, List, Optional

# Mesmas tolerâncias da marcação manual (padroes_extras.py): 5% entre
# topos/fundos de um padrão de reversão, 3% nas bordas horizontais de
# triângulo e retângulo. Se o detector fosse mais frouxo que o analista,
# ele acharia padrão que a tela recusaria salvar.
TOLERANCIA_REVERSAO = 0.05
TOLERANCIA_BORDA = 0.03

# Folga de contexto nos dois lados do padrão, em candles — igual à da
# marcação manual (frontend/src/admin/janela.js).
PADDING = 40


def parecidos(a: float, b: float, tolerancia: float) -> bool:
    base = max(abs(a), abs(b))
    return True if base == 0 else abs(a - b) / base <= tolerancia


def nivel_medio(precos: List[float]) -> float:
    return sum(precos) / len(precos)


def inclinacao(a: Dict, b: Dict) -> float:
    """Preço por candle entre dois pivôs."""
    return 0.0 if b["i"] == a["i"] else (b["preco"] - a["preco"]) / (b["i"] - a["i"])


def ponto(p: Dict) -> Dict:
    return {"i": p["i"], "preco": round(p["preco"], 4)}


def rompimento_apos(candles: List[Dict], desde: int, nivel: float, para_cima: bool,
                    prazo: int = 60) -> Optional[Dict]:
    """Primeiro candle que FECHA do outro lado do nível — a confirmação.

    Fechamento, e não máxima/mínima: um pavio que fura o nível e volta não
    confirma padrão nenhum, e era assim que o detector de OCO já tratava
    rompimento (ver _rompimento_antes_de em classicos.py).
    """
    fim = min(len(candles), desde + 1 + prazo)
    for i in range(desde + 1, fim):
        fechou = candles[i]["fechamento"]
        if (fechou > nivel) if para_cima else (fechou < nivel):
            return {"i": i, "preco": round(fechou, 4)}
    return None


def veredicto(candles: List[Dict], desde: int, alvo: float, stop: float,
              para_cima: bool, prazo: int = 90) -> str:
    """O padrão funcionou? Olha o que veio DEPOIS da confirmação.

    "pendente" quando nem alvo nem stop foram tocados dentro do prazo —
    esses ficam de fora de qualquer estatística, porque ainda não têm
    veredicto, não porque deram errado.
    """
    fim = min(len(candles), desde + 1 + prazo)
    for i in range(desde + 1, fim):
        maxima, minima = candles[i]["maxima"], candles[i]["minima"]
        if para_cima:
            if maxima >= alvo:
                return "sucesso"
            if minima <= stop:
                return "falhou"
        else:
            if minima <= alvo:
                return "sucesso"
            if maxima >= stop:
                return "falhou"
    return "pendente"


# Teto da confiabilidade de quem foi DETECTADO. Marcação manual vale 100
# (padroes_marcados.py): o analista olhou. O detector não olha, então não
# empata com ele nem por acidente.
TETO_AUTOMATICO = 90


def score(base: int, *ajustes: float) -> int:
    """Confiabilidade de 0 a TETO_AUTOMATICO, no mesmo formato do OCO."""
    return max(0, min(TETO_AUTOMATICO, round(base + sum(ajustes))))


def melhor_por_regiao(achados: List[Dict]) -> List[Dict]:
    """Um padrão por região do gráfico.

    As janelas de pivô se sobrepõem muito: o mesmo fundo duplo aparece
    dezenas de vezes com uma ponta a mais ou a menos (numa amostra de 5
    ativos foram 632 achados pra 20 padrões de verdade). Fica o de maior
    confiabilidade; empate, o mais curto, que é o desenho mais limpo.
    Mesma ideia do _competicao_regiao do detector de OCO.
    """
    vencedores: List[Dict] = []
    def duracao(p):
        return p["intervalo_candles"]["fim"] - p["intervalo_candles"]["inicio"]

    for p in sorted(achados, key=lambda x: (-x["confiabilidade"], duracao(x))):
        ini, fim = p["intervalo_candles"]["inicio"], p["intervalo_candles"]["fim"]
        colide = any(
            p["tipo"] == v["tipo"]
            and not (fim < v["intervalo_candles"]["inicio"] or ini > v["intervalo_candles"]["fim"])
            for v in vencedores
        )
        if not colide:
            vencedores.append(p)
    return sorted(vencedores, key=lambda p: p["intervalo_candles"]["inicio"])


def recorte(candles: List[Dict], pontos: Dict[str, Dict]) -> Dict:
    """O que vai pro banco: a região do padrão com folga dos dois lados, e
    os pontos reindexados pra esse recorte.

    Mesma conta do admin (janela.js): sem reindexar, o padrão reabriria
    nos candles errados.
    """
    indices = [p["i"] for p in pontos.values()]
    de = max(0, min(indices) - PADDING)
    ate = min(len(candles) - 1, max(indices) + PADDING)
    return {
        "candles": candles[de:ate + 1],
        "pontos": {k: {"i": p["i"] - de, "preco": p["preco"]} for k, p in pontos.items()},
        "inicio": de,
    }
