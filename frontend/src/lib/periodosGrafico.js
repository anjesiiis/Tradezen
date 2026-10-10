// Atalhos de período do gráfico de marcação.
//
// Os períodos longos existem porque marcar template é caçar padrão no
// histórico: 3 meses de diário são ~65 candles, pouco pra achar o que
// marcar. 2A e 3A preenchem o salto que havia entre 1 e 5 anos.
// Período com que toda tela de marcação abre. 1A porque os padrões já
// marcados ficam espalhados pelo histórico: com 3 meses na tela, quase
// todos caíam fora da faixa carregada e não apareciam.
export const PERIODO_PADRAO = "1y";

export const PERIODOS_RAPIDOS = [
  { rotulo: "1M", valor: "1mo" },
  { rotulo: "3M", valor: "3mo" },
  { rotulo: "6M", valor: "6mo" },
  { rotulo: "1A", valor: "1y" },
  { rotulo: "2A", valor: "2y" },
  { rotulo: "3A", valor: "3y" },
  { rotulo: "5A", valor: "5y" },
];
