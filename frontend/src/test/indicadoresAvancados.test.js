import { describe, it, expect } from "vitest";
import {
  calcularEMA, calcularMACD, calcularSuperTrend, calcularParabolicSAR,
  calcularADX, calcularMFI, calcularWilliamsR, calcularCCI,
  calcularAwesomeOscillator, calcularKeltner, calcularChaikinMoneyFlow,
  calcularAccDist, calcularPivos, calcularVolumeProfile,
} from "../lib/grafico/indicadoresAvancados.js";

/**
 * A MATEMÁTICA DOS INDICADORES.
 *
 * Fórmula errada de indicador é o pior tipo de bug: desenha uma linha
 * plausível e ninguém percepeber por meses. Então aqui se testa com
 * números que dão pra conferir à mão, e se travam os erros clássicos de
 * cada fórmula — os que toda implementação apressada comete.
 */

// Candles sintéticos, um por dia, com preço controlado.
const vela = (i, { o = 10, h = 11, l = 9, c = 10.5, v = 1000 } = {}) => ({
  timestamp: (1700000000 + i * 86400) * 1000,
  abertura: o, maxima: h, minima: l, fechamento: c, volume: v,
});
// `desde` existe porque `serie` reiniciava o timestamp em zero: emendar
// duas séries criava velas com o MESMO instante, e `ordenar` as
// intercalava. O teste media então uma série que não era a que eu
// escrevi — foi exatamente o que aconteceu na primeira execução.
const serie = (n, fn, desde = 0) =>
  Array.from({ length: n }, (_, i) => vela(desde + i, fn(i)));
const subindo = (n) => serie(n, (i) => ({ o: 10 + i, h: 11 + i, l: 9 + i, c: 10.5 + i }));
const plana = (n) => serie(n, () => ({ o: 10, h: 11, l: 9, c: 10 }));

describe("EMA", () => {
  // O "seed" é a média SIMPLES das primeiras `periodo` velas. Começar com
  // o primeiro fechamento faz a curva nascer colada no preço e levar
  // dezenas de velas pra convergir — erro clássico.
  it("começa na média simples das primeiras velas", () => {
    const r = calcularEMA(plana(30), 10);
    expect(r[0].value).toBeCloseTo(10, 10);
  });

  it("não produz ponto antes de completar o período", () => {
    const cs = plana(30);
    const r = calcularEMA(cs, 10);
    expect(r).toHaveLength(21);
    expect(r[0].time).toBe(Math.floor(cs[9].timestamp / 1000));
  });

  it("reage mais rápido que a média simples", () => {
    const cs = [...plana(20), ...serie(5, () => ({ o: 10, h: 21, l: 9, c: 20 }), 20)];
    const ema = calcularEMA(cs, 10);
    const sma = 10 + (20 - 10) * 5 / 10;   // média simples das últimas 10
    expect(ema[ema.length - 1].value).toBeGreaterThan(sma);
  });

  it("dado insuficiente devolve vazio, não lixo", () => {
    expect(calcularEMA(plana(5), 10)).toEqual([]);
    expect(calcularEMA([], 10)).toEqual([]);
  });

  it("ordena os candles — histórico antigo entra pelo começo", () => {
    const cs = plana(30);
    const r1 = calcularEMA(cs, 10);
    const r2 = calcularEMA([...cs].reverse(), 10);
    expect(r2).toEqual(r1);
  });
});

