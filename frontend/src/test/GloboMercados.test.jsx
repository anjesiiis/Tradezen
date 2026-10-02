import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GloboMercados from '../components/GloboMercados.jsx';
import { CATEGORIAS, MERCADOS_GLOBAIS, MOEDAS_GLOBAIS, PONTOS_DO_GLOBO } from '../lib/mercadosGlobais.js';

// Dublê do globo: o de verdade baixa d3 + mapa do mundo, que não acrescenta
// nada em jsdom. O que importa aqui é quem chega até ele e o que volta.
let mercadosRecebidos = [];
vi.mock('../components/GlobeD3.jsx', () => ({
  default: ({ mercados, aoSelecionar }) => {
    mercadosRecebidos = mercados;
    return (
      <div data-testid="globo">
        {mercados.map((m) => (
          <button key={m.id} onClick={() => aoSelecionar(m, { x: 50, y: 50 })}>ponto {m.sigla}</button>
        ))}
      </div>
    );
  },
}));

function montar() {
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ resultados: [{ ticker: '^BVSP', candles: [{ fechamento: 100 }, { fechamento: 103 }] }] }),
  }));
  return render(<MemoryRouter><GloboMercados /></MemoryRouter>);
}

describe('Bloco do globo na tela inicial', () => {
  it('mostra os filtros (Ação, Moeda e Índice), todos ligados', async () => {
    montar();

    expect(CATEGORIAS.map((c) => c.rotulo)).toEqual(['Ação', 'Moeda', 'Índice']);
    expect(screen.queryByRole('button', { name: 'Cripto' })).not.toBeInTheDocument();
    for (const { rotulo } of CATEGORIAS) {
      expect(screen.getByRole('button', { name: rotulo })).toHaveAttribute('aria-pressed', 'true');
    }
    await waitFor(() => expect(mercadosRecebidos).toHaveLength(PONTOS_DO_GLOBO.length));
  });

  it('desligar "Índice" deixa só as moedas', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos).toHaveLength(11));

    await user.click(screen.getByRole('button', { name: 'Índice' }));

    expect(mercadosRecebidos).toHaveLength(MOEDAS_GLOBAIS.length);
    expect(mercadosRecebidos.every((m) => m.categoria === 'moeda')).toBe(true);
  });

  it('desligar "Moeda" deixa só as bolsas', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos).toHaveLength(11));

    await user.click(screen.getByRole('button', { name: 'Moeda' }));

    expect(mercadosRecebidos).toHaveLength(MERCADOS_GLOBAIS.length);
    expect(mercadosRecebidos.every((m) => m.categoria === 'indice')).toBe(true);
  });

  it('desligar os dois esvazia o globo', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos).toHaveLength(11));

    await user.click(screen.getByRole('button', { name: 'Índice' }));
    await user.click(screen.getByRole('button', { name: 'Moeda' }));

    expect(mercadosRecebidos).toHaveLength(0);
    expect(screen.getByText(/Nenhum mercado nas categorias escolhidas/)).toBeInTheDocument();
  });

  it('desligar "Ação", que ainda não tem ponto, não mexe no globo', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos).toHaveLength(11));

    await user.click(screen.getByRole('button', { name: 'Ação' }));

    expect(mercadosRecebidos).toHaveLength(11);
  });

  it('religar o filtro traz os pontos de volta', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Índice' }));
    expect(mercadosRecebidos.every((m) => m.categoria === 'moeda')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Índice' }));

    expect(mercadosRecebidos).toHaveLength(PONTOS_DO_GLOBO.length);
  });

  it('clicar num ponto abre o card com a variação do dia e o botão do índice', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos.length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: 'ponto B3' }));

    const popup = screen.getByRole('dialog');
    expect(within(popup).getByText('B3')).toBeInTheDocument();
    expect(await within(popup).findByText(/▲ 3.00%/)).toBeInTheDocument();
    expect(within(popup).getByRole('button', { name: 'Ver Índice' })).toBeInTheDocument();
  });

  it('bolsa sem cotação mostra traço, não número inventado', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos.length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: 'ponto TSE' }));

    expect(within(screen.getByRole('dialog')).getByText('—')).toBeInTheDocument();
  });

  it('o ✕ fecha o card', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos.length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: 'ponto LSE' }));

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('trocar de filtro fecha o card aberto', async () => {
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(mercadosRecebidos.length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: 'ponto B3' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Moeda' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
