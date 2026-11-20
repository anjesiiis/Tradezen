import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PainelIndicadores, { filtrarIndicadores, lerFavoritos } from "../components/chart/PainelIndicadores.jsx";
import { CATALOGO_INDICADORES, INDICADORES, CATEGORIAS_INDICADOR } from "../lib/grafico/config.js";

// O PAINEL DE INDICADORES
// =======================
//
// A regra que estes testes travam, e é a razão do painel existir assim:
// TODO CHIP DESENHA. O painel mostra o catálogo inteiro, e o catálogo é
// só o que chega ao gráfico.
//
// Isto já foi diferente: por um dia o painel listou treze indicadores
// apagados com a etiqueta "em breve", e eles saíram por decisão do dono.
// A guarda que ficou é melhor que a flag que havia antes — em vez de
// confiar num booleano escrito à mão no catálogo, o teste de catálogo
// abre CandleChart.jsx e exige o id lá dentro. Indicador listado sem
// desenho derruba a suíte, e ninguém precisa lembrar de marcar nada.

function abrir(props = {}) {
  const aoAlternar = vi.fn();
  const aoFechar = vi.fn();
  const utils = render(
    <PainelIndicadores
      tools={props.tools || new Set()}
      aoAlternar={aoAlternar}
      aoFechar={aoFechar}
      posicao={{ top: 10, left: 10 }}
    />,
  );
  return { ...utils, aoAlternar, aoFechar };
}

beforeEach(() => { localStorage.clear(); });

describe("catálogo", () => {
  it("todo id é único", () => {
    const ids = CATALOGO_INDICADORES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo indicador tem categoria que é uma aba de verdade", () => {
    const abas = new Set(CATEGORIAS_INDICADOR.map((c) => c.id));
    for (const ind of CATALOGO_INDICADORES) {
      expect(abas.has(ind.categoria), `${ind.id} com categoria ${ind.categoria}`).toBe(true);
    }
  });

  it("nenhuma aba abre vazia", () => {
    for (const cat of CATEGORIAS_INDICADOR) {
      const quantos = CATALOGO_INDICADORES.filter((i) => i.categoria === cat.id).length;
      expect(quantos, `aba ${cat.label} sem indicador`).toBeGreaterThan(0);
    }
  });

  // A GUARDA PRINCIPAL. Ela é o que permite tirar a flag "pronto": o
  // chip só existe no painel se o desenho existir no gráfico.
  it("todo indicador do painel é desenhado por CandleChart", () => {
    const fonte = readFileSync(resolve(process.cwd(), "src/components/CandleChart.jsx"), "utf8");
    for (const ind of CATALOGO_INDICADORES) {
      expect(fonte.includes(ind.id), `${ind.id} no painel mas sem desenho em CandleChart.jsx`).toBe(true);
    }
  });

  it("o painel mostra o catálogo inteiro, sem chip desabilitado", () => {
    abrir();
    for (const ind of CATALOGO_INDICADORES) {
      expect(screen.getByTitle(ind.label)).not.toBeDisabled();
    }
    expect(screen.queryByText("em breve")).toBeNull();
  });

  it("clicar num chip chama aoAlternar com o id", () => {
    const { aoAlternar } = abrir();
    fireEvent.click(screen.getByTitle("RSI"));
    expect(aoAlternar).toHaveBeenCalledWith("rsi");
  });
});

describe("abas", () => {
  it("Médias mostra só as médias", () => {
    abrir();
    fireEvent.click(screen.getByRole("tab", { name: "Médias" }));
    expect(screen.getByTitle("EMA 21")).toBeTruthy();
    expect(screen.queryByTitle("RSI")).toBeNull();
  });

  it("a aba traz a contagem do que está ligado nela", () => {
    abrir({ tools: new Set(["ema9", "ema21", "rsi"]) });
    expect(screen.getByRole("tab", { name: /Médias/ }).textContent).toContain("2");
    expect(screen.getByRole("tab", { name: /Osciladores/ }).textContent).toContain("1");
  });

  it("Favoritos só aparece quando existe favorito", () => {
    abrir();
    expect(screen.queryByRole("tab", { name: /Favoritos/ })).toBeNull();
    fireEvent.click(screen.getByLabelText("Favoritar OBV"));
    expect(screen.getByRole("tab", { name: /Favoritos/ })).toBeTruthy();
  });
});

