/**
 * TRADEZEN — QUALIDADE DA MARCAÇÃO
 * ================================
 *
 * Quão bom EXEMPLO DA FORMA é o desenho: de 1 a 5 estrelas, de
 * meia em meia (nove passos). Ver a seção A ESCALA abaixo.
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
 * informação ORDINAL fica nas ESTRELAS — quem não distingue os tons
 * conta 4 de 5 cheias e sabe o nível igual.
 */

// ── A ESCALA ──────────────────────────────────────────────────
//
// Nove passos, de 1 a 5 estrelas de meia em meia. Guardados no banco como
// SMALLINT de 0 a 8, não como 1.0–5.0 em decimal:
//
//   valor 0 1 2 3 4 5 6 7 8
//   ★     1 1,5 2 2,5 3 3,5 4 4,5 5
//
// Inteiro porque a coluna já era inteira, porque `order by` e `>= 6` são
// o que a tela e o treino fazem o tempo todo, e porque comparar decimal
// por igualdade (`qualidade === 3.5`) é pedir para um 3.4999 aparecer
// algum dia. A conta é `estrelas = valor / 2 + 1`, e `valor` par é nível
// com NOME.
//
// Os cinco nomes seguem exatamente onde estavam — a escala dobrou, não
// mudou de significado. Os valores antigos 0..4 viram 0,2,4,6,8 na
// migration 029, então quem tinha 3 estrelas continua com 3 estrelas.
//
// AS CORES são as variáveis do tema de admin (--up, --down, --text2,
// --text3 em theme.jsx), não uma paleta nova. Os meios-passos são a
// mistura dos vizinhos, o que mantém o degradê monótono do vermelho ao
// verde; a informação ORDINAL fica nas ESTRELAS, e quem não distingue os
// tons conta 4,5 de 5 e sabe o nível igual.

const VERDE = "var(--up)";
const VERMELHO = "var(--down)";
const mistura = (cor, pct) => `color-mix(in srgb, ${cor} ${pct}%, var(--text2))`;

export const NIVEIS = [
  {
    valor: 8, estrelas: 5, nome: "Ótimo", rotulo: "Ótimo", cor: VERDE,
    dica: "Exemplo de livro: a forma é inequívoca",
  },
  {
    valor: 7, estrelas: 4.5, nome: null, rotulo: "4,5", cor: mistura(VERDE, 78),
    dica: "Entre Alta e Ótimo: quase de livro, falta pouco",
  },
  {
    valor: 6, estrelas: 4, nome: "Alta", rotulo: "Alta", cor: mistura(VERDE, 55),
    dica: "Forma clara, com um detalhe fora do ideal",
  },
  {
    valor: 5, estrelas: 3.5, nome: null, rotulo: "3,5", cor: mistura(VERDE, 28),
    dica: "Entre Média e Alta: boa, mas a ressalva ainda pesa",
  },
  {
    valor: 4, estrelas: 3, nome: "Média", rotulo: "Média", cor: "var(--text3)",
    dica: "Dá pra reconhecer, mas tem ressalva",
  },
  {
    valor: 3, estrelas: 2.5, nome: null, rotulo: "2,5", cor: mistura(VERMELHO, 28),
    dica: "Entre Baixa e Média: reconhecível no limite",
  },
  {
    valor: 2, estrelas: 2, nome: "Baixa", rotulo: "Baixa", cor: mistura(VERMELHO, 55),
    dica: "Duvidoso: mais contra do que a favor",
  },
  {
    valor: 1, estrelas: 1.5, nome: null, rotulo: "1,5", cor: mistura(VERMELHO, 78),
    dica: "Entre Falha e Baixa: quase não é o padrão",
  },
  {
    // Avaliar o mínimo é dizer "não é o padrão", que é o que as tabelas
    // `*_fracasso` guardam. A dica aponta o passo seguinte em vez de a
    // tela mover sozinha: mover tiraria a marcação da lista sem pedido.
    valor: 0, estrelas: 1, nome: "Falha", rotulo: "Falha", cor: VERMELHO,
    dica: "Não é o padrão. Depois disto, mova para fracasso",
  },
];

export const TOTAL_DE_ESTRELAS = 5;

/** O maior valor que o banco aceita (ver a trava da migration 029). */
export const QUALIDADE_MAXIMA = 8;

/** Só os níveis com nome — os cinco de sempre, pra quem precisa agrupar. */
export const NIVEIS_COM_NOME = NIVEIS.filter((n) => n.nome !== null);

/** Quantas estrelas um valor vale: 1 a 5, de meia em meia.
 *
 *  Falha vale UMA estrela, não zero: zero estrela cheia é a aparência de
 *  "não avaliado", e os dois não podem ter o mesmo desenho — um é
 *  julgamento, o outro é a falta dele. */
export function estrelasCheias(valor) {
  return valor / 2 + 1;
}

/** "4,5" / "3" — como o número aparece escrito, com vírgula. */
export function estrelasEmTexto(valor) {
  return String(estrelasCheias(valor)).replace(".", ",");
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
//
// "Sem avaliação" é o PADRÃO ao abrir a lista: a tela nasce mostrando a
// fila de trabalho. Efeito colateral que vale saber: avaliar um card o
// faz sair da lista na hora, porque ele deixou de estar sem avaliação. O
// número no botão "Todas" continua dizendo o total.
export const FILTRO_QUALIDADE_PADRAO = "sem_nota";

// Com meia estrela, cada grupo passa a pegar TAMBÉM o meio-passo acima
// do seu nível nomeado — ou seja, agrupa-se pelo nome de baixo. "Ótimos e
// Alta" é q >= 6 (Alta, 4,5 e Ótimo), "Média" é 4 e 5, "Baixa e Falha" é
// 0 a 3. Os cinco botões e o que cada um quer dizer continuam os mesmos;
// só não há mais nota que fique fora de todos eles.
export const FILTROS_QUALIDADE = [
  { id: "todos", rotulo: "Todas", cabe: () => true },
  { id: "sem_nota", rotulo: "Sem avaliação", cabe: (q) => q === null },
  { id: "bons", rotulo: "Ótimos e Alta", cabe: (q) => q !== null && q >= 6 },
  { id: "media", rotulo: "Média", cabe: (q) => q === 4 || q === 5 },
  { id: "ruins", rotulo: "Baixa e Falha", cabe: (q) => q !== null && q <= 3 },
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

/**
 * `manter` é a correção de um erro de projeto meu.
 *
 * O filtro padrão é "Sem avaliação", a fila de quem senta pra avaliar. Só
 * que dar uma nota tira o card desse filtro NO MESMO INSTANTE: ele
 * desaparece da lista antes de a pessoa ver o selo mudar. Eu tinha
 * anotado isso como "efeito colateral aceito" — e o efeito foi o dono do
 * projeto concluir, com razão, que a nota não estava sendo salva.
 *
 * Os ids em `manter` ficam na lista mesmo não cabendo no filtro: quem
 * avaliou vê o selo virar ★★★★★ Ótimo na hora, no lugar onde estava.
 */
export function filtrarPorQualidade(templates, mapa, filtroId, manter = null) {
  const filtro = FILTROS_QUALIDADE.find((f) => f.id === filtroId);
  if (!filtro || filtro.id === "todos") return templates || [];
  return (templates || []).filter(
    (t) => filtro.cabe(qualidadeDe(mapa, t?.id)) || !!manter?.has(String(t?.id)),
  );
}
