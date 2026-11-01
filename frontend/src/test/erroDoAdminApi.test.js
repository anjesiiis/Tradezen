import { explicarFalhaAoAbrir } from '../admin/diagnosticoTemplate.js';

// A emenda entre as duas metades do conserto: o `adminApi` é quem pendura
// `status` e `data` no erro, e o `diagnosticoTemplate` é quem lê. Se um
// dos dois mudar de formato, a tela volta a mostrar frase genérica — e
// nenhum dos testes de unidade pegaria isso.
//
// supabaseClient é importado pelo adminApi e puxa o SDK inteiro: mockado
// porque aqui só interessa o formato do erro.
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

describe('O erro que o adminApi lança', () => {
  let templatesBandeiraAltaApi;

  beforeEach(async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    ({ templatesBandeiraAltaApi } = await import('../admin/adminApi.js'));
  });
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('traz o status e o detalhe que o backend mandou', async () => {
    responder(500, { detail: 'column pontos does not exist' });

    const erro = await templatesBandeiraAltaApi.get(42).catch((e) => e);

    expect(erro.status).toBe(500);
    expect(erro.data.detail).toBe('column pontos does not exist');
    // e a tela mostra isso, não "não foi possível abrir"
    expect(explicarFalhaAoAbrir(erro, 42)).toMatch(/column pontos does not exist/);
  });

  it('404 vira a frase de "não está mais no banco", com o id', async () => {
    responder(404, { detail: 'Template não encontrado.' });

    const erro = await templatesBandeiraAltaApi.get(42).catch((e) => e);

    expect(explicarFalhaAoAbrir(erro, 42)).toMatch(/não está mais no banco/i);
    expect(explicarFalhaAoAbrir(erro, 42)).toMatch(/42/);
  });

  // Caso real: migration não rodada. O backend nomeia o arquivo .sql, e
  // essa é a informação que resolve o problema — tem que chegar na tela.
  it('503 chega na tela com o nome da migration', async () => {
    responder(503, {
      detail: 'A tabela templates_bandeira_alta_fracasso ainda não existe no Supabase. Rode backend/sql/016_fracassos_bandeira.sql no SQL Editor e tente de novo.',
    });

    const erro = await templatesBandeiraAltaApi.get(42).catch((e) => e);

    expect(explicarFalhaAoAbrir(erro, 42)).toMatch(/016_fracassos_bandeira\.sql/);
  });

  it('corpo vazio não apaga o status', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false, status: 502, json: async () => { throw new Error('sem corpo'); },
    }));

    const erro = await templatesBandeiraAltaApi.get(42).catch((e) => e);

    expect(erro.status).toBe(502);
    expect(explicarFalhaAoAbrir(erro, 42)).toMatch(/\(502\)/);
  });
});
