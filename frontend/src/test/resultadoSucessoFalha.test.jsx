import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ROTULO_RESULTADO, classificarResultado, contarResultados,
} from "../admin/resultado.js";
import ListaTemplates from "../admin/ListaTemplates.jsx";

// O DESFECHO DA MARCAÇÃO (coluna `resultado`)
//
// É texto livre digitado por quem marca ("ex: sucesso, falha"), então o
// banco tem de tudo. A classificação é de leitura: nada é regravado, e o
// texto original continua na tela ao lado do selo.

describe("classificar o texto livre do resultado", () => {
  it("reconhece sucesso escrito de vários jeitos", () => {
    for (const t of ["sucesso", "Sucesso", "SUCESSO", "deu certo", "funcionou",
                     "confirmou o rompimento", "andou", "ok", "atingiu o alvo"]) {
      expect(classificarResultado(t)).toBe("sucesso");
    }
  });

  it("reconhece falha escrita de vários jeitos", () => {
    for (const t of ["falha", "Falhou", "FALHA", "fracassou", "errou",
                     "ficou ruim", "invalidou", "bateu o stop", "negativo"]) {
      expect(classificarResultado(t)).toBe("falha");
    }
  });

  // O ERRO MAIS CARO DESTA TELA. "não teve sucesso" contém a palavra
  // "sucesso": classificar sucesso antes de falha pintaria de VERDE
  // justamente o que não deu certo.
  it("negação ganha de sucesso — falha é testada primeiro", () => {
    expect(classificarResultado("não teve sucesso")).toBe("falha");
    expect(classificarResultado("sem sucesso")).toBe("falha");
    expect(classificarResultado("nao andou")).toBe("falha");
    expect(classificarResultado("não confirmou")).toBe("falha");
  });

  it("acento não muda a classificação", () => {
    expect(classificarResultado("não")).toBe(classificarResultado("nao"));
  });

  it("vazio, nulo e texto que não diz nada ficam indefinidos", () => {
    for (const t of ["", "   ", null, undefined, "revisar depois", "?"]) {
      expect(classificarResultado(t)).toBe("indefinido");
    }
  });

  it("nunca devolve null — serve de chave de objeto", () => {
    for (const t of ["", null, "sucesso", "falha", "xyz"]) {
      expect(ROTULO_RESULTADO[classificarResultado(t)]).toBeTruthy();
    }
  });
});

describe("o placar de sucesso e falha", () => {
  const T = [
    { id: 1, resultado: "sucesso" },
    { id: 2, resultado: "deu certo" },
    { id: 3, resultado: "falhou" },
    { id: 4, resultado: "não teve sucesso" },
    { id: 5, resultado: null },
  ];

  it("conta os três grupos", () => {
    expect(contarResultados(T)).toEqual({ sucesso: 2, falha: 2, indefinido: 1 });
  });

  // Contador que esconde o zero faz "nenhuma falha" parecer "não calculei".
  it("as três chaves vêm sempre, mesmo em zero", () => {
    expect(contarResultados([])).toEqual({ sucesso: 0, falha: 0, indefinido: 0 });
    expect(contarResultados(null)).toEqual({ sucesso: 0, falha: 0, indefinido: 0 });
  });
});

describe("como aparece na lista", () => {
  const T = [
    { id: 1, ticker: "PETR4", timeframe: "1d", resultado: "sucesso", criado_em: "2026-01-02" },
    { id: 2, ticker: "VALE3", timeframe: "1d", resultado: "não andou", criado_em: "2026-01-02" },
  ];

  const lista = (templates = T) => {
    cleanup();
    return render(<ListaTemplates templates={templates} rotulo="OCO" />).container;
  };

  it("sucesso usa a classe verde e falha a vermelha", () => {
    const c = lista();
    expect(c.querySelectorAll(".res-selo.sucesso")).toHaveLength(1);
    expect(c.querySelectorAll(".res-selo.falha")).toHaveLength(1);
  });

  it("o texto que a pessoa digitou continua na tela", () => {
    lista();
    // "não andou" virou selo Falha, mas o original não pode desaparecer:
    // é por ele que se percebe uma classificação errada.
    expect(screen.getByText("não andou")).toBeTruthy();
  });

  it("não repete o texto quando ele é igual ao selo", () => {
    const c = lista([T[0]]);
    expect(c.querySelectorAll(".res-original")).toHaveLength(0);
  });

  it("sem resultado nenhum, mostra Indefinido em vez de um traço", () => {
    const c = lista([{ id: 9, ticker: "ITUB4", timeframe: "1d", criado_em: "2026-01-02" }]);
    expect(c.querySelector(".res-selo.indefinido")).not.toBeNull();
  });

  it("o placar aparece com os números de cada grupo", () => {
    const c = lista();
    const placar = c.querySelector(".res-contas");
    expect(placar).not.toBeNull();
    expect(placar.textContent).toMatch(/Sucesso\s*1/);
    expect(placar.textContent).toMatch(/Falha\s*1/);
    expect(placar.textContent).toMatch(/Indefinido\s*0/);
  });
});
