import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModalMoverMarcacao from '../admin/ModalMoverMarcacao.jsx';
import ListaTemplates from '../admin/ListaTemplates.jsx';

/**
 * As duas tabelas querem dizer coisas DIFERENTES:
 *
 *   padrão   → a forma É uma bandeira. Se deu certo ou não, isso é a
 *              coluna Resultado.
 *   fracasso → a forma NÃO é uma bandeira. É contraexemplo de desenho.
 *
 * O engano fácil é mover pra cá uma bandeira que se formou e só não
 * funcionou no mercado — ela continua sendo um exemplo CERTO de forma, e
 * movê-la ensina o modelo a recusar o que está certo. Por isso o aviso.
 */

const MARCACAO = { id: 7, ticker: 'PETR4.SA', timeframe: '1D', criado_em: '2026-10-01' };

const abrirModal = (destino, aoConfirmar = vi.fn()) => {
  const aoCancelar = vi.fn();
  render(
    <ModalMoverMarcacao marcacao={MARCACAO} destino={destino}
      aoConfirmar={aoConfirmar} aoCancelar={aoCancelar} />,
  );
  return { aoConfirmar, aoCancelar };
};

describe('Modal de mover marcação', () => {
  it('diz qual marcação está sendo movida', () => {
    abrirModal('fracasso');
    expect(screen.getByText('PETR4.SA')).toBeInTheDocument();
    expect(screen.getByText(/1D/)).toBeInTheDocument();
  });

  // O aviso é o motivo de o modal existir
  it('indo pros fracassos, avisa que "não funcionou" é outra coisa', () => {
    abrirModal('fracasso');
    expect(screen.getByText(/NÃO vem pra cá/)).toBeInTheDocument();
    expect(screen.getByText(/coluna Resultado/)).toBeInTheDocument();
  });

  it('indo pros padrões, avisa que a forma vai ser validada', () => {
    abrirModal('padrao');
    expect(screen.getByText(/validação do padrão/)).toBeInTheDocument();
  });

  it('os motivos sugeridos mudam com o destino', () => {
    const { unmount } = render(
      <ModalMoverMarcacao marcacao={MARCACAO} destino="fracasso" aoConfirmar={vi.fn()} aoCancelar={vi.fn()} />,
    );
    expect(screen.getByText('Não é bandeira — mastro não existe')).toBeInTheDocument();
    unmount();

    abrirModal('padrao');
    expect(screen.getByText(/É bandeira sim/)).toBeInTheDocument();
  });

  it('escolher um motivo preenche o texto, e clicar de novo desmarca', () => {
    abrirModal('fracasso');
    const chip = screen.getByText('Não é bandeira — mastro não existe');
    fireEvent.click(chip);
    expect(screen.getByRole('textbox')).toHaveValue('Não é bandeira — mastro não existe');
    fireEvent.click(chip);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('confirmar manda o motivo escrito', async () => {
    const aoConfirmar = vi.fn().mockResolvedValue();
    abrirModal('fracasso', aoConfirmar);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  mastro curto  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mover para fracassos' }));
    await waitFor(() => expect(aoConfirmar).toHaveBeenCalledWith('mastro curto'));
  });

  // Mover é irreversível pela tela: tem que ser explícito
  it('cancelar não move nada', () => {
    const aoConfirmar = vi.fn();
    const { aoCancelar } = abrirModal('fracasso', aoConfirmar);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(aoCancelar).toHaveBeenCalled();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it('erro do servidor aparece na tela, e o modal não fecha', async () => {
    const aoConfirmar = vi.fn().mockRejectedValue(new Error('não passa na validação de forma'));
    abrirModal('padrao', aoConfirmar);
    fireEvent.click(screen.getByRole('button', { name: 'Mover para padrões' }));

    expect(await screen.findByText(/não passa na validação de forma/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mover para padrões' })).toBeEnabled();
  });
});

describe('Card da marcação', () => {
  const montar = (t, extras = {}) => render(
    <ListaTemplates templates={[t]} rotulo="Bandeira de Alta"
      aoVisualizar={vi.fn()} aoEditar={vi.fn()} aoExcluir={vi.fn()} {...extras} />,
  );

  it('o botão diz pra onde vai, não "flip"', () => {
    montar(MARCACAO, { aoMover: vi.fn(), destinoDoMover: 'fracasso' });
    expect(screen.getByRole('button', { name: 'Não é o padrão' })).toBeInTheDocument();

    screen.getByRole('button', { name: 'Não é o padrão' });
  });

  it('do lado dos fracassos, o botão é o inverso', () => {
    montar(MARCACAO, { aoMover: vi.fn(), destinoDoMover: 'padrao' });
    expect(screen.getByRole('button', { name: 'É o padrão' })).toBeInTheDocument();
  });

  // Padrões sem os dois lados (canal, triângulo...) não ganham o botão
  it('sem aoMover, o botão não aparece', () => {
    montar(MARCACAO);
    expect(screen.queryByRole('button', { name: /é o padrão/i })).not.toBeInTheDocument();
  });

  it('marcação já movida mostra o selo e o motivo', () => {
    montar({ ...MARCACAO, movido_de: 'templates_bandeira_alta_fracasso', motivo_movimento: 'mastro existe' });
    expect(screen.getByText(/movida de fracassos/)).toBeInTheDocument();
    expect(screen.getByText(/mastro existe/)).toBeInTheDocument();
  });

  it('marcação nunca movida não mostra selo', () => {
    montar(MARCACAO);
    expect(screen.queryByText(/movida de/)).not.toBeInTheDocument();
  });
});
