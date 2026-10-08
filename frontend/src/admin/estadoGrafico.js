// O gráfico não se perde ao trocar de padrão.
//
// Cada padrão tem a sua tela (OCO, topo duplo, níveis, e a compartilhada
// dos padrões de continuação). Antes, sair do OCO pro topo duplo
// recomeçava do zero: voltava pro PETR4 padrão, sem candles, e a posição
// em que você estava olhando se perdia — se o padrão que você viu estava
// em 2023, era rolar tudo de novo.
//
// Aqui fica o que é do GRÁFICO e não do padrão: ativo, período, intervalo,
// os candles já baixados e a faixa visível. A marcação (os pontos) não
// entra: ela é de cada padrão, e carregar pontos de OCO numa tela de topo
// duplo não faria sentido.
//
// É um módulo, não um contexto do React: a navegação do admin é
// client-side, então o módulo continua carregado entre uma tela e outra,
// e nenhuma tela precisa saber da existência das outras.

let estado = {
  ticker: "PETR4.SA",
  periodo: "1y",
  intervalo: "1d",
  candles: null,
  faixa: null,       // { from, to } em índice de candle
};

export function estadoDoGrafico() {
  return estado;
}

export function guardarGrafico(parcial) {
  estado = { ...estado, ...parcial };
}

/**
 * Os candles guardados servem pra esta tela? Só se forem do mesmo ativo,
 * período e intervalo — senão a tela busca de novo.
 */
export function candlesGuardados(ticker, periodo, intervalo) {
  if (!estado.candles) return null;
  const mesmo =
    estado.ticker?.toUpperCase() === (ticker || "").toUpperCase() &&
    estado.periodo === periodo &&
    estado.intervalo === intervalo;
  return mesmo ? estado.candles : null;
}

/** Trocar de ativo/período invalida os candles e a posição guardados. */
export function esquecerCandles() {
  estado = { ...estado, candles: null, faixa: null };
}
