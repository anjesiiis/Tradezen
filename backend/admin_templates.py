from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from admin_auth import require_admin
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(
    prefix="/admin/templates",
    tags=["admin-templates"],
    dependencies=[Depends(require_admin)],
)


class Ponto(BaseModel):
    i: int
    preco: float


class PontosOCO(BaseModel):
    comeco: Ponto
    topo_ombro_esq: Ponto
    fundo_ombro_esq: Ponto
    topo_cabeca: Ponto
    fundo_cabeca: Ponto
    inicio_ombro_dir: Ponto
    topo_ombro_dir: Ponto


class TemplateCreate(BaseModel):
    ticker: str
    timeframe: str
    candles: List[Dict[str, Any]]
    candles_contexto: List[Dict[str, Any]]
    pontos: PontosOCO
    resultado: Optional[str] = None
    observacao: Optional[str] = None


class TemplateUpdate(BaseModel):
    pontos: Optional[PontosOCO] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None


@router.get("")
@limiter.limit("30/minute")
def listar_templates(request: Request):
    resp = supabase.table("templates_oco").select("*").order("criado_em", desc=True).execute()
    return {"status": "ok", "templates": resp.data, "total": len(resp.data)}


@router.get("/{template_id}")
@limiter.limit("30/minute")
def obter_template(request: Request, template_id: int):
    resp = supabase.table("templates_oco").select("*").eq("id", template_id).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok", "template": resp.data[0]}


@router.post("")
@limiter.limit("30/minute")
def criar_template(request: Request, payload: TemplateCreate):
    body = payload.model_dump()
    resp = supabase.table("templates_oco").insert(body).execute()
    return {"status": "ok", "template": resp.data[0]}


@router.put("/{template_id}")
@limiter.limit("30/minute")
def atualizar_template(request: Request, template_id: int, payload: TemplateUpdate):
    body = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not body:
        raise HTTPException(status_code=400, detail="Nada para atualizar.")

    resp = supabase.table("templates_oco").update(body).eq("id", template_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok", "template": resp.data[0]}


@router.delete("/{template_id}")
@limiter.limit("30/minute")
def remover_template(request: Request, template_id: int):
    resp = supabase.table("templates_oco").delete().eq("id", template_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok"}
