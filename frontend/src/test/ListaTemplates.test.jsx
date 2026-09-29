import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListaTemplates from '../admin/ListaTemplates.jsx';

const TEMPLATE = {
  id: 7, ticker: 'PETR4.SA', timeframe: '1d', resultado: 'sucesso',
  observacao: 'rompeu com volume', criado_em: '2026-09-20T12:00:00Z',
  data_p1: '2026-05-14T00:00:00Z',
};

function montar(props = {}) {
  const acoes = { aoVisualizar: vi.fn(), aoEditar: vi.fn(), aoExcluir: vi.fn() };
  render(<ListaTemplates templates={[TEMPLATE]} rotulo="Bandeira de Alta" {...acoes} {...props} />);
  return acoes;
}

describe('Lista de templates salvos', () => {
  it('mostra o que interessa relembrar do template', () => {
    montar();

    expect(screen.getByText('PETR4.SA')).toBeInTheDocument();
    expect(screen.getByText('rompeu com volume')).toBeInTheDocument();
    // data do P1 em UTC: o candle é do dia inteiro
    expect(screen.getByText('14/05/2026')).toBeInTheDocument();
  });

  it('as ações são botões de verdade (mãozinha, teclado, leitor de tela)', async () => {
    const user = userEvent.setup();
    const acoes = montar();

    const editar = screen.getByRole('button', { name: 'Editar' });
    await user.click(editar);
    expect(acoes.aoEditar).toHaveBeenCalledWith(TEMPLATE);

    await user.click(screen.getByRole('button', { name: 'Visualizar' }));
    expect(acoes.aoVisualizar).toHaveBeenCalledWith(TEMPLATE);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(acoes.aoExcluir).toHaveBeenCalledWith(7);
  });

  it('sem templates, avisa em vez de mostrar lista vazia', () => {
    montar({ templates: [] });

    expect(screen.getByText('Nenhum template ainda.')).toBeInTheDocument();
  });
});
