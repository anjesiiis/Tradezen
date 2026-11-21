import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { respostaFake } from './dadosFake.js';

// O PADRÃO QUE CHEGAVA ANTES DO CANDLE IA PRO LIXO
// ================================================
//
// Relato: "no multichart com 8 gráficos, só 2 mostram os marcadores".
//
// A causa não era race de estado global (o estado é local por mesa), nem
// limite hardcoded (não existe), nem o portão de plano. Era uma linha no
// efeito que buscava os padrões:
//
//     if(cancelado || !candlesRef.current.length) return;
//
// Padrão é leve e vem de cache no backend. Candle é pesado, e com várias
// mesas o backend serializa as idas ao Yahoo — então o candle chega
// SEGUNDOS depois. Nessa janela o padrão voltava, encontrava
// `candles` vazio e era descartado. Sem nova tentativa nunca: o efeito
// só roda de novo se ticker, user ou timeframe mudarem.
//
// Ou seja: o caso descartado não era exceção, era a regra nas mesas de
// baixo — exatamente as que ficavam "limpas".
//
// Este teste força a ordem ruim: padrão responde na hora, candle demora.

const buscas = [];
vi.mock('../lib/grafico/padroes.js', async (original) => {
  const real = await original();
  return {
    ...real,
    tokenDaSessao: vi.fn(async () => 'token-de-teste'),
    fetchPadroesMarcados: vi.fn(async (ticker, timeframe, token) => {
      buscas.push({ ticker, comToken: Boolean(token) });
      // O timestamp tem de casar com um candle de verdade, E tem de ter
      // `lampada`: sem ela resolverPadroesPorTimestamp descarta o padrao
      // ("nao desenhar pela metade") e o teste passaria/falharia por um
      // motivo que nao e o dele. Foi o que aconteceu na primeira versao
      // deste arquivo.
      const { CANDLES_FAKE } = await import('./dadosFake.js');
      const ts = CANDLES_FAKE[0].timestamp;
      return {
        plano: 'admin',
        padroes: [{
          tipo: 'bandeira_alta',
          resultado: 'sucesso',
          pontos: { p1: { timestamp: ts, preco: 10 } },
          lampada: { timestamp: ts, preco: 10 },
        }],
        niveis: [],
        timeframesComPadrao: ['1d'],
      };
    }),
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

// Atrasa SÓ os candles. O resto do mundo responde na hora.
function candlesAtrasados(ms) {
  globalThis.fetch = vi.fn(async (url) => {
    if (String(url).includes('/ativo/')) {
      await new Promise((ok) => setTimeout(ok, ms));
    }
    return respostaFake(url);
  });
}

describe('padrão que chega antes do candle', () => {
  beforeEach(() => {
    buscas.length = 0;
    vi.clearAllMocks();
    useAuth.mockReturnValue(ADMIN);
  });
  afterEach(() => { globalThis.fetch = vi.fn(respostaFake); });

  it('espera os candles em vez de ser descartado', async () => {
    candlesAtrasados(400);
    renderApp('/ativo/PETR4.SA');

    // O padrão foi buscado, e com token.
    await waitFor(() => {
      expect(buscas.some((b) => b.ticker === 'PETR4.SA' && b.comToken)).toBe(true);
    }, { timeout: 6000 });

    // O tipo detectado nasce com o filtro ligado, e o filtro ligado
    // aparece como chip na legenda. Nenhum chip = o padrão não chegou na
    // tela, que era o bug.
    await waitFor(() => {
      expect(document.body.textContent).toContain('Bandeira de Alta');
    }, { timeout: 8000 });
  }, 15000);

  it('e também funciona na ordem boa (candle primeiro)', async () => {
    candlesAtrasados(0);
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => {
      expect(document.body.textContent).toContain('Bandeira de Alta');
    }, { timeout: 8000 });
  }, 15000);
});
