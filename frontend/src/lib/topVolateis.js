import { API } from "./api.js";

/**
 * TRADEZEN — OS MAIS VOLÁTEIS DO DIA
 * ==================================
 *
 * Volatilidade do dia = (máxima − mínima) ÷ abertura × 100. É a AMPLITUDE
 * do pregão, não a direção: um papel que abriu a 10, foi a 11, caiu a 9 e
 * fechou a 10 teve 20% de volatilidade e 0% de variação. É justamente
 * isso que interessa a quem procura movimento pra estudar.
 *
 * A conta é do backend (ver /mercados/top-volateis), que tem o catálogo e
 * o cache. Aqui só fica o que é da tela: que grupo cada ponto do globo
 * representa, e uma lembrança do que já foi buscado, pra reabrir o mesmo
 * ponto não esperar de novo pela rede.
 */

/** Qual universo cada ponto do globo representa. */
export function grupoDoPonto(ponto) {
  if (!ponto) return null;
  // Cripto e commodity dizem o próprio grupo: não dá pra deduzi-lo da
  // geografia, que é justamente o que eles não têm.
  if (ponto.categoria === "outro") return ponto.grupo || null;
  if (ponto.categoria === "moeda") return "forex";
  if (ponto.categoria === "acao") return ponto.praca === "B3" ? "b3" : "eua";
  if (ponto.categoria === "indice") {
    // Só B3 e EUA têm papéis no catálogo. Londres, Tóquio, Frankfurt e
    // Hong Kong não têm — e ranquear "os mais voláteis de Tóquio" com
    // ações americanas seria mentira, então esses pontos seguem sem a
    // lista, com o card que já tinham.
    if (ponto.indice === "^BVSP") return "b3";
    if (ponto.indice === "^GSPC") return "eua";
    return null;
  }
  return null;
}

/**
 * Qual universo cada pílula da busca representa.
 *
 * "Todos" fica de fora de propósito: juntar os seis rankings pediria seis
 * idas ao servidor pra montar uma lista que mistura cripto com ação, onde
 * a cripto ganha sempre (ela se mexe 5% num dia calmo). A visão geral
 * continua sendo a lista de destaques.
 */
export const GRUPO_DA_CATEGORIA = {
  acoes_br: "b3",
  acoes_eua: "eua",
  forex: "forex",
  cripto: "cripto",
  commodities: "commodity",
  indices: "indice",
};

const NOMES = {
  b3: "Ações da B3",
  eua: "Ações dos EUA",
  forex: "Moedas",
  cripto: "Criptomoedas",
  commodity: "Commodities",
  indice: "Índices",
};
export const nomeDoGrupo = (grupo) => NOMES[grupo] || grupo;

// Lembrança por grupo, só enquanto a aba está aberta. O backend já tem
// cache de 5 minutos; isto evita até a ida à rede quando se reabre o
// mesmo ponto, que é o caso comum (clicar, fechar, clicar de novo).
const VALIDADE_MS = 5 * 60 * 1000;
const lembrado = new Map();

/**
 * Quanto se espera pelo ranking antes de desistir.
 *
 * Oito segundos, e não três: o servidor dorme quando ninguém usa, e a
 * primeira requisição do dia paga esse despertar. Desistir cedo demais
 * trocaria uma espera por um erro em todo primeiro acesso. Quem desiste
 * cai na lista de destaques, que já está na tela — ninguém fica olhando
 * pra nada.
 */
export const ESPERA_MAX_MS = 8000;

export function esquecerTopVolateis() {
  lembrado.clear();
}

/** @returns {Promise<{top:Array, pregao:string, formula:string}>} */
export async function buscarTopVolateis(grupo, limite = 5) {
  if (!grupo) return { top: [], pregao: "", formula: "" };

  const chave = `${grupo}:${limite}`;
  const guardado = lembrado.get(chave);
  if (guardado && Date.now() - guardado.quando < VALIDADE_MS) return guardado.dado;

  // Timeout na marra: `fetch` não tem um. Sem isto, um servidor que
  // demora a responder (ou que não responde) deixava a busca em
  // "Medindo o pregão…" PARA SEMPRE — medido em produção, 70 segundos
  // sem resposta e o aviso ainda na tela. Esperar é aceitável; esperar
  // sem fim não é.
  const freio = new AbortController();
  const corte = setTimeout(() => freio.abort(), ESPERA_MAX_MS);
  let bruto;
  try {
    const resposta = await fetch(
      `${API}/mercados/top-volateis/${grupo}?limite=${limite}`,
      { signal: freio.signal },
    );
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    bruto = await resposta.json();
  } finally {
    clearTimeout(corte);
  }

  const dado = {
    top: Array.isArray(bruto?.top) ? bruto.top : [],
    pregao: bruto?.pregao || "",
    formula: bruto?.formula || "",
  };
  lembrado.set(chave, { dado, quando: Date.now() });
  return dado;
}

/**
 * O pregão medido é o de hoje?
 *
 * Serve pra dizer à pessoa que o número é do último dia em que o mercado
 * abriu, e não de agora — de madrugada, no fim de semana e em feriado a
 * diferença importa. Cripto e moeda não fecham, então a pergunta não se
 * aplica a eles.
 */
export function pregaoEhDeHoje(pregao, agora = new Date()) {
  if (!pregao) return true;
  const dia = String(pregao).slice(0, 10);
  const hoje = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
  return dia === hoje;
}

/** Grupos que não fecham — não faz sentido avisar "mercado fechado" neles. */
const SEMPRE_ABERTOS = new Set(["cripto", "forex"]);
export const grupoFecha = (grupo) => !SEMPRE_ABERTOS.has(grupo);

/** O preço com o símbolo da moeda que o backend informou. */
export function precoComMoeda(preco, moeda) {
  if (typeof preco !== "number" || !Number.isFinite(preco)) return "—";
  const simbolo = { BRL: "R$", USD: "US$", EUR: "€", GBP: "£" }[moeda] || "";
  // Centavo não diz nada num par de moedas que anda na quarta casa, nem
  // numa cripto de fração de centavo.
  const casas = Math.abs(preco) < 1 ? 4 : 2;
  const numero = preco.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return simbolo ? `${simbolo} ${numero}` : numero;
}

/** PETR4.SA → PETR4, AUDCAD=X → AUDCAD, ALGO-USD → ALGO. */
export function simboloCurto(ativo) {
  const bruto = ativo?.simbolo || ativo?.ticker || "";
  return bruto.replace(/\.SA$/, "").replace(/=X$/, "").replace(/=F$/, "").replace(/-USD$/, "");
}
