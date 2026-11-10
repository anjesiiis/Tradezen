// BACKEND FORA DO AR NÃO É LISTA VAZIA
// ===================================
//
// A página de templates mostrou "Nenhum template ainda. (0)" com as
// marcações todas no banco. Nada no frontend nem na tabela estava errado:
// o serviço do Render não respondia (conexão aceita, 0 bytes de volta, 4
// minutos de espera — medido).
//
// Duas coisas no `adminApi` transformavam isso em silêncio:
//   1. `tabelaAindaNaoExiste` contava QUALQUER 503 como tabela faltando, e
//      o Render responde 503 quando o serviço está reiniciando ou caiu —
//      virava lista vazia, com um aviso no console e nada na tela;
//   2. o fetch não tinha teto de espera, então um backend que aceita a
//      conexão e não responde deixava a página esperando pra sempre.
//
// supabaseClient é mockado porque o adminApi o importa e ele puxa o SDK.
vi.mock('../lib/supabaseClient.js', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

const responder = (status, corpo) => {
  global.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  }));
};

describe('503 do servidor x 503 de tabela faltando', () => {
  let templatesBandeiraAltaApi;

  beforeEach(async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    vi.resetModules();
    ({ templatesBandeiraAltaApi } = await import('../admin/adminApi.js'));
  });
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('503 do Render NÃO vira lista vazia: estoura, pra tela poder avisar', async () => {
    responder(503, { detail: 'Service Unavailable' });

    const erro = await templatesBandeiraAltaApi.list().catch((e) => e);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(503);
  });

  it('503 que DIZ que a tabela não existe continua virando lista vazia', async () => {
    responder(503, {
      detail: 'A tabela templates_retangulo ainda não existe no Supabase. '
        + 'Rode backend/sql/014_padroes_reversao_e_consolidacao.sql no SQL Editor e tente de novo.',
    });

    await expect(templatesBandeiraAltaApi.list()).resolves.toEqual([]);
  });

  it('502 e 500 nunca foram engolidos, e continuam não sendo', async () => {
    for (const status of [500, 502]) {
      responder(status, { detail: 'pau no servidor' });
      const erro = await templatesBandeiraAltaApi.list().catch((e) => e);
      expect(erro.status).toBe(status);
    }
  });
});

describe('servidor que aceita a conexão e não responde', () => {
  let templatesBandeiraAltaApi;

  beforeEach(async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    vi.resetModules();
    ({ templatesBandeiraAltaApi } = await import('../admin/adminApi.js'));
  });
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('a espera estourada dá erro explicando, não lista vazia', async () => {
    // é o que o fetch faz quando o AbortController corta
    global.fetch = vi.fn(async () => {
      const abortou = new Error('The operation was aborted.');
      abortou.name = 'AbortError';
      throw abortou;
    });

    const erro = await templatesBandeiraAltaApi.list().catch((e) => e);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.semResposta).toBe(true);
    expect(erro.message).toMatch(/não respondeu/i);
    expect(erro.message).toMatch(/reiniciando|fora do ar/i);
  });

  it('o fetch leva um sinal de aborto, senão não há como cortar', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ templates: [] }) }));

    await templatesBandeiraAltaApi.list();

    const [, opcoes] = global.fetch.mock.calls[0];
    expect(opcoes.signal).toBeDefined();
    expect(typeof opcoes.signal.aborted).toBe('boolean');
  });
});
