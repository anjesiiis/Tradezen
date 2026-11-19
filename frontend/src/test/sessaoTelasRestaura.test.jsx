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

// O ADMIN TEM BANCADA DE 12.
//
// O /eu entrega `plano: "premium"` pra quem é admin (o resto da tela só
// precisa saber se tem acesso), então o plano sozinho não distingue os
// dois — é o `isAdmin` que faz a diferença. Sem ele, quem marca templates
// ficaria com 4 mesas e teria de fechar uma pra abrir outra.
describe('A bancada do admin', () => {
  const ADMIN = { ...LOGADO, plano: 'premium', isAdmin: true };

  beforeEach(() => {
    vi.clearAllMocks();
    carregarSessao.mockResolvedValue(null);
  });

  const extras = (n) => Array.from({ length: n }, (_, i) => ({ ticker: `A${i}.SA` }));

  it('restaura 12 mesas', async () => {
    useAuth.mockReturnValue(ADMIN);
    carregarSessao.mockResolvedValue({ extras: extras(11), tempoPrincipal: null, ativa: 0 });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(mesas()).toHaveLength(12), { timeout: 5000 });
  });

  // O corte pelo plano continua valendo: premium que não é admin para em 4.
  it('premium sem admin continua em 4', async () => {
    useAuth.mockReturnValue({ ...PREMIUM, isAdmin: false });
    carregarSessao.mockResolvedValue({ extras: extras(11), tempoPrincipal: null, ativa: 0 });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(mesas()).toHaveLength(4), { timeout: 5000 });
  });

  // A GRADE É O TETO REAL DO LAYOUT: fixa em 2 colunas, a quinta mesa em
  // diante era espremida até o gráfico virar um risco. O número de
  // colunas agora vem do JS.
  it('a grade ganha colunas conforme o número de mesas', async () => {
    useAuth.mockReturnValue(ADMIN);
    carregarSessao.mockResolvedValue({ extras: extras(11), tempoPrincipal: null, ativa: 0 });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(12), { timeout: 5000 });

    const grade = document.querySelector('.analysis-row');
    expect(grade.className).toMatch(/\bgrade\b/);
    // 12 mesas → 4 colunas, e a classe que libera a rolagem vertical
    expect(grade.style.getPropertyValue('--mesas-col')).toBe('4');
    expect(grade.className).toMatch(/\bmuitas\b/);
  });

  it('com 2 mesas não vira grade — continua linha única', async () => {
    useAuth.mockReturnValue(ADMIN);
    carregarSessao.mockResolvedValue({ extras: extras(1), tempoPrincipal: null, ativa: 0 });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(2), { timeout: 5000 });
    expect(document.querySelector('.analysis-row').className).not.toMatch(/\bgrade\b/);
  });
});

// O QUADRO ENTRE O LOGIN E A VOLTA DO /eu.
//
// `plano` nasce "free" e `isAdmin` nasce false: os dois só viram verdade
// quando o /eu responde. A restauração não esperava por isso, então ela
// cortava a bancada pelo limite do GRÁTIS — quem tinha cinco mesas abria
// com duas. E, como a trava `jaRestaurou` já estava marcada, não havia
// segunda chance: a bancada truncada era gravada por cima da verdadeira
// poucos quadros depois, tornando a perda permanente.
//
// Os testes acima não pegaram porque todos passavam `planoPronto: true`.
describe('a bancada espera o plano antes de cortar', () => {
  const extras = (n) => Array.from({ length: n }, (_, i) => ({ ticker: `A${i}.SA` }));
  // Como chega de verdade antes do /eu responder.
  const AINDA_SEM_PLANO = {
    user: { id: 'u1', email: 'anjesis@hotmail.com' },
    plano: 'free', isAdmin: false, planoPronto: false, carregando: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    carregarSessao.mockResolvedValue({ extras: extras(4), tempoPrincipal: null, ativa: 3 });
  });

  it('sem o plano pronto, não monta nada da bancada', async () => {
    useAuth.mockReturnValue(AINDA_SEM_PLANO);
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300));

    // Só a principal, que vem da URL. Antes montava 2: a principal mais
    // UMA extra, porque o corte usou o limite do grátis.
    expect(mesas()).toHaveLength(1);
  });

  // A metade mais grave: gravar a bancada truncada apaga a verdadeira.
  it('sem o plano pronto, não grava por cima da bancada guardada', async () => {
    useAuth.mockReturnValue(AINDA_SEM_PLANO);
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300));

    expect(salvarSessao).not.toHaveBeenCalled();
  });

  it('com o plano pronto, as cinco voltam', async () => {
    useAuth.mockReturnValue({ ...AINDA_SEM_PLANO, plano: 'premium', isAdmin: true, planoPronto: true });
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(5), { timeout: 5000 });
  });

  // Índice da aba fora da lista deixa TODAS as mesas com `ocultoMobile`:
  // tela sem gráfico nenhum, e sem erro. Foi o segundo sintoma.
  it('aba da frente nunca aponta pra mesa que não veio', async () => {
    useAuth.mockReturnValue({ ...AINDA_SEM_PLANO, plano: 'free', planoPronto: true });
    // 4 extras guardadas, aba 3 — mas o grátis só cabe 1 extra
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(2), { timeout: 5000 });
    // nenhuma mesa pode ficar escondida por índice inválido
    expect(document.querySelectorAll('.analysis')).toHaveLength(2);
  });
});
