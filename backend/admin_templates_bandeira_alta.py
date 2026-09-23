from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from admin_auth import require_admin
from bandeira_pontos import PontosBandeira, garantir_valido
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(
    prefix="/admin/templates-bandeira-alta",
    tags=["admin-templates-bandeira-alta"],
    dependencies=[Depends(require_admin)],
)


# Os 6 pontos e as regras de validação vivem em bandeira_pontos.py
# (compartilhado com a bandeira de baixa).


class TemplateCreate(BaseModel):
    ticker: str
    timeframe: str
    candles: List[Dict[str, Any]]
    candles_contexto: List[Dict[str, Any]]
    pontos: PontosBandeira
    resultado: Optional[str] = None
    observacao: Optional[str] = None


class TemplateUpdate(BaseModel):
    pontos: Optional[PontosBandeira] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None


# Colunas leves de propósito: `candles` e `candles_contexto` guardam o
# histórico inteiro de preços de cada template (chega a 2.500 candles por
# linha). Devolver tudo isso na LISTAGEM gerava respostas de 13 MB, que o
# servidor não aguentava montar — a página quebrava com 502/503 e aparecia
# "Não foi possível carregar os templates". A tela de listagem só mostra
# ticker/timeframe/resultado/data; os candles vêm no GET /{id}, na hora de
# abrir um template.
_COLUNAS_LISTA = "id,ticker,timeframe,resultado,observacao,criado_em"


@router.get("")
@limiter.limit("30/minute")
def listar_templates(request: Request):
    resp = supabase.table("templates_bandeira_alta").select(_COLUNAS_LISTA).order("criado_em", desc=True).execute()
    return {"status": "ok", "templates": resp.data, "total": len(resp.data)}


@router.get("/{template_id}")
@limiter.limit("30/minute")
def obter_template(request: Request, template_id: int):
    resp = supabase.table("templates_bandeira_alta").select("*").eq("id", template_id).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok", "template": resp.data[0]}


@router.post("")
@limiter.limit("30/minute")
def criar_template(request: Request, payload: TemplateCreate):
    garantir_valido(payload.pontos, alta=True)
    body = payload.model_dump()
    resp = supabase.table("templates_bandeira_alta").insert(body).execute()
    return {"status": "ok", "template": resp.data[0]}


@router.put("/{template_id}")
@limiter.limit("30/minute")
def atualizar_template(request: Request, template_id: int, payload: TemplateUpdate):
    if payload.pontos is not None:
        garantir_valido(payload.pontos, alta=True)
    body = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not body:
        raise HTTPException(status_code=400, detail="Nada para atualizar.")

    resp = supabase.table("templates_bandeira_alta").update(body).eq("id", template_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok", "template": resp.data[0]}


@router.delete("/{template_id}")
@limiter.limit("30/minute")
def remover_template(request: Request, template_id: int):
    resp = supabase.table("templates_bandeira_alta").delete().eq("id", template_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok"}
