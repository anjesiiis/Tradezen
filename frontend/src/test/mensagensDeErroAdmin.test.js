import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { erroDeRede, mensagemDoStatus } from "../admin/adminApi.js";

// MENSAGEM DE ERRO É PARTE DO PRODUTO.
//
// Este arquivo nasceu de um prejuízo concreto: a tela mostrou "O servidor
// não respondeu" e "Load failed" enquanto o problema real era outro, e
// isso mandou a investigação pro lado errado por horas. As regras abaixo
// são o que impede a mesma confusão.
describe("a mensagem que a tela mostra para cada status", () => {
  // 401/403/404: o `detail` do backend é jargão de API ("Token de
  // autenticação ausente", "Not Found"). Quem está na tela precisa saber
  // o que FAZER, não como a especificação chama aquilo.
  it("401 fala de sessão, não de token", () => {
    const m = mensagemDoStatus(401, "Token de autenticação ausente.");
    expect(m).toMatch(/Sessão expirada/);
    expect(m).not.toMatch(/[Tt]oken/);
  });

  it("403 fala de permissão", () => {
    expect(mensagemDoStatus(403, "Forbidden")).toMatch(/não tem permissão/);
  });

  // 404 numa rota que existe no código quase sempre é frontend novo
  // falando com backend velho. A mensagem diz isso, porque é a primeira
  // coisa a conferir.
  it("404 aponta pro deploy do backend", () => {
    expect(mensagemDoStatus(404, "Not Found")).toMatch(/deploy do backend/);
  });

  // O CASO MAIS IMPORTANTE. É no `detail` que moram os recados que dizem
  // qual migration rodar e quantos fracassos faltam. Trocá-los por "Erro
  // no servidor" apagaria a única instrução útil da resposta.
  it("mantém o recado do backend em 503 e 409", () => {
    const migration = "Rode backend/sql/030_modelos_treinados.sql no SQL Editor.";
    expect(mensagemDoStatus(503, migration)).toBe(migration);
    const acervo = "Acervo insuficiente: 212 sucessos e 4 fracassos.";
    expect(mensagemDoStatus(409, acervo)).toBe(acervo);
  });

  it("500 sem recado não fica em branco", () => {
    expect(mensagemDoStatus(500, null)).toMatch(/Erro no servidor \(500\)/);
  });

  it("status desconhecido sempre devolve algo legível", () => {
    for (const s of [400, 418, 422, 429, 502]) {
      expect(mensagemDoStatus(s, null)).toBeTruthy();
    }
  });
});

describe("erro de rede não chega cru na tela", () => {
  const api = readFileSync(resolve(process.cwd(), "src/admin/adminApi.js"), "utf8");

  // "Load failed" (Safari) e "Failed to fetch" (Chrome) são as mensagens
  // que o navegador dá, e nenhuma das duas diz quem falhou nem o que
  // fazer. Uma delas apareceu na tela deste projeto.
  it("TypeError de fetch é embrulhado com as causas prováveis", () => {
    const e = erroDeRede(new TypeError("Load failed"));
    expect(e.message).toMatch(/Não deu pra falar com o servidor/);
    expect(e.message).toMatch(/Render dorme/);       // servidor acordando
    expect(e.message).toMatch(/conexão caiu/);       // rede da pessoa
    expect(e.message).toMatch(/variáveis de ambiente/); // VITE_API_URL errado
    // A mensagem crua do navegador vai NO FIM, não no lugar da explicação:
    // ela ajuda a depurar e não serve como recado.
    expect(e.message).toMatch(/Load failed$/);
    expect(e.semResposta).toBe(true);
  });

  it("o timeout diz quantos segundos esperou", () => {
    expect(api).toMatch(/70 segundos/);
  });

  // Marca que o chamador usa pra distinguir "não houve resposta" de
  // "respondeu com erro" — a lista de templates já dependeu disso pra não
  // dizer "nenhum template" quando o backend estava fora.
  it("os dois casos sem resposta ficam marcados", () => {
    expect([...api.matchAll(/semResposta = true/g)]).toHaveLength(2);
  });
});

describe("as rotas de modelo usam o mesmo caminho autenticado do resto", () => {
  const api = readFileSync(resolve(process.cwd(), "src/admin/adminApi.js"), "utf8");

  // Isto foi apontado como defeito ("não anexa o token") e não era: as
  // rotas de modelo sempre passaram por adminFetch, igual às 19 outras
  // chamadas do painel. O teste existe pra provar, e pra avisar se algum
  // dia alguém chamar fetch direto aqui e perder o Authorization.
  it("cada chamada de modelo passa por adminFetch", () => {
    for (const fn of ["fetchStatusModelos", "treinarModelo", "ativarModelo",
                      "testarModelo", "fetchPanorama"]) {
      const corpo = api.slice(api.indexOf(`export function ${fn}`));
      expect(corpo.slice(0, 400)).toMatch(/adminFetch\(/);
    }
  });

  it("adminFetch anexa o Authorization", () => {
    expect(api).toMatch(/headers\["Authorization"\] = `Bearer \$\{token\}`/);
  });
});

describe("o backend tem rota de saúde sem autenticação", () => {
  const principal = readFileSync(
    resolve(process.cwd(), "..", "backend/main.py"), "utf8");

  it("/health e / respondem pela MESMA função", () => {
    expect(principal).toMatch(/@app\.api_route\("\/", methods=\["GET", "HEAD"\]\)\n@app\.api_route\("\/health", methods=\["GET", "HEAD"\]\)\ndef raiz/);
  });

  // HEAD importa: monitores de uptime batem com HEAD, e só GET devolveria
  // 405 — o monitor concluiria que o serviço caiu.
  it("as duas aceitam HEAD, não só GET", () => {
    const bloco = principal.slice(principal.indexOf('@app.api_route("/"'),
                                  principal.indexOf("def raiz"));
    expect([...bloco.matchAll(/"HEAD"/g)]).toHaveLength(2);
  });

  it("não exige token", () => {
    const bloco = principal.slice(principal.indexOf('@app.api_route("/"'),
                                  principal.indexOf("return {\"status\""));
    expect(bloco).not.toMatch(/require_admin|Depends/);
  });
});
