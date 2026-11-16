"""Guardar e recuperar os modelos treinados.

DOIS LUGARES, de propósito:
  • o .pkl em disco, que é rápido de carregar;
  • o MESMO .pkl em base64 na tabela, que é o que sobrevive.

O Render recria o disco a cada deploy. Modelo só em disco desaparece no
próximo push, e o painel passaria a mostrar "v4 ativo" apontando pra um
arquivo que não existe — pior que não ter modelo, porque mente. A coluna
`modelo_b64` é o original; o disco é cache, e se o arquivo não estiver lá
ele é reescrito a partir do banco.
"""
from __future__ import annotations

import base64
import io
import os
from typing import Any, Dict, List, Optional

import joblib

from supabase_client import supabase

TABELA = "modelos_treinados"
PASTA = os.path.join(os.path.dirname(__file__), "modelos")

# Lido do trainer pra as duas listas nunca divergirem: um alvo que treina
# e não salva seria um treino que se perde no fim.
PADROES_VALIDOS = ("bandeira_alta", "bandeira_baixa",
                   "bandeira_alta_qualidade", "bandeira_baixa_qualidade")


def _caminho(padrao: str, versao: int) -> str:
    return os.path.join(PASTA, f"{padrao}_v{versao}.pkl")


def proxima_versao(padrao: str) -> int:
    resp = (supabase.table(TABELA).select("versao")
            .eq("padrao", padrao).order("versao", desc=True).limit(1).execute())
    linhas = resp.data or []
    return (linhas[0]["versao"] + 1) if linhas else 1


def salvar(modelo, padrao: str, metricas: Dict[str, Any],
           extras: Dict[str, Any]) -> Dict[str, Any]:
    """Grava o modelo e devolve a linha criada. `ativo` nasce False SEMPRE:
    treinar não é promover. Quem promove é uma pessoa olhando as métricas,
    pela rota /ativar — modelo novo entrar em produção sozinho significaria
    que um treino ruim derruba o que estava funcionando."""
    if padrao not in PADROES_VALIDOS:
        raise ValueError(f"padrão desconhecido: {padrao}")

    versao = proxima_versao(padrao)
    os.makedirs(PASTA, exist_ok=True)
    caminho = _caminho(padrao, versao)
    joblib.dump(modelo, caminho)
    with open(caminho, "rb") as arquivo:
        b64 = base64.b64encode(arquivo.read()).decode("ascii")

    linha = {
        "padrao": padrao,
        "versao": versao,
        "arquivo_pkl": os.path.relpath(caminho, os.path.dirname(__file__)),
        "modelo_b64": b64,
        "precisao": metricas.get("precisao"),
        "recall": metricas.get("recall"),
        "f1": metricas.get("f1"),
        "accuracy": metricas.get("accuracy"),
        "roc_auc": metricas.get("roc_auc"),
        "n_templates_sucesso": extras.get("n_sucesso"),
        "n_templates_falha": extras.get("n_falha"),
        "metricas": metricas,
        "detalhes": extras,
        "ativo": False,
    }
    resp = supabase.table(TABELA).insert(linha).execute()
    criada = (resp.data or [{}])[0]
    # O base64 não volta pra quem chamou: são centenas de KB que ninguém
    # vai ler na resposta HTTP.
    criada.pop("modelo_b64", None)
    return criada


def listar(padrao: str) -> List[dict]:
    resp = (supabase.table(TABELA)
            .select("id,padrao,versao,arquivo_pkl,precisao,recall,f1,accuracy,"
                    "roc_auc,n_templates_sucesso,n_templates_falha,metricas,"
                    "detalhes,ativo,treinado_em")
            .eq("padrao", padrao).order("versao", desc=True).execute())
    return resp.data or []


def ativar(modelo_id: str) -> dict:
    """Marca um modelo como o de produção e desativa os outros do MESMO
    padrão. A ordem é desativar-depois-ativar: se o processo morrer no meio,
    o estado possível é 'nenhum ativo' (o código cai no último treinado),
    nunca 'dois ativos' — que faria duas respostas diferentes pra mesma
    pergunta, dependendo de qual linha o banco devolvesse primeiro."""
    resp = supabase.table(TABELA).select("padrao").eq("id", modelo_id).execute()
    linhas = resp.data or []
    if not linhas:
        raise LookupError("modelo não encontrado")
    padrao = linhas[0]["padrao"]

    supabase.table(TABELA).update({"ativo": False}).eq("padrao", padrao).execute()
    feito = supabase.table(TABELA).update({"ativo": True}).eq("id", modelo_id).execute()
    return (feito.data or [{}])[0]


