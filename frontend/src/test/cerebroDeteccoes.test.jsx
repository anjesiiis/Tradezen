import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mockPanorama = vi.fn();
vi.mock("../admin/adminApi.js", () => ({ fetchPanorama: () => mockPanorama() }));

const { default: CerebroDeteccoes } = await import("../admin/CerebroDeteccoes.jsx");

const FAMILIAS = {
  continuacao: { nome: "Continuação", total: 138, sucesso: 60, falha: 25, indefinido: 53, taxa_sucesso: 71, ultimo: "2026-11-10T12:00:00Z", meta: 100 },
  reversao: { nome: "Reversão", total: 12, sucesso: 3, falha: 1, indefinido: 8, taxa_sucesso: 75, ultimo: null, meta: 100 },
  niveis: { nome: "Suporte e Resistência", total: 0, sucesso: 0, falha: 0, indefinido: 0, taxa_sucesso: null, ultimo: null, meta: 100 },
  triangulos: { nome: "Canais e Triângulos", total: 7, sucesso: 0, falha: 0, indefinido: 7, taxa_sucesso: null, ultimo: null, meta: 100 },
};

const montar = () => render(<MemoryRouter><CerebroDeteccoes /></MemoryRouter>);

beforeEach(() => {
  cleanup();
  mockPanorama.mockReset();
  mockPanorama.mockResolvedValue({ familias: FAMILIAS, meta: 100 });
});

describe("o Cérebro de Detecções", () => {
  it("desenha os quatro lobos", async () => {
    const { container } = montar();
    await waitFor(() => expect(container.querySelectorAll(".cerebro-lobo")).toHaveLength(4));
  });

  it("mostra os números da família acesa", async () => {
    montar();
    expect(await screen.findAllByText("138")).toHaveLength(2);  // botão e ficha
    expect(screen.getByText("71%")).toBeTruthy();
    expect(screen.getByText("60 · 25")).toBeTruthy();
  });

  // Taxa 0% diz "tudo falhou". Quem não tem desfecho nenhum não falhou —
  // são afirmações diferentes, e a tela não pode trocar uma pela outra.
  it("sem desfecho nenhum, não inventa 0% de sucesso", async () => {
    montar();
    fireEvent.mouseEnter(await screen.findByTitle(/Temporal/));
    expect(screen.getByText("sem desfecho ainda")).toBeTruthy();
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("passar o mouse num lobo troca a ficha", async () => {
    const { container } = montar();
    await screen.findAllByText("138");
    fireEvent.mouseEnter(screen.getByTitle(/Parietal/));
    // Na ficha, não no botão: os dois escrevem o nome da família.
    expect(container.querySelector(".cerebro-ficha-nome").textContent).toBe("Reversão");
    expect(screen.getByText("3 · 1")).toBeTruthy();
  });

  // Teclado tem de chegar aos mesmos dados que o mouse: o lobo é botão,
  // e focar acende igual a passar o mouse.
  it("foco pelo teclado acende o lobo", async () => {
    const { container } = montar();
    await screen.findAllByText("138");
    fireEvent.focus(screen.getByTitle(/Occipital/));
    expect(container.querySelector(".cerebro-ficha-nome").textContent)
      .toBe("Canais e Triângulos");
  });

  it("o link leva pra tela onde aquela família é marcada", async () => {
    montar();
    const ir = await screen.findByText(/Marcar Continuação/);
    expect(ir.getAttribute("href")).toBe("/admin/templates/bandeira-alta");
  });

  it("a barra de progresso não passa de 100% com total acima da meta", async () => {
    mockPanorama.mockResolvedValue({
      familias: { ...FAMILIAS, continuacao: { ...FAMILIAS.continuacao, total: 250 } }, meta: 100,
    });
    const { container } = montar();
    await screen.findAllByText("250");
    expect(container.querySelector(".cerebro-barra-cheia").style.width).toBe("100%");
  });

  // Painel é resumo. Se ele cair, a tela de MARCAÇÃO continua de pé —
  // trocar o trabalho pelo relatório do trabalho seria o pior negócio.
  it("erro no panorama não derruba o painel", async () => {
    mockPanorama.mockRejectedValue(new Error("backend dormindo"));
    montar();
    expect(await screen.findByText(/backend dormindo/)).toBeTruthy();
    expect(screen.getByText(/Cérebro de Detecções/)).toBeTruthy();
  });

  it("o desenho é decorativo — os números estão em texto", async () => {
    const { container } = montar();
    await screen.findAllByText("138");
    expect(container.querySelector("svg").getAttribute("aria-hidden")).toBe("true");
  });

  it("respeita prefers-reduced-motion no CSS", () => {
    const css = readFileSync(resolve(process.cwd(), "src/admin/theme.jsx"), "utf8");
    const bloco = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce){\n  .cerebro-lobo"));
    expect(bloco.slice(0, 200)).toMatch(/animation:none/);
  });
});

// AS DUAS LISTAS DE PALAVRAS (frontend e backend)
//
// `resultado` é texto livre, e dois contadores que entendem textos
// diferentes fariam o placar do Cérebro discordar do placar da lista logo
// ao lado. Este teste é o único lugar onde um lado nota que o outro mudou.
describe("a classificação do resultado é a mesma nos dois lados", () => {
  const ler = (caminho) => readFileSync(resolve(process.cwd(), "..", caminho), "utf8");
  const listas = (texto, nome) => {
    const bloco = texto.slice(texto.indexOf(`${nome} = [`));
    // Letras de 2+ caracteres: pega "falh" e "nao" e descarta o "b" do
    // \b, que não é palavra nenhuma.
    return [...bloco.slice(0, bloco.indexOf("]")).matchAll(/[a-z]{2,}/g)]
      .map((m) => m[0]).sort();
  };

  it("as palavras de FALHA batem", () => {
    const js = ler("frontend/src/admin/resultado.js");
    const py = ler("backend/admin_panorama.py");
    expect(listas(py, "FALHA")).toEqual(listas(js, "FALHA"));
  });

  it("as palavras de SUCESSO batem", () => {
    const js = ler("frontend/src/admin/resultado.js");
    const py = ler("backend/admin_panorama.py");
    expect(listas(py, "SUCESSO")).toEqual(listas(js, "SUCESSO"));
  });

  it("falha é testada antes de sucesso nos dois", () => {
    for (const caminho of ["frontend/src/admin/resultado.js", "backend/admin_panorama.py"]) {
      const texto = ler(caminho);
      expect(texto.indexOf("FALHA = [")).toBeLessThan(texto.indexOf("SUCESSO = ["));
    }
  });
});
