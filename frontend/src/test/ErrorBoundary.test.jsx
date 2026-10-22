import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

function Quebra() {
  throw new Error('preço indefinido no candle 42');
}

describe('ErrorBoundary', () => {
  // o React escreve o erro no console mesmo quando o boundary trata; sem
  // silenciar, a saída do teste fica ilegível
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('sem erro, não aparece — só mostra o conteúdo', () => {
    render(<ErrorBoundary><p>o gráfico</p></ErrorBoundary>);

    expect(screen.getByText('o gráfico')).toBeInTheDocument();
    expect(screen.queryByText(/Algo quebrou/)).not.toBeInTheDocument();
  });

  // é o ponto da coisa: erro no render não pode mais virar tela branca
  it('com erro, mostra a mensagem em vez de apagar a tela', () => {
    render(<ErrorBoundary><Quebra/></ErrorBoundary>);

    expect(screen.getByText(/Algo quebrou ao abrir esta tela/)).toBeInTheDocument();
    expect(screen.getByText('preço indefinido no candle 42')).toBeInTheDocument();
  });

  it('oferece recarregar, copiar o erro e voltar pro início', () => {
    render(<ErrorBoundary><Quebra/></ErrorBoundary>);

    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar o erro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir pra tela inicial' })).toHaveAttribute('href', '/');
  });

  // num celular não há console: copiar é o único jeito de mandar o erro.
  // fireEvent e não userEvent aqui: o userEvent.setup() instala o próprio
  // stub de clipboard e sobrescreveria este mock.
  it('copiar põe a mensagem na área de transferência', () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ErrorBoundary><Quebra/></ErrorBoundary>);

    fireEvent.click(screen.getByRole('button', { name: 'Copiar o erro' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('preço indefinido no candle 42'));
  });
});