describe("MACD", () => {
  it("em preço plano, as três séries ficam em zero", () => {
    const { macd, sinal, histograma } = calcularMACD(plana(80));
    expect(macd[macd.length - 1].value).toBeCloseTo(0, 8);
    expect(sinal[sinal.length - 1].value).toBeCloseTo(0, 8);
    expect(histograma[histograma.length - 1].value).toBeCloseTo(0, 8);
  });

  it("em alta, o MACD fica positivo", () => {
    const { macd } = calcularMACD(subindo(80));
    expect(macd[macd.length - 1].value).toBeGreaterThan(0);
  });

  // O sinal é a EMA do MACD e só pode começar quando há `sinal` valores
  // de MACD. Começar junto dá um cruzamento falso no começo do gráfico.
  it("o sinal começa depois do MACD, não junto", () => {
    const { macd, sinal } = calcularMACD(plana(80));
    expect(sinal[0].time).toBe(macd[8].time);
    expect(sinal.length).toBe(macd.length - 8);
  });

  it("histograma é MACD menos sinal, ponto a ponto", () => {
    const { macd, sinal, histograma } = calcularMACD(subindo(80));
    const m = new Map(macd.map((p) => [p.time, p.value]));
    const s = new Map(sinal.map((p) => [p.time, p.value]));
    for (const h of histograma) {
      expect(h.value).toBeCloseTo(m.get(h.time) - s.get(h.time), 10);
    }
  });
});

describe("SuperTrend", () => {
  it("em alta, fica abaixo do preço", () => {
    const cs = subindo(60);
    const r = calcularSuperTrend(cs, 10, 3);
    const ultimo = r[r.length - 1];
    expect(ultimo.emAlta).toBe(true);
    expect(ultimo.value).toBeLessThan(cs[cs.length - 1].fechamento);
  });

  // A banda inferior só SOBE enquanto a tendência é de alta. Sem essa
  // trava a linha oscila junto do preço e perde a função de stop.
  it("a linha não recua durante a alta", () => {
    const r = calcularSuperTrend(subindo(60), 10, 3).filter((p) => p.emAlta);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].value).toBeGreaterThanOrEqual(r[i - 1].value - 1e-9);
    }
  });
});

describe("Parabolic SAR", () => {
  it("em alta, fica abaixo do preço", () => {
    const cs = subindo(40);
    const r = calcularParabolicSAR(cs);
    expect(r[r.length - 1].value).toBeLessThan(cs[cs.length - 1].minima + 1e-9);
  });

  // O fator de aceleração ZERA na virada. Não zerar faz o SAR acelerar
  // indefinidamente e cortar o preço no meio.
  it("vira de lado quando o preço inverte", () => {
    const cs = [...subindo(30), ...serie(30, (i) => ({ o: 40 - i, h: 41 - i, l: 39 - i, c: 39.5 - i }), 30)];
    const r = calcularParabolicSAR(cs);
    expect(r.some((p) => p.emAlta)).toBe(true);
    expect(r[r.length - 1].emAlta).toBe(false);
  });
});

describe("ADX + DMI", () => {
  it("em tendência forte, o ADX é alto", () => {
    const { adx } = calcularADX(subindo(80));
    expect(adx[adx.length - 1].value).toBeGreaterThan(40);
  });

  // ADX mede FORÇA, não direção: sobe tanto na alta quanto na queda.
  // Quem lê "ADX alto" como "vai subir" lê errado.
  it("em queda forte, o ADX também é alto", () => {
    const caindo = serie(80, (i) => ({ o: 100 - i, h: 101 - i, l: 99 - i, c: 99.5 - i }));
    const { adx, diMais, diMenos } = calcularADX(caindo);
    expect(adx[adx.length - 1].value).toBeGreaterThan(40);
    expect(diMenos[diMenos.length - 1].value).toBeGreaterThan(diMais[diMais.length - 1].value);
  });

  it("em alta, DI+ fica acima de DI-", () => {
    const { diMais, diMenos } = calcularADX(subindo(80));
    expect(diMais[diMais.length - 1].value).toBeGreaterThan(diMenos[diMenos.length - 1].value);
  });
});

describe("MFI", () => {
  it("só alta dá 100", () => {
    const r = calcularMFI(subindo(40), 14);
    expect(r[r.length - 1].value).toBeCloseTo(100, 6);
  });

  // Sem fluxo negativo, dividir por zero daria Infinity e o gráfico
  // desapareceria. Por definição o índice é 100.
  it("nunca devolve Infinity nem NaN", () => {
    for (const r of [calcularMFI(subindo(40)), calcularMFI(plana(40))]) {
      for (const p of r) expect(Number.isFinite(p.value)).toBe(true);
    }
  });

  it("fica entre 0 e 100", () => {
    const vaivem = serie(60, (i) => ({ o: 10, h: 11 + (i % 5), l: 9 - (i % 3), c: 10 + (i % 7) - 3 }));
    for (const p of calcularMFI(vaivem)) {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
    }
  });
});

