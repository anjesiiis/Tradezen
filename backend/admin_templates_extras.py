"""
TRADEZEN — CRUD DOS PADRÕES DE REVERSÃO E CONSOLIDAÇÃO
=======================================================

Um router por padrão (/admin/templates-fundo-duplo, -topo-triplo, ...),
todos saindo da mesma fábrica: os oito são idênticos no CRUD e só mudam
a tabela e as regras de validação (padroes_extras.py).

São oito arquivos quase iguais a menos — que é onde um conserto entra em
sete e esquece o oitavo. A mesma razão de PainelMarcacao ser uma tela só
no frontend.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from admin_auth import require_admin
from padroes_extras import PADROES_EXTRAS, PontosExtras, garantir_valido
from rate_limit import limiter
from supabase_client import supabase

# Colunas leves de propósito: `candles` e `candles_contexto` guardam o
# histórico inteiro de cada template e devolver isso na LISTAGEM derruba
# o servidor (ver o comentário em admin_templates_canal_alta.py).
_COLUNAS_LISTA = "id,ticker,timeframe,resultado,observacao,criado_em,data_p1"


class TemplateCreate(BaseModel):
    ticker: str
    timeframe: str
    candles: List[Dict[str, Any]]
    candles_contexto: List[Dict[str, Any]]
    pontos: PontosExtras
    # Data do primeiro ponto: é dela que saem o emoji no gráfico e o item
    # do sidebar (ver sql/013).
    data_p1: Optional[str] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None
    anotacoes: Optional[List[Dict[str, Any]]] = None


class TemplateUpdate(BaseModel):
    pontos: Optional[PontosExtras] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None
    anotacoes: Optional[List[Dict[str, Any]]] = None


def _serializar(pontos: PontosExtras) -> Dict[str, Any]:
    return {k: v.model_dump() for k, v in pontos.items()}


def _executar(consulta, tabela: str):
    """Roda a consulta dizendo o que fazer quando a tabela não existe.

    Sem isso, marcar um padrão novo antes de rodar a migration devolvia um
    500 sem explicação, e na tela aparecia só "Erro ao salvar o template".
    """
    try:
        return consulta.execute()
    except Exception as erro:  # a lib do Supabase tem exceção própria
        texto = str(erro)
        if "Could not find the table" in texto or "does not exist" in texto:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"A tabela {tabela} ainda não existe no Supabase. "
                    "Rode backend/sql/014_padroes_reversao_e_consolidacao.sql "
                    "no SQL Editor e tente de novo."
                ),
            ) from erro
        raise


def criar_router(tipo: str) -> APIRouter:
    espec = PADROES_EXTRAS[tipo]
    tabela = espec["tabela"]
    router = APIRouter(
        prefix=f"/admin/templates-{espec['rota']}",
        tags=[f"admin-templates-{espec['rota']}"],
        dependencies=[Depends(require_admin)],
    )

    @router.get("")
    @limiter.limit("30/minute")
    def listar_templates(request: Request):
        resp = _executar(supabase.table(tabela).select(_COLUNAS_LISTA).order("criado_em", desc=True), tabela)
        return {"status": "ok", "templates": resp.data, "total": len(resp.data)}

    @router.get("/{template_id}")
    @limiter.limit("30/minute")
    def obter_template(request: Request, template_id: int):
        resp = _executar(supabase.table(tabela).select("*").eq("id", template_id).limit(1), tabela)
        if not resp.data:
            raise HTTPException(status_code=404, detail="Template não encontrado.")
        return {"status": "ok", "template": resp.data[0]}

    @router.post("")
    @limiter.limit("30/minute")
    def criar_template(request: Request, payload: TemplateCreate):
        garantir_valido(tipo, payload.pontos)
        body = payload.model_dump()
        body["pontos"] = _serializar(payload.pontos)
        resp = _executar(supabase.table(tabela).insert(body), tabela)
        return {"status": "ok", "template": resp.data[0]}

    @router.put("/{template_id}")
    @limiter.limit("30/minute")
    def atualizar_template(request: Request, template_id: int, payload: TemplateUpdate):
        if payload.pontos is not None:
            garantir_valido(tipo, payload.pontos)
        body = {k: v for k, v in payload.model_dump().items() if v is not None}
        if payload.pontos is not None:
            body["pontos"] = _serializar(payload.pontos)
        if not body:
            raise HTTPException(status_code=400, detail="Nada para atualizar.")

        resp = _executar(supabase.table(tabela).update(body).eq("id", template_id), tabela)
        if not resp.data:
            raise HTTPException(status_code=404, detail="Template não encontrado.")
        return {"status": "ok", "template": resp.data[0]}

    @router.delete("/{template_id}")
    @limiter.limit("30/minute")
    def remover_template(request: Request, template_id: int):
        resp = _executar(supabase.table(tabela).delete().eq("id", template_id), tabela)
        if not resp.data:
            raise HTTPException(status_code=404, detail="Template não encontrado.")
        return {"status": "ok"}

    return router


ROUTERS = [criar_router(tipo) for tipo in PADROES_EXTRAS]
