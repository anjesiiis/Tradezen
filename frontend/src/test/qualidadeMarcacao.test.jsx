import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FILTROS_QUALIDADE, FILTRO_QUALIDADE_PADRAO, NIVEIS, TOTAL_DE_ESTRELAS,
  contarPorQualidade, estrelasCheias, filtrarPorQualidade, nivelDe,
  proximaQualidade, qualidadeDe,
} from "../admin/qualidade.js";
import SeletorQualidade from "../admin/SeletorQualidade.jsx";
import Estrelas from "../admin/Estrelas.jsx";
import ListaTemplates from "../admin/ListaTemplates.jsx";

const mapa = (pares) => Object.fromEntries(
  Object.entries(pares).map(([id, q]) => [id, { qualidade: q }])
);

describe("a escala", () => {
  it("tem os cinco níveis, do melhor pro pior, com os nomes pedidos", () => {
    expect(NIVEIS.map((n) => n.rotulo)).toEqual(["Ótimo", "Alta", "Média", "Baixa", "Falha"]);
    expect(NIVEIS.map((n) => n.valor)).toEqual([4, 3, 2, 1, 0]);
  });

  it('usa "Ótimo" e nunca "Textbook"', () => {
    const texto = JSON.stringify(NIVEIS);
    expect(texto).toContain("Ótimo");
    expect(texto.toLowerCase()).not.toContain("textbook");
  });

  // As cores saem das variáveis do tema de admin. Inventar hex aqui faz
  // a nota não acompanhar o tema e fura a regra de cores do projeto.
  it("não traz nenhuma cor em hexadecimal", () => {
    for (const n of NIVEIS) {
      expect(n.cor, n.rotulo).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(n.cor, n.rotulo).toMatch(/var\(--/);
    }
  });

  it("cada nível tem um critério escrito", () => {
    for (const n of NIVEIS) expect(n.dica.length, n.rotulo).toBeGreaterThan(10);
  });

  // Falha tem UMA estrela cheia, não zero: zero cheia é a aparência de
  // "sem avaliação", e julgamento e falta de julgamento não podem ter o
  // mesmo desenho.
  it("as estrelas crescem com o nível e Falha tem uma", () => {
    expect(estrelasCheias(0)).toBe(1);
    expect(estrelasCheias(4)).toBe(5);
    expect(NIVEIS.map((n) => estrelasCheias(n.valor))).toEqual([5, 4, 3, 2, 1]);
  });

  it("são sempre cinco estrelas, cheias mais vazias", () => {
    expect(TOTAL_DE_ESTRELAS).toBe(5);
  });
});

describe("não avaliado é diferente de qualquer nota", () => {
  it("devolve null pra id sem nota, mapa vazio ou nulo", () => {
    expect(qualidadeDe({}, 7)).toBe(null);
    expect(qualidadeDe(null, 7)).toBe(null);
    expect(qualidadeDe(mapa({ 7: null }), 7)).toBe(null);
  });

  // Zero é nota: tratar 0 como "sem nota" (o clássico `|| null`)
  // apagaria todo julgamento de Falha.
  it("zero é nota, não ausência de nota", () => {
    expect(qualidadeDe(mapa({ 7: 0 }), 7)).toBe(0);
    expect(nivelDe(0).rotulo).toBe("Falha");
  });

  it("lê o id como texto, porque o mapa vem do backend com chave de texto", () => {
    expect(qualidadeDe(mapa({ 12: 3 }), 12)).toBe(3);
    expect(qualidadeDe(mapa({ 12: 3 }), "12")).toBe(3);
  });
});

describe("clicar no nível aceso desfaz a avaliação", () => {
  it("volta pra null, e não pra um nível vizinho", () => {
    expect(proximaQualidade(3, 3)).toBe(null);
  });
  it("clicar em outro nível troca a nota", () => {
    expect(proximaQualidade(3, 0)).toBe(0);
    expect(proximaQualidade(null, 4)).toBe(4);
  });
});

describe("filtros", () => {
  const todos = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }];
  const m = mapa({ 1: 4, 2: 3, 3: 2, 4: 1, 5: 0, 6: null });

  it("conta cada filtro sem deixar marcação de fora", () => {
    const c = contarPorQualidade(todos, m);
    expect(c.todos).toBe(6);
    expect(c.sem_nota).toBe(1);
    expect(c.bons).toBe(2);
    expect(c.media).toBe(1);
    expect(c.ruins).toBe(2);
    const semTodos = FILTROS_QUALIDADE.filter((f) => f.id !== "todos");
    expect(semTodos.reduce((s, f) => s + c[f.id], 0)).toBe(todos.length);
  });

  it('"sem nota" pega exatamente quem ninguém avaliou', () => {
    expect(filtrarPorQualidade(todos, m, "sem_nota").map((t) => t.id)).toEqual([6]);
  });

  it('"ruins" inclui Falha, que é nota zero', () => {
    expect(filtrarPorQualidade(todos, m, "ruins").map((t) => t.id)).toEqual([4, 5]);
  });

  it("todos devolve a lista inteira, e filtro desconhecido também", () => {
    expect(filtrarPorQualidade(todos, m, "todos")).toHaveLength(6);
    expect(filtrarPorQualidade(todos, m, "inexistente")).toHaveLength(6);
  });
});

