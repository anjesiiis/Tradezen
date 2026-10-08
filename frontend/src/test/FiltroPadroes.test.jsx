import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FiltroPadroes from '../admin/FiltroPadroes.jsx';
import { PADROES_DO_FILTRO, lerFiltroSalvo } from '../lib/filtroPadroes.js';

function montar(props = {}) {
  const aoMudar = vi.fn();
  const utils = render(<FiltroPadroes ligados={[]} aoMudar={aoMudar} {...props} />);
  return { ...utils, aoMudar };
}

const caixas = () => screen.getAllByRole('checkbox');

describe('Filtro de padrões no gráfico de marcação', () => {
  beforeEach(() => localStorage.clear());

  it('lista todos os padrões, com o título em cima', () => {
    montar();

    expect(screen.getByText(/^Padrões/)).toBeInTheDocument();
    expect(caixas()).toHaveLength(PADROES_DO_FILTRO.length);
    expect(screen.getByText('Topo Duplo')).toBeInTheDocument();
    expect(screen.getByText('Suporte/Resistência')).toBeInTheDocument();
  });

  it('começa tudo desmarcado', () => {
    montar();

    expect(caixas().every((c) => !c.checked)).toBe(true);
  });

  it('marcar um padrão avisa quem desenha o gráfico', async () => {
    const user = userEvent.setup();
    const { aoMudar } = montar();

    await user.click(screen.getByText('OCO').closest('label').querySelector('input'));

    expect(aoMudar).toHaveBeenCalledWith(['oco']);
  });

  it('desmarcar tira só aquele padrão', async () => {
    const user = userEvent.setup();
    const { aoMudar } = montar({ ligados: ['oco', 'topo_duplo'] });

    await user.click(screen.getByText('OCO').closest('label').querySelector('input'));

    expect(aoMudar).toHaveBeenCalledWith(['topo_duplo']);
  });

  it('os que ainda não existem aparecem com "(em breve)" e não dá pra marcar', () => {
    montar();

    const futuro = screen.getByText('Fundo Duplo').closest('label');
    expect(within(futuro).getByText('(em breve)')).toBeInTheDocument();
    expect(within(futuro).getByRole('checkbox')).toBeDisabled();
    expect(futuro).toHaveAttribute('title', 'Ainda não existe no detector');
  });

  it('mostra quantos templates já existem naquele ativo', () => {
    montar({ contagem: { oco: 3 } });

    expect(within(screen.getByText('OCO').closest('label')).getByText('3')).toBeInTheDocument();
  });

  it('a escolha fica salva pra próxima sessão', () => {
    montar({ ligados: ['oco', 'niveis'] });

    expect(lerFiltroSalvo()).toEqual(['oco', 'niveis']);
  });

  it('ignora o que foi salvo e não existe mais', () => {
    localStorage.setItem('tradezen_filtro_padroes', JSON.stringify(['oco', 'padrao_que_sumiu', 'fundo_duplo']));

    // fundo_duplo é "em breve": não pode voltar ligado
    expect(lerFiltroSalvo()).toEqual(['oco']);
  });

  it('localStorage com lixo não quebra a tela', () => {
    localStorage.setItem('tradezen_filtro_padroes', 'isso não é json');

    expect(lerFiltroSalvo()).toEqual([]);
  });

  it('o botão de limpar só aparece com algo marcado', async () => {
    const user = userEvent.setup();
    const { aoMudar, rerender } = montar();
    expect(screen.queryByRole('button', { name: 'Desmarcar todos' })).not.toBeInTheDocument();

    rerender(<FiltroPadroes ligados={['oco']} aoMudar={aoMudar} />);
    await user.click(screen.getByRole('button', { name: 'Desmarcar todos' }));

    expect(aoMudar).toHaveBeenCalledWith([]);
  });
});
