import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ABRIR UMA MESA NÃO PODE MEXER NO GRÁFICO DO LADO.
 *
 * O ResizeObserver aplicava a largura nova com `applyOptions` e pronto.
 * Sem repor a faixa visível, o Lightweight Charts mantém o espaçamento
 * das velas e ancora na borda direita — ou seja, MUDA quais velas
 * aparecem. O sintoma relatado: abrir uma mesa nova e a vizinha "saltar"
 * pra uma posição que ninguém pediu, perdendo o zoom e o trecho em tela.
 *
 * A faixa é LÓGICA (índices de vela, não pixels), então repor depois do
 * resize mantém exatamente as mesmas velas, só mais largas ou estreitas.
 */

const chamadas = [];
const FAIXA = { from: 120.5, to: 180.5 };

let aoRedimensionar = null;

const timeScale = {
  getVisibleLogicalRange: vi.fn(() => { chamadas.push('ler-faixa'); return FAIXA; }),
  setVisibleLogicalRange: vi.fn((f) => { chamadas.push(`repor-faixa:${f.from}-${f.to}`); }),
  fitContent: vi.fn(),
  subscribeVisibleLogicalRangeChange: vi.fn(),
  applyOptions: vi.fn(),
  scrollToPosition: vi.fn(),
};

vi.mock('lightweight-charts', async (original) => {
  const real = await original();
  const serie = new Proxy(function () {}, {
    get: (_a, p) => (p === 'then' ? undefined : vi.fn()),
    apply: () => undefined,
  });
  return {
    ...real,
    createChart: vi.fn(() => ({
      applyOptions: vi.fn(() => { chamadas.push('aplicar-tamanho'); }),
      resize: vi.fn(),
      remove: vi.fn(),
      addSeries: vi.fn(() => serie),
      removeSeries: vi.fn(),
      timeScale: () => timeScale,
      priceScale: () => ({ applyOptions: vi.fn() }),
      subscribeCrosshairMove: vi.fn(),
      unsubscribeCrosshairMove: vi.fn(),
      subscribeClick: vi.fn(),
      unsubscribeClick: vi.fn(),
      panes: () => [],
    })),
  };
});

const { renderApp } = await import('./helpers.jsx');

describe('o zoom sobrevive ao redimensionamento', () => {
  beforeEach(() => {
    chamadas.length = 0;
    timeScale.getVisibleLogicalRange.mockClear();
    timeScale.setVisibleLogicalRange.mockClear();
    aoRedimensionar = null;

    // Captura o callback do observer. O mock global do setup é inerte
    // (observe() não faz nada), e sem disparar à mão não há como testar
    // o caminho que estava quebrado.
    globalThis.ResizeObserver = class {
      constructor(cb) { aoRedimensionar = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // O container precisa ter medida: largura/altura zero é o caso em que
    // o código IGNORA de propósito (mesa escondida).
    Object.defineProperty(HTMLElement.prototype, 'clientWidth',
      { configurable: true, value: 640 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight',
      { configurable: true, value: 480 });
  });

  it('lê a faixa, redimensiona e repõe a MESMA faixa', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(aoRedimensionar).toBeTypeOf('function'), { timeout: 5000 });

    chamadas.length = 0;
    aoRedimensionar([]);

    // A ordem é o que importa: repor antes do resize não teria efeito.
    expect(chamadas).toEqual([
      'ler-faixa',
      'aplicar-tamanho',
      `repor-faixa:${FAIXA.from}-${FAIXA.to}`,
    ]);
  });

  it('sem faixa (gráfico ainda vazio) não tenta repor nada', async () => {
    timeScale.getVisibleLogicalRange.mockImplementation(() => {
      chamadas.push('ler-faixa');
      return null;
    });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(aoRedimensionar).toBeTypeOf('function'), { timeout: 5000 });

    chamadas.length = 0;
    aoRedimensionar([]);

    // Só a sequência DO RESIZE: o componente repõe faixa em outros
    // momentos (o enquadramento ao abrir um padrão), e um
    // `not.toHaveBeenCalled` global pegaria aqueles por engano.
    expect(chamadas).toEqual(['ler-faixa', 'aplicar-tamanho']);
  });

  // Container 0x0 acontece quando a mesa está escondida (mesa de trás no
  // celular, aba em segundo plano). Aplicar 0 ali devolve o gráfico
  // quebrado quando ele reaparece.
  it('container sem medida é ignorado por inteiro', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(aoRedimensionar).toBeTypeOf('function'), { timeout: 5000 });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth',
      { configurable: true, value: 0 });
    chamadas.length = 0;
    aoRedimensionar([]);

    expect(chamadas).toEqual([]);
  });
});

// A MESA QUE FICAVA EM BRANCO AO ABRIR OUTRA.
//
// Abrir uma mesa muda a GRADE: de uma coluna pra duas, de duas pra 2x2.
// Os contêineres das mesas já abertas mudam de tamanho no mesmo quadro — e
// o ResizeObserver ignora medida 0x0 de propósito (mesa escondida no
// celular, aba em segundo plano). Se o contêiner passa por 0 nesse
// instante, o observer pula, e o gráfico fica com o tamanho ANTIGO num
// espaço novo: as velas saem da área visível e a mesa parece vazia, com o
// cabeçalho ainda mostrando o preço certo.
describe('a mesa se remede quando a grade muda', () => {
  const fonte = readFileSync(
    resolve(process.cwd(), 'src/components/CandleChart.jsx'), 'utf8');
  const dash = readFileSync(
    resolve(process.cwd(), 'src/pages/Dashboard.jsx'), 'utf8');

  it('o pai avisa as duas instâncias de mesa', () => {
    expect([...dash.matchAll(/redimensionarEm=\{totalDeMesas\}/g)]).toHaveLength(2);
  });

  // Dois quadros: no primeiro o layout ainda pode estar com as medidas
  // antigas; no segundo já são as de verdade.
  it('remede depois de o layout assentar', () => {
    const bloco = fonte.slice(fonte.indexOf('O GRÁFICO QUE FICAVA EM BRANCO'));
    expect(bloco.slice(0, 1500))
      .toMatch(/requestAnimationFrame\(\(\)=>requestAnimationFrame\(/);
    expect(bloco.slice(0, 1500)).toMatch(/remedirRef\.current\?\.\(\)/);
  });

  // Reusa `repintar`, que já guarda e repõe a faixa visível — senão a
  // mesa se remediria e saltaria de posição, trocando um bug por outro.
  it('reusa o caminho que preserva a faixa', () => {
    expect(fonte).toMatch(/remedirRef\.current = repintar;/);
  });

  it('não dispara na montagem, só quando a grade muda', () => {
    const bloco = fonte.slice(fonte.indexOf('O GRÁFICO QUE FICAVA EM BRANCO'));
    expect(bloco.slice(0, 1500)).toMatch(/if\(!redimensionarEm\) return;/);
  });
});
