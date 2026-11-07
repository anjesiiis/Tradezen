import { fireEvent, render, screen, within } from '@testing-library/react';
import ListaTemplates from '../admin/ListaTemplates.jsx';
import { chaveDaLista, lerUltimoVisto, posicaoNaLista } from '../admin/ultimoVisto.js';

// Revisar 212 marcações não se faz numa sentada. Duas coisas resolvem
// isso: o número (#47/212) diz onde se está, e o marcador diz onde se
// parou — e sobrevive ao F5.

const fazerTemplates = (n) => Array.from({ length: n }, (_, i) => ({
  id: 100 + i, ticker: `T${i}.SA`, timeframe: '1D', criado_em: '2026-10-01',
}));

const montar = (props = {}) => {
  const aoVisualizar = vi.fn();
  const utils = render(
    <ListaTemplates
      templates={fazerTemplates(3)} rotulo="Bandeira de Alta"
      aoVisualizar={aoVisualizar} aoEditar={vi.fn()} aoExcluir={vi.fn()}
      {...props}
    />,
  );
  return { ...utils, aoVisualizar };
};

const cards = () => [...document.querySelectorAll('.admin-card-item')];
const numeros = () => [...document.querySelectorAll('.lt-numero')].map((e) => e.textContent);

describe('Numeração dos cards', () => {
  beforeEach(() => localStorage.clear());

  it('cada card diz a posição e o total', () => {
    montar();
    expect(numeros()).toEqual(['#1/3', '#2/3', '#3/3']);
  });

  it('o total acompanha o tamanho da lista', () => {
    montar({ templates: fazerTemplates(212) });
    expect(numeros()[46]).toBe('#47/212');
    expect(numeros()).toHaveLength(212);
  });

  // O leitor de tela não deve ler "hashtag um barra três"
  it('o número é anunciado em palavras pra quem usa leitor de tela', () => {
    montar();
    expect(screen.getByLabelText('Marcação 1 de 3')).toBeInTheDocument();
  });

  it('lista vazia não mostra número nenhum', () => {
    montar({ templates: [] });
    expect(numeros()).toEqual([]);
    expect(screen.getByText(/Nenhum template ainda/)).toBeInTheDocument();
  });
});

describe('Marcador de onde parei', () => {
  beforeEach(() => localStorage.clear());

  it('sem nada aberto antes, não há marcador nem atalho', () => {
    montar();
    expect(document.querySelector('.lt-selo')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continuar de onde parei/ })).not.toBeInTheDocument();
  });

  it('abrir um template grava o marcador', () => {
    const { rerender } = montar();

    rerender(
      <ListaTemplates templates={fazerTemplates(3)} rotulo="Bandeira de Alta" abertoId={101}
        aoVisualizar={vi.fn()} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
    );

    expect(lerUltimoVisto('Bandeira de Alta')).toBe(101);
  });

  it('fechado, o card marcado ganha selo e borda', () => {
    // é o que o localStorage traria depois do F5
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 101 }));

    montar();

    expect(within(cards()[1]).getByText(/Você parou aqui/)).toBeInTheDocument();
    expect(cards()[1]).toHaveClass('lt-marcado');
    expect(cards()[0]).not.toHaveClass('lt-marcado');
  });

  // Este teste dizia o contrário: com o gráfico aberto, o selo sumia, com
  // o argumento de que o marcador é "pra voltar, não pra enquanto se
  // olha". Mudou por pedido do dono do projeto, e o pedido tem razão: a
  // borda é um "você está aqui", e o momento em que ela mais serve é o
  // momento em que você está olhando o card. O que continua escondido é o
  // BOTÃO de retomar, que ofereceria ir pra onde já se está.
  it('com o template aberto, o marcador fica e só o botão sai', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 101 }));
    montar({ abertoId: 101 });

    expect(document.querySelector('.lt-selo')).not.toBeNull();
    expect(document.querySelector('.lt-marcado')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Continuar de onde parei/ })).not.toBeInTheDocument();
  });

  it('o atalho do topo mostra a posição e abre aquele template', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 102 }));
    const { aoVisualizar } = montar();

    const botao = screen.getByRole('button', { name: /Continuar de onde parei \(#3\)/ });
    fireEvent.click(botao);

    expect(aoVisualizar).toHaveBeenCalledWith(expect.objectContaining({ id: 102 }));
  });

  it('limpar marcador apaga o selo e o storage', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 101 }));
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar marcador' }));

    expect(document.querySelector('.lt-selo')).toBeNull();
    expect(lerUltimoVisto('Bandeira de Alta')).toBeNull();
  });

  // O caso de ter apagado, ou movido pro outro lado (mover-para-fracasso):
  // o id não está mais aqui. Apontar pro card daquela posição marcaria o
  // template ERRADO, porque os números todos andaram quando ele saiu.
  it('marcador de template que saiu da lista simplesmente não aparece', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 999 }));
    montar();

    expect(document.querySelector('.lt-selo')).toBeNull();
    expect(document.querySelector('.lt-marcado')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continuar/ })).not.toBeInTheDocument();
  });

  // Bandeira de Alta e Topo Duplo são revisões separadas. Um marcador só
  // apontaria pra um id que nem existe na outra lista.
  it('cada lista tem o seu marcador', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({
      'bandeira-de-alta': 101, 'topo-duplo': 102,
    }));

    montar({ rotulo: 'Topo Duplo' });

    expect(within(cards()[2]).getByText(/Você parou aqui/)).toBeInTheDocument();
    expect(cards()[1]).not.toHaveClass('lt-marcado');
  });

  it('a tela de fracasso não divide marcador com a de padrão', () => {
    expect(chaveDaLista('Bandeira de Alta')).not.toBe(chaveDaLista('Fracassos — Bandeira de Alta'));
    expect(chaveDaLista('Bandeira de Alta')).toBe('bandeira-de-alta');
  });

  it('storage bloqueado não derruba a lista', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('bloqueado'); };
    try {
      expect(() => montar()).not.toThrow();
      expect(numeros()).toHaveLength(3);
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it('JSON estragado no storage é ignorado', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', '{nao é json');
    expect(() => montar()).not.toThrow();
    expect(document.querySelector('.lt-selo')).toBeNull();
  });
});

