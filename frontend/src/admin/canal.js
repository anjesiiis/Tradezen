// ── CANAL DE ALTA / CANAL DE BAIXA — 4 pontos em 2 linhas ─────
//
// Duas retas paralelas: uma passa pelas duas pontas de baixo, a outra
// pelas duas de cima. A mediana no meio é CALCULADA, não marcada, e a
// área entre as linhas é preenchida (verde no canal de alta, vermelha no
// de baixa).
//
// A ordem de marcação é a mesma nos dois, trocando o papel das linhas:
//
//   Canal de ALTA    P1 Fundo Esq. → P2 Fundo Dir. → P3 Topo Esq. → P4 Topo Dir.
//   Canal de BAIXA   P1 Topo Esq.  → P2 Topo Dir.  → P3 Fundo Esq. → P4 Fundo Dir.
//
// Por isso as chaves são neutras (p1..p4): a mesma tabela serve às duas
// direções, e quem dá nome a cada ponto é o rótulo da tela.
//
// Este arquivo não importa nada de bandeira.js de propósito: o canal tem
// regras próprias e não deve esbarrar nas dos padrões de continuação.

export const VERDE = "#26a69a";
export const AZUL = "#2962ff";
export const VERMELHO = "#ef5350";

export const PASSOS_CANAL = ["p1", "p2", "p3", "p4"];
// Mantido pelo nome antigo porque bandeira.js e os testes falam nele:
// hoje todos os 4 são obrigatórios (não existe mais ponto opcional).
export const PASSOS_CANAL_OBRIGATORIOS = PASSOS_CANAL;

const LINHA_1 = ["p1", "p2"];   // a primeira marcada
const LINHA_2 = ["p3", "p4"];   // a de cima no canal de alta

export const PADROES_CANAL = {
  canal_alta:  { id: "canal_alta",  rotulo: "Canal de Alta",  forma: "canal", alta: true,  nav: "canal-alta",  rota: "/admin/templates/canal-alta",  canal: true },
  canal_baixa: { id: "canal_baixa", rotulo: "Canal de Baixa", forma: "canal", alta: false, nav: "canal-baixa", rota: "/admin/templates/canal-baixa", canal: true },
};

export function ehCanal(padrao) {
  return Boolean(padrao?.canal);
}

export function temFormatoCanal(pontos) {
  return Boolean(pontos) && PASSOS_CANAL.every((k) => pontos[k]);
}

// No canal de alta marca-se primeiro o fundo; no de baixa, o topo.
const ROTULOS_ALTA = ["Fundo Esq.", "Fundo Dir.", "Topo Esq.", "Topo Dir."];
const ROTULOS_BAIXA = ["Topo Esq.", "Topo Dir.", "Fundo Esq.", "Fundo Dir."];

export function rotulosDoCanal(padrao) {
  return padrao?.alta === false ? ROTULOS_BAIXA : ROTULOS_ALTA;
}

export function stepsDoCanal(padrao) {
  const rotulos = rotulosDoCanal(padrao);
  const alta = padrao?.alta !== false;
  return PASSOS_CANAL.map((key, n) => ({
    key,
    label: rotulos[n],
    short: `P${n + 1}`,
    // a cor seque o papel da linha: suporte verde, resistência vermelha
    color: (n < 2) === alta ? VERDE : VERMELHO,
  }));
}

// ── Desenho ───────────────────────────────────────────────────

/** Preço da reta que passa por dois pontos, no índice `i` (extrapola). */
export function precoNaReta(a, b, i) {
  if (!a || !b) return null;
  if (b.i === a.i) return a.preco;
  return a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i);
}

/** Primeiro e último índice do canal — onde as três linhas começam e acabam. */
function extremos(pontos) {
  const indices = PASSOS_CANAL.map((k) => pontos[k]?.i).filter((i) => i != null);
  return { de: Math.min(...indices), ate: Math.max(...indices) };
}

/**
 * As três linhas: as duas marcadas, esticadas até as pontas do canal, e a
 * mediana no meio exato delas.
 */
export function linhasDoCanal(pontos) {
  if (!pontos) return [];
  const linhas = [];
  const completo = temFormatoCanal(pontos);
  const { de, ate } = completo ? extremos(pontos) : { de: null, ate: null };

  for (const [chaves, cor] of [[LINHA_1, VERDE], [LINHA_2, VERMELHO]]) {
    const [a, b] = chaves.map((k) => pontos[k]);
    if (!a || !b) continue;
    // Enquanto o canal não está fechado, a linha vai só de ponta a ponta
    // do que foi marcado; depois ela se estica pelo canal inteiro.
    const x1 = completo ? de : Math.min(a.i, b.i);
    const x2 = completo ? ate : Math.max(a.i, b.i);
    linhas.push({
      id: chaves[0], cor, largura: 2, tracejada: false,
      dados: [
        { i: x1, preco: precoNaReta(a, b, x1) },
        { i: x2, preco: precoNaReta(a, b, x2) },
      ],
    });
  }

  if (completo) {
    // Mediana: o meio exato entre as duas linhas, ponto a ponto. Com as
    // linhas paralelas ela fica paralela também; se não forem, ela
    // acompanha a abertura — é o 50% do canal, não uma média solta.
    const meio = (x) => (
      precoNaReta(pontos.p1, pontos.p2, x) + precoNaReta(pontos.p3, pontos.p4, x)
    ) / 2;
    linhas.push({
      id: "mediana", cor: AZUL, largura: 1.5, tracejada: true,
      dados: [{ i: de, preco: meio(de) }, { i: ate, preco: meio(ate) }],
    });
  }
  return linhas;
}

