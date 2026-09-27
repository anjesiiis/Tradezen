// Quanto do gráfico mostrar quando um padrão salvo é aberto pela 💡.
//
// O zoom em que o padrão foi MARCADO não serve para LER: marcar exige
// chegar perto o suficiente para acertar o candle exato, e nesse zoom não
// se enxerga o padrão como forma. Aqui o padrão é enquadrado a uma
// distância de leitura: ocupando mais ou menos 40% da largura, com um
// mínimo de candles em volta (contexto) e um máximo (senão o candle vira
// um risco fino).

export const CANDLES_MIN = 55;
export const CANDLES_MAX = 170;
export const FOLGA_DO_PADRAO = 2.4;

/**
 * @param {number[]} indices — índices dos pontos do padrão no gráfico atual
 * @param {number} totalCandles
 * @returns {{from:number,to:number}|null} faixa em índice de candle
 */
export function faixaDeLeitura(indices, totalCandles) {
  if (!indices?.length || !totalCandles) return null;

  const primeiro = Math.min(...indices);
  const ultimo = Math.max(...indices);
  const centro = (primeiro + ultimo) / 2;
  const largura = Math.min(
    totalCandles,
    Math.max(CANDLES_MIN, Math.min(CANDLES_MAX, (ultimo - primeiro + 1) * FOLGA_DO_PADRAO))
  );

  return { from: centro - largura / 2, to: centro + largura / 2 };
}
