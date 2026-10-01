// ── CANAL DE ALTA / CANAL DE BAIXA — 6 pontos em 2 linhas ─────
// Diferente de bandeira/flâmula/cunha (8 pontos em 4 pares), o canal é
// marcado por TOQUES: os fundos formam a linha de suporte, os topos a de
// resistência. Os dois últimos pontos são opcionais — um canal se enxerga
// com dois toques de cada lado; o terceiro só confirma.
//
// Este arquivo não importa nada de bandeira.js de propósito: o canal tem
// regras próprias e não deve esbarrar nas dos padrões de continuação.

export const VERDE = "#26a69a";
export const AZUL = "#2962ff";
export const VERMELHO = "#ef5350";

export const PASSOS_CANAL = [
  "p1_fundo1", "p2_topo1",
  "p3_fundo2", "p4_topo2",
  "p5_fundo3", "p6_topo3",
];

// Com 2 toques de cada lado já dá pra traçar as duas linhas — é o mínimo
// para salvar. P5/P6 entram quando existe um terceiro toque.
export const PASSOS_CANAL_OBRIGATORIOS = ["p1_fundo1", "p2_topo1", "p3_fundo2", "p4_topo2"];

const SUPORTE = ["p1_fundo1", "p3_fundo2", "p5_fundo3"];
const RESISTENCIA = ["p2_topo1", "p4_topo2", "p6_topo3"];

export const PADROES_CANAL = {
  canal_alta:  { id: "canal_alta",  rotulo: "Canal de Alta",  forma: "canal", alta: true,  nav: "canal-alta",  rota: "/admin/templates/canal-alta",  canal: true },
  canal_baixa: { id: "canal_baixa", rotulo: "Canal de Baixa", forma: "canal", alta: false, nav: "canal-baixa", rota: "/admin/templates/canal-baixa", canal: true },
};

export function ehCanal(padrao) {
  return Boolean(padrao?.canal);
}

export function temFormatoCanal(pontos) {
  return Boolean(pontos) && PASSOS_CANAL_OBRIGATORIOS.every((k) => pontos[k]);
}

const ROTULOS = {
  p1_fundo1: "Fundo 1",
  p2_topo1: "Topo 1",
  p3_fundo2: "Fundo 2",
  p4_topo2: "Topo 2",
  p5_fundo3: "Fundo 3 (opcional)",
  p6_topo3: "Topo 3 (opcional)",
};

// A ordem dos passos é a de marcação: fundo, topo, fundo, topo...
export function stepsDoCanal() {
  return PASSOS_CANAL.map((key, n) => ({
    key,
    label: ROTULOS[key],
    short: `P${n + 1}`,
    color: SUPORTE.includes(key) ? VERDE : VERMELHO,
    opcional: n >= 4,
  }));
}

// ── Desenho ───────────────────────────────────────────────────

/** Preço da polilinha (que passa por todos os toques) no índice `i`. */
export function precoNaPolilinha(pontos, i) {
  if (!pontos?.length) return null;
  if (pontos.length === 1) return pontos[0].preco;

  // antes do primeiro / depois do último: estende a reta da ponta
  if (i <= pontos[0].i) return entreDois(pontos[0], pontos[1], i);
  if (i >= pontos[pontos.length - 1].i) return entreDois(pontos[pontos.length - 2], pontos[pontos.length - 1], i);

  for (let n = 0; n < pontos.length - 1; n++) {
    if (i >= pontos[n].i && i <= pontos[n + 1].i) return entreDois(pontos[n], pontos[n + 1], i);
  }
  return pontos[pontos.length - 1].preco;
}

function entreDois(a, b, i) {
  if (b.i === a.i) return a.preco;
  return a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i);
}

function toquesDe(pontos, chaves) {
  return chaves
    .filter((k) => pontos?.[k])
    .map((k) => ({ i: pontos[k].i, preco: pontos[k].preco }))
    .sort((a, b) => a.i - b.i);
}

/**
 * As três linhas do canal: suporte, resistência e a mediana (50%).
 * As duas primeiras passam por todos os toques marcados e são estendidas
 * dos dois lados; a mediana é a média das duas em cada ponto no tempo.
 */
export function linhasDoCanal(pontos, candles) {
  const suporte = toquesDe(pontos, SUPORTE);
  const resistencia = toquesDe(pontos, RESISTENCIA);
  const linhas = [];

  const todos = [...suporte, ...resistencia];
  if (todos.length < 2) return linhas;

  const primeiro = Math.min(...todos.map((p) => p.i));
  const ultimo = Math.max(...todos.map((p) => p.i));
  const folga = Math.max(3, Math.round((ultimo - primeiro) * 0.15));
  const limite = (candles?.length || 0) - 1;
  const de = Math.max(0, primeiro - folga);
  const ate = limite > 0 ? Math.min(limite, ultimo + folga) : ultimo + folga;

  const esticar = (toques) => [
    { i: de, preco: precoNaPolilinha(toques, de) },
    ...toques.filter((p) => p.i > de && p.i < ate),
    { i: ate, preco: precoNaPolilinha(toques, ate) },
  ];

  if (suporte.length >= 2) {
    linhas.push({ id: "suporte", cor: VERDE, largura: 2, tracejada: false, dados: esticar(suporte) });
  }
  if (resistencia.length >= 2) {
    linhas.push({ id: "resistencia", cor: VERMELHO, largura: 2, tracejada: false, dados: esticar(resistencia) });
  }

  // Mediana: só com as duas linhas traçadas. Como ambas são retas por
  // partes, basta calcular a média nos pontos onde alguma delas dobra.
  if (suporte.length >= 2 && resistencia.length >= 2) {
    const dobras = [...new Set([de, ...suporte.map((p) => p.i), ...resistencia.map((p) => p.i), ate])]
      .filter((i) => i >= de && i <= ate)
      .sort((a, b) => a - b);
    linhas.push({
      id: "mediana",
      cor: AZUL,
      largura: 1.5,
      tracejada: true,
      dados: dobras.map((i) => ({
        i,
        preco: (precoNaPolilinha(suporte, i) + precoNaPolilinha(resistencia, i)) / 2,
      })),
    });
  }

  return linhas;
}

