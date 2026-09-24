// ── PADRÕES DE CONTINUAÇÃO — 8 pontos em 4 PARES ──────────────
// Vale pros quatro: Bandeira de Alta/Baixa e Flâmula de Alta/Baixa. Todos
// têm a mesma estrutura — um mastro, uma consolidação com duas bordas e o
// mastro seguinte — e mudam só o desenho da consolidação (bandeira =
// retângulo inclinado, flâmula = triângulo que fecha) e a direção.
//
// Cada par são 2 cliques e vira uma linha própria. Os pares são
// INDEPENDENTES: os pontos podem se tocar, coincidir ou cair dentro do
// trecho de outro par — é o caso normal, já que o início do Mastro 2 é o
// fundo da consolidação, ou seja, fica dentro dela. Por isso nada que
// compare um par com outro bloqueia o salvamento; no máximo vira aviso.

// Cores do design system (CLAUDE.md)
export const VERDE = "#26a69a";
export const AZUL = "#2962ff";
export const VERMELHO = "#ef5350";

// Os 8 pontos usam as MESMAS chaves nos quatro padrões — o que muda é o
// rótulo na tela. Assim o backend, o banco e o desenho no gráfico tratam
// todos do mesmo jeito.
export const PASSOS_PARES = [
  "p1_inicio_mastro1", "p2_topo_mastro1",
  "p3_inicio_fundo", "p4_fim_fundo",
  "p5_inicio_topo", "p6_fim_topo",
  "p7_inicio_mastro2", "p8_topo_mastro2",
];

export const PADROES = {
  bandeira_alta:  { id: "bandeira_alta",  rotulo: "Bandeira de Alta",  forma: "bandeira", alta: true,  nav: "bandeira-alta",  rota: "/admin/templates/bandeira-alta" },
  bandeira_baixa: { id: "bandeira_baixa", rotulo: "Bandeira de Baixa", forma: "bandeira", alta: false, nav: "bandeira-baixa", rota: "/admin/templates/bandeira-baixa" },
  flamula_alta:   { id: "flamula_alta",   rotulo: "Flâmula de Alta",   forma: "flamula",  alta: true,  nav: "flamula-alta",   rota: "/admin/templates/flamula-alta" },
  flamula_baixa:  { id: "flamula_baixa",  rotulo: "Flâmula de Baixa",  forma: "flamula",  alta: false, nav: "flamula-baixa",  rota: "/admin/templates/flamula-baixa" },
};

const NOME_FORMA = { bandeira: "Bandeira", flamula: "Flâmula" };

// Os 4 pares, já com os rótulos do padrão escolhido
export function paresDoPadrao(padrao) {
  const { forma, alta } = padrao;
  const corMastro = alta ? VERDE : VERMELHO;
  const nome = NOME_FORMA[forma];
  const ponta = alta ? "Topo" : "Fundo";

  return [
    {
      id: "mastro1", rotulo: "Mastro 1", cor: corMastro, largura: 2, tracejada: false,
      de: "p1_inicio_mastro1", ate: "p2_topo_mastro1",
      rotuloDe: "Início Mastro 1", rotuloAte: `${ponta} Mastro 1`,
    },
    {
      id: "fundo", rotulo: `Fundo da ${nome}`, cor: AZUL, largura: 1.5, tracejada: true,
      de: "p3_inicio_fundo", ate: "p4_fim_fundo",
      rotuloDe: `Início Fundo ${nome}`, rotuloAte: `Fim Fundo ${nome}`,
    },
    {
      id: "topo", rotulo: `Topo da ${nome}`, cor: AZUL, largura: 1.5, tracejada: true,
      de: "p5_inicio_topo", ate: "p6_fim_topo",
      rotuloDe: `Início Topo ${nome}`, rotuloAte: `Fim Topo ${nome}`,
    },
    {
      id: "mastro2", rotulo: "Mastro 2", cor: corMastro, largura: 2, tracejada: false,
      de: "p7_inicio_mastro2", ate: "p8_topo_mastro2",
      rotuloDe: "Início Mastro 2", rotuloAte: `${ponta} Mastro 2`,
    },
  ];
}

export function stepsDoPadrao(padrao) {
  return paresDoPadrao(padrao).flatMap((par, iPar) => [
    { key: par.de,  label: par.rotuloDe,  short: `P${iPar * 2 + 1}`, color: par.cor, par: par.id },
    { key: par.ate, label: par.rotuloAte, short: `P${iPar * 2 + 2}`, color: par.cor, par: par.id },
  ]);
}

export function temFormatoPares(pontos) {
  return Boolean(pontos) && PASSOS_PARES.every((k) => pontos[k]);
}

