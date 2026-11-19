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
  // ADMIN tem 12, e não é generosidade: é bancada de trabalho. Quem marca
  // templates compara o mesmo padrão em vários ativos e vários tempos ao
  // mesmo tempo, e 4 obriga a fechar uma mesa pra abrir outra.
  //
  // 12 e não "sem limite" porque o limite existe de verdade: são 12
  // gráficos vivos, 12 séries de candles na memória e 12 pedidos ao abrir.
  // Número redondo é melhor que descobrir o teto travando a aba.
  admin: 12,
};

/** Em que degrau esta pessoa está. Sem conta é visitante, sempre.
 *
 *  `ehAdmin` vem separado DE PROPÓSITO: a rota /eu entrega `plano:
 *  "premium"` pra quem é admin (ver planos.py), porque o resto da tela só
 *  precisa saber se tem acesso. Então o plano sozinho não distingue admin
 *  de premium, e sem este terceiro argumento o admin ficaria com 4. */
export function nivelDoUsuario(user, plano, ehAdmin = false) {
  if (!user?.id) return "visitante";
  if (ehAdmin) return "admin";
  return plano === "premium" ? "premium" : "free";
}

/** Quantas telas, no total, incluindo a principal. */
export function limiteDeTelas(user, plano, ehAdmin = false) {
  return LIMITES_TELAS[nivelDoUsuario(user, plano, ehAdmin)] ?? LIMITES_TELAS.visitante;
}

/** O MAIOR limite que existe. Quem guarda bancada precisa deste número e
 *  não do limite da pessoa: cortar na gravação faria o admin perder mesas
 *  ao recarregar, e foi exatamente esse o bug do MAX_EXTRAS = 3. */
export const TETO_DE_TELAS = Math.max(...Object.values(LIMITES_TELAS));

/**
 * Quantas colunas a grade usa para N mesas.
 *
 * Raiz quadrada arredondada pra cima: 2 mesas em 1 linha, 4 em 2×2, 6 em
 * 3×2, 9 em 3×3, 12 em 4×3. Mantém cada mesa o mais quadrada possível, e
 * gráfico muito largo e baixo é o que fica ilegível primeiro.
 *
 * Antes a grade era fixa em 2 colunas e 2 linhas (`grid4`). Com 5 mesas a
 * terceira linha não tinha altura declarada e as mesas de baixo eram
 * espremidas até o gráfico virar um risco — era o teto REAL do layout,
 * independente do limite do plano.
 */
export function colunasDaGrade(total) {
  const n = Number.isFinite(total) && total > 0 ? Math.floor(total) : 1;
  if (n <= 2) return n;
  return Math.ceil(Math.sqrt(n));
}

/**
 * Quantas telas EXTRAS cabem (a principal não conta: ela vem da URL e
 * não dá pra fechar).
 */
export function limiteDeTelasExtras(user, plano, ehAdmin = false) {
  return Math.max(0, limiteDeTelas(user, plano, ehAdmin) - 1);
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
export function motivoDoBloqueio(user, plano, ehAdmin = false) {
  const nivel = nivelDoUsuario(user, plano, ehAdmin);
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
export function cortarExtras(extras, user, plano, ehAdmin = false) {
  const cabe = limiteDeTelasExtras(user, plano, ehAdmin);
  const lista = Array.isArray(extras) ? extras : [];
  return lista.length <= cabe ? lista : lista.slice(0, cabe);
}
