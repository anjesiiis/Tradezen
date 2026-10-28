import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../components/SearchBar.jsx';
import {
  CATEGORIAS, DESTAQUES, categoriaDoAtivo, destaquesDaCategoria, filtrarPorCategoria,
  ordenarPorRelevancia, sugestoesDoMercado,
} from '../lib/buscaAtivos.js';

const ativo = (ticker, nome, simbolo, mercado) => ({ ticker, nome, simbolo, mercado });

const CATALOGO = [
  ativo('VALE3.SA', 'Vale ON', 'VALE3', 'B3'),
  ativo('PETR4.SA', 'Petrobras PN', 'PETR4', 'B3'),
  ativo('ITUB4.SA', 'Itaú Unibanco PN', 'ITUB4', 'B3'),
  ativo('BBDC4.SA', 'Bradesco PN', 'BBDC4', 'B3'),
  ativo('BBAS3.SA', 'Banco do Brasil ON', 'BBAS3', 'B3'),
  ativo('AAPL', 'Apple Inc.', 'AAPL', 'NASDAQ'),
  ativo('JPM', 'JPMorgan Chase', 'JPM', 'NYSE'),
  ativo('BTC-USD', 'Bitcoin', 'BTC', 'CRIPTO'),
  ativo('ETH-USD', 'Ethereum', 'ETH', 'CRIPTO'),
  ativo('SOL-USD', 'Solana', 'SOL', 'CRIPTO'),
  ativo('GC=F', 'Ouro (futuro)', 'OURO', 'COMMODITY'),
  ativo('USDBRL=X', 'USD/BRL', 'USD/BRL', 'FOREX'),
  ativo('^BVSP', 'Ibovespa', 'IBOV', 'INDICE'),
];

describe('Busca — categorias', () => {
  // As pílulas vêm do que o catálogo tem de verdade. Oferecer "Fundos"
  // ou "Futuros" seria um filtro que só esvazia a lista.
  it('as categorias existem todas no catálogo', () => {
    const mercadosReais = new Set(CATALOGO.map((a) => a.mercado));
    for (const c of CATEGORIAS.filter((x) => x.mercados)) {
      expect(c.mercados.some((m) => mercadosReais.has(m)), c.rotulo).toBe(true);
    }
  });

  it('classifica cada ativo na categoria certa', () => {
    expect(categoriaDoAtivo(ativo('VALE3.SA', '', '', 'B3'))).toBe('acoes_br');
    expect(categoriaDoAtivo(ativo('AAPL', '', '', 'NASDAQ'))).toBe('acoes_eua');
    expect(categoriaDoAtivo(ativo('JPM', '', '', 'NYSE'))).toBe('acoes_eua');
    expect(categoriaDoAtivo(ativo('BTC-USD', '', '', 'CRIPTO'))).toBe('cripto');
    expect(categoriaDoAtivo(ativo('GC=F', '', '', 'COMMODITY'))).toBe('commodities');
    expect(categoriaDoAtivo(ativo('^BVSP', '', '', 'INDICE'))).toBe('indices');
    // sem mercado conhecido não quebra
    expect(categoriaDoAtivo({})).toBe('indices');
  });

  it('filtrar por categoria devolve só aquela categoria', () => {
    expect(filtrarPorCategoria(CATALOGO, 'cripto').map((a) => a.simbolo)).toEqual(['BTC', 'ETH', 'SOL']);
    expect(filtrarPorCategoria(CATALOGO, 'todos')).toHaveLength(CATALOGO.length);
  });
});

describe('Busca — destaques por categoria', () => {
  // Era aqui o problema: a lista vinha das sugestões da home, que tinham
  // UM forex e UMA commodity. Agora cada categoria tem os seus.
  it('toda categoria tem pelo menos 10 destaques', () => {
    for (const [cat, tickers] of Object.entries(DESTAQUES)) {
      expect(tickers.length, cat).toBeGreaterThanOrEqual(10);
    }
  });

  it('não repete ticker dentro da mesma categoria', () => {
    for (const [cat, tickers] of Object.entries(DESTAQUES)) {
      expect(new Set(tickers).size, cat).toBe(tickers.length);
    }
  });

  it('os destaques saem na ordem pedida, a partir do catálogo', () => {
    const d = destaquesDaCategoria(CATALOGO, 'cripto').map((a) => a.simbolo);
    expect(d[0]).toBe('BTC');
    expect(d).toContain('ETH');
  });

  // ticker que o catálogo não tem some em silêncio: melhor um card a
  // menos do que uma linha que não abre gráfico nenhum
  it('ticker fora do catálogo não vira linha quebrada', () => {
    expect(destaquesDaCategoria([], 'forex')).toEqual([]);
    expect(destaquesDaCategoria(CATALOGO, 'acoes_eua').every(Boolean)).toBe(true);
  });

  it('em Todos, mistura as categorias', () => {
    const mix = destaquesDaCategoria(CATALOGO, 'todos').map((a) => a.mercado);
    expect(new Set(mix).size).toBeGreaterThan(1);
  });
});

