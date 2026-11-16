"""Rodar um modelo salvo sobre TODOS os templates marcados — o laboratório.

A pergunta que isto responde não é "qual a acurácia" (o treino já disse):
é ONDE o modelo erra, template por template, pra a pessoa abrir o desenho
e decidir se o problema é a feature, a marcação ou a falta de exemplos.

ATENÇÃO AO VIÉS, e isto precisa estar escrito: o modelo foi TREINADO em
70% destes mesmos templates. Rodar nele todo o acervo mistura exemplo
visto com exemplo novo, e o resumo daqui sai melhor que a realidade. Por
isso cada linha diz se o template estava no treino (`no_treino`), e o
resumo vem em duas versões: tudo, e só o que o modelo nunca viu. A
segunda é a que vale como medida; a primeira serve pra olhar os erros.

As features são as MESMAS do treino, pela mesma função. Nenhuma conta é
refeita aqui.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from supabase_client import supabase

from . import evaluator, storage, trainer
from .features import NOMES_FEATURES, TemplateInvalido, em_linha, extrair

log = logging.getLogger("tradezen.ml.bandeira.predictor")

LIMIAR = 0.50


def _periodo(candles: List[dict]) -> Dict[str, Optional[str]]:
    datas = [c.get("data") for c in (candles or []) if c.get("data")]
    return {"periodo_inicio": datas[0] if datas else None,
            "periodo_fim": datas[-1] if datas else None}


def _classificar(humano: int, confianca: float) -> str:
    modelo_diz_sim = confianca >= LIMIAR
    if humano == 1:
        return "VP" if modelo_diz_sim else "FN"
    return "FP" if modelo_diz_sim else "VN"


def testar(padrao: str, modelo_id: Optional[str] = None) -> Dict[str, Any]:
    alvo = trainer.ALVOS.get(padrao)
    if alvo is None:
        raise ValueError(f"padrão desconhecido: {padrao}")

    registro, modelo = storage.carregar_para_teste(padrao, modelo_id)
    if modelo is None:
        raise LookupError(
            "Nenhum modelo salvo para este padrão. Treine um primeiro — a aba "
            "Treinar diz se o acervo já dá.")

    # Quais ids entraram no treino. Vem de `detalhes.usados`, gravado no
    # treino: sem isso não há como separar o que o modelo já viu, e o
    # resumo mentiria pra cima sem avisar.
    vistos = set()
    for item in ((registro.get("detalhes") or {}).get("usados") or []):
        vistos.add(f"{item.get('tabela')}#{item.get('id')}")

    linhas, falhas_extracao = avaliar_acervo(padrao, modelo, vistos)

    return {
        "padrao": padrao,
        "tipo": alvo["tipo"],
        "pergunta": alvo["pergunta"],
        "modelo": {k: registro.get(k) for k in
                   ("id", "versao", "ativo", "treinado_em", "f1", "accuracy")},
        "limiar": LIMIAR,
        "linhas": linhas,
        "falhas_extracao": falhas_extracao,
        "resumo": _resumo(linhas),
        "resumo_nao_vistos": _resumo([r for r in linhas if not r["no_treino"]]),
    }


def avaliar_acervo(padrao: str, modelo, vistos=frozenset()):
    """O laço: roda `modelo` em cada template marcado do alvo.

    Separado de `testar` pra poder rodar com um modelo em memória, sem
    passar pelo banco. É assim que o pipeline foi medido antes de a
    migration 030 existir — e é assim que os testes o exercitam.
    """
    alvo = trainer.ALVOS[padrao]
    if alvo["tipo"] == "qualidade":
        corte = alvo["corte"]
        fontes = [(t, None) for t in alvo["tabelas"]]
    else:
        corte = None
        tabela_ok, tabela_falha = alvo["tabelas"]
        fontes = [(tabela_ok, 1), (tabela_falha, 0)]

    linhas: List[Dict[str, Any]] = []
    falhas_extracao: List[Dict[str, Any]] = []

    for tabela, rotulo_fixo in fontes:
        try:
            dados = supabase.table(tabela).select(trainer.COLUNAS).execute().data or []
        except Exception as erro:
            log.warning("não deu pra ler %s: %s", tabela, erro)
            continue

        for linha in dados:
            chave = f"{tabela}#{linha.get('id')}"
            if rotulo_fixo is None:
                nota = linha.get("qualidade")
                if nota is None:
                    continue
                humano = 1 if nota >= corte else 0
            else:
                humano = rotulo_fixo

            try:
                feats = extrair(linha)
            except (TemplateInvalido, Exception) as erro:  # noqa: B014
                # SEÇÃO SEPARADA, não erro geral: um template que não dá pra
                # medir é trabalho de marcação, e perder o teste inteiro por
                # causa dele seria perder o diagnóstico dos outros 211.
                falhas_extracao.append({
                    "template_id": linha.get("id"), "tabela": tabela,
                    "ticker": linha.get("ticker"), "motivo": str(erro),
                })
                continue

            confianca = float(modelo.predict_proba([em_linha(feats)])[0][1])
            linhas.append({
                "template_id": linha.get("id"),
                "tabela": tabela,
                "ticker": linha.get("ticker"),
                "timeframe": linha.get("timeframe"),
                **_periodo(linha.get("candles") or linha.get("candles_contexto")),
                "rotulo_humano": "sucesso" if humano == 1 else "falha",
                "qualidade": linha.get("qualidade"),
                "resultado_marcado": linha.get("resultado"),
                "confianca_modelo": round(confianca, 4),
                "resultado": _classificar(humano, confianca),
                "no_treino": chave in vistos,
                "features": {n: round(feats[n], 4) for n in NOMES_FEATURES},
                "pontos": linha.get("pontos"),
            })

    # Mais confiante primeiro: filtrando FP/FN, os erros mais convictos
    # aparecem no topo, que é onde o modelo está mais perdido.
    linhas.sort(key=lambda r: r["confianca_modelo"], reverse=True)
    return linhas, falhas_extracao


def _resumo(linhas: List[Dict[str, Any]]) -> Dict[str, Any]:
    conta = {"VP": 0, "VN": 0, "FP": 0, "FN": 0}
    for r in linhas:
        conta[r["resultado"]] += 1
    total = sum(conta.values())
    if not total:
        return {"total": 0, **{k.lower(): 0 for k in conta}, "vazio": True}

    y = [1 if r["rotulo_humano"] == "sucesso" else 0 for r in linhas]
    previsto = [1 if r["confianca_modelo"] >= LIMIAR else 0 for r in linhas]
    metricas = evaluator.avaliar(_Fingido(previsto, [r["confianca_modelo"] for r in linhas]),
                                 [[0]] * len(y), y)
    return {
        "total": total,
        "vp": conta["VP"], "vn": conta["VN"], "fp": conta["FP"], "fn": conta["FN"],
        "accuracy": metricas["accuracy"], "precisao": metricas["precisao"],
        "recall": metricas["recall"], "f1": metricas["f1"],
        "roc_auc": metricas["roc_auc"],
    }


class _Fingido:
    """Dublê de modelo pro avaliador: as previsões já estão calculadas, e
    reusar `evaluator.avaliar` garante que a conta de precisão/recall aqui
    é a MESMA do treino. Reimplementá-la daria dois números com o mesmo
    nome e valores diferentes, que é o pior defeito possível num painel."""

    def __init__(self, previsto, confiancas):
        self._previsto = previsto
        self._conf = confiancas

    def predict(self, _X):
        return self._previsto

    def predict_proba(self, _X):
        # numpy, não lista de listas: o avaliador faz `[:, 1]`, que é
        # fatiamento de array. Uma lista aceitaria o `[:,1]` só pra
        # estourar TypeError na primeira chamada.
        import numpy as np
        return np.array([[1 - c, c] for c in self._conf])
