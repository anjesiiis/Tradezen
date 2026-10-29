import { candleUtilizavel, toLWCandles } from '../lib/grafico/indicadores.js';

/**
 * Um candle com mínima zero destrói a escala do gráfico INTEIRO.
 *
 * O eixo passa a ir de zero ao topo histórico, os candles de verdade
 * viram um risco fino lá em cima, e o volume — que divide o mesmo eixo —
 * vai parar fora do lugar. Não é hipótese: foi o que o Yahoo devolveu na
 * vela semanal em formação de TODA ação da B3, medido em produção.
 *
 * A primeira barreira é o backend (_sanear_candles). Esta é a segunda, e
 * vale a pena ter as duas: a cripto não passa pelo mesmo caminho (vem da
 * Binance), o backend demora a subir, e o custo aqui é uma comparação por
 * candle.
 */

const candle = (ts, o, h, l, c) => ({
  timestamp: ts, abertura: o, maxima: h, minima: l, fechamento: c,
});

describe('Candle que o gráfico pode receber', () => {
  it('aceita um candle normal', () => {
    expect(candleUtilizavel({ open: 10, high: 12, low: 9, close: 11 })).toBe(true);
  });

  // A vela semanal do IBOV, como veio da API em 28/10/2026
  it('recusa a mínima zerada que quebrou a escala', () => {
    expect(candleUtilizavel({ open: 205070, high: 205089, low: 0, close: 171006 })).toBe(false);
  });

  it.each([
    ['mínima negativa',      { open: 10, high: 12, low: -5, close: 11 }],
    ['máxima zerada',        { open: 10, high: 0, low: 9, close: 11 }],
    ['abertura nula',        { open: null, high: 12, low: 9, close: 11 }],
    ['fechamento indefinido', { open: 10, high: 12, low: 9, close: undefined }],
    ['NaN no meio',          { open: 10, high: NaN, low: 9, close: 11 }],
    ['infinito',             { open: 10, high: Infinity, low: 9, close: 11 }],
    ['texto no lugar do preço', { open: '10', high: '12', low: '9', close: '11' }],
  ])('recusa %s', (_nome, c) => {
    expect(candleUtilizavel(c)).toBe(false);
  });

  // Candle que se contradiz: desenhar isso é pior que não desenhar
  it('recusa máxima abaixo da mínima', () => {
    expect(candleUtilizavel({ open: 10, high: 8, low: 9, close: 10 })).toBe(false);
  });

  it('recusa corpo fora do pavio', () => {
    expect(candleUtilizavel({ open: 10, high: 10.5, low: 9, close: 14 })).toBe(false);
    expect(candleUtilizavel({ open: 10, high: 12, low: 9.5, close: 8 })).toBe(false);
  });

  it('aceita candle sem pavio nenhum, que é candle de verdade', () => {
    expect(candleUtilizavel({ open: 10, high: 11, low: 10, close: 11 })).toBe(true);
  });

  it('recusa o que nem objeto é', () => {
    expect(candleUtilizavel(null)).toBe(false);
    expect(candleUtilizavel(undefined)).toBe(false);
  });
});

describe('Conversão pro Lightweight Charts', () => {
  it('deixa de fora o candle quebrado e mantém os outros', () => {
    const lw = toLWCandles([
      candle(1000, 10, 12, 9, 11),
      candle(2000, 11, 13, 10, 12),
      candle(3000, 205070, 205089, 0, 171006),   // o da semana em formação
    ]);
    expect(lw).toHaveLength(2);
    expect(lw.map((c) => c.low)).toEqual([9, 10]);
  });

  // O que importa de verdade: a escala do gráfico sai da menor mínima
  it('a menor mínima deixa de ser zero, que é o que salva a escala', () => {
    const lw = toLWCandles([
      candle(1000, 168000, 172000, 167500, 171000),
      candle(2000, 205070, 205089, 0, 171006),
    ]);
    expect(Math.min(...lw.map((c) => c.low))).toBe(167500);
  });

  it('continua ordenando por tempo', () => {
    const lw = toLWCandles([candle(3000, 10, 12, 9, 11), candle(1000, 10, 12, 9, 11)]);
    expect(lw.map((c) => c.time)).toEqual([1, 3]);
  });

  it('lista inteira de lixo devolve lista vazia, não explode', () => {
    expect(toLWCandles([candle(1000, 0, 0, 0, 0)])).toEqual([]);
  });
});
