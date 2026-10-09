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

import {
  PADROES_CANAL, areasDoCanal, avisosDoCanal, configDoCanal, ehCanal,
  linhasDoCanal, stepsDoCanal, temFormatoCanal, validarCanal,
} from "./canal.js";
import {
  PADROES_EXTRAS, areasExtras, avisosExtras, ehExtra, linhasExtras,
  siglaExtra, stepsExtras, temFormatoExtra, validarExtra,
} from "./padroesExtras.js";

// Dois outros formatos têm regras próprias: o canal (6 pontos em duas
// linhas de toque), em canal.js, e os oito padrões de reversão e
// consolidação, em padroesExtras.js.
// As funções daqui apenas encaminham quando o padrão é um canal, pra quem
// chama (PainelMarcacao) continuar tratando todos os padrões igual.

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
  cunha_alta:     { id: "cunha_alta",     rotulo: "Cunha de Alta",     forma: "cunha",    alta: true,  nav: "cunha-alta",     rota: "/admin/templates/cunha-alta" },
  cunha_baixa:    { id: "cunha_baixa",    rotulo: "Cunha de Baixa",    forma: "cunha",    alta: false, nav: "cunha-baixa",    rota: "/admin/templates/cunha-baixa" },
  ...PADROES_CANAL,
  ...PADROES_EXTRAS,
};

const NOME_FORMA = { bandeira: "Bandeira", flamula: "Flâmula", cunha: "Cunha" };

// Abreviação usada nos marcadores cinzas dos templates já salvos (ver
// PainelMarcacao): 3 letras, que é o que cabe num marcador do gráfico.
export const SIGLA_FORMA = { bandeira: "BAN", flamula: "FLA", cunha: "CUN", canal: "CAN" };

export function siglaDoPadrao(id) {
  if (PADROES_EXTRAS[id]) return siglaExtra(id);
  return SIGLA_FORMA[PADROES[id]?.forma] || "???";
}

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
  if (ehExtra(padrao)) return stepsExtras(padrao);
  if (ehCanal(padrao)) return stepsDoCanal(padrao);
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
  if (ehExtra(padrao)) return linhasExtras(pontos, padrao);
  if (ehCanal(padrao)) return linhasDoCanal(pontos);
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
/**
 * Deixa cada par em ordem: a ponta que está mais à esquerda no gráfico
 * vira o "início" e a outra, o "fim".
 *
 * Uma linha não se importa com a ordem dos cliques — marcar a ponta
 * direita primeiro desenha a mesma linha. Antes disso aqui, porém, a
 * validação reclamava ("Fim Topo Bandeira precisa vir depois de Início
 * Topo Bandeira") de uma marcação que estava visualmente correta. Agora a
 * ordem dos cliques deixou de importar; o que importa é as duas pontas
 * estarem em candles diferentes.
 */
export function normalizarPares(pontos, padrao) {
  if (!pontos || ehCanal(padrao) || ehExtra(padrao)) return pontos;
  const ajustado = { ...pontos };
  for (const par of paresDoPadrao(padrao)) {
    const de = ajustado[par.de];
    const ate = ajustado[par.ate];
    if (de && ate && ate.i < de.i) {
      ajustado[par.de] = ate;
      ajustado[par.ate] = de;
    }
  }
  return ajustado;
}

