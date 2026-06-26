"""
TRADEUP — BACKTEST DE PADRÕES
================================

Mede a CONFIABILIDADE REAL do detector de OCO num ativo:
de todos os padrões detectados no histórico, quantos REALMENTE
funcionaram (preço atingiu o alvo após rompimento da neckline)?

Os padrões "pendente" são excluídos da estatística — ainda não
têm dados suficientes pra dar veredicto.

Uso via terminal:
    python backtest.py PETR4.SA
    python backtest.py PETR4.SA VALE3.SA ITUB4.SA BTC-USD
    python backtest.py PETR4.SA --tf 60m --periodo 2y
    python backtest.py BTC-USD --tf 1d --periodo 5y --janela 8
"""

import sys
import argparse
from typing import List, Dict

import yfinance as yf

from patterns.classicos import detectar_padroes_classicos


# ──────────────────────────────────────────────────────────────
# 1) BAIXAR DADOS
# ──────────────────────────────────────────────────────────────
def baixar_candles(ticker: str, periodo: str = "2y", intervalo: str = "1d") -> List[Dict]:
    """
    Baixa candles do Yahoo Finance e converte pro formato interno do TradeUp.
    """
    df = yf.download(ticker, period=periodo, interval=intervalo,
                     progress=False, auto_adjust=False)
    if df is None or df.empty:
        return []

    candles = []
    for ts, row in df.iterrows():
        def val(col):
            v = row[col]
            try:
                return float(v.iloc[0]) if hasattr(v, "iloc") else float(v)
            except (TypeError, ValueError):
                return None

        o, h, l, c = val("Open"), val("High"), val("Low"), val("Close")
        v = val("Volume") or 0
        if None in (o, h, l, c):
            continue

        candles.append({
            "timestamp": int(ts.timestamp() * 1000),
            "abertura": o, "maxima": h, "minima": l,
            "fechamento": c, "volume": v,
        })

    return candles


# ──────────────────────────────────────────────────────────────
# 2) RODAR BACKTEST NUM ATIVO
# ──────────────────────────────────────────────────────────────
def backtest_ativo(ticker: str, periodo: str = "2y", intervalo: str = "1d",
                   janela: int = 5) -> dict | None:
    """
    Roda o detector no histórico e agrega os resultados por faixa de score.
    Usa o resultado já calculado pelo detector (sucesso/falhou/pendente).

    Retorna dict com as estatísticas, ou None se dados insuficientes.
    """
    candles = baixar_candles(ticker, periodo, intervalo)
    if len(candles) < 50:
        print(f"  ⚠️  {ticker}: dados insuficientes ({len(candles)} candles)")
        return None

    padroes = detectar_padroes_classicos(candles, janela=janela)

    # ── Contagem por resultado e faixa de score ───────────────
    def faixa(score: int) -> str:
        if score >= 75: return "alta"
        if score >= 60: return "media"
        return "baixa"

    contagem = {
        "alta":  {"sucessos": 0, "falhos": 0, "pendentes": 0},
        "media": {"sucessos": 0, "falhos": 0, "pendentes": 0},
        "baixa": {"sucessos": 0, "falhos": 0, "pendentes": 0},
    }

    for p in padroes:
        resultado = p.get("resultado", "pendente")
        f = faixa(p.get("confiabilidade", 0))
        if resultado == "sucesso":
            contagem[f]["sucessos"] += 1
        elif resultado == "falhou":
            contagem[f]["falhos"] += 1
        else:
            contagem[f]["pendentes"] += 1

    # ── Totais ────────────────────────────────────────────────
    total_suc  = sum(c["sucessos"]  for c in contagem.values())
    total_fal  = sum(c["falhos"]    for c in contagem.values())
    total_pend = sum(c["pendentes"] for c in contagem.values())
    total_verd = total_suc + total_fal

    taxa_geral = round(total_suc / total_verd * 100, 1) if total_verd else 0.0

    # ── Print ─────────────────────────────────────────────────
    print(f"\n  ── {ticker} ({len(candles)} candles · {intervalo} · {periodo}) ──")
    print(f"     OCOs detectados:    {len(padroes)}")
    print(f"     Com veredicto:      {total_verd}  (pendentes: {total_pend})")
    print(f"     Sucessos:           {total_suc}")
    print(f"     CONFIABILIDADE:     {taxa_geral:.1f}%")
    print(f"     Por faixa de score:")

    for nome, c in contagem.items():
        verd = c["sucessos"] + c["falhos"]
        if verd > 0:
            t = round(c["sucessos"] / verd * 100)
            status = "✅ bom" if t >= 70 else "⚠️  fraco"
            print(f"       {nome:6s} (≥{'75' if nome=='alta' else '60' if nome=='media' else '0 '}): "
                  f"{c['sucessos']}/{verd} = {t}%  {status}")
        else:
            print(f"       {nome:6s}: sem dados com veredicto")

    return {
        "ticker": ticker, "periodo": periodo, "intervalo": intervalo,
        "total": len(padroes), "com_veredicto": total_verd,
        "sucessos": total_suc, "falhos": total_fal, "pendentes": total_pend,
        "taxa_geral": taxa_geral, "por_faixa": contagem,
    }


