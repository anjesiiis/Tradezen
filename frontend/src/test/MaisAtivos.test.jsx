import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaisAtivos } from '../components/MaisAtivos.jsx';
import { MAIS_ATIVOS, escolherAtivos } from '../lib/maisAtivos.js';

const ativo = (ticker, nome, simbolo, pct = 1) => ({
  ticker, nome, simbolo, preco: 10, variacao_pct: pct, alta: pct >= 0, serie: [1, 2, 3],
});

const MERCADO = [
  ativo('ETH-USD', 'Ethereum', 'ETH'),
  ativo('BTC-USD', 'Bitcoin', 'BTC'),
  ativo('PETR4.SA', 'Petrobras', 'PETR4', -2),
];

const cards = () => [...document.querySelectorAll('.mais-ativos-card')];

describe('Mais Ativos', () => {
  it('mostra os dez slots da curadoria', () => {
    render(<MaisAtivos mercado={MERCADO} abrirAtivo={vi.fn()} />);

    expect(MAIS_ATIVOS).toHaveLength(10);
    expect(cards()).toHaveLength(10);
  });

  it('quem veio na API aparece com preço e variação', () => {
    render(<MaisAtivos mercado={MERCADO} abrirAtivo={vi.fn()} />);

    const petr = cards().find((c) => within(c).queryByText('Petrobras'));
    expect(within(petr).getByText(/2\.00%/)).toBeInTheDocument();
  });

  it('quem não veio não vira card vazio', () => {
    render(<MaisAtivos mercado={MERCADO} abrirAtivo={vi.fn()} />);

    expect(screen.getAllByText('Cotação indisponível agora').length).toBeGreaterThan(0);
  });

  it('clicar abre o ativo — menos os que estão sem cotação', async () => {
    const user = userEvent.setup();
    const abrirAtivo = vi.fn();
    render(<MaisAtivos mercado={MERCADO} abrirAtivo={abrirAtivo} />);

    await user.click(cards().find((c) => within(c).queryByText('Bitcoin')));
    expect(abrirAtivo).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'BTC-USD' }));

    abrirAtivo.mockClear();
    await user.click(cards().find((c) => within(c).queryByText('Ouro')));
    expect(abrirAtivo).not.toHaveBeenCalled();
  });

  it('a roda do mouse rola a faixa de lado', () => {
    render(<MaisAtivos mercado={MERCADO} abrirAtivo={vi.fn()} />);
    const faixa = document.querySelector('.mais-ativos-faixa');
    // jsdom não faz layout: finge uma faixa que transborda
    Object.defineProperty(faixa, 'scrollWidth', { value: 2600, configurable: true });
    faixa.scrollLeft = 0;

    fireEvent.wheel(faixa, { deltaY: 300 });

    expect(faixa.scrollLeft).toBe(300);
  });

  it('roda na horizontal (deltaX) não é sequestrada', () => {
    render(<MaisAtivos mercado={MERCADO} abrirAtivo={vi.fn()} />);
    const faixa = document.querySelector('.mais-ativos-faixa');
    faixa.scrollLeft = 0;

    fireEvent.wheel(faixa, { deltaY: 0, deltaX: 120 });

    expect(faixa.scrollLeft).toBe(0);   // o próprio navegador cuida desse caso
  });
});

describe('escolherAtivos', () => {
  it('cai no substituto quando o preferido não veio', () => {
    const escolhidos = escolherAtivos([ativo('SOL-USD', 'Solana', 'SOL')]);

    // o slot do Ethereum tem SOL como reserva
    expect(escolhidos[0].ticker).toBe('SOL-USD');
    // e o slot da Solana não repete o mesmo ativo
    expect(escolhidos[2].semDados).toBe(true);
  });

  it('sem mercado nenhum, ninguém fica marcado como "sem dados"', () => {
    expect(escolherAtivos([]).every((a) => a.semDados === false)).toBe(true);
  });
});
