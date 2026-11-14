import { describe, it, expect } from "vitest";
import { comContextoLargo, pontosJaEstaoNoContexto } from "../admin/contextoTemplate.js";
import { janelaDoPadrao, camposDaEdicao } from "../admin/janela.js";
import { pontosForaDosCandles } from "../admin/diagnosticoTemplate.js";
import { configDoTemplate } from "../admin/bandeira.js";
import { PADROES } from "../admin/bandeira.js";

// 300 candles de contexto, de hora em hora.
const contexto = Array.from({ length: 300 }, (_, i) => ({
  timestamp: (1700000000 + i * 3600) * 1000,
  open: 10, high: 11, low: 9, close: 10, volume: 1,
}));

// Bandeira de alta em 8 pontos, marcada no meio do contexto.
const PONTOS_CTX = {
  p1_inicio_mastro1: { i: 200, preco: 10 },
  p2_topo_mastro1: { i: 210, preco: 12 },
  p3_inicio_fundo: { i: 212, preco: 11 },
  p4_fim_fundo: { i: 220, preco: 10.8 },
  p5_inicio_topo: { i: 212, preco: 11.8 },
  p6_fim_topo: { i: 220, preco: 11.6 },
  p7_inicio_mastro2: { i: 221, preco: 11 },
  p8_topo_mastro2: { i: 230, preco: 13 },
};

const ANOTACOES_CTX = [
  { texto: "mastro", ancora: { i: 205, preco: 11 }, largura: 80, altura: 24 },
];

/** Uma linha do banco como ela fica quando é salva corretamente. */
function linhaNoBanco() {
  const { candles, pontosAjustados, anotacoesAjustadas } =
    janelaDoPadrao(contexto, PONTOS_CTX, ANOTACOES_CTX);
  return {
    id: 1, ticker: "PETR4", timeframe: "1h",
    candles, candles_contexto: contexto,
    pontos: pontosAjustados, anotacoes: anotacoesAjustadas,
  };
}

/** O que a tela manda pro backend ao salvar uma edição. */
function salvar(aberto) {
  const campos = camposDaEdicao(aberto, aberto.pontos, aberto.anotacoes);
  // o PUT só grava o que veio; o resto da linha fica como estava
  const { pontos, candles, anotacoes } = campos;
  return {
    ...aberto,
    pontos,
    anotacoes,
    candles: candles ?? aberto.candlesDoRecorte ?? aberto.candles,
  };
}

describe("abrir um template em contexto", () => {
  it("devolve os pontos em coordenadas do contexto", () => {
    const aberto = comContextoLargo(linhaNoBanco());
    expect(aberto.candles.length).toBe(300);
    expect(aberto.pontos.p1_inicio_mastro1.i).toBe(200);
    expect(aberto.emContexto).toBe(true);
  });

  it("guarda o recorte original, pra edição poder voltar pra ele", () => {
    const aberto = comContextoLargo(linhaNoBanco());
    expect(aberto.candlesDoRecorte.length).toBe(linhaNoBanco().candles.length);
    expect(aberto.candlesDoRecorte.length).toBeLessThan(300);
  });

  it("todo ponto cai dentro dos candles mostrados", () => {
    const aberto = comContextoLargo(linhaNoBanco());
    expect(pontosForaDosCandles(aberto.pontos, aberto.candles)).toBeNull();
  });
});

