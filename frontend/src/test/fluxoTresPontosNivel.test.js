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
  it("clique além do teto é ignorado, não acumulado", () => {
    expect(grafico).toMatch(/if \(maxToquesRef\.current > 0 && atuais\.length >= maxToquesRef\.current\) return prev;/);
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
  it("limpa pontos, faixa e o modal", () => {
    const bloco = tela.slice(tela.indexOf("RESET COMPLETO"));
    expect(bloco.slice(0, 500)).toMatch(/setToquesPorGrupo\(\(prev\) => \(\{ \.\.\.prev, \[GRUPO\]: \[\] \}\)\)/);
    expect(bloco.slice(0, 500)).toMatch(/esquecerAjuste\(GRUPO\)/);
    expect(bloco.slice(0, 500)).toMatch(/setEscolhendoTipo\(false\)/);
  });

  it("uma zona por vez: um grupo só", () => {
    expect(tela).toMatch(/const GRUPO = "zona";/);
    expect(tela).toMatch(/grupoAtivo=\{GRUPO\}/);
  });
});
