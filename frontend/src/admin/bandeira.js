// ── BANDEIRA (flag pattern) — 6 pontos em ordem cronológica ──
// O analista marca na ordem em que o padrão acontece no tempo: o mastro
// (movimento forte), a consolidação dentro do canal e o rompimento. Antes
// eram 6 pontos "por função" (2 topos e 2 fundos do canal), que não diziam
// a ordem e deixavam marcar um topo antes do mastro.
//
// Mesmo arquivo serve pras duas telas: na bandeira de BAIXA tudo é o
// espelho (mastro cai, canal sobe, rompimento fura pra baixo).

// Cores do design system (CLAUDE.md)
export const VERDE = "#26a69a";
export const AZUL = "#2962ff";
export const VERMELHO = "#ef5350";

export const PASSOS_BANDEIRA = [
  "p1_inicio_mastro",
  "p2_topo_mastro",
  "p3_fundo1",
  "p4_topo1",
  "p5_fundo2",
  "p6_rompimento",
];

// `alta`: bandeira de alta (mastro sobe). `false` = bandeira de baixa, com
// todos os rótulos e regras espelhados.
export function stepsBandeira(alta = true) {
  const corMastro = alta ? VERDE : VERMELHO;
  return [
    { key: "p1_inicio_mastro", label: "Início do Mastro", short: "P1", color: corMastro },
    { key: "p2_topo_mastro",   label: alta ? "Topo do Mastro" : "Fundo do Mastro",    short: "P2", color: corMastro },
    { key: "p3_fundo1",        label: alta ? "Fundo 1" : "Topo 1",                    short: "P3", color: AZUL },
    { key: "p4_topo1",         label: alta ? "Topo 1" : "Fundo 1",                    short: "P4", color: AZUL },
    { key: "p5_fundo2",        label: alta ? "Fundo 2" : "Topo 2",                    short: "P5", color: AZUL },
    { key: "p6_rompimento",    label: "Rompimento",                                   short: "P6", color: corMastro },
  ];
}

export function temFormatoNovo(pontos) {
  return Boolean(pontos) && PASSOS_BANDEIRA.every((k) => pontos[k]);
}

// Preço da reta que passa por dois pontos, no índice `i` (extrapola).
export function precoNaReta(a, b, i) {
  if (!a || !b) return null;
  if (b.i === a.i) return a.preco;
  return a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i);
}

// ── Validações ────────────────────────────────────────────────
// Devolve [] quando está tudo certo, ou a lista de mensagens do que está
// errado — cada uma dizendo exatamente qual ponto corrigir.
export function validarBandeira(pontos, { alta = true } = {}) {
  const erros = [];
  if (!temFormatoNovo(pontos)) return ["Marque os 6 pontos antes de salvar."];

  const p = PASSOS_BANDEIRA.map((k) => pontos[k]);
  const [p1, p2, p3, p4, p5, p6] = p;
  const rotulos = stepsBandeira(alta).map((s) => s.label);

  // 1) ordem cronológica obrigatória
  for (let k = 1; k < p.length; k++) {
    if (p[k].i <= p[k - 1].i) {
      erros.push(`"${rotulos[k]}" precisa vir depois de "${rotulos[k - 1]}" no tempo.`);
    }
  }

  // 2) o mastro tem que ser forte na direção do padrão
  if (alta ? p2.preco <= p1.preco : p2.preco >= p1.preco) {
    erros.push(alta
      ? `"Topo do Mastro" precisa estar acima do "Início do Mastro" — o mastro é de alta.`
      : `"Fundo do Mastro" precisa estar abaixo do "Início do Mastro" — o mastro é de baixa.`);
  }

  // 3) a consolidação começa contra o mastro
  if (alta ? p3.preco >= p2.preco : p3.preco <= p2.preco) {
    erros.push(alta
      ? `"Fundo 1" precisa estar abaixo do "Topo do Mastro".`
      : `"Topo 1" precisa estar acima do "Fundo do Mastro".`);
  }

  // 4) canal inclinado contra o mastro (ou lateral): tolera 1% pra cima,
  //    senão marcações boas de canal quase horizontal seriam recusadas
  const tolerancia = Math.abs(p3.preco) * 0.01;
  if (alta ? p5.preco > p3.preco + tolerancia : p5.preco < p3.preco - tolerancia) {
    erros.push(alta
      ? `"Fundo 2" precisa estar no mesmo nível ou abaixo do "Fundo 1" — o canal da bandeira é descendente.`
      : `"Topo 2" precisa estar no mesmo nível ou acima do "Topo 1" — o canal da bandeira é ascendente.`);
  }

  // 5) rompimento confirmado: P6 fura a linha do canal no tempo dele
  const linhaCanal = precoNaReta(p2, p4, p6.i);
  if (linhaCanal !== null) {
    if (alta ? p6.preco <= linhaCanal : p6.preco >= linhaCanal) {
      erros.push(alta
        ? `"Rompimento" precisa fechar acima da linha superior do canal (${linhaCanal.toFixed(2)}).`
        : `"Rompimento" precisa fechar abaixo da linha inferior do canal (${linhaCanal.toFixed(2)}).`);
    }
  }

  return erros;
}

