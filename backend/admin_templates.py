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
    # Data do primeiro ponto do padrão — guardada em coluna própria pra
    # a listagem e os marcadores cinzas no gráfico não precisarem abrir os
    # candles de cada template.
    data_p1: Optional[str] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None
    # Etiquetas de texto que o admin escreveu ao lado dos pontos.
    # Cada uma é { texto, ancora: { i, preco }, largura, altura }: fica
    # presa ao candle/preço, não a pixels, pra voltar no lugar certo.
    anotacoes: Optional[List[Dict[str, Any]]] = None


class TemplateUpdate(BaseModel):
    pontos: Optional[PontosOCO] = None
    resultado: Optional[str] = None
    observacao: Optional[str] = None
    anotacoes: Optional[List[Dict[str, Any]]] = None


# Colunas leves de propósito: `candles` e `candles_contexto` guardam o
# histórico inteiro de preços de cada template (chega a 2.500 candles por
# linha). Devolver tudo isso na LISTAGEM gerava respostas de 13 MB, que o
# servidor não aguentava montar — a página quebrava com 502/503 e aparecia
# "Não foi possível carregar os templates". A tela de listagem só mostra
# ticker/timeframe/resultado/data; os candles vêm no GET /{id}, na hora de
# abrir um template.
_COLUNAS_LISTA = "id,ticker,timeframe,resultado,observacao,criado_em,data_p1"


@router.get("")
@limiter.limit("30/minute")
def listar_templates(request: Request):
    resp = supabase.table("templates_oco").select(_COLUNAS_LISTA).order("criado_em", desc=True).execute()
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
