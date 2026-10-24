import { clearAdminToken } from "./adminApi";

/**
 * TRADEZEN — EXPIRAÇÃO DO ADMIN POR INATIVIDADE
 * ==============================================
 *
 * O painel sai do ar sozinho depois de 12 horas sem uso, e voltar exige
 * um link de acesso novo por email.
 *
 * Por que isso é preciso: a sessão do Supabase se renova sozinha pelo
 * refresh token, então quem entrou uma vez ficava dentro do admin
 * praticamente para sempre — inclusive num computador emprestado, num
 * navegador esquecido aberto, ou num celular perdido.
 *
 * É inatividade, não tempo de sessão: usar o painel adia o prazo. Quem
 * passa a tarde marcando padrões não é interrompido no meio.
 */

const CHAVE_ATIVIDADE = "admin_ultima_atividade";
const CHAVE_EXPIROU = "admin_expirou_por_inatividade";

export const JANELA_MS = 12 * 60 * 60 * 1000;   // 12 horas

// Gravar a cada clique encheria o localStorage de escrita à toa. Um
// minuto de resolução é mais que suficiente para uma janela de 12 horas.
const INTERVALO_DE_GRAVACAO_MS = 60 * 1000;

function ler(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* storage bloqueado */ }
}
function apagar(chave) {
  try { localStorage.removeItem(chave); } catch { /* idem */ }
}

/** Marca que o admin está sendo usado agora. */
export function marcarAtividade(agora = Date.now()) {
  const anterior = Number(ler(CHAVE_ATIVIDADE)) || 0;
  if (agora - anterior < INTERVALO_DE_GRAVACAO_MS) return;
  gravar(CHAVE_ATIVIDADE, String(agora));
}

/**
 * Passou das 12 horas sem uso?
 *
 * Sem marca nenhuma, NÃO expira: é a primeira vez nesta máquina (ou o
 * storage está bloqueado), e expulsar quem acabou de entrar seria pior
 * que o problema que isto resolve.
 */
export function sessaoExpirou(agora = Date.now()) {
  const marca = Number(ler(CHAVE_ATIVIDADE));
  if (!marca) return false;
  return agora - marca > JANELA_MS;
}

/** Quanto falta, em ms, para expirar. Null quando não há marca. */
export function tempoRestante(agora = Date.now()) {
  const marca = Number(ler(CHAVE_ATIVIDADE));
  if (!marca) return null;
  return Math.max(0, marca + JANELA_MS - agora);
}

/**
 * Encerra a sessão do admin.
 *
 * Não basta apagar o token guardado: a sessão do Supabase continuaria
 * viva e o próprio app pegaria um token novo dela no próximo acesso
 * (ver sincronizarTokenAdmin). Por isso o signOut — é ele que invalida o
 * refresh token e obriga um link de acesso novo.
 */
export async function encerrarPorInatividade() {
  clearAdminToken();
  apagar(CHAVE_ATIVIDADE);
  gravar(CHAVE_EXPIROU, "1");
  try {
    const { supabase } = await import("../lib/supabaseClient.js");
    await supabase.auth.signOut();
  } catch { /* sem sessão do Supabase: o token já foi apagado, basta */ }
}

/** A tela de login lê isto uma vez, pra explicar por que caiu aqui. */
export function consumirAvisoDeExpiracao() {
  const expirou = ler(CHAVE_EXPIROU) === "1";
  if (expirou) apagar(CHAVE_EXPIROU);
  return expirou;
}
