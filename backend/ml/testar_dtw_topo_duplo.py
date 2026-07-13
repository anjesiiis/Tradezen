"""
Script de teste: carrega os templates de topo duplo do Supabase e calcula
a distância DTW entre todos eles, pra ver se formas parecidas realmente
ficam com distância baixa entre si.

Rodar: python3 ml/testar_dtw_topo_duplo.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import supabase
from ml.dtw import dtw_distancia_normalizada


def extrair_forma(template):
    """Extrai a série de fechamento entre topo1 e topo2 (o span central do padrão)."""
    candles = template["candles"]
    pontos = template["pontos"]
    i1 = pontos["topo1"]["i"]
    i2 = pontos["topo2"]["i"]
    ini, fim = min(i1, i2), max(i1, i2)
    return [c["fechamento"] for c in candles[ini:fim + 1]]


def main():
    resp = supabase.table("templates_topo_duplo").select("*").order("id").execute()
    templates = [t for t in resp.data if (t.get("resultado") or "").lower().find("falhou") == -1]

    print(f"Templates carregados (excluindo marcados como falha): {len(templates)}\n")

    formas = {}
    for t in templates:
        formas[t["id"]] = extrair_forma(t)

    ids = list(formas.keys())

    print("=== Distância DTW de cada template pro seu vizinho mais parecido ===\n")
    for id_a in ids:
        melhor_id, melhor_dist = None, float("inf")
        for id_b in ids:
            if id_a == id_b:
                continue
            d = dtw_distancia_normalizada(formas[id_a], formas[id_b])
            if d < melhor_dist:
                melhor_dist, melhor_id = d, id_b
        ticker_a = next(t["ticker"] for t in templates if t["id"] == id_a)
        ticker_b = next(t["ticker"] for t in templates if t["id"] == melhor_id)
        print(f"#{id_a:<3} ({ticker_a:<10}) -> mais parecido: #{melhor_id} ({ticker_b:<10})  dist={melhor_dist:.3f}")

    print("\n=== Teste de controle: forma ALEATÓRIA (não deveria parecer com nada) ===\n")
    import random
    random.seed(42)
    aleatoria = [50 + random.uniform(-5, 5) for _ in range(20)]
    for id_a in ids:
        d = dtw_distancia_normalizada(aleatoria, formas[id_a])
        ticker_a = next(t["ticker"] for t in templates if t["id"] == id_a)
        print(f"aleatória vs #{id_a} ({ticker_a:<10}): dist={d:.3f}")


if __name__ == "__main__":
    main()
