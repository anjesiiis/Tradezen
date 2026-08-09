"""
TRADEZEN — DETECTOR DE PADRÕES CLÁSSICOS
=========================================

Padrões implementados:
  • OCO — Ombro-Cabeça-Ombro (reversão de ALTA -> BAIXA)

Calibrações v4 — semântica + competição:
  R1: Ancoragem no impulso real (higher-highs + higher-lows antes da cabeça)
  R2: Penalidade por neckline longa (distância temporal entre neck1 e neck2)
  R3: Ombro direito não pode existir após rompimento da neckline
  R4: Competição por região visual — só o melhor OCO de cada região sobrevive
"""

from typing import List, Dict, Tuple, Optional

from patterns.pivos import encontrar_pivos


# ──────────────────────────────────────────────────────────────
# 2) ANÁLISE DE GAPS
# ──────────────────────────────────────────────────────────────
def _analisar_gaps(candles: List[Dict], pontos: Dict, limiar: float = 0.02) -> Dict:
    def gap_entre(i_ini, i_fim):
        maior = 0.0
        for i in range(max(1, i_ini), min(len(candles), i_fim + 1)):
            g = abs(candles[i]["abertura"] - candles[i-1]["fechamento"])
            pct = g / candles[i-1]["fechamento"] if candles[i-1]["fechamento"] else 0
            maior = max(maior, pct)
        return maior

    oe = pontos["ombro_esq"]["i"]
    n1 = pontos["neck1"]["i"]
    n2 = pontos["neck2"]["i"]
    od = pontos["ombro_dir"]["i"]

    gap_cabeca  = gap_entre(n1, n2)
    gap_ombro_e = gap_entre(oe, n1)
    gap_ombro_d = gap_entre(n2, od)

    ajuste = 0
    detalhes = {}

    if gap_cabeca > limiar:
        ajuste += 8
        detalhes["cabeca"] = {"pct": round(gap_cabeca * 100, 1), "tipo": "exaustao", "efeito": "+8"}
    if gap_ombro_e > limiar:
        penalidade = min(15, round(gap_ombro_e * 200))
        ajuste -= penalidade
        detalhes["ombro_esq"] = {"pct": round(gap_ombro_e * 100, 1), "tipo": "ruido", "efeito": f"-{penalidade}"}
    if gap_ombro_d > limiar:
        penalidade = min(15, round(gap_ombro_d * 200))
        ajuste -= penalidade
        detalhes["ombro_dir"] = {"pct": round(gap_ombro_d * 100, 1), "tipo": "ruido", "efeito": f"-{penalidade}"}

    return {"ajuste": ajuste, "detalhes": detalhes}


# ──────────────────────────────────────────────────────────────
# 3) REGRA R1 — Início real do impulso
# ──────────────────────────────────────────────────────────────
def _encontrar_inicio_impulso(topos: List[Dict], fundos: List[Dict],
                               ca_idx: int) -> Optional[int]:
    """
    Procura, de trás pra frente a partir da cabeça, o ÚLTIMO momento em
    que a estrutura de alta começou. Critério:
      - Caminha do topo da cabeça pra trás
      - Acha o último topo que NÃO é higher-high em relação ao anterior
        (ou o início dos dados)
      - O início do impulso é o fundo logo após esse ponto

    Retorna o índice de candle a partir do qual o ombro esquerdo é válido.
    Se não consegue determinar, retorna None (não rejeita por falta de dado).
    """
    # Topos antes da cabeça, em ordem temporal
    topos_antes = [t for t in topos if t["i"] < ca_idx]
    if len(topos_antes) < 2:
        return None  # poucos dados — não rejeita

    # Caminha de trás pra frente: enquanto cada topo é HIGHER que o anterior,
    # está na mesma sequência de impulso. Quando quebra, achou o início.
    inicio_topo_idx = topos_antes[0]["i"]  # default: começo dos dados
    for k in range(len(topos_antes) - 1, 0, -1):
        atual = topos_antes[k]
        anterior = topos_antes[k - 1]
        if atual["preco"] <= anterior["preco"]:
            # Quebrou a sequência higher-high. Impulso começa após `anterior`.
            inicio_topo_idx = anterior["i"]
            break

    # O início real do impulso é o fundo logo após esse topo de quebra
    fundos_apos = [f for f in fundos if f["i"] > inicio_topo_idx]
    if fundos_apos:
        return fundos_apos[0]["i"]
    return inicio_topo_idx


