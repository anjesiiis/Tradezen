from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr
from supabase_auth.errors import AuthApiError

from config import ADMIN_EMAILS, FRONTEND_URL
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


class MagicLinkRequest(BaseModel):
    email: EmailStr


# 5/minuto — é o endpoint de login. Sem um limite apertado aqui, alguém
# podia martelar magic-link pra um email várias vezes por minuto (spam de
# email pra vítima, ou tentar esgotar o rate-limit do próprio Supabase).
@router.post("/magic-link")
@limiter.limit("5/minute")
def solicitar_magic_link(request: Request, payload: MagicLinkRequest):
    email = payload.email.strip().lower()

    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Email não autorizado.")

    try:
        supabase.auth.sign_in_with_otp({
            "email": email,
            "options": {"email_redirect_to": f"{FRONTEND_URL}/admin/callback"},
        })
    except AuthApiError as e:
        if "rate limit" in e.message.lower():
            raise HTTPException(
                status_code=429,
                detail="Muitos links pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.",
            )
        raise HTTPException(status_code=502, detail="Não foi possível enviar o link agora. Tente novamente.")

    return {"status": "ok", "mensagem": "Link de acesso enviado para o email."}


def require_admin(authorization: str = Header(None)) -> str:
    """Valida o token Supabase (Bearer) e garante que o email está em ADMIN_EMAILS."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente.")

    token = authorization.split(" ", 1)[1].strip()

    try:
        resposta = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    user = resposta.user if resposta else None
    if not user or not user.email:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    if user.email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

    return user.email
