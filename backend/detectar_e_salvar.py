"""
TRADEZEN — DETECÇÃO AUTOMÁTICA DOS 8 PADRÕES NOVOS
====================================================

Roda os detectores de reversão e consolidação no histórico dos ativos e
guarda o que achar nas tabelas de template correspondentes.

    python detectar_e_salvar.py PETR4.SA
    python detectar_e_salvar.py PETR4.SA VALE3.SA BTC-USD
    python detectar_e_salvar.py --mercado B3
    python detectar_e_salvar.py --todos --periodo 5y
    python detectar_e_salvar.py PETR4.SA --seco      (não grava nada)

ORIGEM: tudo que entra por aqui vai com origem='detector'. A marcação
manual vai com 'manual' (o default da coluna). Isso é importante pro ML:
treinar o modelo com o que o próprio detector achou é ensinar o que ele
já sabe — e os dois moram na mesma tabela de propósito, pra o gráfico
desenhar os dois do mesmo jeito.

NADA INTERROMPE A EXECUÇÃO: erro de rede, tabela que não existe, ativo
sem dados — tudo vira linha no log (detectar_e_salvar.log) e o script
segue pro próximo. No fim ele imprime o resumo.
"""

import argparse
import logging
import sys
from collections import defaultdict
from typing import Any, Dict, List, Optional

LOG = "detectar_e_salvar.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler(LOG, encoding="utf-8"), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("detectar")

# Tipo do padrão → tabela. São as tabelas de sql/014; se alguma não
# existir ainda, aquele padrão é pulado com aviso (e os outros seguem).
TABELA = {
    "fundo_duplo": "templates_fundo_duplo",
    "oco_invertido": "templates_oco_invertido",
    "topo_triplo": "templates_topo_triplo",
    "fundo_triplo": "templates_fundo_triplo",
    "triangulo_ascendente": "templates_triangulo_ascendente",
    "triangulo_descendente": "templates_triangulo_descendente",
    "triangulo_simetrico": "templates_triangulo_simetrico",
    "retangulo": "templates_retangulo",
}


class Resumo:
    """Contagem do que aconteceu, por padrão."""

    def __init__(self):
        self.detectados = defaultdict(int)
        self.salvos = defaultdict(int)
        self.repetidos = defaultdict(int)
        self.recusados = defaultdict(int)
        self.erros = defaultdict(int)
        self.tabelas_ausentes = set()
        self.ativos_com_erro = []

    def imprimir(self, ativos: int):
        print("\n" + "═" * 66)
        print(f"RESUMO — {ativos} ativo(s) analisado(s)")
        print("═" * 66)
        print(f"{'padrão':<24}{'detectados':>11}{'salvos':>8}{'repetidos':>11}{'recusados':>11}{'erros':>7}")
        print("─" * 66)
        tipos = sorted(set(self.detectados) | set(self.salvos) | set(self.erros))
        for t in tipos:
            print(f"{t:<24}{self.detectados[t]:>11}{self.salvos[t]:>8}"
                  f"{self.repetidos[t]:>11}{self.recusados[t]:>11}{self.erros[t]:>7}")
        print("─" * 66)
        print(f"{'TOTAL':<24}{sum(self.detectados.values()):>11}{sum(self.salvos.values()):>8}"
              f"{sum(self.repetidos.values()):>11}{sum(self.recusados.values()):>11}"
              f"{sum(self.erros.values()):>7}")
        if self.tabelas_ausentes:
            print(f"\nTabelas que não existem no Supabase (padrões pulados):")
            for t in sorted(self.tabelas_ausentes):
                print(f"  • {t}")
            print("  → rode backend/sql/014_padroes_reversao_e_consolidacao.sql no SQL Editor")
        if self.ativos_com_erro:
            print(f"\nAtivos com erro: {', '.join(self.ativos_com_erro)}")
        print(f"\nLog completo em {LOG}")


def _payload(ticker: str, intervalo: str, padrao: Dict, candles: List[Dict]) -> Optional[Dict[str, Any]]:
    """Monta a linha do banco, no mesmo formato que a tela de marcação grava."""
    from patterns.comum import recorte

    corte = recorte(candles, padrao["pontos"])
    candle_p1 = candles[min(p["i"] for p in padrao["pontos"].values())]
    return {
        "ticker": ticker.upper(),
        "timeframe": intervalo,
        "candles": corte["candles"],
        "candles_contexto": candles,
        "pontos": corte["pontos"],
        "data_p1": _iso(candle_p1["timestamp"]),
        "resultado": padrao["resultado"],
        "observacao": (
            f"Detectado automaticamente · confiabilidade {padrao['confiabilidade']}% · "
            f"{padrao['nome']}"
        ),
        "origem": "detector",
    }


def _iso(timestamp_ms: int) -> str:
    from datetime import datetime, timezone
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).isoformat()


def _valido_para_a_tela(padrao: Dict) -> List[str]:
    """As mesmas regras que o admin aplica — o detector não pode gravar o
    que a tela recusaria, senão o template fica impossível de editar."""
    from padroes_extras import PADROES_EXTRAS, Ponto

    espec = PADROES_EXTRAS[padrao["tipo"]]
    faltando = [k for k in espec["pontos"] if k not in padrao["pontos"]]
    if faltando:
        return [f"faltam os pontos {faltando}"]
    return espec["validar"]({k: Ponto(**padrao["pontos"][k]) for k in espec["pontos"]})


