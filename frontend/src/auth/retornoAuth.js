/**
 * TRADEZEN — RECONHECER UM RETORNO DE RECUPERAÇÃO DE SENHA
 * =======================================================
 *
 * O link do email de "esqueci minha senha" DEVERIA cair em
 * /redefinir-senha: é o que `redirectTo` pede em auth/RecuperarSenha.jsx.
 *
 * Só que quando a URL pedida não está na allow-list de Redirect URLs do
 * Supabase, ele ignora o `redirectTo` e manda pra "Site URL" — a raiz do
 * site. O token vem junto, intacto, mas na rota errada: a raiz renderiza
 * a landing e o Dashboard, que não sabem o que fazer com ele. O usuário
 * clica no link do email e cai na página inicial, como se nada tivesse
 * acontecido. Foi exatamente o que já aconteceu com o magic link do admin
 * (ver `retornoDeAuthAdmin` em App.jsx).
 *
 * A configuração da allow-list é o conserto de verdade. Isto aqui é a
 * rede de segurança: se o token chegar na rota errada, a gente reconhece
 * e mostra o formulário de senha nova de qualquer jeito.
 */

// Rotas que NUNCA são sequestradas, mesmo com marca de recuperação na URL.
// Sem isto o resgate vira armadilha: num link expirado o Supabase deixa o
// #error=... na URL (não há sessão pra consumir), e o botão "Pedir novo
// link" levaria a /recuperar-senha — que seria sequestrado de volta pra
// tela de erro, em laço.
const ROTAS_PROPRIAS = ["/redefinir-senha", "/recuperar-senha", "/login", "/cadastro", "/auth/", "/admin"];

/** Lê um parâmetro que pode vir no fragmento (#) ou na query (?). */
function param(nome, hash, query) {
  const doHash = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const daQuery = new URLSearchParams(String(query || ""));
  return doHash.get(nome) || daQuery.get(nome);
}

/**
 * É um retorno de recuperação de senha?
 *
 * `type=recovery` é o que o Supabase põe na URL tanto no formato de
 * fragmento (#access_token=...&type=recovery) quanto no de verificação
 * (?token_hash=...&type=recovery). É a única marca que distingue
 * recuperação de senha de um magic link comum — e é por isso que um
 * `?code=` pelado não entra aqui: nele não há como saber se o retorno é
 * de recuperação, de cadastro ou de login.
 */
export function ehRetornoDeRecuperacao(hash, query) {
  return param("type", hash, query) === "recovery";
}

/** Precisa desviar pro formulário de senha nova em vez de abrir esta rota? */
export function precisaResgatarRecuperacao(pathname, hash, query) {
  if (!ehRetornoDeRecuperacao(hash, query)) return false;
  return !ROTAS_PROPRIAS.some((rota) => String(pathname || "").startsWith(rota));
}
