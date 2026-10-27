/**
 * TRADEZEN — GRÁFICOS SALVOS DO USUÁRIO
 * =====================================
 *
 * O que a pessoa deixou montado em cada ativo (indicadores + desenhos),
 * guardado na conta pra acompanhá-la de um aparelho pro outro.
 *
 * O localStorage continua valendo e é gravado SEMPRE: é ele que pinta a
 * tela no mesmo instante em que o ativo abre. O Supabase chega depois, e
 * quando chega manda — é a cópia que vale entre aparelhos.
 *
 * Nada aqui estoura. Tabela que ainda não existe (sql/020 não rodou),
 * sessão expirada, rede caída: o desenho continua salvo no navegador e a
 * pessoa nem percebe. Perder um gráfico é ruim; derrubar a tela por causa
 * de uma gravação que falhou é pior.
 */

export const CHAVE_LOCAL = "tradezen-ativo-config";

export function lerLocal() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "{}");
    return bruto && typeof bruto === "object" ? bruto : {};
  } catch {
    return {};
  }
}

export function gravarLocal(tudo) {
  try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(tudo)); } catch { /* storage cheio ou bloqueado */ }
}

async function cliente() {
  const { supabase } = await import("./supabaseClient.js");
  return supabase;
}

/**
 * Tudo o que esta conta tem salvo, no formato { [ticker]: config }.
 *
 * Devolve null quando não deu pra ler — e aí quem chamou fica com o que
 * já tinha no navegador, em vez de ver os desenhos sumirem no login.
 */
export async function carregarDaConta(userId) {
  if (!userId) return null;
  try {
    const supabase = await cliente();
    const { data, error } = await supabase
      .from("graficos_usuario").select("ticker,config").eq("user_id", userId);
    if (error) throw error;
    if (!Array.isArray(data)) return null;
    const saida = {};
    for (const linha of data) {
      if (linha?.ticker && linha.config) saida[linha.ticker] = linha.config;
    }
    return saida;
  } catch {
    return null;
  }
}

/** Grava a configuração de UM ativo. Devolve false quando não deu. */
export async function salvarNaConta(userId, ticker, config) {
  if (!userId || !ticker) return false;
  try {
    const supabase = await cliente();
    // upsert pela chave (user_id, ticker): a mesma pessoa no mesmo ativo
    // tem uma linha só, que vai sendo reescrita.
    const { error } = await supabase
      .from("graficos_usuario")
      .upsert({ user_id: userId, ticker, config }, { onConflict: "user_id,ticker" });
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/** Apaga o que estava salvo daquele ativo (usado ao limpar o gráfico). */
export async function apagarDaConta(userId, ticker) {
  if (!userId || !ticker) return false;
  try {
    const supabase = await cliente();
    const { error } = await supabase
      .from("graficos_usuario").delete().eq("user_id", userId).eq("ticker", ticker);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/**
 * Junta o que veio da conta com o que estava no navegador.
 *
 * A conta manda nos ativos que ela tem; o navegador preenche os que ela
 * não tem. É o que salva o caso de quem desenhou DESLOGADO e depois criou
 * a conta: aquele trabalho sobe junto, em vez de sumir no primeiro login.
 */
export function juntar(daConta, doNavegador) {
  return { ...(doNavegador || {}), ...(daConta || {}) };
}

/** Os tickers que o navegador tem e a conta ainda não — pra subir no login. */
export function faltandoNaConta(daConta, doNavegador) {
  const conta = daConta || {};
  return Object.keys(doNavegador || {}).filter((t) => !conta[t]);
}
