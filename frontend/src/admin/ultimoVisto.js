/**
 * TRADEZEN — ONDE EU PAREI DE REVISAR
 * ===================================
 *
 * Revisar 212 marcações não se faz numa sentada. Isto guarda o último
 * template aberto em cada lista, pra voltar dias depois e achar o lugar.
 *
 * Guarda por LISTA e não uma só: a Bandeira de Alta e o Topo Duplo são
 * revisões separadas, e um marcador compartilhado apontaria pra um id que
 * nem existe na lista aberta. A chave vem do rótulo da tela, que é único
 * — inclusive entre uma tela de padrão e a de fracasso dela ("Bandeira de
 * Alta" × "Fracassos — Bandeira de Alta").
 *
 * Guarda o ID, nunca a posição. A posição muda: a listagem vem da mais
 * recente pra mais antiga, então salvar uma marcação nova empurra todas
 * as outras um número pra baixo. O id não se move.
 *
 * localStorage e não a conta: é marcador de leitura de uma pessoa num
 * navegador, não dado do projeto. Se o storage estiver bloqueado, a
 * numeração e a lista seguem funcionando — só não há marcador.
 */

const CHAVE = "tradezen-admin-ultimo-visto";

/** Rótulo da tela → chave estável, sem acento nem espaço. */
export function chaveDaLista(rotulo) {
  return String(rotulo || "sem-nome")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function lerTudo() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    return bruto && typeof bruto === "object" && !Array.isArray(bruto) ? bruto : {};
  } catch {
    return {};   // aba anônima, storage cheio ou JSON estragado
  }
}

/** O id do último aberto nesta lista, ou null. */
export function lerUltimoVisto(rotulo) {
  const id = lerTudo()[chaveDaLista(rotulo)];
  return id === undefined ? null : id;
}

export function gravarUltimoVisto(rotulo, id) {
  if (id == null) return;
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...lerTudo(), [chaveDaLista(rotulo)]: id }));
  } catch { /* sem storage: vale só nesta visita */ }
}

export function limparUltimoVisto(rotulo) {
  try {
    const tudo = lerTudo();
    delete tudo[chaveDaLista(rotulo)];
    localStorage.setItem(CHAVE, JSON.stringify(tudo));
  } catch { /* sem storage */ }
}

/**
 * Em que posição da lista está esse id — 1-based, como o card mostra.
 *
 * Devolve 0 quando o id não está mais na lista: foi apagado, ou movido
 * pro outro lado (ver admin_templates_mover). Aí o marcador não aparece,
 * em vez de apontar pro card errado.
 */
export function posicaoNaLista(templates, id) {
  if (id == null || !Array.isArray(templates)) return 0;
  // == de propósito: o id vem como número do banco e pode voltar do
  // localStorage como texto ("47" !== 47 seria marcador que nunca acende).
  return templates.findIndex((t) => t?.id == id) + 1;
}
