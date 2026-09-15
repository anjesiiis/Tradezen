import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { respostaFake } from './dadosFake.js';

// ── Objeto "faz-tudo" ─────────────────────────────────────────
// Qualquer propriedade vira outra função encadeável, e chamar qualquer uma
// devolve outro objeto igual. Serve pra APIs grandes que o jsdom não tem
// (canvas 2D, lightweight-charts): o código chama chart.timeScale()
// .fitContent(), ctx.createLinearGradient().addColorStop()... e nada
// quebra. Em conta numérica vale 0; não é "thenable" nem tem itens.
function fakeApi() {
  const cache = {};
  return new Proxy(function () {}, {
    get(_alvo, prop) {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === 'length') return 0;
      if (typeof prop === 'symbol') return undefined;
      if (!(prop in cache)) cache[prop] = fakeApi();
      return cache[prop];
    },
    apply() {
      return fakeApi();
    },
  });
}

// ── TradingView Lightweight Charts ────────────────────────────
// Desenha em canvas de verdade, o que não existe no jsdom. Os testes
// verificam que o gráfico foi criado (createChart chamado), não o desenho.
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => fakeApi()),
  createSeriesMarkers: vi.fn(() => fakeApi()),
  ColorType: { Solid: 'solid', VerticalGradient: 'gradient' },
  CrosshairMode: { Normal: 0, Magnet: 1, Hidden: 2, MagnetOHLC: 3 },
  LineStyle: { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3, SparseDotted: 4 },
  AreaSeries: { type: 'Area' },
  BaselineSeries: { type: 'Baseline' },
  CandlestickSeries: { type: 'Candlestick' },
  HistogramSeries: { type: 'Histogram' },
  LineSeries: { type: 'Line' },
}));

// ── Supabase ──────────────────────────────────────────────────
// Sem rede: ninguém logado por padrão. Cada teste pode trocar o retorno
// (ex: signInWithPassword com erro) via mockResolvedValueOnce.
vi.mock('../lib/supabaseClient.js', () => ({
  supabaseConfigurado: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
      signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      updateUser: vi.fn(async () => ({ data: {}, error: null })),
    },
  },
}));

// ── APIs do navegador que o jsdom não implementa ──────────────
// matchMedia responde de verdade a max-width/min-width usando
// window.innerWidth — é assim que o useIsMobile() decide o layout, e os
// testes trocam a largura com definirTela() (helpers.jsx).
window.matchMedia = vi.fn((query) => {
  const max = /max-width:\s*(\d+)px/.exec(query);
  const min = /min-width:\s*(\d+)px/.exec(query);
  let matches = false;
  if (max) matches = window.innerWidth <= Number(max[1]);
  if (min) matches = window.innerWidth >= Number(min[1]);
  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
});

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
HTMLCanvasElement.prototype.getContext = function () {
  return fakeApi();
};
window.scrollTo = vi.fn();
Element.prototype.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// ── API do backend ────────────────────────────────────────────
// Todo fetch cai aqui (dadosFake.js decide a resposta por URL). Nenhum
// teste depende do backend estar no ar.
beforeEach(() => {
  globalThis.fetch = vi.fn(respostaFake);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  window.innerWidth = 1280;
  window.history.pushState({}, '', '/');
});
