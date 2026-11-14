import { render } from '@testing-library/react';
import TemplateMarkerChart from '../admin/TemplateMarkerChart.jsx';
import { faixaDeLeitura } from '../admin/enquadrar.js';

// ENQUADRAR TAMBÉM AO EDITAR
// ==========================
//
// Abrir um template salvo pra EDITAR jogava o contexto inteiro na tela de
// uma vez. O padrão que se ia editar ficava com ~10% da largura em vez de
// ~40%, e a sensação era de um zoom pra fora espontâneo: dava pra ver os
// candles, mas não o desenho, e era preciso ir fechando o zoom à mão.
//
// O enquadramento já existia — só estava preso ao modo visualizar.

// Grava as chamadas de setVisibleLogicalRange, deixando o resto da API do
// gráfico ser o faz-tudo do setup.js.
const faixasPedidas = [];

function fakeApi() {
  const cache = {};
  return new Proxy(function () {}, {
    get(_a, prop) {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === 'length') return 0;
      if (typeof prop === 'symbol') return undefined;
      if (!(prop in cache)) cache[prop] = fakeApi();
      return cache[prop];
    },
    apply() { return fakeApi(); },
  });
}

vi.mock('lightweight-charts', async (original) => {
  const real = await original();
  const escala = {
    setVisibleLogicalRange: (faixa) => { faixasPedidas.push(faixa); },
    getVisibleLogicalRange: () => null,
    subscribeVisibleLogicalRangeChange: () => {},
    unsubscribeVisibleLogicalRangeChange: () => {},
    fitContent: () => {},
    applyOptions: () => {},
    logicalToCoordinate: () => 0,
    coordinateToLogical: () => 0,
    timeToCoordinate: () => 0,
    coordinateToTime: () => 0,
    scrollToPosition: () => {},
  };
  return {
    ...real,
    createChart: vi.fn(() => new Proxy(function () {}, {
      get(_a, prop) {
        if (prop === 'timeScale') return () => escala;
        return fakeApi()[prop];
      },
      apply() { return fakeApi(); },
    })),
  };
});

const DIA = 86400000;
// 300 candles de contexto, como um template aberto de verdade.
const candles = Array.from({ length: 300 }, (_, i) => ({
  timestamp: i * DIA,
  abertura: 10, maxima: 11, minima: 9, fechamento: 10, volume: 100,
}));

const STEPS = [
  { key: 'p1', label: 'P1', short: 'P1', color: '#26a69a' },
  { key: 'p2', label: 'P2', short: 'P2', color: '#2962ff' },
];

// O desenho ocupa os candles 200 a 230, no meio do contexto.
const PONTOS = { p1: { i: 200, preco: 10 }, p2: { i: 230, preco: 13 } };

beforeEach(() => { faixasPedidas.length = 0; });

describe('abrir um template salvo', () => {
  it('enquadra no desenho quando enquadrarPontos está ligado', () => {
    render(
      <TemplateMarkerChart
        candles={candles} steps={STEPS} initialPontos={PONTOS}
        onChange={vi.fn()} enquadrarPontos
      />,
    );
    expect(faixasPedidas).toHaveLength(1);
    expect(faixasPedidas[0]).toEqual(faixaDeLeitura([200, 230], candles.length));
  });

  it('o desenho fica perto de 40% da largura, não de 10%', () => {
    render(
      <TemplateMarkerChart
        candles={candles} steps={STEPS} initialPontos={PONTOS}
        onChange={vi.fn()} enquadrarPontos
      />,
    );
    const { from, to } = faixasPedidas[0];
    const fatia = (230 - 200 + 1) / (to - from);
    expect(fatia).toBeGreaterThan(0.3);
    expect(fatia).toBeLessThan(0.6);
    // e mostra muito menos que o contexto inteiro
    expect(to - from).toBeLessThan(candles.length / 2);
  });

  it('sem enquadrarPontos, não mexe no zoom (marcação nova)', () => {
    render(
      <TemplateMarkerChart
        candles={candles} steps={STEPS} initialPontos={{}}
        onChange={vi.fn()}
      />,
    );
    expect(faixasPedidas).toHaveLength(0);
  });
});

describe('enquadrar é coisa de abertura, não de cada clique', () => {
  it('não volta ao enquadramento quando um ponto é arrastado', () => {
    const { rerender } = render(
      <TemplateMarkerChart
        candles={candles} steps={STEPS} initialPontos={PONTOS}
        onChange={vi.fn()} enquadrarPontos
      />,
    );
    expect(faixasPedidas).toHaveLength(1);

    // o usuário deu zoom à mão e arrastou um ponto: MESMO array de candles
    rerender(
      <TemplateMarkerChart
        candles={candles} steps={STEPS}
        initialPontos={{ ...PONTOS, p2: { i: 235, preco: 14 } }}
        onChange={vi.fn()} enquadrarPontos
      />,
    );
    expect(faixasPedidas).toHaveLength(1);
  });

  it('enquadra de novo ao abrir OUTRO template (candles trocam)', () => {
    const { rerender } = render(
      <TemplateMarkerChart
        candles={candles} steps={STEPS} initialPontos={PONTOS}
        onChange={vi.fn()} enquadrarPontos
      />,
    );
    const outros = candles.slice(0, 250).map((c) => ({ ...c }));
    rerender(
      <TemplateMarkerChart
        candles={outros} steps={STEPS}
        initialPontos={{ p1: { i: 50, preco: 10 }, p2: { i: 70, preco: 12 } }}
        onChange={vi.fn()} enquadrarPontos
      />,
    );
    expect(faixasPedidas).toHaveLength(2);
    expect(faixasPedidas[1]).toEqual(faixaDeLeitura([50, 70], outros.length));
  });

  it('ponto fora dos candles não atrapalha o enquadramento', () => {
    render(
      <TemplateMarkerChart
        candles={candles} steps={STEPS}
        initialPontos={{ p1: { i: 200, preco: 10 }, p2: { i: 9999, preco: 13 } }}
        onChange={vi.fn()} enquadrarPontos
      />,
    );
    expect(faixasPedidas).toHaveLength(1);
    expect(faixasPedidas[0]).toEqual(faixaDeLeitura([200], candles.length));
  });
});

// A correção de verdade foi nas TELAS: elas passavam enquadrarPontos só
// quando readOnly. Os testes acima exercitam o gráfico, que já fazia a
// coisa certa quando pedido — então sem este bloco dava pra religar o bug
// sem nenhum teste reclamar. Lendo o fonte, como já se faz em
// cssSemCrase.test.js.
describe('as telas pedem enquadramento nos dois modos', () => {
  const telas = [
    'src/admin/PainelMarcacao.jsx',
    'src/admin/AdminTemplates.jsx',
    'src/admin/AdminTemplatesTopoDuplo.jsx',
  ];

  for (const caminho of telas) {
    it(`${caminho} nao prende o enquadramento ao readOnly`, async () => {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const fonte = readFileSync(resolve(process.cwd(), caminho), 'utf8');
      // pede o enquadramento sem condicao nenhuma
      expect(fonte).toMatch(/\n\s*enquadrarPontos\n/);
      expect(fonte).not.toMatch(/enquadrarPontos=\{editando\.readOnly\}/);
    });
  }
});
