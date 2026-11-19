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

/**
 * Por que a falha precisa ter MOTIVO.
 *
 * Isto devolvia `false` e engolia o erro num `catch` vazio. A tela então
 * só podia dizer "Não salvou na conta" — frase que não diz a causa, não
 * diz o que fazer, e não diz a coisa mais importante: que o trabalho
 * está salvo no navegador e não se perdeu.
 *
 * E a causa, no caso real deste projeto, era uma frase só: a tabela
 * `graficos_usuario` não existe no Supabase, porque a migration 020
 * nunca foi rodada. O erro vinha com o código PGRST205 e o nome da
 * tabela dentro, e o `catch` vazio jogava isso fora.
 */
export function motivoDaFalha(erro) {
  const texto = String(erro?.message || erro || "");
  const codigo = erro?.code || "";

  // Tabela inexistente: migration não rodada. É acionável e específico.
  if (codigo === "PGRST205" || /Could not find the table/i.test(texto)) {
    return {
      tipo: "tabela",
      // O NOME DA TABELA VAI JUNTO, e não só o do arquivo: eles são
      // diferentes (arquivo 020_graficos_do_usuario.sql, tabela
      // `graficos_usuario`, sem o "do"), e citar só o arquivo já levou a
      // criarem uma tabela com o nome errado — que o app não lê, e o
      // aviso continuaria aparecendo.
      texto: "O lugar onde seus gráficos ficam guardados ainda não existe "
        + "no banco: falta a tabela `graficos_usuario`. Rode "
        + "backend/sql/020_graficos_do_usuario.sql no SQL Editor do Supabase.",
    };
  }
  if (codigo === "42501" || /row-level security|permission denied/i.test(texto)) {
    return { tipo: "permissao", texto: "Você não tem permissão para gravar aqui." };
  }
  if (/jwt|token|expired|not authenticated/i.test(texto)) {
    return { tipo: "sessao", texto: "Sua sessão expirou. Entre de novo para voltar a salvar na conta." };
  }
  // `fetch` que não completa: "Load failed" no Safari, "Failed to fetch"
  // no Chrome. Nenhuma das duas serve de recado.
  if (/load failed|failed to fetch|network/i.test(texto)) {
    return { tipo: "rede", texto: "Sem conexão com o servidor. Salvaremos na conta quando a conexão voltar." };
  }
  if (/5\d\d/.test(String(erro?.status || "")) || /internal|unavailable/i.test(texto)) {
    return { tipo: "servidor", texto: "O servidor está instável. Vamos tentar de novo sozinhos." };
  }
  return { tipo: "desconhecido", texto: texto || "Não deu pra gravar na conta." };
}

/**
 * Grava a configuração de UM ativo.
 *
 * Devolve `{ ok: true }` ou `{ ok: false, motivo }`. Não devolve mais
 * booleano: quem chama precisa do motivo pra decidir se vale tentar de
 * novo (rede, servidor) ou se insistir é inútil (tabela não existe).
 */
export async function salvarNaConta(userId, ticker, config) {
  if (!userId || !ticker) {
    return { ok: false, motivo: { tipo: "sem_conta", texto: "Sem conta conectada." } };
  }
  try {
    const supabase = await cliente();
    // upsert pela chave (user_id, ticker): a mesma pessoa no mesmo ativo
    // tem uma linha só, que vai sendo reescrita.
    const { error } = await supabase
      .from("graficos_usuario")
      .upsert({ user_id: userId, ticker, config }, { onConflict: "user_id,ticker" });
    if (error) throw error;
    return { ok: true };
  } catch (erro) {
    return { ok: false, motivo: motivoDaFalha(erro), erro };
  }
}

/** Vale tentar de novo? Tabela que não existe e sessão vencida não se
 *  resolvem esperando — insistir só gastaria pedido e tempo. */
export function valeTentarDeNovo(motivo) {
  return ["rede", "servidor", "desconhecido"].includes(motivo?.tipo);
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