describe("Williams %R", () => {
  // A escala ORIGINAL é 0 a -100. Inverter o sinal é erro comum e
  // desenha o oscilador espelhado.
  it("fica entre 0 e -100", () => {
    const vaivem = serie(60, (i) => ({ o: 10, h: 12 + (i % 4), l: 8 - (i % 3), c: 10 + (i % 5) - 2 }));
    for (const p of calcularWilliamsR(vaivem)) {
      expect(p.value).toBeLessThanOrEqual(0);
      expect(p.value).toBeGreaterThanOrEqual(-100);
    }
  });

  it("fechando na máxima da janela dá 0", () => {
    const cs = serie(20, () => ({ o: 10, h: 11, l: 9, c: 11 }));
    const r = calcularWilliamsR(cs, 14);
    expect(r[r.length - 1].value).toBeCloseTo(0, 8);
  });

  it("janela sem amplitude não vira divisão por zero", () => {
    const r = calcularWilliamsR(serie(20, () => ({ o: 10, h: 10, l: 10, c: 10 })), 14);
    for (const p of r) expect(Number.isFinite(p.value)).toBe(true);
  });
});

describe("CCI", () => {
  // A fórmula usa desvio médio ABSOLUTO, não desvio padrão — erro que
  // muda a escala do indicador e invalida os níveis de ±100.
  it("preço plano dá zero, sem estourar", () => {
    const r = calcularCCI(plana(40), 20);
    expect(r[r.length - 1].value).toBe(0);
  });

  it("em alta constante fica positivo", () => {
    const r = calcularCCI(subindo(40), 20);
    expect(r[r.length - 1].value).toBeGreaterThan(0);
  });
});

describe("Awesome Oscillator", () => {
  // Usa o preço MÉDIO (máxima+mínima)/2, não o fechamento.
  it("em alta fica positivo", () => {
    const r = calcularAwesomeOscillator(subindo(60));
    expect(r[r.length - 1].value).toBeGreaterThan(0);
  });

  it("preço plano dá zero", () => {
    const r = calcularAwesomeOscillator(plana(60));
    expect(r[r.length - 1].value).toBeCloseTo(0, 10);
  });
});

describe("Keltner", () => {
  it("as três linhas têm o mesmo comprimento e a ordem certa", () => {
    const { meio, superior, inferior } = calcularKeltner(subindo(60), 20, 2);
    expect(superior).toHaveLength(meio.length);
    expect(inferior).toHaveLength(meio.length);
    for (let i = 0; i < meio.length; i++) {
      expect(superior[i].value).toBeGreaterThan(meio[i].value);
      expect(inferior[i].value).toBeLessThan(meio[i].value);
    }
  });
});

describe("Chaikin Money Flow", () => {
  it("fica entre -1 e 1", () => {
    const vaivem = serie(60, (i) => ({ o: 10, h: 12, l: 8, c: 8 + (i % 5), v: 100 * (i + 1) }));
    for (const p of calcularChaikinMoneyFlow(vaivem)) {
      expect(p.value).toBeGreaterThanOrEqual(-1);
      expect(p.value).toBeLessThanOrEqual(1);
    }
  });

  it("fechando sempre na máxima dá pressão máxima", () => {
    const r = calcularChaikinMoneyFlow(serie(40, () => ({ o: 10, h: 11, l: 9, c: 11 })), 20);
    expect(r[r.length - 1].value).toBeCloseTo(1, 8);
  });

  it("doji (sem amplitude) não vira divisão por zero", () => {
    const r = calcularChaikinMoneyFlow(serie(40, () => ({ o: 10, h: 10, l: 10, c: 10 })), 20);
    for (const p of r) expect(Number.isFinite(p.value)).toBe(true);
  });
});

