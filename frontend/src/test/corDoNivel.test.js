import { describe, it, expect } from "vitest";
import { corDoNivel, estiloNivel } from "../lib/grafico/padroes.js";

// O RETÂNGULO VERMELHO ATRÁS DAS VELAS
// ====================================
//
// A cor do nível estava escrita em DOIS lugares: estiloNivel (linhas) e
// _desenharNivel (faixa sombreada). Com os mesmos dois valores, mas
// TROCADOS entre si — a faixa pintava suporte com o vermelho #FF4560 da
// resistência. Daí o retângulo vermelho/laranja no fundo do gráfico, em
// cima de um suporte.
//
// Agora existe uma fonte só. Estes testes travam o significado das cores
// e, principalmente, o ACORDO entre a faixa e a linha.

const VERDE_NIVEL = "rgb(0,214,143)";
const VERMELHO_NIVEL = "rgb(255,69,96)";

describe("significado das cores de nível", () => {
  it("suporte é verde", () => {
    expect(corDoNivel("suporte")).toBe(VERDE_NIVEL);
  });

  it("resistência é vermelha", () => {
    expect(corDoNivel("resistencia")).toBe(VERMELHO_NIVEL);
  });

  it("suporte NÃO é vermelho — era este o bug", () => {
    expect(corDoNivel("suporte")).not.toBe(VERMELHO_NIVEL);
    expect(corDoNivel("suporte")).not.toMatch(/255,\s*69,\s*96/);
  });
});

describe("a faixa e a linha concordam", () => {
  for (const tipo of ["suporte", "resistencia"]) {
    it(`${tipo}: a cor da faixa é a mesma da linha`, () => {
      // estiloNivel devolve rgba(...) com alpha; comparamos os canais.
      const canais = estiloNivel({ tipo, rank: 0 }, true).color
        .replace(/rgba?\(|\)/g, "")
        .split(",")
        .slice(0, 3)
        .map((n) => n.trim())
        .join(",");
      expect(corDoNivel(tipo)).toBe(`rgb(${canais})`);
    });
  }
});

describe("o tipo é comparado normalizado", () => {
  it("a caixa da letra não muda a cor", () => {
    expect(corDoNivel("Resistencia")).toBe(VERMELHO_NIVEL);
    expect(corDoNivel("RESISTENCIA")).toBe(VERMELHO_NIVEL);
    expect(corDoNivel("Suporte")).toBe(VERDE_NIVEL);
  });

  it("estiloNivel também, e nunca devolve uma cor inválida", () => {
    expect(estiloNivel({ tipo: "Suporte", rank: 0 }, false).color)
      .toBe(estiloNivel({ tipo: "suporte", rank: 0 }, false).color);
    for (const tipo of ["suporte", "resistencia", "Suporte", "coisa", "", undefined]) {
      expect(estiloNivel({ tipo, rank: 0 }, false).color).not.toMatch(/undefined|NaN/);
    }
  });

  it("tipo desconhecido vira cinza, não vermelho por descarte", () => {
    expect(corDoNivel("coisa que nao existe")).toBe("#787b86");
    expect(corDoNivel(undefined)).toBe("#787b86");
    expect(corDoNivel("")).toBe("#787b86");
  });
});

describe("a cor não está mais duplicada no código do desenho", () => {
  it("_desenharNivel não tem hex de nível escrito à mão", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const fonte = readFileSync(
      resolve(process.cwd(), "src/lib/grafico/desenhos.js"), "utf8");
    const corpo = fonte.slice(fonte.indexOf("export function _desenharNivel"));
    const trecho = corpo.slice(0, corpo.indexOf("\nexport function", 10));
    expect(trecho).toMatch(/corDoNivel\(/);
    expect(trecho).not.toMatch(/#FF4560|#00D68F/i);
  });
});
