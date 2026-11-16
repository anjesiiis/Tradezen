import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";

const api = { testarModelo: vi.fn() };
vi.mock("../admin/adminApi.js", () => ({
  testarModelo: (p, o) => api.testarModelo(p, o),
}));

const { default: AdminModelosTeste } = await import("../admin/AdminModelosTeste.jsx");

const PADROES = [
  { id: "bandeira_alta_qualidade", rotulo: "Bandeira de Alta — qualidade" },
  { id: "bandeira_alta", rotulo: "Bandeira de Alta" },
];

const linha = (id, res, conf, noTreino, extra = {}) => ({
  template_id: id, tabela: "templates_bandeira_alta", ticker: `T${id}`,
  timeframe: "1d", rotulo_humano: res === "VP" || res === "FN" ? "sucesso" : "falha",
  confianca_modelo: conf, resultado: res, no_treino: noTreino,
  qualidade: 8, resultado_marcado: "sucesso",
  periodo_inicio: "2026-01-01 00:00", periodo_fim: "2026-02-01 00:00",
  features: { retracao_pct: 0.8, inclinacao_canal: -0.02 },
  pontos: { p1: { i: 0, preco: 10 }, p2: { i: 4, preco: 14 }, p3: { i: 8, preco: 12 } },
  ...extra,
});

const SAIDA = {
  padrao: "bandeira_alta_qualidade", tipo: "qualidade",
  pergunta: "este desenho é 4,5 estrelas ou mais?",
  modelo: { id: "m1", versao: 1 }, limiar: 0.5, do_cache: false,
  linhas: [
    linha(1, "VP", 0.95, false), linha(2, "FP", 0.88, false),
    linha(3, "FN", 0.12, false), linha(4, "VN", 0.05, false),
    linha(5, "VP", 0.99, true),
  ],
  falhas_extracao: [{ template_id: 7, tabela: "templates_bandeira_baixa", ticker: "ASAI3.SA", motivo: "não deu pra calcular o ATR antes do mastro" }],
  resumo: { total: 5, vp: 2, vn: 1, fp: 1, fn: 1, accuracy: 0.6, precisao: 0.67, recall: 0.67, f1: 0.67, roc_auc: 0.75 },
  resumo_nao_vistos: { total: 4, vp: 1, vn: 1, fp: 1, fn: 1, accuracy: 0.5, precisao: 0.5, recall: 0.5, f1: 0.5, roc_auc: 0.5 },
};

const montar = () => render(<AdminModelosTeste padroes={PADROES} />);
const rodar = async (c) => {
  fireEvent.click(screen.getByText("🧪 Rodar Teste"));
  await waitFor(() => expect(c.querySelector(".mt-grade")).not.toBeNull());
};

beforeEach(() => {
  cleanup();
  api.testarModelo.mockReset();
  api.testarModelo.mockResolvedValue(SAIDA);
});

