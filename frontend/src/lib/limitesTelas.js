/**
 * TRADEZEN — QUANTAS TELAS CADA UM PODE ABRIR
 * ===========================================
 *
 * Sem conta 1, com conta grátis 2, premium 4. Os números saem daqui e de
 * mais nenhum lugar: a contagem na tela, o bloqueio do "+" e o corte na
 * carga leem todos esta mesma tabela, senão um deles fica para trás numa
 * mudança de preço.
 *
 * O 4 do premium é o que a página de vendas anuncia ("4 telas
 * simultâneas, o dobro do grátis"). Se este número subir, o texto de lá
 * sobe junto — é oferta publicada, não detalhe de implementação.
 *
 * ONDE O PLANO É DECIDIDO: no servidor. O `plano` chega do /eu pelo
 * AuthContext, com o token da sessão. Ler `profiles` direto do navegador
 * daria o mesmo texto na tela, mas o que vale é o servidor — e é de
 * propósito que a migration 017 não tem policy de UPDATE em profiles:
 * sem ela, qualquer um com o anon key se promoveria a premium pelo
 * console. Nada aqui é barreira de segurança; é o que a tela mostra.
 */

export const LIMITES_TELAS = {
  visitante: 1,
  free: 2,
  premium: 4,
};

/** Em que degrau esta pessoa está. Sem conta é visitante, sempre. */
export function nivelDoUsuario(user, plano) {
  if (!user?.id) return "visitante";
  return plano === "premium" ? "premium" : "free";
}

/** Quantas telas, no total, incluindo a principal. */
export function limiteDeTelas(user, plano) {
  return LIMITES_TELAS[nivelDoUsuario(user, plano)] ?? LIMITES_TELAS.visitante;
}

/**
 * Quantas telas EXTRAS cabem (a principal não conta: ela vem da URL e
 * não dá pra fechar).
 */
export function limiteDeTelasExtras(user, plano) {
  return Math.max(0, limiteDeTelas(user, plano) - 1);
}

/**
 * O que fazer quando a pessoa pede uma tela que não cabe.
 *
 * "cadastrado" pra quem não tem conta — mostrar preço a quem nem se
 * cadastrou é pedir dinheiro antes de mostrar o produto.
 * "upgrade" pra quem tem conta grátis: é o degrau seguinte dela.
 * "teto" pro premium, que já está no limite do que existe — não há o que
 *  vender, então é só um aviso.
 */
export function motivoDoBloqueio(user, plano) {
  const nivel = nivelDoUsuario(user, plano);
  if (nivel === "visitante") return "cadastrado";
  if (nivel === "free") return "upgrade";
  return "teto";
}

/**
 * As telas extras que sobram depois de aplicar o limite.
 *
 * Existe porque a bancada volta do banco no F5 (ver sessaoTelas): alguém
 * que abriu 4 telas com conta e saiu dela voltaria com 4 como visitante.
 * Corta as de trás e mantém as da frente — as primeiras são as que a
 * pessoa montou primeiro.
 */
export function cortarExtras(extras, user, plano) {
  const cabe = limiteDeTelasExtras(user, plano);
  const lista = Array.isArray(extras) ? extras : [];
  return lista.length <= cabe ? lista : lista.slice(0, cabe);
}
