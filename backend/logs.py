"""
TRADEZEN — LOG DE SEGURANÇA E DE ERRO
=====================================

Antes disto, um 401 ou 403 saía como resposta e DESAPARECIA. Não havia
como responder "alguém está tentando entrar no painel?" — um ataque em
curso e um dia tranquilo eram indistinguíveis. Erro não tratado, igual:
morria num 500 genérico sem deixar rastro.

Vai pro stdout de propósito: é de lá que o Render lê (aba Logs). Nada de
arquivo — o disco do plano free é efêmero e o arquivo sumiria no deploy
seguinte.

Dois canais, pra dar pra filtrar um sem o outro:
  • tradezen.seguranca — autenticação e autorização (quem tentou, de onde)
  • tradezen.erro      — exceção não tratada, com traceback
"""

import logging
import sys

_FORMATO = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def _preparar() -> None:
    raiz = logging.getLogger("tradezen")
    if raiz.handlers:          # já configurado (reimport, reload do uvicorn)
        return
    saida = logging.StreamHandler(sys.stdout)
    saida.setFormatter(logging.Formatter(_FORMATO))
    raiz.addHandler(saida)
    raiz.setLevel(logging.INFO)
    # Sem propagate, pra não sair duplicado no log do uvicorn.
    raiz.propagate = False


_preparar()

seguranca = logging.getLogger("tradezen.seguranca")
erro = logging.getLogger("tradezen.erro")


def ip_do_pedido(request) -> str:
    """O IP de quem pediu, de verdade.

    `request.client.host` atrás do Render/Vercel é o IP do PROXY — igual
    pra todo mundo, inútil pra distinguir uma tentativa de outra. O IP
    real vem no primeiro item do X-Forwarded-For.
    """
    encaminhado = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    if encaminhado:
        return encaminhado
    cliente = getattr(request, "client", None)
    return getattr(cliente, "host", None) or "?"
