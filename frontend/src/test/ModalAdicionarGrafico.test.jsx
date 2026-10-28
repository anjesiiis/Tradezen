import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalAdicionarGrafico, { tempoSugerido } from '../components/ModalAdicionarGrafico.jsx';

describe('Adicionar mesa — qual tempo sugerir', () => {
  // o uso real é ver o diário e o intraday lado a lado
  it('sugere sempre um degrau mais de perto', () => {
    expect(tempoSugerido('1S')).toBe('1D');
    expect(tempoSugerido('1D')).toBe('60m');
    expect(tempoSugerido('60m')).toBe('15m');
    expect(tempoSugerido('15m')).toBe('5m');
    expect(tempoSugerido('5m')).toBe('1m');
  });

  // do 1m não há pra onde ir mais perto
  it('do 1m, volta pra trás', () => {
    expect(tempoSugerido('1m')).toBe('15m');
  });

  it('sem saber o tempo atual, cai num intraday útil', () => {
    expect(tempoSugerido(undefined)).toBe('60m');
    expect(tempoSugerido('inventado')).toBe('60m');
  });
});

describe('Adicionar mesa — a tela', () => {
  const abrir = (props = {}) => {
    const aoEscolher = vi.fn();
    const aoFechar = vi.fn();
    render(
      <ModalAdicionarGrafico
        ticker="PETR4.SA" simbolo="PETR4" tempoAtual="1D" mercado={[]}
        aoEscolher={aoEscolher} aoFechar={aoFechar} {...props}
      />,
    );
    return { aoEscolher, aoFechar };
  };

  it('mostra as duas intenções e o tempo que vai abrir', () => {
    abrir();
    expect(screen.getByText('Mesmo ativo')).toBeInTheDocument();
    expect(screen.getByText('Outro ativo')).toBeInTheDocument();
    expect(screen.getByText(/PETR4/)).toBeInTheDocument();
    expect(screen.getByText('60m')).toBeInTheDocument();
  });

  it('"Mesmo ativo" devolve o mesmo ticker, noutro tempo', async () => {
    const { aoEscolher } = abrir();
    await userEvent.click(screen.getByText('Mesmo ativo'));
    expect(aoEscolher).toHaveBeenCalledWith({ ticker: 'PETR4.SA', tempo: '60m' });
  });

  it('"Outro ativo" leva pra busca, com volta', async () => {
    abrir();
    await userEvent.click(screen.getByText('Outro ativo'));
    expect(screen.getByLabelText('Buscar ativo')).toBeInTheDocument();

    await userEvent.click(screen.getByText('← Voltar'));
    expect(screen.getByText('Mesmo ativo')).toBeInTheDocument();
  });

  it('Esc fecha', async () => {
    const { aoFechar } = abrir();
    await userEvent.keyboard('{Escape}');
    expect(aoFechar).toHaveBeenCalled();
  });
});
