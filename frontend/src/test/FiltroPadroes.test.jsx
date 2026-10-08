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

  it('sem escolha salva, começa com todos os padrões que existem ligados', () => {
    // abrir um ativo tem que mostrar na hora o que já foi marcado nele
    const ligados = lerFiltroSalvo();
    montar({ ligados });

    const disponiveis = PADROES_DO_FILTRO.filter((p) => !p.emBreve);
    expect(ligados).toHaveLength(disponiveis.length);
    expect(caixas().filter((c) => c.checked)).toHaveLength(disponiveis.length);
    // os "em breve" seguem desmarcados e travados
    expect(caixas().filter((c) => c.disabled).every((c) => !c.checked)).toBe(true);
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

  it('uma escolha salva é respeitada, ignorando o que não existe mais', () => {
    localStorage.setItem('tradezen_filtro_padroes', JSON.stringify(['oco', 'padrao_que_sumiu', 'fundo_duplo']));

    // fundo_duplo é "em breve": não pode voltar ligado
    expect(lerFiltroSalvo()).toEqual(['oco']);
  });

  it('localStorage com lixo cai no padrão (tudo ligado), sem quebrar', () => {
    localStorage.setItem('tradezen_filtro_padroes', 'isso não é json');

    expect(lerFiltroSalvo()).toHaveLength(PADROES_DO_FILTRO.filter((p) => !p.emBreve).length);
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

// A lista existe pra o analista ver, sem sair da tela, o que já marcou
// naquele ativo — e pra o que acabou de salvar aparecer na hora.
describe('Lista dos padrões marcados no ativo', () => {
  const salvos = [
    { id: 'oco-1', templateId: 7, icone: '🔴', rotulo: 'OCO', data: '2026-02-04', resultado: 'sucesso', rota: '/admin/templates' },
    { id: 'ba-2', templateId: 9, icone: '🟢', rotulo: 'Bandeira de Alta', data: '2026-03-10', resultado: 'falha', rota: '/admin/templates/bandeira-alta' },
    { id: 'td-3', templateId: 11, icone: '🔴', rotulo: 'Topo Duplo', data: '2026-01-02', resultado: null, rota: '/admin/templates/topo-duplo' },
  ];

  beforeEach(() => localStorage.clear());

  it('sem nada marcado, a seção não aparece', () => {
    montar({ salvos: [] });

    expect(screen.queryByText('Marcados neste ativo')).not.toBeInTheDocument();
  });

  it('lista emoji, nome e data de cada padrão, do mais recente pro mais antigo', () => {
    montar({ salvos });

    expect(screen.getByText('Marcados neste ativo')).toBeInTheDocument();
    const itens = document.querySelectorAll('.filtro-salvo');
    expect([...itens].map((i) => i.querySelector('strong').textContent))
      .toEqual(['Bandeira de Alta', 'OCO', 'Topo Duplo']);
    expect(within(itens[1]).getByText('04/02/2026')).toBeInTheDocument();
    expect(within(itens[1]).getByText('🔴')).toBeInTheDocument();
  });

  it('traduz o resultado em Sucesso, Falha ou Indefinido', () => {
    montar({ salvos });

    const itens = [...document.querySelectorAll('.filtro-salvo')];
    const resultado = (nome) => itens.find((i) => i.querySelector('strong').textContent === nome)
      .querySelector('.filtro-salvo-resultado');
    expect(resultado('OCO')).toHaveTextContent('Sucesso');
    expect(resultado('Bandeira de Alta')).toHaveTextContent('Falha');
    // sem resultado preenchido ainda: não inventa nem deixa em branco
    expect(resultado('Topo Duplo')).toHaveTextContent('Indefinido');
  });

  it('clicar num item abre aquele padrão em modo visualizar', () => {
    montar({ salvos });

    const oco = [...document.querySelectorAll('.filtro-salvo')]
      .find((i) => i.querySelector('strong').textContent === 'OCO');
    expect(oco).toHaveAttribute('href', '/admin/templates?modo=visualizar&id=7');
  });

  it('o que acabou de ser salvo fica destacado', () => {
    montar({ salvos, destacado: 9 });

    const destacado = document.querySelectorAll('.filtro-salvo.novo');
    expect(destacado).toHaveLength(1);
    expect(destacado[0].querySelector('strong')).toHaveTextContent('Bandeira de Alta');
  });

  it('data inválida não quebra a lista', () => {
    montar({ salvos: [{ id: 'x', templateId: 1, icone: '🔴', rotulo: 'OCO', data: 'sei lá', rota: '/admin/templates' }] });

    expect(within(document.querySelector('.filtro-salvo')).getByText('—')).toBeInTheDocument();
  });
});
