import { waitFor } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import { renderApp } from './helpers.jsx';

/**
 * A bancada volta depois do F5 — e só pra quem tem conta.
 *
 * Aqui o Supabase é simulado: o que se testa é a ligação entre o que está
 * guardado e o que a tela monta. A ida ao banco de verdade depende da
 * sql/022, que o dono roda no painel.
 */

const carregarSessao = vi.fn();
const salvarSessao = vi.fn(async () => true);
const apagarSessao = vi.fn(async () => true);

vi.mock('../lib/sessaoTelas.js', async () => {
  const real = await vi.importActual('../lib/sessaoTelas.js');
  return {
    ...real,
    carregarSessao: (...a) => carregarSessao(...a),
    salvarSessao: (...a) => salvarSessao(...a),
    apagarSessao: (...a) => apagarSessao(...a),
  };
});

const useAuth = vi.fn();
vi.mock('../auth/AuthContext.jsx', async () => {
  const real = await vi.importActual('../auth/AuthContext.jsx');
  return { ...real, useAuth: () => useAuth() };
});

const LOGADO = { user: { id: 'u1', email: 'a@b.c' }, carregando: false };
const DESLOGADO = { user: null, carregando: false };

const mesas = () => document.querySelectorAll('.analysis');

describe('A bancada depois do F5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    carregarSessao.mockResolvedValue(null);
    useAuth.mockReturnValue(DESLOGADO);
  });

  it('com conta, as mesas extras voltam', async () => {
    useAuth.mockReturnValue(LOGADO);
    carregarSessao.mockResolvedValue({
      extras: [{ ticker: 'VALE3.SA', tempo: '1S' }],
      tempoPrincipal: null,
      ativa: 0,
    });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    // a principal (da URL) e a extra (do banco)
    await waitFor(() => expect(mesas()).toHaveLength(2), { timeout: 5000 });
  });

  it('duas extras voltam como duas mesas', async () => {
    useAuth.mockReturnValue(LOGADO);
    carregarSessao.mockResolvedValue({
      extras: [{ ticker: 'VALE3.SA' }, { ticker: 'BBAS3.SA', tempo: '60m' }],
      tempoPrincipal: null,
      ativa: 0,
    });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(3), { timeout: 5000 });
  });

  // Por pedido do dono: sem conta, a bancada abre do zero
  it('sem conta, não restaura nada — nem vai buscar', async () => {
    useAuth.mockReturnValue(DESLOGADO);
    carregarSessao.mockResolvedValue({
      extras: [{ ticker: 'VALE3.SA' }], tempoPrincipal: null, ativa: 0,
    });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    expect(carregarSessao).not.toHaveBeenCalled();
    expect(mesas()).toHaveLength(1);
  });

  it('com conta e nada guardado, abre com uma mesa só', async () => {
    useAuth.mockReturnValue(LOGADO);
    carregarSessao.mockResolvedValue(null);

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(carregarSessao).toHaveBeenCalledWith('u1'));

    expect(mesas()).toHaveLength(1);
  });

  // O defeito que isto previne: no primeiro quadro a bancada está vazia,
  // e gravar aí apagaria a que estava guardada antes de lê-la
  it('não grava nada antes de ler o que havia guardado', async () => {
    useAuth.mockReturnValue(LOGADO);
    let resolver;
    carregarSessao.mockReturnValue(new Promise((r) => { resolver = r; }));

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    expect(salvarSessao).not.toHaveBeenCalled();
    expect(apagarSessao).not.toHaveBeenCalled();
    resolver(null);
  });
});
