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
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel

from admin_auth import require_admin
from auditoria import ACOES, registrar
from rate_limit import limiter

# IMPORT PREGUIÇOSO DO ML, e isto não é estilo: é o conserto de uma queda.
#
# `ml.bandeira` arrasta sklearn, numpy e joblib. Importado aqui no topo,
# esse peso entra na SUBIDA do processo — e no Render (plano free, 512MB)
# a subida falhou. O efeito não foi "a tela de modelos não abre": foi
# `main.py` não conseguir importar este módulo, o app não subir, e TODAS
# as rotas devolverem 503. O gráfico, a lista de ativos, o login.
#
# Dentro da função, o custo só aparece para quem chama a rota de modelos,
# e um ambiente sem sklearn perde o treino em vez de perder o site.

router = APIRouter(prefix="/admin/modelos", tags=["admin-modelos"],
                   dependencies=[Depends(require_admin)])

# Escrito à mão em vez de lido de trainer.TABELAS: ler de lá obrigaria a
# importar o módulo aqui no topo, que é exatamente o que derrubou o app.
# Um teste garante que as duas listas não divirjam.
PADROES = ("bandeira_alta", "bandeira_baixa",
           "bandeira_alta_qualidade", "bandeira_baixa_qualidade")


def _ml():
    """Carrega o pipeline sob demanda. Se sklearn não estiver no ambiente,
    o recado diz o que falta em vez de estourar um 500 opaco."""
    try:
        from ml.bandeira import storage, trainer
        return storage, trainer
    except ImportError as erro:  # noqa: F841 (tratado abaixo)
        raise HTTPException(
            status_code=503,
            detail=("O treino de modelos não está disponível neste servidor: "
                    f"falta uma dependência de ML ({erro}). O resto do "
                    "sistema funciona normalmente."),
        ) from erro


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
    storage, trainer = _ml()
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
    storage, _ = _ml()
    try:
        modelos = storage.listar(padrao)
    except Exception as erro:
        raise _traduzir(erro) from erro
    for m in modelos:
        m.pop("modelo_b64", None)
    return {"padrao": padrao, "modelos": modelos}


@router.post("/treinar/{padrao}")
@limiter.limit("6/minute")
def treinar(request: Request, padrao: str,
            admin: str = Depends(require_admin)) -> Dict[str, Any]:
    """Treina e registra. 409 quando o acervo não dá — e não 500: acervo
    insuficiente não é defeito, é o estado do trabalho, e a mensagem diz
    quantos faltam."""
    _validar(padrao)
    _, trainer = _ml()
    try:
        saida = trainer.treinar(padrao)
    except Exception as erro:
        raise _traduzir(erro) from erro

    if not saida.get("treinou"):
        raise HTTPException(status_code=409, detail=saida.get("motivo"),
                            headers={"X-Tradezen-Motivo": "acervo-insuficiente"})

    # Qual modelo esta no ar decide o que o usuario pago ve. Guardar quem
    # treinou, quando e com que acervo e o que permite, meses depois,
    # explicar por que a deteccao mudou de comportamento num dia.
    registrar(
        ACOES["MODELO_TREINADO"],
        usuario_email=admin,
        recurso="modelo",
        recurso_id=str(saida.get("modelo_id") or ""),
        detalhes={"padrao": padrao, "metricas": saida.get("metricas")},
        request=request,
    )
    return saida


class TestePayload(BaseModel):
    modelo_id: Optional[str] = None
    # Padrão é REUSAR o cache. Quem acabou de remarcar um template força,
    # porque aí o resultado guardado descreve um acervo que já mudou.
    forcar: bool = False


@router.post("/testar/{padrao}")
@limiter.limit("10/minute")
def testar(request: Request, padrao: str,
           payload: Optional[TestePayload] = Body(default=None)) -> Dict[str, Any]:
    """Roda o modelo sobre TODOS os templates marcados e devolve onde ele
    acerta e onde erra, template por template.

    SÍNCRONO: sem buscar candles na internet (eles estão no template), 216
    extrações levam menos de um segundo. Uma fila com barra de progresso
    resolveria um problema que este endpoint não tem — e traria estado,
    broker e uma tela a mais pra manter.
    """
    _validar(padrao)
    # CORPO OPCIONAL COM `None`, nunca `= TestePayload()`. Um modelo
    # pydantic com instância como default faz o FastAPI classificar o
    # parâmetro como QUERY em vez de body: o `forcar` do corpo nunca
    # chegaria, e a geração do /openapi.json estoura com
    # PydanticUserError "is not fully defined" — o que derrubou o
    # /openapi.json e o /docs em produção, sem derrubar as rotas.
    payload = payload or TestePayload()
    storage, _ = _ml()
    from ml.bandeira import predictor

    try:
        if not payload.forcar:
            guardado = storage.teste_guardado(padrao, payload.modelo_id)
            if guardado:
                return {**guardado, "do_cache": True}
        saida = predictor.testar(padrao, payload.modelo_id)
        storage.guardar_teste(saida)
        return {**saida, "do_cache": False}
    except LookupError as erro:
        raise HTTPException(status_code=409, detail=str(erro)) from erro
    except Exception as erro:
        raise _traduzir(erro) from erro


@router.post("/{modelo_id}/ativar")
@limiter.limit("20/minute")
def ativar(request: Request, modelo_id: str,
           admin: str = Depends(require_admin)) -> Dict[str, Any]:
    storage, _ = _ml()
    try:
        modelo = storage.ativar(modelo_id)
        registrar(
            ACOES["MODELO_ATIVADO"],
            usuario_email=admin,
            recurso="modelo",
            recurso_id=modelo_id,
            request=request,
        )
        return {"modelo": modelo}
    except LookupError:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    except Exception as erro:
        raise _traduzir(erro) from erro