/** Área entre as duas linhas: verde no canal de alta, vermelha no de baixa. */
export function areasDoCanal(pontos, padrao) {
  if (!temFormatoCanal(pontos)) return [];
  const { de, ate } = extremos(pontos);
  const canto = (a, b, x) => ({ i: x, preco: precoNaReta(a, b, x) });
  return [{
    id: `area-${padrao?.id || "canal"}`,
    cor: padrao?.alta === false ? VERMELHO : VERDE,
    opacidade: 0.10,
    borda: false,
    pontos: [
      canto(pontos.p3, pontos.p4, de),
      canto(pontos.p3, pontos.p4, ate),
      canto(pontos.p1, pontos.p2, ate),
      canto(pontos.p1, pontos.p2, de),
    ],
  }];
}

// ── Validações que BLOQUEIAM o salvamento ─────────────────────
export function validarCanal(pontos, padrao) {
  if (!temFormatoCanal(pontos)) return ["Marque os 4 pontos do canal antes de salvar."];

  const { p1, p2, p3, p4 } = pontos;
  const alta = padrao?.alta !== false;
  const [r1, r2, r3, r4] = rotulosDoCanal(padrao);
  const erros = [];

  // Uma linha precisa de dois candles diferentes pra existir.
  if (p2.i === p1.i) erros.push(`"${r1}" e "${r2}" estão no mesmo candle — a linha precisa de dois candles.`);
  if (p4.i === p3.i) erros.push(`"${r3}" e "${r4}" estão no mesmo candle — a linha precisa de dois candles.`);

  const sobe = (a, b) => b.preco > a.preco;
  const desce = (a, b) => b.preco < a.preco;
  const naDirecao = alta ? sobe : desce;
  const sentido = alta ? "acima" : "abaixo";
  const inclinacao = alta ? "sobe" : "desce";

  if (!naDirecao(p1, p2)) erros.push(`"${r2}" precisa estar ${sentido} de "${r1}" — num canal de ${alta ? "alta" : "baixa"} a linha ${inclinacao}.`);
  if (!naDirecao(p1, p3)) erros.push(`"${r3}" precisa estar ${sentido} de "${r1}" — é o outro lado do canal.`);
  if (!naDirecao(p3, p4)) erros.push(`"${r4}" precisa estar ${sentido} de "${r3}" — as duas linhas ${inclinacao}m juntas.`);

  // A segunda linha é marcada no mesmo trecho da primeira: cada ponto
  // dela vem depois do ponto correspondente.
  if (p3.i <= p1.i) erros.push(`"${r3}" precisa vir depois de "${r1}" no tempo.`);
  if (p4.i <= p2.i) erros.push(`"${r4}" precisa vir depois de "${r2}" no tempo.`);

  return erros;
}

// ── Avisos (amarelos, NÃO bloqueiam) ──────────────────────────
export function avisosDoCanal(pontos) {
  if (!temFormatoCanal(pontos)) return [];
  const medidas = medidasDoCanal(pontos);
  const avisos = [];

  // Num canal as duas linhas são paralelas: a abertura no começo e no fim
  // é a mesma. Diferença grande quer dizer outro padrão (cunha, triângulo).
  const maior = Math.max(Math.abs(medidas.abertura_inicio), Math.abs(medidas.abertura_fim));
  const menor = Math.min(Math.abs(medidas.abertura_inicio), Math.abs(medidas.abertura_fim));
  if (maior > 0 && menor / maior < 0.6) {
    avisos.push("Confira: as duas linhas não estão paralelas — a abertura do canal muda bastante do começo pro fim. Se elas convergem, o padrão é cunha ou triângulo.");
  }

  const mesmaDirecao = medidas.inclinacao_suporte * medidas.inclinacao_resistencia > 0;
  if (!mesmaDirecao) {
    avisos.push("Confira: as duas linhas estão inclinando para lados opostos — num canal elas seguem juntas.");
  }
  return avisos;
}

/** Medidas que o ML usa (mesmas contas das colunas geradas — sql/015). */
export function medidasDoCanal(pontos) {
  if (!temFormatoCanal(pontos)) return null;
  const { p1, p2, p3, p4 } = pontos;
  return {
    abertura_inicio: p3.preco - p1.preco,
    abertura_fim: p4.preco - p2.preco,
    inclinacao_suporte: (p2.preco - p1.preco) / (p2.i - p1.i || 1),
    inclinacao_resistencia: (p4.preco - p3.preco) / (p4.i - p3.i || 1),
  };
}

/** Como desenhar um canal salvo (abrir pelo emoji / pelo sidebar). */
export function configDoCanal(padrao) {
  return {
    steps: stepsDoCanal(padrao),
    linhas: (pontos) => linhasDoCanal(pontos),
    areas: (pontos) => areasDoCanal(pontos, padrao),
    linePairs: [],
    pares: [[...LINHA_1], [...LINHA_2]],
  };
}