def _datas_existentes(supabase, tabela: str, ticker: str) -> set:
    """data_p1 do que já está salvo — é como o script evita gravar duas
    vezes o mesmo padrão quando roda de novo."""
    resp = supabase.table(tabela).select("data_p1").eq("ticker", ticker.upper()).execute()
    return {(r.get("data_p1") or "")[:10] for r in resp.data}


def _tabela_nao_existe(erro: Exception) -> bool:
    texto = str(erro)
    return "Could not find the table" in texto or "does not exist" in texto


def processar(ticker: str, periodo: str, intervalo: str, janela: int,
              resumo: Resumo, seco: bool) -> None:
    from data.fetcher import buscar_candles
    from patterns.consolidacao import detectar_consolidacoes
    from patterns.reversao import detectar_reversoes
    from supabase_client import supabase

    try:
        candles = buscar_candles(ticker, periodo, intervalo)
    except Exception as e:
        log.error(f"[{ticker}] não deu pra baixar candles: {e}")
        resumo.ativos_com_erro.append(ticker)
        return
    if not candles:
        log.warning(f"[{ticker}] sem candles em {periodo}/{intervalo} — pulando")
        resumo.ativos_com_erro.append(ticker)
        return

    try:
        achados = detectar_reversoes(candles, janela) + detectar_consolidacoes(candles, janela)
    except Exception as e:
        log.exception(f"[{ticker}] o detector quebrou: {e}")
        resumo.ativos_com_erro.append(ticker)
        return

    log.info(f"[{ticker}] {len(candles)} candles, {len(achados)} padrões detectados")
    cache_datas: Dict[str, set] = {}

    for padrao in achados:
        tipo = padrao["tipo"]
        resumo.detectados[tipo] += 1
        tabela = TABELA.get(tipo)
        if not tabela or tabela in resumo.tabelas_ausentes:
            continue

        problemas = _valido_para_a_tela(padrao)
        if problemas:
            resumo.recusados[tipo] += 1
            log.warning(f"[{ticker}] {tipo} recusado pelas regras da tela: {problemas}")
            continue

        linha = _payload(ticker, intervalo, padrao, candles)
        if seco:
            resumo.salvos[tipo] += 1
            continue

        try:
            if tabela not in cache_datas:
                cache_datas[tabela] = _datas_existentes(supabase, tabela, ticker)
            if linha["data_p1"][:10] in cache_datas[tabela]:
                resumo.repetidos[tipo] += 1
                continue

            supabase.table(tabela).insert(linha).execute()
            cache_datas[tabela].add(linha["data_p1"][:10])
            resumo.salvos[tipo] += 1
        except Exception as e:
            if _tabela_nao_existe(e):
                resumo.tabelas_ausentes.add(tabela)
                log.warning(f"[{ticker}] tabela {tabela} não existe — pulando {tipo} daqui pra frente")
                continue
            if "origem" in str(e):
                # banco ainda sem a coluna origem: grava sem ela e avisa
                log.warning(f"[{ticker}] {tabela} sem a coluna 'origem' — gravando sem marcar a origem")
                try:
                    sem_origem = {k: v for k, v in linha.items() if k != "origem"}
                    supabase.table(tabela).insert(sem_origem).execute()
                    resumo.salvos[tipo] += 1
                    continue
                except Exception as e2:
                    e = e2
            resumo.erros[tipo] += 1
            log.error(f"[{ticker}] falhou ao salvar {tipo}: {e}")


def main() -> None:
    p = argparse.ArgumentParser(description="Detecta os 8 padrões novos e salva no Supabase.")
    p.add_argument("tickers", nargs="*", help="ex: PETR4.SA VALE3.SA")
    p.add_argument("--mercado", help="B3, CRIPTO, NYSE, NASDAQ, FOREX, COMMODITY, INDICE")
    p.add_argument("--todos", action="store_true", help="o catálogo inteiro (282 ativos)")
    p.add_argument("--periodo", default="5y")
    p.add_argument("--tf", dest="intervalo", default="1d")
    p.add_argument("--janela", type=int, default=5, help="sensibilidade dos pivôs")
    p.add_argument("--seco", action="store_true", help="detecta e conta, sem gravar nada")
    args = p.parse_args()

    from ativos import ATIVOS, periodo_valido, por_mercado

    if args.todos:
        alvos = [a["ticker"] for a in ATIVOS]
    elif args.mercado:
        alvos = [a["ticker"] for a in por_mercado(args.mercado.upper())]
    else:
        alvos = args.tickers
    if not alvos:
        p.error("informe tickers, --mercado ou --todos")

    # periodo_valido(intervalo, periodo) — nesta ordem; trocar os dois
    # fazia o script pedir "1d" de histórico e receber UM candle.
    periodo = periodo_valido(args.intervalo, args.periodo)
    resumo = Resumo()
    log.info(f"começando: {len(alvos)} ativo(s), {periodo}/{args.intervalo}"
             f"{' (ensaio, não grava)' if args.seco else ''}")

    for n, ticker in enumerate(alvos, 1):
        print(f"[{n}/{len(alvos)}] {ticker}", flush=True)
        try:
            processar(ticker, periodo, args.intervalo, args.janela, resumo, args.seco)
        except Exception as e:
            # rede caiu, Supabase fora do ar, o que for: segue pro próximo
            log.exception(f"[{ticker}] erro inesperado: {e}")
            resumo.ativos_com_erro.append(ticker)

    resumo.imprimir(len(alvos))


if __name__ == "__main__":
    main()
