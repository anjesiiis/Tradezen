// Respostas falsas do backend, no mesmo formato da API real (main.py).
// Um ativo por seção da lista mobile (Índices, Ações, Cripto, Moedas,
// Commodities), pra dar pra conferir o agrupamento.

export const MERCADO_FAKE = [
  { ticker: '^BVSP', simbolo: 'IBOV', nome: 'Ibovespa', mercado: 'INDICE', preco: 130250.5, variacao_pct: 0.84, alta: true },
  { ticker: 'PETR4.SA', simbolo: 'PETR4', nome: 'Petrobras', mercado: 'B3', preco: 38.72, variacao_pct: 1.12, alta: true },
  { ticker: 'VALE3.SA', simbolo: 'VALE3', nome: 'Vale', mercado: 'B3', preco: 61.4, variacao_pct: -0.65, alta: false },
  { ticker: 'BTC-USD', simbolo: 'BTC', nome: 'Bitcoin', mercado: 'CRIPTO', preco: 76242.23, variacao_pct: -2.46, alta: false },
  { ticker: 'USDBRL=X', simbolo: 'USD/BRL', nome: 'Dólar', mercado: 'FOREX', preco: 5.43, variacao_pct: 0.2, alta: true },
  { ticker: 'GC=F', simbolo: 'OURO', nome: 'Ouro', mercado: 'COMMODITY', preco: 4327.9, variacao_pct: -0.55, alta: false },
];

// 40 candles diários em sequência (timestamp em ms, como o backend manda)
const DIA = 24 * 60 * 60 * 1000;
const INICIO = Date.UTC(2026, 6, 1);
export const CANDLES_FAKE = Array.from({ length: 40 }, (_, i) => {
  const base = 38 + Math.sin(i / 4) * 2;
  return {
    timestamp: INICIO + i * DIA,
    abertura: base,
    maxima: base + 0.8,
    minima: base - 0.8,
    fechamento: base + 0.3,
    volume: 1_000_000 + i * 1000,
  };
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function respostaFake(url) {
  const u = String(url);
  if (/\/mercado(\?|$)/.test(u)) return json({ dados: MERCADO_FAKE });
  if (u.includes('/mercado/visao-geral')) return json({});
  if (u.includes('/ativos/batch')) return json({ resultados: [] });
  if (u.includes('/ativos/buscar')) return json({ resultados: [] });
  if (u.includes('/padroes-marcados/')) return json({ padroes: [] });
  // rotas do admin (templates de padrões)
  if (u.includes('/admin/templates')) return json({ templates: [], template: {} });
  if (u.includes('/ativo/')) return json({ candles: CANDLES_FAKE, niveis: [] });
  return json({});
}
