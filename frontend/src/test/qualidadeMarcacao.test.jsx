import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FILTROS_QUALIDADE, FILTRO_QUALIDADE_PADRAO, NIVEIS, NIVEIS_COM_NOME,
  QUALIDADE_MAXIMA, TOTAL_DE_ESTRELAS, contarPorQualidade, estrelasCheias,
  estrelasEmTexto, filtrarPorQualidade, nivelDe, proximaQualidade, qualidadeDe,
} from "../admin/qualidade.js";
import SeletorQualidade from "../admin/SeletorQualidade.jsx";
import Estrelas from "../admin/Estrelas.jsx";
import ListaTemplates from "../admin/ListaTemplates.jsx";

const mapa = (pares) => Object.fromEntries(
  Object.entries(pares).map(([id, q]) => [id, { qualidade: q }])
);

describe("a escala", () => {
  it("tem os nove passos, do melhor pro pior", () => {
    expect(NIVEIS.map((n) => n.rotulo)).toEqual(
      ["Ótimo", "4,5", "Alta", "3,5", "Média", "2,5", "Baixa", "1,5", "Falha"]);
    expect(NIVEIS.map((n) => n.valor)).toEqual([8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });

  // A escala dobrou; os cinco nomes NÃO mudaram de lugar. Se algum dia
  // alguém reordenar isto, as 212 avaliações já convertidas pela 029
  // passam a significar outra coisa em silêncio.
  it("os cinco nomes seguem nos valores pares, na mesma ordem", () => {
    expect(NIVEIS_COM_NOME.map((n) => [n.valor, n.nome])).toEqual([
      [8, "Ótimo"], [6, "Alta"], [4, "Média"], [2, "Baixa"], [0, "Falha"],
    ]);
  });

  it("só o valor par tem nome; o ímpar é meio-passo", () => {
    for (const n of NIVEIS) {
      if (n.valor % 2 === 0) expect(n.nome, String(n.valor)).toBeTruthy();
      else expect(n.nome, String(n.valor)).toBeNull();
    }
  });

  it("meio-passo cai exatamente entre os vizinhos, meia estrela acima", () => {
    expect(estrelasCheias(7)).toBe(4.5);
    expect(estrelasCheias(5)).toBe(3.5);
    expect(estrelasCheias(3)).toBe(2.5);
    expect(estrelasCheias(1)).toBe(1.5);
  });

  it("o número aparece escrito com vírgula, não com ponto", () => {
    expect(estrelasEmTexto(7)).toBe("4,5");
    expect(estrelasEmTexto(8)).toBe("5");
    expect(estrelasEmTexto(0)).toBe("1");
  });

  // O teto da tela e o teto do banco (trava da 029) têm que ser o mesmo
  // número: diferentes, a tela ofereceria uma nota que volta como erro.
  it("o teto da escala é 8", () => {
    expect(QUALIDADE_MAXIMA).toBe(8);
    expect(Math.max(...NIVEIS.map((n) => n.valor))).toBe(QUALIDADE_MAXIMA);
    expect(Math.min(...NIVEIS.map((n) => n.valor))).toBe(0);
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
    expect(estrelasCheias(8)).toBe(5);
    expect(NIVEIS.map((n) => estrelasCheias(n.valor)))
      .toEqual([5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1]);
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
    expect(qualidadeDe(mapa({ 12: 6 }), 12)).toBe(6);
    expect(qualidadeDe(mapa({ 12: 6 }), "12")).toBe(6);
  });
});

describe("clicar no nível aceso desfaz a avaliação", () => {
  it("volta pra null, e não pra um nível vizinho", () => {
    expect(proximaQualidade(3, 3)).toBe(null);
  });
  it("clicar em outro nível troca a nota", () => {
    expect(proximaQualidade(6, 0)).toBe(0);
    expect(proximaQualidade(null, 8)).toBe(8);
    // e o meio-passo se desfaz igual
    expect(proximaQualidade(7, 7)).toBe(null);
  });
});

describe("filtros", () => {
  // Um de cada passo da escala, mais um sem nota.
  const todos = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
  const m = mapa({
    1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1, 9: 0, 10: null,
  });

  it("conta cada filtro sem deixar marcação de fora", () => {
    const c = contarPorQualidade(todos, m);
    expect(c.todos).toBe(10);
    expect(c.sem_nota).toBe(1);
    expect(c.bons).toBe(3);    // Ótimo, 4,5 e Alta
    expect(c.media).toBe(2);   // Média e 3,5
    expect(c.ruins).toBe(4);   // Baixa, 2,5, 1,5 e Falha
    const semTodos = FILTROS_QUALIDADE.filter((f) => f.id !== "todos");
    expect(semTodos.reduce((s, f) => s + c[f.id], 0)).toBe(todos.length);
  });

  // Nenhum dos nove passos pode ficar fora de todos os grupos: era isso
  // que aconteceria se os filtros continuassem comparando por igualdade.
  it("todo passo da escala cabe em exatamente um grupo", () => {
    const grupos = FILTROS_QUALIDADE.filter((f) => f.id !== "todos");
    for (const n of NIVEIS) {
      const cabem = grupos.filter((g) => g.cabe(n.valor)).map((g) => g.id);
      expect(cabem, `valor ${n.valor}`).toHaveLength(1);
    }
    // e "sem nota" é o único que aceita null
    expect(grupos.filter((g) => g.cabe(null)).map((g) => g.id)).toEqual(["sem_nota"]);
  });

  it('"sem nota" pega exatamente quem ninguém avaliou', () => {
    expect(filtrarPorQualidade(todos, m, "sem_nota").map((t) => t.id)).toEqual([10]);
  });

  it('"ruins" inclui Falha, que é nota zero', () => {
    expect(filtrarPorQualidade(todos, m, "ruins").map((t) => t.id)).toEqual([6, 7, 8, 9]);
  });

  it("todos devolve a lista inteira, e filtro desconhecido também", () => {
    expect(filtrarPorQualidade(todos, m, "todos")).toHaveLength(10);
    expect(filtrarPorQualidade(todos, m, "inexistente")).toHaveLength(10);
  });
});

describe("SeletorQualidade", () => {
  it("desenha os nove passos como grupo de rádio, não caixinhas", () => {
    render(<SeletorQualidade qualidade={null} aoMudar={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: /qualidade/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(9);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("marca aria-checked só no nível aceso", () => {
    render(<SeletorQualidade qualidade={6} aoMudar={() => {}} />);
    const acesos = screen.getAllByRole("radio").filter((b) => b.getAttribute("aria-checked") === "true");
    expect(acesos).toHaveLength(1);
    expect(acesos[0]).toHaveTextContent("Alta");
  });

  it("acende o meio-passo também, e só ele", () => {
    render(<SeletorQualidade qualidade={7} aoMudar={() => {}} />);
    const acesos = screen.getAllByRole("radio").filter((b) => b.getAttribute("aria-checked") === "true");
    expect(acesos).toHaveLength(1);
    expect(acesos[0]).toHaveTextContent("4,5");
  });

  it("clicar devolve o valor do nível", () => {
    const aoMudar = vi.fn();
    render(<SeletorQualidade qualidade={null} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("radio", { name: /ótimo/i }));
    expect(aoMudar).toHaveBeenCalledWith(8);
  });

  it("clicar no aceso manda null, que é desfazer", () => {
    const aoMudar = vi.fn();
    render(<SeletorQualidade qualidade={0} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("radio", { name: /falha/i }));
    expect(aoMudar).toHaveBeenCalledWith(null);
  });

  // Andar de um em um é andar de MEIA estrela — a seta não pode pular o
  // meio-passo, senão ele só existiria pra quem usa o mouse.
  it("as setas do teclado andam de meia em meia estrela", () => {
    const aoMudar = vi.fn();
    render(<SeletorQualidade qualidade={8} aoMudar={aoMudar} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: /ótimo/i }), { key: "ArrowRight" });
    expect(aoMudar).toHaveBeenCalledWith(7);
  });

  it("mostra o critério do nível aceso, não só num tooltip", () => {
    render(<SeletorQualidade qualidade={8} aoMudar={() => {}} />);
    expect(screen.getByText(nivelDe(8).dica)).toBeInTheDocument();
  });

  // "4,5" sozinho não diz nada a quem está ouvindo a tela: o nome
  // acessível diz quantas estrelas de quantas.
  it("o meio-passo se anuncia como estrelas, e a dica fica na tela", () => {
    render(<SeletorQualidade qualidade={7} aoMudar={() => {}} />);
    expect(screen.getByRole("radio", { name: "4,5 de 5 estrelas" })).toBeInTheDocument();
    expect(screen.getByText(nivelDe(7).dica)).toBeInTheDocument();
  });

  // A dica cita os vizinhos ("Entre Alta e Ótimo"). Se ela entrar no nome
  // acessível, dois botões respondem por "Ótimo" e quem usa leitor de
  // tela ou teclado não consegue mais escolher um deles.
  it("cada passo tem um nome acessível único", () => {
    render(<SeletorQualidade qualidade={null} aoMudar={() => {}} />);
    const nomes = screen.getAllByRole("radio").map((b) => b.getAttribute("aria-label"));
    expect(new Set(nomes).size).toBe(nomes.length);
    expect(nomes.filter((n) => /ótimo/i.test(n))).toHaveLength(1);
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
    render(<SeletorQualidade qualidade={4} aoMudar={() => {}} />);
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

  // MEIA ESTRELA: duas camadas sobre o mesmo lugar (☆ vazio + ★ cortado),
  // e não um caractere de meia estrela — esse falta em muita fonte de
  // sistema e cairia como retângulo no telefone de quem avalia.
  it("meia estrela é ☆ com ★ recortado em cima, no mesmo glifo", () => {
    const { container } = render(<Estrelas cheias={4.5} total={5} />);
    expect(container.querySelectorAll(".cheia")).toHaveLength(4);
    expect(container.querySelectorAll(".meia")).toHaveLength(1);
    expect(container.querySelectorAll(".vazia")).toHaveLength(0);
    const meia = container.querySelector(".meia");
    expect(meia.querySelector(".meia-vazia").textContent).toBe("☆");
    expect(meia.querySelector(".meia-cheia").textContent).toBe("★");
  });

  it("a meia aparece na posição certa em cada passo", () => {
    for (const [cheias, antes] of [[1.5, 1], [2.5, 2], [3.5, 3], [4.5, 4]]) {
      const { container } = render(<Estrelas cheias={cheias} total={5} />);
      expect(container.querySelectorAll(".cheia"), String(cheias)).toHaveLength(antes);
      expect(container.querySelectorAll(".meia"), String(cheias)).toHaveLength(1);
      expect(container.querySelectorAll(".vazia"), String(cheias)).toHaveLength(4 - antes);
    }
  });

  it("nota inteira não desenha meia nenhuma", () => {
    for (const cheias of [1, 2, 3, 4, 5]) {
      const { container } = render(<Estrelas cheias={cheias} total={5} />);
      expect(container.querySelectorAll(".meia"), String(cheias)).toHaveLength(0);
    }
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
  it("cada passo mostra suas estrelas cheias", () => {
    const { container } = render(<SeletorQualidade qualidade={null} aoMudar={() => {}} />);
    const botoes = screen.getAllByRole("radio");
    // Ótimo é o primeiro da fila e tem as cinco cheias.
    expect(botoes[0].querySelectorAll(".cheia")).toHaveLength(5);
    // Falha é o último e tem uma.
    expect(botoes[8].querySelectorAll(".cheia")).toHaveLength(1);
    expect(container.querySelectorAll(".sq-estrelas")).toHaveLength(9);
  });

  it("os quatro meios-passos desenham meia estrela; os cinco nomes, não", () => {
    render(<SeletorQualidade qualidade={null} aoMudar={() => {}} />);
    const botoes = screen.getAllByRole("radio");
    const comMeia = botoes.filter((b) => b.querySelector(".meia"));
    expect(comMeia).toHaveLength(4);
    expect(comMeia.map((b) => b.textContent.replace(/[★☆]/g, "")))
      .toEqual(["4,5", "3,5", "2,5", "1,5"]);
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
    expect(filtrarPorQualidade(T, { 1: { qualidade: 8 }, 2: { qualidade: null } }, "sem_nota"))
      .toEqual([T[1]]);
  });

  it("mas com `manter` ele fica, no lugar onde estava", () => {
    const r = filtrarPorQualidade(
      T, { 1: { qualidade: 8 }, 2: { qualidade: null } }, "sem_nota", new Set(["1"]),
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
        qualidadeMapa={{ 1: { qualidade: 8 }, 2: { qualidade: null } }}
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
        qualidadeMapa={{ 1: { qualidade: 8 }, 2: { qualidade: null } }}
      />,
    );
    // o #1 já veio avaliado do banco: pertence ao filtro "Ótimos e Alta",
    // não à lista de "acabei de avaliar"
    expect(screen.queryByText("PETR4")).toBeNull();
    expect(screen.getByText("VALE3")).toBeTruthy();
  });
});
