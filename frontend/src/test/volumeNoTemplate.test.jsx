import { describe, it, expect } from "vitest";
import {
  MARGENS_PRECO_COM_VOLUME, MARGENS_PRECO_SEM_VOLUME, MARGENS_VOLUME,
  barrasDeVolume, temVolume,
} from "../admin/volumeDoTemplate.js";

const candle = (t, abertura, fechamento, volume) => ({
  timestamp: t, abertura, maxima: Math.max(abertura, fechamento) + 1,
  minima: Math.min(abertura, fechamento) - 1, fechamento, volume,
});

describe("temVolume — quando vale a pena reservar espaço", () => {
  it("diz que não pra lista vazia, nula ou indefinida", () => {
    expect(temVolume([])).toBe(false);
    expect(temVolume(null)).toBe(false);
    expect(temVolume(undefined)).toBe(false);
  });

  // Commodity e índice vêm do Yahoo assim. Reservar 22% da altura pra um
  // histograma que é só chão é roubar espaço de marcação por nada.
  it("diz que não quando todo volume é zero ou ausente", () => {
    expect(temVolume([candle(1000, 10, 11, 0), candle(2000, 11, 12, 0)])).toBe(false);
    expect(temVolume([{ timestamp: 1000, abertura: 10, fechamento: 11 }])).toBe(false);
  });

  it("diz que sim com um candle de volume só", () => {
    expect(temVolume([candle(1000, 10, 11, 0), candle(2000, 11, 12, 540)])).toBe(true);
  });
});

describe("barrasDeVolume", () => {
  it("converte timestamp de ms pra segundos e leva o volume", () => {
    const [b] = barrasDeVolume([candle(1700000000000, 10, 11, 1234)]);
    expect(b.time).toBe(1700000000);
    expect(b.value).toBe(1234);
  });

  it("pinta pela direção do candle, e empate conta como alta", () => {
    const [sobe, cai, igual] = barrasDeVolume([
      candle(1000, 10, 12, 5), candle(2000, 12, 10, 5), candle(3000, 10, 10, 5),
    ]);
    expect(sobe.color).toBe(igual.color);
    expect(cai.color).not.toBe(sobe.color);
  });

  // O lightweight-charts recusa a série INTEIRA quando há dois pontos no
  // mesmo `time` — não ignora o repetido. Sem deduplicar, um intradiário
  // ficaria sem volume nenhum em vez de com uma barra a menos.
  it("deduplica candles que caem no mesmo segundo, ficando o último", () => {
    const barras = barrasDeVolume([
      candle(1700000000100, 10, 12, 111),
      candle(1700000000900, 10, 12, 222),
    ]);
    expect(barras).toHaveLength(1);
    expect(barras[0].value).toBe(222);
  });

  it("devolve em ordem crescente de tempo mesmo com entrada fora de ordem", () => {
    const tempos = barrasDeVolume([
      candle(3000, 10, 11, 1), candle(1000, 10, 11, 1), candle(2000, 10, 11, 1),
    ]).map((b) => b.time);
    expect(tempos).toEqual([...tempos].sort((a, b) => a - b));
  });

  it("ignora candle sem timestamp utilizável", () => {
    expect(barrasDeVolume([
      { abertura: 10, fechamento: 11, volume: 9 },
      candle(1000, 10, 11, 9),
    ])).toHaveLength(1);
  });

  it("zera volume negativo ou não-numérico em vez de propagar lixo", () => {
    const [a, b] = barrasDeVolume([candle(1000, 10, 11, -5), candle(2000, 10, 11, "abc")]);
    expect(a.value).toBe(0);
    expect(b.value).toBe(0);
  });

  it("aguenta lista vazia e nula", () => {
    expect(barrasDeVolume([])).toEqual([]);
    expect(barrasDeVolume(null)).toEqual([]);
  });
});

describe("margens — o volume não pode comer a área de marcação", () => {
  it("as duas faixas se encontram, sem vão vazio entre candle e barra", () => {
    const fimDoPreco = 1 - MARGENS_PRECO_COM_VOLUME.bottom;
    expect(MARGENS_VOLUME.top).toBeGreaterThanOrEqual(fimDoPreco);
  });

  it("o volume vai até o chão", () => {
    expect(MARGENS_VOLUME.bottom).toBe(0);
  });

  // Ganhar volume não pode deixar o padrão menor pra marcar: a folga de
  // cima diminui mais do que a de baixo aumenta.
  it("com volume o preço fica com MAIS altura que o padrão antigo", () => {
    const alturaCom = 1 - MARGENS_PRECO_COM_VOLUME.top - MARGENS_PRECO_COM_VOLUME.bottom;
    const alturaAntiga = 1 - MARGENS_PRECO_SEM_VOLUME.top - MARGENS_PRECO_SEM_VOLUME.bottom;
    expect(alturaCom).toBeGreaterThan(alturaAntiga);
  });

  // Sem volume nada muda: é o padrão do lightweight-charts, que é o que
  // estes gráficos usavam por não declararem margem nenhuma.
  it("sem volume mantém o enquadramento que a tela sempre teve", () => {
    expect(MARGENS_PRECO_SEM_VOLUME).toEqual({ top: 0.2, bottom: 0.1 });
  });
});
