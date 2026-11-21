import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePosicaoPopover } from "../hooks/usePosicaoPopover.js";

// ONDE O POPOVER CABE
// ===================
//
// Este hook existe por causa de um bug real: a primeira versão ancorada
// do painel de indicadores abria sempre em top = (base do botão), e nas
// mesas de baixo do multichart esse ponto está a poucos pixels do pé da
// tela — o painel abria quase todo fora da JANELA (não era o grid
// cortando; o painel vive num portal no document.body).
//
// Então o que estes testes travam é a MEDIDA, não a aparência. Cada caso
// é uma das quatro posições do multichart 2x2.

const JANELA = { w: 1280, h: 800 };
// Painel de 480x360, as medidas reais do .pind.
const PAINEL = { w: 480, h: 360 };

function montar(botao) {
  const ancora = { current: { getBoundingClientRect: () => botao } };
  const painel = { current: { offsetWidth: PAINEL.w, offsetHeight: PAINEL.h } };
  return renderHook(() => usePosicaoPopover(ancora, painel, true));
}

// Um botão de barra de mesa: 100x24.
const botao = (left, top) => ({
  left, top, right: left + 100, bottom: top + 24,
  width: 100, height: 24,
});

beforeEach(() => {
  window.innerWidth = JANELA.w;
  window.innerHeight = JANELA.h;
});
afterEach(() => vi.restoreAllMocks());

describe("multichart 2x2 — as quatro posições", () => {
  it("mesa de cima à esquerda: abre ABAIXO, alinhado pela esquerda", () => {
    const { result } = montar(botao(40, 60));
    expect(result.current.pronta).toBe(true);
    expect(result.current.top).toBe(60 + 24 + 8);   // base do botão + folga
    expect(result.current.left).toBe(40);
    expect(result.current.origem).toBe("top left");
  });

  it("mesa de cima à direita: abre ABAIXO, alinhado pela DIREITA do botão", () => {
    // Botão a 1200px: 1200 + 480 passaria de 1280 - 12.
    const { result } = montar(botao(1200, 60));
    expect(result.current.origem).toBe("top right");
    // Alinhado pela direita do botão (1300), mas preso na margem:
    expect(result.current.left).toBe(JANELA.w - 12 - PAINEL.w);
  });

  it("mesa de baixo à esquerda: abre ACIMA, porque não cabe embaixo", () => {
    // Botão a 700px de topo: 724 + 8 + 360 = 1092 > 800 - 12.
    const { result } = montar(botao(40, 700));
    expect(result.current.origem).toBe("bottom left");
    expect(result.current.top).toBe(700 - 8 - PAINEL.h);
    expect(result.current.left).toBe(40);
  });

  it("mesa de baixo à direita: abre ACIMA e pela direita", () => {
    const { result } = montar(botao(1200, 700));
    expect(result.current.origem).toBe("bottom right");
    expect(result.current.top).toBe(700 - 8 - PAINEL.h);
  });
});

describe("nunca fora da janela", () => {
  it("sem espaço em cima nem embaixo, fica dentro e rola por dentro", () => {
    window.innerHeight = 420;   // janela baixa: 360 de painel não cabe folgado
    const { result } = montar(botao(40, 200));
    expect(result.current.top).toBeGreaterThanOrEqual(12);
    expect(result.current.top + PAINEL.h).toBeLessThanOrEqual(420 - 12 + 1);
  });

  it("botão encostado na borda esquerda não empurra o painel pra fora", () => {
    const { result } = montar(botao(0, 60));
    expect(result.current.left).toBeGreaterThanOrEqual(12);
  });

  it("janela estreita: o painel não fica com left negativo", () => {
    window.innerWidth = 400;
    const { result } = montar(botao(300, 60));
    expect(result.current.left).toBeGreaterThanOrEqual(12);
  });
});

describe("acompanha a tela", () => {
  it("recalcula quando a janela muda de tamanho", () => {
    let caixa = botao(40, 60);
    const ancora = { current: { getBoundingClientRect: () => caixa } };
    const painel = { current: { offsetWidth: PAINEL.w, offsetHeight: PAINEL.h } };
    const { result } = renderHook(() => usePosicaoPopover(ancora, painel, true));
    const antes = result.current.origem;
    expect(antes).toBe("top left");

    // A janela encolhe e o botão agora está perto do pé: tem que virar.
    caixa = botao(40, 700);
    act(() => { window.dispatchEvent(new Event("resize")); });
    expect(result.current.origem).toBe("bottom left");
  });

  it("recalcula na rolagem, inclusive a de dentro de um container", () => {
    let caixa = botao(40, 60);
    const ancora = { current: { getBoundingClientRect: () => caixa } };
    const painel = { current: { offsetWidth: PAINEL.w, offsetHeight: PAINEL.h } };
    const { result } = renderHook(() => usePosicaoPopover(ancora, painel, true));

    caixa = botao(40, 300);
    // `true` na captura: rolagem dentro de um container não borbulha.
    act(() => { window.dispatchEvent(new Event("scroll")); });
    expect(result.current.top).toBe(300 + 24 + 8);
  });

  it("inativo não mede nada e não fica 'pronta'", () => {
    const ancora = { current: { getBoundingClientRect: () => botao(40, 60) } };
    const painel = { current: { offsetWidth: PAINEL.w, offsetHeight: PAINEL.h } };
    const { result } = renderHook(() => usePosicaoPopover(ancora, painel, false));
    expect(result.current.pronta).toBe(false);
  });

  it("sem âncora no DOM não estoura", () => {
    const { result } = renderHook(() =>
      usePosicaoPopover({ current: null }, { current: null }, true));
    expect(result.current.pronta).toBe(false);
  });
});