describe("busca", () => {
  it("atravessa as abas: na aba Médias, buscar RSI acha RSI", () => {
    abrir();
    fireEvent.click(screen.getByRole("tab", { name: "Médias" }));
    expect(screen.queryByTitle("RSI")).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar indicador"), { target: { value: "rsi" } });
    expect(screen.getByTitle("RSI")).toBeTruthy();
  });

  it("acha sem acento e pelo alias", () => {
    const favoritos = new Set();
    const porAcento = filtrarIndicadores(CATALOGO_INDICADORES, { categoria: "todos", busca: "medias", favoritos });
    expect(porAcento.length).toBeGreaterThan(0);
    const porAlias = filtrarIndicadores(CATALOGO_INDICADORES, { categoria: "todos", busca: "on balance", favoritos });
    expect(porAlias.map((i) => i.id)).toContain("obv");
  });

  it("nome que não existe mostra o aviso, não uma lista vazia e silenciosa", () => {
    abrir();
    fireEvent.change(screen.getByLabelText("Buscar indicador"), { target: { value: "zzzz" } });
    expect(screen.getByText("Nenhum indicador com esse nome.")).toBeTruthy();
  });

  it("as abas saem de cena durante a busca", () => {
    abrir();
    fireEvent.change(screen.getByLabelText("Buscar indicador"), { target: { value: "rsi" } });
    expect(screen.queryByRole("tab", { name: "Médias" })).toBeNull();
  });
});

describe("favoritos", () => {
  it("sobrevivem no navegador e só guardam o que desenha", () => {
    const { unmount } = abrir();
    fireEvent.click(screen.getByLabelText("Favoritar VWAP"));
    expect([...lerFavoritos()]).toEqual(["vwap"]);
    unmount();
    abrir();
    expect(screen.getByLabelText("Tirar VWAP dos favoritos")).toBeTruthy();
  });

  it("favorito de id que saiu do catálogo é descartado na leitura", () => {
    localStorage.setItem("tradezen:indicadores:favoritos", JSON.stringify(["vwap", "fantasma"]));
    expect([...lerFavoritos()]).toEqual(["vwap"]);
  });

  it("storage quebrado não derruba o painel", () => {
    localStorage.setItem("tradezen:indicadores:favoritos", "{isso nao e json");
    expect([...lerFavoritos()]).toEqual([]);
  });
});

describe("rodapé", () => {
  it("conta os ativos e Limpar todos desliga cada um", () => {
    const { aoAlternar } = abrir({ tools: new Set(["rsi", "vwap"]) });
    expect(screen.getByText("2 ativos")).toBeTruthy();
    fireEvent.click(screen.getByText("Limpar todos"));
    expect(aoAlternar.mock.calls.map((c) => c[0]).sort()).toEqual(["rsi", "vwap"]);
  });

  it("sem nenhum ligado, Limpar todos fica desabilitado", () => {
    abrir();
    expect(screen.getByText("Nenhum ativo")).toBeTruthy();
    expect(screen.getByText("Limpar todos")).toBeDisabled();
  });

  it("Aplicar fecha", () => {
    const { aoFechar } = abrir();
    fireEvent.click(screen.getByText("Aplicar"));
    expect(aoFechar).toHaveBeenCalled();
  });
});

// MODAL CENTRAL, NAO POPOVER ANCORADO
// ===================================
//
// O painel sempre nasceu num portal no document.body, entao o grid do
// multichart nunca o cortou. O que cortava era a JANELA: ancorado em
// top = (base do botao), nas mesas de baixo ele abria 360px abaixo de um
// botao que ja esta perto do pe da tela. Estes testes travam que nenhuma
// posicao volta pro componente.
describe("posicionamento", () => {
  it("nao recebe nem aplica coordenada nenhuma", () => {
    abrir();
    const caixa = document.querySelector(".pind");
    expect(caixa.style.top).toBe("");
    expect(caixa.style.left).toBe("");
    expect(caixa.style.position).toBe("");
  });

  it("o fundo escurecido existe e e quem centraliza", () => {
    abrir();
    const fundo = document.querySelector(".pind-fundo");
    expect(fundo).toBeTruthy();
    expect(fundo.contains(document.querySelector(".pind"))).toBe(true);
  });

  it("clicar no fundo fecha", () => {
    const { aoFechar } = abrir();
    fireEvent.mouseDown(document.querySelector(".pind-fundo"));
    expect(aoFechar).toHaveBeenCalled();
  });

  it("clicar DENTRO do painel nao fecha", () => {
    const { aoFechar } = abrir();
    fireEvent.mouseDown(document.querySelector(".pind"));
    fireEvent.mouseDown(screen.getByTitle("RSI"));
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it("trava a rolagem do body enquanto esta aberto, e devolve ao fechar", () => {
    const { unmount } = abrir();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("tem titulo e e anunciado como dialogo", () => {
    abrir();
    expect(screen.getByText("Indicadores")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Indicadores" })).toBeTruthy();
  });
});

describe("Esc", () => {
  it("primeiro limpa a busca, depois fecha", () => {
    const { aoFechar } = abrir();
    const campo = screen.getByLabelText("Buscar indicador");
    fireEvent.change(campo, { target: { value: "rsi" } });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(campo.value).toBe("");
    expect(aoFechar).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(aoFechar).toHaveBeenCalled();
  });
});
