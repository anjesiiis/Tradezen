import { candleDaData, dentroDoPeriodo } from '../admin/periodoDoPadrao.js';
import { PERIODO_PADRAO, PERIODOS_RAPIDOS } from '../lib/periodosGrafico.js';
import { estadoDoGrafico } from '../admin/estadoGrafico.js';

const DIA = 86400000;
// 1 de março de 2026 em diante, um candle por dia
const INICIO = Date.UTC(2026, 2, 1);
const candles = Array.from({ length: 60 }, (_, i) => ({ timestamp: INICIO + i * DIA }));
const seg = (ms) => Math.floor(ms / 1000);

describe('Padrão dentro do período carregado', () => {
  it('acha o candle da data do padrão', () => {
    expect(candleDaData(candles, seg(INICIO))).toBe(0);
    expect(candleDaData(candles, seg(INICIO + 20 * DIA))).toBe(20);
    expect(candleDaData(candles, seg(INICIO + 59 * DIA))).toBe(59);
  });

  it('padrão antigo demais não vira o candle 0 — é isso que empilhava os emojis na borda', () => {
    const umAnoAntes = seg(INICIO - 365 * DIA);
    expect(candleDaData(candles, umAnoAntes)).toBeNull();
    expect(dentroDoPeriodo(candles, umAnoAntes)).toBe(false);
    // e o posterior ao período também não vira o último candle
    expect(candleDaData(candles, seg(INICIO + 400 * DIA))).toBeNull();
  });

  it('tolera fim de semana e feriado: a data cai perto, não exata', () => {
    // sábado entre dois pregões ainda é o candle vizinho
    expect(candleDaData(candles, seg(INICIO + 10 * DIA + 12 * 3600 * 1000))).toBe(10);
    expect(dentroDoPeriodo(candles, seg(INICIO - 2 * DIA))).toBe(true);
    // uma semana fora já é outro trecho do gráfico
    expect(dentroDoPeriodo(candles, seg(INICIO - 9 * DIA))).toBe(false);
  });

  it('sem candles ou sem data, não arrisca posição nenhuma', () => {
    expect(candleDaData([], seg(INICIO))).toBeNull();
    expect(candleDaData(candles, undefined)).toBeNull();
    expect(candleDaData(candles, NaN)).toBeNull();
    expect(dentroDoPeriodo(null, seg(INICIO))).toBe(false);
  });
});

describe('Período com que a tela de marcação abre', () => {
  it('é 1 ano', () => {
    expect(PERIODO_PADRAO).toBe('1y');
    expect(estadoDoGrafico().periodo).toBe(PERIODO_PADRAO);
  });

  it('1A é um dos atalhos, então abre com o botão marcado', () => {
    expect(PERIODOS_RAPIDOS.find((p) => p.valor === PERIODO_PADRAO).rotulo).toBe('1A');
  });
});
