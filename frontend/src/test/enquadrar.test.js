import { CANDLES_MAX, CANDLES_MIN, faixaDeLeitura } from '../admin/enquadrar.js';

const largura = (f) => f.to - f.from;
const centro = (f) => (f.from + f.to) / 2;

describe('Zoom de leitura de um padrão salvo', () => {
  it('padrão curto não deixa o gráfico colado: abre no mínimo de candles', () => {
    // 6 candles marcados num zoom apertado
    const faixa = faixaDeLeitura([40, 41, 42, 43, 44, 45], 400);

    expect(largura(faixa)).toBe(CANDLES_MIN);
    expect(centro(faixa)).toBeCloseTo(42.5);
  });

  it('padrão longo não faz o candle virar risco: para no máximo', () => {
    const faixa = faixaDeLeitura([10, 300], 1000);

    expect(largura(faixa)).toBe(CANDLES_MAX);
    expect(centro(faixa)).toBeCloseTo(155);
  });

  it('padrão de tamanho médio ocupa cerca de 40% da largura', () => {
    const inicio = 100, fim = 140;      // 41 candles
    const faixa = faixaDeLeitura([inicio, fim], 500);

    const proporcao = (fim - inicio + 1) / largura(faixa);
    expect(proporcao).toBeGreaterThan(0.35);
    expect(proporcao).toBeLessThan(0.45);
  });

  it('nunca pede mais candles do que o gráfico tem', () => {
    const faixa = faixaDeLeitura([5, 8], 20);

    expect(largura(faixa)).toBe(20);
  });

  it('sem pontos, não enquadra nada', () => {
    expect(faixaDeLeitura([], 100)).toBeNull();
    expect(faixaDeLeitura([1, 2], 0)).toBeNull();
    expect(faixaDeLeitura(undefined, 100)).toBeNull();
  });
});
