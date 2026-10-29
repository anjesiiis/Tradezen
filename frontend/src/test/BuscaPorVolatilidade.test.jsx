import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar.jsx';
import { GRUPO_DA_CATEGORIA, esquecerTopVolateis } from '../lib/topVolateis.js';

/**
 * A lista padrão da busca deixou de ser uma seleção fixa e virou o
 * ranking do dia: quem abre a busca sem saber o que procurar quer ver
 * onde o preço se mexeu.
 *
 * "Mais volátil" é AMPLITUDE — (máxima − mínima) ÷ abertura — não
 * direção. Por isso cada linha mostra as duas coisas.
 */

const CATALOGO = [
  { ticker: 'PETR4.SA', simbolo: 'PETR4', nome: 'Petrobras PN', mercado: 'B3' },
  { ticker: 'MGLU3.SA', simbolo: 'MGLU3', nome: 'Magazine Luiza ON', mercado: 'B3' },
  { ticker: 'AAPL', simbolo: 'AAPL', nome: 'Apple', mercado: 'NASDAQ' },
  { ticker: 'BTC-USD', simbolo: 'BTC', nome: 'Bitcoin', mercado: 'CRIPTO' },
];

const volatil = (ticker, vol, varia) => ({
  ticker, simbolo: ticker, nome: ticker, moeda: 'BRL',
  preco: 10, maxima: 11, minima: 9,
  volatilidade_pct: vol, variacao_pct: varia,
});

const respostaDe = (url) => {
  if (url.includes('/mercados/top-volateis/b3')) {
    return { top: [volatil('MGLU3.SA', 14.31, -10), volatil('PETR4.SA', 3.2, 1.5)] };
  }
  if (url.includes('/mercados/top-volateis/cripto')) {
    return { top: [volatil('BTC-USD', 7.5, -2)] };
  }
  if (url.includes('/mercados/top-volateis/')) return { top: [] };
  if (url.includes('/ativos/buscar')) return { resultados: [] };
  return { ativos: CATALOGO };
};

const montar = () => {
  const onSelect = vi.fn();
  render(
    <MemoryRouter><SearchBar onSelect={onSelect} mercado={CATALOGO}/></MemoryRouter>,
  );
  return { onSelect, input: screen.getByLabelText('Buscar ativo') };
};

describe('Busca — ranking do dia por categoria', () => {
  beforeEach(() => {
    esquecerTopVolateis();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
      ok: true, json: async () => respostaDe(String(url)),
    }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('cada pílula tem um universo próprio no servidor', () => {
    expect(GRUPO_DA_CATEGORIA.acoes_br).toBe('b3');
    expect(GRUPO_DA_CATEGORIA.acoes_eua).toBe('eua');
    expect(GRUPO_DA_CATEGORIA.commodities).toBe('commodity');
    // "Todos" fica de fora: juntar os seis rankings daria uma lista em
    // que a cripto ganha sempre
    expect(GRUPO_DA_CATEGORIA.todos).toBeUndefined();
  });

  it('abre mostrando os mais voláteis da B3, na ordem do servidor', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);

    await waitFor(() => expect(screen.getByText('Magazine Luiza ON')).toBeInTheDocument());
    const linhas = [...document.querySelectorAll('.search-item .search-ticker')];
    expect(linhas.map((l) => l.textContent)).toEqual(['MGLU3', 'PETR4']);
  });

  it('diz que a lista é um ranking, e qual é o critério', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);

    expect(await screen.findByText('Mais voláteis hoje')).toBeInTheDocument();
    expect(screen.getByText(/amplitude do dia/)).toBeInTheDocument();
  });

  // Amplitude sem direção engana: 14% pode ser alta, queda, ou um dia que
  // subiu e desceu e fechou no mesmo lugar
  it('cada linha mostra amplitude e direção', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);

    expect(await screen.findByText('↕ 14.31%')).toBeInTheDocument();
    expect(screen.getByText('▼ 10.00%')).toBeInTheDocument();
  });

  it('trocar de pílula troca o universo', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);
    await screen.findByText('Magazine Luiza ON');

    await user.click(screen.getByRole('button', { name: 'Cripto' }));
    await waitFor(() => expect(screen.getByText('Bitcoin')).toBeInTheDocument());
    expect(screen.queryByText('Magazine Luiza ON')).not.toBeInTheDocument();
  });

  // Reabrir não pode esperar pela rede de novo
  it('voltar pra uma pílula já vista não busca de novo', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);
    await screen.findByText('Magazine Luiza ON');

    const idasB3 = () => globalThis.fetch.mock.calls
      .filter(([u]) => String(u).includes('top-volateis/b3')).length;
    expect(idasB3()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Cripto' }));
    await screen.findByText('Bitcoin');
    await user.click(screen.getByRole('button', { name: 'Ações BR' }));
    await screen.findByText('Magazine Luiza ON');

    expect(idasB3()).toBe(1);
  });

  it('escolher uma linha devolve o ativo do CATÁLOGO, que é o que abre o gráfico', async () => {
    const user = userEvent.setup();
    const { onSelect, input } = montar();
    await user.click(input);
    await screen.findByText('Magazine Luiza ON');

    await user.click(screen.getByText('Magazine Luiza ON'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      ticker: 'MGLU3.SA', mercado: 'B3',
    }));
  });

  // Servidor fora do ar não pode deixar a busca vazia
  it('sem ranking, cai nos destaques em vez de tela vazia', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).includes('top-volateis')) throw new Error('sem rede');
      return { ok: true, json: async () => respostaDe(String(url)) };
    });
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);

    await waitFor(() => expect(document.querySelectorAll('.search-item').length).toBeGreaterThan(0));
  });
});

describe('Busca livre — global, não por categoria', () => {
  beforeEach(() => {
    esquecerTopVolateis();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
      ok: true, json: async () => respostaDe(String(url)),
    }));
  });
  afterEach(() => vi.restoreAllMocks());

  // A busca abre em "Ações BR". Se o texto respeitasse a pílula, digitar
  // AAPL não acharia nada — foi por isso que o filtro saiu do caminho.
  it('digitar acha fora da categoria aberta', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);
    await screen.findByText('Magazine Luiza ON');

    await user.type(input, 'AAPL');
    await waitFor(() => expect(screen.getByText('Apple')).toBeInTheDocument());
  });

  it('as pílulas somem enquanto se digita', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);
    expect(document.querySelectorAll('.search-chip').length).toBeGreaterThan(0);

    await user.type(input, 'AAPL');
    await waitFor(() => expect(document.querySelectorAll('.search-chip')).toHaveLength(0));
  });

  it('limpar o texto devolve o ranking', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);
    await user.type(input, 'AAPL');
    await waitFor(() => expect(screen.getByText('Apple')).toBeInTheDocument());

    await user.clear(input);
    await waitFor(() => expect(screen.getByText('Mais voláteis hoje')).toBeInTheDocument());
  });
});