// ── Desenho: as 4 linhas do padrão ────────────────────────────
// 1. Mastro          P1 → P2                      (verde, cheia)
// 2. Canal superior  P2 → P4, esticado até P6      (azul, tracejada)
// 3. Canal inferior  P3 → P5, esticado até P6      (azul, tracejada)
// 4. Alvo projetado  P6 → P6 + altura do mastro    (verde, cheia)
export function linhasBandeira(pontos, candles, { alta = true } = {}) {
  if (!temFormatoNovo(pontos)) return [];
  const { p1_inicio_mastro: p1, p2_topo_mastro: p2, p3_fundo1: p3, p4_topo1: p4, p5_fundo2: p5, p6_rompimento: p6 } = pontos;
  const corMastro = alta ? VERDE : VERMELHO;

  // O alvo é projetado pra frente com a mesma duração do mastro, limitado
  // ao último candle disponível — assim a linha sempre cai dentro do gráfico.
  const ultimo = Math.max(0, (candles?.length || 0) - 1);
  const duracaoMastro = Math.max(1, p2.i - p1.i);
  const alturaMastro = p2.preco - p1.preco;
  const iAlvo = candles?.length ? Math.min(p6.i + duracaoMastro, ultimo) : p6.i + duracaoMastro;

  return [
    { id: "mastro", cor: corMastro, largura: 2, tracejada: false, dados: [
      { i: p1.i, preco: p1.preco },
      { i: p2.i, preco: p2.preco },
    ] },
    { id: "canal_superior", cor: AZUL, largura: 1, tracejada: true, dados: [
      { i: p2.i, preco: p2.preco },
      { i: p6.i, preco: precoNaReta(p2, p4, p6.i) },
    ] },
    { id: "canal_inferior", cor: AZUL, largura: 1, tracejada: true, dados: [
      { i: p3.i, preco: p3.preco },
      { i: p6.i, preco: precoNaReta(p3, p5, p6.i) },
    ] },
    { id: "alvo", cor: corMastro, largura: 2, tracejada: false, dados: [
      { i: p6.i, preco: p6.preco },
      { i: iAlvo, preco: p6.preco + alturaMastro },
    ] },
  ];
}

// Medidas que o ML usa (mesmas contas das colunas geradas no Supabase —
// ver sql/007_bandeira_6_pontos.sql)
export function medidasBandeira(pontos) {
  if (!temFormatoNovo(pontos)) return null;
  const { p1_inicio_mastro: p1, p2_topo_mastro: p2, p3_fundo1: p3 } = pontos;
  const altura = p2.preco - p1.preco;
  return {
    altura_mastro: altura,
    retracao_bandeira: altura === 0 ? null : (p2.preco - p3.preco) / altura,
  };
}

// ── Formato antigo (templates salvos antes desta mudança) ─────
// Eram 6 pontos "por função", sem ordem no tempo: mastro + 2 toques no topo
// e 2 no fundo do canal. Continuam abrindo e sendo editáveis do jeito que
// foram marcados — quem decide é `temFormatoNovo(pontos)`.
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

// ── BANDEIRA DE ALTA — 8 pontos em 4 PARES independentes ──────
// Cada par é uma linha própria, marcada com 2 cliques: o analista desenha
// o mastro, as duas bordas do canal e o mastro pós-rompimento. Os pares
// NÃO precisam se encostar — é isso que diferencia deste modelo pro
// anterior (6 pontos encadeados), onde cada ponto dependia do vizinho.
export const PARES_ALTA = [
  { id: "mastro1",         rotulo: "Mastro 1",           cor: VERDE, largura: 2,   tracejada: false, de: "p1_inicio_mastro1",  ate: "p2_topo_mastro1" },
  { id: "fundo_bandeira",  rotulo: "Fundo da Bandeira",  cor: AZUL,  largura: 1.5, tracejada: true,  de: "p3_inicio_fundo",    ate: "p4_fim_fundo" },
  { id: "topo_bandeira",   rotulo: "Topo da Bandeira",   cor: AZUL,  largura: 1.5, tracejada: true,  de: "p5_inicio_topo",     ate: "p6_fim_topo" },
  { id: "mastro2",         rotulo: "Mastro 2",           cor: VERDE, largura: 2,   tracejada: false, de: "p7_inicio_mastro2",  ate: "p8_topo_mastro2" },
];

