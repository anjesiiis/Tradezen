import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import BarraInstrucao from "../components/chart/BarraInstrucao.jsx";
import { FERRAMENTA_INFO } from "../lib/grafico/desenhos.js";
import { GRUPOS_FERRAMENTAS } from "../components/chart/ferramentasGrafico.js";

// A DICA DA FERRAMENTA ARMADA
// ===========================
//
// O bug que motivou isto NÃO era a posição: a barra já ficava no topo
// central. Era que o invólucro dela não tinha pointer-events:none. Ela é
// desenhada em cima dos candles, então o clique que a pessoa dava num
// candle debaixo da barra morria nela — a ferramenta seguia armada, a
// dica seguia pedindo o ponto, e nada acontecia. Cobria E engolia.
//
// Por isso o teste mais importante aqui é o do CSS: é lá que mora o
// conserto, e é uma regra que alguém pode apagar sem perceber.

const CSS = readFileSync(resolve(process.cwd(), "src/styles/appCss.js"), "utf8");
const regra = (seletor) => {
  const i = CSS.indexOf(seletor + "{");
  return i < 0 ? "" : CSS.slice(i, CSS.indexOf("}", i));
};

describe("o clique atravessa a barra", () => {
  it("o invólucro não recebe ponteiro — era o bug", () => {
    expect(regra(".barra-dica-wrap")).toMatch(/pointer-events:\s*none/);
  });

  it("o texto também não, senão o problema volta nele", () => {
    expect(regra(".barra-dica-texto")).toMatch(/pointer-events:\s*none/);
  });

  it("só o ✕ volta a receber ponteiro", () => {
    expect(regra(".barra-dica-x")).toMatch(/pointer-events:\s*auto/);
  });

  it("fica no topo, não no centro: o centro é onde estão os candles", () => {
    const r = regra(".barra-dica-wrap");
    expect(r).toMatch(/top:\s*10px/);
    expect(r).not.toMatch(/translate\(-50%,\s*-50%\)/);
  });

  it("dentro do gráfico (absolute), não na janela — no multichart cada mesa tem a sua", () => {
    expect(regra(".barra-dica-wrap")).toMatch(/position:\s*absolute/);
  });
});

describe("o texto acompanha a etapa", () => {
  it("Fibonacci: 0% no começo, 100% depois do primeiro ponto", () => {
    const { rerender } = render(<BarraInstrucao ferramenta="fibo" pontosMarcados={0} />);
    expect(screen.getByText(/clique no 0%/)).toBeTruthy();
    rerender(<BarraInstrucao ferramenta="fibo" pontosMarcados={1} />);
    expect(screen.getByText(/clique no 100%/)).toBeTruthy();
  });

  it("canal tem três etapas, e a terceira fala de largura", () => {
    const { rerender } = render(<BarraInstrucao ferramenta="canal" pontosMarcados={0} />);
    expect(screen.getByText(/arraste de um ponto ao outro/)).toBeTruthy();
    rerender(<BarraInstrucao ferramenta="canal" pontosMarcados={2} />);
    expect(screen.getByText(/largura/)).toBeTruthy();
  });

  it("etapa além das dicas cai num texto genérico, não em vazio", () => {
    render(<BarraInstrucao ferramenta="fibo" pontosMarcados={9} />);
    expect(screen.getByText("Toque no gráfico…")).toBeTruthy();
  });

  it("sem ferramenta armada não aparece nada", () => {
    const { container } = render(<BarraInstrucao ferramenta={null} pontosMarcados={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("ferramenta que não está no catálogo não quebra a tela", () => {
    const { container } = render(<BarraInstrucao ferramenta="inventada" pontosMarcados={0} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("cancelar", () => {
  it("o ✕ cancela a ferramenta", () => {
    const aoCancelar = vi.fn();
    render(<BarraInstrucao ferramenta="trend" pontosMarcados={0} aoCancelar={aoCancelar} />);
    fireEvent.click(screen.getByLabelText("Cancelar ferramenta"));
    expect(aoCancelar).toHaveBeenCalled();
  });
});

// GUARDA DO CATÁLOGO.
// Dica e máquina de estados leem do MESMO FERRAMENTA_INFO. Se alguém
// acrescentar uma ferramenta na barra lateral e esquecer as dicas, a
// pessoa fica com "Toque no gráfico…" sem saber onde — e o teste cai
// antes disso chegar em produção.
describe("catálogo de dicas", () => {
  const daBarra = GRUPOS_FERRAMENTAS.flat().map((f) => f.id);

  it("toda ferramenta da barra lateral tem dica", () => {
    for (const id of daBarra) {
      expect(FERRAMENTA_INFO[id], `${id} está na barra e não tem FERRAMENTA_INFO`).toBeTruthy();
      expect(FERRAMENTA_INFO[id].hints.length, `${id} sem dica`).toBeGreaterThan(0);
    }
  });

  it("cada ferramenta tem uma dica por ponto que ela pede", () => {
    for (const id of daBarra) {
      const info = FERRAMENTA_INFO[id];
      expect(info.hints.length, `${id}: ${info.npontos} pontos e ${info.hints.length} dicas`)
        .toBe(info.npontos);
    }
  });

  it("nenhuma dica vem vazia", () => {
    for (const id of daBarra) {
      for (const [i, h] of FERRAMENTA_INFO[id].hints.entries()) {
        expect(h.trim(), `${id}, etapa ${i + 1}`).not.toBe("");
      }
    }
  });
});