describe("Acumulação/Distribuição", () => {
  it("é cumulativa e sobe quando fecha na máxima", () => {
    const r = calcularAccDist(serie(30, () => ({ o: 10, h: 11, l: 9, c: 11 })));
    expect(r).toHaveLength(30);
    for (let i = 1; i < r.length; i++) expect(r[i].value).toBeGreaterThan(r[i - 1].value);
  });
});

describe("Pivôs", () => {
  // Pivô vale pro período SEGUINTE: calcular com o período atual, que
  // ainda está se formando, dá um nível que muda a cada vela.
  it("usa o último candle FECHADO, não o atual", () => {
    const cs = [...plana(5), vela(5, { h: 20, l: 10, c: 15 }), vela(6, { h: 99, l: 1, c: 50 })];
    const p = calcularPivos(cs);
    expect(p.pp).toBeCloseTo((20 + 10 + 15) / 3, 10);
  });

  it("as resistências ficam acima e os suportes abaixo do pivô", () => {
    const p = calcularPivos([...plana(5), vela(5, { h: 20, l: 10, c: 15 }), vela(6)]);
    expect(p.r1).toBeGreaterThan(p.pp);
    expect(p.r2).toBeGreaterThan(p.r1);
    expect(p.s1).toBeLessThan(p.pp);
    expect(p.s2).toBeLessThan(p.s1);
  });

  it("menos de dois candles devolve null", () => {
    expect(calcularPivos([vela(0)])).toBeNull();
  });
});

describe("Volume Profile", () => {
  it("distribui o volume entre as faixas que a vela cobre", () => {
    // Uma vela cobrindo tudo, volume 1000, 10 faixas: ~100 por faixa.
    const cs = [vela(0, { h: 20, l: 10, c: 15, v: 1000 }), vela(1, { h: 20, l: 10, c: 15, v: 0 })];
    const { barras } = calcularVolumeProfile(cs, 10);
    expect(barras).toHaveLength(10);
    for (const b of barras) expect(b.volume).toBeCloseTo(100, 6);
  });

  // Jogar tudo na faixa do fechamento é o atalho comum, e concentra
  // volume em preços onde pouco se negociou.
  it("NÃO concentra tudo na faixa do fechamento", () => {
    const cs = [vela(0, { h: 20, l: 10, c: 19.9, v: 1000 }), vela(1, { h: 20, l: 10, c: 19.9, v: 0 })];
    const { barras } = calcularVolumeProfile(cs, 10);
    const naDoFechamento = barras[barras.length - 1].volume;
    expect(naDoFechamento).toBeLessThan(1000);
  });

  it("o volume total se conserva", () => {
    const cs = serie(40, (i) => ({ o: 10, h: 12 + (i % 3), l: 8 - (i % 2), c: 10, v: 500 }));
    const { barras } = calcularVolumeProfile(cs, 20);
    const soma = barras.reduce((s, b) => s + b.volume, 0);
    expect(soma).toBeCloseTo(40 * 500, 4);
  });

  it("o POC é a faixa de maior volume", () => {
    const cs = [
      vela(0, { h: 20, l: 10, c: 15, v: 100 }),
      ...serie(10, () => ({ o: 11, h: 11.2, l: 11, c: 11.1, v: 1000 }), 1),
    ];
    const { barras, poc } = calcularVolumeProfile(cs, 10);
    expect(poc).not.toBeNull();
    expect(poc.volume).toBe(Math.max(...barras.map((b) => b.volume)));
    expect(poc.de).toBeLessThanOrEqual(11.1);
    expect(poc.ate).toBeGreaterThanOrEqual(11);
  });

  it("dado degenerado devolve vazio em vez de estourar", () => {
    expect(calcularVolumeProfile([], 10).barras).toEqual([]);
    expect(calcularVolumeProfile(serie(5, () => ({ h: 10, l: 10 })), 10).barras).toEqual([]);
  });
});
