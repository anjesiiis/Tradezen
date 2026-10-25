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

describe('MaisAtivos — setas do carrossel', () => {
  const montar = () => render(<MaisAtivos mercado={[]} abrirAtivo={() => {}} />);

  it('tem as duas setas, no cabeçalho e não sobre os cards', () => {
    montar();

    const topo = document.querySelector('.mais-ativos-topo');
    expect(within(topo).getByLabelText('Ativos anteriores')).toBeInTheDocument();
    expect(within(topo).getByLabelText('Próximos ativos')).toBeInTheDocument();
    // as setas são irmãs do título, não filhas da faixa de cards
    expect(document.querySelector('.mais-ativos-faixa .mais-ativos-seta')).toBeNull();
  });

  it('clicar na seta rola a faixa pro lado', async () => {
    const user = userEvent.setup();
    montar();
    const faixa = document.querySelector('.mais-ativos-faixa');
    const rolagens = [];
    faixa.scrollBy = (opcoes) => rolagens.push(opcoes);

    await user.click(screen.getByLabelText('Próximos ativos'));
    await user.click(screen.getByLabelText('Ativos anteriores'));

    expect(rolagens).toHaveLength(2);
    expect(rolagens[0].left).toBeGreaterThan(0);
    expect(rolagens[1].left).toBeLessThan(0);
    expect(rolagens.every((r) => r.behavior === 'smooth')).toBe(true);
  });
});

describe('escolherAtivos', () => {
  it('cai no substituto quando o preferido não veio', () => {
    // o primeiro slot é a VALE, que tem CSNA3 como reserva
    const escolhidos = escolherAtivos([ativo('CSNA3.SA', 'CSN', 'CSNA3')]);

    expect(escolhidos[0].ticker).toBe('CSNA3.SA');
    // e nenhum outro slot repete o mesmo ativo
    expect(escolhidos.filter((a) => a.ticker === 'CSNA3.SA')).toHaveLength(1);
  });

  // a ordem é o pedido: os mais procurados por quem está começando
  it('a ordem dos slots é VALE, PETR, OURO, DÓLAR, BITCOIN...', () => {
    expect(MAIS_ATIVOS.map((a) => a.simbolo)).toEqual([
      'VALE3', 'PETR4', 'OURO', 'USD/BRL', 'BTC', 'IBOV', 'ITUB4', 'BBDC4', 'MGLU3', 'WEGE3',
    ]);
  });

  it('cada slot tem reserva, pra nunca ficar um card vazio', () => {
    for (const a of MAIS_ATIVOS) {
      expect(a.reservas.length, a.simbolo).toBeGreaterThan(0);
      expect(a.reservas, a.simbolo).not.toContain(a.ticker);
    }
  });

  it('sem mercado nenhum, ninguém fica marcado como "sem dados"', () => {
    expect(escolherAtivos([]).every((a) => a.semDados === false)).toBe(true);
  });
});