// ── Validações que BLOQUEIAM ──────────────────────────────────
export function validarCanal(pontos, padrao) {
  if (!temFormatoCanal(pontos)) {
    return ["Marque pelo menos os 4 primeiros pontos: dois fundos e dois topos."];
  }

  const erros = [];
  const suporte = SUPORTE.filter((k) => pontos[k]);
  const resistencia = RESISTENCIA.filter((k) => pontos[k]);

  // Cronologia dentro de cada linha: um toque vem depois do anterior
  for (const lado of [suporte, resistencia]) {
    for (let n = 1; n < lado.length; n++) {
      if (pontos[lado[n]].i <= pontos[lado[n - 1]].i) {
        erros.push(`"${ROTULOS[lado[n]]}" precisa vir depois de "${ROTULOS[lado[n - 1]]}" no tempo.`);
      }
    }
  }

  // Direção: num canal de alta os fundos sobem e os topos sobem; de baixa,
  // o contrário. É o que distingue um canal de uma faixa lateral.
  const contraMao = padrao.alta ? (a, b) => b.preco <= a.preco : (a, b) => b.preco >= a.preco;
  const sentido = padrao.alta ? "acima" : "abaixo";
  const movimento = padrao.alta ? "sobem" : "descem";
  for (const [lado, nome] of [[suporte, "fundos"], [resistencia, "topos"]]) {
    for (let n = 1; n < lado.length; n++) {
      if (contraMao(pontos[lado[n - 1]], pontos[lado[n]])) {
        erros.push(
          `"${ROTULOS[lado[n]]}" precisa estar ${sentido} de "${ROTULOS[lado[n - 1]]}" — num canal de ${padrao.alta ? "alta" : "baixa"} os ${nome} ${movimento}.`
        );
      }
    }
  }

  // Resistência acima do suporte: medido no meio do padrão, porque os
  // toques dos dois lados caem em tempos diferentes.
  const toquesSup = toquesDe(pontos, SUPORTE);
  const toquesRes = toquesDe(pontos, RESISTENCIA);
  const meio = (Math.min(toquesSup[0].i, toquesRes[0].i) + Math.max(
    toquesSup[toquesSup.length - 1].i, toquesRes[toquesRes.length - 1].i
  )) / 2;
  if (precoNaPolilinha(toquesRes, meio) <= precoNaPolilinha(toquesSup, meio)) {
    erros.push("A linha de resistência (topos) precisa ficar acima da linha de suporte (fundos).");
  }

  return erros;
}

// ── Avisos (amarelos, NÃO bloqueiam) ──────────────────────────
// Diferença de inclinação a partir da qual as linhas deixam de parecer
// paralelas. Acima disso o padrão provavelmente é cunha/triângulo.
const TOLERANCIA_PARALELAS = 0.35;

export function avisosDoCanal(pontos) {
  if (!temFormatoCanal(pontos)) return [];
  const suporte = toquesDe(pontos, SUPORTE);
  const resistencia = toquesDe(pontos, RESISTENCIA);
  const avisos = [];

  const inclinacao = (t) => (t.length < 2 ? 0 : (t[t.length - 1].preco - t[0].preco) / Math.max(1, t[t.length - 1].i - t[0].i));
  const iSup = inclinacao(suporte);
  const iRes = inclinacao(resistencia);
  const referencia = Math.max(Math.abs(iSup), Math.abs(iRes));

  if (referencia > 0 && Math.abs(iSup - iRes) / referencia > TOLERANCIA_PARALELAS) {
    const fechando = Math.abs(iRes) < Math.abs(iSup) ? iRes < iSup : iSup > iRes;
    avisos.push(
      fechando
        ? "Confira: as linhas estão convergindo, não paralelas — isso costuma ser cunha ou triângulo, não canal."
        : "Confira: as linhas estão se abrindo, não paralelas — num canal elas correm lado a lado."
    );
  }

  if (!pontos.p5_fundo3 && !pontos.p6_topo3) {
    avisos.push("Só dois toques de cada lado: um terceiro toque (P5/P6) deixa o canal mais confiável para o modelo.");
  }

  return avisos;
}

// Medidas que o ML usa: largura do canal e inclinação das linhas.
export function medidasDoCanal(pontos) {
  if (!temFormatoCanal(pontos)) return null;
  const suporte = toquesDe(pontos, SUPORTE);
  const resistencia = toquesDe(pontos, RESISTENCIA);
  const meio = (suporte[0].i + resistencia[resistencia.length - 1].i) / 2;
  const inclinacao = (t) => (t[t.length - 1].preco - t[0].preco) / Math.max(1, t[t.length - 1].i - t[0].i);

  return {
    largura_canal: precoNaPolilinha(resistencia, meio) - precoNaPolilinha(suporte, meio),
    inclinacao_suporte: inclinacao(suporte),
    inclinacao_resistencia: inclinacao(resistencia),
  };
}

export function configDoCanal(candles) {
  return {
    steps: stepsDoCanal(),
    linhas: (p, cs) => linhasDoCanal(p, cs || candles),
    linePairs: [],
    // as linhas do canal são resultado de conta (passam por 3 toques e são
    // esticadas), então arrasta-se ponto a ponto — não a linha inteira
    pares: [],
  };
}
