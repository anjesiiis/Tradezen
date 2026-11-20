import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * POR QUE OS PADRÕES SÓ APARECIAM EM DUAS MESAS.
 *
 * Não era plano, nem filtro, nem busca: era PESO. A rota fazia
 * `select("*")` nas cinco tabelas, e isso trazia `candles_contexto` — o
 * histórico inteiro de cada template, que a rota não usa pra nada.
 *
 * Medido contra o banco de produção: 3,5 MB para UM ticker, 10,2 MB para
 * oito. O navegador abre ~6 conexões por servidor, então as primeiras
 * chegavam e as outras ficavam na fila ou morriam no caminho.
 *
 * Com as colunas certas: 1,07 MB e 1,84s no lugar de 10,2 MB e 4,03s.
 */
const rota = readFileSync(
  resolve(process.cwd(), "..", "backend/padroes_marcados.py"), "utf8");

describe("a rota de padrões não carrega peso que não usa", () => {
  it("nenhum select(*) sobrou", () => {
    expect(rota).not.toMatch(/\.select\("\*"\)/);
  });

  // candles_contexto é o campo mais pesado da tabela e a rota não o lê em
  // lugar nenhum — só `candles`, que é o recorte, e é com ele que o
  // índice de cada ponto vira timestamp.
  it("não pede candles_contexto", () => {
    expect(rota).toMatch(/COLUNAS_PADRAO = "candles,pontos,resultado,observacao,criado_em"/);
    const selects = [...rota.matchAll(/\.select\(([A-Z_]+)\)/g)].map((m) => m[1]);
    expect(selects.length).toBeGreaterThanOrEqual(4);
    for (const s of selects) expect(["COLUNAS_PADRAO", "COLUNAS_NIVEL"]).toContain(s);
  });

  // O nível precisa de `tipo` (suporte ou resistência) além do resto.
  it("o nível pede a coluna que só ele usa", () => {
    expect(rota).toMatch(/COLUNAS_NIVEL = COLUNAS_PADRAO \+ ",tipo"/);
    expect(rota).toMatch(/templates_niveis"\)\.select\(COLUNAS_NIVEL\)/);
  });

  it("toda coluna lida por row.get está em alguma lista", () => {
    const lidas = new Set([...rota.matchAll(/row\.get\("([a-z_]+)"\)/g)].map((m) => m[1]));
    const declaradas = new Set([
      ...("candles,pontos,resultado,observacao,criado_em,tipo".split(",")),
    ]);
    for (const col of lidas) expect(declaradas).toContain(col);
  });
});

describe("o cache da rota de padrões", () => {
  it("guarda por ticker e timeframe", () => {
    expect(rota).toMatch(/chave = f"\{ticker_norm\}:\{timeframe or '\*'\}"/);
  });

  // A chave não leva o plano de propósito: a lista de padrões do ticker é
  // a mesma pra todo mundo, e quem não tem acesso nem chega aqui — a rota
  // corta antes, e é lá que o plano é decidido.
  it("não leva o plano na chave, e corta por plano ANTES do cache", () => {
    expect(rota).not.toMatch(/chave = .*plano/);
    expect(rota.indexOf("if not tem_acesso(plano)"))
      .toBeLessThan(rota.indexOf("guardado = _do_cache(chave)"));
  });

  it("tem teto pra não crescer sem fim", () => {
    expect(rota).toMatch(/if len\(_CACHE\) > 200:/);
  });

  it("expira", () => {
    expect(rota).toMatch(/_VALIDADE = 60\.0/);
    expect(rota).toMatch(/time\.monotonic\(\) - em > _VALIDADE/);
  });
});
