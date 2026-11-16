"""Métricas de um modelo treinado.

As metas do projeto (CLAUDE.md): accuracy >= 85%, precision >= 80%,
recall >= 75%, F1 >= 78%. Elas são REGISTRADAS, não impostas: um número
abaixo da meta é informação sobre o acervo, não erro de código, e esconder
isso faria o painel mentir para quem decide se já dá para usar o modelo.
"""
from __future__ import annotations

from typing import Any, Dict, List

from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)

METAS = {"accuracy": 0.85, "precisao": 0.80, "recall": 0.75, "f1": 0.78}


def avaliar(modelo, X: List[List[float]], y: List[int]) -> Dict[str, Any]:
    if not len(X):
        return {"n": 0, "vazio": True}

    previsto = modelo.predict(X)

    # ROC AUC precisa de AS DUAS classes no conjunto. Com 15% de um acervo
    # desbalanceado, o teste pode sair só com sucessos — aí a métrica não
    # existe, e `None` diz isso. Zero diria "o modelo é péssimo", que é
    # afirmação diferente de "não há como medir".
    auc = None
    if len(set(y)) > 1:
        try:
            auc = float(roc_auc_score(y, modelo.predict_proba(X)[:, 1]))
        except (AttributeError, ValueError):
            auc = None

    # zero_division=0: sem nenhum positivo previsto, precision é 0/0. O
    # padrão do sklearn avisa e devolve 0; aqui o 0 é explícito.
    matriz = confusion_matrix(y, previsto, labels=[0, 1]).tolist()
    return {
        "n": len(y),
        "n_sucesso": int(sum(y)),
        "n_falha": int(len(y) - sum(y)),
        "accuracy": float(accuracy_score(y, previsto)),
        "precisao": float(precision_score(y, previsto, zero_division=0)),
        "recall": float(recall_score(y, previsto, zero_division=0)),
        "f1": float(f1_score(y, previsto, zero_division=0)),
        "roc_auc": auc,
        # [[verdadeiro_falha, falso_sucesso], [falso_falha, verdadeiro_sucesso]]
        "matriz_confusao": matriz,
        "atingiu_metas": {
            nome: (None if valor is None else valor >= METAS[nome])
            for nome, valor in (
                ("accuracy", float(accuracy_score(y, previsto))),
                ("precisao", float(precision_score(y, previsto, zero_division=0))),
                ("recall", float(recall_score(y, previsto, zero_division=0))),
                ("f1", float(f1_score(y, previsto, zero_division=0))),
            )
        },
    }
