import { clearAdminToken } from "./adminApi";

/**
 * TRADEZEN — LOGOUT AUTOMÁTICO DO ADMIN POR INATIVIDADE
 * =====================================================
 *
 * Enquanto a aba do painel está ABERTA, 12 horas sem ninguém tocar nela
 * encerram a sessão sozinhas. É a proteção do notebook esquecido aberto.
 *
 * O que isto NÃO faz: barrar quem está voltando. Pedir um link de acesso
 * novo por email dá entrada imediata, sempre — o próprio link é a camada
 * de segurança da entrada, e somar um bloqueio em cima dele só castigava
 * quem passou um dia fora.
 *
 * A versão anterior guardava a hora do último uso no localStorage e
 * conferia essa marca na ENTRADA do painel. O estrago era concreto: quem
 * clicava num link novo depois de um dia parado era expulso no primeiro
 * instante, e o link — que é de uso único — ia junto. Na segunda tentativa
 * entrava, mas aí já tinha queimado um email do limite do Supabase.
 * Por isso o relógio agora vive na memória da aba: fechou a aba, acabou.
 */

const CHAVE_EXPIROU = "admin_expirou_por_inatividade";

export const JANELA_MS = 12 * 60 * 60 * 1000;   // 12 horas

function gravar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* storage bloqueado */ }
}
function apagar(chave) {
  try { localStorage.removeItem(chave); } catch { /* idem */ }
}

/**
 * O relógio de inatividade de UMA aba aberta.
 *
 * `tocar()` adia o prazo (foi usado agora). `pausar()` segura o relógio
 * enquanto a aba está em segundo plano: quem deixou o painel numa aba
 * atrás das outras não está com ele exposto na tela, que é o risco que
 * isto protege. `parar()` encerra de vez, no cleanup do componente.
 */
export function criarVigiaDeInatividade({ janelaMs = JANELA_MS, aoExpirar } = {}) {
  let id = null;
  const limpar = () => { if (id !== null) { clearTimeout(id); id = null; } };
  return {
    tocar() {
      limpar();
      id = setTimeout(() => { id = null; aoExpirar?.(); }, janelaMs);
    },
    pausar: limpar,
    parar: limpar,
    get ativo() { return id !== null; },
  };
}

/**
 * Encerra a sessão do admin.
 *
 * Não basta apagar o token guardado: a sessão do Supabase continuaria
 * viva e o próprio app pegaria um token novo dela no próximo acesso
 * (ver sincronizarTokenAdmin). Por isso o signOut — é ele que invalida o
 * refresh token.
 */
export async function encerrarPorInatividade() {
  clearAdminToken();
  gravar(CHAVE_EXPIROU, "1");
  try {
    const { supabase } = await import("../lib/supabaseClient.js");
    await supabase.auth.signOut();
  } catch { /* sem sessão do Supabase: o token já foi apagado, basta */ }
}

/** A tela de login lê isto uma vez, pra explicar por que caiu aqui. */
export function consumirAvisoDeExpiracao() {
  const lido = (() => { try { return localStorage.getItem(CHAVE_EXPIROU); } catch { return null; } })();
  if (lido === "1") apagar(CHAVE_EXPIROU);
  return lido === "1";
}
