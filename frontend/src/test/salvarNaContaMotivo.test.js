import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { motivoDaFalha, valeTentarDeNovo } from "../lib/graficosSalvos.js";

vi.mock("../lib/supabaseClient.js", () => ({ supabase: null }));

// O MOTIVO DA FALHA É O PRODUTO AQUI.
//
// `salvarNaConta` devolvia `false` e engolia o erro num catch vazio. A
// tela então só podia dizer "Não salvou na conta" — frase que não diz a
// causa, não diz o que fazer, e não diz o que mais importa pra quem vê um
// aviso vermelho: que o trabalho está no navegador e NÃO se perdeu.
//
// A causa real neste projeto era uma frase só: a tabela graficos_usuario
// não existe, porque a migration 020 nunca rodou. O erro vinha com o
// código PGRST205 e o catch vazio jogava isso no lixo.
describe("o motivo da falha de gravação", () => {
  it("tabela inexistente aponta a migration que falta", () => {
    const m = motivoDaFalha({
      code: "PGRST205",
      message: "Could not find the table 'public.graficos_usuario' in the schema cache",
    });
    expect(m.tipo).toBe("tabela");
    expect(m.texto).toMatch(/020_graficos_do_usuario\.sql/);
    // O NOME DA TABELA junto, e não só o do arquivo: eles são diferentes
    // (arquivo com "do", tabela sem), e citar só o arquivo já levou a
    // criarem `graficos_do_usuario` — tabela que o app não lê, e o aviso
    // continuaria aparecendo.
    expect(m.texto).toMatch(/graficos_usuario/);
  });

  it("reconhece a tabela faltando mesmo sem o código", () => {
    expect(motivoDaFalha({ message: "Could not find the table" }).tipo).toBe("tabela");
  });

  it("sessão vencida fala de entrar de novo", () => {
    expect(motivoDaFalha({ message: "JWT expired" }).texto).toMatch(/sessão expirou/i);
  });

  it("RLS vira permissão, não erro técnico", () => {
    expect(motivoDaFalha({ code: "42501", message: "new row violates row-level security policy" }).tipo)
      .toBe("permissao");
  });

  // "Load failed" (Safari) e "Failed to fetch" (Chrome) não dizem nada a
  // quem está usando. Viram a promessa certa: salvamos quando voltar.
  it("erro cru de rede vira promessa de salvar depois", () => {
    for (const bruto of ["Load failed", "Failed to fetch", "NetworkError"]) {
      const m = motivoDaFalha(new TypeError(bruto));
      expect(m.tipo).toBe("rede");
      expect(m.texto).toMatch(/quando a conexão voltar/);
    }
  });

  it("nunca devolve motivo vazio", () => {
    for (const e of [null, undefined, {}, new Error("")]) {
      expect(motivoDaFalha(e).texto).toBeTruthy();
    }
  });
});

describe("quando vale tentar de novo", () => {
  // Rede e servidor passam sozinhos. Tabela que não existe e sessão
  // vencida não — insistir nelas só gasta pedido e atrasa o aviso.
  it("insiste no que passa sozinho", () => {
    for (const tipo of ["rede", "servidor", "desconhecido"]) {
      expect(valeTentarDeNovo({ tipo })).toBe(true);
    }
  });

  it("não insiste no que nunca passa", () => {
    for (const tipo of ["tabela", "sessao", "permissao", "sem_conta"]) {
      expect(valeTentarDeNovo({ tipo })).toBe(false);
    }
  });

  it("motivo ausente não trava a lógica", () => {
    expect(valeTentarDeNovo(null)).toBe(false);
    expect(valeTentarDeNovo(undefined)).toBe(false);
  });
});

// O NOME DA TABELA É O MESMO EM TODO LUGAR.
//
// O arquivo chama-se 020_graficos_do_usuario.sql e a tabela é
// `graficos_usuario`, sem o "do". Essa diferença já custou caro: a
// conferência do MIGRATIONS.md procurava a tabela pelo nome do arquivo e
// diria "020 FALTA" pra sempre, e a mensagem da tela citava só o arquivo.
describe("a migration, o código e o aviso falam da MESMA tabela", () => {
  const ler = (c) => readFileSync(resolve(process.cwd(), "..", c), "utf8");

  it("a 020 cria graficos_usuario", () => {
    expect(ler("backend/sql/020_graficos_do_usuario.sql"))
      .toMatch(/create table if not exists graficos_usuario/);
  });

  it("o código consulta graficos_usuario", () => {
    const codigo = ler("frontend/src/lib/graficosSalvos.js");
    expect([...codigo.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]))
      .toEqual(["graficos_usuario", "graficos_usuario", "graficos_usuario"]);
  });

  it("ninguém cria a tabela com o nome do arquivo", () => {
    expect(ler("backend/sql/020_graficos_do_usuario.sql"))
      .not.toMatch(/create table[^;]*graficos_do_usuario/);
  });

  it("a conferência do MIGRATIONS.md procura a tabela certa", () => {
    expect(ler("backend/sql/MIGRATIONS.md"))
      .toMatch(/to_regclass\('public\.graficos_usuario'\)/);
  });

  // Sem o reload, o PostgREST pode responder "tabela não encontrada" por
  // minutos depois de ela existir — sintoma idêntico a não ter rodado.
  it("a 020 recarrega o cache de schema", () => {
    expect(ler("backend/sql/020_graficos_do_usuario.sql"))
      .toMatch(/notify pgrst, 'reload schema'/);
  });
});