# ──────────────────────────────────────────────────────────────
# 3) MAIN (CLI)
# ──────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Backtest de OCO — TradeUp")
    parser.add_argument("tickers", nargs="+", help="ex: PETR4.SA VALE3.SA BTC-USD")
    parser.add_argument("--tf",      default="1d",  help="timeframe: 1d, 60m, 1wk (default: 1d)")
    parser.add_argument("--periodo", default="2y",  help="ex: 2y, 5y, 1y (default: 2y)")
    parser.add_argument("--janela",  type=int, default=5, help="sensibilidade dos pivôs (default: 5)")
    args = parser.parse_args()

    print("=" * 60)
    print(f"  BACKTEST OCO — TradeUp")
    print(f"  tf={args.tf}  ·  período={args.periodo}  ·  janela={args.janela}")
    print("=" * 60)

    resultados = []
    for ticker in args.tickers:
        r = backtest_ativo(ticker, args.periodo, args.tf, args.janela)
        if r:
            resultados.append(r)

    # ── Consolidado (só mostra se mais de 1 ativo) ────────────
    if len(resultados) > 1:
        tot_verd = sum(r["com_veredicto"] for r in resultados)
        tot_suc  = sum(r["sucessos"]      for r in resultados)
        tot_fal  = sum(r["falhos"]        for r in resultados)
        taxa_geral = round(tot_suc / tot_verd * 100, 1) if tot_verd else 0.0

        faixa_geral = {
            "alta":  {"sucessos": 0, "falhos": 0},
            "media": {"sucessos": 0, "falhos": 0},
            "baixa": {"sucessos": 0, "falhos": 0},
        }
        for r in resultados:
            for nome in faixa_geral:
                faixa_geral[nome]["sucessos"] += r["por_faixa"][nome]["sucessos"]
                faixa_geral[nome]["falhos"]   += r["por_faixa"][nome]["falhos"]

        print("\n" + "=" * 60)
        print("  CONSOLIDADO")
        print("=" * 60)
        print(f"  Ativos analisados:    {len(resultados)}")
        print(f"  Total com veredicto:  {tot_verd}")
        print(f"  Sucessos:             {tot_suc}")
        print(f"  CONFIABILIDADE GERAL: {taxa_geral:.1f}%")
        print(f"\n  Por faixa de score:")
        for nome, c in faixa_geral.items():
            verd = c["sucessos"] + c["falhos"]
            if verd > 0:
                t = round(c["sucessos"] / verd * 100)
                status = "✅ bom" if t >= 70 else "⚠️  fraco"
                print(f"    {nome:6s}: {c['sucessos']}/{verd} = {t}%  {status}")
        print("=" * 60)


if __name__ == "__main__":
    main()