# ──────────────────────────────────────────────────────────────
# 4) REGRA R3 — Rompimento da neckline antes do OD
# ──────────────────────────────────────────────────────────────
def _rompimento_antes_de(candles: List[Dict], neckline: float,
                          i_ini: int, i_fim: int) -> bool:
    """
    Verifica se algum candle entre i_ini e i_fim (exclusivo) fechou abaixo
    da neckline. Usado pra rejeitar OD que se forma após o rompimento.
    """
    for i in range(i_ini + 1, i_fim):
        if 0 <= i < len(candles) and candles[i]["fechamento"] < neckline:
            return True
    return False


# ──────────────────────────────────────────────────────────────
# 5) VERIFICAR RESULTADO
# ──────────────────────────────────────────────────────────────
def _verificar_resultado(candles: List[Dict], od_idx: int,
                         neckline: float, alvo: float, stop: float,
                         prazo: int = 20) -> Dict:
    inicio = od_idx + 1
    fim    = min(len(candles), inicio + prazo)

    if len(candles) - inicio < 5:
        return {"resultado": "pendente", "motivo": "padrão recente"}

    confirmou = False
    idx_rompimento = None
    gap_rompimento = False

    for i in range(inicio, fim):
        if candles[i]["fechamento"] < neckline:
            confirmou = True
            idx_rompimento = i
            if candles[i]["abertura"] < neckline:
                gap_rompimento = True
            break

    if not confirmou:
        return {"resultado": "falhou", "motivo": "não rompeu neckline"}

    fim2 = min(len(candles), idx_rompimento + prazo)
    for i in range(idx_rompimento, fim2):
        if candles[i]["minima"] <= alvo:
            return {"resultado": "sucesso", "motivo": "atingiu alvo",
                    "gap_rompimento": gap_rompimento,
                    "candles_ate_alvo": i - idx_rompimento}
        if candles[i]["maxima"] >= stop:
            return {"resultado": "falhou", "motivo": "bateu stop",
                    "gap_rompimento": gap_rompimento}

    return {"resultado": "falhou", "motivo": "expirou sem atingir alvo",
            "gap_rompimento": gap_rompimento}


