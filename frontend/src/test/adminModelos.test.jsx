import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const api = {
  fetchStatusModelos: vi.fn(),
  treinarModelo: vi.fn(),
  ativarModelo: vi.fn(),
};
vi.mock("../admin/adminApi.js", () => ({
  fetchStatusModelos: (p) => api.fetchStatusModelos(p),
  treinarModelo: (p) => api.treinarModelo(p),
  ativarModelo: (id) => api.ativarModelo(id),
}));

const { default: AdminModelos } = await import("../admin/AdminModelos.jsx");

const SEM_FRACASSO = {
  padrao: "bandeira_alta", n_sucesso: 212, n_falha: 4,
  minimo_por_classe: 30, pode_treinar: false, pulados: [], modelos: [], ativo: null,
};

const COM_MODELOS = {
  padrao: "bandeira_alta", n_sucesso: 212, n_falha: 48,
  minimo_por_classe: 30, pode_treinar: true,
  pulados: [{ tabela: "templates_bandeira_alta", id: 7, ticker: "ASAI3.SA", motivo: "não deu pra calcular o ATR antes do mastro" }],
  modelos: [
    { id: "m3", versao: 3, precisao: 0.87, recall: 0.72, f1: 0.79, accuracy: 0.84, roc_auc: 0.9, ativo: true, treinado_em: "2026-11-16T20:00:00Z" },
    { id: "m2", versao: 2, precisao: 0.85, recall: 0.70, f1: 0.77, accuracy: 0.82, roc_auc: 0.88, ativo: false, treinado_em: "2026-11-15T20:00:00Z" },
  ],
  ativo: { id: "m3", versao: 3 },
};

const montar = () => render(<MemoryRouter><AdminModelos /></MemoryRouter>);

beforeEach(() => {
  cleanup();
  api.fetchStatusModelos.mockReset();
  api.treinarModelo.mockReset();
  api.ativarModelo.mockReset();
  api.fetchStatusModelos.mockResolvedValue(SEM_FRACASSO);
});