const ROTULOS_ALTA_PARES = {
  p1_inicio_mastro1: "Início Mastro 1",
  p2_topo_mastro1: "Topo Mastro 1",
  p3_inicio_fundo: "Início Fundo Bandeira",
  p4_fim_fundo: "Fim Fundo Bandeira",
  p5_inicio_topo: "Início Topo Bandeira",
  p6_fim_topo: "Fim Topo Bandeira",
  p7_inicio_mastro2: "Início Mastro 2",
  p8_topo_mastro2: "Topo Mastro 2",
};

export const PASSOS_ALTA_PARES = PARES_ALTA.flatMap((p) => [p.de, p.ate]);

export function stepsAltaPares() {
  return PARES_ALTA.flatMap((par, iPar) =>
    [par.de, par.ate].map((key, iPonto) => ({
      key,
      label: ROTULOS_ALTA_PARES[key],
      short: `P${iPar * 2 + iPonto + 1}`,
      color: par.cor,
      par: par.id,
    }))
  );
}

export function temFormatoPares(pontos) {
  return Boolean(pontos) && PASSOS_ALTA_PARES.every((k) => pontos[k]);
}

// Uma linha por par COMPLETO — a linha aparece assim que os 2 cliques
// daquele par acontecem, sem esperar os outros pares.
export function linhasAltaPares(pontos) {
  if (!pontos) return [];
  return PARES_ALTA.filter((par) => pontos[par.de] && pontos[par.ate]).map((par) => ({
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

export function validarAltaPares(pontos) {
  if (!temFormatoPares(pontos)) return ["Marque os 8 pontos antes de salvar."];

  const p = Object.fromEntries(PASSOS_ALTA_PARES.map((k) => [k, pontos[k]]));
  const erros = [];
  const rot = (k) => ROTULOS_ALTA_PARES[k];

  // 1) cada par é cronológico (o 2º clique vem depois do 1º)
  for (const par of PARES_ALTA) {
    if (p[par.ate].i <= p[par.de].i) {
      erros.push(`${par.rotulo}: "${rot(par.ate)}" precisa vir depois de "${rot(par.de)}" no tempo.`);
    }
  }

  // 2) os dois mastros são de alta
  if (p.p2_topo_mastro1.preco <= p.p1_inicio_mastro1.preco) {
    erros.push(`Mastro 1: "Topo Mastro 1" precisa estar acima de "Início Mastro 1" — o mastro é uma subida.`);
  }
  if (p.p8_topo_mastro2.preco <= p.p7_inicio_mastro2.preco) {
    erros.push(`Mastro 2: "Topo Mastro 2" precisa estar acima de "Início Mastro 2" — o mastro é uma subida.`);
  }

  // 3) a bandeira (consolidação) vem depois do mastro 1
  if (p.p3_inicio_fundo.i <= p.p1_inicio_mastro1.i) {
    erros.push(`"Início Fundo Bandeira" precisa vir depois de "Início Mastro 1" no tempo.`);
  }

  // 4) o mastro 2 vem depois da bandeira inteira
  if (p.p7_inicio_mastro2.i <= p.p4_fim_fundo.i) {
    erros.push(`"Início Mastro 2" precisa vir depois de "Fim Fundo Bandeira" no tempo.`);
  }
  if (p.p7_inicio_mastro2.i <= p.p6_fim_topo.i) {
    erros.push(`"Início Mastro 2" precisa vir depois de "Fim Topo Bandeira" no tempo.`);
  }

  return erros;
}

// Medidas do padrão (mesmas contas das colunas geradas no Supabase —
// ver sql/008_bandeira_alta_8_pontos.sql)
export function medidasAltaPares(pontos) {
  if (!temFormatoPares(pontos)) return null;
  return {
    altura_mastro1: pontos.p2_topo_mastro1.preco - pontos.p1_inicio_mastro1.preco,
    altura_mastro2: pontos.p8_topo_mastro2.preco - pontos.p7_inicio_mastro2.preco,
  };
}
