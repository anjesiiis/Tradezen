"""
TRADEZEN — CRUD DOS FRACASSOS (hard negatives de forma)
========================================================

Trechos que PARECEM um padrão e não são. Não confundir com padrão que
falhou: esse se formou, continua sendo o padrão, e o desfecho dele mora
na coluna `resultado` da tabela de sucesso.

Um router por padrão (/admin/templates-bandeira-alta-fracasso, ...),
todos saindo da mesma fábrica — hoje são as duas bandeiras; acrescentar
flâmula, cunha ou qualquer outro é acrescentar uma linha em FRACASSOS.

VALIDAÇÃO DE FORMA NÃO SE APLICA AQUI, de propósito: o que se marca é
justamente o desenho torto. Exigir "o topo da consolidação acima do
fundo" recusaria o exemplo negativo que se quer guardar. O que se exige
é só o formato do dado: os 8 pontos, cada um com candle e preço.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from admin_auth import require_admin
from bandeira_pontos import PontosBandeira
from rate_limit import limiter
from supabase_client import supabase

# tipo → (rota, tabela). Fase 1: só bandeiras.
FRACASSOS: Dict[str, Dict[str, str]] = {
    "bandeira_alta_fracasso": {
        "rota": "bandeira-alta-fracasso",
        "tabela": "templates_bandeira_alta_fracasso",
    },
    "bandeira_baixa_fracasso": {
        "rota": "bandeira-baixa-fracasso",
        "tabela": "templates_bandeira_baixa_fracasso",
    },
}

# Colunas leves de propósito: `candles` e `candles_contexto` guardam o
# histórico inteiro de cada template e devolver isso na LISTAGEM derruba
# o servidor (ver o comentário em admin_templates_canal_alta.py).
_COLUNAS_LISTA = (
    "id,ticker,timeframe,resultado,observacao,"
    "motivo_fracasso,tipo_fracasso,criado_em,data_p1"
)


class FracassoCreate(BaseModel):
    ticker: str
    timeframe: str
    candles: List[Dict[str, Any]]
    candles_contexto: List[Dict[str, Any]]
    pontos: PontosBandeira
    data_p1: Optional[str] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None
    # por que não é o padrão — os dois opcionais: `tipo_fracasso` é o
    # rótulo curto ("nao_rompeu", "falso_rompimento", "nao_atingiu_alvo")
    # e `motivo_fracasso` é a explicação em texto livre.
    tipo_fracasso: Optional[str] = None
    motivo_fracasso: Optional[str] = None
    anotacoes: Optional[List[Dict[str, Any]]] = None


class FracassoUpdate(BaseModel):
    pontos: Optional[PontosBandeira] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None
    tipo_fracasso: Optional[str] = None
    motivo_fracasso: Optional[str] = None
    anotacoes: Optional[List[Dict[str, Any]]] = None


def _executar(consulta, tabela: str):
    """Roda a consulta dizendo o que fazer quando a tabela não existe."""
    try:
        return consulta.execute()
    except Exception as erro:
        texto = str(erro)
        if "Could not find the table" in texto or "does not exist" in texto:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"A tabela {tabela} ainda não existe no Supabase. "
                    "Rode backend/sql/016_fracassos_bandeira.sql no SQL Editor e tente de novo."
                ),
            ) from erro
        raise


def criar_router(tipo: str) -> APIRouter:
    espec = FRACASSOS[tipo]
    tabela = espec["tabela"]
    router = APIRouter(
        prefix=f"/admin/templates-{espec['rota']}",
        tags=[f"admin-templates-{espec['rota']}"],
        dependencies=[Depends(require_admin)],
    )

    @router.get("")
    @limiter.limit("30/minute")
    def listar(request: Request):
        resp = _executar(supabase.table(tabela).select(_COLUNAS_LISTA).order("criado_em", desc=True), tabela)
        return {"status": "ok", "templates": resp.data, "total": len(resp.data)}

    @router.get("/{template_id}")
    @limiter.limit("30/minute")
    def obter(request: Request, template_id: int):
        resp = _executar(supabase.table(tabela).select("*").eq("id", template_id).limit(1), tabela)
        if not resp.data:
            raise HTTPException(status_code=404, detail="Fracasso não encontrado.")
        return {"status": "ok", "template": resp.data[0]}

    @router.post("")
    @limiter.limit("30/minute")
    def criar(request: Request, payload: FracassoCreate):
        body = payload.model_dump()
        body["pontos"] = payload.pontos.model_dump()   # RootModel: já sai como dicionário
        resp = _executar(supabase.table(tabela).insert(body), tabela)
        return {"status": "ok", "template": resp.data[0]}

    @router.put("/{template_id}")
    @limiter.limit("30/minute")
    def atualizar(request: Request, template_id: int, payload: FracassoUpdate):
        body = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not body:
            raise HTTPException(status_code=400, detail="Nada para atualizar.")
        resp = _executar(supabase.table(tabela).update(body).eq("id", template_id), tabela)
        if not resp.data:
            raise HTTPException(status_code=404, detail="Fracasso não encontrado.")
        return {"status": "ok", "template": resp.data[0]}

    @router.delete("/{template_id}")
    @limiter.limit("30/minute")
    def remover(request: Request, template_id: int):
        resp = _executar(supabase.table(tabela).delete().eq("id", template_id), tabela)
        if not resp.data:
            raise HTTPException(status_code=404, detail="Fracasso não encontrado.")
        return {"status": "ok"}

    return router


ROUTERS = [criar_router(tipo) for tipo in FRACASSOS]
