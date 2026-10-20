"""
TRADEZEN — PLANO DO USUÁRIO (free / premium / admin)
=====================================================

Quem pode ver as detecções. O plano mora em `profiles.plano`, e o usuário
só consegue LER a própria linha (ver sql/017) — mudar plano é operação de
backend, com a chave secreta.

Decisão de projeto: usuário sem plano NÃO recebe 401/403. A rota responde
200 com lista vazia. Erro no console é ruído pra quem só não assinou
ainda, e um 403 ainda vazaria a informação de que existe algo ali.

O token não é decodificado à mão de propósito: `auth.get_user(jwt)`
devolve o usuário ao próprio Supabase validar a assinatura e a validade.
Assim não há segredo de JWT guardado aqui, nem dependência nova — e um
token expirado ou forjado cai no mesmo caminho do visitante sem token.
"""

from typing import Optional

from fastapi import APIRouter, Header, Request

from config import ADMIN_EMAILS
from rate_limit import limiter
from supabase_client import supabase

FREE = "free"
PREMIUM = "premium"
ADMIN = "admin"

# Quem vê as detecções.
PLANOS_COM_ACESSO = (PREMIUM, ADMIN)


def _token_do_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    partes = authorization.split(None, 1)
    if len(partes) != 2 or partes[0].lower() != "bearer":
        return None
    return partes[1].strip() or None


def plano_do_token(authorization: Optional[str]) -> str:
    """
    Plano de quem fez a requisição: "free", "premium" ou "admin".

    Nunca levanta exceção: qualquer problema (sem token, token inválido,
    perfil ausente, Supabase fora) vira "free". É o padrão seguro — na
    dúvida, não entrega o conteúdo pago.
    """
    token = _token_do_header(authorization)
    if not token:
        return FREE

    try:
        usuario = supabase.auth.get_user(token).user
    except Exception:
        return FREE
    if not usuario:
        return FREE

    # Admin ganha acesso pelo email, sem depender do plano: é a mesma
    # lista que libera o painel de templates (ADMIN_EMAILS no Render).
    email = (usuario.email or "").strip().lower()
    if email and email in ADMIN_EMAILS:
        return ADMIN

    try:
        resp = supabase.table("profiles").select("plano").eq("id", usuario.id).limit(1).execute()
    except Exception:
        # profiles ainda não existe (sql/017 não rodou) — todo mundo free
        return FREE

    if not resp.data:
        return FREE
    return (resp.data[0].get("plano") or FREE).strip().lower()


def tem_acesso(plano: str) -> bool:
    return plano in PLANOS_COM_ACESSO


# ── rota que o frontend usa pra saber o que mostrar ──
# O plano também vem direto do Supabase no AuthContext (o usuário lê a
# própria linha de profiles). Esta rota existe pelo `admin`: a lista
# ADMIN_EMAILS vive só no servidor, e mandá-la pro frontend seria expor
# quem são os admins. Então quem responde "você é admin?" é o backend.
router = APIRouter(tags=["usuario"])


@router.get("/eu")
@limiter.limit("60/minute")
def eu(request: Request, authorization: Optional[str] = Header(None)):
    plano = plano_do_token(authorization)
    return {
        "status": "ok",
        "plano": PREMIUM if plano == ADMIN else plano,
        "admin": plano == ADMIN,
        "acesso": tem_acesso(plano),
    }
