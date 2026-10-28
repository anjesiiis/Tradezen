import {
  APARENCIA_PADRAO, CORES_CANDLE_PADRAO, PRESETS_CANDLE, TIPOS_GRAFICO,
  normalizarAparencia, opcoesDaSerieCandle, opcoesDaSerieLinha, paraLinha, presetAtual,
} from '../lib/grafico/aparencia.js';

describe('Aparência do gráfico — o padrão', () => {
  // Mudar isto repinta o gráfico de todo mundo que nunca escolheu nada.
  // Quem abre o TradeZen amanhã espera encontrar o gráfico de ontem.
  it('é o que o gráfico já usava', () => {
    expect(CORES_CANDLE_PADRAO).toEqual({ alta: '#00D68F', baixa: '#FF4560' });
    expect(APARENCIA_PADRAO.tipo).toBe('candle');
  });

  it('o primeiro preset é exatamente o padrão', () => {
    expect(PRESETS_CANDLE[0].alta).toBe(CORES_CANDLE_PADRAO.alta);
    expect(PRESETS_CANDLE[0].baixa).toBe(CORES_CANDLE_PADRAO.baixa);
  });

  it('são dois tipos: candle e linha', () => {
    expect(TIPOS_GRAFICO.map((t) => t.id)).toEqual(['candle', 'linha']);
  });

  // Candle preto em fundo escuro é candle invisível — por isso o preset
  // "Preto e Branco" do pedido virou "Sóbrio".
  it('nenhum preset usa preto, que somiria no fundo escuro', () => {
    for (const p of PRESETS_CANDLE) {
      expect(p.alta.toLowerCase()).not.toBe('#000000');
      expect(p.baixa.toLowerCase()).not.toBe('#000000');
    }
  });
});

describe('Normalização — nada quebra o gráfico', () => {
  it.each([
    ['nulo', null],
    ['texto solto', 'verde'],
    ['objeto vazio', {}],
    ['cores de outro tipo', { cores: 42 }],
  ])('%s vira o padrão', (_nome, entrada) => {
    expect(normalizarAparencia(entrada)).toEqual(APARENCIA_PADRAO);
  });

  it('tipo desconhecido volta pra candle', () => {
    expect(normalizarAparencia({ tipo: 'barras' }).tipo).toBe('candle');
  });

  it('cor que não é hexadecimal de 6 dígitos volta pro padrão', () => {
    const r = normalizarAparencia({ cores: { alta: 'verde', baixa: '#fff' } });
    expect(r.cores).toEqual(CORES_CANDLE_PADRAO);
  });

  it('guarda uma cor válida e devolve a outra no padrão', () => {
    const r = normalizarAparencia({ cores: { alta: '#2196F3' } });
    expect(r.cores.alta).toBe('#2196F3');
    expect(r.cores.baixa).toBe(CORES_CANDLE_PADRAO.baixa);
  });

  it('aceita o que é válido inteiro', () => {
    const bom = { tipo: 'linha', cores: { alta: '#089981', baixa: '#F23645' } };
    expect(normalizarAparencia(bom)).toEqual(bom);
  });
});

describe('Preset em uso', () => {
  it('reconhece as cores de um preset', () => {
    expect(presetAtual({ alta: '#089981', baixa: '#F23645' })).toBe('TradingView');
  });

  it('não liga pra caixa alta ou baixa do hexadecimal', () => {
    expect(presetAtual({ alta: '#089981', baixa: '#f23645' })).toBe('TradingView');
  });

  // Mexer no conta-gotas desfaz o preset, e é isso mesmo
  it('cor escolhida a dedo não é preset nenhum', () => {
    expect(presetAtual({ alta: '#123456', baixa: '#654321' })).toBeNull();
  });

  it('sem cores, cai no preset padrão', () => {
    expect(presetAtual(null)).toBe('Clássico');
  });
});

describe('Opções prontas pro Lightweight Charts', () => {
  // Corpo, borda e pavio na mesma cor: separá-los dobraria os seletores
  // pra resolver um problema que ninguém tem
  it('candle: corpo, borda e pavio saem na mesma cor', () => {
    const o = opcoesDaSerieCandle({ alta: '#2196F3', baixa: '#FF9800' });
    expect(o).toEqual({
      upColor: '#2196F3', downColor: '#FF9800',
      borderUpColor: '#2196F3', borderDownColor: '#FF9800',
      wickUpColor: '#2196F3', wickDownColor: '#FF9800',
    });
  });

  it('linha: é uma série só, então herda a cor de alta', () => {
    expect(opcoesDaSerieLinha({ alta: '#2196F3', baixa: '#FF9800' })).toEqual({ color: '#2196F3' });
  });

  it('cor torta não vaza pro gráfico', () => {
    expect(opcoesDaSerieCandle({ alta: 'javascript:alert(1)' }).upColor).toBe(CORES_CANDLE_PADRAO.alta);
  });
});

describe('Candles viram linha', () => {
  const lw = [
    { time: 1, open: 10, high: 12, low: 9, close: 11 },
    { time: 2, open: 11, high: 14, low: 10, close: 13 },
  ];

  it('a linha é o fechamento, e só ele', () => {
    expect(paraLinha(lw)).toEqual([{ time: 1, value: 11 }, { time: 2, value: 13 }]);
  });

  it('candle sem fechamento fica de fora, em vez de virar um buraco', () => {
    expect(paraLinha([...lw, { time: 3, close: null }])).toHaveLength(2);
  });

  it('entrada que não é lista devolve lista vazia', () => {
    expect(paraLinha(null)).toEqual([]);
    expect(paraLinha('candles')).toEqual([]);
  });
});