describe('Busca — relevância', () => {
  it('match exato vem antes de prefixo, e prefixo antes de parcial', () => {
    const lista = [
      ativo('X', 'Empresa com vale no nome', 'ABC', 'B3'),
      ativo('VALE5.SA', 'Vale PN', 'VALE5', 'B3'),
      ativo('VALE3.SA', 'Vale ON', 'VALE3', 'B3'),
    ];

    const ordem = ordenarPorRelevancia(lista, 'vale3').map((a) => a.simbolo);

    expect(ordem[0]).toBe('VALE3');   // exato
  });

  // "dolar" e "ouro" são as buscas mais prováveis de quem está começando,
  // e nenhuma delas aparece no ticker
  it('entende como a pessoa fala, não só o ticker', () => {
    expect(ordenarPorRelevancia(CATALOGO, 'dolar')[0].simbolo).toBe('USD/BRL');
    expect(ordenarPorRelevancia(CATALOGO, 'ouro')[0].simbolo).toBe('OURO');
    expect(ordenarPorRelevancia(CATALOGO, 'ibovespa')[0].simbolo).toBe('IBOV');
  });

  it('corta em 20 resultados', () => {
    const muitos = Array.from({ length: 50 }, (_, i) => ativo(`A${i}.SA`, `Ativo ${i}`, `A${i}`, 'B3'));
    expect(ordenarPorRelevancia(muitos, 'ativo')).toHaveLength(20);
  });

  it('o que não casa fica de fora', () => {
    expect(ordenarPorRelevancia(CATALOGO, 'xyzw')).toHaveLength(0);
  });
});

describe('Busca — sugestões antes de digitar', () => {
  it('traz os mais procurados, na ordem', () => {
    const s = sugestoesDoMercado(CATALOGO).map((a) => a.simbolo);

    expect(s.slice(0, 5)).toEqual(['VALE3', 'PETR4', 'ITUB4', 'BBDC4', 'BBAS3']);
    expect(s).toContain('BTC');
    expect(s).toContain('IBOV');
  });

  it('ativo que o mercado não trouxe não vira buraco na lista', () => {
    expect(sugestoesDoMercado([CATALOGO[0]])).toHaveLength(1);
  });
});

describe('Busca — a tela', () => {
  const montar = () => {
    const onSelect = vi.fn();
    render(<SearchBar onSelect={onSelect} mercado={CATALOGO} />);
    return { onSelect, input: screen.getByLabelText('Buscar ativo') };
  };

  it('ao focar, mostra as sugestões sem precisar digitar', async () => {
    const user = userEvent.setup();
    const { input } = montar();

    await user.click(input);

    expect(screen.getByText('Vale ON')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
  });

  it('tem as pílulas de categoria, com Todos ligado', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);

    const chips = [...document.querySelectorAll('.search-chip')];
    expect(chips.map((c) => c.textContent)).toEqual(
      ['Todos', 'Ações BR', 'Ações EUA', 'Moedas', 'Cripto', 'Commodities', 'Índices']);
    expect(chips[0]).toHaveClass('ativo');
  });

  it('clicar numa pílula filtra a lista', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);

    await user.click(screen.getByRole('button', { name: 'Cripto' }));

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.queryByText('Vale ON')).not.toBeInTheDocument();
  });

  it('cada linha mostra ticker, nome, selo e mercado', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);

    const linha = [...document.querySelectorAll('.search-item')].find((l) => l.textContent.includes('VALE3'));
    expect(within(linha).getByText('VALE3')).toBeInTheDocument();
    expect(within(linha).getByText('Vale ON')).toBeInTheDocument();
    expect(within(linha).getByText('Ação BR')).toBeInTheDocument();
    expect(within(linha).getByText('B3')).toBeInTheDocument();
  });

  it('setas navegam e Enter escolhe', async () => {
    const user = userEvent.setup();
    const { onSelect, input } = montar();
    await user.click(input);

    // lido ANTES do Enter: escolher fecha o dropdown e some com a lista
    const segundo = [...document.querySelectorAll('.search-ticker')][1].textContent;

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].simbolo).toBe(segundo);
  });

  it('Esc fecha', async () => {
    const user = userEvent.setup();
    const { input } = montar();
    await user.click(input);
    expect(document.querySelector('.search-dd')).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(document.querySelector('.search-dd')).toBeNull();
  });

  it('Cmd+K abre a busca de qualquer lugar', async () => {
    montar();
    expect(document.querySelector('.search-dd')).toBeNull();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => expect(document.querySelector('.search-dd')).not.toBeNull());
  });

  // O servidor casa só ticker e nome: "dolar" não existe em nenhum dos
  // dois. Quem resolve é o catálogo já carregado, vasculhado junto.
  it('acha por apelido mesmo quando o servidor não devolve nada', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async () => ({ json: async () => ({ resultados: [] }) }));
    const { input } = montar();

    await user.type(input, 'dolar');

    await waitFor(() => expect(screen.getByText('USD/BRL', { selector: '.search-ticker' })).toBeInTheDocument());
  });

  it('não repete o ativo que veio do servidor e do catálogo', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async () => ({ json: async () => ({ resultados: [CATALOGO[0]] }) }));
    const { input } = montar();

    await user.type(input, 'vale');

    await waitFor(() => {
      const vales = [...document.querySelectorAll('.search-ticker')].filter(n => n.textContent === 'VALE3');
      expect(vales).toHaveLength(1);
    });
  });

  it('o X limpa o que foi digitado', async () => {
    const user = userEvent.setup();
    const { input } = montar();

    await user.type(input, 'vale');
    expect(input).toHaveValue('vale');
    await user.click(screen.getByLabelText('Limpar busca'));

    expect(input).toHaveValue('');
  });
});
