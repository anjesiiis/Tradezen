"""
TRADEZEN — EXCLUSÃO DA PRÓPRIA CONTA (LGPD art. 18, VI)
=======================================================

O titular tem direito à eliminação dos dados. Antes disto não havia como
exercê-lo: nenhuma rota, nenhum botão — só pedindo pro suporte apagar à
mão, o que não é um canal e não é auditável.

POR QUE APAGAR O USUÁRIO DO AUTH E NÃO LINHA POR LINHA:
as tabelas de dado do usuário têm `on delete cascade` apontando pra
auth.users (conferidas uma a uma: profiles, usuarios, alertas,
notificacoes_alerta, sessao_telas, graficos_usuario). Apagar o usuário no
Auth derruba todas de uma vez, dentro da mesma transação do Postgres.
Apagar à mão numa lista escrita aqui seria uma segunda lista pra sair de
sincronia — bastaria uma tabela nova pra ficar dado órfão do titular que
pediu exclusão.

O QUE **NÃO** É APAGADO, e por quê: as tabelas `templates_*`. Elas são o
material de estudo do projeto (marcações de padrão gráfico feitas pelo
admin), não têm vínculo com usuário nenhum e não contêm dado pessoal.

`require_user` vem de alertas.py porque é lá que ele mora hoje. Mover pra
um módulo compartilhado seria mexer em código que funciona só por
estética — e a função é a mesma, com o mesmo contrato.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from alertas import require_user
from logs import ip_do_pedido, seguranca
from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(prefix="/eu", tags=["usuario"])


@router.delete("/conta")
@limiter.limit("5/minute")
def excluir_conta(request: Request, usuario_id: str = Depends(require_user)):
    """Apaga a conta do usuário autenticado e tudo que está ligado a ela.

    Irreversível, e por isso o id vem SÓ do token (require_user): não há
    parâmetro de usuário nesta rota. Se viesse do pedido, qualquer pessoa
    logada apagaria a conta de outra trocando um id — e seria o IDOR mais
    destrutivo possível.

    5/minute: ninguém precisa apagar a conta duas vezes, e um limite baixo
    fecha a porta pra alguém usar isto como marreta com token roubado.
    """
    # Registrado ANTES: se o apagamento der certo, o usuário deixa de
    # existir e não haveria mais de quem falar no log.
    seguranca.info("exclusao de conta PEDIDA usuario=%s ip=%s",
                   usuario_id, ip_do_pedido(request))

    try:
        supabase.auth.admin.delete_user(usuario_id)
    except Exception as erro:
        seguranca.warning("exclusao de conta FALHOU usuario=%s erro=%s",
                          usuario_id, str(erro)[:200])
        raise HTTPException(
            status_code=502,
            detail="Não foi possível excluir a conta agora. Tente de novo em instantes.",
        ) from erro

    seguranca.info("exclusao de conta CONCLUIDA usuario=%s", usuario_id)
    return {
        "status": "ok",
        "mensagem": "Sua conta e todos os seus dados foram removidos.",
    }
