import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FiltroPadroes from '../admin/FiltroPadroes.jsx';
import { DISPONIVEIS, PADROES_DO_FILTRO, filtroInicial } from '../lib/filtroPadroes.js';

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

  it('os 19 padrões aparecem na lista', () => {
    montar();
    expect(caixas()).toHaveLength(19);
  });

  it('abre com só o padrão da tela ligado', () => {
    // na hora de marcar o que se precisa ver é o preço, não o gráfico
    // coberto de emoji dos outros padrões
    const ligados = filtroInicial('canal_alta');
    montar({ ligados });

    expect(ligados).toEqual(['canal_alta']);
    expect(caixas().filter((c) => c.checked)).toHaveLength(1);
    expect(screen.getByText('Canal de Alta').closest('label').querySelector('input').checked).toBe(true);
  });

  it('cada tela abre com o seu padrão', () => {
    expect(filtroInicial('topo_duplo')).toEqual(['topo_duplo']);
    expect(filtroInicial('retangulo')).toEqual(['retangulo']);
    expect(filtroInicial('niveis')).toEqual(['niveis']);
    // id que não existe não liga nada, em vez de quebrar
    expect(filtroInicial('padrao_que_nao_existe')).toEqual([]);
    expect(DISPONIVEIS).toHaveLength(PADROES_DO_FILTRO.filter((p) => !p.emBreve).length);
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

  it('todos têm tela de marcação: nenhum fica como "(em breve)"', () => {
    montar();

    // os oito últimos (fundo duplo, OCO invertido, triplos, triângulos e
    // retângulo) deixaram de ser "em breve" quando ganharam tela
    expect(screen.queryByText('(em breve)')).not.toBeInTheDocument();
    expect(caixas().every((c) => !c.disabled)).toBe(true);
    for (const nome of ['Fundo Duplo', 'OCO Invertido', 'Topo Triplo', 'Fundo Triplo',
      'Triângulo Asc.', 'Triângulo Desc.', 'Triângulo Sim.', 'Retângulo']) {
      expect(screen.getByText(nome)).toBeInTheDocument();
    }
  });

  it('mostra quantos templates já existem naquele ativo', () => {
    montar({ contagem: { oco: 3 } });

    expect(within(screen.getByText('OCO').closest('label')).getByText('3')).toBeInTheDocument();
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
    { id: 'oco-1', templateId: 7, icone: '🔴', rotulo: 'OCO', data: '2026-02-04', criadoEm: '2026-10-02T10:00:00Z', resultado: 'sucesso', rota: '/admin/templates' },
    { id: 'ba-2', templateId: 9, icone: '🟢', rotulo: 'Bandeira de Alta', data: '2026-03-10', criadoEm: '2026-10-03T10:00:00Z', resultado: 'falha', rota: '/admin/templates/bandeira-alta' },
    { id: 'td-3', templateId: 11, icone: '🔴', rotulo: 'Topo Duplo', data: '2026-01-02', criadoEm: '2026-10-01T10:00:00Z', resultado: null, rota: '/admin/templates/topo-duplo' },
  ];

  beforeEach(() => localStorage.clear());

  it('sem nada marcado, a seção não aparece', () => {
    montar({ salvos: [] });

    expect(screen.queryByText('Marcados neste ativo')).not.toBeInTheDocument();
  });

  it('lista emoji, nome e data, com o salvo mais recentemente no topo', () => {
    montar({ salvos });

    expect(screen.getByText('Marcados neste ativo')).toBeInTheDocument();
    const itens = document.querySelectorAll('.filtro-salvo');
    // ordem por quando foi MARCADO (criadoEm), não pela data do padrão no
    // gráfico: um padrão de 2018 salvo agora aparece em primeiro
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

  it('um padrão antigo salvo agora vai pro topo', () => {
    const antigoSalvoAgora = { id: 'x-9', templateId: 42, icone: '⛰️', rotulo: 'OCO',
      data: '2018-05-02', criadoEm: '2026-10-09T23:00:00Z', rota: '/admin/templates' };
    montar({ salvos: [...salvos, antigoSalvoAgora] });

    expect(document.querySelector('.filtro-salvo strong').textContent).toBe('OCO');
    expect(document.querySelector('.filtro-salvo .filtro-salvo-texto span').textContent).toBe('02/05/2018');
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
