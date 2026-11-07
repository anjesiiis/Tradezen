"""
TRADEZEN — EM QUE PÉ ESTÁ CADA MARCAÇÃO
=======================================

Revisar 212 marcações não se faz numa sentada. Isto guarda o status de
revisão de cada uma pra dar pra parar e voltar sabendo o que falta.

Os cinco valores estão explicados em sql/025_status_revisao.sql. O que
importa aqui: `aberto` é posto automaticamente e NÃO quer dizer
"aprovada" — três segundos de tela aberta não são um julgamento. Os
outros três são clique do admin.

POR QUE UM ENDPOINT PRÓPRIO, e não a coluna somada ao `_COLUNAS_LISTA`
das 21 listagens: aquelas listagens FUNCIONAM hoje. Pedir uma coluna que
só existe depois da migration 025 faria cada uma delas falhar inteira
enquanto a migration não rodasse — a tela de templates ficaria vazia por
causa de um enfeite. Aqui, sem a migration, este endpoint devolve 503, o
frontend não mostra selo nenhum e a lista segue de pé.
"""

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from admin_auth import require_admin
from rate_limit import limiter
from supabase_client import supabase

# rota (como o frontend chama) → tabela. Mesma lista da migration 025.
TABELAS: Dict[str, str] = {
    "oco": "templates_oco",
    "topo-duplo": "templates_topo_duplo",
    "niveis": "templates_niveis",
    "bandeira-alta": "templates_bandeira_alta",
    "bandeira-baixa": "templates_bandeira_baixa",
    "bandeira-alta-fracasso": "templates_bandeira_alta_fracasso",
    "bandeira-baixa-fracasso": "templates_bandeira_baixa_fracasso",
    "flamula-alta": "templates_flamula_alta",
    "flamula-baixa": "templates_flamula_baixa",
    "cunha-alta": "templates_cunha_alta",
    "cunha-baixa": "templates_cunha_baixa",
    "canal-alta": "templates_canal_alta",
    "canal-baixa": "templates_canal_baixa",
    "fundo-duplo": "templates_fundo_duplo",
    "oco-invertido": "templates_oco_invertido",
    "topo-triplo": "templates_topo_triplo",
    "fundo-triplo": "templates_fundo_triplo",
    "triangulo-ascendente": "templates_triangulo_ascendente",
    "triangulo-descendente": "templates_triangulo_descendente",
    "triangulo-simetrico": "templates_triangulo_simetrico",
    "retangulo": "templates_retangulo",
}

STATUS_VALIDOS = ("nao_visto", "aberto", "visto", "em_andamento", "revisto")

# Só estes três o admin põe na mão. `aberto` entra sozinho ao abrir, e
# `nao_visto` é o jeito de desmarcar.
_COLUNAS = "id,status_revisao,status_em,revisto_em,revisto_por"

router = APIRouter(
    prefix="/admin/status-revisao",
    tags=["admin-status-revisao"],
    dependencies=[Depends(require_admin)],
)


class StatusPayload(BaseModel):
    status: str


def _tabela(rota: str) -> str:
    tabela = TABELAS.get(rota)
    if not tabela:
        raise HTTPException(status_code=404, detail=f"Não conheço a lista '{rota}'.")
    return tabela


def _executar(consulta, tabela: str):
    """Roda a consulta dizendo o que fazer quando falta a migration.

    Duas faltas diferentes, e a mensagem precisa distinguir: a TABELA do
    padrão não existe (migration do padrão) ou a COLUNA não existe
    (migration 025). Sem isso, a tela mandaria rodar o arquivo errado.
    """
    try:
        return consulta.execute()
    except Exception as erro:
        texto = str(erro)
        if "status_revisao" in texto or "status_em" in texto:
            # Duas causas dão este MESMO erro, e a mensagem precisa dizer
            # as duas: a coluna não existe, ou existe e o PostgREST ficou
            # com o cache de schema antigo (acontece logo depois de um
            # alter table). Mandar só "rode a migration" põe quem já
            # rodou num círculo: roda, o aviso continua, roda de novo.
            raise HTTPException(
                status_code=503,
                detail=("O status de revisão não chegou ao banco. Rode "
                        "backend/sql/025_status_revisao.sql no SQL Editor do "
                        "Supabase. Se você JÁ rodou, o cache de schema está "
                        "velho: rode `notify pgrst, 'reload schema';` e "
                        "recarregue esta página."),
            ) from erro
        if "Could not find the table" in texto or "does not exist" in texto:
            raise HTTPException(
                status_code=503,
                detail=f"A tabela {tabela} ainda não existe no Supabase.",
            ) from erro
        raise


@router.get("/{rota}")
@limiter.limit("60/minute")
def listar_status(request: Request, rota: str):
    """O status de todas as marcações desta lista, em um pedido só.

    Um mapa id → status, e não uma lista: a tela precisa procurar pelo id
    de cada card, e um mapa poupa uma varredura por card.
    """
    tabela = _tabela(rota)
    resp = _executar(supabase.table(tabela).select(_COLUNAS), tabela)
    mapa = {
        str(linha["id"]): {
            "status": linha.get("status_revisao") or "nao_visto",
            "status_em": linha.get("status_em"),
            "revisto_em": linha.get("revisto_em"),
            "revisto_por": linha.get("revisto_por"),
        }
        for linha in (resp.data or [])
    }
    return {"status": "ok", "marcacoes": mapa, "total": len(mapa)}


@router.patch("/{rota}/{template_id}")
@limiter.limit("120/minute")
def mudar_status(request: Request, rota: str, template_id: int,
                 payload: StatusPayload, admin: str = Depends(require_admin)):
    tabela = _tabela(rota)
    if payload.status not in STATUS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Status '{payload.status}' não existe. Os válidos: {', '.join(STATUS_VALIDOS)}.",
        )

    agora = datetime.now(timezone.utc).isoformat()
    corpo = {"status_revisao": payload.status, "status_em": agora}

    # `revisto_em`/`revisto_por` são o registro DURÁVEL de que passou por
    # olho humano: ficam gravados mesmo que o status mude depois. É o que
    # o ML vai querer saber, e perder isso numa troca de status seria
    # perder o único dado que diz "este rótulo foi conferido".
    if payload.status == "revisto":
        corpo["revisto_em"] = agora
        corpo["revisto_por"] = admin

    # Desmarcar pra 'nao_visto' é dizer "não olhei isto": aí sim o
    # registro de revisão sai, senão ficaria um fantasma de revisão numa
    # marcação que a pessoa acabou de declarar não vista.
    if payload.status == "nao_visto":
        corpo["revisto_em"] = None
        corpo["revisto_por"] = None
        corpo["status_em"] = None

    resp = _executar(
        supabase.table(tabela).update(corpo).eq("id", template_id), tabela)
    if not resp.data:
        raise HTTPException(status_code=404, detail="Marcação não encontrada.")
    return {"status": "ok", "id": template_id, "status_revisao": payload.status}
