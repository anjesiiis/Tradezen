import { describe, it, expect, vi } from "vitest";
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
