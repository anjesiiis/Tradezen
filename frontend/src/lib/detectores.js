// Ativos e padrões da tela de Detectores.
//
// Os tickers são os mesmos do resto do app (Yahoo/Binance via /mercado),
// pra o preço e o sparkline virem de dado real, não de exemplo.
export const ATIVOS_DETECTOR = [
  { ticker: "PETR4.SA", rotulo: "PETR4", nome: "Petrobras", cor: "#00A650" },
  { ticker: "VALE3.SA", rotulo: "VALE3", nome: "Vale", cor: "#EAB308" },
  { ticker: "ITUB4.SA", rotulo: "ITUB4", nome: "Itaú", cor: "#EC7000" },
  { ticker: "BBDC4.SA", rotulo: "BBDC4", nome: "Bradesco", cor: "#CC092F" },
  { ticker: "ABEV3.SA", rotulo: "ABEV3", nome: "Ambev", cor: "#F5A623" },
  { ticker: "BTC-USD", rotulo: "BTC", nome: "Bitcoin", cor: "#F7931A" },
  { ticker: "ETH-USD", rotulo: "ETH", nome: "Ethereum", cor: "#627EEA" },
  { ticker: "SOL-USD", rotulo: "SOL", nome: "Solana", cor: "#9945FF" },
  { ticker: "BNB-USD", rotulo: "BNB", nome: "BNB", cor: "#F3BA2F" },
  { ticker: "EURUSD=X", rotulo: "EUR/USD", nome: "Euro", cor: "#34D399" },
  { ticker: "USDBRL=X", rotulo: "BRL/USD", nome: "Real", cor: "#34D399" },
  { ticker: "GC=F", rotulo: "OURO", nome: "Ouro", cor: "#F5A623" },
  { ticker: "CL=F", rotulo: "PETR", nome: "Petróleo", cor: "#8B8B8B" },
];

// Os três primeiros são os que o detector já sabe marcar (têm template e
// tabela no admin). O resto entra quando o modelo for treinado pra eles.
export const EXERCICIOS = [
  { id: "niveis", nome: "Suporte/Resistência", premium: false },
  { id: "topo-duplo", nome: "Topo Duplo", premium: false },
  { id: "oco", nome: "OCO", premium: false },
  { id: "triangulo", nome: "Triângulo", premium: true },
  { id: "bandeira", nome: "Bandeira/Flâmula", premium: true },
  { id: "retangulo", nome: "Retângulo", premium: true },
  { id: "topo-duplo-invertido", nome: "Topo Duplo Invertido", premium: true },
  { id: "topo-triplo", nome: "Topo Triplo", premium: true },
];

export const MAX_ATIVOS_FREE = 3;

export function exercicioPorId(id) {
  return EXERCICIOS.find((e) => e.id === id) || null;
}
