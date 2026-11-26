"""
TRADEZEN — TRILHA DE AUDITORIA
==============================

O log de segurança (logs.py) sai no stdout do Render: serve pra olhar
agora, não pra responder "quem mudou o plano desse usuário em março?".
O log do Render é volátil e não se consulta com SQL. Esta trilha fica no
Supabase (tabela `logs_auditoria`, sql/032) e sobrevive ao deploy.

O QUE ENTRA AQUI: ação deliberada de consequência — mudar o plano de
alguém, treinar modelo, excluir conta, tentativa negada de acesso admin.
O QUE NÃO ENTRA: navegação, leitura, uma linha por requisição. Encher a
tabela de ruído é o jeito mais seguro de deixar o que importa invisível.

REGRA DE OURO: registrar NUNCA derruba a operação.
Auditoria é efeito colateral. Se a tabela não existe ainda (migration não
rodada), se o Supabase está fora, se o json não serializa — a ação do
usuário tem que seguir. Por isso todo este módulo é um try/except grande
que, no pior caso, deixa o registro no log do Render e volta. O contrário
seria um admin impedido de liberar um plano porque a auditoria caiu.
"""

from typing import Any, Dict, Optional

from logs import ip_do_pedido, seguranca
from supabase_client import supabase

# ── O VOCABULÁRIO ─────────────────────────────────────────────
# Nome curto, estável, usado como filtro no banco. Mudar um destes
# strings depois de estar gravado parte o histórico em dois: o de antes
# não aparece mais na busca pelo nome novo. Então acrescente, não renomeie.
ACOES = {
    "CONTA_EXCLUIDA": "conta_excluida",
    "PLANO_ALTERADO": "plano_alterado",
    "MODELO_TREINADO": "modelo_treinado",
    "MODELO_ATIVADO": "modelo_ativado",
    "ACESSO_ADMIN_NEGADO": "acesso_admin_negado",
}

# Marca o email de quem exerceu o direito de exclusão (LGPD art. 18, VI).
# A linha de auditoria FICA — o registro de que a exclusão aconteceu tem
# que sobreviver a ela —, mas sem o dado pessoal de quem pediu pra sair.
EMAIL_ANONIMIZADO = "[excluido]"

_TABELA = "logs_auditoria"

# Pra não escrever a mesma lamentação a cada chamada quando a migration
# ainda não rodou: avisa uma vez e cala.
_ja_avisou_que_falta = False


def _avisar_tabela_faltando(erro: str) -> None:
    global _ja_avisou_que_falta
    if _ja_avisou_que_falta:
        return
    _ja_avisou_que_falta = True
    seguranca.warning(
        "auditoria DESLIGADA: a tabela %s nao existe. "
        "Rode backend/sql/032_logs_auditoria.sql no SQL Editor do Supabase. (%s)",
        _TABELA, erro[:160],
    )


def registrar(
    acao: str,
    *,
    usuario_id: Optional[str] = None,
    usuario_email: Optional[str] = None,
    recurso: Optional[str] = None,
    recurso_id: Optional[str] = None,
    detalhes: Optional[Dict[str, Any]] = None,
    request: Any = None,
) -> None:
    """Grava uma linha na trilha. Não levanta exceção, nunca.

    O log do Render recebe a mesma informação, sempre: é o que garante que
    a ação fique registrada em ALGUM lugar mesmo com o banco fora.
    """
    seguranca.info(
        "auditoria acao=%s usuario=%s recurso=%s/%s detalhes=%s",
        acao, usuario_email or usuario_id or "?", recurso or "-", recurso_id or "-",
        detalhes or {},
    )

    linha = {
        "acao": acao,
        "usuario_id": usuario_id,
        "usuario_email": usuario_email,
        "recurso": recurso,
        "recurso_id": recurso_id,
        "detalhes": detalhes,
    }
    if request is not None:
        try:
            linha["ip"] = ip_do_pedido(request)
            # Cortado: user agent é texto de cliente, pode vir enorme de
            # propósito. 300 caracteres identificam o navegador e sobra.
            linha["user_agent"] = (request.headers.get("user-agent") or "")[:300] or None
        except Exception:
            pass

    try:
        supabase.table(_TABELA).insert(linha).execute()
    except Exception as erro:
        texto = str(erro)
        if "Could not find the table" in texto or "does not exist" in texto:
            _avisar_tabela_faltando(texto)
            return
        # Qualquer outra falha também é silenciosa pra quem está usando o
        # site, mas fica no log — auditoria caindo é problema operacional.
        seguranca.warning("auditoria FALHOU acao=%s erro=%s", acao, texto[:200])


def anonimizar_usuario(usuario_id: str) -> None:
    """Tira o email das linhas de quem está sendo excluído.

    Chamada ANTES de apagar a conta: depois, `usuario_id` já virou null
    pelo `on delete set null` da chave estrangeira, e não haveria mais
    como achar as linhas dessa pessoa pra limpar.
    """
    try:
        supabase.table(_TABELA).update(
            {"usuario_email": EMAIL_ANONIMIZADO}
        ).eq("usuario_id", usuario_id).execute()
    except Exception as erro:
        texto = str(erro)
        if "Could not find the table" in texto or "does not exist" in texto:
            _avisar_tabela_faltando(texto)
            return
        seguranca.warning("auditoria: anonimizacao FALHOU usuario=%s erro=%s",
                          usuario_id, texto[:200])
