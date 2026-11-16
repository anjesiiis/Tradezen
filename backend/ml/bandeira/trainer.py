"""Treino do Random Forest de uma bandeira.

ACERVO: os sucessos vêm de templates_bandeira_{alta,baixa} e as falhas de
templates_bandeira_{alta,baixa}_fracasso. São duas coisas diferentes e a
distinção importa:

  • `*_fracasso` guarda o que PARECE a bandeira e NÃO é — forma torta,
    contraexemplo de desenho. É isto que o modelo precisa aprender a
    recusar, e é o que entra como rótulo 0.
  • a coluna `resultado` das tabelas de sucesso guarda o DESFECHO de uma
    bandeira que se formou de verdade ("não andou"). Isso é outro eixo, e
    usá-lo como rótulo 0 ensinaria o modelo a recusar bandeiras legítimas
    por causa do que o mercado fez depois.

DIVISÃO 70/15/15 com stratify. Com acervo pequeno e desbalanceado, 15% de
teste pode sair sem nenhuma falha — o avaliador diz quando isso acontece
em vez de devolver um número que parece medida.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from supabase_client import supabase

from . import evaluator, storage
from .features import NOMES_FEATURES, TemplateInvalido, em_linha, extrair

log = logging.getLogger("tradezen.ml.bandeira")

TABELAS = {
    "bandeira_alta": ("templates_bandeira_alta", "templates_bandeira_alta_fracasso"),
    "bandeira_baixa": ("templates_bandeira_baixa", "templates_bandeira_baixa_fracasso"),
}

# Abaixo disto não se treina. Não é número mágico: com menos de 30 exemplos
# de uma classe, os 15% de teste viram 4 linhas, e uma métrica medida em 4
# linhas varia 25% por acerto — o painel mostraria ruído com cara de
# precisão. Melhor dizer "faltam fracassos" do que entregar um 93% que não
# significa nada.
MINIMO_POR_CLASSE = 30

GRADE = {"max_depth": [6, 10, None], "min_samples_leaf": [1, 2, 4]}

COLUNAS = "id,ticker,timeframe,pontos,candles,candles_contexto,criado_em"


def _carregar(tabela: str) -> List[dict]:
    try:
        return (supabase.table(tabela).select(COLUNAS).execute().data) or []
    except Exception as erro:  # tabela ainda não existe, chave sem acesso…
        log.warning("não deu pra ler %s: %s", tabela, erro)
        return []


def montar_conjunto(padrao: str) -> Dict[str, Any]:
    """Features + rótulos + o relatório do que foi pulado e por quê."""
    if padrao not in TABELAS:
        raise ValueError(f"padrão desconhecido: {padrao}")
    tabela_ok, tabela_falha = TABELAS[padrao]

    X: List[List[float]] = []
    y: List[int] = []
    usados: List[dict] = []
    pulados: List[dict] = []

    for tabela, rotulo in ((tabela_ok, 1), (tabela_falha, 0)):
        for linha in _carregar(tabela):
            try:
                feats = extrair(linha)
                X.append(em_linha(feats))
                y.append(rotulo)
                usados.append({"tabela": tabela, "id": linha.get("id")})
            except TemplateInvalido as erro:
                # NOME E MOTIVO, não só a contagem: o pulado é uma marcação
                # para alguém arrumar, e "12 pulados" não diz qual abrir.
                pulados.append({
                    "tabela": tabela, "id": linha.get("id"),
                    "ticker": linha.get("ticker"), "motivo": str(erro),
                })
                log.warning("pulado %s#%s (%s): %s", tabela, linha.get("id"),
                            linha.get("ticker"), erro)
            except Exception as erro:  # defeito nosso, não da marcação
                pulados.append({
                    "tabela": tabela, "id": linha.get("id"),
                    "ticker": linha.get("ticker"),
                    "motivo": f"erro inesperado: {type(erro).__name__}: {erro}",
                })
                log.exception("erro extraindo %s#%s", tabela, linha.get("id"))

    return {
        "X": X, "y": y, "usados": usados, "pulados": pulados,
        "n_sucesso": sum(y), "n_falha": len(y) - sum(y),
        "features": NOMES_FEATURES,
    }


def _dividir(X, y) -> Tuple[Any, ...]:
    """70/15/15 estratificado. Stratify só é possível com as duas classes
    presentes em quantidade suficiente; o chamador já garantiu o mínimo."""
    X_treino, X_resto, y_treino, y_resto = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y)
    X_val, X_teste, y_val, y_teste = train_test_split(
        X_resto, y_resto, test_size=0.50, random_state=42, stratify=y_resto)
    return X_treino, y_treino, X_val, y_val, X_teste, y_teste


def treinar(padrao: str) -> Dict[str, Any]:
    """Monta o conjunto, treina e REGISTRA. O registro é o que separa esta
    função de `ajustar`: quem quer só os números (um teste, um
    experimento) chama `ajustar` e não grava nada no banco."""
    conjunto = montar_conjunto(padrao)
    saida = ajustar(conjunto)
    if not saida.get("treinou"):
        return saida
    linha = storage.salvar(saida.pop("modelo_treinado"), padrao,
                           saida["metricas"], saida["detalhes"])
    return {**saida, "modelo": linha}


def ajustar(conjunto: Dict[str, Any]) -> Dict[str, Any]:
    """O núcleo: divide, afina, avalia. Não toca no banco.

    Separado de `treinar` pra poder ser exercitado de ponta a ponta sem
    Supabase e sem acervo — é o único jeito de provar que o caminho do
    treino funciona enquanto faltam fracassos marcados.
    """
    n_ok, n_falha = conjunto["n_sucesso"], conjunto["n_falha"]

    if min(n_ok, n_falha) < MINIMO_POR_CLASSE:
        return {
            "treinou": False,
            "motivo": (
                f"Acervo insuficiente: {n_ok} sucessos e {n_falha} fracassos "
                f"utilizáveis, e o mínimo é {MINIMO_POR_CLASSE} de cada. Com "
                "menos que isso o conjunto de teste fica com poucas linhas e "
                "a métrica vira ruído."
            ),
            "n_sucesso": n_ok, "n_falha": n_falha,
            "pulados": conjunto.get("pulados", []),
        }

    X_tr, y_tr, X_val, y_val, X_te, y_te = _dividir(conjunto["X"], conjunto["y"])

    # GRID SEARCH À MÃO, treinando no TREINO e escolhendo pelo F1 no
    # VALIDAÇÃO. É literalmente o que "afina no val" quer dizer, e é
    # diferente do GridSearchCV padrão, que escolhe por validação cruzada
    # dentro do próprio treino. Com acervo desta ordem os dois seriam
    # defensáveis; o que não é defensável é escolher olhando o TESTE, que
    # é o jeito clássico de publicar uma métrica que não se repete.
    melhor, melhor_params, melhor_f1 = None, None, -1.0
    tentativas = []
    for max_depth in GRADE["max_depth"]:
        for min_samples_leaf in GRADE["min_samples_leaf"]:
            candidato = RandomForestClassifier(
                n_estimators=100, max_depth=max_depth,
                min_samples_leaf=min_samples_leaf,
                class_weight="balanced", random_state=42)
            candidato.fit(X_tr, y_tr)
            f1_val = evaluator.avaliar(candidato, X_val, y_val).get("f1", 0.0)
            tentativas.append({"max_depth": max_depth,
                               "min_samples_leaf": min_samples_leaf,
                               "f1_validacao": f1_val})
            if f1_val > melhor_f1:
                melhor, melhor_f1 = candidato, f1_val
                melhor_params = {"max_depth": max_depth,
                                 "min_samples_leaf": min_samples_leaf}

    # Afinado, o modelo final é retreinado em treino+validação: os 15% da
    # validação já cumpriram o papel de escolher os parâmetros, e num
    # acervo desta ordem cada exemplo descartado custa.
    final = RandomForestClassifier(
        n_estimators=100, class_weight="balanced", random_state=42,
        **melhor_params)
    final.fit(X_tr + X_val, y_tr + y_val)

    # O TESTE é tocado aqui, uma vez, e nunca antes.
    metricas = evaluator.avaliar(final, X_te, y_te)
    metricas_val = evaluator.avaliar(melhor, X_val, y_val)

    extras = {
        "features": NOMES_FEATURES,
        "n_sucesso": n_ok,
        "n_falha": n_falha,
        "n_treino": len(y_tr), "n_val": len(y_val), "n_teste": len(y_te),
        "melhores_params": melhor_params,
        "grade_testada": tentativas,
        "metricas_validacao": metricas_val,
        "importancia": dict(sorted(
            zip(NOMES_FEATURES, (float(v) for v in final.feature_importances_)),
            key=lambda par: par[1], reverse=True)),
        "pulados": conjunto.get("pulados", []),
    }
    return {"treinou": True, "modelo_treinado": final,
            "metricas": metricas, "detalhes": extras}


def contagem(padrao: str) -> Dict[str, Any]:
    """Quantos templates existem e quantos dão pra usar — é o Bloco 1 (status).
    Separado do treino porque a tela abre com isto antes de alguém clicar."""
    conjunto = montar_conjunto(padrao)
    return {
        "padrao": padrao,
        "n_sucesso": conjunto["n_sucesso"],
        "n_falha": conjunto["n_falha"],
        "minimo_por_classe": MINIMO_POR_CLASSE,
        "pode_treinar": min(conjunto["n_sucesso"], conjunto["n_falha"]) >= MINIMO_POR_CLASSE,
        "pulados": conjunto["pulados"],
    }
