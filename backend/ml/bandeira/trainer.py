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

# ALVOS — o que o modelo aprende a separar. São DOIS eixos diferentes, e
# misturá-los é o erro mais fácil de cometer aqui:
#
#   fracasso  → "isto É a bandeira?"  Positivo: templates_*. Negativo:
#               templates_*_fracasso, que guarda o que PARECE e não é.
#               É o alvo que interessa no fim, e hoje não treina: existem
#               4 fracassos de alta e 0 de baixa.
#
#   qualidade → "este desenho é um BOM EXEMPLAR da forma?" Rótulo vindo
#               das estrelas que a pessoa deu (coluna `qualidade`, escala
#               0..8 da migration 029). Positivo: >= 7, ou seja 4,5 e 5
#               estrelas. Treina hoje, porque 212 de 212 bandeiras de alta
#               têm nota e elas se dividem em 94 contra 118.
#
# O alvo da qualidade existe pra haver o que medir enquanto faltam
# fracassos marcados. Ele NÃO responde "vai dar certo" — nenhum modelo
# treinado em estrelas responde isso, e o painel diz essa frase na tela
# pra ninguém confundir os dois.
CORTE_QUALIDADE = 7

ALVOS = {
    "bandeira_alta": {
        "tipo": "fracasso", "rotulo": "Bandeira de Alta",
        "pergunta": "isto é uma bandeira de alta?",
        "tabelas": TABELAS["bandeira_alta"],
    },
    "bandeira_baixa": {
        "tipo": "fracasso", "rotulo": "Bandeira de Baixa",
        "pergunta": "isto é uma bandeira de baixa?",
        "tabelas": TABELAS["bandeira_baixa"],
    },
    "bandeira_alta_qualidade": {
        "tipo": "qualidade", "rotulo": "Bandeira de Alta — qualidade da forma",
        "pergunta": "este desenho é 4,5 estrelas ou mais?",
        "tabelas": ("templates_bandeira_alta",),
        "corte": CORTE_QUALIDADE,
    },
    "bandeira_baixa_qualidade": {
        "tipo": "qualidade", "rotulo": "Bandeira de Baixa — qualidade da forma",
        "pergunta": "este desenho é 4,5 estrelas ou mais?",
        "tabelas": ("templates_bandeira_baixa",),
        "corte": CORTE_QUALIDADE,
    },
}

# Abaixo disto não se treina. Não é número mágico: com menos de 30 exemplos
# de uma classe, os 15% de teste viram 4 linhas, e uma métrica medida em 4
# linhas varia 25% por acerto — o painel mostraria ruído com cara de
# precisão. Melhor dizer "faltam fracassos" do que entregar um 93% que não
# significa nada.
MINIMO_POR_CLASSE = 30

GRADE = {"max_depth": [6, 10, None], "min_samples_leaf": [1, 2, 4]}

COLUNAS = ("id,ticker,timeframe,pontos,candles,candles_contexto,"
           "qualidade,resultado,criado_em")


# Quantas linhas por pedido ao ler os candles. Cada template guarda
# `candles` E `candles_contexto` em jsonb — centenas de candles cada —, e
# pedir 212 de uma vez estoura o tempo máximo de consulta do Supabase:
# "canceling statement due to statement timeout" (erro 57014). O sintoma
# na tela era a página de modelos não carregar.
POR_PAGINA = 25


def _carregar(tabela: str) -> List[dict]:
    """Lê a tabela inteira EM PÁGINAS. Página que falha não derruba o
    resto: melhor treinar com 200 templates e dizer que 12 não vieram do
    que não treinar."""
    linhas: List[dict] = []
    inicio = 0
    while True:
        try:
            pagina = (supabase.table(tabela).select(COLUNAS)
                      .order("id")
                      .range(inicio, inicio + POR_PAGINA - 1)
                      .execute().data) or []
        except Exception as erro:  # tabela não existe, timeout, sem acesso…
            log.warning("não deu pra ler %s a partir de %s: %s", tabela, inicio, erro)
            break
        linhas += pagina
        if len(pagina) < POR_PAGINA:
            break
        inicio += POR_PAGINA
    return linhas


def _contar(tabela: str, colunas: str = "id,qualidade") -> List[dict]:
    """Só as colunas leves, pra contar. Sem os candles, cabe num pedido."""
    try:
        return (supabase.table(tabela).select(colunas).execute().data) or []
    except Exception as erro:
        log.warning("não deu pra contar %s: %s", tabela, erro)
        return []


