/**
 * TRADEZEN — A BANCADA QUE A PESSOA DEIXOU MONTADA
 * ================================================
 *
 * Quem abre PETR4 no diário e VALE3 no semanal lado a lado está montando
 * uma bancada, não navegando. Dar F5 e perder a bancada é perder trabalho,
 * mesmo sem nenhum desenho feito.
 *
 * A mesa PRINCIPAL continua vindo da URL — é o que faz um link de ativo
 * funcionar e o F5 cair no lugar certo. O que se guarda aqui são as mesas
 * EXTRAS, o tempo de cada uma (inclusive o da principal) e qual delas
 * estava na frente no celular.
 *
 * Só com conta, por pedido do dono. Quem não tem conta continua abrindo a
 * bancada do zero a cada visita.
 *
 * Nada aqui estoura: tabela que ainda não existe (sql/022 não rodou),
 * sessão expirada, rede caída — a bancada abre vazia e ninguém vê erro.
 * Perder o arranjo é chato; derrubar a tela por causa dele é pior.
 */

export const MAX_EXTRAS = 3;

async function cliente() {
  const { supabase } = await import("./supabaseClient.js");
  return supabase;
}

/**
 * Deixa a bancada num formato que a tela sabe montar.
 *
 * Linha gravada por uma versão antiga, campo torto vindo de um banco
 * editado à mão, mesa sem ticker: tudo some em silêncio em vez de virar
 * uma tela quebrada.
 */
export function normalizarSessao(bruto) {
  const b = bruto && typeof bruto === "object" ? bruto : {};
  const limpar = (m) => {
    if (!m || typeof m !== "object") return null;
    const ticker = typeof m.ticker === "string" ? m.ticker.trim() : "";
    if (!ticker) return null;
    const tempo = typeof m.tempo === "string" && m.tempo ? m.tempo : null;
    return tempo ? { ticker, tempo } : { ticker };
  };

  const extras = (Array.isArray(b.extras) ? b.extras : [])
    .map(limpar)
    .filter(Boolean)
    .slice(0, MAX_EXTRAS);

  // O tempo da principal é guardado sozinho porque o ticker dela vem da
  // URL, não daqui.
  const tempoPrincipal = typeof b.tempoPrincipal === "string" && b.tempoPrincipal
    ? b.tempoPrincipal
    : null;

  // A aba ativa só existe no celular, e só pode apontar pra uma mesa que
  // exista: 0 é a principal, 1..N são as extras.
  const ativa = Number.isInteger(b.ativa) && b.ativa >= 0 && b.ativa <= extras.length
    ? b.ativa
    : 0;

  return { extras, tempoPrincipal, ativa };
}

/** Vale a pena guardar? Bancada de uma mesa no tempo padrão não é bancada. */
export function temAlgoAGuardar(sessao) {
  const s = normalizarSessao(sessao);
  return s.extras.length > 0 || s.tempoPrincipal !== null;
}

/**
 * A bancada desta conta, ou null quando não há nada guardado.
 *
 * Devolver null (e não uma bancada vazia) importa: quem chamou fica com o
 * que já está na tela em vez de ver as mesas sumirem assim que a sessão
 * do Supabase resolve.
 */
export async function carregarSessao(userId) {
  if (!userId) return null;
  try {
    const supabase = await cliente();
    const { data, error } = await supabase
      .from("sessao_telas").select("telas").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const guardado = data?.telas;
    if (!guardado || Object.keys(guardado).length === 0) return null;
    const sessao = normalizarSessao(guardado);
    return temAlgoAGuardar(sessao) ? sessao : null;
  } catch {
    return null;
  }
}

/** Grava a bancada. Devolve false quando não deu (e ninguém se importa). */
export async function salvarSessao(userId, sessao) {
  if (!userId) return false;
  try {
    const supabase = await cliente();
    const { error } = await supabase
      .from("sessao_telas")
      .upsert({ user_id: userId, telas: normalizarSessao(sessao) }, { onConflict: "user_id" });
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/**
 * Apaga a bancada guardada.
 *
 * Fechar a última mesa extra e voltar ao tempo padrão é desmontar a
 * bancada — e desmontada ela não deve ressuscitar no próximo F5. Sair da
 * conta NÃO apaga: quem volta encontra tudo onde deixou.
 */
export async function apagarSessao(userId) {
  if (!userId) return false;
  try {
    const supabase = await cliente();
    const { error } = await supabase.from("sessao_telas").delete().eq("user_id", userId);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
