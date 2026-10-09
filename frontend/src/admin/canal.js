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
const LINHA_2 = ["p3", "p4"];   // a segunda

// A cor segue a POSIÇÃO no gráfico, não o papel da linha: a de cima é
// sempre verde e a de baixo sempre vermelha, nas duas direções. No canal
// de alta a de cima é a dos topos (p3/p4); no de baixa, a dos p1/p2.
function corDaLinha(chaves, padrao) {
  const alta = padrao?.alta !== false;
  const ehDeCima = alta ? chaves === LINHA_2 : chaves === LINHA_1;
  return ehDeCima ? VERDE : VERMELHO;
}

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

// Qual linha cada ponto fecha — vai na dica do botão, porque "Fundo Esq."
// sozinho não diz que os dois primeiros cliques são a linha de baixo.
const DICAS = ["ponto inferior esquerdo", "ponto inferior direito",
               "ponto superior esquerdo", "ponto superior direito"];
const DICAS_BAIXA = ["ponto superior esquerdo", "ponto superior direito",
                     "ponto inferior esquerdo", "ponto inferior direito"];

export const INSTRUCAO_CANAL =
  "Marque primeiro os 2 pontos da linha inferior, depois os 2 da superior.";

export function rotulosDoCanal(padrao) {
  return padrao?.alta === false ? ROTULOS_BAIXA : ROTULOS_ALTA;
}

export function stepsDoCanal(padrao) {
  const rotulos = rotulosDoCanal(padrao);
  const alta = padrao?.alta !== false;
  const dicas = alta ? DICAS : DICAS_BAIXA;
  return PASSOS_CANAL.map((key, n) => ({
    key,
    label: `P${n + 1} · ${rotulos[n]}`,
    dica: `${rotulos[n]} — ${dicas[n]}`,
    short: `P${n + 1}`,
    // a cor seque o papel da linha: suporte verde, resistência vermelha
    color: corDaLinha(n < 2 ? LINHA_1 : LINHA_2, padrao),
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
export function linhasDoCanal(pontos, padrao) {
  if (!pontos) return [];
  const linhas = [];
  const completo = temFormatoCanal(pontos);
  const { de, ate } = completo ? extremos(pontos) : { de: null, ate: null };

  for (const chaves of [LINHA_1, LINHA_2]) {
    const cor = corDaLinha(chaves, padrao);
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
//
// O que define um canal é a GEOMETRIA das duas retas, não a posição de um
// clique em relação a outro. A primeira versão comparava ponto com ponto
// ("Topo Esq. precisa estar acima de Fundo Esq.", "P3 depois de P1") e
// barrava marcação correta: num canal que começa por um topo, o fundo
// esquerdo vem DEPOIS do topo esquerdo no tempo, e isso é normal.
//
// Agora o que se exige é o que um canal é de fato:
//   1. cada reta precisa de dois candles diferentes;
//   2. as duas sobem (canal de alta) ou as duas descem (de baixa);
//   3. a reta de cima fica acima da de baixo ao longo de todo o canal.
export function validarCanal(pontos, padrao) {
  if (!temFormatoCanal(pontos)) return ["Marque os 4 pontos do canal antes de salvar."];

  const { p1, p2, p3, p4 } = pontos;
  const alta = padrao?.alta !== false;
  const [r1, r2, r3, r4] = rotulosDoCanal(padrao);
  const erros = [];

  // 1. Uma reta precisa de dois candles diferentes pra existir.
  if (p2.i === p1.i) erros.push(`"${r1}" e "${r2}" estão no mesmo candle — a linha precisa de dois candles.`);
  if (p4.i === p3.i) erros.push(`"${r3}" e "${r4}" estão no mesmo candle — a linha precisa de dois candles.`);
  if (erros.length) return erros;   // sem as duas retas, o resto não dá pra conferir

  // 2. Inversão: a reta de cima precisa ficar de um lado só da de baixo.
  // É a ÚNICA coisa que impede de salvar além dos pontos faltando — se as
  // duas se cruzam, topo e fundo estão trocados e o desenho não é um canal.
  //
  // A conferência vale só no TRECHO ONDE AS DUAS FORAM MARCADAS. Antes ela
  // esticava as duas retas até o extremo dos quatro pontos, e aí num canal
  // que estreita (a linha de baixo mais inclinada que a de cima) a de baixo
  // ultrapassava a de cima lá fora, num pedaço que ninguém marcou — e a
  // marcação, correta, era recusada.
  const de = Math.max(Math.min(p1.i, p2.i), Math.min(p3.i, p4.i));
  const ate = Math.min(Math.max(p1.i, p2.i), Math.max(p3.i, p4.i));
  const linha1 = (x) => precoNaReta(p1, p2, x);
  const linha2 = (x) => precoNaReta(p3, p4, x);
  // sem trecho em comum, compara onde cada uma começa e termina
  const ondeConferir = de <= ate ? [de, ate] : [Math.min(p1.i, p2.i, p3.i, p4.i), Math.max(p1.i, p2.i, p3.i, p4.i)];
  const cruzam = ondeConferir.some((x) => (alta ? linha2(x) <= linha1(x) : linha2(x) >= linha1(x)));
  if (cruzam) {
    const ladoCerto = alta ? "acima" : "abaixo";
    erros.push(`A linha de "${r3}" a "${r4}" precisa ficar ${ladoCerto} da linha de "${r1}" a "${r2}" — do jeito que está, topo e fundo se cruzam.`);
  }

  return erros;
}

// ── Avisos (amarelos, NÃO bloqueiam) ──────────────────────────
export function avisosDoCanal(pontos, padrao) {
  if (!temFormatoCanal(pontos)) return [];
  const medidas = medidasDoCanal(pontos);
  const avisos = [];

  // Canal de alta marcado num trecho que desce (ou o contrário) não é
  // erro de marcação, é escolha de quem está olhando o gráfico: vira
  // aviso, e o template salva na tabela que estiver selecionada.
  if (padrao) {
    const alta = padrao.alta !== false;
    const esperado = alta ? "subindo" : "descendo";
    const [r1, r2, r3, r4] = rotulosDoCanal(padrao);
    const contra = (m) => (alta ? m <= 0 : m >= 0);
    if (contra(medidas.inclinacao_suporte)) avisos.push(`Confira: a linha de "${r1}" a "${r2}" não está ${esperado} — num canal de ${alta ? "alta" : "baixa"} ela vai nesse sentido.`);
    if (contra(medidas.inclinacao_resistencia)) avisos.push(`Confira: a linha de "${r3}" a "${r4}" não está ${esperado}.`);
  }

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