describe('Rolar de volta ao fechar', () => {
  let rolagens;
  beforeEach(() => {
    localStorage.clear();
    rolagens = [];
    Element.prototype.scrollIntoView = function (o) { rolagens.push(o); };
  });
  afterEach(() => { delete Element.prototype.scrollIntoView; });

  const tela = (abertoId) => (
    <ListaTemplates templates={fazerTemplates(3)} rotulo="Bandeira de Alta" abertoId={abertoId}
      aoVisualizar={vi.fn()} aoEditar={vi.fn()} aoExcluir={vi.fn()} />
  );

  it('fechar o template rola até o card, centralizado', () => {
    const { rerender } = render(tela(101));

    rerender(tela(null));

    expect(rolagens).toHaveLength(1);
    expect(rolagens[0].block).toBe('center');
  });

  // Entrar na página com marcador de ontem NÃO deve arrastar a tela pra
  // baixo sozinho: a pessoa veio ver o gráfico, não a lista.
  it('abrir a página com marcador antigo não rola nada', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 101 }));

    render(tela(null));

    expect(rolagens).toHaveLength(0);
  });

  it('abrir um template não rola a lista', () => {
    const { rerender } = render(tela(null));
    rerender(tela(101));
    expect(rolagens).toHaveLength(0);
  });
});

describe('Posição na lista', () => {
  const lista = fazerTemplates(3);

  it('é 1-based, como o card mostra', () => {
    expect(posicaoNaLista(lista, 100)).toBe(1);
    expect(posicaoNaLista(lista, 102)).toBe(3);
  });

  // O id vem número do banco e pode voltar texto do localStorage: "101"
  // tem que achar o 101, senão o marcador nunca acende.
  it('acha o id mesmo vindo como texto do storage', () => {
    expect(posicaoNaLista(lista, '101')).toBe(2);
  });

  it('id que não está na lista é 0', () => {
    expect(posicaoNaLista(lista, 999)).toBe(0);
    expect(posicaoNaLista(lista, null)).toBe(0);
    expect(posicaoNaLista(undefined, 100)).toBe(0);
  });
});

// A BORDA AMARELA É UM "VOCÊ ESTÁ AQUI"
// =====================================
//
// Então ela não pode se apagar sozinha. Duas coisas a apagavam:
//   • o card sair do filtro (avaliar um card no filtro "Sem avaliação",
//     ou chegar nesse filtro com o último visto já avaliado);
//   • ter um template aberto.
// As duas davam a mesma impressão: o marcador some e não há como saber
// onde se parou.
describe('A borda amarela do último visualizado não se apaga', () => {
  beforeEach(() => localStorage.clear());

  const T = fazerTemplates(3);
  const semNota = Object.fromEntries(T.map((t) => [t.id, { qualidade: null }]));

  const montarComQualidade = (props = {}) => render(
    <ListaTemplates
      templates={T} rotulo="Bandeira de Alta"
      aoVisualizar={vi.fn()} aoEditar={vi.fn()} aoExcluir={vi.fn()}
      qualidadeMapa={semNota}
      {...props}
    />,
  );

  it('o card marcado fica na lista mesmo não cabendo no filtro', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 101 }));
    // o #101 tem nota, e o filtro padrão é "Sem avaliação": antes ele
    // desaparecia, levando a borda com ele
    montarComQualidade({
      qualidadeMapa: { ...semNota, 101: { qualidade: 4 } },
    });

    const marcado = document.querySelector('.lt-marcado');
    expect(marcado).not.toBeNull();
    expect(within(marcado).getByText('T1.SA')).toBeInTheDocument();
  });

  it('e volta pra posição original, não pro fim da lista', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 101 }));
    montarComQualidade({ qualidadeMapa: { ...semNota, 101: { qualidade: 4 } } });

    // T0, T1 (o reinserido), T2 — na ordem de sempre
    expect(cards().map((c) => c.querySelector('strong').textContent))
      .toEqual(['T0.SA', 'T1.SA', 'T2.SA']);
  });

  it('a borda continua com um template aberto', () => {
    localStorage.setItem('tradezen-admin-ultimo-visto', JSON.stringify({ 'bandeira-de-alta': 101 }));
    montarComQualidade({ abertoId: 101 });

    expect(cards()[1]).toHaveClass('lt-marcado');
    // mas o botão de retomar não: ele ofereceria ir pra onde já se está
    expect(screen.queryByRole('button', { name: /Continuar/ })).not.toBeInTheDocument();
  });

  it('a borda acompanha a troca: abriu outro, é outro o amarelo', () => {
    const { rerender } = montarComQualidade({ abertoId: 101 });
    expect(cards()[1]).toHaveClass('lt-marcado');

    rerender(
      <ListaTemplates
        templates={T} rotulo="Bandeira de Alta"
        aoVisualizar={vi.fn()} aoEditar={vi.fn()} aoExcluir={vi.fn()}
        qualidadeMapa={semNota} abertoId={102}
      />,
    );
    expect(cards()[2]).toHaveClass('lt-marcado');
    expect(cards()[1]).not.toHaveClass('lt-marcado');
    expect(lerUltimoVisto('Bandeira de Alta')).toBe(102);
  });
});
