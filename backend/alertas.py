"""
TRADEZEN — ALERTAS DE PADRÃO
===============================

Usuário escolhe um ativo + quais tipos de padrão monitorar. A notificação
em si nasce sozinha via trigger no banco (ver sql/005_alertas.sql) sempre
que um padrão novo é marcado no admin — aqui só ficam as rotas de
CRUD do alerta e leitura/marcação das notificações já geradas.
"""

from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from ativos import por_ticker
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(prefix="/alertas", tags=["alertas"])

PADROES_VALIDOS = {
    "oco", "topo_duplo", "suporte", "resistencia",
    "bandeira_alta", "bandeira_baixa", "flamula_alta", "flamula_baixa",
    "cunha_alta", "cunha_baixa",
    "canal_alta", "canal_baixa",
}


def require_user(authorization: str = Header(None)) -> str:
    """Valida o token Supabase (Bearer) de um usuário logado comum (não
    precisa ser admin) e devolve o id dele. Mesmo padrão do require_admin
    em admin_auth.py, sem a checagem de ADMIN_EMAILS."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        resposta = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")
    user = resposta.user if resposta else None
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")
    return user.id


# Teto de alertas por pessoa. Nao e para conter ataque — e para conter
# acidente e teimosia: sem teto, a lista de um usuario cresce sem fim e a
# rota de listagem (que devolve todas) passa a montar resposta grande a
# cada abertura de tela. 60 ativos monitorados e mais do que qualquer
# pessoa acompanha de verdade, e o catalogo inteiro tem 282.
MAX_ALERTAS_POR_USUARIO = 60


class AlertaCreate(BaseModel):
    ticker: str
    padroes: List[str]


@router.get("")
@limiter.limit("60/minute")
def listar_alertas(request: Request, usuario_id: str = Depends(require_user)):
    resp = (
        supabase.table("alertas")
        .select("*")
        .eq("usuario_id", usuario_id)
        .order("criado_em", desc=True)
        # Teto explicito mesmo com MAX_ALERTAS_POR_USUARIO ja limitando a
        # criacao: linha gravada antes deste teto existir, ou pelo backend
        # com a chave secreta, nao passou por aquela checagem. Consulta sem
        # limite e uma promessa que depende de outra parte do codigo.
        .limit(MAX_ALERTAS_POR_USUARIO)
        .execute()
    )
    return {"status": "ok", "alertas": resp.data}


@router.post("")
@limiter.limit("30/minute")
def criar_ou_atualizar_alerta(request: Request, payload: AlertaCreate, usuario_id: str = Depends(require_user)):
    padroes = [p for p in payload.padroes if p in PADROES_VALIDOS]
    if not padroes:
        raise HTTPException(status_code=400, detail="Escolha ao menos um padrão pra monitorar.")
    ticker = payload.ticker.strip().upper()

    # O TICKER TEM QUE EXISTIR NO CATALOGO (backend/ativos.py).
    # Antes, qualquer texto era aceito: `padroes` sempre passou por
    # whitelist, mas o ticker nao. Isso deixava o usuario gravar linha
    # para ativo inexistente — monitoramento que nunca dispara (ele acha
    # que esta avisado e nao esta) e, de quebra, uma via para encher a
    # tabela com uma linha nova por string inventada, ja que o upsert
    # deduplica por (usuario_id, ticker).
    if not por_ticker(ticker):
        raise HTTPException(
            status_code=400,
            detail=f"Ativo {ticker} nao esta na lista monitorada pelo TradeZen.",
        )

    # Teto por pessoa. Conferido ANTES do upsert, e so quando o alerta e
    # novo: reconfigurar um alerta que ja existe nao pode bater no teto.
    existentes = (
        supabase.table("alertas")
        .select("ticker")
        .eq("usuario_id", usuario_id)
        .limit(MAX_ALERTAS_POR_USUARIO + 1)
        .execute()
    ).data or []
    if len(existentes) >= MAX_ALERTAS_POR_USUARIO and ticker not in {
        linha.get("ticker") for linha in existentes
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Voce chegou ao limite de {MAX_ALERTAS_POR_USUARIO} ativos monitorados. "
                "Apague um alerta para criar outro."
            ),
        )

    body = {"usuario_id": usuario_id, "ticker": ticker, "padroes": padroes}
    resp = supabase.table("alertas").upsert(body, on_conflict="usuario_id,ticker").execute()
    return {"status": "ok", "alerta": resp.data[0]}


@router.delete("/{alerta_id}")
@limiter.limit("30/minute")
def apagar_alerta(request: Request, alerta_id: str, usuario_id: str = Depends(require_user)):
    supabase.table("alertas").delete().eq("id", alerta_id).eq("usuario_id", usuario_id).execute()
    return {"status": "ok"}


@router.get("/notificacoes")
@limiter.limit("60/minute")
def listar_notificacoes(request: Request, usuario_id: str = Depends(require_user)):
    resp = (
        supabase.table("notificacoes_alerta")
        .select("*")
        .eq("usuario_id", usuario_id)
        .order("criado_em", desc=True)
        .limit(50)
        .execute()
    )
    return {"status": "ok", "notificacoes": resp.data}


@router.post("/notificacoes/marcar-lidas")
@limiter.limit("30/minute")
def marcar_notificacoes_lidas(request: Request, usuario_id: str = Depends(require_user)):
    supabase.table("notificacoes_alerta").update({"lida": True}).eq("usuario_id", usuario_id).eq("lida", False).execute()
    return {"status": "ok"}
