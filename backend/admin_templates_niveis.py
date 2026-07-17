from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from admin_auth import require_admin
from supabase_client import supabase

router = APIRouter(
    prefix="/admin/templates-niveis",
    tags=["admin-templates-niveis"],
    dependencies=[Depends(require_admin)],
)

Tipo = Literal["suporte", "resistencia"]


class Ponto(BaseModel):
    i: int
    preco: float


class PontosNivel(BaseModel):
    toques: List[Ponto] = Field(min_length=2)


class TemplateCreate(BaseModel):
    ticker: str
    timeframe: str
    tipo: Tipo
    candles: List[Dict[str, Any]]
    candles_contexto: List[Dict[str, Any]]
    pontos: PontosNivel
    resultado: Optional[str] = None
    observacao: Optional[str] = None


class TemplateUpdate(BaseModel):
    tipo: Optional[Tipo] = None
    pontos: Optional[PontosNivel] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None


@router.get("")
def listar_templates(tipo: Optional[Tipo] = None):
    query = supabase.table("templates_niveis").select("*").order("criado_em", desc=True)
    if tipo:
        query = query.eq("tipo", tipo)
    resp = query.execute()
    return {"status": "ok", "templates": resp.data, "total": len(resp.data)}


@router.get("/{template_id}")
def obter_template(template_id: int):
    resp = supabase.table("templates_niveis").select("*").eq("id", template_id).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok", "template": resp.data[0]}


@router.post("")
def criar_template(payload: TemplateCreate):
    body = payload.model_dump()
    resp = supabase.table("templates_niveis").insert(body).execute()
    return {"status": "ok", "template": resp.data[0]}


@router.put("/{template_id}")
def atualizar_template(template_id: int, payload: TemplateUpdate):
    body = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not body:
        raise HTTPException(status_code=400, detail="Nada para atualizar.")

    resp = supabase.table("templates_niveis").update(body).eq("id", template_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok", "template": resp.data[0]}


@router.delete("/{template_id}")
def remover_template(template_id: int):
    resp = supabase.table("templates_niveis").delete().eq("id", template_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return {"status": "ok"}