TABELA_TESTES = "testes_modelo"


def teste_guardado(padrao: str, modelo_id: Optional[str] = None) -> Optional[dict]:
    """O último teste gravado deste modelo, ou None.

    Sem `modelo_id`, procura o teste do modelo que o laboratório usaria
    (o ativo, ou o mais recente) — senão o cache de um modelo antigo
    responderia por um modelo novo, com a cara de resultado atual.
    """
    if not modelo_id:
        registro, _ = carregar_para_teste(padrao, None)
        modelo_id = registro.get("id")
        if not modelo_id:
            return None
    resp = (supabase.table(TABELA_TESTES)
            .select("resultado_json,criado_em")
            .eq("modelo_id", modelo_id).order("criado_em", desc=True)
            .limit(1).execute())
    linhas = resp.data or []
    if not linhas:
        return None
    return {**(linhas[0]["resultado_json"] or {}),
            "guardado_em": linhas[0].get("criado_em")}


def guardar_teste(saida: dict) -> None:
    """Grava o resultado. Falha aqui NÃO derruba o teste: o laboratório
    acabou de calcular tudo, e perder a resposta por causa do cache seria
    jogar fora o trabalho pra proteger a otimização dele."""
    try:
        supabase.table(TABELA_TESTES).insert({
            "modelo_id": (saida.get("modelo") or {}).get("id"),
            "padrao": saida.get("padrao"),
            "n_templates": len(saida.get("linhas") or []),
            "resumo": saida.get("resumo"),
            "resultado_json": saida,
        }).execute()
    except Exception:
        pass


def carregar_para_teste(padrao: str, modelo_id: Optional[str] = None):
    """Devolve (registro, modelo) de um id específico ou do ativo.

    Sem modelo ativo, cai no mais recente em vez de devolver nada: quem
    abre o laboratório quer ver o último treino, e "nenhum ativo" é um
    estado comum (treinar não promove, de propósito).
    """
    consulta = (supabase.table(TABELA)
                .select("id,padrao,versao,ativo,treinado_em,f1,accuracy,"
                        "arquivo_pkl,modelo_b64,detalhes"))
    if modelo_id:
        linhas = consulta.eq("id", modelo_id).limit(1).execute().data or []
    else:
        linhas = (consulta.eq("padrao", padrao).eq("ativo", True)
                  .limit(1).execute().data or [])
        if not linhas:
            linhas = (consulta.eq("padrao", padrao).order("versao", desc=True)
                      .limit(1).execute().data or [])
    if not linhas:
        return {}, None

    linha = linhas[0]
    modelo = _desserializar(linha)
    registro = {k: v for k, v in linha.items() if k != "modelo_b64"}
    return registro, modelo


def _desserializar(linha: dict):
    caminho = _caminho(linha["padrao"], linha["versao"])
    if os.path.exists(caminho):
        return joblib.load(caminho)
    b64 = linha.get("modelo_b64")
    if not b64:
        return None
    dados = base64.b64decode(b64)
    os.makedirs(PASTA, exist_ok=True)
    with open(caminho, "wb") as arquivo:
        arquivo.write(dados)
    return joblib.load(io.BytesIO(dados))


def carregar_ativo(padrao: str):
    """O modelo marcado como ativo, ou None. Tenta o disco e, se o arquivo
    não estiver lá (deploy novo no Render), reescreve do base64 do banco."""
    resp = (supabase.table(TABELA).select("versao,arquivo_pkl,modelo_b64")
            .eq("padrao", padrao).eq("ativo", True).limit(1).execute())
    linhas = resp.data or []
    if not linhas:
        return None
    linha = linhas[0]
    caminho = _caminho(padrao, linha["versao"])
    if os.path.exists(caminho):
        return joblib.load(caminho)
    b64 = linha.get("modelo_b64")
    if not b64:
        return None
    dados = base64.b64decode(b64)
    os.makedirs(PASTA, exist_ok=True)
    with open(caminho, "wb") as arquivo:
        arquivo.write(dados)
    return joblib.load(io.BytesIO(dados))
