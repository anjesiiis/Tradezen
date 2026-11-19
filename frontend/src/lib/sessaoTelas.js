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

// O TETO DO MAIOR PLANO, não o do plano de quem está logado.
//
// Era 3 na mão, e isso vinha de quando o máximo era 4 telas. Com o admin
// em 12, cortar aqui faria a bancada guardar 3 extras e devolver 4 mesas
// no F5 — a pessoa montaria 12 e voltaria com 4, sem aviso. Quem corta
// pelo plano é `cortarExtras`, na hora de montar a tela; o armazenamento
// guarda tudo que o maior plano permite.
import { TETO_DE_TELAS } from "./limitesTelas.js";

export const MAX_EXTRAS = TETO_DE_TELAS - 1;

// ── A RESERVA NO NAVEGADOR ──────────────────────────────────
//
// Faltava, e a falta era o bug: a bancada ia SÓ pro banco, e a tabela
// `sessao_telas` não existe até a migration 022 rodar. Resultado prático:
// abrir dois ativos, dar F5 e voltar com um. Nada era guardado em lugar
// nenhum, e ninguém via erro, porque a função já engolia a falha.
//
// Agora o navegador guarda primeiro, síncrono, sem rede — igual aos
// desenhos (ver graficosSalvos.js). A conta continua sendo gravada
// depois, e é ela que faz a bancada atravessar de um aparelho pro outro.
// Em um aparelho só, o F5 passa a funcionar mesmo sem banco.
//
// A chave leva o userId porque duas contas no mesmo navegador não podem
// herdar a bancada uma da outra.
const CHAVE = (userId) => `tradezen:bancada:${userId}`;

/** Quando esta cópia foi gravada. Serve pra decidir quem ganha: a cópia
 *  do navegador ou a da conta. Sem isso, abrir num aparelho antigo
 *  reescreveria a bancada montada no aparelho de agora. */
const agora = () => Date.now();

export function lerBancadaLocal(userId) {
  if (!userId) return null;
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE(userId)) || "null");
    if (!bruto?.sessao) return null;
    const sessao = normalizarSessao(bruto.sessao);
    return temAlgoAGuardar(sessao) ? { sessao, em: Number(bruto.em) || 0 } : null;
  } catch {
    // Janela privada, dados bloqueados, JSON corrompido por versão antiga:
    // é como não ter nada guardado, e não motivo pra derrubar a tela.
    return null;
  }
}

export function gravarBancadaLocal(userId, sessao) {
  if (!userId) return false;
  try {
    const limpa = normalizarSessao(sessao);
    if (!temAlgoAGuardar(limpa)) {
      localStorage.removeItem(CHAVE(userId));
      return true;
    }
    localStorage.setItem(CHAVE(userId), JSON.stringify({ sessao: limpa, em: agora() }));
    return true;
  } catch {
    return false;   // cota cheia: a conta ainda tenta
  }
}

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

  // O NAVEGADOR PRIMEIRO, e não como plano B: ele responde em zero
  // milissegundo e é o único que funciona enquanto a 022 não rodou. A
  // conta vem depois e só vence se for mais recente — é o que faz a
  // bancada montada no celular chegar ao desktop sem desfazer a que
  // você acabou de montar aqui.
  const local = lerBancadaLocal(userId);

  let daConta = null;
  let contaEm = 0;
  try {
    const supabase = await cliente();
    const { data, error } = await supabase
      .from("sessao_telas").select("telas,atualizado_em").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const guardado = data?.telas;
    if (guardado && Object.keys(guardado).length > 0) {
      const sessao = normalizarSessao(guardado);
      if (temAlgoAGuardar(sessao)) {
        daConta = sessao;
        contaEm = Date.parse(data?.atualizado_em || "") || 0;
      }
    }
  } catch {
    // Tabela ausente (022 não rodou), sessão vencida, rede fora: segue
    // com o que o navegador tem.
    daConta = null;
  }

  if (daConta && local) return contaEm > local.em ? daConta : local.sessao;
  return daConta || local?.sessao || null;
}

/** Grava a bancada. Devolve false quando não deu (e ninguém se importa). */
export async function salvarSessao(userId, sessao) {
  if (!userId) return false;
  // Síncrono e primeiro: o F5 um segundo depois já encontra a bancada,
  // mesmo que a gravação na conta ainda esteja no ar ou vá falhar.
  gravarBancadaLocal(userId, sessao);
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
  // Apaga as DUAS cópias: se só a da conta sumisse, o próximo F5
  // ressuscitaria do navegador a bancada que a pessoa acabou de desmontar.
  try { localStorage.removeItem(CHAVE(userId)); } catch { /* sem storage */ }
  try {
    const supabase = await cliente();
    const { error } = await supabase.from("sessao_telas").delete().eq("user_id", userId);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