export function validarPadrao(pontos, padrao) {
  if (ehExtra(padrao)) return validarExtra(pontos, padrao);
  if (ehCanal(padrao)) return validarCanal(pontos, padrao);
  if (!temFormatoPares(pontos)) return ["Marque os 8 pontos antes de salvar."];

  const p = Object.fromEntries(PASSOS_PARES.map((k) => [k, normalizarPares(pontos, padrao)[k]]));
  const pares = paresDoPadrao(padrao);
  const erros = [];

  for (const par of pares) {
    // Só o empate bloqueia: duas pontas no mesmo candle não formam linha.
    // Ordem trocada não é erro — normalizarPares já endireitou.
    if (p[par.ate].i === p[par.de].i) {
      erros.push(`${par.rotulo}: "${par.rotuloDe}" e "${par.rotuloAte}" estão no mesmo candle — a linha precisa de dois candles diferentes.`);
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
  if (ehExtra(padrao)) return avisosExtras(pontos, padrao);
  if (ehCanal(padrao)) return avisosDoCanal(pontos);
  if (!temFormatoPares(pontos)) return [];
  const p = Object.fromEntries(PASSOS_PARES.map((k) => [k, pontos[k]]));
  const pares = paresDoPadrao(padrao);
  const avisos = [];

  // A consolidação costuma começar depois do mastro 1 — mas marcar antes
  // não é impossível (o analista pode estar pegando uma faixa mais larga).
  if (p.p3_inicio_fundo.i <= p.p1_inicio_mastro1.i) {
    avisos.push(`Confira: "${pares[1].rotuloDe}" está antes de "Início Mastro 1".`);
  }

  // Flâmula e cunha fecham (as bordas convergem). O que separa as duas é a
  // inclinação: na flâmula as bordas vão em sentidos opostos (triângulo
  // simétrico); na cunha as duas apontam para o mesmo lado.
  if (padrao.forma === "flamula" || padrao.forma === "cunha") {
    const aberturaInicio = Math.abs(p.p5_inicio_topo.preco - p.p3_inicio_fundo.preco);
    const aberturaFim = Math.abs(p.p6_fim_topo.preco - p.p4_fim_fundo.preco);
    const nome = NOME_FORMA[padrao.forma].toLowerCase();
    if (aberturaFim >= aberturaInicio) {
      avisos.push(`Confira: as bordas da ${nome} não estão se fechando — numa ${nome} elas convergem. Se ficarem paralelas, o padrão é bandeira.`);
    }

    const inclinaFundo = p.p4_fim_fundo.preco - p.p3_inicio_fundo.preco;
    const inclinaTopo = p.p6_fim_topo.preco - p.p5_inicio_topo.preco;
    const mesmoLado = inclinaFundo * inclinaTopo > 0;
    if (padrao.forma === "cunha" && !mesmoLado) {
      avisos.push("Confira: numa cunha as duas bordas inclinam para o mesmo lado. Com elas em sentidos opostos, o padrão é flâmula.");
    }
    if (padrao.forma === "flamula" && mesmoLado) {
      avisos.push("Confira: as duas bordas da flâmula estão inclinando para o mesmo lado — isso é uma cunha.");
    }
  }

  return avisos;
}

/**
 * Dá pra validar esses pontos com as regras deste padrão? Templates
 * salvos em formatos antigos passam longe das regras novas — abrir e
 * editar um deles não pode virar uma parede de erros.
 */
export function podeValidar(pontos, padrao) {
  if (ehExtra(padrao)) return temFormatoExtra(pontos, padrao);
  return ehCanal(padrao) ? temFormatoCanal(pontos) : temFormatoPares(pontos);
}

// Medidas que o ML usa (mesmas contas das colunas geradas no Supabase —
// ver sql/008 e sql/009)
/**
 * Padrões que o seletor do topo oferece: os que marcam EXATAMENTE os
 * mesmos pontos do atual.
 *
 * É o que permite perceber no meio da marcação que aquilo é uma flâmula
 * e não uma bandeira, e trocar sem remarcar nada. Oferecer um padrão de
 * pontos diferentes (trocar bandeira por triângulo) jogaria a marcação
 * fora, então esses ficam de fora da lista — pra eles existe a navegação
 * de cima.
 */
export function padroesCompativeis(padrao) {
  const chaves = (p) => stepsDoPadrao(p).map((s) => s.key).join("|");
  const atual = chaves(padrao);
  return Object.values(PADROES).filter((p) => chaves(p) === atual);
}

/** Polígono preenchido do padrão (triângulos e retângulo). */
export function areasDoPadrao(pontos, padrao) {
  if (ehExtra(padrao)) return areasExtras(pontos, padrao);
  if (ehCanal(padrao)) return areasDoCanal(pontos, padrao);
  return [];
}

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
  // nos extras cada linha sai da espec, não de um par arrastável
  if (ehCanal(padrao) || ehExtra(padrao)) return [];
  return paresDoPadrao(padrao).map((par) => [par.de, par.ate]);
}

export function configDoTemplate(pontos, padrao) {
  if (ehExtra(padrao) && temFormatoExtra(pontos, padrao)) {
    return {
      steps: stepsExtras(padrao),
      linhas: (p) => linhasExtras(p, padrao),
      areas: (p) => areasExtras(p, padrao),
      linePairs: [],
      pares: [],
    };
  }
  if (ehCanal(padrao) || temFormatoCanal(pontos)) return configDoCanal(ehCanal(padrao) ? padrao : null);
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
