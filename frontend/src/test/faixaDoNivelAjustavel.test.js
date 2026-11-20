import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolverPadroesPorTimestamp } from "../lib/grafico/padroes.js";

/**
 * A FAIXA DE SUPORTE/RESISTÊNCIA É UMA REGIÃO, NÃO UMA LINHA.
 *
 * Antes ela era só o intervalo entre o toque mais baixo e o mais alto —
 * derivada, sem como ajustar. Isso serve pra ACHAR o nível e não pra
 * desenhá-lo: dois toques podem cair no mesmo centavo e a zona ter 2% de
 * altura, ou os toques pegarem pavios e a zona real ser o corpo das velas.
 *
 * Agora a faixa pode ser arrastada na marcação, e o ajuste viaja junto do
 * template: pontos.faixa → resposta da rota → desenho.
 */

const candles = Array.from({ length: 60 }, (_, i) => ({
  timestamp: (1700000000 + i * 86400) * 1000,
  abertura: 10, maxima: 11, minima: 9, fechamento: 10.5, volume: 1,
}));
const ts = (i) => candles[i].timestamp;

const nivel = (extra) => ({
  tipo: "suporte",
  nome: "Suporte",
  pontos: {
    toques: [{ timestamp: ts(10), preco: 10.0 }, { timestamp: ts(30), preco: 10.1 }],
    ...extra,
  },
});

describe("a faixa ajustada atravessa até o desenho", () => {
  it("sem ajuste, nada muda: a faixa não vem", () => {
    const [r] = resolverPadroesPorTimestamp([nivel()], candles);
    expect(r.toquesResolvidos).toHaveLength(2);
    expect(r.faixa).toBeUndefined();
  });

  it("com ajuste, a faixa sobe pro nível que o desenho lê", () => {
    const [r] = resolverPadroesPorTimestamp(
      [nivel({ faixa: { de: 9.4, ate: 10.6 } })], candles);
    expect(r.faixa).toEqual({ de: 9.4, ate: 10.6 });
  });

  // O ajuste não substitui os toques: eles são a prova de que o nível
  // existe, e continuam desenhados onde foram marcados.
  it("os toques continuam lá, intactos", () => {
    const [r] = resolverPadroesPorTimestamp(
      [nivel({ faixa: { de: 9.4, ate: 10.6 } })], candles);
    expect(r.toquesResolvidos.map((t) => t.preco)).toEqual([10.0, 10.1]);
  });
});

describe("o desenho prefere a faixa ajustada", () => {
  const codigo = readFileSync(
    resolve(process.cwd(), "src/lib/grafico/desenhos.js"), "utf8");

  it("usa p.faixa quando ela é válida", () => {
    expect(codigo).toMatch(/const precoMin = ajuste \? ajuste\.de : Math\.min\(\.\.\.precos\)/);
    expect(codigo).toMatch(/const precoMax = ajuste \? ajuste\.ate : Math\.max\(\.\.\.precos\)/);
  });

  // Faixa invertida ou com lixo não pode virar retângulo de altura
  // negativa — foi um bug desta tela antes (o retângulo escuro preso).
  it("faixa inválida é ignorada em vez de desenhada", () => {
    expect(codigo).toMatch(/Number\.isFinite\(p\.faixa\.de\) && Number\.isFinite\(p\.faixa\.ate\)/);
    expect(codigo).toMatch(/p\.faixa\.ate > p\.faixa\.de/);
  });
});

describe("o backend só manda faixa válida", () => {
  const rota = readFileSync(
    resolve(process.cwd(), "..", "backend/padroes_marcados.py"), "utf8");

  it("valida de/ate antes de incluir", () => {
    expect(rota).toMatch(/if ate > de:/);
    expect(rota).toMatch(/except \(KeyError, TypeError, ValueError\)/);
  });

  // Nível antigo, salvo antes desta mudança, não tem `faixa` — e tem de
  // continuar funcionando exatamente como funcionava.
  it("nível sem ajuste continua sem a chave", () => {
    expect(rota).toMatch(/pontos: Dict\[str, Any\] = \{"toques": toques_ts\}/);
  });
});

describe("a marcação guarda o ajuste", () => {
  const tela = readFileSync(
    resolve(process.cwd(), "src/admin/AdminTemplatesNiveis.jsx"), "utf8");

  it("salva faixa só quando ela foi ajustada", () => {
    expect(tela).toMatch(/ajustePorGrupo\[GRUPO\]\s*\n?\s*\?\s*\{ toques: toquesAjustados, faixa: ajustePorGrupo\[GRUPO\] \}/);
  });

  it("ao editar, carrega a faixa que estava salva", () => {
    expect(tela).toMatch(/faixaEdit: completo\.pontos\?\.faixa \|\| null/);
  });

  // Faixa sem toque nenhum não tem o que a sustente, e sobraria
  // desenhada sobre o próximo nível que a pessoa começasse a marcar.
  it("limpar os toques limpa o ajuste", () => {
    expect(tela).toMatch(/esquecerAjuste\(GRUPO\);/);
  });
});

describe("o arrasto da faixa", () => {
  const grafico = readFileSync(
    resolve(process.cwd(), "src/admin/NivelMarkerChart.jsx"), "utf8");

  // Três zonas: borda de cima move o teto, borda de baixo move o piso, o
  // meio move a faixa inteira mantendo a altura.
  it("tem as três zonas", () => {
    for (const modo of ['"teto"', '"piso"', '"mover"']) {
      expect(grafico).toContain(modo);
    }
  });

  // Sem isto, cada ajuste deixaria um toque solto: o clique que encerra o
  // arrasto chegaria ao gráfico como pedido de toque novo.
  it("o arrasto não cria toque", () => {
    expect(grafico).toMatch(/if \(arrastouRef\.current\) \{ arrastouRef\.current = false; return; \}/);
  });

  it("não deixa a faixa inverter no meio do gesto", () => {
    expect(grafico).toMatch(/if \(nova\.ate <= nova\.de\) return;/);
  });

  it("o cursor avisa que dá pra pegar", () => {
    expect(grafico).toMatch(/"ns-resize"/);
    expect(grafico).toMatch(/"grab"/);
  });

  it("não arrasta em modo de leitura", () => {
    expect(grafico).toMatch(/function zonaDoPonteiro\(y\) \{\s*\n\s*if \(readOnly\) return null;/);
  });
});
