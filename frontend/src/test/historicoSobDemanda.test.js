import { buscarPaginaAnterior, temHistoricoSobDemanda } from '../lib/grafico/historico.js';

// A Binance dá anos de intraday; o Yahoo corta 60 minutos em 60 dias.
// Por isso só cripto pagina — e quando a busca falha, ela precisa dizer
// "não tem mais" em vez de estourar: senão vira laço de tentativas
// enquanto a pessoa rola o gráfico.
const candle = (ts) => ({ timestamp: ts, abertura: 1, maxima: 2, minima: 0.5, fechamento: 1.5, volume: 10 });

describe('Histórico sob demanda', () => {
  beforeEach(() => { global.fetch = vi.fn(); });

  it('só cripto pagina', () => {
    expect(temHistoricoSobDemanda({ mercado: 'CRIPTO' })).toBe(true);
    expect(temHistoricoSobDemanda({ mercado: 'B3' })).toBe(false);
    expect(temHistoricoSobDemanda(null)).toBe(false);
  });

  it('pede os candles anteriores ao mais antigo que já se tem', async () => {
    fetch.mockResolvedValue({ json: async () => ({
      status: 'ok', tem_mais: true, candles: [candle(500), candle(600)],
    })});

    const { novos, temMais } = await buscarPaginaAnterior('BTC-USD', '60m', 1000);

    expect(novos.map((c) => c.timestamp)).toEqual([500, 600]);
    expect(temMais).toBe(true);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/ativo/BTC-USD/pagina');
    expect(url).toContain('intervalo=60m');
    expect(url).toContain('antes_de=1000');
  });

  it('descarta candle repetido na borda', async () => {
    // o backend já exclui, mas 1 ms de desencontro duplicaria a vela
    fetch.mockResolvedValue({ json: async () => ({
      status: 'ok', tem_mais: true, candles: [candle(900), candle(1000)],
    })});

    const { novos } = await buscarPaginaAnterior('BTC-USD', '60m', 1000);

    expect(novos.map((c) => c.timestamp)).toEqual([900]);
  });

  it('chegou no início do histórico: diz que não tem mais', async () => {
    fetch.mockResolvedValue({ json: async () => ({ status: 'ok', tem_mais: false, candles: [] }) });

    expect(await buscarPaginaAnterior('BTC-USD', '60m', 1000)).toEqual({ novos: [], temMais: false });
  });

  it('só repetidos na resposta também encerra', async () => {
    fetch.mockResolvedValue({ json: async () => ({
      status: 'ok', tem_mais: true, candles: [candle(1000), candle(1100)],
    })});

    expect(await buscarPaginaAnterior('BTC-USD', '60m', 1000)).toEqual({ novos: [], temMais: false });
  });

  it('erro de rede não estoura — encerra a busca', async () => {
    fetch.mockRejectedValue(new Error('offline'));

    expect(await buscarPaginaAnterior('BTC-USD', '60m', 1000)).toEqual({ novos: [], temMais: false });
  });

  it('erro do backend (ação, por exemplo) também encerra', async () => {
    fetch.mockResolvedValue({ json: async () => ({ detail: 'Paginação só existe para cripto.' }) });

    expect(await buscarPaginaAnterior('PETR4.SA', '60m', 1000)).toEqual({ novos: [], temMais: false });
  });

  it('sem ponto de partida, nem chama a API', async () => {
    expect(await buscarPaginaAnterior('BTC-USD', '60m', null)).toEqual({ novos: [], temMais: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});
