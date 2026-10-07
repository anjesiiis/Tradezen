import hashlib
import threading
import time
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr
from supabase_auth.errors import AuthApiError

from config import ADMIN_EMAILS, FRONTEND_URL
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


class MagicLinkRequest(BaseModel):
    email: EmailStr
    # De onde o usuário pediu o link (window.location.origin no frontend).
    # Sem isso, o destino do magic link dependia só da env var FRONTEND_URL
    # estar setada certa no Render — se ela ficasse vazia, o Supabase
    # ignorava o redirect pedido (não estava na allow-list dele) e jogava o
    # usuário na Site URL do painel, fora do /admin/callback. Agora o
    # próprio site diz pra onde voltar, e o dev local funciona sozinho.
    origem: Optional[str] = None


# Só estas origens podem ser usadas como destino do magic link. Aceitar o
# valor do cliente sem validar seria open redirect (qualquer site poderia
# pedir um link de acesso que volta pro domínio dele, levando o token
# junto). A allow-list do próprio Supabase é a segunda camada.
_ORIGENS_CALLBACK = {
    "https://tradezen.com.br",
    "https://www.tradezen.com.br",
    "http://localhost:5173",
    "http://localhost:3000",
}


def _url_callback(origem: Optional[str]) -> str:
    if origem and origem.rstrip("/") in _ORIGENS_CALLBACK:
        return f"{origem.rstrip('/')}/admin/callback"
    return f"{FRONTEND_URL}/admin/callback"


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
            "options": {"email_redirect_to": _url_callback(payload.origem)},
        })
    except AuthApiError as e:
        if "rate limit" in e.message.lower():
            raise HTTPException(
                status_code=429,
                detail="Muitos links pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.",
            )
        raise HTTPException(status_code=502, detail="Não foi possível enviar o link agora. Tente novamente.")

    return {"status": "ok", "mensagem": "Link de acesso enviado para o email."}


# ── CACHE DE TOKENS JÁ VALIDADOS ──────────────────────────────
# Abrir uma tela do admin dispara ~10 chamadas de uma vez (a lista do
# padrão aberto + as lâmpadas, que consultam as 9 tabelas de template).
# Sem cache, cada uma dessas chamadas fazia uma ida e volta ao Supabase
# só pra perguntar de quem é o token — dez idas por tela. Bastava UMA
# falhar (timeout, rate limit do Supabase, rede ruim) pra virar 401, e o
# 401 derrubava a sessão inteira: era isso que mandava o admin de volta
# pra tela de email no meio da navegação entre padrões.
#
# Guardamos só o hash do token (nunca o token em si) e o email. TTL curto:
# 5 minutos é tempo de sobra pra cobrir uma navegação e curto o bastante
# pra um acesso revogado não durar na memória do processo.
_TTL_TOKEN = 300
_tokens_validos: dict = {}
_lock_tokens = threading.Lock()


def _chave(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _do_cache(token: str) -> Optional[str]:
    with _lock_tokens:
        guardado = _tokens_validos.get(_chave(token))
    if not guardado:
        return None
    quando, email = guardado
    if time.time() - quando > _TTL_TOKEN:
        return None
    return email


def _guardar(token: str, email: str) -> None:
    with _lock_tokens:
        # limpeza simples: joga fora o que já venceu antes de crescer
        agora = time.time()
        if len(_tokens_validos) > 50:
            for k, (quando, _) in list(_tokens_validos.items()):
                if agora - quando > _TTL_TOKEN:
                    _tokens_validos.pop(k, None)
        _tokens_validos[_chave(token)] = (agora, email)


def require_admin(authorization: str = Header(None)) -> str:
    """Valida o token Supabase (Bearer) e garante que o email está em ADMIN_EMAILS."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente.")

    token = authorization.split(" ", 1)[1].strip()

    em_cache = _do_cache(token)
    if em_cache:
        return em_cache

    try:
        resposta = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    user = resposta.user if resposta else None
    if not user or not user.email:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    email = user.email.strip().lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

    _guardar(token, user.email)
    return user.email
