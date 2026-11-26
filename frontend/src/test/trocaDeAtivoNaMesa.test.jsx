import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './helpers.jsx';

/**
 * A BUSCA DE DENTRO DA MESA É A MESMA DO TOPO DO SITE.
 *
 * Havia duas: o SearchBar do topo, com categorias, apelidos e mais
 * voláteis, e um AssetSwitcher próprio aqui dentro — plano, sem
 * categoria. A pior das duas estava no lugar onde mais se troca de
 * ativo. Agora é uma só, e estes testes seguem exigindo dela o que já se
 * exigia da antiga.
 *
 * A BUSCA DE DENTRO DA MESA ENXERGA O CATÁLOGO INTEIRO.
 *
 * Ela recebia `mercado`, que é a resposta de /mercado — o resumo da tela
 * inicial, só com os ativos marcados `resumo: True`. São 69 dos 283. A
 * busca do topo nunca teve esse problema porque usa /ativos.
 *
 * O efeito prático do relato: ativo com padrão já marcado não aparecia na
 * hora de trocar o ativo da mesa.
 */

const NO_RESUMO = [
  { ticker: 'PETR4.SA', nome: 'Petrobras PN', simbolo: 'PETR4', mercado: 'B3',
    variacao_pct: 1.2, alta: true },
];
const NO_CATALOGO = [
  ...NO_RESUMO.map(({ variacao_pct, alta, ...resto }) => resto),
  { ticker: 'DIRR3.SA', nome: 'Direcional', simbolo: 'DIRR3', mercado: 'B3' },
  { ticker: 'UNI7083-USD', nome: 'Uniswap', simbolo: 'UNI', mercado: 'CRIPTO' },
];

const original = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.includes('/ativos/buscar')) {
      // Respeita o q, como o backend real: o SearchBar delega a busca
      // livre pro servidor, então um fake que devolve tudo faria o teste
      // de filtro passar sem filtrar nada.
      const q = decodeURIComponent((u.split('q=')[1] || '')).toLowerCase();
      const achados = NO_CATALOGO.filter((a) =>
        [a.ticker, a.simbolo, a.nome].some((c) => c.toLowerCase().includes(q)));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ resultados: achados }) });
    }
    if (u.endsWith('/ativos')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ativos: NO_CATALOGO }) });
    }
    if (u.includes('/mercado')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ dados: NO_RESUMO }) });
    }
    if (u.includes('/ativo/')) {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({
          candles: Array.from({ length: 30 }, (_, i) => ({
            timestamp: (1700000000 + i * 86400) * 1000, data: '2026-01-01 00:00',
            abertura: 10, maxima: 11, minima: 9, fechamento: 10.5, volume: 10,
          })),
          niveis: [],
        }),
      });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  });
});

afterEach(() => { global.fetch = original; });

const abrirTroca = async () => {
  renderApp('/ativo/PETR4.SA');
  const titulo = await waitFor(() => {
    const el = document.querySelector('.atick');
    expect(el).not.toBeNull();
    return el;
  }, { timeout: 8000 });
  fireEvent.click(titulo);
  await waitFor(() => expect(document.querySelector('.search input')).not.toBeNull(),
    { timeout: 8000 });
};

const digitar = (texto) =>
  fireEvent.change(document.querySelector('.search input'), { target: { value: texto } });

describe('trocar o ativo da mesa', () => {
  it('oferece ativos que não estão no resumo da home', async () => {
    await abrirTroca();
    // DIRR3 só existe no catálogo (/ativos e /ativos/buscar), não no
    // resumo (/mercado). Era exatamente esse o buraco.
    digitar('DIRR');
    await waitFor(() => expect(screen.getByText('DIRR3')).toBeInTheDocument(), { timeout: 8000 });
  }, 20000);

  it('busca pelo nome também, não só pelo símbolo', async () => {
    await abrirTroca();
    digitar('uniswap');
    await waitFor(() => expect(screen.getByText('UNI')).toBeInTheDocument(), { timeout: 8000 });
    expect(screen.queryByText('DIRR3')).toBeNull();
  }, 20000);

  // Mostrar "▼0,00%" num ativo sem cotação carregada afirmaria que ele
  // não se mexeu hoje, o que é diferente de não termos o número. A
  // garantia continua; o jeito mudou: na busca livre o SearchBar mostra o
  // SELO da categoria, que é o que ajuda a achar o ativo, e os números
  // aparecem na lista de mais voláteis, onde são o assunto.
  it('não inventa variação pra nenhum ativo da lista', async () => {
    await abrirTroca();
    digitar('DIRR');
    await waitFor(() => expect(screen.getByText('DIRR3')).toBeInTheDocument(), { timeout: 8000 });
    const linhas = [...document.querySelectorAll('.search-item')];
    expect(linhas.length).toBeGreaterThan(0);
    for (const l of linhas) expect(l.textContent).not.toMatch(/0[.,]00%/);
  }, 20000);

  // ── O QUE O PEDIDO QUERIA DE VOLTA: as categorias ──
  it('tem as sete pílulas de categoria, que a busca própria não tinha', async () => {
    await abrirTroca();
    const chips = await waitFor(() => {
      const c = [...document.querySelectorAll('.search-chip')];
      expect(c.length).toBeGreaterThan(0);
      return c;
    }, { timeout: 8000 });

    expect(chips.map((c) => c.textContent)).toEqual(
      ['Todos', 'Ações BR', 'Ações EUA', 'Moedas', 'Cripto', 'Commodities', 'Índices']);
  }, 20000);

  it('a pílula de uma categoria filtra a lista', async () => {
    await abrirTroca();
    const cripto = await waitFor(() => {
      const c = [...document.querySelectorAll('.search-chip')].find((x) => x.textContent === 'Cripto');
      expect(c).toBeTruthy();
      return c;
    }, { timeout: 8000 });

    fireEvent.click(cripto);
    // UNI é a única cripto do catálogo falso e está nos destaques da
    // categoria; DIRR3 é B3 e não pode aparecer aqui.
    await waitFor(() => expect(screen.getByText('UNI')).toBeInTheDocument(), { timeout: 8000 });
    expect(screen.queryByText('DIRR3')).toBeNull();
  }, 20000);
});
