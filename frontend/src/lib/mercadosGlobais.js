// As seis bolsas que aparecem no globo e na lista de Mercados Globais.
//
// `indice` é o ticker que o backend já entende (Yahoo Finance) — é com ele
// que a variação do dia é buscada e é pra ele que o botão "Ver índice"
// leva, na mesma tela de gráfico do resto do app.

// Filtros ao lado do globo. Hoje os seis pontos são bolsas e todos são
// "indice"; moeda e cripto ficam prontos pra receber pontos depois.
export const CATEGORIAS = [
  { id: "acao", rotulo: "Ação" },
  { id: "moeda", rotulo: "Moeda" },
  { id: "cripto", rotulo: "Cripto" },
  { id: "indice", rotulo: "Índice" },
];

export const MERCADOS_GLOBAIS = [
  {
    id: "b3",
    codigo: "IBOV",
    categoria: "indice",
    sigla: "B3",
    nome: "B3 — Brasil, Bolsa, Balcão",
    cidade: "São Paulo",
    pais: "Brasil",
    continente: "América do Sul",
    indice: "^BVSP",
    nomeIndice: "Ibovespa",
    cor: "#22C55E",
    lat: -23.55,
    lng: -46.63,
    descricao: "Única bolsa de valores do Brasil, resultado da fusão entre a BM&FBovespa e a Cetip. O Ibovespa reúne as ações mais negociadas do país.",
  },
  {
    id: "nyse",
    codigo: "SPX",
    categoria: "indice",
    sigla: "NYSE",
    nome: "New York Stock Exchange",
    cidade: "Nova York",
    pais: "Estados Unidos",
    continente: "América do Norte",
    indice: "^GSPC",
    nomeIndice: "S&P 500",
    cor: "#60A5FA",
    lat: 40.71,
    lng: -74.01,
    descricao: "A maior bolsa do mundo em valor de mercado das empresas listadas. O S&P 500 acompanha as 500 maiores companhias americanas.",
  },
  {
    id: "lse",
    codigo: "FTSE",
    categoria: "indice",
    sigla: "LSE",
    nome: "London Stock Exchange",
    cidade: "Londres",
    pais: "Reino Unido",
    continente: "Europa",
    indice: "^FTSE",
    nomeIndice: "FTSE 100",
    cor: "#A78BFA",
    lat: 51.515,
    lng: -0.092,
    descricao: "Uma das bolsas mais antigas em funcionamento, aberta desde 1801. O FTSE 100 reúne as cem maiores empresas listadas em Londres.",
  },
  {
    id: "tse",
    codigo: "N225",
    categoria: "indice",
    sigla: "TSE",
    nome: "Tokyo Stock Exchange",
    cidade: "Tóquio",
    pais: "Japão",
    continente: "Ásia",
    indice: "^N225",
    nomeIndice: "Nikkei 225",
    cor: "#F59E0B",
    lat: 35.681,
    lng: 139.767,
    descricao: "A maior bolsa da Ásia e uma das primeiras a abrir no dia, por causa do fuso. O Nikkei 225 é o termômetro do mercado japonês.",
  },
  {
    id: "fse",
    codigo: "DAX",
    categoria: "indice",
    sigla: "FSE",
    nome: "Frankfurt Stock Exchange",
    cidade: "Frankfurt",
    pais: "Alemanha",
    continente: "Europa",
    indice: "^GDAXI",
    nomeIndice: "DAX",
    cor: "#FB923C",
    lat: 50.114,
    lng: 8.678,
    descricao: "Principal bolsa da Alemanha e porta de entrada do mercado da zona do euro. O DAX acompanha as maiores empresas alemãs.",
  },
  {
    id: "hkex",
    codigo: "HSI",
    categoria: "indice",
    sigla: "HKEX",
    nome: "Hong Kong Stock Exchange",
    cidade: "Hong Kong",
    pais: "China (Hong Kong)",
    continente: "Ásia",
    indice: "^HSI",
    nomeIndice: "Hang Seng",
    cor: "#F472B6",
    lat: 22.281,
    lng: 114.158,
    descricao: "Principal ponte entre o capital internacional e as empresas chinesas. O Hang Seng é o índice de referência da região.",
  },
];

/** Variação do dia a partir dos candles: último fechamento contra o anterior. */
export function variacaoDoDia(candles) {
  if (!candles || candles.length < 2) return null;
  const hoje = candles[candles.length - 1].fechamento;
  const ontem = candles[candles.length - 2].fechamento;
  if (!ontem) return null;
  return { fechamento: hoje, variacao: ((hoje - ontem) / ontem) * 100 };
}
