// O padrão salvo cabe no período que está carregado no gráfico?
//
// Fica num módulo só seu (e não em lampadas.js) porque os gráficos de
// marcação usam isso e não têm por que carregar a API do admin junto.
// Tolerância pra casar a data do padrão com um candle: três vezes o
// espaçamento médio da série, que cobre feriado e fim de semana sem
// deixar passar um padrão de outro mês.
function tolerancia(candles) {
  if (candles.length < 2) return 7 * 24 * 3600;
  const espaco = (candles[candles.length - 1].timestamp - candles[0].timestamp) / (candles.length - 1);
  return Math.max(espaco * 3, 24 * 3600) / 1000;
}

/**
 * Índice do candle da data do padrão, ou null se essa data não está no
 * período carregado.
 *
 * O `null` é o ponto todo: sem ele, o "candle mais próximo" de um padrão
 * de 2021 num gráfico de 3 meses é o PRIMEIRO candio da tela. Era isso
 * que empilhava todos os emojis antigos na borda esquerda do gráfico, um
 * em cima do outro — eles não estavam na data errada, estavam fora do
 * período e mesmo assim sendo desenhados.
 */
export function candleDaData(candles, time) {
  if (!candles?.length || !Number.isFinite(time)) return null;
  let melhor = 0;
  for (let i = 1; i < candles.length; i++) {
    if (Math.abs(candles[i].timestamp / 1000 - time) < Math.abs(candles[melhor].timestamp / 1000 - time)) melhor = i;
  }
  const distancia = Math.abs(candles[melhor].timestamp / 1000 - time);
  return distancia <= tolerancia(candles) ? melhor : null;
}

/** O padrão cai dentro do período que está carregado no gráfico? */
export function dentroDoPeriodo(candles, time) {
  return candleDaData(candles, time) !== null;
}
