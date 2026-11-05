import { fireEvent, render, screen, within } from '@testing-library/react';
import BarraStatusRevisao from '../admin/BarraStatusRevisao.jsx';
import ListaTemplates from '../admin/ListaTemplates.jsx';
import {
  FILTROS, STATUS_DE_CLIQUE, contarPorFiltro, filtrar, proximoStatus, statusDe,
} from '../admin/statusRevisao.js';

// Os cinco status, e a diferença entre dois deles é o ponto da feature:
//   `aberto` → PASSOU pelos olhos. Entra sozinho e não afirma nada.
//   `visto`  → "está OK, não precisa mexer". É julgamento, e é clique.
// Marcar `visto` sozinho encheria o treino de aprovação que ninguém deu.

describe('Os três status são exclusivos entre si', () => {
  const montar = (status) => {
    const aoMudar = vi.fn();
    const aoFechar = vi.fn();
    render(
      <BarraStatusRevisao titulo="Visualizando #215 — EZTC3.SA · 1d"
        status={status} aoMudar={aoMudar} aoFechar={aoFechar} />,
    );
    return { aoMudar, aoFechar };
  };

  // Caixinha que desmarca as outras ao ser marcada mente sobre o que é, e
  // quem usa teclado ou leitor de tela recebe a mentira primeiro.
  it('são grupo de rádio, não caixinhas', () => {
    montar('visto');

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('só um fica aceso, e é o do status atual', () => {
    montar('em_andamento');

    const acesos = screen.getAllByRole('radio').filter((b) => b.getAttribute('aria-checked') === 'true');
    expect(acesos).toHaveLength(1);
    expect(acesos[0]).toHaveTextContent('Em andamento');
  });

  it.each(STATUS_DE_CLIQUE.map((s) => [s.rotulo, s.id]))('clicar em %s pede o status %s', (rotulo, id) => {
    const { aoMudar } = montar('nao_visto');

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(rotulo) }));

    expect(aoMudar).toHaveBeenCalledWith(id);
  });

  // Desmarcar volta pra `aberto` e não pra `nao_visto`: a marcação FOI
  // aberta, e dizer que não foi seria apagar um fato.
  it('clicar no aceso desmarca, voltando pra "aberto"', () => {
    const { aoMudar } = montar('visto');

    fireEvent.click(screen.getByRole('radio', { name: /Visto/ }));

    expect(aoMudar).toHaveBeenCalledWith('aberto');
  });

  it('só o aceso entra na ordem do Tab — é como rádio se comporta', () => {
    montar('revisto');

    const naOrdem = screen.getAllByRole('radio').filter((b) => b.tabIndex === 0);
    expect(naOrdem).toHaveLength(1);
    expect(naOrdem[0]).toHaveTextContent('Revisto');
  });

  it('as setas do teclado andam entre os três', () => {
    const { aoMudar } = montar('visto');

    fireEvent.keyDown(screen.getByRole('radio', { name: /Visto/ }), { key: 'ArrowRight' });

    expect(aoMudar).toHaveBeenCalledWith('em_andamento');
  });

  it('o ✕ fecha e fica fora da fila dos status', () => {
    const { aoFechar, aoMudar } = montar('visto');

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(aoFechar).toHaveBeenCalled();
    expect(aoMudar).not.toHaveBeenCalled();
    // não é um dos rádios: ao lado de "Revisto" virava o mais fácil de
    // acertar por engano
    expect(within(screen.getByRole('radiogroup')).queryByLabelText('Fechar')).toBeNull();
  });

  // Sem a migration 025 não há onde gravar. Botão que aceita o clique e
  // perde a marcação em silêncio é pior que botão nenhum.
  it('indisponível: sem botões de status, e o motivo é o que chegou', () => {
    render(<BarraStatusRevisao titulo="x" status="nao_visto" indisponivel
      motivo="Rode backend/sql/025_status_revisao.sql no SQL Editor."
      aoMudar={vi.fn()} aoFechar={vi.fn()} />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText(/025_status_revisao\.sql/)).toBeInTheDocument();
    // e ainda dá pra fechar
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  // Não é sempre a migration: pode ser rede. Dizer "migration" numa falha
  // de rede manda consertar o que já está certo.
  it('o motivo não é cravado na tela — falha de rede diz falha de rede', () => {
    render(<BarraStatusRevisao titulo="x" status="nao_visto" indisponivel
      motivo="O navegador não conseguiu falar com o servidor."
      aoMudar={vi.fn()} aoFechar={vi.fn()} />);

    expect(screen.getByText(/não conseguiu falar com o servidor/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/migration/i);
  });

  it('dá pra tentar de novo sem recarregar a página', () => {
    const aoTentarDeNovo = vi.fn();
    render(<BarraStatusRevisao titulo="x" status="nao_visto" indisponivel
      motivo="falhou" aoTentarDeNovo={aoTentarDeNovo}
      aoMudar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(aoTentarDeNovo).toHaveBeenCalled();
  });
});

describe('proximoStatus', () => {
  it('status novo substitui o anterior — nunca os dois juntos', () => {
    expect(proximoStatus('visto', 'revisto')).toBe('revisto');
    expect(proximoStatus('em_andamento', 'visto')).toBe('visto');
  });

  it('o mesmo desmarca pra "aberto"', () => {
    expect(proximoStatus('revisto', 'revisto')).toBe('aberto');
  });
});

describe('Filtros e contagem', () => {
  const templates = [
    { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
  ];
  const mapa = {
    1: { status: 'nao_visto' }, 2: { status: 'aberto' },
    3: { status: 'visto' }, 4: { status: 'em_andamento' }, 5: { status: 'revisto' },
  };

  it('id sem entrada no mapa é "nao_visto"', () => {
    expect(statusDe({}, 99)).toBe('nao_visto');
    expect(statusDe(null, 1)).toBe('nao_visto');
  });

  // `aberto` conta como pendente porque ABRIR não resolveu nada — é
  // exatamente o que ficou pela metade.
  it('"Falta decidir" junta não vistos e abertos', () => {
    expect(contarPorFiltro(templates, mapa).pendentes).toBe(2);
    expect(filtrar(templates, mapa, 'pendentes').map((t) => t.id)).toEqual([1, 2]);
  });

  it('cada filtro conta o seu', () => {
    const c = contarPorFiltro(templates, mapa);
    expect(c).toMatchObject({ todos: 5, pendentes: 2, em_andamento: 1, visto: 1, revisto: 1 });
  });

  it('"Todos" devolve a lista inteira', () => {
    expect(filtrar(templates, mapa, 'todos')).toHaveLength(5);
  });

  it('filtro desconhecido não esconde nada', () => {
    expect(filtrar(templates, mapa, 'inventado')).toHaveLength(5);
  });

  it('o primeiro filtro é o que falta revisar, não "Todos" sozinho', () => {
    expect(FILTROS[0].id).toBe('todos');
    expect(FILTROS[1].id).toBe('pendentes');
  });
});

describe('Selos na listagem', () => {
  const templates = [
    { id: 1, ticker: 'A.SA', timeframe: '1D', criado_em: '2026-10-01' },
    { id: 2, ticker: 'B.SA', timeframe: '1D', criado_em: '2026-10-01' },
  ];
  const montar = (statusMapa) => render(
    <ListaTemplates templates={templates} rotulo="Bandeira de Alta" statusMapa={statusMapa}
      aoVisualizar={vi.fn()} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
  );

  beforeEach(() => localStorage.clear());

  it('o card mostra o selo do seu status', () => {
    montar({ 1: { status: 'revisto' }, 2: { status: 'em_andamento' } });

    const cards = [...document.querySelectorAll('.admin-card-item')];
    expect(within(cards[0]).getByText(/Revisto/)).toBeInTheDocument();
    expect(within(cards[1]).getByText(/Em andamento/)).toBeInTheDocument();
  });

  it('a faixa na borda esquerda acompanha o status', () => {
    montar({ 1: { status: 'revisto' }, 2: { status: 'visto' } });

    const cards = [...document.querySelectorAll('.admin-card-item')];
    expect(cards[0]).toHaveClass('sr-borda-revisto');
    expect(cards[1]).toHaveClass('sr-borda-visto');
  });

  it('"aberto" tem selo discreto — não afirma que está certa', () => {
    montar({ 1: { status: 'aberto' } });

    expect(document.querySelector('.sr-aberto')).toBeInTheDocument();
    // e não ganha faixa colorida na borda: não é uma decisão
    expect(document.querySelector('.sr-borda-aberto')).toBeNull();
  });

  it('filtrar muda a lista e o título diz "N de M"', () => {
    montar({ 1: { status: 'revisto' }, 2: { status: 'nao_visto' } });

    fireEvent.click(screen.getByRole('button', { name: /Revistos/ }));

    expect(document.querySelectorAll('.admin-card-item')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: /1 de 2/ })).toBeInTheDocument();
  });

  // Com o filtro ligado a numeração passa a ser a da lista VISÍVEL: é a
  // posição no que está na tela, que é o que se usa pra se localizar.
  it('a numeração segue a lista filtrada', () => {
    montar({ 1: { status: 'nao_visto' }, 2: { status: 'revisto' } });

    fireEvent.click(screen.getByRole('button', { name: /Revistos/ }));

    expect(document.querySelector('.lt-numero').textContent).toBe('#1/1');
  });

  // Sem a migration 025 o mapa vem vazio. A lista é o que mais importa na
  // tela: ela não pode sumir por causa de um enfeite.
  it('sem status, a lista aparece inteira e sem filtros', () => {
    montar({});

    expect(document.querySelectorAll('.admin-card-item')).toHaveLength(2);
    expect(document.querySelector('.sr-filtros')).toBeNull();
    expect(document.querySelector('.sr-badge')).toBeNull();
  });

  it('statusMapa ausente também não quebra', () => {
    expect(() => montar(null)).not.toThrow();
    expect(document.querySelectorAll('.admin-card-item')).toHaveLength(2);
  });
});