describe("o laboratório de validação", () => {
  it("não roda nada antes de clicar", () => {
    montar();
    expect(api.testarModelo).not.toHaveBeenCalled();
  });

  // AS DUAS MATRIZES. O modelo treinou em 85% do acervo; mostrar só a
  // matriz do acervo inteiro entregaria um número que desaba no primeiro
  // uso real (medido: 89% contra 59%).
  it("mostra a matriz dos nunca vistos E a do acervo inteiro", async () => {
    const { container } = montar();
    await rodar(container);
    const titulos = [...container.querySelectorAll(".mt-matriz h4")].map((h) => h.textContent);
    expect(titulos).toEqual(["Só o que o modelo nunca viu", "Acervo inteiro"]);
    // a dos nunca vistos vem PRIMEIRO, porque é a que vale
    expect(container.querySelectorAll(".mt-matriz")[0].textContent)
      .toMatch(/vale como medida/);
  });

  it("a pergunta do alvo aparece junto dos números", async () => {
    const { container } = montar();
    await rodar(container);
    expect(screen.getByText(/este desenho é 4,5 estrelas ou mais/)).toBeTruthy();
  });

  it("nasce filtrando erros e só os nunca vistos", async () => {
    const { container } = montar();
    await rodar(container);
    // FP(0.88) e FN(0.12) dos não-vistos: dois cards
    expect(container.querySelectorAll(".mt-card")).toHaveLength(2);
  });

  it("ordena por confiança decrescente", async () => {
    const { container } = montar();
    await rodar(container);
    fireEvent.click(screen.getByText("Todos"));
    const ids = [...container.querySelectorAll(".mt-card header")].map((h) => h.textContent);
    expect(ids[0]).toMatch(/#1/);   // 0.95
    expect(ids[1]).toMatch(/#2/);   // 0.88
  });

  it("destravar o filtro dos vistos inclui o que estava no treino", async () => {
    const { container } = montar();
    await rodar(container);
    fireEvent.click(screen.getByText("Todos"));
    expect(container.querySelectorAll(".mt-card")).toHaveLength(4);
    fireEvent.click(screen.getByLabelText(/nunca viu/));
    expect(container.querySelectorAll(".mt-card")).toHaveLength(5);
  });

  it("cada tipo de resultado tem sua cor de borda", async () => {
    const { container } = montar();
    await rodar(container);
    fireEvent.click(screen.getByText("Todos"));
    for (const classe of ["vp", "vn", "fp", "fn"]) {
      expect(container.querySelectorAll(`.mt-card.${classe}`).length).toBeGreaterThan(0);
    }
  });

  it("desenha o esqueleto do padrão a partir dos pontos", async () => {
    const { container } = montar();
    await rodar(container);
    const svg = container.querySelector(".mt-card .mt-mini");
    expect(svg).not.toBeNull();
    expect(svg.querySelectorAll(".mt-mini-ponto")).toHaveLength(3);
  });

  // Ponto sem i/preço não pode virar NaN no path — um "M NaN NaN" apaga
  // o desenho inteiro em silêncio.
  it("ponto incompleto não quebra o desenho", async () => {
    api.testarModelo.mockResolvedValue({
      ...SAIDA,
      linhas: [linha(9, "FP", 0.9, false, { pontos: { p1: { i: 0, preco: 10 }, p2: { i: null } } })],
    });
    const { container } = montar();
    await rodar(container);
    expect(container.querySelector(".mt-card").textContent).toMatch(/sem pontos/);
  });

  it("lista separada para o que não deu pra medir", async () => {
    const { container } = montar();
    await rodar(container);
    expect(screen.getByText(/ASAI3.SA/)).toBeTruthy();
    expect(container.querySelector(".mt-falhas").textContent).toMatch(/1 template/);
  });

  it("o detalhe abre com as features e se o modelo já tinha visto", async () => {
    const { container } = montar();
    await rodar(container);
    fireEvent.click(container.querySelectorAll(".mt-ver")[0]);
    const modal = screen.getByRole("dialog");
    expect(modal.textContent).toMatch(/exemplo novo/);
    // Dentro do modal, não na página: o card também lista as features.
    expect(modal.querySelector(".mt-features").textContent).toMatch(/retracao_pct/);
  });

  it("reusa o resultado guardado e só recalcula no Forçar", async () => {
    api.testarModelo.mockResolvedValue({ ...SAIDA, do_cache: true });
    const { container } = montar();
    await rodar(container);
    expect(api.testarModelo).toHaveBeenCalledWith("bandeira_alta_qualidade",
      { forcar: false });
    expect(screen.getByText(/resultado guardado/)).toBeTruthy();
    fireEvent.click(screen.getByText("Forçar novo teste"));
    await waitFor(() => expect(api.testarModelo).toHaveBeenCalledWith(
      "bandeira_alta_qualidade", { forcar: true }));
  });

  it("sem modelo salvo, mostra o recado em vez de tela vazia", async () => {
    api.testarModelo.mockRejectedValue(new Error("Nenhum modelo salvo para este padrão."));
    montar();
    fireEvent.click(screen.getByText("🧪 Rodar Teste"));
    expect(await screen.findByText(/Nenhum modelo salvo/)).toBeTruthy();
  });
});
