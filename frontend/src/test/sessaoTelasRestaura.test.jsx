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

// `plano` e `planoPronto` entram porque o limite de telas sai deles (ver
// lib/limitesTelas.js): conta grátis abre 2 telas no total, premium 4.
const LOGADO = { user: { id: 'u1', email: 'a@b.c' }, plano: 'free', planoPronto: true, carregando: false };
const PREMIUM = { ...LOGADO, plano: 'premium' };
const DESLOGADO = { user: null, plano: 'free', planoPronto: true, carregando: false };

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

  it('premium volta com as duas extras — três mesas', async () => {
    useAuth.mockReturnValue(PREMIUM);
    carregarSessao.mockResolvedValue({
      extras: [{ ticker: 'VALE3.SA' }, { ticker: 'BBAS3.SA', tempo: '60m' }],
      tempoPrincipal: null,
      ativa: 0,
    });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(3), { timeout: 5000 });
  });

  // O caso de quem tinha premium e deixou de ter, ou de quando o limite
  // do grátis baixou: a bancada guardada é maior do que a conta aguenta.
  // Mantém a primeira que ela montou e descarta o resto, em vez de montar
  // quatro telas e deixar o limite valendo só pro botão "+".
  it('bancada maior que o plano é cortada na restauração', async () => {
    useAuth.mockReturnValue(LOGADO);           // grátis: 2 telas no total
    carregarSessao.mockResolvedValue({
      extras: [{ ticker: 'VALE3.SA' }, { ticker: 'BBAS3.SA', tempo: '60m' }],
      tempoPrincipal: null,
      ativa: 0,
    });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(mesas()).toHaveLength(2), { timeout: 5000 });

    // e continua em duas: não é uma corrida que se resolve sozinha depois
    await new Promise((r) => setTimeout(r, 50));
    expect(mesas()).toHaveLength(2);
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
