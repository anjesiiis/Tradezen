import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TopVolateis from '../components/TopVolateis.jsx';
import {
  esquecerTopVolateis, grupoDoPonto, grupoFecha, precoComMoeda, pregaoEhDeHoje, simboloCurto,
} from '../lib/topVolateis.js';

const resposta = (top, pregao = '2026-10-29 00:00') => ({
  ok: true,
  json: async () => ({ status: 'ok', grupo: 'b3', pregao, top }),
});

const ativo = (simbolo, vol, varia) => ({
  ticker: `${simbolo}.SA`, simbolo, nome: `Empresa ${simbolo}`, moeda: 'BRL',
  preco: 10, maxima: 11, minima: 9,
  volatilidade_pct: vol, variacao_pct: varia, volume: 1000, pregao: '2026-10-29 00:00',
});

describe('Qual universo cada ponto do globo representa', () => {
  it('ponto de moeda mostra as moedas', () => {
    expect(grupoDoPonto({ categoria: 'moeda' })).toBe('forex');
  });

  it('os dois pontos de ações vão pra sua própria praça', () => {
    expect(grupoDoPonto({ categoria: 'acao', praca: 'B3' })).toBe('b3');
    expect(grupoDoPonto({ categoria: 'acao', praca: 'NYSE' })).toBe('eua');
  });

  it('índice de São Paulo e de Nova York têm papéis no catálogo', () => {
    expect(grupoDoPonto({ categoria: 'indice', indice: '^BVSP' })).toBe('b3');
    expect(grupoDoPonto({ categoria: 'indice', indice: '^GSPC' })).toBe('eua');
  });

  // Ranquear "os mais voláteis de Tóquio" com ação americana seria
  // mentira — esses pontos ficam com o card que já tinham
  it.each(['^FTSE', '^N225', '^GDAXI', '^HSI'])('índice sem papéis no catálogo (%s) não ganha lista', (indice) => {
    expect(grupoDoPonto({ categoria: 'indice', indice })).toBeNull();
  });

  it('ponto nenhum não quebra', () => {
    expect(grupoDoPonto(null)).toBeNull();
  });
});

describe('Pregão de hoje ou do último dia aberto', () => {
  const agora = new Date(2026, 9, 29, 15, 0);   // 29/10/2026

  it('reconhece o pregão de hoje', () => {
    expect(pregaoEhDeHoje('2026-10-29 00:00', agora)).toBe(true);
  });

  it('reconhece o pregão de ontem', () => {
    expect(pregaoEhDeHoje('2026-10-28 00:00', agora)).toBe(false);
  });

  // Cripto e moeda não fecham: avisar "mercado fechado" neles seria errado
  it('cripto e moeda nunca estão fechados', () => {
    expect(grupoFecha('cripto')).toBe(false);
    expect(grupoFecha('forex')).toBe(false);
    expect(grupoFecha('b3')).toBe(true);
  });
});

describe('Preço e símbolo na tela', () => {
  it('usa o símbolo da moeda que o backend informou', () => {
    expect(precoComMoeda(12.5, 'BRL')).toBe('R$ 12,50');
    expect(precoComMoeda(12.5, 'USD')).toBe('US$ 12,50');
  });

  // Centavo não diz nada num par de moedas que anda na quarta casa
  it('abaixo de 1 mostra quatro casas', () => {
    expect(precoComMoeda(0.2013, 'USD')).toBe('US$ 0,2013');
  });

  it('sem preço não inventa número', () => {
    expect(precoComMoeda(null, 'BRL')).toBe('—');
  });

  it.each([
    [{ simbolo: 'PETR4.SA' }, 'PETR4'],
    [{ simbolo: 'AUDCAD=X' }, 'AUDCAD'],
    [{ simbolo: 'ALGO-USD' }, 'ALGO'],
    [{ ticker: 'GC=F' }, 'GC'],
  ])('limpa o sufixo do ticker (%#)', (a, esperado) => {
    expect(simboloCurto(a)).toBe(esperado);
  });
});

describe('Lista dos mais voláteis', () => {
  beforeEach(() => { esquecerTopVolateis(); vi.restoreAllMocks(); });

  it('mostra os ativos ordenados como vieram, com amplitude e direção', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      resposta([ativo('MGLU3', 14.31, -10), ativo('BRKM5', 14.17, -6.39)]),
    );
    render(<TopVolateis grupo="b3" />);

    expect(await screen.findByText('MGLU3')).toBeInTheDocument();
    expect(screen.getByText('↕ 14.31%')).toBeInTheDocument();
    // a direção vem junto: amplitude sem direção engana
    expect(screen.getByText('▼ 10.00%')).toBeInTheDocument();
  });

  it('a fórmula fica escrita, senão o número não quer dizer nada', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(resposta([ativo('MGLU3', 14.31, -10)]));
    render(<TopVolateis grupo="b3" />);

    expect(await screen.findByText(/máxima − mínima/)).toBeInTheDocument();
  });

  it('clicar numa linha devolve o ativo pra quem abre o gráfico', async () => {
    const aoAbrir = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(resposta([ativo('MGLU3', 14.31, -10)]));
    render(<TopVolateis grupo="b3" aoAbrirAtivo={aoAbrir} />);

    fireEvent.click(await screen.findByText('MGLU3'));
    expect(aoAbrir).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'MGLU3.SA' }));
  });

  it('avisa quando o número é do último pregão, não de hoje', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      resposta([ativo('MGLU3', 14.31, -10)], '2020-01-02 00:00'),
    );
    render(<TopVolateis grupo="b3" />);

    expect(await screen.findByText('Mercado fechado')).toBeInTheDocument();
  });

  it('não avisa "fechado" em cripto, que não fecha', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      resposta([ativo('BTC', 5, 1)], '2020-01-02 00:00'),
    );
    render(<TopVolateis grupo="cripto" />);

    await screen.findByText('BTC');
    expect(screen.queryByText('Mercado fechado')).not.toBeInTheDocument();
  });

  // Backend fora do ar não pode derrubar a home
  it('backend fora mostra recado, não tela branca', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sem rede'));
    render(<TopVolateis grupo="b3" />);

    expect(await screen.findByText(/Não foi possível carregar/)).toBeInTheDocument();
  });

  it('grupo nenhum não renderiza nada', () => {
    const { container } = render(<TopVolateis grupo={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  // Reabrir o mesmo ponto não pode esperar pela rede de novo
  it('a segunda abertura do mesmo grupo não vai à rede', async () => {
    const espiao = vi.spyOn(globalThis, 'fetch').mockResolvedValue(resposta([ativo('MGLU3', 14.31, -10)]));
    const { unmount } = render(<TopVolateis grupo="b3" />);
    await screen.findByText('MGLU3');
    unmount();

    render(<TopVolateis grupo="b3" />);
    await screen.findByText('MGLU3');
    await waitFor(() => expect(espiao).toHaveBeenCalledTimes(1));
  });
});
