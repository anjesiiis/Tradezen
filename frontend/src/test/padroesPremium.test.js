import { fetchPadroesMarcados } from '../lib/grafico/padroes.js';

// O gate de premium é decidido no backend. O que se testa aqui é o lado do
// cliente: mandar o token quando existe, não mandar header nenhum quando
// não existe, e devolver o `plano` pra tela saber por que veio vazio.
describe('fetchPadroesMarcados — conteúdo premium', () => {
  function respostaDoBackend(corpo) {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => corpo }));
  }

  it('manda o token no header quando tem sessão', async () => {
    respostaDoBackend({ padroes: [{ tipo: 'bandeira_alta' }], niveis: [], plano: 'premium' });

    const r = await fetchPadroesMarcados('PETR4.SA', '1d', 'tok-123');

    expect(globalThis.fetch.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer tok-123' } });
    expect(r.padroes).toHaveLength(1);
    expect(r.plano).toBe('premium');
  });

  it('sem token não manda header nenhum', async () => {
    respostaDoBackend({ padroes: [], niveis: [], plano: 'free' });

    await fetchPadroesMarcados('PETR4.SA', '1d');

    expect(globalThis.fetch.mock.calls[0][1]).toBeUndefined();
  });

  // é assim que a tela sabe mostrar o aviso de premium em vez de
  // "nenhum padrão marcado nesse ativo"
  it('devolve o plano que o backend informou junto com a lista vazia', async () => {
    respostaDoBackend({ padroes: [], niveis: [], plano: 'free' });

    const r = await fetchPadroesMarcados('PETR4.SA', '1d', 'tok-de-free');

    expect(r).toEqual({ padroes: [], niveis: [], plano: 'free' });
  });

  it('erro de rede não quebra o gráfico — volta vazio e sem plano', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline'); });

    expect(await fetchPadroesMarcados('PETR4.SA', '1d', 'tok')).toEqual({
      padroes: [], niveis: [], plano: null,
    });
  });
});
