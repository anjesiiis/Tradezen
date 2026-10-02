import { API } from "./api.js";

// "Top 5 mais negociadas" de cada praça.
//
// Não existe endpoint de ranking no backend, mas os candles já trazem
// volume — então a conta é feita aqui: pede um lote de candidatas, olha o
// volume do último candle de cada uma e fica com as cinco maiores. É
// volume de verdade, do último pregão; nada de lista fixa fingindo
// ranking.
//
// A lista de candidatas é grande o bastante pra o ranking fazer sentido e
// pequena o bastante pra a resposta chegar rápido (o lote leva ~3s).
const CANDIDATAS = {
  B3: [
    "PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "BBAS3.SA",
    "B3SA3.SA", "ABEV3.SA", "MGLU3.SA", "WEGE3.SA", "SUZB3.SA",
  ],
  NYSE: ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA", "META", "GOOGL", "AMD"],
};

const MOEDA = { B3: "R$", NYSE: "US$" };

export function candidatasDa(praca) {
  return CANDIDATAS[praca] || [];
}

/** @returns {Promise<Array<{ticker,nome,preco,moeda,variacao,alta,volume}>>} */
export async function buscarTopAcoes(praca) {
  const tickers = candidatasDa(praca);
  if (!tickers.length) return [];

  const resposta = await fetch(
    `${API}/ativos/batch?tickers=${encodeURIComponent(tickers.join(","))}&periodo=1mo&intervalo=1d`
  ).then((r) => r.json());

  return (resposta?.resultados || [])
    .filter((r) => r?.status === "ok" && r.candles?.length >= 2)
    .map((r) => {
      const ultimo = r.candles[r.candles.length - 1];
      const anterior = r.candles[r.candles.length - 2];
      const variacao = anterior.fechamento
        ? ((ultimo.fechamento - anterior.fechamento) / anterior.fechamento) * 100
        : 0;
      // o símbolo curto (PETR4) lê melhor que o ticker do Yahoo (PETR4.SA),
      // e para alguns papéis o backend devolve o próprio ticker como nome
      const simbolo = (r.info?.simbolo || r.ticker).replace(".SA", "");
      const nome = r.info?.nome && r.info.nome !== r.ticker && r.info.nome !== simbolo
        ? r.info.nome
        : simbolo;
      return {
        ticker: r.ticker,
        simbolo,
        nome,
        preco: ultimo.fechamento,
        moeda: MOEDA[praca] || "",
        variacao,
        alta: variacao >= 0,
        volume: ultimo.volume || 0,
      };
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);
}
