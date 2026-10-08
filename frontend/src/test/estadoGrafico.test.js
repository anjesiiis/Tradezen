import { candlesGuardados, esquecerCandles, estadoDoGrafico, guardarGrafico } from '../admin/estadoGrafico.js';

const CANDLES = [{ timestamp: 1 }, { timestamp: 2 }];

// O módulo é um estado de verdade, compartilhado entre as telas do admin:
// cada teste deixa ele no padrão de novo.
beforeEach(() => {
  guardarGrafico({ ticker: 'PETR4.SA', periodo: '1y', intervalo: '1d', candles: null, faixa: null });
});

describe('Estado do gráfico entre telas de padrão', () => {
  it('começa no ativo padrão', () => {
    expect(estadoDoGrafico()).toMatchObject({ ticker: 'PETR4.SA', periodo: '1y', intervalo: '1d' });
  });

  it('guarda o que a tela deixou e devolve pra próxima', () => {
    guardarGrafico({ ticker: 'VALE3.SA', periodo: '2y', intervalo: '1wk', candles: CANDLES, faixa: { from: 10, to: 60 } });

    expect(estadoDoGrafico().ticker).toBe('VALE3.SA');
    expect(estadoDoGrafico().faixa).toEqual({ from: 10, to: 60 });
  });

  it('guardar uma coisa não apaga as outras', () => {
    guardarGrafico({ ticker: 'BBAS3.SA', candles: CANDLES });
    guardarGrafico({ faixa: { from: 1, to: 2 } });

    expect(estadoDoGrafico().ticker).toBe('BBAS3.SA');
    expect(estadoDoGrafico().candles).toHaveLength(2);
  });

  it('os candles só servem pro mesmo ativo, período e intervalo', () => {
    guardarGrafico({ ticker: 'VALE3.SA', periodo: '1y', intervalo: '1d', candles: CANDLES });

    expect(candlesGuardados('VALE3.SA', '1y', '1d')).toHaveLength(2);
    expect(candlesGuardados('vale3.sa', '1y', '1d')).toHaveLength(2);   // não liga pra caixa
    expect(candlesGuardados('PETR4.SA', '1y', '1d')).toBeNull();        // outro ativo
    expect(candlesGuardados('VALE3.SA', '5y', '1d')).toBeNull();        // outro período
    expect(candlesGuardados('VALE3.SA', '1y', '60m')).toBeNull();       // outro intervalo
  });

  it('sem candles guardados, não devolve nada', () => {
    expect(candlesGuardados('PETR4.SA', '1y', '1d')).toBeNull();
  });

  it('esquecer limpa candles e posição, mas mantém o ativo escolhido', () => {
    guardarGrafico({ ticker: 'ITUB4.SA', candles: CANDLES, faixa: { from: 3, to: 9 } });

    esquecerCandles();

    expect(candlesGuardados('ITUB4.SA', '1y', '1d')).toBeNull();
    expect(estadoDoGrafico().faixa).toBeNull();
    expect(estadoDoGrafico().ticker).toBe('ITUB4.SA');
  });
});
