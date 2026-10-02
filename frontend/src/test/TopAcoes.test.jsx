import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GloboMercados from '../components/GloboMercados.jsx';
import { buscarTopAcoes, candidatasDa } from '../lib/topAcoes.js';

vi.mock('../components/GlobeD3.jsx', () => ({
  default: ({ mercados, aoSelecionar }) => (
    <div data-testid="globo">
      {mercados.map((m) => (
        <button key={m.id} onClick={() => aoSelecionar(m, { x: 40, y: 40 })}>ponto {m.id}</button>
      ))}
    </div>
  ),
}));

const candle = (fechamento, volume) => ({ fechamento, volume });

// volume cresce do primeiro pro último: o ranking tem que respeitar isso
function respostaDoBatch() {
  return {
    resultados: [
      { status: 'ok', ticker: 'PETR4.SA', info: { nome: 'Petrobras', simbolo: 'PETR4' }, candles: [candle(100, 10), candle(102, 1000)] },
      { status: 'ok', ticker: 'VALE3.SA', info: { nome: 'Vale', simbolo: 'VALE3' }, candles: [candle(100, 10), candle(99, 5000)] },
      { status: 'ok', ticker: 'ITUB4.SA', info: { nome: 'Itaú', simbolo: 'ITUB4' }, candles: [candle(100, 10), candle(101, 3000)] },
      { status: 'erro', ticker: 'MGLU3.SA' },
    ],
  };
}

function montar() {
  global.fetch = vi.fn(async (url) => ({
    ok: true,
    json: async () => (String(url).includes('PETR4') ? respostaDoBatch() : { resultados: [] }),
  }));
  return render(<MemoryRouter><GloboMercados /></MemoryRouter>);
}

describe('Top 5 mais negociadas', () => {
  it('ordena por volume do último candle e descarta quem falhou', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => respostaDoBatch() }));

    const lista = await buscarTopAcoes('B3');

    expect(lista.map((a) => a.simbolo)).toEqual(['VALE3', 'ITUB4', 'PETR4']);
    expect(lista[0].variacao).toBeCloseTo(-1);
    expect(lista[0].alta).toBe(false);
  });

  it('a praça de ações tem candidatas conhecidas', () => {
    expect(candidatasDa('B3').length).toBeGreaterThan(5);
    expect(candidatasDa('NYSE')).toContain('NVDA');
    expect(candidatasDa('inexistente')).toEqual([]);
  });

  it('tocar no ponto de ações abre o top 5, com a variação colorida', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole('button', { name: 'ponto b3_acoes' }));

    const popup = screen.getByRole('dialog');
    expect(within(popup).getByText('Top 5 mais negociadas')).toBeInTheDocument();
    expect(await within(popup).findByText('VALE3')).toBeInTheDocument();
    expect(within(popup).getByText(/▼ 1.00%/)).toHaveClass('acao-variacao', 'baixa');
    expect(within(popup).getByText(/▲ 2.00%/)).toHaveClass('acao-variacao', 'alta');
  });

  it('clicar numa ação abre o gráfico dela e fecha o card', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(await screen.findByRole('button', { name: 'ponto b3_acoes' }));
    const linha = await screen.findByText('VALE3');

    await user.click(linha);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('sem resposta da API, avisa em vez de inventar o ranking', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ resultados: [] }) }));
    render(<MemoryRouter><GloboMercados /></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: 'ponto nyse_acoes' }));

    expect(await screen.findByText('Não foi possível carregar agora.')).toBeInTheDocument();
  });
});
