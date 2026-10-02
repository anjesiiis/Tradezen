import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MercadosGlobais from '../pages/MercadosGlobais.jsx';
import { MERCADOS_GLOBAIS, variacaoDoDia } from '../lib/mercadosGlobais.js';

// O globo é um import lazy que carrega d3 + o mapa do mundo: num teste de
// jsdom isso não acrescenta nada, então entra um dublê.
vi.mock('../components/GlobeD3.jsx', () => ({
  default: ({ mercados, aoSelecionar }) => (
    <div data-testid="globo">
      {mercados.map((m) => (
        <button key={m.id} onClick={() => aoSelecionar(m, { x: 100, y: 100 })}>
          ponto {m.sigla}
        </button>
      ))}
    </div>
  ),
}));

const candles = (ontem, hoje) => [{ fechamento: ontem }, { fechamento: hoje }];

function respostaDoBatch() {
  return {
    status: 'ok',
    resultados: [
      { ticker: '^BVSP', candles: candles(100, 102) },    // +2,00%
      { ticker: '^GSPC', candles: candles(100, 99) },     // -1,00%
    ],
  };
}

function montar() {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => respostaDoBatch() }));
  return render(<MemoryRouter><MercadosGlobais /></MemoryRouter>);
}

describe('Mercados Globais', () => {
  it('lista as seis bolsas com cidade, país e índice', async () => {
    montar();

    for (const m of MERCADOS_GLOBAIS) {
      expect(screen.getByText(m.sigla)).toBeInTheDocument();
      expect(screen.getByText(m.nomeIndice)).toBeInTheDocument();
    }
    expect(screen.getByText('São Paulo · Brasil')).toBeInTheDocument();
  });

  it('mostra a variação do dia com o sinal certo', async () => {
    montar();

    expect(await screen.findByText(/▲ 2.00%/)).toBeInTheDocument();
    expect(screen.getByText(/▼ 1.00%/)).toBeInTheDocument();
  });

  it('sem dado para o índice, mostra traço em vez de número inventado', async () => {
    montar();

    // só B3 e NYSE vieram no batch; as outras quatro ficam sem cotação
    await waitFor(() => expect(screen.getAllByText('—')).toHaveLength(4));
  });

  it('"Ver mais" leva para o gráfico do índice', async () => {
    const user = userEvent.setup();
    montar();

    const card = screen.getByText('B3').closest('.mg-card');
    await user.click(within(card).getByRole('button', { name: 'Ver mais' }));

    expect(window.location.pathname).toBe('/');  // MemoryRouter: não navega de verdade
  });

  it('clicar num ponto do globo abre o popup com descrição e botão do índice', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole('button', { name: 'ponto TSE' }));

    const popup = screen.getByRole('dialog');
    expect(within(popup).getByText('Tokyo Stock Exchange')).toBeInTheDocument();
    expect(within(popup).getByText('Japão · Ásia')).toBeInTheDocument();
    expect(within(popup).getByText('Nikkei 225', { selector: '.mg-popup-rotulo' })).toBeInTheDocument();
    expect(within(popup).getByRole('button', { name: 'Ver Índice' })).toBeInTheDocument();
  });

  it('o ✕ fecha o popup', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'ponto LSE' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicar fora fecha o popup', async () => {
    const user = userEvent.setup();
    const { container } = montar();
    await user.click(screen.getByRole('button', { name: 'ponto B3' }));

    await user.click(container.querySelector('.mg-head'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a API fora do ar não quebra a tela', async () => {
    global.fetch = vi.fn(async () => { throw new Error('sem rede'); });
    render(<MemoryRouter><MercadosGlobais /></MemoryRouter>);

    expect(screen.getByText('B3')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('—')).toHaveLength(6));
  });
});

describe('variacaoDoDia', () => {
  it('compara o último fechamento com o anterior', () => {
    expect(variacaoDoDia(candles(100, 105)).variacao).toBeCloseTo(5);
    expect(variacaoDoDia(candles(100, 95)).variacao).toBeCloseTo(-5);
  });

  it('sem candles suficientes, não inventa', () => {
    expect(variacaoDoDia([{ fechamento: 10 }])).toBeNull();
    expect(variacaoDoDia(null)).toBeNull();
  });
});
