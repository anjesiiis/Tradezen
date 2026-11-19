import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';

/**
 * O F5 VOLTA PRO PONTO QUE A PESSOA ESTAVA OLHANDO.
 *
 * Antes a bancada voltava com os ativos certos, mas cada gráfico abria no
 * começo — perdia o zoom e o trecho do ano que estava em tela.
 *
 * A faixa é guardada em TIMESTAMPS, não em índices de vela: índice
 * depende de quantas velas o array tem, e o array muda (vela nova no
 * fechamento, histórico antigo chegando na rolagem, troca de timeframe).
 * "Índice 120" amanhã aponta pra outro dia; "12 de março" aponta sempre
 * pro mesmo dia.
 *
 * E é guardada POR TIMEFRAME: posição no diário não quer dizer nada no
 * gráfico de 1 minuto.
 */

const chamadas = [];
let aoMudarFaixaInterno = null;
const FAIXA_GUARDADA = { de: 1740787200, ate: 1748649600 };

const timeScale = {
  getVisibleLogicalRange: vi.fn(() => ({ from: 10, to: 90 })),
  setVisibleLogicalRange: vi.fn(),
  getVisibleRange: vi.fn(() => ({ from: 1700000000, to: 1710000000 })),
  setVisibleRange: vi.fn((r) => { chamadas.push(`repor:${r.from}-${r.to}`); }),
  fitContent: vi.fn(),
  subscribeVisibleLogicalRangeChange: vi.fn((cb) => { aoMudarFaixaInterno = cb; }),
  applyOptions: vi.fn(),
  scrollToPosition: vi.fn(),
};

vi.mock('lightweight-charts', async (original) => {
  const real = await original();
  const serie = new Proxy(function () {}, {
    get: (_a, p) => (p === 'then' ? undefined
      : p === 'priceScale' ? () => ({ applyOptions: vi.fn() })
      : vi.fn()),
    apply: () => undefined,
  });
  return {
    ...real,
    createChart: vi.fn(() => ({
      applyOptions: vi.fn(),
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

const { CandleChart } = await import('../components/CandleChart.jsx');
const { render } = await import('@testing-library/react');

const candles = Array.from({ length: 200 }, (_, i) => ({
  timestamp: (1700000000 + i * 86400) * 1000,
  abertura: 10, maxima: 11, minima: 9, fechamento: 10.5, volume: 1000,
}));

describe('a faixa visível é reposta e guardada', () => {
  beforeEach(() => {
    chamadas.length = 0;
    aoMudarFaixaInterno = null;
    timeScale.setVisibleRange.mockClear();
    vi.useRealTimers();
  });

  it('repõe a faixa guardada ao carregar o ativo', async () => {
    render(<CandleChart candles={candles} activeTools={new Set()} padroes={[]} niveis={[]} desenhos={[]} faixaSalva={FAIXA_GUARDADA} />);
    await waitFor(() => expect(chamadas).toContain(
      `repor:${FAIXA_GUARDADA.de}-${FAIXA_GUARDADA.ate}`), { timeout: 4000 });
  });

  it('sem nada guardado, não força faixa nenhuma', async () => {
    render(<CandleChart candles={candles} activeTools={new Set()} padroes={[]} niveis={[]} desenhos={[]} faixaSalva={null} />);
    await new Promise((r) => setTimeout(r, 200));
    expect(timeScale.setVisibleRange).not.toHaveBeenCalled();
  });

  // Faixa de um ativo com mais histórico aplicada num com menos faz o
  // Lightweight Charts lançar. O gráfico tem de abrir igual, não vazio.
  it('faixa fora do dado não derruba o gráfico', async () => {
    timeScale.setVisibleRange.mockImplementationOnce(() => { throw new Error('out of range'); });
    const { container } = render(
      <CandleChart candles={candles} activeTools={new Set()} padroes={[]} niveis={[]} desenhos={[]} faixaSalva={FAIXA_GUARDADA} />);
    await new Promise((r) => setTimeout(r, 200));
    expect(container.firstChild).toBeTruthy();
  });

  it('guarda a faixa só depois de a pessoa parar de mexer', async () => {
    const aoMudarFaixa = vi.fn();
    render(<CandleChart candles={candles} activeTools={new Set()} padroes={[]} niveis={[]} desenhos={[]} aoMudarFaixa={aoMudarFaixa} />);
    await waitFor(() => expect(aoMudarFaixaInterno).toBeTypeOf('function'), { timeout: 4000 });

    // Dez movimentos seguidos, como uma arrastada de verdade
    for (let i = 0; i < 10; i++) aoMudarFaixaInterno({ from: 50 + i, to: 150 + i });
    expect(aoMudarFaixa).not.toHaveBeenCalled();   // nada ainda: o dedo não parou

    await waitFor(() => expect(aoMudarFaixa).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(aoMudarFaixa).toHaveBeenCalledWith({ de: 1700000000, ate: 1710000000 });
  });

  it('guarda em timestamps, não em índices de vela', async () => {
    const aoMudarFaixa = vi.fn();
    render(<CandleChart candles={candles} activeTools={new Set()} padroes={[]} niveis={[]} desenhos={[]} aoMudarFaixa={aoMudarFaixa} />);
    await waitFor(() => expect(aoMudarFaixaInterno).toBeTypeOf('function'), { timeout: 4000 });
    aoMudarFaixaInterno({ from: 50, to: 150 });
    await waitFor(() => expect(aoMudarFaixa).toHaveBeenCalled(), { timeout: 3000 });

    const { de, ate } = aoMudarFaixa.mock.calls[0][0];
    // índices seriam 50 e 150; timestamps são da ordem de 1,7 bilhão
    expect(de).toBeGreaterThan(1_000_000_000);
    expect(ate).toBeGreaterThan(de);
  });

  it('faixa invertida ou sem número é descartada', async () => {
    const aoMudarFaixa = vi.fn();
    timeScale.getVisibleRange.mockReturnValue({ from: 1710000000, to: 1700000000 });
    render(<CandleChart candles={candles} activeTools={new Set()} padroes={[]} niveis={[]} desenhos={[]} aoMudarFaixa={aoMudarFaixa} />);
    await waitFor(() => expect(aoMudarFaixaInterno).toBeTypeOf('function'), { timeout: 4000 });
    aoMudarFaixaInterno({ from: 50, to: 150 });
    await new Promise((r) => setTimeout(r, 1300));
    expect(aoMudarFaixa).not.toHaveBeenCalled();
    timeScale.getVisibleRange.mockReturnValue({ from: 1700000000, to: 1710000000 });
  });
});
