import { normalizarAparencia } from "./grafico/aparencia.js";

/**
 * TRADEZEN — ONDE A APARÊNCIA DO GRÁFICO FICA GUARDADA
 * =====================================================
 *
 * Mesma divisão das preferências de desenho (ver preferenciasDesenho.js):
 * deslogado vale o navegador, cadastrado vale a conta — coluna
 * `preferencias_grafico` em profiles, pra acompanhar a pessoa de um
 * aparelho pro outro.
 *
 * O localStorage é gravado NOS DOIS CASOS. É ele que pinta a primeira
 * tela: ler do Supabase leva uns instantes, e sem essa cópia local o
 * gráfico abriria verde-padrão antes da preferência chegar.
 *
 * Nada aqui estoura. Cor de candle não é motivo pra derrubar o gráfico:
 * storage bloqueado, coluna que ainda não existe (sql/021 não rodou),
 * rede caída — tudo cai no padrão, em silêncio.
 */

export const CHAVE_LOCAL = "tradezen_preferencias_grafico";

export function lerLocal() {
  try {
    return normalizarAparencia(JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "null"));
  } catch {
    return normalizarAparencia(null);
  }
}

export function gravarLocal(aparencia) {
  try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(aparencia)); } catch { /* storage bloqueado */ }
}

async function cliente() {
  const { supabase } = await import("./supabaseClient.js");
  return supabase;
}

/**
 * A aparência de quem está logado.
 *
 * Devolve null quando não há nada guardado — e aí quem chamou fica com o
 * que já tinha local, em vez de ver as cores voltarem ao padrão no login.
 */
export async function carregarDoServidor(userId) {
  if (!userId) return null;
  try {
    const supabase = await cliente();
    const { data, error } = await supabase
      .from("profiles").select("preferencias_grafico").eq("id", userId).maybeSingle();
    if (error) throw error;
    const guardado = data?.preferencias_grafico;
    if (!guardado || Object.keys(guardado).length === 0) return null;
    return normalizarAparencia(guardado);
  } catch {
    return null;
  }
}

/** Grava no Supabase. Devolve false quando não deu (e ninguém se importa). */
export async function salvarNoServidor(userId, aparencia) {
  if (!userId) return false;
  try {
    const supabase = await cliente();
    const { error } = await supabase
      .from("profiles").update({ preferencias_grafico: aparencia }).eq("id", userId);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
