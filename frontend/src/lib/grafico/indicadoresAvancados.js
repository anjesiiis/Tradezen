/**
 * TRADEZEN — A MATEMÁTICA DOS INDICADORES AVANÇADOS
 * ================================================
 *
 * Funções PURAS: recebem os candles e devolvem séries. Nenhuma toca no
 * gráfico, no React ou na rede — é o que permite testá-las com números
 * conhecidos, e é onde erro de indicador se esconde (uma fórmula errada
 * desenha uma linha plausível e ninguém percebe por meses).
 *
 * CONVENÇÕES, iguais em todas:
 *   • entrada: array de candles {timestamp, abertura, maxima, minima,
 *     fechamento, volume} — em MILISSEGUNDOS, como vem do backend
 *   • saída: [{time, value}] com `time` em SEGUNDOS, que é o que o
 *     Lightweight Charts espera
 *   • período incompleto NÃO vira ponto: a média de 21 só existe a
 *     partir da 21ª vela. Preencher com zero ou repetir o primeiro valor
 *     desenha uma linha que mente no começo do gráfico
 *   • candles chegam ordenados, mas cada função ordena por garantia —
 *     histórico carregado sob demanda entra pelo começo do array
 */

const seg = (c) => Math.floor(c.timestamp / 1000);
const ordenar = (candles) => [...(candles || [])].sort((a, b) => a.timestamp - b.timestamp);
const fecha = (c) => Number(c.fechamento);
const alta = (c) => Number(c.maxima);
const baixa = (c) => Number(c.minima);
const vol = (c) => Number(c.volume || 0);
const tipico = (c) => (alta(c) + baixa(c) + fecha(c)) / 3;

/** Média simples de uma lista de números. */
const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * EMA — média exponencial.
 *
 * A primeira EMA é a MÉDIA SIMPLES das `periodo` primeiras velas (o
 * "seed"). Começar com o primeiro fechamento é comum e está errado: faz
 * a curva nascer colada no preço e levar dezenas de velas pra convergir.
 */
export function calcularEMA(candles, periodo = 21) {
  const cs = ordenar(candles);
  if (cs.length < periodo || periodo < 1) return [];
  const k = 2 / (periodo + 1);
  const saida = [];
  let ema = media(cs.slice(0, periodo).map(fecha));
  saida.push({ time: seg(cs[periodo - 1]), value: ema });
  for (let i = periodo; i < cs.length; i++) {
    ema = fecha(cs[i]) * k + ema * (1 - k);
    saida.push({ time: seg(cs[i]), value: ema });
  }
  return saida;
}

/** True Range de uma vela contra a anterior. */
const trueRange = (atual, anterior) => Math.max(
  alta(atual) - baixa(atual),
  Math.abs(alta(atual) - fecha(anterior)),
  Math.abs(baixa(atual) - fecha(anterior)),
);

/** ATR de Wilder (suavização por soma, não média móvel simples). */
function atrWilder(cs, periodo) {
  if (cs.length <= periodo) return [];
  const trs = [];
  for (let i = 1; i < cs.length; i++) trs.push(trueRange(cs[i], cs[i - 1]));
  const saida = new Array(cs.length).fill(null);
  let atr = media(trs.slice(0, periodo));
  saida[periodo] = atr;
  for (let i = periodo + 1; i < cs.length; i++) {
    atr = (atr * (periodo - 1) + trs[i - 1]) / periodo;
    saida[i] = atr;
  }
  return saida;
}

/**
 * MACD — linha, sinal e histograma.
 *
 * A linha de sinal é a EMA do MACD, e ela só começa quando há `sinal`
 * valores de MACD. Calcular o sinal desde o primeiro ponto do MACD
 * (como muitas implementações fazem) dá um cruzamento falso no começo.
 */
export function calcularMACD(candles, rapida = 12, lenta = 26, sinal = 9) {
  const cs = ordenar(candles);
  const eRapida = calcularEMA(cs, rapida);
  const eLenta = calcularEMA(cs, lenta);
  if (!eRapida.length || !eLenta.length) return { macd: [], sinal: [], histograma: [] };

  const mapaRapida = new Map(eRapida.map((p) => [p.time, p.value]));
  const macd = eLenta
    .filter((p) => mapaRapida.has(p.time))
    .map((p) => ({ time: p.time, value: mapaRapida.get(p.time) - p.value }));

  if (macd.length < sinal) return { macd, sinal: [], histograma: [] };
  const k = 2 / (sinal + 1);
  const linhaSinal = [];
  let s = media(macd.slice(0, sinal).map((p) => p.value));
  linhaSinal.push({ time: macd[sinal - 1].time, value: s });
  for (let i = sinal; i < macd.length; i++) {
    s = macd[i].value * k + s * (1 - k);
    linhaSinal.push({ time: macd[i].time, value: s });
  }

  const mapaSinal = new Map(linhaSinal.map((p) => [p.time, p.value]));
  const histograma = macd
    .filter((p) => mapaSinal.has(p.time))
    .map((p) => ({ time: p.time, value: p.value - mapaSinal.get(p.time) }));

  return { macd, sinal: linhaSinal, histograma };
}

