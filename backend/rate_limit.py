"""
Limiter compartilhado do slowapi. Fica num módulo próprio (em vez de
dentro de main.py) porque os routers (admin_auth, admin_templates,
padroes_marcados, etc.) também precisam de `@limiter.limit(...)` nas
próprias rotas — importar de main.py criaria import circular, já que
main.py é quem importa os routers.

default_limits=["100/minute"] é o teto pra qualquer rota SEM decorator
explícito (endpoint público genérico). Rotas mais sensíveis (auth, admin,
dados de mercado) têm limite próprio, mais apertado, direto no decorator.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
