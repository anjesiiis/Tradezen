/**
 * TRADEZEN — O AVISO DE "ESTÁ SALVO"
 * ==================================
 *
 * Não há botão de salvar: o que a pessoa desenha vai pro navegador na
 * hora e pra conta quando a mão para. Justamente por isso o aviso existe
 * — sem um botão pra apertar, não há como saber se o trabalho está
 * guardado, e a dúvida é pior que a espera.
 *
 * É um quadro de avisos simples, sem React, porque quem avisa (a função
 * que grava, no Dashboard) e quem mostra (o selo, no canto da tela) estão
 * em lados opostos da árvore de componentes.
 */

export const ESTADOS = ["oculto", "editando", "salvando", "salvo", "erro"];

// Quanto tempo o "Salvo" fica na tela antes de sumir sozinho. Some porque
// um selo permanente vira parte do cenário e deixa de ser lido.
export const ESPERA_SUMIR_MS = 2000;

let atual = "oculto";
let ouvintes = [];
let sumico = null;

export function statusAtual() {
  return atual;
}

export function assinarStatus(aoMudar) {
  ouvintes.push(aoMudar);
  aoMudar(atual);
  return () => { ouvintes = ouvintes.filter((o) => o !== aoMudar); };
}

/**
 * Anuncia em que pé está a gravação.
 *
 * "salvo" se apaga sozinho; "erro" fica até a próxima tentativa, porque
 * some-lo seria esconder que o trabalho pode não ter subido.
 */
export function anunciarStatus(novo, { aoSumir = ESPERA_SUMIR_MS } = {}) {
  if (!ESTADOS.includes(novo)) return;
  clearTimeout(sumico);
  atual = novo;
  for (const ouvinte of ouvintes) ouvinte(atual);

  if (novo === "salvo" && aoSumir > 0) {
    sumico = setTimeout(() => anunciarStatus("oculto", { aoSumir: 0 }), aoSumir);
  }
}

/** Só pros testes: zera o quadro de avisos entre um caso e outro. */
export function zerarStatus() {
  clearTimeout(sumico);
  atual = "oculto";
  ouvintes = [];
}
