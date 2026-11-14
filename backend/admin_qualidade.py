"""
TRADEZEN — QUALIDADE DA MARCAÇÃO
================================

Quão bom EXEMPLO DA FORMA é cada marcação: de 1 a 5 estrelas, de meia
em meia (nove passos, guardados como 0 a 8). Os níveis estão explicados
em sql/026_qualidade_da_marcacao.sql e a escala dobrou na 029.

NÃO MEXE NA COLUNA `resultado`. São eixos diferentes: `resultado` é o
desfecho (texto livre, digitado na tela), `qualidade` é quão bom exemplo
da forma o desenho é. Um OCO de livro que não andou é qualidade 4 com
resultado ruim — derivar um do outro apagaria um dos dois.

A lista de tabelas vem de admin_status_revisao: uma lista a menos pra
sair de sincronia. Acrescentar um padrão novo é acrescentar lá, e as duas
features passam a atendê-lo.

Endpoint próprio pelo mesmo motivo do status: as 21 listagens de template
funcionam hoje, e pedir nelas uma coluna que só existe depois da 026 faria
cada uma falhar inteira enquanto a migration não rodasse.
"""

from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from admin_auth import require_admin
from admin_status_revisao import TABELAS
from rate_limit import limiter
from supabase_client import supabase

# ESCALA: smallint de 0 a 8 = 1 a 5 estrelas, de meia em meia.
#
#   valor    0   1    2   3    4   5    6   7    8
#   estrelas 1  1,5   2  2,5   3  3,5   4  4,5   5
#
# Valor PAR é nível com nome; ímpar é o meio-passo entre dois nomes. A
# escala dobrou na migration 029 (os antigos 0..4 viraram 0,2,4,6,8), e os
# nomes seguem exatamente onde estavam. Inteiro e não decimal: `order by`
# e `>= 6` são o que a tela e o treino fazem, e comparar decimal por
# igualdade é pedir pra um 3.4999 aparecer algum dia.
#
# A tela tem esta mesma tabela em frontend/src/admin/qualidade.js, e um
# teste lê os dois arquivos pra elas não saírem de sincronia.
QUALIDADE_MAXIMA = 8

# Rótulo de cada nível, pro backend falar a mesma língua da tela. O
# meio-passo não tem nome próprio: é o número de estrelas.
ROTULOS = {
    0: "Falha", 1: "1,5", 2: "Baixa", 3: "2,5", 4: "Média",
    5: "3,5", 6: "Alta", 7: "4,5", 8: "Ótimo",
}

# Alvo contínuo pra quando houver treino. Fica em FUNÇÃO e não em coluna
# gravada: é derivado de `qualidade`, e guardar derivado é criar duas
# fontes pra mesma verdade — basta alguém mexer na escala pra elas
# discordarem em silêncio.
#
# Os cinco valores nomeados são os mesmos de antes (0.0 / 0.3 / 0.6 / 0.8
# / 1.0, agora nos índices pares). Cada meio-passo é o ponto médio dos
# vizinhos, que é a única escolha que não reordena nada: a curva continua
# monótona e nenhum par de notas troca de lugar por causa da mudança.
_SCORE = {
    0: 0.0, 1: 0.15, 2: 0.3, 3: 0.45, 4: 0.6,
    5: 0.7, 6: 0.8, 7: 0.9, 8: 1.0,
}


def score_ml(qualidade: Optional[int]) -> Optional[float]:
    return None if qualidade is None else _SCORE[qualidade]


router = APIRouter(
    prefix="/admin/qualidade",
    tags=["admin-qualidade"],
    dependencies=[Depends(require_admin)],
)

_COLUNAS = "id,qualidade,qualidade_em,qualidade_por"


class QualidadePayload(BaseModel):
    # ge/le na borda: 9 ou -1 param aqui, com mensagem do pydantic, em vez
    # de chegar ao banco e voltar como violação de constraint. O teto é o
    # mesmo da trava do banco (ver 029) — dois números diferentes aqui e
    # lá dariam um 500 em vez de um 422.
    qualidade: Optional[int] = Field(default=None, ge=0, le=QUALIDADE_MAXIMA)


def _tabela(rota: str) -> str:
    tabela = TABELAS.get(rota)
    if not tabela:
        raise HTTPException(status_code=404, detail=f"Não conheço a lista '{rota}'.")
    return tabela


def _falta_coluna(erro: Exception, coluna: str) -> bool:
    texto = str(erro)
    return coluna in texto and ("does not exist" in texto or "Could not find" in texto)


