import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderApp } from './helpers.jsx';

/**
 * MESA SEM DADO DIZ POR QUÊ.
 *
 * O fetch dos candles fazia `.then(r=>r.json())` direto: 429, 404 ou 500
 * vinham como `{detail: ...}`, `d.candles||[]` dava lista vazia, e a mesa
 * ficava com o cabeçalho do ticker e a área em branco — sem aviso, sem
 * erro no console, sem jeito de tentar de novo.
 *
 * Com cinco mesas abertas e um F5, o teto de pedidos por minuto era fácil
 * de alcançar, e o sintoma relatado foi exatamente esse: "dos 5 slots,
 * só 2 renderizaram candles".
 */

const respostas = [];
const original = global.fetch;

const candleFalso = (i) => ({
  timestamp: (1700000000 + i * 86400) * 1000,
  data: '2026-01-01 00:00',
  abertura: 10, maxima: 11, minima: 9, fechamento: 10.5, volume: 100,
});

beforeEach(() => {
  respostas.length = 0;
  global.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.includes('/ativo/') && !u.includes('/ativos')) {
      const r = respostas.shift() || { ok: true, status: 200, candles: 40 };
      return Promise.resolve({
        ok: r.ok, status: r.status,
        json: () => Promise.resolve(r.ok
          ? { candles: Array.from({ length: r.candles }, (_, i) => candleFalso(i)), niveis: [] }
          : { detail: 'erro' }),
      });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ativos: [], dados: [] }) });
  });
});

afterEach(() => { global.fetch = original; });

describe('a mesa quando o gráfico não vem', () => {
  it('429 vira recado de excesso, não área vazia', async () => {
    // Generoso de propósito: o StrictMode monta duas vezes, e a primeira
    // montagem (cancelada) também consome respostas da fila.
    for (let i = 0; i < 12; i++) respostas.push({ ok: false, status: 429 });
    renderApp('/ativo/PETR4.SA');
    expect(await screen.findByText(/Muitos gráficos pedidos de uma vez/, {}, { timeout: 15000 }))
      .toBeInTheDocument();
  }, 20000);

  // 404 é ticker que a fonte não tem: insistir só atrasaria o recado.
  it('404 não tenta de novo e diz que a fonte não tem o ativo', async () => {
    respostas.push({ ok: false, status: 404 });
    renderApp('/ativo/XPTO9.SA');
    expect(await screen.findByText(/não tem este ativo/, {}, { timeout: 10000 }))
      .toBeInTheDocument();
    const pedidos = global.fetch.mock.calls
      .filter((c) => String(c[0]).includes('/ativo/XPTO9'));
    expect(pedidos).toHaveLength(1);
  }, 15000);

  // Resposta boa e vazia é caso real: fim de semana, período sem pregão.
  it('zero candles não fica em branco', async () => {
    respostas.push({ ok: true, status: 200, candles: 0 });
    renderApp('/ativo/PETR4.SA');
    expect(await screen.findByText(/Nenhum candle neste período/, {}, { timeout: 10000 }))
      .toBeInTheDocument();
  }, 15000);

  // 429 e 5xx passam sozinhos: a segunda tentativa tem de ser suficiente.
  it('se a tentativa seguinte dá certo, o gráfico aparece sem recado', async () => {
    respostas.push({ ok: false, status: 500 });
    respostas.push({ ok: true, status: 200, candles: 40 });
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(screen.queryByText(/Não deu pra carregar/)).toBeNull(),
      { timeout: 10000 });
  }, 15000);

  it('o botão tenta de novo de verdade', async () => {
    respostas.push({ ok: false, status: 404 });
    renderApp('/ativo/PETR4.SA');
    const botao = await screen.findByText('Tentar de novo', {}, { timeout: 10000 });
    const antes = global.fetch.mock.calls.filter((c) => String(c[0]).includes('/ativo/PETR4')).length;
    fireEvent.click(botao);
    await waitFor(() => {
      const depois = global.fetch.mock.calls.filter((c) => String(c[0]).includes('/ativo/PETR4')).length;
      expect(depois).toBeGreaterThan(antes);
    }, { timeout: 10000 });
  }, 20000);
});