// Uma linha por par COMPLETO — aparece assim que os 2 cliques daquele par
// acontecem, sem depender dos outros pares.
export function linhasDoPadrao(pontos, padrao) {
  if (!pontos) return [];
  return paresDoPadrao(padrao)
    .filter((par) => pontos[par.de] && pontos[par.ate])
    .map((par) => ({
      id: par.id,
      cor: par.cor,
      largura: par.largura,
      tracejada: par.tracejada,
      dados: [
        { i: pontos[par.de].i, preco: pontos[par.de].preco },
        { i: pontos[par.ate].i, preco: pontos[par.ate].preco },
      ],
    }));
}

// ── Validações que BLOQUEIAM o salvamento ─────────────────────
// Só o que tornaria a marcação impossível de ler: os 8 pontos, a ordem
// dentro de cada par e a direção dos dois mastros. Nada entre pares.
export function validarPadrao(pontos, padrao) {
  if (!temFormatoPares(pontos)) return ["Marque os 8 pontos antes de salvar."];

  const p = Object.fromEntries(PASSOS_PARES.map((k) => [k, pontos[k]]));
  const pares = paresDoPadrao(padrao);
  const erros = [];

  for (const par of pares) {
    if (p[par.ate].i <= p[par.de].i) {
      erros.push(`${par.rotulo}: "${par.rotuloAte}" precisa vir depois de "${par.rotuloDe}" no tempo.`);
    }
  }

  const contraMao = padrao.alta
    ? (a, b) => b.preco <= a.preco
    : (a, b) => b.preco >= a.preco;
  const sentido = padrao.alta ? "acima" : "abaixo";
  const movimento = padrao.alta ? "subida" : "queda";

  for (const par of [pares[0], pares[3]]) {
    if (contraMao(p[par.de], p[par.ate])) {
      erros.push(`${par.rotulo}: "${par.rotuloAte}" precisa estar ${sentido} de "${par.rotuloDe}" — o mastro é uma ${movimento}.`);
    }
  }

  return erros;
}

// ── Avisos (amarelos, NÃO bloqueiam) ──────────────────────────
export function avisosDoPadrao(pontos, padrao) {
  if (!temFormatoPares(pontos)) return [];
  const p = Object.fromEntries(PASSOS_PARES.map((k) => [k, pontos[k]]));
  const pares = paresDoPadrao(padrao);
  const avisos = [];

  // A consolidação costuma começar depois do mastro 1 — mas marcar antes
  // não é impossível (o analista pode estar pegando uma faixa mais larga).
  if (p.p3_inicio_fundo.i <= p.p1_inicio_mastro1.i) {
    avisos.push(`Confira: "${pares[1].rotuloDe}" está antes de "Início Mastro 1".`);
  }

  // Flâmula é um TRIÂNGULO: as duas bordas têm que se aproximar. Se a
  // distância no fim não for menor que no começo, provavelmente é bandeira.
  if (padrao.forma === "flamula") {
    const aberturaInicio = Math.abs(p.p5_inicio_topo.preco - p.p3_inicio_fundo.preco);
    const aberturaFim = Math.abs(p.p6_fim_topo.preco - p.p4_fim_fundo.preco);
    if (aberturaFim >= aberturaInicio) {
      avisos.push("Confira: as bordas da flâmula não estão se fechando — numa flâmula elas convergem (triângulo). Se ficarem paralelas, o padrão é bandeira.");
    }
  }

  return avisos;
}

// Medidas que o ML usa (mesmas contas das colunas geradas no Supabase —
// ver sql/008 e sql/009)
export function medidasDoPadrao(pontos) {
  if (!temFormatoPares(pontos)) return null;
  return {
    altura_mastro1: pontos.p2_topo_mastro1.preco - pontos.p1_inicio_mastro1.preco,
    altura_mastro2: pontos.p8_topo_mastro2.preco - pontos.p7_inicio_mastro2.preco,
  };
}

// ── Formatos antigos (templates salvos antes) ─────────────────
// 1) 6 pontos encadeados em ordem cronológica (mastro → consolidação →
//    rompimento);
// 2) 6 pontos "por função" (mastro + 2 toques no topo e 2 no fundo).
// Continuam abrindo e sendo editados do jeito que foram marcados.
export const PASSOS_6 = [
  "p1_inicio_mastro", "p2_topo_mastro", "p3_fundo1", "p4_topo1", "p5_fundo2", "p6_rompimento",
];

export function temFormato6(pontos) {
  return Boolean(pontos) && PASSOS_6.every((k) => pontos[k]);
}

