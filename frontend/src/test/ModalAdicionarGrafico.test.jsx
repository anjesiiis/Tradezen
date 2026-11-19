import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalAdicionarGrafico from '../components/ModalAdicionarGrafico.jsx';

/**
 * O "+" ABRE DIRETO A BUSCA.
 *
 * Antes havia um passo intermediário com duas opções, "Mesmo ativo" e
 * "Outro ativo". Saiu por pedido do dono: duas intenções numa tela fazem
 * a pessoa escolher antes de poder fazer o que veio fazer, e abrir outro
 * ativo é o que se quer quase sempre.
 *
 * Quem quer o mesmo papel noutro tempo não perdeu nada — busca o mesmo
 * ticker e troca o tempo na mesa nova, que é um clique na barra dela.
 */

const MERCADO = [
  { ticker: 'PETR4.SA', nome: 'Petrobras PN', simbolo: 'PETR4', mercado: 'B3' },
  { ticker: 'VALE3.SA', nome: 'Vale ON', simbolo: 'VALE3', mercado: 'B3' },
];

describe('Adicionar mesa', () => {
  it('abre na busca, sem passo intermediário', () => {
    render(<ModalAdicionarGrafico mercado={MERCADO} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Escolher o ativo da nova mesa/)).toBeInTheDocument();
    // o campo de busca já está na tela
    expect(document.querySelector('.mag-busca input')).toBeInTheDocument();
  });

  // Travas contra a volta do passo que foi removido.
  it('não oferece mais as duas intenções', () => {
    render(<ModalAdicionarGrafico mercado={MERCADO} />);
    expect(screen.queryByText('Mesmo ativo')).not.toBeInTheDocument();
    expect(screen.queryByText('Outro ativo')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.mag-opcao')).toHaveLength(0);
  });

  it('não tem "Voltar", porque não há passo anterior', () => {
    render(<ModalAdicionarGrafico mercado={MERCADO} />);
    expect(document.querySelector('.mag-voltar')).toBeNull();
  });

  it('escolher um ativo devolve o ticker', async () => {
    const aoEscolher = vi.fn();
    render(<ModalAdicionarGrafico mercado={MERCADO} aoEscolher={aoEscolher} />);

    const campo = document.querySelector('.mag-busca input');
    await userEvent.type(campo, 'vale');
    const item = await waitFor(() => {
      const achado = screen.getByText('Vale ON');
      expect(achado).toBeInTheDocument();
      return achado;
    });
    await userEvent.click(item);

    expect(aoEscolher).toHaveBeenCalledWith({ ticker: 'VALE3.SA' });
  });

  it('o ✕ fecha', async () => {
    const aoFechar = vi.fn();
    render(<ModalAdicionarGrafico mercado={MERCADO} aoFechar={aoFechar} />);
    await userEvent.click(screen.getByLabelText('Fechar'));
    expect(aoFechar).toHaveBeenCalled();
  });

  // Esc tem de fechar, e `stopPropagation` evita que o mesmo toque
  // cancele a ferramenta de desenho na tela de trás.
  it('Esc fecha', () => {
    const aoFechar = vi.fn();
    render(<ModalAdicionarGrafico mercado={MERCADO} aoFechar={aoFechar} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(aoFechar).toHaveBeenCalled();
  });

  it('clicar no fundo fecha', async () => {
    const aoFechar = vi.fn();
    render(<ModalAdicionarGrafico mercado={MERCADO} aoFechar={aoFechar} />);
    await userEvent.click(document.querySelector('.mag-fundo'));
    expect(aoFechar).toHaveBeenCalled();
  });

  it('clicar dentro do card NÃO fecha', async () => {
    const aoFechar = vi.fn();
    render(<ModalAdicionarGrafico mercado={MERCADO} aoFechar={aoFechar} />);
    await userEvent.click(document.querySelector('.mag-card'));
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