# ──────────────────────────────────────────────────────────────
# 6) SCORING — com R2 (neckline longa penaliza)
# ──────────────────────────────────────────────────────────────
def _score_oco(dif_ombros, dif_neck, projecao, razao_simetria,
               profundidade, span, ajuste_gaps=0, tendencia=0.0,
               od_menor_oe=False, lado_dir_maior=False,
               neck_span_ratio=0.5) -> Tuple[int, Dict]:
    """
    neck_span_ratio: (i_neck2 - i_neck1) / span_total
      Ideal: 0.3 a 0.6 (neckline compacta dentro do padrão)
      Péssimo: > 0.85 (necks muito espalhados = padrão "esticado")
    """
    def faixa(valor, ideal, pessimo):
        if pessimo == ideal:
            return 1.0
        t = (valor - ideal) / (pessimo - ideal)
        return max(0.0, min(1.0, 1.0 - t))

    # Ombros
    ZONA_OMBROS = 0.05
    if dif_ombros <= ZONA_OMBROS:
        s_ombros = 1.0
    elif od_menor_oe:
        s_ombros = faixa(dif_ombros, ZONA_OMBROS, 0.20)
    else:
        s_ombros = faixa(dif_ombros, ZONA_OMBROS, 0.12)

    s_neck = faixa(dif_neck, 0.0, 0.10)
    s_proj = faixa(projecao, 0.05, 0.008) if projecao <= 0.05 else faixa(projecao, 0.05, 0.25)

    if lado_dir_maior:
        razao_ajustada = min(1.0, razao_simetria * 1.35)
        s_sim = faixa(razao_ajustada, 1.0, 0.35)
    else:
        s_sim = faixa(razao_simetria, 1.0, 0.35)

    s_prof = faixa(profundidade, 0.04, 0.008) if profundidade < 0.04 else 1.0
    s_comp = faixa(span, 20, 6) if span <= 20 else faixa(span, 20, 70)
    s_tend = faixa(tendencia, 0.08, 0.02)

    # R2: Neckline longa penaliza
    # Ideal: 0.3-0.6. Péssimo: 0.85+ (neck ocupa todo o span = esticado)
    if neck_span_ratio <= 0.6:
        s_neck_span = 1.0
    else:
        s_neck_span = faixa(neck_span_ratio, 0.6, 0.85)

    pesos = {
        "ombros":       0.18,
        "neckline":     0.14,
        "projecao":     0.14,
        "simetria":     0.14,
        "profundidade": 0.08,
        "compacidade":  0.08,
        "tendencia":    0.10,
        "neck_span":    0.14,   # R2 — peso significativo
    }

    score01 = (
        s_ombros    * pesos["ombros"] +
        s_neck      * pesos["neckline"] +
        s_proj      * pesos["projecao"] +
        s_sim       * pesos["simetria"] +
        s_prof      * pesos["profundidade"] +
        s_comp      * pesos["compacidade"] +
        s_tend      * pesos["tendencia"] +
        s_neck_span * pesos["neck_span"]
    )

    score_final = max(0, min(100, round(score01 * 100) + ajuste_gaps))

    detalhes = {
        "ombros":       round(s_ombros * 100),
        "neckline":     round(s_neck * 100),
        "projecao":     round(s_proj * 100),
        "simetria":     round(s_sim * 100),
        "profundidade": round(s_prof * 100),
        "compacidade":  round(s_comp * 100),
        "tendencia":    round(s_tend * 100),
        "neck_span":    round(s_neck_span * 100),
        "ajuste_gaps":  ajuste_gaps,
    }
    return score_final, detalhes


