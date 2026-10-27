import { normalizarPreferencias } from "./grafico/estiloDesenho.js";

/**
 * TRADEZEN — ONDE AS PREFERÊNCIAS DE DESENHO FICAM GUARDADAS
 * ==========================================================
 *
 * Deslogado: localStorage — valem naquele navegador e pronto.
 * Cadastrado: coluna `preferencias_desenho` em profiles, pra acompanhar a
 * pessoa de um aparelho pro outro.
 *
 * O localStorage é gravado NOS DOIS CASOS. É ele que pinta a primeira
 * tela: ler do Supabase leva uns instantes, e sem essa cópia local a
 * primeira linha do dia sairia azul padrão antes da preferência chegar.
 *
 * Nada aqui estoura: preferência de cor não é motivo pra derrubar o
 * gráfico. Storage bloqueado, coluna que não existe ainda (sql/019 não
 * rodou), rede caída — tudo cai no padrão em silêncio.
 */

export const CHAVE_LOCAL = "tradezen_preferencias_desenho";

export function lerLocal() {
  try {
    return normalizarPreferencias(JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "null"));
  } catch {
    return normalizarPreferencias(null);
  }
}

export function gravarLocal(prefs) {
  try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(prefs)); } catch { /* storage bloqueado */ }
}

async function cliente() {
  const { supabase } = await import("./supabaseClient.js");
  return supabase;
}

/**
 * As preferências de quem está logado.
 *
 * Devolve null quando não há nada guardado lá — e aí quem chamou fica com
 * o que já tinha local, em vez de ver suas cores sumirem no login.
 */
export async function carregarDoServidor(userId) {
  if (!userId) return null;
  try {
    const supabase = await cliente();
    const { data, error } = await supabase
      .from("profiles").select("preferencias_desenho").eq("id", userId).maybeSingle();
    if (error) throw error;
    const guardado = data?.preferencias_desenho;
    if (!guardado || Object.keys(guardado).length === 0) return null;
    return normalizarPreferencias(guardado);
  } catch {
    return null;   // coluna ainda não existe, ou sem rede: segue com o local
  }
}

/** Grava no Supabase. Devolve false quando não deu (e ninguém se importa). */
export async function salvarNoServidor(userId, prefs) {
  if (!userId) return false;
  try {
    const supabase = await cliente();
    const { error } = await supabase
      .from("profiles").update({ preferencias_desenho: prefs }).eq("id", userId);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