def _traduzir(erro: Exception, tabela: str):
    """Transforma o erro do Supabase na providência que ele pede.

    Duas faltas diferentes, e o recado precisa distinguir: a COLUNA não
    existe (migration 026) ou a TABELA do padrão não existe (migration do
    padrão). Sem isso a tela mandaria rodar o arquivo errado.
    """
    if _falta_coluna(erro, "qualidade"):
        raise HTTPException(
            status_code=503,
            detail=(
                "A qualidade da marcação ainda não existe no banco. Rode "
                "backend/sql/026_qualidade_da_marcacao.sql no SQL Editor do "
                "Supabase. Se você JÁ rodou, o cache de schema está velho: "
                "rode `notify pgrst, 'reload schema';` e recarregue a página."
            ),
        ) from erro

    texto = str(erro)
    if "Could not find the table" in texto or "does not exist" in texto:
        raise HTTPException(
            status_code=503,
            detail=f"A tabela {tabela} ainda não existe no Supabase.",
        ) from erro

    # NUNCA re-lançar cru. Exceção que escapa daqui derruba a resposta, e o
    # navegador não recebe status nenhum — a tela então diz "não consegui
    # falar com o servidor", que é falso e manda a pessoa olhar a conexão
    # dela. Erro desconhecido é erro do servidor, e tem que dizer isso com
    # o texto real do banco.
    raise HTTPException(
        status_code=500,
        detail=f"Erro do servidor ao gravar em {tabela}: {texto[:300]}",
    ) from erro


def _executar(consulta, tabela: str):
    try:
        return consulta.execute()
    except HTTPException:
        raise
    except Exception as erro:
        _traduzir(erro, tabela)


@router.get("/{rota}")
@limiter.limit("60/minute")
def listar_qualidade(request: Request, rota: str):
    """Mapa id → qualidade da lista inteira, num pedido só."""
    tabela = _tabela(rota)
    resp = _executar(supabase.table(tabela).select(_COLUNAS), tabela)

    marcacoes: Dict[str, dict] = {}
    for linha in resp.data or []:
        nivel = linha.get("qualidade")
        marcacoes[str(linha["id"])] = {
            "qualidade": nivel,
            "rotulo": ROTULOS.get(nivel),
            "score_ml": score_ml(nivel),
            "qualidade_em": linha.get("qualidade_em"),
            "qualidade_por": linha.get("qualidade_por"),
        }
    return {"marcacoes": marcacoes}


@router.patch("/{rota}/{template_id}")
@limiter.limit("120/minute")
def mudar_qualidade(request: Request, rota: str, template_id: int,
                    payload: QualidadePayload, admin: str = Depends(require_admin)):
    """Avalia (0–4) ou desfaz a avaliação (qualidade: null).

    Avaliar é um julgamento humano, então também marca a revisão como
    'revisto' — é a mesma coisa dita de dois jeitos, e deixar as duas
    desencontradas faria a pessoa avaliar 212 marcações e a lista
    continuar dizendo que nenhuma foi revista.

    Mas isso é BEST-EFFORT: `status_revisao` é da 025, que pode não ter
    rodado. Se a coluna não existir, grava a qualidade sem ela em vez de
    perder a avaliação por causa de um enfeite de outra feature.
    """
    tabela = _tabela(rota)
    agora = datetime.now(timezone.utc).isoformat()
    nivel = payload.qualidade

    corpo = {
        "qualidade": nivel,
        "qualidade_em": None if nivel is None else agora,
        "qualidade_por": None if nivel is None else admin,
    }
    # Desfazer a avaliação não volta o status pra trás: a marcação FOI
    # olhada, e dizer que não foi apagaria um fato.
    com_status = dict(corpo)
    if nivel is not None:
        com_status |= {"status_revisao": "revisto", "revisto_em": agora, "revisto_por": admin}

    # DUAS TENTATIVAS, e a ordem importa: primeiro com o status de brinde,
    # depois só o que a pessoa pediu.
    #
    # Antes isto só caía pro plano B quando o erro TRAZIA o nome da coluna
    # da 025 no texto. Não traz sempre: `revisto_por` declarada como uuid
    # por uma versão errada da 025 faz o email do admin estourar com
    # "invalid input syntax for type uuid", sem dizer em qual coluna. O
    # resultado era a avaliação inteira se perder por causa de um brinde —
    # e com a exceção crua subindo, sem nem dizer por quê.
    #
    # Agora qualquer falha da primeira tentativa vira a segunda. Marcar as
    # estrelas é o pedido; marcar "Revisto" junto é conveniência, e
    # conveniência não derruba o pedido.
    resp = None
    if com_status is not corpo and len(com_status) > len(corpo):
        try:
            resp = supabase.table(tabela).update(com_status).eq("id", template_id).execute()
        except Exception:
            resp = None
    if resp is None:
        resp = _executar(
            supabase.table(tabela).update(corpo).eq("id", template_id), tabela)

    if not resp.data:
        raise HTTPException(status_code=404, detail="Marcação não encontrada.")

    return {
        "id": template_id,
        "qualidade": nivel,
        "rotulo": ROTULOS.get(nivel),
        "score_ml": score_ml(nivel),
    }