# ──────────────────────────────────────────────────────────────
# 7) DETECTOR OCO
# ──────────────────────────────────────────────────────────────
def _detectar_oco(candles, topos, fundos,
                  tol_ombros_max=0.12, tol_neckline_max=0.10,
                  min_projecao=0.008, max_projecao=0.25,
                  min_profundidade=0.008, min_span=6, max_span=70,
                  tol_simetria_min=0.35, score_minimo=55):
    padroes = []
    if len(topos) < 3:
        return padroes

    for a in range(len(topos) - 2):
        oe = topos[a]
        ca = topos[a + 1]
        od = topos[a + 2]

        # Cabeça mais alta
        tol_cabeca = 0.001
        if not (ca["preco"] > oe["preco"] * (1 - tol_cabeca) and
                ca["preco"] > od["preco"] * (1 - tol_cabeca) and
                ca["preco"] >= max(oe["preco"], od["preco"])):
            continue

        # Ombros 2% abaixo
        dist_oe = (ca["preco"] - oe["preco"]) / ca["preco"]
        dist_od = (ca["preco"] - od["preco"]) / ca["preco"]
        if dist_oe < 0.02 or dist_od < 0.02:
            continue

        media_ombros = (oe["preco"] + od["preco"]) / 2
        if not media_ombros:
            continue

        od_menor_oe = od["preco"] < oe["preco"]
        dif_ombros = abs(oe["preco"] - od["preco"]) / media_ombros
        dif_ombros_filtro = dif_ombros * (0.65 if od_menor_oe else 1.0)
        if dif_ombros_filtro > tol_ombros_max:
            continue

        projecao = (ca["preco"] - media_ombros) / media_ombros
        if not (min_projecao <= projecao <= max_projecao):
            continue

        span = od["i"] - oe["i"]
        if not (min_span <= span <= max_span):
            continue

        lado_esq = ca["i"] - oe["i"]
        lado_dir = od["i"] - ca["i"]
        if not lado_esq or not lado_dir:
            continue

        # Anti-esticado
        if lado_esq > 0.60 * span:
            continue

        lado_dir_maior = lado_dir > lado_esq
        razao_simetria = min(lado_esq, lado_dir) / max(lado_esq, lado_dir)
        tol_sim_efetiva = 0.25 if lado_dir_maior else tol_simetria_min
        if razao_simetria < tol_sim_efetiva:
            continue

        fundo1 = _fundo_entre(fundos, oe["i"], ca["i"])
        fundo2 = _fundo_entre(fundos, ca["i"], od["i"])
        if not fundo1 or not fundo2:
            continue

        media_neck = (fundo1["preco"] + fundo2["preco"]) / 2
        if not media_neck:
            continue
        dif_neck = abs(fundo1["preco"] - fundo2["preco"]) / media_neck
        if dif_neck > tol_neckline_max:
            continue

        profundidade = (media_ombros - media_neck) / media_ombros
        if profundidade < min_profundidade:
            continue

        # Tendência prévia
        janela_tend = max(15, span)
        ini_tend = max(0, oe["i"] - janela_tend)
        seg_tend = candles[ini_tend:oe["i"]]
        if len(seg_tend) >= 5:
            preco_ini = seg_tend[0]["fechamento"]
            preco_fim = oe["preco"]
            tendencia = (preco_fim - preco_ini) / preco_ini if preco_ini else 0
            if tendencia < 0.01:
                continue
        else:
            tendencia = 0.05

        # ── R1: ANCORAGEM NO IMPULSO ─────────────────────────
        # OE não pode existir antes do início do impulso que levou à cabeça.
        inicio_impulso = _encontrar_inicio_impulso(topos, fundos, ca["i"])
        if inicio_impulso is not None and oe["i"] < inicio_impulso:
            continue

        # ── R3: OD ANTES DO ROMPIMENTO ───────────────────────
        # Entre CA e OD, o preço não pode ter fechado abaixo da neckline.
        # Se fechou, o OCO "rompeu" antes de o OD se formar — invalida.
        if _rompimento_antes_de(candles, media_neck, ca["i"], od["i"]):
            continue

        # Gaps
        pontos_gap = {
            "ombro_esq": {"i": oe["i"]},
            "neck1":     {"i": fundo1["i"]},
            "cabeca":    {"i": ca["i"]},
            "neck2":     {"i": fundo2["i"]},
            "ombro_dir": {"i": od["i"]},
        }
        gaps = _analisar_gaps(candles, pontos_gap)

        # ── R2: razão neckline/span pro score ────────────────
        neck_span = fundo2["i"] - fundo1["i"]
        neck_span_ratio = neck_span / span if span > 0 else 0

        # Score
        score, detalhes = _score_oco(
            dif_ombros, dif_neck, projecao, razao_simetria,
            profundidade, span, gaps["ajuste"], tendencia,
            od_menor_oe=od_menor_oe,
            lado_dir_maior=lado_dir_maior,
            neck_span_ratio=neck_span_ratio,
        )
        if score < score_minimo:
            continue

        # F0 / F_final
        f0 = _fundo_entre(fundos, max(0, oe["i"] - 15), oe["i"])
        if not f0:
            ini = max(0, oe["i"] - 8)
            seg = candles[ini:oe["i"]]
            if seg:
                mc = min(seg, key=lambda c: c["minima"])
                f0 = {"i": ini + seg.index(mc), "preco": mc["minima"]}
            else:
                f0 = {"i": oe["i"], "preco": fundo1["preco"]}

        f_final = _fundo_entre(fundos, od["i"], min(len(candles)-1, od["i"]+15))
        if not f_final:
            fim = min(len(candles), od["i"] + 8)
            seg = candles[od["i"]:fim]
            if seg:
                mc = min(seg, key=lambda c: c["minima"])
                f_final = {"i": od["i"] + seg.index(mc), "preco": mc["minima"]}
            else:
                f_final = {"i": od["i"], "preco": fundo2["preco"]}

        neckline = media_neck
        altura   = ca["preco"] - neckline
        alvo     = neckline - altura
        stop     = ca["preco"]

        prazo_dinamico = max(20, span * 2)
        resultado = _verificar_resultado(
            candles, od["i"], neckline, alvo, stop, prazo=prazo_dinamico
        )

        padroes.append({
            "tipo":               "OCO",
            "nome":               "Ombro-Cabeça-Ombro",
            "direcao":            "baixa",
            "confiabilidade":     score,
            "qualidade_detalhes": detalhes,
            "gaps":               gaps,
            "resultado":          resultado["resultado"],
            "resultado_detalhe":  resultado,
            "pontos": {
                "f0":        {"i": f0["i"],      "preco": round(f0["preco"], 4)},
                "ombro_esq": {"i": oe["i"],      "preco": round(oe["preco"], 4)},
                "neck1":     {"i": fundo1["i"],  "preco": round(fundo1["preco"], 4)},
                "cabeca":    {"i": ca["i"],       "preco": round(ca["preco"], 4)},
                "neck2":     {"i": fundo2["i"],  "preco": round(fundo2["preco"], 4)},
                "ombro_dir": {"i": od["i"],       "preco": round(od["preco"], 4)},
                "f_final":   {"i": f_final["i"], "preco": round(f_final["preco"], 4)},
            },
            "neckline":  round(neckline, 4),
            "lampada":   {"i": ca["i"], "preco": round(ca["preco"] * 1.02, 4)},
            "operacao":  {
                "entrada": round(neckline, 4),
                "alvo":    round(alvo, 4),
                "stop":    round(stop, 4),
            },
            "explicacao": (
                "O Ombro-Cabeça-Ombro é um padrão de REVERSÃO de tendência de alta "
                "para baixa. Forma-se com três topos: um ombro, uma cabeça (mais alta) "
                "e outro ombro em altura parecida com o primeiro. Quando o preço rompe "
                "a linha de pescoço (neckline) para baixo, sinaliza possível queda. "
                "O alvo teórico é a distância da cabeça até a neckline, projetada para baixo."
            ),
            "intervalo_candles": {"inicio": oe["i"], "fim": od["i"]},
        })

    return padroes


