import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './helpers.jsx';

/**
 * A BUSCA DE DENTRO DA MESA ENXERGA O CATÁLOGO INTEIRO.
 *
 * Ela recebia `mercado`, que é a resposta de /mercado — o resumo da tela
 * inicial, só com os ativos marcados `resumo: True`. São 69 dos 283. A
 * busca do topo nunca teve esse problema porque usa /ativos.
 *
 * O efeito prático do relato: ativo com padrão já marcado não aparecia na
 * hora de trocar o ativo da mesa.
 */

const NO_RESUMO = [
  { ticker: 'PETR4.SA', nome: 'Petrobras PN', simbolo: 'PETR4', mercado: 'B3',
    variacao_pct: 1.2, alta: true },
];
const NO_CATALOGO = [
  ...NO_RESUMO.map(({ variacao_pct, alta, ...resto }) => resto),
  { ticker: 'DIRR3.SA', nome: 'Direcional', simbolo: 'DIRR3', mercado: 'B3' },
  { ticker: 'UNI7083-USD', nome: 'Uniswap', simbolo: 'UNI', mercado: 'CRIPTO' },
];

const original = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.includes('/ativos/buscar')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ resultados: NO_CATALOGO }) });
    }
    if (u.endsWith('/ativos')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ativos: NO_CATALOGO }) });
    }
    if (u.includes('/mercado')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ dados: NO_RESUMO }) });
    }
    if (u.includes('/ativo/')) {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({
          candles: Array.from({ length: 30 }, (_, i) => ({
            timestamp: (1700000000 + i * 86400) * 1000, data: '2026-01-01 00:00',
            abertura: 10, maxima: 11, minima: 9, fechamento: 10.5, volume: 10,
          })),
          niveis: [],
        }),
      });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  });
});

afterEach(() => { global.fetch = original; });

const abrirTroca = async () => {
  renderApp('/ativo/PETR4.SA');
  const titulo = await waitFor(() => {
    const el = document.querySelector('.atick');
    expect(el).not.toBeNull();
    return el;
  }, { timeout: 8000 });
  fireEvent.click(titulo);
  await waitFor(() => expect(document.querySelector('input[placeholder="Buscar ativo..."]')).not.toBeNull(),
    { timeout: 8000 });
};

describe('trocar o ativo da mesa', () => {
  it('oferece ativos que não estão no resumo da home', async () => {
    await abrirTroca();
    // DIRR3 só existe no catálogo (/ativos), não no resumo (/mercado).
    // Era exatamente esse o buraco.
    await waitFor(() => expect(screen.getByText('DIRR3')).toBeInTheDocument(), { timeout: 8000 });
    expect(screen.getByText('UNI')).toBeInTheDocument();
  }, 20000);

  it('busca pelo nome também, não só pelo símbolo', async () => {
    await abrirTroca();
    await waitFor(() => expect(screen.getByText('DIRR3')).toBeInTheDocument(), { timeout: 8000 });
    fireEvent.change(document.querySelector('input[placeholder="Buscar ativo..."]'),
      { target: { value: 'uniswap' } });
    await waitFor(() => expect(screen.getByText('UNI')).toBeInTheDocument());
    expect(screen.queryByText('DIRR3')).toBeNull();
  }, 20000);

  // Mostrar "▼0.00%" num ativo sem cotação carregada afirmaria que ele
  // não se mexeu hoje, o que é diferente de não termos o número.
  it('não inventa variação pra quem não tem cotação', async () => {
    await abrirTroca();
    await waitFor(() => expect(screen.getByText('DIRR3')).toBeInTheDocument(), { timeout: 8000 });
    const linhas = [...document.querySelectorAll('.dd-item')];
    const daDirr = linhas.find((l) => l.textContent.includes('DIRR3'));
    expect(daDirr.textContent).not.toMatch(/0\.00%/);
    const daPetr = linhas.find((l) => l.textContent.includes('PETR4'));
    expect(daPetr.textContent).toMatch(/1\.20%/);   // essa tem, e aparece
  }, 20000);
});
