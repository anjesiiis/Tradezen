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
let motivo = null;
let tentarDeNovo = null;
let ouvintes = [];
let sumico = null;

export function statusAtual() {
  return atual;
}

/** O MOTIVO da falha, pra tela poder dizer o que aconteceu.
 *
 *  Existe porque "Não salvou na conta" era tudo que o selo sabia dizer, e
 *  isso não informa nem a causa, nem o que fazer, nem o essencial: que o
 *  trabalho está no navegador e NÃO se perdeu. */
export function motivoAtual() {
  return motivo;
}

/** Quem sabe tentar de novo se registra aqui, e o selo ganha o botão.
 *  Sem isso o aviso seria uma notícia ruim sem saída. */
export function registrarTentativa(funcao) {
  tentarDeNovo = typeof funcao === "function" ? funcao : null;
  return () => { if (tentarDeNovo === funcao) tentarDeNovo = null; };
}

export function tentativaAtual() {
  return tentarDeNovo;
}

export function assinarStatus(aoMudar) {
  ouvintes.push(aoMudar);
  aoMudar(atual, motivo);
  return () => { ouvintes = ouvintes.filter((o) => o !== aoMudar); };
}

/**
 * Anuncia em que pé está a gravação.
 *
 * "salvo" se apaga sozinho; "erro" fica até a próxima tentativa, porque
 * some-lo seria esconder que o trabalho pode não ter subido.
 */
export function anunciarStatus(novo, { aoSumir = ESPERA_SUMIR_MS, motivo: razao = null } = {}) {
  if (!ESTADOS.includes(novo)) return;
  clearTimeout(sumico);
  atual = novo;
  // O motivo só sobrevive enquanto o estado é "erro": carregá-lo depois
  // de voltar a salvar faria a tela mostrar a causa de um problema que
  // já passou.
  motivo = novo === "erro" ? razao : null;
  for (const ouvinte of ouvintes) ouvinte(atual, motivo);

  if (novo === "salvo" && aoSumir > 0) {
    sumico = setTimeout(() => anunciarStatus("oculto", { aoSumir: 0 }), aoSumir);
  }
}

/** Só pros testes: zera o quadro de avisos entre um caso e outro. */
export function zerarStatus() {
  clearTimeout(sumico);
  atual = "oculto";
  motivo = null;
  tentarDeNovo = null;
  ouvintes = [];
}