/**
 * SuperTrend — linha de stop que muda de lado.
 *
 * O detalhe que quase toda implementação erra: as bandas são
 * "travadas". A banda inferior só sobe, a superior só desce, enquanto a
 * tendência não virar. Sem essa trava, a linha oscila junto do preço e
 * perde a função de stop.
 */
export function calcularSuperTrend(candles, periodo = 10, multiplicador = 3) {
  const cs = ordenar(candles);
  const atrs = atrWilder(cs, periodo);
  if (!atrs.length) return [];

  const saida = [];
  let superior = null;
  let inferior = null;
  let emAlta = true;

  for (let i = 0; i < cs.length; i++) {
    const atr = atrs[i];
    if (atr == null) continue;
    const meio = (alta(cs[i]) + baixa(cs[i])) / 2;
    const supBruta = meio + multiplicador * atr;
    const infBruta = meio - multiplicador * atr;
    const f = fecha(cs[i]);
    const fAnt = fecha(cs[i - 1]);

    superior = (superior == null || supBruta < superior || fAnt > superior) ? supBruta : superior;
    inferior = (inferior == null || infBruta > inferior || fAnt < inferior) ? infBruta : inferior;

    if (saida.length === 0) emAlta = f >= infBruta;
    else if (emAlta && f < inferior) emAlta = false;
    else if (!emAlta && f > superior) emAlta = true;

    saida.push({ time: seg(cs[i]), value: emAlta ? inferior : superior, emAlta });
  }
  return saida;
}

/**
 * Parabolic SAR.
 *
 * O fator de aceleração sobe a cada novo extremo e ZERA na virada. Não
 * zerar é o erro clássico: o SAR acelera indefinidamente e passa a
 * cortar o preço no meio.
 */
export function calcularParabolicSAR(candles, passo = 0.02, maximo = 0.2) {
  const cs = ordenar(candles);
  if (cs.length < 3) return [];
  const saida = [];
  let emAlta = fecha(cs[1]) >= fecha(cs[0]);
  let sar = emAlta ? baixa(cs[0]) : alta(cs[0]);
  let extremo = emAlta ? alta(cs[0]) : baixa(cs[0]);
  let af = passo;

  for (let i = 1; i < cs.length; i++) {
    sar += af * (extremo - sar);
    const virou = emAlta ? baixa(cs[i]) < sar : alta(cs[i]) > sar;
    if (virou) {
      emAlta = !emAlta;
      sar = extremo;
      extremo = emAlta ? alta(cs[i]) : baixa(cs[i]);
      af = passo;   // ZERA na virada
    } else if ((emAlta && alta(cs[i]) > extremo) || (!emAlta && baixa(cs[i]) < extremo)) {
      extremo = emAlta ? alta(cs[i]) : baixa(cs[i]);
      af = Math.min(maximo, af + passo);
    }
    saida.push({ time: seg(cs[i]), value: sar, emAlta });
  }
  return saida;
}

/**
 * ADX + DMI — FORÇA da tendência, não direção.
 *
 * ADX acima de ~25 é tendência; abaixo de ~20 é lateral. Quem lê ADX
 * como "vai subir" lê errado: ele sobe tanto em alta quanto em queda.
 */