describe("a tela de modelos", () => {
  it("mostra o acervo dos dois padrões", async () => {
    montar();
    await waitFor(() => expect(api.fetchStatusModelos).toHaveBeenCalledWith("bandeira_alta"));
    expect(api.fetchStatusModelos).toHaveBeenCalledWith("bandeira_baixa");
    expect(screen.getByText("Bandeira de Alta")).toBeTruthy();
    expect(screen.getByText("Bandeira de Baixa")).toBeTruthy();
  });

  // O BOTÃO DESABILITADO TEM DE DIZER POR QUÊ. Botão cinza sem motivo faz
  // a pessoa achar que a tela quebrou — foi o que custou horas na
  // qualidade em estrelas.
  it("com poucos fracassos, desabilita o treino e diz quantos faltam", async () => {
    const { container } = montar();
    await waitFor(() => expect(container.querySelector(".mdl-treinar")).not.toBeNull());
    expect(container.querySelector(".mdl-treinar").disabled).toBe(true);
    expect(screen.getAllByText(/faltam 26 fracassos/).length).toBeGreaterThan(0);
  });

  it("lista os templates que o modelo não consegue medir, com id e ticker", async () => {
    api.fetchStatusModelos.mockResolvedValue(COM_MODELOS);
    montar();
    expect(await screen.findAllByText(/ASAI3.SA/)).toBeTruthy();
    expect(screen.getAllByText(/#7/).length).toBeGreaterThan(0);
  });

  it("com acervo suficiente, o botão libera", async () => {
    api.fetchStatusModelos.mockResolvedValue(COM_MODELOS);
    const { container } = montar();
    await waitFor(() => expect(container.querySelector(".mdl-treinar").disabled).toBe(false));
  });

  it("mostra o modelo ativo e as métricas comparadas com o anterior", async () => {
    api.fetchStatusModelos.mockResolvedValue(COM_MODELOS);
    montar();
    expect(await screen.findAllByText(/ATIVO em produção/)).toBeTruthy();
    // 85% → 87%, em PONTOS: +2 pontos, não +2%.
    expect(screen.getAllByText(/85% →/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+2 pontos/).length).toBeGreaterThan(0);
  });

  it("queda aparece como queda, não como melhora", async () => {
    api.fetchStatusModelos.mockResolvedValue({
      ...COM_MODELOS,
      modelos: [
        { ...COM_MODELOS.modelos[0], precisao: 0.80 },
        COM_MODELOS.modelos[1],
      ],
    });
    const { container } = montar();
    await waitFor(() => expect(container.querySelector(".mdl-delta.desce")).not.toBeNull());
    expect(screen.getAllByText(/-5 pontos/).length).toBeGreaterThan(0);
  });

  it("treinar chama a rota e recarrega o status", async () => {
    api.fetchStatusModelos.mockResolvedValue(COM_MODELOS);
    api.treinarModelo.mockResolvedValue({
      treinou: true,
      modelo: { id: "m4", versao: 4, ativo: false },
      metricas: { precisao: 0.9, recall: 0.75, f1: 0.82, accuracy: 0.88, roc_auc: 0.93 },
    });
    const { container } = montar();
    await waitFor(() => expect(container.querySelector(".mdl-treinar").disabled).toBe(false));
    fireEvent.click(container.querySelectorAll(".mdl-treinar")[0]);
    await waitFor(() => expect(api.treinarModelo).toHaveBeenCalledWith("bandeira_alta"));
    expect(await screen.findByText(/Modelo v4 treinado/)).toBeTruthy();
  });

  // Treinar não promove: o modelo novo só entra em produção por um clique
  // consciente. Sem isso, um treino ruim derrubaria o que funcionava.
  it("o modelo recém-treinado não vem ativo — oferece ativar", async () => {
    api.fetchStatusModelos.mockResolvedValue(COM_MODELOS);
    api.treinarModelo.mockResolvedValue({
      treinou: true, modelo: { id: "m4", versao: 4, ativo: false },
      metricas: { precisao: 0.9, recall: 0.75, f1: 0.82, accuracy: 0.88 },
    });
    api.ativarModelo.mockResolvedValue({ modelo: { id: "m4", ativo: true } });
    const { container } = montar();
    await waitFor(() => expect(container.querySelector(".mdl-treinar").disabled).toBe(false));
    fireEvent.click(container.querySelectorAll(".mdl-treinar")[0]);
    const ativar = await screen.findByText("Ativar este modelo");
    fireEvent.click(ativar);
    await waitFor(() => expect(api.ativarModelo).toHaveBeenCalledWith("m4"));
  });

  it("erro do backend aparece escrito, sem derrubar a tela", async () => {
    api.fetchStatusModelos.mockRejectedValue(
      new Error("A tabela modelos_treinados ainda não existe no Supabase."));
    montar();
    expect(await screen.findAllByText(/modelos_treinados ainda não existe/)).toBeTruthy();
    expect(screen.getByText("Bandeira de Alta")).toBeTruthy();
  });

  it("métrica ausente não vira 0%", async () => {
    api.fetchStatusModelos.mockResolvedValue({
      ...COM_MODELOS,
      modelos: [{ id: "m1", versao: 1, precisao: 0.8, recall: null, f1: null, accuracy: 0.8, roc_auc: null, ativo: false, treinado_em: "2026-11-16T20:00:00Z" }],
      ativo: null,
    });
    const { container } = montar();
    await waitFor(() => expect(container.querySelector(".mdl-ultimo")).not.toBeNull());
    // Recall, F1 e ROC AUC vieram nulos: travessão, não "0%". Zero por
    // cento afirma que o modelo errou tudo, e isso é diferente de não
    // haver como medir (ROC AUC pede as duas classes no teste).
    // Só o primeiro bloco: os dois padrões usam o mesmo mock aqui.
    const valores = [...container.querySelector(".mdl-ultimo").querySelectorAll("dd")]
      .map((d) => d.textContent);
    expect(valores).toEqual(["80%", "—", "—", "80%", "—"]);
  });
});
