import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Espiona a busca de padrões sem mexer no resto do módulo.
const buscas = [];
vi.mock('../lib/grafico/padroes.js', async (original) => {
  const real = await original();
  return {
    ...real,
    tokenDaSessao: vi.fn(async () => 'token-de-teste'),
    fetchPadroesMarcados: vi.fn(async (ticker, timeframe, token) => {
      buscas.push({ ticker, timeframe, comToken: Boolean(token) });
      return {
        plano: 'admin',
        padroes: [{
          tipo: 'bandeira_alta',
          intervalo_candles: { inicio: 10, fim: 40 },
          pontos: {},
        }],
        niveis: [],
      };
    }),
  };
});

const carregarSessao = vi.fn();
vi.mock('../lib/sessaoTelas.js', async (original) => {
  const real = await original();
  return {
    ...real,
    carregarSessao: (...a) => carregarSessao(...a),
    salvarSessao: vi.fn(async () => true),
    apagarSessao: vi.fn(async () => true),
  };
});

const useAuth = vi.fn();
vi.mock('../auth/AuthContext.jsx', async (original) => {
  const real = await original();
  return { ...real, useAuth: () => useAuth() };
});

const { renderApp } = await import('./helpers.jsx');

const ADMIN = {
  user: { id: 'u1', email: 'anjesis@hotmail.com' },
  plano: 'premium', isAdmin: true, planoPronto: true, carregando: false,
};

const mesas = () => document.querySelectorAll('.analysis');

describe('os padrões aparecem em TODAS as mesas', () => {
  beforeEach(() => {
    buscas.length = 0;
    vi.clearAllMocks();
    useAuth.mockReturnValue(ADMIN);
    carregarSessao.mockResolvedValue({
      extras: [{ ticker: 'VALE3.SA' }, { ticker: 'BBAS3.SA' }],
      tempoPrincipal: null,
      ativa: 0,
    });
  });

  it('cada mesa busca os padrões do SEU ativo', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(3), { timeout: 6000 });

    await waitFor(() => {
      const tickers = new Set(buscas.map((b) => b.ticker));
      expect(tickers).toContain('PETR4.SA');
      expect(tickers).toContain('VALE3.SA');
      expect(tickers).toContain('BBAS3.SA');
    }, { timeout: 6000 });
  });

  // Sem token a resposta volta vazia (o backend corta por plano). Toda
  // mesa tem de mandar o token, não só a primeira.
  it('todas as mesas mandam o token', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(mesas()).toHaveLength(3), { timeout: 6000 });

    await waitFor(() => {
      for (const t of ['PETR4.SA', 'VALE3.SA', 'BBAS3.SA']) {
        const daMesa = buscas.filter((b) => b.ticker === t);
        expect(daMesa.length).toBeGreaterThan(0);
        expect(daMesa.some((b) => b.comToken)).toBe(true);
      }
    }, { timeout: 6000 });
  });
});

// PADRÃO DETECTADO NASCE VISÍVEL — a causa do relato.
//
// O desenho só saía se o tipo estivesse em `tools`, e `tools` vem da
// configuração salva POR ATIVO. A mesa principal mostrava as bandeiras
// porque aquele ticker já tinha o filtro ligado de alguma sessão antiga;
// qualquer mesa nova, com ativo sem configuração, abria com `tools` vazio
// e não desenhava nada. Quem abre um gráfico quer ver o que foi detectado
// nele.
const { TOOLS } = await import('../lib/grafico/config.js');

describe('o filtro do padrão nasce ligado', () => {
  const fonte = readFileSync(
    resolve(process.cwd(), 'src/pages/Grafico.jsx'), 'utf8');

  it('os ids de TOOLS são tratados como filtro de padrão', () => {
    expect(fonte).toMatch(/IDS_DE_PADRAO = new Set\(TOOLS\.map/);
    // se TOOLS mudar de forma, a derivação continua válida
    expect(TOOLS.every((t) => typeof t.id === 'string')).toBe(true);
  });

  it('existe o efeito que liga o tipo detectado', () => {
    const bloco = fonte.slice(fonte.indexOf('PADRÃO DETECTADO NASCE VISÍVEL'));
    expect(bloco.slice(0, 1200)).toMatch(/normalizarTipo\(p\.tipo\)/);
    expect(bloco.slice(0, 1200)).toMatch(/padroesOcultosRef\.current\.has\(tipo\)/);
  });

  // Esconder é escolha e tem de sobreviver; mostrar é o padrão e não
  // precisa ocupar espaço no banco.
  it('grava só a escolha de ESCONDER, nunca a de mostrar', () => {
    expect(fonte).toMatch(/if\(ocultos\.length\) campos\.padroesOcultos = ocultos;/);
    expect(fonte).toMatch(/\[\.\.\.tools\]\.filter\(id=>!IDS_DE_PADRAO\.has\(id\)\)/);
  });

  // Sem isto, ativo que tem padrão viraria registro no banco só de ser
  // aberto — porque o filtro ligado sozinho já deixaria `tools` cheio.
  it('ativo só de passagem não vira registro', () => {
    expect(fonte).toMatch(/if\(!indicadores\.length && !limpos\.length && !ocultos\.length/);
  });

  it('esconder dispara gravação na hora', () => {
    expect(fonte).toMatch(/\},\[tools, desenhos, padroesOcultos, user, ticker, tickerCarregado\]\);/);
  });
});
