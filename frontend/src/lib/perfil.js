/**
 * TRADEZEN — PERFIL DO USUÁRIO
 * ============================
 *
 * Nome, telefone e avatar. Regra pura e acesso ao Supabase, fora da tela,
 * pra poder testar sem montar formulário.
 *
 * O que o usuário pode mudar é só isto: `plano` é defendido por gatilho
 * no banco (ver backend/sql/018), então mandar plano daqui não adianta —
 * o banco devolve o valor antigo.
 */

/** Emojis do mercado, pra quem não quer mandar foto. */
export const EMOJIS = [
  { e: "🐂", nome: "Touro — mercado em alta" },
  { e: "🐻", nome: "Urso — mercado em baixa" },
  { e: "📈", nome: "Gráfico subindo" },
  { e: "📉", nome: "Gráfico descendo" },
  { e: "💰", nome: "Dinheiro" },
  { e: "💎", nome: "Diamante" },
  { e: "🚀", nome: "Foguete" },
  { e: "🎯", nome: "Alvo" },
  { e: "📊", nome: "Barras" },
  { e: "🔥", nome: "Fogo" },
  { e: "⚡", nome: "Raio" },
  { e: "🌙", nome: "Lua" },
  { e: "👑", nome: "Coroa" },
  { e: "🏆", nome: "Troféu" },
  { e: "🎲", nome: "Dado" },
];

export const NOME_MIN = 2;
export const NOME_MAX = 40;

/** Iniciais pro avatar de quem não escolheu emoji. */
export function iniciaisDoNome(nome = "", email = "") {
  const limpo = (nome || "").trim();
  if (limpo) {
    const partes = limpo.split(/\s+/);
    const duas = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].slice(0, 2);
    return duas.toUpperCase();
  }
  return (email || "?").slice(0, 2).toUpperCase();
}

/**
 * Telefone brasileiro, no formato (99) 99999-9999.
 *
 * Formata enquanto digita e nunca passa de 11 dígitos: assim o campo não
 * aceita um número impossível e a pessoa não descobre isso só ao salvar.
 */
export function formatarTelefone(valor = "") {
  const d = (valor || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Vazio é válido: telefone é opcional. Preenchido, precisa de 10 ou 11 dígitos. */
export function telefoneValido(valor = "") {
  const d = (valor || "").replace(/\D/g, "");
  return d.length === 0 || d.length === 10 || d.length === 11;
}

export function nomeValido(nome = "") {
  const n = (nome || "").trim().length;
  return n >= NOME_MIN && n <= NOME_MAX;
}

/** O que mostrar no avatar: o emoji escolhido, ou as iniciais. */
export function avatarDoPerfil(perfil = {}, email = "") {
  if (perfil.avatar_tipo === "emoji" && perfil.avatar_valor) {
    return { tipo: "emoji", valor: perfil.avatar_valor };
  }
  if (perfil.avatar_tipo === "upload" && perfil.avatar_valor) {
    return { tipo: "upload", valor: perfil.avatar_valor };
  }
  return { tipo: "iniciais", valor: iniciaisDoNome(perfil.nome, email) };
}

/** Só o que mudou — evita gravar campo que ninguém tocou. */
export function mudancas(original = {}, atual = {}) {
  const campos = ["nome", "telefone", "avatar_tipo", "avatar_valor"];
  const diff = {};
  for (const c of campos) {
    const a = original[c] ?? null;
    const b = atual[c] ?? null;
    if (a !== b) diff[c] = b;
  }
  return diff;
}

async function cliente() {
  const { supabase } = await import("./supabaseClient.js");
  return supabase;
}

/** Lê o perfil do usuário logado. Null quando não há sessão ou linha. */
export async function carregarPerfil(userId) {
  if (!userId) return null;
  try {
    const supabase = await cliente();
    const { data, error } = await supabase
      .from("profiles")
      .select("nome,telefone,avatar_tipo,avatar_valor,plano")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

/**
 * Grava as mudanças. Devolve {ok} ou {erro} com texto pronto pra tela.
 *
 * A coluna `plano` nem é enviada: quem decide plano é o backend, e o
 * banco ignoraria de qualquer jeito (gatilho da sql/018).
 */
export async function salvarPerfil(userId, dados) {
  if (!userId) return { erro: "Sessão expirada. Entre de novo." };
  const { plano, ...limpo } = dados || {};   // eslint-disable-line no-unused-vars
  if (Object.keys(limpo).length === 0) return { ok: true, semMudanca: true };
  try {
    const supabase = await cliente();
    const { error } = await supabase.from("profiles").update(limpo).eq("id", userId);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const texto = String(e?.message || e);
    if (/column .* does not exist|schema cache/i.test(texto)) {
      return { erro: "O banco ainda não tem os campos do perfil. Rode backend/sql/018_perfil_do_usuario.sql no Supabase." };
    }
    return { erro: `Não foi possível salvar: ${texto}` };
  }
}