describe("salvar a edição NÃO apaga o desenho", () => {
  it("o ciclo abrir -> salvar -> reabrir mantém os 8 pontos desenháveis", () => {
    const gravado = salvar(comContextoLargo(linhaNoBanco()));
    const reaberto = comContextoLargo(gravado);

    expect(Object.keys(reaberto.pontos)).toHaveLength(8);
    expect(pontosForaDosCandles(reaberto.pontos, reaberto.candles)).toBeNull();
  });

  it("os pontos voltam nos MESMOS candles de antes da edição", () => {
    const antes = comContextoLargo(linhaNoBanco());
    const depois = comContextoLargo(salvar(antes));
    for (const chave of Object.keys(PONTOS_CTX)) {
      expect(depois.pontos[chave].i).toBe(antes.pontos[chave].i);
      expect(depois.pontos[chave].preco).toBe(antes.pontos[chave].preco);
    }
  });

  it("sobrevive a dez edições seguidas", () => {
    let linha = linhaNoBanco();
    for (let n = 0; n < 10; n++) linha = salvar(comContextoLargo(linha));
    const reaberto = comContextoLargo(linha);
    expect(Object.keys(reaberto.pontos)).toHaveLength(8);
    expect(reaberto.pontos.p1_inicio_mastro1.i).toBe(200);
    expect(pontosForaDosCandles(reaberto.pontos, reaberto.candles)).toBeNull();
  });

  it("grava candles e pontos na mesma numeração", () => {
    const campos = camposDaEdicao(comContextoLargo(linhaNoBanco()), PONTOS_CTX, []);
    expect(campos.candles).toBeTruthy();
    for (const p of Object.values(campos.pontos)) {
      expect(campos.candles[p.i]).toBeTruthy();
    }
  });

  it("a etiqueta de texto continua ancorada no candle certo", () => {
    const antes = comContextoLargo(linhaNoBanco());
    const depois = comContextoLargo(salvar(antes));
    expect(depois.anotacoes).toHaveLength(1);
    expect(depois.anotacoes[0].ancora.i).toBe(antes.anotacoes[0].ancora.i);
  });

  it("ponto arrastado pra fora do recorte antigo não se perde", () => {
    const aberto = comContextoLargo(linhaNoBanco());
    // arrasta o fim do mastro 2 pra bem longe, fora do recorte guardado
    aberto.pontos = { ...aberto.pontos, p8_topo_mastro2: { i: 290, preco: 14 } };
    const reaberto = comContextoLargo(salvar(aberto));
    expect(reaberto.pontos.p8_topo_mastro2.i).toBe(290);
    expect(pontosForaDosCandles(reaberto.pontos, reaberto.candles)).toBeNull();
  });

  it("template sem contexto guardado é salvo como antes, sem candles", () => {
    const semContexto = { ...linhaNoBanco(), candles_contexto: null };
    const aberto = comContextoLargo(semContexto);
    expect(aberto.emContexto).toBeUndefined();
    const campos = camposDaEdicao(aberto, aberto.pontos, aberto.anotacoes);
    expect(campos.candles).toBeUndefined();
    expect(campos.pontos).toEqual(aberto.pontos);
  });
});

describe("linhas já corrompidas pelo bug voltam a desenhar", () => {
  // Como ficou no banco quem foi editado antes da correção: índices do
  // contexto gravados sobre o recorte estreito.
  function linhaCorrompida() {
    const base = linhaNoBanco();
    return { ...base, pontos: PONTOS_CTX };
  }

  it("a corrupção é reconhecida pelo que ela é", () => {
    const linha = linhaCorrompida();
    expect(pontosJaEstaoNoContexto(linha, contexto)).toBe(true);
    // e uma linha sã não é confundida com ela
    expect(pontosJaEstaoNoContexto(linhaNoBanco(), contexto)).toBe(false);
  });

  it("abre desenhando os 8 pontos de novo", () => {
    const reaberto = comContextoLargo(linhaCorrompida());
    expect(Object.keys(reaberto.pontos)).toHaveLength(8);
    expect(pontosForaDosCandles(reaberto.pontos, reaberto.candles)).toBeNull();
    expect(reaberto.pontos.p1_inicio_mastro1.i).toBe(200);
  });

  it("desenha as 4 linhas da bandeira, como antes de quebrar", () => {
    const reaberto = comContextoLargo(linhaCorrompida());
    const cfg = configDoTemplate(reaberto.pontos, PADROES.bandeira_alta);
    expect(cfg.steps).toHaveLength(8);
    expect(cfg.linhas(reaberto.pontos, reaberto.candles)).toHaveLength(4);
  });

  it("salvar depois de curada grava a numeração certa, de vez", () => {
    const gravado = salvar(comContextoLargo(linhaCorrompida()));
    // agora pontos e candles do banco combinam
    for (const p of Object.values(gravado.pontos)) {
      expect(gravado.candles[p.i]).toBeTruthy();
    }
    expect(pontosJaEstaoNoContexto(gravado, contexto)).toBe(false);
  });

  it("o fracasso move e cura igual ao sucesso", () => {
    const reaberto = comContextoLargo(linhaCorrompida());
    const cfg = configDoTemplate(reaberto.pontos, PADROES.bandeira_alta_fracasso);
    expect(cfg.steps).toHaveLength(8);
    expect(cfg.linhas(reaberto.pontos, reaberto.candles)).toHaveLength(4);
  });
});

describe("pontosForaDosCandles", () => {
  it("nomeia os pontos que não têm candle", () => {
    const aviso = pontosForaDosCandles({ a: { i: 5, preco: 1 }, b: { i: 999, preco: 1 } },
      contexto.slice(0, 10));
    expect(aviso).toMatch(/b \(candle 999\)/);
    expect(aviso).not.toMatch(/\ba \(/);
  });

  it("cala a boca quando está tudo no lugar", () => {
    expect(pontosForaDosCandles({ a: { i: 5, preco: 1 } }, contexto)).toBeNull();
    expect(pontosForaDosCandles(null, contexto)).toBeNull();
    expect(pontosForaDosCandles({}, contexto)).toBeNull();
    expect(pontosForaDosCandles({ a: { i: 1, preco: 1 } }, [])).toBeNull();
  });
});
