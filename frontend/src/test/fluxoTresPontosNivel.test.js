import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * S/R EM TRÊS PONTOS, TIPO NO FIM.
 *
 * Antes: tipo escolhido ANTES, toques livres (mínimo 2, sem teto). O
 * quarto clique virava um toque solto — nem borda, nem preço —, e o
 * estado da zona anterior não era limpo, então marcar a segunda zona na
 * mesma sessão saía errado.
 *
 * Agora: 1 preço e borda esquerda, 2 preço oposto, 3 borda direita. O
 * quarto clique é ignorado, e o tipo vem num modal no fim.
 */
const tela = readFileSync(
  resolve(process.cwd(), "src/admin/AdminTemplatesNiveis.jsx"), "utf8");
const grafico = readFileSync(
  resolve(process.cwd(), "src/admin/NivelMarkerChart.jsx"), "utf8");

describe("a trava nos três pontos", () => {
  it("o gráfico recebe o teto", () => {
    expect(tela).toMatch(/maxToques=\{TOTAL_PONTOS\}/);
    expect(tela).toMatch(/const TOTAL_PONTOS = 3;/);
  });

  // Sem a trava, o quarto clique virava um toque que não é nem borda nem
  // preço. Era o bug relatado de "deixa continuar clicando".
  it("clique além do teto não acumula ponto", () => {
    const bloco = grafico.slice(grafico.indexOf("TRAVA NO TETO"));
    expect(bloco.slice(0, 1200))
      .toMatch(/if \(maxToquesRef\.current > 0 && atuais\.length >= maxToquesRef\.current\) \{/);
    expect(bloco.slice(0, 1200)).toMatch(/return prev;/);
  });

  // E NÃO PODE MORRER EM SILÊNCIO. Quem fechou o modal sem escolher
  // ficava com a zona cheia e, ao clicar pra marcar outra, não acontecia
  // NADA — nem ponto, nem aviso, nem o modal de volta. Parecia que a
  // ferramenta tinha desaparecido, e foi exatamente esse o relato.
  it("clique na zona cheia traz o modal de volta", () => {
    const bloco = grafico.slice(grafico.indexOf("TRAVA NO TETO"));
    expect(bloco.slice(0, 1200)).toMatch(/aoCompletarRef\.current\?\.\(atuais\)/);
  });

  // A outra saída: quem quer marcar OUTRA zona precisa de um jeito óbvio
  // de apagar a atual. Os links dentro do gráfico são pequenos demais.
  it("há botão de apagar e marcar outra", () => {
    expect(tela).toMatch(/Apagar e marcar outra/);
    const bloco = tela.slice(tela.indexOf("A SEGUNDA SAÍDA"));
    expect(bloco.slice(0, 700)).toMatch(/onClick=\{limparZona\}/);
  });

  // O aviso tem de DIZER que a trava é de propósito, senão a pessoa
  // conclui que a ferramenta quebrou.
  it("o guia explica que o clique está travado", () => {
    expect(tela).toMatch(/clique no gráfico está travado de propósito/);
  });

  it("completar avisa a tela, que abre o modal", () => {
    expect(grafico).toMatch(/aoCompletarRef\.current\?\.\(proximos\)/);
    expect(tela).toMatch(/aoCompletar=\{\(\) => setEscolhendoTipo\(true\)\}/);
  });

  // Teto 0 = sem teto: as outras telas que usam este gráfico não mudam.
  it("sem teto, o comportamento antigo segue valendo", () => {
    expect(grafico).toMatch(/maxToques = 0,/);
  });
});

describe("o tipo vem no fim", () => {
  it("o seletor saiu de cima do formulário", () => {
    const antes = tela.slice(0, tela.indexOf("Carregar gráfico"));
    expect(antes).not.toMatch(/<TipoToggle value=\{tipo\}/);
  });

  it("existe o modal com os dois tipos", () => {
    expect(tela).toMatch(/function ModalTipoDaZona/);
    expect(tela).toMatch(/aoEscolher\("suporte"\)/);
    expect(tela).toMatch(/aoEscolher\("resistencia"\)/);
  });

  // As cores do modal saem da MESMA fonte do desenho: o que a pessoa vê
  // no botão é o que a zona vai ter.
  it("as cores do modal vêm de corDoNivel", () => {
    expect(tela).toMatch(/"--niv-cor": corDoNivel\("suporte"\)/);
    expect(tela).toMatch(/"--niv-cor": corDoNivel\("resistencia"\)/);
  });

  // Fechar o modal não pode apagar três cliques de trabalho.
  it("cancelar NÃO apaga a zona marcada", () => {
    expect(tela).toMatch(/aoCancelar=\{\(\) => setEscolhendoTipo\(false\)\}/);
    const bloco = tela.slice(tela.indexOf("aoCancelar=\{() => setEscolhendoTipo(false)\}") - 400);
    expect(bloco.slice(0, 600)).not.toMatch(/setToquesPorGrupo/);
  });

  it("Esc fecha o modal", () => {
    expect(tela).toMatch(/if \(e\.key === "Escape"\)/);
  });

  it("dá pra reabrir a escolha sem remarcar", () => {
    expect(tela).toMatch(/Escolher o tipo e salvar/);
  });
});

describe("as validações de zona impossível", () => {
  it("altura zero é barrada", () => {
    expect(tela).toMatch(/if \(p1\.preco === p2\.preco\) return "Zona sem altura/);
  });

  it("largura zero é barrada", () => {
    expect(tela).toMatch(/if \(p1\.i === p3\.i\) return "Zona sem largura/);
  });

  it("menos de três pontos diz quantos faltam", () => {
    expect(tela).toMatch(/Faltam \$\{faltam\} ponto/);
  });

  it("o botão respeita a validação", () => {
    expect(tela).toMatch(/disabled=\{salvando \|\| !!motivoParaNaoSalvar\(\)\}/);
  });
});

describe("o reset depois de salvar", () => {
  // Era aqui o bug de "marcar o segundo S/R dá errado": sem limpar os
  // três estados, a zona seguinte nascia com o resto da anterior — e o
  // clique travado, porque o teto de 3 já estava cheio.
  // Um lugar só pra limpar, chamado do salvamento E do botão de apagar.
  // Duas cópias divergiriam, e o estado esquecido num dos caminhos é
  // exatamente o que fazia a zona seguinte nascer travada.
  it("limpa pontos, faixa, tipo e modal num lugar só", () => {
    const bloco = tela.slice(tela.indexOf("function limparZona"));
    for (const linha of [/setToques\(\[\]\)/, /setAjuste\(null\)/,
                         /setEscolhendoTipo\(false\)/, /setTipoDaZona\(null\)/,
                         /setLimpezas\(/]) {
      expect(bloco.slice(0, 400)).toMatch(linha);
    }
  });

  it("o salvamento reusa o mesmo limparZona", () => {
    const bloco = tela.slice(tela.indexOf("RESET COMPLETO"));
    expect(bloco.slice(0, 400)).toMatch(/limparZona\(\);/);
  });

  // O modo de DOIS grupos desenha só os grupos que existem em `cores`.
  // Reaproveitá-lo com um grupo próprio fazia os cliques entrarem sem
  // nada aparecer na tela — era o relato "cliquei e não aparece nada".
  it("não usa o modo de dois grupos", () => {
    // O gráfico da MARCAÇÃO (o segundo no arquivo; o primeiro é o de
    // editar/visualizar, que já era modo simples).
    const inicio = tela.indexOf("Modo SIMPLES");
    const bloco = tela.slice(inicio, inicio + 1400);
    expect(bloco).not.toMatch(/^\s*dual\s*$/m);
    expect(bloco).toMatch(/initialToques=\{toques\}/);
  });

  // Sem tipo escolhido, a zona é cinza: pintá-la de verde ou vermelho
  // antes da escolha afirmaria o que ninguém disse.
  it("a zona nasce cinza, sem tipo", () => {
    expect(tela).toMatch(/cor=\{tipoDaZona \? corDoTipo\(tipoDaZona\) : "#787b86"\}/);
  });
});
