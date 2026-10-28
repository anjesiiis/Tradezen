/**
 * TRADEZEN — APARÊNCIA DO GRÁFICO
 * ===============================
 *
 * Cor dos candles e forma de ver o preço (candle ou linha). Regra pura:
 * não toca em canvas, storage nem React, então dá pra testar sem montar
 * tela nenhuma.
 *
 * As cores do padrão são as que o gráfico já usava. Trocá-las aqui
 * repintaria o gráfico de todo mundo que nunca escolheu nada — e quem
 * abre o TradeZen amanhã espera encontrar o gráfico de ontem.
 */

export const CORES_CANDLE_PADRAO = { alta: "#00D68F", baixa: "#FF4560" };

/**
 * Os atalhos do seletor.
 *
 * Não há "Preto e Branco": o fundo do gráfico é escuro, e candle preto em
 * fundo escuro é candle invisível. "Sóbrio" faz o que aquele pedido
 * queria — tirar a cor do caminho — sem apagar metade dos candles.
 */
export const PRESETS_CANDLE = [
  { nome: "Clássico",      alta: "#00D68F", baixa: "#FF4560" },
  { nome: "TradingView",   alta: "#089981", baixa: "#F23645" },
  { nome: "Azul e laranja", alta: "#2196F3", baixa: "#FF9800" },
  { nome: "Sóbrio",        alta: "#D1D4DC", baixa: "#787B86" },
];

export const TIPOS_GRAFICO = [
  { id: "candle", rotulo: "Candles" },
  { id: "linha",  rotulo: "Linha" },
];

export const APARENCIA_PADRAO = {
  tipo: "candle",
  cores: { ...CORES_CANDLE_PADRAO },
};

const eCorHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/**
 * Completa o que faltar com o padrão.
 *
 * Preferência salva por uma versão antiga, campo torto vindo de um banco
 * editado à mão, `null`: tudo volta pro padrão em vez de pintar nada ou
 * quebrar o gráfico.
 */
export function normalizarAparencia(bruto) {
  const b = bruto && typeof bruto === "object" ? bruto : {};
  const cores = b.cores && typeof b.cores === "object" ? b.cores : {};
  return {
    tipo: TIPOS_GRAFICO.some((t) => t.id === b.tipo) ? b.tipo : APARENCIA_PADRAO.tipo,
    cores: {
      alta:  eCorHex(cores.alta)  ? cores.alta  : CORES_CANDLE_PADRAO.alta,
      baixa: eCorHex(cores.baixa) ? cores.baixa : CORES_CANDLE_PADRAO.baixa,
    },
  };
}

/** O preset que casa com as cores atuais, ou null se forem escolhidas a dedo. */
export function presetAtual(cores) {
  const c = normalizarAparencia({ cores }).cores;
  const achado = PRESETS_CANDLE.find(
    (p) => p.alta.toLowerCase() === c.alta.toLowerCase()
        && p.baixa.toLowerCase() === c.baixa.toLowerCase(),
  );
  return achado ? achado.nome : null;
}

/**
 * As opções da série de candles, prontas pro Lightweight Charts.
 *
 * Corpo, borda e pavio na mesma cor: separá-los dobraria os seletores
 * pra resolver um problema que ninguém tem.
 */
export function opcoesDaSerieCandle(cores) {
  const { alta, baixa } = normalizarAparencia({ cores }).cores;
  return {
    upColor: alta,         downColor: baixa,
    borderUpColor: alta,   borderDownColor: baixa,
    wickUpColor: alta,     wickDownColor: baixa,
  };
}

/** A linha herda a cor de alta: é uma série só, e precisa de uma cor só. */
export function opcoesDaSerieLinha(cores) {
  return { color: normalizarAparencia({ cores }).cores.alta };
}

/** O fechamento de cada candle — que é o que a linha mostra. */
export function paraLinha(candlesLW) {
  if (!Array.isArray(candlesLW)) return [];
  return candlesLW
    .filter((c) => c && c.time != null && c.close != null)
    .map((c) => ({ time: c.time, value: c.close }));
}
