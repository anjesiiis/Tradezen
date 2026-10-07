import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { AdminPatternNav } from '../admin/theme.jsx';

// O token do magic link expira em 1 hora. Estes testes cobrem o que passou
// a acontecer nessa hora: renovar pela sessão do Supabase em vez de pedir
// o email de novo a cada tela de template.
describe('Sessão do admin', () => {
  let adminApi;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    adminApi = await import('../admin/adminApi.js');
  });

  function sessaoCom(token) {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: token } }, error: null });
  }
  function semSessao() {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  }

  it('token expirado (401) é renovado pela sessão e a chamada é refeita', async () => {
    localStorage.setItem('admin_token', 'token-velho');
    sessaoCom('token-novo');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ detail: 'expirado' }) })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ status: 'ok', templates: [] }) });

    const lista = await adminApi.templatesOcoApi.list();

    expect(lista).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const primeira = global.fetch.mock.calls[0][1].headers.Authorization;
    const segunda = global.fetch.mock.calls[1][1].headers.Authorization;
    expect(primeira).toBe('Bearer token-velho');
    expect(segunda).toBe('Bearer token-novo');
    // e o token novo fica guardado pras próximas chamadas
    expect(localStorage.getItem('admin_token')).toBe('token-novo');
  });

  it('sem sessão pra renovar, o token é descartado (cai no login)', async () => {
    localStorage.setItem('admin_token', 'token-velho');
    semSessao();
    global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({ detail: 'expirado' }) });

    await expect(adminApi.templatesOcoApi.list()).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1); // não adianta repetir
    expect(localStorage.getItem('admin_token')).toBeNull();
  });

  it('403 (email sem acesso) não tenta renovar', async () => {
    localStorage.setItem('admin_token', 'token-de-outro');
    sessaoCom('token-novo');
    global.fetch = vi.fn().mockResolvedValue({ status: 403, ok: false, json: async () => ({ detail: 'sem acesso' }) });

    await expect(adminApi.templatesOcoApi.list()).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('sincronizarTokenAdmin aproveita a sessão quando não há token guardado', async () => {
    sessaoCom('token-da-sessao');

    expect(await adminApi.sincronizarTokenAdmin()).toBe('token-da-sessao');
    expect(localStorage.getItem('admin_token')).toBe('token-da-sessao');
  });

  it('RequireAdmin deixa entrar com sessão viva, sem token guardado', async () => {
    sessaoCom('token-da-sessao');
    const { default: RequireAdmin } = await import('../admin/RequireAdmin.jsx');

    // o guard vive dentro do Router no app (o skeleton usa useLocation)
    render(<MemoryRouter><RequireAdmin><p>painel</p></RequireAdmin></MemoryRouter>);

    expect(await screen.findByText('painel')).toBeInTheDocument();
  });

  it('abrir uma tela dispara várias chamadas: o token expirado é renovado uma vez e nenhuma se perde', async () => {
    localStorage.setItem('admin_token', 'token-velho');
    sessaoCom('token-novo');

    // é o que acontece ao trocar de padrão: a lista do padrão + as
    // lâmpadas das 9 tabelas saem juntas, e todas pegam o token vencido
    global.fetch = vi.fn(async (_url, opcoes) =>
      opcoes.headers.Authorization === 'Bearer token-velho'
        ? { status: 401, ok: false, json: async () => ({ detail: 'expirado' }) }
        : { status: 200, ok: true, json: async () => ({ status: 'ok', templates: [] }) }
    );

    const resultados = await Promise.all(
      Array.from({ length: 10 }, () => adminApi.templatesOcoApi.list())
    );

    expect(resultados.every((r) => Array.isArray(r))).toBe(true);
    expect(localStorage.getItem('admin_token')).toBe('token-novo');
    // 10 tentativas com o token velho + 10 repetições com o novo
    expect(global.fetch).toHaveBeenCalledTimes(20);
  });

  it('uma falha pontual não derruba a sessão: o token guardado continua lá', async () => {
    localStorage.setItem('admin_token', 'token-bom');
    sessaoCom('token-bom');
    let primeira = true;
    global.fetch = vi.fn(async () => {
      if (primeira) { primeira = false; return { status: 401, ok: false, json: async () => ({}) }; }
      return { status: 200, ok: true, json: async () => ({ status: 'ok', templates: [] }) };
    });

    await adminApi.templatesOcoApi.list();

    expect(localStorage.getItem('admin_token')).toBe('token-bom');
  });

  it('a navegação entre padrões é client-side (não recarrega a página)', () => {
    render(<MemoryRouter><AdminPatternNav active="bandeira-alta" /></MemoryRouter>);

    const link = screen.getByRole('link', { name: 'Flâmula de Alta' });
    expect(link).toHaveAttribute('href', '/admin/templates/flamula-alta');
    // <a> comum dispara navegação de verdade; o Link do router intercepta
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });
});
