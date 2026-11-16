"""As 12 features de uma bandeira marcada.

DE ONDE VÊM OS CANDLES: do próprio template. A tabela guarda `candles` (o
recorte) e `candles_contexto` (o histórico inteiro que estava na tela), e é
de lá que tudo é medido. Não há chamada ao Yahoo nem à Binance.

Isso não é economia de rede, é correção: o template foi marcado SOBRE
aqueles candles. Buscar o período de novo traria a série como ela está
hoje — ajustada por proventos, com o pregão de ontem incluído, às vezes
com candle a mais ou a menos — e as features sairiam de uma série
diferente daquela que a pessoa olhou quando disse "esta é uma bandeira".
Treinar nisso é treinar no que ninguém marcou.

TRÊS FORMATOS DE PONTO coexistem no banco (ver bandeira_pontos.py):
8 pontos em pares (alta, atual), 6 cronológicos e 6 do nome antigo. O
modelo não pode enxergar só um terço do acervo, então aqui os três são
traduzidos para a MESMA geometria antes de qualquer conta.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

ALTURA = "maxima"
FUNDO = "minima"
FECHA = "fechamento"
VOLUME = "volume"

# Nomes das 12 features, na ordem em que entram na matriz. A ordem é
# contrato: o .pkl guarda um modelo que espera as colunas nesta sequência,
# e trocá-las sem retreinar faria o modelo ler retração como volume.
NOMES_FEATURES = [
    "retracao_pct",
    "inclinacao_canal",
    "duracao_bandeira",
    "duracao_mastro",
    "ratio_duracao",
    "amplitude_mastro_atr",
    "amplitude_bandeira_atr",
    "volume_mastro_medio",
    "volume_bandeira_medio",
    "ratio_volume",
    "toques_topo",
    "toques_fundo",
]


class TemplateInvalido(Exception):
    """O template não dá para medir. A mensagem diz o quê, para a marcação
    poder ser corrigida — ver o relatório de pulados no trainer."""


def _indice(ponto: Any) -> Optional[int]:
    if isinstance(ponto, dict):
        i = ponto.get("i")
        return i if isinstance(i, int) else None
    return None


def _preco(ponto: Any) -> Optional[float]:
    if isinstance(ponto, dict):
        p = ponto.get("preco")
        try:
            return float(p)
        except (TypeError, ValueError):
            return None
    return None


def geometria(pontos: Dict[str, Any]) -> Dict[str, Any]:
    """Traduz qualquer um dos três formatos para a mesma geometria.

    Devolve os índices do mastro, da consolidação e do rompimento, mais os
    níveis de topo e fundo da bandeira. É a única parte do arquivo que
    sabe que existem três formatos; o resto mede.
    """
    if not isinstance(pontos, dict) or not pontos:
        raise TemplateInvalido("sem pontos")

    tem = lambda *chaves: all(k in pontos for k in chaves)  # noqa: E731

    # Formato atual da alta: 8 pontos em 4 pares.
    if tem("p1_inicio_mastro1", "p2_topo_mastro1", "p3_inicio_fundo",
           "p4_fim_fundo", "p5_inicio_topo", "p6_fim_topo", "p7_inicio_mastro2"):
        fundos = [pontos["p3_inicio_fundo"], pontos["p4_fim_fundo"]]
        topos = [pontos["p5_inicio_topo"], pontos["p6_fim_topo"]]
        geo = {
            "mastro": (pontos["p1_inicio_mastro1"], pontos["p2_topo_mastro1"]),
            "fundos": fundos,
            "topos": topos,
            # O rompimento é o começo do Mastro 2: é ali que a consolidação
            # acaba e o preço sai dela.
            "rompimento": pontos["p7_inicio_mastro2"],
            "formato": "pares8",
        }
    # Seis pontos cronológicos.
    elif tem("p1_inicio_mastro", "p2_topo_mastro", "p3_fundo1", "p4_topo1",
             "p5_fundo2", "p6_rompimento"):
        geo = {
            "mastro": (pontos["p1_inicio_mastro"], pontos["p2_topo_mastro"]),
            "fundos": [pontos["p3_fundo1"], pontos["p5_fundo2"]],
            "topos": [pontos["p4_topo1"]],
            "rompimento": pontos["p6_rompimento"],
            "formato": "crono6",
        }
    # Nomes antigos.
    elif tem("mastro_inicio", "mastro_fim", "topo1", "topo2", "fundo1", "fundo2"):
        geo = {
            "mastro": (pontos["mastro_inicio"], pontos["mastro_fim"]),
            "fundos": [pontos["fundo1"], pontos["fundo2"]],
            "topos": [pontos["topo1"], pontos["topo2"]],
            # Sem ponto de rompimento: o último candle marcado faz as vezes.
            "rompimento": max(
                (pontos[k] for k in ("topo2", "fundo2")),
                key=lambda p: _indice(p) if _indice(p) is not None else -1,
            ),
            "formato": "legado6",
        }
    else:
        raise TemplateInvalido(
            f"formato de pontos desconhecido (chaves: {sorted(pontos)[:8]})")

    for nome, ponto in (("mastro inicial", geo["mastro"][0]),
                        ("mastro final", geo["mastro"][1]),
                        ("rompimento", geo["rompimento"])):
        if _indice(ponto) is None or _preco(ponto) is None:
            raise TemplateInvalido(f"ponto do {nome} sem índice ou sem preço")
    return geo


def atr(candles: List[dict], ate: int, janela: int = 14) -> Optional[float]:
    """ATR das `janela` velas ANTERIORES ao índice `ate`.

    Anteriores de propósito: o ATR serve de régua pra dizer se o mastro é
    grande, e a régua não pode ser feita com o próprio mastro dentro — um
    mastro enorme inflaria o ATR e se mediria como normal.
    """
    inicio = max(0, ate - janela)
    trechos = candles[inicio:ate]
    if len(trechos) < 2:
        return None
    soma = 0.0
    for atual, anterior in zip(trechos[1:], trechos[:-1]):
        try:
            alta, baixa = float(atual[ALTURA]), float(atual[FUNDO])
            fecha_ant = float(anterior[FECHA])
        except (KeyError, TypeError, ValueError):
            return None
        soma += max(alta - baixa, abs(alta - fecha_ant), abs(baixa - fecha_ant))
    media = soma / (len(trechos) - 1)
    return media if media > 0 else None


def _inclinacao(valores: List[float]) -> float:
    """Coeficiente angular por mínimos quadrados, em preço por candle.

    Escrito à mão em vez de numpy.polyfit porque são duas linhas de três a
    vinte pontos: trazer dependência pra isso não se paga.
    """
    n = len(valores)
    if n < 2:
        return 0.0
    media_x = (n - 1) / 2
    media_y = sum(valores) / n
    cima = sum((i - media_x) * (v - media_y) for i, v in enumerate(valores))
    baixo = sum((i - media_x) ** 2 for i in range(n))
    return cima / baixo if baixo else 0.0


def extrair(template: dict) -> Dict[str, float]:
    """As 12 features de um template. Levanta TemplateInvalido com motivo."""
    candles = template.get("candles_contexto") or template.get("candles") or []
    if len(candles) < 20:
        raise TemplateInvalido(f"só {len(candles)} candles guardados (mínimo 20)")

    geo = geometria(template.get("pontos") or {})
    i_mastro_ini = _indice(geo["mastro"][0])
    i_mastro_fim = _indice(geo["mastro"][1])
    i_romp = _indice(geo["rompimento"])

    for nome, i in (("mastro inicial", i_mastro_ini), ("mastro final", i_mastro_fim),
                    ("rompimento", i_romp)):
        if not 0 <= i < len(candles):
            raise TemplateInvalido(
                f"o ponto do {nome} aponta pro candle {i}, e o trecho tem "
                f"{len(candles)} — a marcação está fora dos candles salvos")

    p_mastro_ini = _preco(geo["mastro"][0])
    p_mastro_fim = _preco(geo["mastro"][1])
    altura_mastro = abs(p_mastro_fim - p_mastro_ini)
    if altura_mastro <= 0:
        raise TemplateInvalido("mastro com altura zero (os dois pontos no mesmo preço)")

    precos_topo = [p for p in (_preco(t) for t in geo["topos"]) if p is not None]
    precos_fundo = [p for p in (_preco(f) for f in geo["fundos"]) if p is not None]
    if not precos_topo or not precos_fundo:
        raise TemplateInvalido("topo ou fundo da bandeira sem preço")
    topo_band, fundo_band = max(precos_topo), min(precos_fundo)
    altura_band = abs(topo_band - fundo_band)

    # Janela da consolidação: do primeiro ponto dela até o rompimento.
    indices_band = [i for i in (
        [_indice(p) for p in geo["fundos"]] + [_indice(p) for p in geo["topos"]]
    ) if i is not None]
    i_band_ini = min(indices_band) if indices_band else i_mastro_fim
    i_band_ini = max(0, min(i_band_ini, len(candles) - 1))
    duracao_band = max(1, i_romp - i_band_ini)
    duracao_mastro = max(1, abs(i_mastro_fim - i_mastro_ini))

    regua = atr(candles, min(i_mastro_ini, i_mastro_fim))
    if regua is None:
        raise TemplateInvalido("não deu pra calcular o ATR antes do mastro")

    fatia_mastro = candles[min(i_mastro_ini, i_mastro_fim):max(i_mastro_ini, i_mastro_fim) + 1]
    fatia_band = candles[i_band_ini:i_romp + 1] or candles[i_band_ini:i_band_ini + 1]

    def media_volume(fatia):
        vols = []
        for c in fatia:
            try:
                vols.append(float(c.get(VOLUME) or 0))
            except (TypeError, ValueError):
                pass
        return sum(vols) / len(vols) if vols else 0.0

    vol_mastro = media_volume(fatia_mastro)
    vol_band = media_volume(fatia_band)

    # VOLUME NORMALIZADO, e não o número cru. Volume absoluto de PETR4 e de
    # BTC não são a mesma grandeza — crus, eles viram um identificador do
    # ativo, e a árvore aprende "é cripto" em vez de "o volume secou na
    # consolidação", que é a informação que interessa. A régua é a mediana
    # do contexto, do mesmo ativo e do mesmo período.
    vols_contexto = sorted(
        v for v in (float(c.get(VOLUME) or 0) for c in candles) if v > 0)
    base_vol = vols_contexto[len(vols_contexto) // 2] if vols_contexto else 0.0

    # Inclinação do canal: média das duas linhas (máximas e mínimas da
    # consolidação), em altura-de-mastro por candle. Dividir pela altura do
    # mastro tira a escala de preço — 2 reais por candle é muito no PETR4 e
    # nada no BTC.
    maximas = [float(c[ALTURA]) for c in fatia_band if ALTURA in c]
    minimas = [float(c[FUNDO]) for c in fatia_band if FUNDO in c]
    inclinacao = (_inclinacao(maximas) + _inclinacao(minimas)) / 2
    inclinacao_norm = inclinacao / altura_mastro

    # Toques: tolerância de 10% da altura da bandeira. Sem tolerância, o
    # toque exato quase nunca acontece e as duas features ficariam zero em
    # todos os templates — feature constante não informa nada à árvore.
    tol = max(altura_band * 0.10, regua * 0.05)
    toques_topo = sum(1 for c in fatia_band
                      if ALTURA in c and abs(float(c[ALTURA]) - topo_band) <= tol)
    toques_fundo = sum(1 for c in fatia_band
                       if FUNDO in c and abs(float(c[FUNDO]) - fundo_band) <= tol)

    return {
        "retracao_pct": altura_band / altura_mastro,
        "inclinacao_canal": inclinacao_norm,
        "duracao_bandeira": float(duracao_band),
        "duracao_mastro": float(duracao_mastro),
        "ratio_duracao": duracao_band / duracao_mastro,
        "amplitude_mastro_atr": altura_mastro / regua,
        "amplitude_bandeira_atr": altura_band / regua,
        "volume_mastro_medio": (vol_mastro / base_vol) if base_vol else 0.0,
        "volume_bandeira_medio": (vol_band / base_vol) if base_vol else 0.0,
        "ratio_volume": (vol_band / vol_mastro) if vol_mastro else 0.0,
        "toques_topo": float(toques_topo),
        "toques_fundo": float(toques_fundo),
    }


def em_linha(features: Dict[str, float]) -> List[float]:
    """O dicionário na ordem de NOMES_FEATURES — a ordem é contrato."""
    return [features[n] for n in NOMES_FEATURES]
