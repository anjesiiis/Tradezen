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

// Um template já salvo: alimenta os cards da lista e os marcadores cinzas
export const TEMPLATE_FAKE = {
  id: 1,
  ticker: 'PETR4.SA',
  timeframe: '1d',
  resultado: 'sucesso',
  observacao: 'rompimento forte, volume alto',
  criado_em: new Date(Date.UTC(2026, 6, 20)).toISOString(),
  data_p1: new Date(Date.UTC(2026, 6, 1)).toISOString(),
  pontos: {},
  candles: CANDLES_FAKE,
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Dois usuários, um de cada plano — é o que a tela de planos precisa
// distinguir.
export const USUARIOS_FAKE = [
  { id: 'u-1', email: 'premium@teste.com', nome: 'Quem Assinou', plano: 'premium', criado_em: '2026-09-10T12:00:00Z', sem_perfil: false },
  { id: 'u-2', email: 'free@teste.com', nome: 'Quem Nao Assinou', plano: 'free', criado_em: '2026-09-01T12:00:00Z', sem_perfil: false },
];

// Catálogo mínimo do seletor de ativo: um de cada mercado é suficiente
// pra ele agrupar e numerar como faz com os 282 de verdade.
export const ATIVOS_FAKE = [
  { ticker: 'PETR4.SA', simbolo: 'PETR4', nome: 'Petrobras', mercado: 'B3' },
  { ticker: 'VALE3.SA', simbolo: 'VALE3', nome: 'Vale ON', mercado: 'B3' },
  { ticker: 'ITUB4.SA', simbolo: 'ITUB4', nome: 'Itaú Unibanco PN', mercado: 'B3' },
  { ticker: 'AAPL', simbolo: 'AAPL', nome: 'Apple Inc.', mercado: 'NASDAQ' },
  { ticker: 'JPM', simbolo: 'JPM', nome: 'JPMorgan Chase', mercado: 'NYSE' },
  { ticker: 'BTC-USD', simbolo: 'BTC', nome: 'Bitcoin', mercado: 'CRIPTO' },
  { ticker: 'ETH-USD', simbolo: 'ETH', nome: 'Ethereum', mercado: 'CRIPTO' },
  { ticker: 'USDBRL=X', simbolo: 'USD/BRL', nome: 'USD/BRL', mercado: 'FOREX' },
  { ticker: 'EURBRL=X', simbolo: 'EUR/BRL', nome: 'EUR/BRL', mercado: 'FOREX' },
  { ticker: 'GC=F', simbolo: 'OURO', nome: 'Ouro (futuro)', mercado: 'COMMODITY' },
  { ticker: 'SI=F', simbolo: 'PRATA', nome: 'Prata (futuro)', mercado: 'COMMODITY' },
  { ticker: '^BVSP', simbolo: 'IBOV', nome: 'Ibovespa', mercado: 'INDICE' },
];

export async function respostaFake(url) {
  const u = String(url);
  if (/\/mercado(\?|$)/.test(u)) return json({ dados: MERCADO_FAKE });
  if (u.includes('/mercado/visao-geral')) return json({});
  if (u.includes('/ativos/batch')) return json({ resultados: [] });
  if (u.includes('/ativos/buscar')) return json({ resultados: [] });
  // catálogo do seletor de ativo das telas de marcação (AtivoPicker)
  if (/\/ativos(\?|$)/.test(u)) return json({ ativos: ATIVOS_FAKE });
  if (u.includes('/padroes-marcados/')) return json({ padroes: [], niveis: [], plano: 'free' });
  if (/\/eu(\?|$)/.test(u)) return json({ plano: 'free', admin: false, acesso: false });
  if (u.includes('/admin/usuarios')) return json({ usuarios: USUARIOS_FAKE, usuario: USUARIOS_FAKE[0] });
  // rotas do admin (templates de padrões)
  if (u.includes('/admin/templates')) {
    return json({ templates: [TEMPLATE_FAKE], template: TEMPLATE_FAKE });
  }
  if (u.includes('/ativo/')) return json({ candles: CANDLES_FAKE, niveis: [] });
  return json({});
}
