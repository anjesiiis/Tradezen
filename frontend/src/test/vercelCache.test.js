import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// OS HEADERS DE CACHE SÃO A ÚNICA CORREÇÃO DE CAUSA
// =================================================
//
// "Failed to fetch dynamically imported module" acontece quando a aba tem
// o index.html de uma versão e pede um chunk que o deploy novo já apagou.
// O ErrorBoundary se recupera disso, mas recuperação é remendo.
//
// Medido em produção antes desta mudança: TODO arquivo, inclusive os
// chunks com hash no nome, vinha com "public, max-age=0, must-revalidate"
// — ou seja, cache nenhum. Isso faz o navegador ir à rede a cada
// navegação e amplia a janela em que ele pega um index.html velho.
//
// O par certo é o padrão da indústria e depende de os DOIS lados valerem:
//   /assets/*  → imutável por um ano (o hash no nome é a versão)
//   todo o resto (index.html) → nunca guardado
//
// Guardar o index.html é o que trava a pessoa na versão antiga; guardar
// os chunks é seguro justamente porque o nome muda quando o conteúdo
// muda. Trocar um dos dois de lugar recria o bug, então os dois ficam
// travados aqui.

const cfg = JSON.parse(
  readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
);

const regraDe = (fonte) => cfg.headers.find((h) => h.source === fonte);
const valorDe = (regra, chave) =>
  regra?.headers.find((h) => h.key.toLowerCase() === chave)?.value || "";

describe("cache no Vercel", () => {
  it("os chunks de /assets são imutáveis por um ano", () => {
    const v = valorDe(regraDe("/assets/(.*)"), "cache-control");
    expect(v).toMatch(/immutable/);
    expect(v).toMatch(/max-age=31536000/);
  });

  it("o resto (index.html) nunca é guardado", () => {
    const v = valorDe(regraDe("/((?!assets/).*)"), "cache-control");
    expect(v).toMatch(/no-store/);
    expect(v).not.toMatch(/immutable/);
  });

  it("o index.html não cai na regra de /assets, nem o contrário", () => {
    const assets = /^\/assets\/(.*)$/;
    const resto = /^\/((?!assets\/).*)$/;
    expect(assets.test("/assets/index-abc123.js")).toBe(true);
    expect(assets.test("/index.html")).toBe(false);
    expect(resto.test("/index.html")).toBe(true);
    expect(resto.test("/assets/index-abc123.js")).toBe(false);
  });

  it("nenhuma regra de Cache-Control nova entra sem passar por aqui", () => {
    const comCache = cfg.headers.filter((h) =>
      h.headers.some((x) => x.key.toLowerCase() === "cache-control"),
    );
    expect(comCache.map((h) => h.source).sort()).toEqual(
      ["/((?!assets/).*)", "/assets/(.*)"],
    );
  });

  it("a regra de segurança (CSP) continua valendo pra tudo", () => {
    const global = regraDe("/(.*)");
    expect(valorDe(global, "content-security-policy")).toMatch(/default-src 'self'/);
    // Ela não define Cache-Control: se definisse, disputaria a chave com
    // as duas regras acima e o resultado dependeria da ordem.
    expect(valorDe(global, "cache-control")).toBe("");
  });
});
