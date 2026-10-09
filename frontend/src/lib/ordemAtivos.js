// Ordem em que os ativos são percorridos na marcação de padrões, e o
// número de cada um.
//
// A ordem é a da rotina de quem marca: primeiro as ações brasileiras
// (o foco do TradeZen), depois cripto, depois o resto. O número é
// contínuo pela lista inteira (1, 2, 3...), não por mercado — é o que
// serve pra lembrar em qual ativo a marcação parou.
export const ORDEM_DE_MARCACAO = ["B3", "CRIPTO", "NYSE", "NASDAQ", "INDICE", "FOREX", "COMMODITY"];

function pesoDoMercado(mercado) {
  const i = ORDEM_DE_MARCACAO.indexOf(mercado);
  return i === -1 ? ORDEM_DE_MARCACAO.length : i;   // mercado novo vai pro fim
}

/**
 * Mesma lista, na ordem de marcação e com `numero` em cada ativo.
 * Dentro do mercado mantém a ordem do catálogo (backend/ativos.py).
 */
export function numerarAtivos(ativos = []) {
  return [...ativos]
    .map((a, i) => ({ a, i }))   // índice original: desempata sem embaralhar
    .sort((x, y) => pesoDoMercado(x.a.mercado) - pesoDoMercado(y.a.mercado) || x.i - y.i)
    .map(({ a }, n) => ({ ...a, numero: n + 1 }));
}

/** Os mercados que existem na lista, na ordem de marcação. */
export function mercadosEmOrdem(ativos = []) {
  const existentes = new Set(ativos.map((a) => a.mercado));
  return [
    ...ORDEM_DE_MARCACAO.filter((m) => existentes.has(m)),
    ...[...existentes].filter((m) => !ORDEM_DE_MARCACAO.includes(m)).sort(),
  ];
}
