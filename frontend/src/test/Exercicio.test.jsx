import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PaginaExercicio from '../pages/Exercicio.jsx';

// O gráfico de velas é o mesmo da tela de análise (lightweight-charts):
// em jsdom ele não desenha nada útil, então entra um dublê.
vi.mock('../components/CandleChart.jsx', () => ({
  CandleChart: ({ candles }) => <div data-testid="velas">{candles.length} velas</div>,
}));

const CANDLES = [
  { timestamp: 1, abertura: 1, maxima: 2, minima: 0, fechamento: 1 },
  { timestamp: 2, abertura: 1, maxima: 3, minima: 1, fechamento: 2 },
];

function montar(padraoId = 'oco', resposta = { candles: CANDLES }) {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => resposta }));
  return render(<MemoryRouter><PaginaExercicio padraoId={padraoId} tema="dark" /></MemoryRouter>);
}

describe('Exercício de um padrão', () => {
  it('mostra o nome do padrão e a instrução', async () => {
    montar('topo-duplo');

    expect(screen.getByRole('heading', { name: 'Topo Duplo' })).toBeInTheDocument();
    expect(screen.getByText('Identifique e marque os pontos-chave deste padrão')).toBeInTheDocument();
  });

  it('carrega as velas de um ativo real', async () => {
    montar();

    expect(await screen.findByTestId('velas')).toHaveTextContent('2 velas');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/ativo/PETR4.SA'));
  });

  it('sem resposta da API, avisa em vez de ficar em branco', async () => {
    montar('oco', { candles: [] });

    expect(await screen.findByText('Não foi possível carregar o gráfico agora.')).toBeInTheDocument();
  });

  it('padrão desconhecido não quebra a tela', () => {
    montar('inventado');

    expect(screen.getByText('Esse exercício não existe.')).toBeInTheDocument();
  });

  it('tem o caminho de volta e o botão de seguir', async () => {
    const user = userEvent.setup();
    montar();

    expect(screen.getByRole('button', { name: '← Detectores' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Próximo' })).toBeInTheDocument());
  });
});