# ──────────────────────────────────────────────────────────────
# Auxiliares
# ──────────────────────────────────────────────────────────────
def _fundo_entre(fundos, i_ini, i_fim):
    c = [f for f in fundos if i_ini < f["i"] < i_fim]
    return min(c, key=lambda f: f["preco"]) if c else None


# ──────────────────────────────────────────────────────────────
# R4 — COMPETIÇÃO POR REGIÃO VISUAL
# ──────────────────────────────────────────────────────────────
def _competicao_regiao(padroes: List[Dict]) -> List[Dict]:
    """
    Em vez de só rejeitar sobreposições estritas, agora:
    - Define "região visual" como uma janela de span*2 ao redor do padrão
    - Se dois padrões estão dentro da mesma região, só o de maior
      score sobrevive — mesmo que não se sobreponham perfeitamente.

    Resultado: máximo 1 OCO por movimento visível no gráfico.
    """
    if not padroes:
        return padroes

    # Ordena por score (maior primeiro)
    ordenados = sorted(padroes, key=lambda p: p["confiabilidade"], reverse=True)
    aceitos = []

    for p in ordenados:
        ini = p["intervalo_candles"]["inicio"]
        fim = p["intervalo_candles"]["fim"]
        span = fim - ini
        # Região visual = padrão + folga de span*0.5 pra cada lado
        regiao_ini = ini - span * 0.5
        regiao_fim = fim + span * 0.5

        # Conflito se região se sobrepõe com algum já aceito
        conflito = False
        for a in aceitos:
            a_ini = a["intervalo_candles"]["inicio"]
            a_fim = a["intervalo_candles"]["fim"]
            a_span = a_fim - a_ini
            a_regiao_ini = a_ini - a_span * 0.5
            a_regiao_fim = a_fim + a_span * 0.5
            if not (regiao_fim < a_regiao_ini or regiao_ini > a_regiao_fim):
                conflito = True
                break

        if not conflito:
            aceitos.append(p)

    return aceitos


# ──────────────────────────────────────────────────────────────
# FUNÇÃO PRINCIPAL
# ──────────────────────────────────────────────────────────────
def detectar_padroes_classicos(candles: List[Dict], janela: int = 5) -> List[Dict]:
    if not candles or len(candles) < (janela * 2 + 3):
        return []
    topos, fundos = encontrar_pivos(candles, janela=janela)
    padroes = _detectar_oco(candles, topos, fundos)
    padroes = _competicao_regiao(padroes)
    padroes = sorted(padroes, key=lambda p: p["intervalo_candles"]["inicio"])
    return padroes