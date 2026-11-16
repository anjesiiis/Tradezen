"""Rotas do treino de modelos (Bloco 1: status, Bloco 2: treinar).

TREINO SÍNCRONO, de propósito nesta primeira versão: com o acervo atual
(216 templates, 12 features, 9 combinações de grade) o treino leva poucos
segundos, e uma fila de tarefas traria broker, estado e uma tela de
progresso para resolver um problema que ainda não existe. Se o acervo
crescer até o ponto de estourar o timeout do Render, aí vale a fila — e
aí o sintoma será claro: 502 no POST.

Nenhuma rota aqui DETECTA padrão. Elas contam templates marcados à mão,
treinam, registram métricas e promovem um modelo. Achar bandeira no
gráfico continua sendo trabalho de pessoa.
"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request

from admin_auth import require_admin
from ml.bandeira import storage, trainer
from rate_limit import limiter

router = APIRouter(prefix="/admin/modelos", tags=["admin-modelos"],
                   dependencies=[Depends(require_admin)])

PADROES = tuple(trainer.TABELAS)


def _validar(padrao: str) -> str:
    if padrao not in PADROES:
        raise HTTPException(
            status_code=404,
            detail=f"Não conheço o padrão '{padrao}'. Conheço: {', '.join(PADROES)}.")
    return padrao


def _traduzir(erro: Exception) -> HTTPException:
    """Erro do banco vira providência. A tabela nova é a falta mais
    provável: sem a 030, toda rota daqui falha do mesmo jeito, e o recado
    cru do PostgREST não diz qual arquivo rodar."""
    texto = str(erro)
    if "modelos_treinados" in texto and ("does not exist" in texto
                                         or "Could not find" in texto):
        return HTTPException(
            status_code=503,
            detail=("A tabela modelos_treinados ainda não existe no Supabase. "
                    "Rode backend/sql/030_modelos_treinados.sql no SQL Editor. "
                    "Se você JÁ rodou, o cache de schema está velho: rode "
                    "`notify pgrst, 'reload schema';` e recarregue a página."))
    return HTTPException(status_code=500, detail=f"Erro ao falar com o banco: {texto[:300]}")


@router.get("/{padrao}/status")
@limiter.limit("30/minute")
def status(request: Request, padrao: str) -> Dict[str, Any]:
    """Bloco 1: quantos templates existem, quantos dão pra usar, e o
    histórico de modelos. É o que a tela mostra antes de alguém clicar."""
    _validar(padrao)
    contagem = trainer.contagem(padrao)
    try:
        modelos = storage.listar(padrao)
    except Exception as erro:
        raise _traduzir(erro) from erro
    # O base64 do modelo nunca vai na resposta: são centenas de KB por linha.
    for m in modelos:
        m.pop("modelo_b64", None)
    return {**contagem, "modelos": modelos,
            "ativo": next((m for m in modelos if m.get("ativo")), None)}


@router.get("/{padrao}")
@limiter.limit("30/minute")
def listar(request: Request, padrao: str) -> Dict[str, Any]:
    _validar(padrao)
    try:
        modelos = storage.listar(padrao)
    except Exception as erro:
        raise _traduzir(erro) from erro
    for m in modelos:
        m.pop("modelo_b64", None)
    return {"padrao": padrao, "modelos": modelos}


@router.post("/treinar/{padrao}")
@limiter.limit("6/minute")
def treinar(request: Request, padrao: str) -> Dict[str, Any]:
    """Treina e registra. 409 quando o acervo não dá — e não 500: acervo
    insuficiente não é defeito, é o estado do trabalho, e a mensagem diz
    quantos faltam."""
    _validar(padrao)
    try:
        saida = trainer.treinar(padrao)
    except Exception as erro:
        raise _traduzir(erro) from erro

    if not saida.get("treinou"):
        raise HTTPException(status_code=409, detail=saida.get("motivo"),
                            headers={"X-Tradezen-Motivo": "acervo-insuficiente"})
    return saida


@router.post("/{modelo_id}/ativar")
@limiter.limit("20/minute")
def ativar(request: Request, modelo_id: str) -> Dict[str, Any]:
    try:
        return {"modelo": storage.ativar(modelo_id)}
    except LookupError:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    except Exception as erro:
        raise _traduzir(erro) from erro
