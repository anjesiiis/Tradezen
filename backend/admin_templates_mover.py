"""
TRADEZEN — MOVER UMA MARCAÇÃO ENTRE "É O PADRÃO" E "NÃO É O PADRÃO"
====================================================================

As duas coisas moram em tabelas separadas, e isso é de propósito:

    templates_bandeira_alta           → a forma É uma bandeira. Se ela
                                        deu certo ou não, isso mora na
                                        coluna `resultado`.
    templates_bandeira_alta_fracasso  → a forma NÃO é uma bandeira. É
                                        contraexemplo de desenho.

Mover de tabela é dizer "eu errei ao chamar isto de bandeira". NÃO é
dizer "esta bandeira não funcionou" — isso é a coluna `resultado`, e
continua sendo um exemplo CERTO de forma. Confundir as duas envenena o
treino, e é por isso que a tela pergunta antes.

O que esta rota resolve: até agora, perceber o erro depois de salvo
custava apagar e remarcar os 8 pontos no gráfico, à mão. Aqui a linha
inteira atravessa — candles, contexto, pontos e anotações.

Sem transação, porque o Supabase não expõe uma pelo cliente REST. A
ordem é escolhida pra que a falha mais provável não perca nada: GRAVA no
destino primeiro, confere, e só então apaga a origem. Se o apagar falhar,
sobra uma cópia duplicada — chato e visível. Se fosse ao contrário, uma
falha no meio apagaria a marcação para sempre.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from admin_auth import require_admin
from bandeira_pontos import PontosBandeira, garantir_valido
from rate_limit import limiter
from supabase_client import supabase

# Pares: de onde pra onde, e em que direção a forma deve ser validada.
# `alta` é o sentido da bandeira — a validação de forma depende dele.
PARES = [
    {"rota": "bandeira-alta", "padrao": "templates_bandeira_alta",
     "fracasso": "templates_bandeira_alta_fracasso", "alta": True},
    {"rota": "bandeira-baixa", "padrao": "templates_bandeira_baixa",
     "fracasso": "templates_bandeira_baixa_fracasso", "alta": False},
]

# Campos que NÃO atravessam: ou são do banco (id, criado_em), ou são do
# lado de origem e não fazem sentido no destino.
_NAO_COPIAR = {"id", "criado_em", "atualizado_em", "movido_de", "movido_em", "motivo_movimento"}

# Só existem na tabela de fracasso; indo pro padrão, ficam pra trás.
_SO_NO_FRACASSO = {"tipo_fracasso", "motivo_fracasso"}


class MoverPayload(BaseModel):
    motivo: Optional[str] = None


def _registrar(origem: str, destino: str, id_origem: int, id_destino: Optional[int],
               ticker: Optional[str], motivo: Optional[str], admin: str) -> None:
    """Grava o histórico. Nunca derruba a operação: a marcação já mudou de
    lado, e perder a linha do log é menos grave que devolver erro pra uma
    coisa que deu certo."""
    try:
        supabase.table("log_reclassificacoes").insert({
            "tabela_origem": origem, "tabela_destino": destino,
            "id_origem": id_origem, "id_destino": id_destino,
            "ticker": ticker, "motivo": motivo, "admin_email": admin,
        }).execute()
    except Exception as erro:
        print(f"[mover] nao deu pra registrar no log: {erro}")


def _mover(origem: str, destino: str, template_id: int, motivo: Optional[str],
           admin: str, validar_forma: Optional[bool]) -> Dict[str, Any]:
    try:
        achado = supabase.table(origem).select("*").eq("id", template_id).limit(1).execute()
    except Exception as erro:
        texto = str(erro)
        if "Could not find the table" in texto or "does not exist" in texto:
            raise HTTPException(
                status_code=503,
                detail=f"A tabela {origem} ainda não existe no Supabase.",
            ) from erro
        raise
    if not achado.data:
        raise HTTPException(status_code=404, detail="Marcação não encontrada.")

    linha = achado.data[0]

    # Indo pro lado do PADRÃO, a forma tem que valer: a tabela de padrão é
    # o que ensina o que a bandeira É. Um contraexemplo costuma falhar
    # aqui de propósito, e a mensagem diz exatamente o quê.
    if validar_forma is not None:
        try:
            pontos = PontosBandeira(linha.get("pontos") or {})
        except Exception as erro:
            # Pontos faltando ou em formato estranho. Sem isto o pydantic
            # estouraria aqui e a tela receberia um 500 sem explicação.
            raise HTTPException(
                status_code=400,
                detail=("Os pontos desta marcação não estão no formato do padrão, "
                        f"então ela não pode virar exemplo positivo: {erro}"),
            ) from erro
        try:
            garantir_valido(pontos, alta=validar_forma)
        except HTTPException as erro:
            raise HTTPException(
                status_code=400,
                detail=(f"Esta marcação não passa na validação de forma do padrão, "
                        f"então não pode virar exemplo positivo: {erro.detail}"),
            ) from erro

    novo = {c: v for c, v in linha.items() if c not in _NAO_COPIAR}
    if validar_forma is not None:                 # fracasso → padrão
        for c in _SO_NO_FRACASSO:
            novo.pop(c, None)
    novo["movido_de"] = origem
    novo["movido_em"] = "now()"
    novo["motivo_movimento"] = motivo

    try:
        criado = supabase.table(destino).insert(novo).execute()
    except Exception as erro:
        texto = str(erro)
        if "movido_de" in texto or "movido_em" in texto or "motivo_movimento" in texto:
            raise HTTPException(
                status_code=503,
                detail=("As colunas de movimentação ainda não existem. Rode "
                        "backend/sql/023_mover_entre_padrao_e_fracasso.sql no SQL Editor."),
            ) from erro
        raise HTTPException(status_code=502, detail=f"Não deu pra gravar no destino: {erro}") from erro

    if not criado.data:
        raise HTTPException(status_code=502, detail="O destino não confirmou a gravação.")
    id_destino = criado.data[0].get("id")

    # Só agora a origem sai. Se este apagar falhar, fica uma cópia
    # duplicada — visível e corrigível; o contrário perderia o trabalho.
    try:
        supabase.table(origem).delete().eq("id", template_id).execute()
    except Exception as erro:
        _registrar(origem, destino, template_id, id_destino, linha.get("ticker"), motivo, admin)
        raise HTTPException(
            status_code=500,
            detail=(f"A marcação foi copiada para o destino (id {id_destino}), mas a cópia "
                    f"antiga não foi apagada. Apague a de id {template_id} em {origem}."),
        ) from erro

    _registrar(origem, destino, template_id, id_destino, linha.get("ticker"), motivo, admin)
    return {"status": "ok", "id_origem": template_id, "id_destino": id_destino,
            "de": origem, "para": destino}


def criar_routers() -> list[APIRouter]:
    """Um par de rotas por padrão, penduradas nos prefixos que já existem."""
    routers: list[APIRouter] = []
    for par in PARES:
        padrao, fracasso, alta = par["padrao"], par["fracasso"], par["alta"]

        r_padrao = APIRouter(
            prefix=f"/admin/templates-{par['rota']}",
            tags=[f"admin-templates-{par['rota']}"],
            dependencies=[Depends(require_admin)],
        )
        r_fracasso = APIRouter(
            prefix=f"/admin/templates-{par['rota']}-fracasso",
            tags=[f"admin-templates-{par['rota']}-fracasso"],
            dependencies=[Depends(require_admin)],
        )

        @r_padrao.post("/{template_id}/mover-para-fracasso")
        @limiter.limit("20/minute")
        def para_fracasso(request: Request, template_id: int, payload: MoverPayload,
                          admin: str = Depends(require_admin),
                          _o=padrao, _d=fracasso):
            # Sem validação de forma: o lado do fracasso guarda justamente
            # o desenho torto, e exigir forma recusaria o que se quer.
            return _mover(_o, _d, template_id, payload.motivo, admin, validar_forma=None)

        @r_fracasso.post("/{template_id}/mover-para-padrao")
        @limiter.limit("20/minute")
        def para_padrao(request: Request, template_id: int, payload: MoverPayload,
                        admin: str = Depends(require_admin),
                        _o=fracasso, _d=padrao, _alta=alta):
            return _mover(_o, _d, template_id, payload.motivo, admin, validar_forma=_alta)

        routers += [r_padrao, r_fracasso]
    return routers


ROUTERS = criar_routers()