export function calcularADX(candles, periodo = 14) {
  const cs = ordenar(candles);
  if (cs.length <= periodo * 2) return { adx: [], diMais: [], diMenos: [] };

  const trs = [];
  const dmMais = [];
  const dmMenos = [];
  for (let i = 1; i < cs.length; i++) {
    trs.push(trueRange(cs[i], cs[i - 1]));
    const subiu = alta(cs[i]) - alta(cs[i - 1]);
    const caiu = baixa(cs[i - 1]) - baixa(cs[i]);
    dmMais.push(subiu > caiu && subiu > 0 ? subiu : 0);
    dmMenos.push(caiu > subiu && caiu > 0 ? caiu : 0);
  }

  const suavizar = (xs) => {
    const out = new Array(xs.length).fill(null);
    let s = xs.slice(0, periodo).reduce((a, b) => a + b, 0);
    out[periodo - 1] = s;
    for (let i = periodo; i < xs.length; i++) {
      s = s - s / periodo + xs[i];
      out[i] = s;
    }
    return out;
  };

  const sTR = suavizar(trs);
  const sMais = suavizar(dmMais);
  const sMenos = suavizar(dmMenos);

  const diMais = [];
  const diMenos = [];
  const dxs = [];
  for (let i = 0; i < trs.length; i++) {
    if (sTR[i] == null || sTR[i] === 0) continue;
    const dp = 100 * (sMais[i] / sTR[i]);
    const dm = 100 * (sMenos[i] / sTR[i]);
    const t = seg(cs[i + 1]);
    diMais.push({ time: t, value: dp });
    diMenos.push({ time: t, value: dm });
    dxs.push({ time: t, value: (dp + dm) === 0 ? 0 : 100 * Math.abs(dp - dm) / (dp + dm) });
  }

  const adx = [];
  if (dxs.length >= periodo) {
    let a = media(dxs.slice(0, periodo).map((p) => p.value));
    adx.push({ time: dxs[periodo - 1].time, value: a });
    for (let i = periodo; i < dxs.length; i++) {
      a = (a * (periodo - 1) + dxs[i].value) / periodo;
      adx.push({ time: dxs[i].time, value: a });
    }
  }
  return { adx, diMais, diMenos };
}

/** MFI — o RSI com volume dentro. Mais robusto em rompimento sem volume. */
export function calcularMFI(candles, periodo = 14) {
  const cs = ordenar(candles);
  if (cs.length <= periodo) return [];
  const saida = [];
  for (let i = periodo; i < cs.length; i++) {
    let positivo = 0;
    let negativo = 0;
    for (let j = i - periodo + 1; j <= i; j++) {
      const fluxo = tipico(cs[j]) * vol(cs[j]);
      if (tipico(cs[j]) > tipico(cs[j - 1])) positivo += fluxo;
      else if (tipico(cs[j]) < tipico(cs[j - 1])) negativo += fluxo;
    }
    // Sem fluxo negativo o índice é 100 por definição; dividir por zero
    // daria Infinity e o gráfico sumiria.
    const valor = negativo === 0 ? 100 : 100 - 100 / (1 + positivo / negativo);
    saida.push({ time: seg(cs[i]), value: valor });
  }
  return saida;
}

/** Williams %R — de 0 a -100. Negativo de propósito: é a escala original. */
export function calcularWilliamsR(candles, periodo = 14) {
  const cs = ordenar(candles);
  if (cs.length < periodo) return [];
  const saida = [];
  for (let i = periodo - 1; i < cs.length; i++) {
    const janela = cs.slice(i - periodo + 1, i + 1);
    const maior = Math.max(...janela.map(alta));
    const menor = Math.min(...janela.map(baixa));
    const amplitude = maior - menor;
    saida.push({
      time: seg(cs[i]),
      value: amplitude === 0 ? -50 : -100 * (maior - fecha(cs[i])) / amplitude,
    });
  }
  return saida;
}

/** CCI — desvio médio ABSOLUTO, não desvio padrão. Erro comum. */
export function calcularCCI(candles, periodo = 20) {
  const cs = ordenar(candles);
  if (cs.length < periodo) return [];
  const saida = [];
  for (let i = periodo - 1; i < cs.length; i++) {
    const janela = cs.slice(i - periodo + 1, i + 1).map(tipico);
    const m = media(janela);
    const desvio = media(janela.map((x) => Math.abs(x - m)));
    saida.push({
      time: seg(cs[i]),
      value: desvio === 0 ? 0 : (tipico(cs[i]) - m) / (0.015 * desvio),
    });
  }
  return saida;
}

/** Awesome Oscillator — SMA 5 menos SMA 34 do preço MÉDIO (não do fechamento). */
export function calcularAwesomeOscillator(candles, curta = 5, longa = 34) {
  const cs = ordenar(candles);
  if (cs.length < longa) return [];
  const medio = cs.map((c) => (alta(c) + baixa(c)) / 2);
  const saida = [];
  for (let i = longa - 1; i < cs.length; i++) {
    const c = media(medio.slice(i - curta + 1, i + 1));
    const l = media(medio.slice(i - longa + 1, i + 1));
    saida.push({ time: seg(cs[i]), value: c - l });
  }
  return saida;
}

/** Keltner — como Bollinger, mas a largura vem do ATR, não do desvio. */
export function calcularKeltner(candles, periodo = 20, multiplicador = 2) {
  const cs = ordenar(candles);
  const ema = calcularEMA(cs, periodo);
  const atrs = atrWilder(cs, periodo);
  if (!ema.length || !atrs.length) return { meio: [], superior: [], inferior: [] };
  const porTempo = new Map(cs.map((c, i) => [seg(c), atrs[i]]));
  const meio = [];
  const superior = [];
  const inferior = [];
  for (const p of ema) {
    const atr = porTempo.get(p.time);
    if (atr == null) continue;
    meio.push(p);
    superior.push({ time: p.time, value: p.value + multiplicador * atr });
    inferior.push({ time: p.time, value: p.value - multiplicador * atr });
  }
  return { meio, superior, inferior };
}