def montar_conjunto(padrao: str) -> Dict[str, Any]:
    """Features + rótulos + o relatório do que foi pulado e por quê.

    Os dois tipos de alvo (ver ALVOS) diferem SÓ na origem do rótulo: no
    `fracasso` ele vem da tabela em que a linha está; na `qualidade`, da
    estrela que a pessoa deu. O resto — extração, pulados, contagem — é o
    mesmo caminho, de propósito: dois caminhos divergiriam, e aí o treino
    e o teste mediriam coisas diferentes.
    """
    alvo = ALVOS.get(padrao)
    if alvo is None:
        raise ValueError(f"padrão desconhecido: {padrao}")

    X: List[List[float]] = []
    y: List[int] = []
    usados: List[dict] = []
    pulados: List[dict] = []

    if alvo["tipo"] == "qualidade":
        corte = alvo["corte"]
        # Sem nota não entra: `qualidade` nula é "ninguém avaliou", e
        # chamar isso de exemplar ruim inventaria um julgamento.
        fontes = [(t, None) for t in alvo["tabelas"]]
    else:
        corte = None
        tabela_ok, tabela_falha = alvo["tabelas"]
        fontes = [(tabela_ok, 1), (tabela_falha, 0)]

    for tabela, rotulo_fixo in fontes:
        for linha in _carregar(tabela):
            try:
                if rotulo_fixo is None:
                    nota = linha.get("qualidade")
                    if nota is None:
                        continue
                    rotulo = 1 if nota >= corte else 0
                else:
                    rotulo = rotulo_fixo
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
        "features": NOMES_FEATURES, "alvo": padrao, "tipo": alvo["tipo"],
    }


def _dividir_indices(y) -> Tuple[List[int], List[int], List[int]]:
    """70/15/15 estratificado, devolvendo ÍNDICES e não as fatias.

    Índices porque o laboratório de teste precisa saber QUAIS templates
    entraram no treino: rodar o modelo em cima do que ele já viu dá um
    número melhor que a realidade, e sem essa lista o painel não teria
    como avisar. Fatiar X e y direto perderia essa informação.
    """
    todos = list(range(len(y)))
    treino, resto = train_test_split(
        todos, test_size=0.30, random_state=42, stratify=y)
    val, teste = train_test_split(
        resto, test_size=0.50, random_state=42, stratify=[y[i] for i in resto])
    return treino, val, teste


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

    X, y = conjunto["X"], conjunto["y"]
    i_tr, i_val, i_te = _dividir_indices(y)
    pega = lambda indices: ([X[i] for i in indices], [y[i] for i in indices])  # noqa: E731
    X_tr, y_tr = pega(i_tr)
    X_val, y_val = pega(i_val)
    X_te, y_te = pega(i_te)

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
        # QUEM ENTROU NO TREINO (treino + validação). O laboratório lê isto
        # pra separar "o modelo já viu" de "nunca viu" — sem a lista, o
        # resumo do teste sai inflado e ninguém percebe.
        "usados": [conjunto["usados"][i] for i in (i_tr + i_val)
                   if i < len(conjunto.get("usados", []))],
    }
    return {"treinou": True, "modelo_treinado": final,
            "metricas": metricas, "detalhes": extras}


def contagem(padrao: str) -> Dict[str, Any]:
    """Quantos templates existem — o Bloco 1 (status), e a primeira coisa
    que a tela pede ao abrir.

    LÊ SÓ `id,qualidade`, sem os candles. A versão anterior extraía as
    features de todos os templates só pra contar quantos eram
    "utilizáveis", e isso significava ler centenas de candles de 212
    linhas: o Supabase cortava por tempo (57014) e a página não carregava.
    Contar é pergunta leve e tem de ter resposta leve.

    O preço é que a contagem não sabe quantos templates são impossíveis de
    medir — isso só aparece no treino e no teste, que leem os candles de
    qualquer maneira. É o preço certo: a tela abre.
    """
    alvo = ALVOS[padrao]
    if alvo["tipo"] == "qualidade":
        corte = alvo["corte"]
        notas = [r.get("qualidade") for t in alvo["tabelas"] for r in _contar(t)]
        com_nota = [n for n in notas if n is not None]
        n_sucesso = sum(1 for n in com_nota if n >= corte)
        n_falha = len(com_nota) - n_sucesso
        extra = {"sem_nota": len(notas) - len(com_nota)}
    else:
        tabela_ok, tabela_falha = alvo["tabelas"]
        n_sucesso = len(_contar(tabela_ok, "id"))
        n_falha = len(_contar(tabela_falha, "id"))
        extra = {}

    return {
        "padrao": padrao,
        "tipo": alvo["tipo"],
        "rotulo": alvo["rotulo"],
        # A pergunta vai pra tela porque "88% de acurácia" sem a pergunta
        # ao lado é um número que a pessoa completa de cabeça — e completa
        # com "vai dar certo", que é justamente o que o alvo da qualidade
        # NÃO responde.
        "pergunta": alvo["pergunta"],
        "n_sucesso": n_sucesso,
        "n_falha": n_falha,
        "minimo_por_classe": MINIMO_POR_CLASSE,
        "pode_treinar": min(n_sucesso, n_falha) >= MINIMO_POR_CLASSE,
        **extra,
    }
