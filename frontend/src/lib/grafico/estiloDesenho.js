/**
 * TRADEZEN — ESTILO DOS DESENHOS DO USUÁRIO
 * =========================================
 *
 * Cor, espessura, traço e (no texto) fonte de cada ferramenta. Regra pura:
 * não toca em canvas, storage nem React, então dá pra testar o que cada
 * ferramenta herda sem montar tela nenhuma.
 *
 * O estilo é copiado PRA DENTRO do desenho no momento em que ele nasce
 * (ver CandleChart). É de propósito: trocar a cor padrão não repinta o
 * que já está no gráfico — quem desenhou um suporte em vermelho ontem
 * espera encontrá-lo vermelho hoje.
 */

/** As 8 cores do seletor. A 9ª é a que a pessoa escolher no conta-gotas. */
export const CORES_DESENHO = [
  { nome: "Azul",     valor: "#4F8AE8" },
  { nome: "Verde",    valor: "#26C77B" },
  { nome: "Vermelho", valor: "#E85D5D" },
  { nome: "Amarelo",  valor: "#F5B14C" },
  { nome: "Roxo",     valor: "#B064F0" },
  { nome: "Ciano",    valor: "#4ECDC4" },
  { nome: "Branco",   valor: "#E8EBF2" },
  { nome: "Rosa",     valor: "#FF6B9D" },
];

export const ESPESSURAS = [1, 2, 3, 4];

/** Traço → o padrão de risquinhos do canvas. */
export const TRACOS = {
  solido:      [],
  tracejado:   [6, 4],
  pontilhado:  [2, 4],
};

export const FONTES = [
  { nome: "Inter",          valor: "Inter, sans-serif" },
  { nome: "Georgia",        valor: "Georgia, serif" },
  { nome: "Courier",        valor: "'Courier New', monospace" },
  { nome: "Helvetica",      valor: "Helvetica, Arial, sans-serif" },
  { nome: "Arial",          valor: "Arial, sans-serif" },
  { nome: "JetBrains Mono", valor: "'JetBrains Mono', monospace" },
];

export const TAMANHOS = [12, 14, 16, 20, 24, 32];

/** Níveis que o Fibonacci PODE mostrar. Quais aparecem é escolha de quem usa. */
export const FIBO_NIVEIS_DISPONIVEIS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// 0% e 100% são as pontas do movimento: sem elas o desenho perde a
// referência do que está sendo medido, então não entram no seletor.
export const FIBO_NIVEIS_FIXOS = [0, 1];

/**
 * O estilo com que cada ferramenta nasce.
 *
 * O Fibonacci nasce branco por pedido do dono: ele desenha SETE linhas de
 * uma vez, e em cor forte competia com os candles em vez de servir de
 * régua por trás deles.
 */
export const ESTILO_PADRAO = {
  trend:               { cor: "#4F8AE8", espessura: 2, traco: "solido" },
  canal:               { cor: "#F5B14C", espessura: 2, traco: "solido" },
  retangulo_desenho:   { cor: "#26C77B", espessura: 1, traco: "tracejado" },
  fibo:                { cor: "#E8EBF2", espessura: 1, traco: "solido", niveis: FIBO_NIVEIS_DISPONIVEIS },
  horizontal:          { cor: "#E85D5D", espessura: 1, traco: "tracejado" },
  texto:               { cor: "#E8EBF2", fonte: "Inter, sans-serif", tamanho: 14, negrito: false, italico: false },
};

/** As ferramentas que o painel de personalização atende. */
export const FERRAMENTAS_PERSONALIZAVEIS = Object.keys(ESTILO_PADRAO);

const ROTULOS = {
  trend: "Linha de tendência",
  canal: "Canal paralelo",
  retangulo_desenho: "Retângulo",
  fibo: "Fibonacci",
  horizontal: "Linha horizontal",
  texto: "Texto",
};
export const rotuloDaFerramenta = (tipo) => ROTULOS[tipo] || tipo;

/**
 * Completa o que faltar com o padrão da ferramenta.
 *
 * Desenho salvo antes desta tela existir não tem campo de estilo nenhum —
 * cai inteiro no padrão, que é como ele já era desenhado. Campo solto com
 * valor estranho (veio de outra versão, ou de um banco editado à mão)
 * também volta pro padrão, em vez de pintar nada.
 */
export function normalizarEstilo(tipo, bruto) {
  const base = ESTILO_PADRAO[tipo] || ESTILO_PADRAO.trend;
  const e = bruto && typeof bruto === "object" ? bruto : {};
  const saida = { ...base };

  if (typeof e.cor === "string" && /^#[0-9a-f]{3,8}$/i.test(e.cor)) saida.cor = e.cor;
  if (ESPESSURAS.includes(Number(e.espessura))) saida.espessura = Number(e.espessura);
  if (Object.prototype.hasOwnProperty.call(TRACOS, e.traco)) saida.traco = e.traco;

  if (tipo === "texto") {
    if (FONTES.some((f) => f.valor === e.fonte)) saida.fonte = e.fonte;
    if (TAMANHOS.includes(Number(e.tamanho))) saida.tamanho = Number(e.tamanho);
    if (typeof e.negrito === "boolean") saida.negrito = e.negrito;
    if (typeof e.italico === "boolean") saida.italico = e.italico;
  }

  if (tipo === "fibo") saida.niveis = normalizarNiveisFibo(e.niveis);
  return saida;
}

/**
 * A lista de níveis do Fibonacci, limpa.
 *
 * Sempre em ordem e sem repetição, e 0%/100% entram de volta mesmo que
 * alguém os tenha tirado: são as pontas do movimento medido.
 */
export function normalizarNiveisFibo(lista) {
  if (!Array.isArray(lista)) return [...FIBO_NIVEIS_DISPONIVEIS];
  const pedidos = lista.map(Number).filter((n) => FIBO_NIVEIS_DISPONIVEIS.includes(n));
  const todos = new Set([...pedidos, ...FIBO_NIVEIS_FIXOS]);
  return FIBO_NIVEIS_DISPONIVEIS.filter((n) => todos.has(n));
}

/** Todas as preferências de uma vez, cada ferramenta completada. */
export function normalizarPreferencias(bruto) {
  const saida = {};
  for (const tipo of FERRAMENTAS_PERSONALIZAVEIS) {
    saida[tipo] = normalizarEstilo(tipo, bruto?.[tipo]);
  }
  return saida;
}

/** A fonte pronta pro canvas, montada a partir do estilo do texto. */
export function fonteDoCanvas(estilo) {
  const e = normalizarEstilo("texto", estilo);
  const peso = e.negrito ? "700" : "400";
  const estiloFonte = e.italico ? "italic " : "";
  return `${estiloFonte}${peso} ${e.tamanho}px ${e.fonte}`;
}