describe("SeletorQualidade", () => {
  it("desenha os cinco níveis como grupo de rádio, não caixinhas", () => {
    render(<SeletorQualidade qualidade={null} aoMudar={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: /qualidade/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("marca aria-checked só no nível aceso", () => {
    render(<SeletorQualidade qualidade={3} aoMudar={() => {}} />);
    const acesos = screen.getAllByRole("radio").filter((b) => b.getAttribute("aria-checked") === "true");
    expect(acesos).toHaveLength(1);
    expect(acesos[0]).toHaveTextContent("Alta");
  });

  it("clicar devolve o valor do nível", () => {
    const aoMudar = vi.fn();
    render(<SeletorQualidade qualidade={null} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("radio", { name: /ótimo/i }));
    expect(aoMudar).toHaveBeenCalledWith(4);
  });

  it("clicar no aceso manda null, que é desfazer", () => {
    const aoMudar = vi.fn();
    render(<SeletorQualidade qualidade={0} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("radio", { name: /falha/i }));
    expect(aoMudar).toHaveBeenCalledWith(null);
  });

  it("as setas do teclado andam entre os níveis", () => {
    const aoMudar = vi.fn();
    render(<SeletorQualidade qualidade={4} aoMudar={aoMudar} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: /ótimo/i }), { key: "ArrowRight" });
    expect(aoMudar).toHaveBeenCalledWith(3);
  });

  it("mostra o critério do nível aceso, não só num tooltip", () => {
    render(<SeletorQualidade qualidade={4} aoMudar={() => {}} />);
    expect(screen.getByText(nivelDe(4).dica)).toBeInTheDocument();
  });

  it("sem nota, avisa que ainda não tem nota", () => {
    render(<SeletorQualidade qualidade={null} aoMudar={() => {}} />);
    expect(screen.getByText(/ainda sem nota/i)).toBeInTheDocument();
  });

  // Botão que não grava é pior que botão nenhum: aceitaria o clique e
  // perderia a avaliação em silêncio.
  it("sem a migration, mostra o motivo e nenhum botão", () => {
    render(<SeletorQualidade qualidade={null} aoMudar={() => {}} indisponivel motivo="Rode a 026." />);
    expect(screen.getByText("Rode a 026.")).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  // Não desabilita durante a gravação: ela é otimista, e o Render dorme.
  it("nunca desabilita os botões", () => {
    render(<SeletorQualidade qualidade={2} aoMudar={() => {}} />);
    for (const b of screen.getAllByRole("radio")) expect(b).toBeEnabled();
  });
});

describe("Estrelas", () => {
  it("desenha cinco, com as cheias que o nível pede", () => {
    const { container } = render(<Estrelas cheias={4} total={5} />);
    expect(container.querySelectorAll(".cheia")).toHaveLength(4);
    expect(container.querySelectorAll(".vazia")).toHaveLength(1);
  });

  it("usa ★ e ☆ literais, não escape de CSS", () => {
    const { container } = render(<Estrelas cheias={3} total={5} />);
    expect(container.textContent).toBe("★★★☆☆");
  });

  // Quem chama já escreve o nome do nível ao lado. Um leitor de tela
  // lendo "estrela estrela estrela" antes de "Alta" só atrasa.
  it("fica fora do alcance do leitor de tela", () => {
    const { container } = render(<Estrelas cheias={5} total={5} />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("sem nenhuma cheia, é a aparência de sem avaliação", () => {
    const { container } = render(<Estrelas cheias={0} total={5} />);
    expect(container.textContent).toBe("☆☆☆☆☆");
  });
});

describe("a lista abre na fila de trabalho", () => {
  // Sentar pra avaliar e ver primeiro o que já foi avaliado é começar
  // pelo fim. Efeito colateral aceito: avaliar um card o tira da lista
  // na hora, porque ele deixou de estar sem avaliação.
  it("o filtro padrão é sem avaliação", () => {
    expect(FILTRO_QUALIDADE_PADRAO).toBe("sem_nota");
    expect(FILTROS_QUALIDADE.some((f) => f.id === FILTRO_QUALIDADE_PADRAO)).toBe(true);
  });

  it("o botão do padrão se chama Sem avaliação", () => {
    const f = FILTROS_QUALIDADE.find((x) => x.id === FILTRO_QUALIDADE_PADRAO);
    expect(f.rotulo).toBe("Sem avaliação");
  });
});

describe("o seletor desenha estrelas", () => {
  it("cada nível mostra suas estrelas cheias", () => {
    const { container } = render(<SeletorQualidade qualidade={null} aoMudar={() => {}} />);
    const botoes = screen.getAllByRole("radio");
    // Ótimo é o primeiro da fila e tem as cinco cheias.
    expect(botoes[0].querySelectorAll(".cheia")).toHaveLength(5);
    // Falha é o último e tem uma.
    expect(botoes[4].querySelectorAll(".cheia")).toHaveLength(1);
    expect(container.querySelectorAll(".sq-estrelas")).toHaveLength(5);
  });
});

// A LISTA TEM QUE DIZER POR QUE NÃO TEM ESTRELA
// =============================================
//
// Quando o carregamento da qualidade falha, o mapa vem vazio: nenhum selo
// e nenhuma barra de filtro. Sem explicação, isso é indistinguível de "o
// salvamento não funcionou" — foi exatamente a confusão que gerou o
// relato "não está salvando as estrelas".
describe("lista sem a qualidade carregada", () => {
  const TEMPLATES = [{ id: 1, ticker: "PETR4", timeframe: "1d" }];

  it("mostra o motivo quando a qualidade não carregou", () => {
    render(
      <ListaTemplates
        templates={TEMPLATES}
        rotulo="OCO"
        qualidadeMapa={{}}
        qualidadeMotivo="A qualidade não chegou ao banco."
      />,
    );
    expect(screen.getByText("A qualidade não chegou ao banco.")).toBeTruthy();
  });

  it("não inventa recado quando a qualidade carregou normalmente", () => {
    render(
      <ListaTemplates
        templates={TEMPLATES}
        rotulo="OCO"
        qualidadeMapa={{ 1: { qualidade: null } }}
        qualidadeMotivo="A qualidade não chegou ao banco."
      />,
    );
    expect(screen.queryByText("A qualidade não chegou ao banco.")).toBeNull();
    // duas vezes: o botão do filtro e o selo do card
    expect(screen.getAllByText("Sem avaliação").length).toBe(2);
  });
});

// AVALIAR NÃO PODE FAZER O CARD EVAPORAR
// ======================================
//
// O filtro padrão é "Sem avaliação". Dar nota tira o card desse filtro no
// mesmo instante, e ele saía da lista antes de a pessoa ver o selo mudar.
// O relato foi "salva no visualizador mas não aparece na listagem" — o
// selo estava certo; o card é que não estava mais lá.
describe("card avaliado agora não sai da lista", () => {
  const T = [
    { id: 1, ticker: "PETR4", timeframe: "1d" },
    { id: 2, ticker: "VALE3", timeframe: "1d" },
  ];
  const semNota = { 1: { qualidade: null }, 2: { qualidade: null } };

  it("o filtro sozinho tira o avaliado (é o comportamento do filtro)", () => {
    expect(filtrarPorQualidade(T, { 1: { qualidade: 4 }, 2: { qualidade: null } }, "sem_nota"))
      .toEqual([T[1]]);
  });

  it("mas com `manter` ele fica, no lugar onde estava", () => {
    const r = filtrarPorQualidade(
      T, { 1: { qualidade: 4 }, 2: { qualidade: null } }, "sem_nota", new Set(["1"]),
    );
    expect(r).toEqual(T);
  });

  it("na lista, avaliar mantém o card e mostra a nota nova", () => {
    const { rerender } = render(
      <ListaTemplates templates={T} rotulo="OCO" qualidadeMapa={semNota} />,
    );
    expect(screen.getByText("PETR4")).toBeTruthy();

    // é o que useQualidade faz ao clicar numa estrela: mapa novo, otimista
    rerender(
      <ListaTemplates
        templates={T}
        rotulo="OCO"
        qualidadeMapa={{ 1: { qualidade: 4 }, 2: { qualidade: null } }}
      />,
    );
    expect(screen.getByText("PETR4")).toBeTruthy();   // não evaporou
    expect(screen.getByText("Ótimo")).toBeTruthy();   // e o selo virou
  });

  it("a primeira carga do mapa não marca ninguém como avaliado agora", () => {
    const { rerender } = render(
      <ListaTemplates templates={T} rotulo="OCO" qualidadeMapa={null} />,
    );
    rerender(
      <ListaTemplates
        templates={T}
        rotulo="OCO"
        qualidadeMapa={{ 1: { qualidade: 4 }, 2: { qualidade: null } }}
      />,
    );
    // o #1 já veio avaliado do banco: pertence ao filtro "Ótimos e Alta",
    // não à lista de "acabei de avaliar"
    expect(screen.queryByText("PETR4")).toBeNull();
    expect(screen.getByText("VALE3")).toBeTruthy();
  });
});