/** Chaikin Money Flow — pressão de compra/venda, de -1 a 1. */
export function calcularChaikinMoneyFlow(candles, periodo = 20) {
  const cs = ordenar(candles);
  if (cs.length < periodo) return [];
  const mfv = cs.map((c) => {
    const amplitude = alta(c) - baixa(c);
    if (amplitude === 0) return 0;   // doji: sem pressão medível
    return ((fecha(c) - baixa(c)) - (alta(c) - fecha(c))) / amplitude * vol(c);
  });
  const saida = [];
  for (let i = periodo - 1; i < cs.length; i++) {
    const somaVol = cs.slice(i - periodo + 1, i + 1).reduce((s, c) => s + vol(c), 0);
    const somaMfv = mfv.slice(i - periodo + 1, i + 1).reduce((s, x) => s + x, 0);
    saida.push({ time: seg(cs[i]), value: somaVol === 0 ? 0 : somaMfv / somaVol });
  }
  return saida;
}

/** Acumulação/Distribuição — linha cumulativa, sem período. */
export function calcularAccDist(candles) {
  const cs = ordenar(candles);
  let acumulado = 0;
  return cs.map((c) => {
    const amplitude = alta(c) - baixa(c);
    if (amplitude !== 0) {
      acumulado += ((fecha(c) - baixa(c)) - (alta(c) - fecha(c))) / amplitude * vol(c);
    }
    return { time: seg(c), value: acumulado };
  });
}

/**
 * Pivôs clássicos do ÚLTIMO período fechado.
 *
 * Devolve preços, não séries: são linhas horizontais que valem pro
 * período seguinte inteiro. Quem desenha pivô a partir do período ATUAL
 * está desenhando um nível que ainda está se formando.
 */
export function calcularPivos(candles) {
  const cs = ordenar(candles);
  if (cs.length < 2) return null;
  const c = cs[cs.length - 2];   // o último FECHADO
  const h = alta(c);
  const l = baixa(c);
  const f = fecha(c);
  const p = (h + l + f) / 3;
  return {
    pp: p,
    r1: 2 * p - l, s1: 2 * p - h,
    r2: p + (h - l), s2: p - (h - l),
    r3: h + 2 * (p - l), s3: l - 2 * (h - p),
  };
}

/**
 * VOLUME PROFILE — volume por FAIXA DE PREÇO.
 *
 * Devolve barras horizontais: quanto se negociou em cada faixa. É
 * suporte e resistência por liquidez, não por desenho — onde houve muito
 * negócio, o preço tende a reagir.
 *
 * O volume de cada vela é DISTRIBUÍDO entre as faixas que ela cobre, na
 * proporção da sobreposição. Jogar tudo na faixa do fechamento (atalho
 * comum) concentra volume em preços onde pouco se negociou.
 *
 * `poc` é o Point of Control: a faixa de maior volume.
 */
export function calcularVolumeProfile(candles, faixas = 24) {
  const cs = ordenar(candles).filter((c) => Number.isFinite(alta(c)) && Number.isFinite(baixa(c)));
  if (cs.length < 2 || faixas < 2) return { barras: [], poc: null };
  const topo = Math.max(...cs.map(alta));
  const base = Math.min(...cs.map(baixa));
  if (!(topo > base)) return { barras: [], poc: null };

  const altura = (topo - base) / faixas;
  const barras = Array.from({ length: faixas }, (_, i) => ({
    de: base + i * altura,
    ate: base + (i + 1) * altura,
    volume: 0,
  }));

  for (const c of cs) {
    const cBaixo = baixa(c);
    const cAlto = alta(c);
    const amplitude = cAlto - cBaixo;
    const v = vol(c);
    if (v <= 0) continue;
    if (amplitude === 0) {
      const k = Math.min(faixas - 1, Math.max(0, Math.floor((cBaixo - base) / altura)));
      barras[k].volume += v;
      continue;
    }
    for (const b of barras) {
      const sobreposicao = Math.min(cAlto, b.ate) - Math.max(cBaixo, b.de);
      if (sobreposicao > 0) b.volume += v * (sobreposicao / amplitude);
    }
  }

  const poc = barras.reduce((a, b) => (b.volume > a.volume ? b : a), barras[0]);
  return { barras, poc: poc.volume > 0 ? poc : null };
}
