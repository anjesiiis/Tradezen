/**
 * TRADEZEN — CLASSIFICAÇÃO DO FRACASSO
 * ====================================
 *
 * Rótulo curto de PORQUE o movimento não deu certo, para o Random Forest
 * (e para mim, revisando depois) poder separar os tipos de armadilha em
 * vez de ter só um balaio de "deu errado".
 *
 * O valor guardado no banco é a chave em snake_case; o rótulo é só a
 * tradução para a tela. A coluna é texto livre e sem check constraint,
 * então acrescentar um tipo aqui não precisa de migração nova.
 */

export const TIPOS_FRACASSO = [
  { id: "nao_rompeu", rotulo: "Não rompeu" },
  { id: "falso_rompimento", rotulo: "Falso rompimento" },
  { id: "nao_atingiu_alvo", rotulo: "Não atingiu o alvo" },
];

/** Rótulo de tela do tipo salvo. Vazio quando não foi classificado. */
export function rotuloDoTipoFracasso(id) {
  return TIPOS_FRACASSO.find((t) => t.id === id)?.rotulo || "";
}