export function steps6(alta = true) {
  const corMastro = alta ? VERDE : VERMELHO;
  return [
    { key: "p1_inicio_mastro", label: "Início do Mastro", short: "P1", color: corMastro },
    { key: "p2_topo_mastro",   label: alta ? "Topo do Mastro" : "Fundo do Mastro", short: "P2", color: corMastro },
    { key: "p3_fundo1",        label: alta ? "Fundo 1" : "Topo 1", short: "P3", color: AZUL },
    { key: "p4_topo1",         label: alta ? "Topo 1" : "Fundo 1", short: "P4", color: AZUL },
    { key: "p5_fundo2",        label: alta ? "Fundo 2" : "Topo 2", short: "P5", color: AZUL },
    { key: "p6_rompimento",    label: "Rompimento", short: "P6", color: corMastro },
  ];
}

// Preço da reta que passa por dois pontos, no índice `i` (extrapola).
export function precoNaReta(a, b, i) {
  if (!a || !b) return null;
  if (b.i === a.i) return a.preco;
  return a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i);
}

export function linhas6(pontos, candles, { alta = true } = {}) {
  if (!temFormato6(pontos)) return [];
  const { p1_inicio_mastro: p1, p2_topo_mastro: p2, p3_fundo1: p3, p4_topo1: p4, p5_fundo2: p5, p6_rompimento: p6 } = pontos;
  const corMastro = alta ? VERDE : VERMELHO;
  const ultimo = Math.max(0, (candles?.length || 0) - 1);
  const passo = Math.max(1, p2.i - p1.i);
  const iAlvo = candles?.length ? Math.min(p6.i + passo, ultimo) : p6.i + passo;

  return [
    { id: "mastro", cor: corMastro, largura: 2, tracejada: false, dados: [{ i: p1.i, preco: p1.preco }, { i: p2.i, preco: p2.preco }] },
    { id: "canal_superior", cor: AZUL, largura: 1, tracejada: true, dados: [{ i: p2.i, preco: p2.preco }, { i: p6.i, preco: precoNaReta(p2, p4, p6.i) }] },
    { id: "canal_inferior", cor: AZUL, largura: 1, tracejada: true, dados: [{ i: p3.i, preco: p3.preco }, { i: p6.i, preco: precoNaReta(p3, p5, p6.i) }] },
    { id: "alvo", cor: corMastro, largura: 2, tracejada: false, dados: [{ i: p6.i, preco: p6.preco }, { i: iAlvo, preco: p6.preco + (p2.preco - p1.preco) }] },
  ];
}

export const LINE_PAIRS_LEGADO = [["mastro_inicio", "mastro_fim"], ["topo1", "topo2"], ["fundo1", "fundo2"]];

export function stepsLegado() {
  return [
    { key: "mastro_inicio", label: "Início do Mastro", short: "M1", color: "#3D7EFF" },
    { key: "mastro_fim",    label: "Fim do Mastro",    short: "M2", color: "#3D7EFF" },
    { key: "topo1",         label: "Topo 1 (canal)",   short: "T1", color: "#00D68F" },
    { key: "topo2",         label: "Topo 2 (canal)",   short: "T2", color: "#00D68F" },
    { key: "fundo1",        label: "Fundo 1 (canal)",  short: "F1", color: "#FF4560" },
    { key: "fundo2",        label: "Fundo 2 (canal)",  short: "F2", color: "#FF4560" },
  ];
}

// Qual configuração usar pra abrir um template já salvo
// Pares de pontos que formam cada linha — é o que permite arrastar a linha
// inteira (as duas pontas juntas) no gráfico de marcação.
export function paresDeLinha(padrao) {
  return paresDoPadrao(padrao).map((par) => [par.de, par.ate]);
}

export function configDoTemplate(pontos, padrao) {
  if (temFormatoPares(pontos)) {
    return {
      steps: stepsDoPadrao(padrao),
      linhas: (p) => linhasDoPadrao(p, padrao),
      linePairs: [],
      pares: paresDeLinha(padrao),
    };
  }
  if (temFormato6(pontos)) {
    // Formato antigo: as linhas são calculadas (canal esticado, alvo
    // projetado), então só os pontos são arrastáveis — não faz sentido
    // arrastar uma linha que é resultado de conta.
    return {
      steps: steps6(padrao.alta),
      linhas: (p, candles) => linhas6(p, candles, { alta: padrao.alta }),
      linePairs: [],
      pares: [],
    };
  }
  return { steps: stepsLegado(), linhas: undefined, linePairs: LINE_PAIRS_LEGADO, pares: LINE_PAIRS_LEGADO };
}
