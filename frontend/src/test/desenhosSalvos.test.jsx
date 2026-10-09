import { renderHook, waitFor } from '@testing-library/react';

// Os padrões ligados no sidebar aparecem DESENHADOS no gráfico enquanto se
// marca o próximo — não só o emoji. Cada template é buscado uma vez só.
const get = vi.fn();

vi.mock('../admin/adminApi', () => ({
  API_DO_PADRAO: {
    bandeira_alta: { get: (...a) => get('bandeira_alta', ...a) },
    topo_duplo_fake: { get: (...a) => get('fake', ...a) },
  },
  templatesOcoApi: { get: (...a) => get('oco', ...a) },
  templatesTopoDuploApi: { get: (...a) => get('topo_duplo', ...a) },
  templatesNiveisApi: { get: (...a) => get('niveis', ...a) },
  fetchAtivos: vi.fn(),
}));

const { useDesenhosSalvos } = await import('../admin/lampadas.js');

const DIA = 86400000;
const candles = Array.from({ length: 60 }, (_, i) => ({
  timestamp: i * DIA, abertura: 10, maxima: 12, minima: 9, fechamento: 11,
}));

// template salvo: candles próprios (recorte) + pontos com índice dentro dele
const salvoTopoDuplo = {
  ticker: 'PETR4.SA',
  candles: candles.slice(10, 40),
  pontos: { topo1: { i: 2, preco: 12 }, vale: { i: 6, preco: 9 }, topo2: { i: 10, preco: 12.2 } },
};

const marcador = (tipo, templateId) => ({ id: `${tipo}-${templateId}`, tipo, templateId, rotulo: tipo });

describe('Desenho dos padrões já salvos no gráfico', () => {
  beforeEach(() => { get.mockReset(); get.mockResolvedValue(salvoTopoDuplo); });

  it('devolve um desenho por padrão visível, com linhas e pontos', async () => {
    const { result } = renderHook(() => useDesenhosSalvos([marcador('topo_duplo', 1)], candles));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].chave).toBe('topo_duplo-1');
    expect(result.current[0].pontos.length).toBe(3);
    expect(result.current[0].linhas.length).toBeGreaterThan(0);
    // os índices vêm reindexados pro gráfico que está na tela (10 + 2)
    expect(result.current[0].pontos[0].i).toBe(12);
  });

  it('sem padrão visível, nada é desenhado e nada é buscado', async () => {
    const { result } = renderHook(() => useDesenhosSalvos([], candles));

    await waitFor(() => expect(result.current).toEqual([]));
    expect(get).not.toHaveBeenCalled();
  });

  it('sem gráfico carregado ainda, não busca nada', async () => {
    const { result } = renderHook(() => useDesenhosSalvos([marcador('topo_duplo', 1)], []));

    await waitFor(() => expect(result.current).toEqual([]));
    expect(get).not.toHaveBeenCalled();
  });

  it('cada template é buscado uma vez só, mesmo re-renderizando', async () => {
    const { result, rerender } = renderHook(
      ({ m }) => useDesenhosSalvos(m, candles),
      { initialProps: { m: [marcador('topo_duplo', 1)] } },
    );
    await waitFor(() => expect(result.current).toHaveLength(1));

    // lista nova a cada render (é o que o componente faz), mesmos ids
    rerender({ m: [marcador('topo_duplo', 1)] });
    rerender({ m: [marcador('topo_duplo', 1)] });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('um padrão que não carrega não derruba os outros', async () => {
    get.mockImplementation((tipo) => (tipo === 'oco' ? Promise.reject(new Error('500')) : Promise.resolve(salvoTopoDuplo)));

    const { result } = renderHook(() => useDesenhosSalvos([marcador('oco', 9), marcador('topo_duplo', 1)], candles));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].chave).toBe('topo_duplo-1');
  });
});
