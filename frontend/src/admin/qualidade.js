/**
 * TRADEZEN — QUALIDADE DA MARCAÇÃO
 * ================================
 *
 * Quão bom EXEMPLO DA FORMA é o desenho, de 0 a 4.
 *
 * NÃO é o `resultado`. São eixos diferentes, e misturá-los corrompe dado:
 *   `resultado` → o DESFECHO (texto livre, digitado na tela de marcação)
 *   `qualidade` → quão bom exemplo da forma o desenho é
 * Um ombro-cabeça-ombro de livro que não andou é qualidade 4 com
 * resultado ruim. Derivar um do outro apagaria um dos dois.
 *
 * `null` é "ninguém avaliou", e é diferente de qualquer nota. Por isso o
 * seletor nasce sem nada aceso em vez de aceso no meio: nota que ninguém
 * deu, no treino, vale tanto quanto nota errada.
 *
 * AS CORES são as variáveis do tema de admin (--up, --down, --text2 em
 * theme.jsx), não uma paleta nova e nem as do app, que não existem
 * nestas telas. Só há um verde e um vermelho, e cinco níveis precisam de
 * cinco aparências: cada um se mistura com o cinza via color-mix, e a
 * informação ORDINAL fica nas bolinhas — quem não distingue os tons
 * conta 4 de 5 cheias e sabe o nível igual.
 */

export const NIVEIS = [
  {
    valor: 4, rotulo: "Ótimo", cor: "var(--up)",
    dica: "Exemplo de livro: a forma é inequívoca",
  },
  {
    valor: 3, rotulo: "Alta", cor: "color-mix(in srgb, var(--up) 55%, var(--text2))",
    dica: "Forma clara, com um detalhe fora do ideal",
  },
  {
    valor: 2, rotulo: "Média", cor: "var(--text3)",
    dica: "Dá pra reconhecer, mas tem ressalva",
  },
  {
    valor: 1, rotulo: "Baixa", cor: "color-mix(in srgb, var(--down) 55%, var(--text2))",
    dica: "Duvidoso: mais contra do que a favor",
  },
  {
    // Avaliar 0 é dizer "não é o padrão", que é o que as tabelas
    // `*_fracasso` guardam. A dica aponta o passo seguinte em vez de a
    // tela mover sozinha: mover tiraria a marcação da lista sem pedido.
    valor: 0, rotulo: "Falha", cor: "var(--down)",
    dica: "Não é o padrão. Depois disto, mova para fracasso",
  },
];

export const TOTAL_DE_BOLINHAS = NIVEIS.length;

/** Quantas bolinhas cheias um nível tem. Falha(0) tem uma, não zero:
 *  zero bolinha não se vê, e "não avaliado" já é a ausência do selo. */
export function bolinhasCheias(valor) {
  return valor + 1;
}

export function nivelDe(valor) {
  return NIVEIS.find((n) => n.valor === valor) || null;
}

/** A qualidade de um id, vinda do mapa do backend. `null` = não avaliado. */
export function qualidadeDe(mapa, id) {
  const v = mapa?.[String(id)]?.qualidade;
  return Number.isInteger(v) ? v : null;
}

/**
 * Clicar no nível que já está aceso desfaz a avaliação.
 *
 * Volta pra `null` (não avaliado) e não pra um nível vizinho: desfazer é
 * dizer "retiro meu julgamento", e trocar por outra nota seria inventar
 * uma opinião que ninguém deu.
 */
export function proximaQualidade(atual, clicado) {
  return atual === clicado ? null : clicado;
}

// Os filtros do topo, na ordem de quem está avaliando: primeiro o que
// falta. "Serve pro treino" é 3+ porque é a partir daí que o desenho
// representa a forma sem ressalva relevante.
export const FILTROS_QUALIDADE = [
  { id: "todos", rotulo: "Todas", cabe: () => true },
  { id: "sem_nota", rotulo: "Sem nota", cabe: (q) => q === null },
  { id: "bons", rotulo: "Ótimos e Alta", cabe: (q) => q === 4 || q === 3 },
  { id: "media", rotulo: "Média", cabe: (q) => q === 2 },
  { id: "ruins", rotulo: "Baixa e Falha", cabe: (q) => q === 1 || q === 0 },
];

export function contarPorQualidade(templates, mapa) {
  const contas = {};
  for (const f of FILTROS_QUALIDADE) contas[f.id] = 0;
  for (const t of templates || []) {
    const q = qualidadeDe(mapa, t?.id);
    for (const f of FILTROS_QUALIDADE) if (f.cabe(q)) contas[f.id] += 1;
  }
  return contas;
}

export function filtrarPorQualidade(templates, mapa, filtroId) {
  const filtro = FILTROS_QUALIDADE.find((f) => f.id === filtroId);
  if (!filtro || filtro.id === "todos") return templates || [];
  return (templates || []).filter((t) => filtro.cabe(qualidadeDe(mapa, t?.id)));
}
