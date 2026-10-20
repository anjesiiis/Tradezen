"""
TRADEZEN — ADMIN: USUÁRIOS E PLANOS
====================================

Listar quem se cadastrou e virar o plano de free pra premium (e de volta).
Protegido pelo mesmo `require_admin` do painel de templates — o fluxo de
magic link não muda.

O email NÃO está em `profiles`, está em `auth.users`, que é do Supabase e
não dá pra consultar pelo PostgREST. Então a lista vem da Admin API
(`auth.admin.list_users`) e o plano vem de `profiles`; o casamento das
duas é feito aqui, por id.

Por que não uma view juntando as duas tabelas: a view existiria pra sempre
no banco expondo o email de todo mundo numa linha só, e dependeria de
acertar os `revoke` pra anon e authenticated. Pela Admin API, a lista só
existe durante a requisição de um admin autenticado.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator

from admin_auth import require_admin
from planos import FREE, PREMIUM
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(prefix="/admin/usuarios", tags=["admin-usuarios"], dependencies=[Depends(require_admin)])

PLANOS_VALIDOS = (FREE, PREMIUM)


class PlanoUpdate(BaseModel):
    plano: str

    @field_validator("plano")
    @classmethod
    def plano_conhecido(cls, v: str) -> str:
        p = (v or "").strip().lower()
        if p not in PLANOS_VALIDOS:
            raise ValueError(f"plano deve ser um de: {', '.join(PLANOS_VALIDOS)}")
        return p


def _perfis_por_id() -> Dict[str, Dict[str, Any]]:
    try:
        resp = supabase.table("profiles").select("id,nome,plano,criado_em").execute()
    except Exception as erro:
        texto = str(erro)
        if "Could not find the table" in texto or "does not exist" in texto:
            raise HTTPException(
                status_code=503,
                detail=(
                    "A tabela profiles ainda não existe no Supabase. "
                    "Rode backend/sql/017_profiles_e_planos.sql no SQL Editor e tente de novo."
                ),
            ) from erro
        raise
    return {linha["id"]: linha for linha in resp.data}


@router.get("")
@limiter.limit("30/minute")
def listar(request: Request):
    perfis = _perfis_por_id()
    usuarios: List[Dict[str, Any]] = []

    for u in supabase.auth.admin.list_users():
        perfil = perfis.get(str(u.id)) or {}
        usuarios.append({
            "id": str(u.id),
            "email": u.email,
            "nome": perfil.get("nome") or (u.user_metadata or {}).get("nome"),
            # sem linha em profiles o usuário é free na prática: é o que o
            # gate responde. Mostrar assim evita um "—" que não explica nada.
            "plano": (perfil.get("plano") or FREE).strip().lower(),
            "criado_em": perfil.get("criado_em") or (u.created_at.isoformat() if u.created_at else None),
            "ultimo_acesso": u.last_sign_in_at.isoformat() if u.last_sign_in_at else None,
            # avisa a UI que o perfil está faltando (usuário de antes da migration)
            "sem_perfil": not perfil,
        })

    usuarios.sort(key=lambda x: x["criado_em"] or "", reverse=True)
    return {"status": "ok", "usuarios": usuarios, "total": len(usuarios)}


@router.patch("/{user_id}/plano")
@limiter.limit("30/minute")
def mudar_plano(request: Request, user_id: str, payload: PlanoUpdate):
    # upsert em vez de update: usuário cadastrado antes da sql/017 pode não
    # ter linha em profiles, e nesse caso um update não acharia nada e o
    # admin veria "usuário não encontrado" por um motivo que não é esse.
    try:
        resp = supabase.table("profiles").upsert(
            {"id": user_id, "plano": payload.plano}, on_conflict="id"
        ).execute()
    except Exception as erro:
        texto = str(erro)
        if "foreign key" in texto.lower() or "violates" in texto.lower():
            raise HTTPException(status_code=404, detail="Usuário não encontrado.") from erro
        raise

    if not resp.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return {"status": "ok", "usuario": resp.data[0]}


@router.get("/{user_id}")
@limiter.limit("30/minute")
def obter(request: Request, user_id: str):
    perfil = _perfis_por_id().get(user_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return {"status": "ok", "usuario": perfil}
