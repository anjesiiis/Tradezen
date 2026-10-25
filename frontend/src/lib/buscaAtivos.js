/**
 * TRADEZEN — BUSCA DE ATIVOS
 * ==========================
 *
 * Categorias, ordem por relevância e a lista que aparece antes de
 * digitar. Fica fora do componente porque é regra pura: dá pra testar
 * sem montar tela nenhuma.
 *
 * A filtragem e a ordenação acontecem AQUI, no navegador, e não no
 * backend: a rota /ativos/buscar devolve o catálogo inteiro que casa com
 * o texto (são 282 ativos no total), então ordenar e separar por
 * categoria do lado de cá não custa nada e não exige mexer no servidor.
 */

// As categorias saem do que o catálogo REALMENTE tem (backend/ativos.py).
// "Fundos" não entra: não existe um único FII ou ETF cadastrado, e a
// pílula só esvaziaria a lista.
//
// Ações viraram duas: quem procura PETR4 e quem procura AAPL quase nunca
// é a mesma pessoa na mesma hora, e juntas as 190 ações afogavam o resto.
export const CATEGORIAS = [
  { id: "todos", rotulo: "Todos", mercados: null },
  { id: "acoes_br", rotulo: "Ações BR", mercados: ["B3"], selo: "Ação BR" },
  { id: "acoes_eua", rotulo: "Ações EUA", mercados: ["NYSE", "NASDAQ"], selo: "Ação EUA" },
  { id: "forex", rotulo: "Forex", mercados: ["FOREX"], selo: "Forex" },
  { id: "cripto", rotulo: "Cripto", mercados: ["CRIPTO"], selo: "Cripto" },
  { id: "commodities", rotulo: "Commodities", mercados: ["COMMODITY"], selo: "Commodity" },
  { id: "indices", rotulo: "Índices", mercados: ["INDICE"], selo: "Índice" },
];

// Os "mais procurados" de cada categoria: é o que aparece ao escolher uma
// pílula sem digitar nada. Antes a lista vinha das sugestões da home, que
// só tinham UM forex e UMA commodity — daí a sensação de catálogo vazio.
// Digitar continua procurando no catálogo inteiro, não só aqui.
export const DESTAQUES = {
  acoes_br: ["PETR4.SA","VALE3.SA","ITUB4.SA","BBDC4.SA","BBAS3.SA","ABEV3.SA","WEGE3.SA",
             "MGLU3.SA","B3SA3.SA","RENT3.SA","SUZB3.SA","LREN3.SA","PRIO3.SA"],
  acoes_eua: ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","NFLX","AMD","INTC","JPM","V","MA","DIS","BA"],
  forex: ["USDBRL=X","EURBRL=X","GBPBRL=X","EURUSD=X","GBPUSD=X","USDJPY=X","USDCHF=X",
          "AUDUSD=X","USDCAD=X","NZDUSD=X","EURGBP=X","EURJPY=X"],
  cripto: ["BTC-USD","ETH-USD","BNB-USD","SOL-USD","XRP-USD","ADA-USD","DOGE-USD","AVAX-USD",
           "DOT-USD","LINK-USD","LTC-USD","TRX-USD","UNI7083-USD","SHIB-USD"],
  commodities: ["GC=F","SI=F","CL=F","BZ=F","NG=F","HG=F","PL=F","PA=F","ZC=F","ZS=F","KC=F","SB=F"],
  indices: ["^BVSP","^GSPC","^NDX","^IXIC","^DJI","^VIX","^GDAXI","^FTSE","^N225","^HSI"],
};

// Cor do selo por categoria — todas do design system do app.
export const COR_DA_CATEGORIA = {
  acoes_br: "#00D68F",
  acoes_eua: "#3D7EFF",
  forex: "#7BA9F0",
  cripto: "#F7931A",
  commodities: "#F5A623",
  indices: "#8B949E",
};

/** Em qual categoria esse ativo cai (pelo mercado que o backend manda). */
export function categoriaDoAtivo(ativo) {
  const mercado = (ativo?.mercado || "").toUpperCase();
  for (const c of CATEGORIAS) {
    if (c.mercados?.includes(mercado)) return c.id;
  }
  return "indices";   // sobra conhecida: índices e o que vier sem mercado
}

/** Rótulo curto do selo da linha (mais curto que o da pílula). */
export function rotuloDaCategoria(id) {
  const c = CATEGORIAS.find((x) => x.id === id);
  return c?.selo || c?.rotulo || "Outros";
}

/**
 * Os destaques da categoria, na ordem, a partir do catálogo.
 *
 * Ticker que não estiver no catálogo some em silêncio — melhor um card a
 * menos do que uma linha que não abre gráfico nenhum.
 */
export function destaquesDaCategoria(catalogo = [], categoria = "todos") {
  if (categoria === "todos") {
    // mistura: os primeiros de cada categoria, pra dar uma visão geral
    const porCategoria = Object.entries(DESTAQUES)
      .map(([, tickers]) => tickers.slice(0, 3))
      .flat();
    return porCategoria.map((tk) => catalogo.find((a) => a.ticker === tk)).filter(Boolean);
  }
  return (DESTAQUES[categoria] || [])
    .map((tk) => catalogo.find((a) => a.ticker === tk))
    .filter(Boolean);
}

// Apelidos do jeito que a pessoa fala, não do jeito que o ticker é
// escrito. Sem isto, "dolar" e "ouro" não achavam nada — e são duas das
// buscas mais prováveis de quem está começando.
const APELIDOS = {
  "USDBRL=X": ["dolar", "dólar", "usd", "real"],
  "GC=F": ["ouro", "gold"],
  "SI=F": ["prata", "silver"],
  "CL=F": ["petroleo", "petróleo", "oil"],
  "^BVSP": ["ibov", "ibovespa", "bolsa"],
  "BTC-USD": ["bitcoin", "btc"],
  "ETH-USD": ["ethereum", "eth"],
};

function pontuacao(ativo, termo) {
  const t = termo.toLowerCase().trim();
  if (!t) return 0;
  const simbolo = (ativo.simbolo || "").toLowerCase();
  const ticker = (ativo.ticker || "").toLowerCase();
  const nome = (ativo.nome || "").toLowerCase();

  if (simbolo === t || ticker === t) return 100;                 // exato
  if (simbolo.startsWith(t) || ticker.startsWith(t)) return 80;  // prefixo
  if (nome.startsWith(t)) return 60;
  if ((APELIDOS[ativo.ticker] || []).some((a) => a.startsWith(t))) return 55;
  if (simbolo.includes(t) || ticker.includes(t)) return 40;
  if (nome.includes(t)) return 30;
  return 0;
}

/**
 * Ordena por relevância e corta no limite.
 *
 * Empate vai pro nome mais curto: entre "Vale ON" e "Vale Indicadores
 * Ltda", quem procurou "vale" quase sempre quer o primeiro.
 */
export function ordenarPorRelevancia(resultados = [], termo = "", limite = 20) {
  if (!termo.trim()) return resultados.slice(0, limite);
  return resultados
    .map((a) => ({ a, p: pontuacao(a, termo) }))
    .filter((x) => x.p > 0)
    .sort((x, y) => y.p - x.p || (x.a.nome || "").length - (y.a.nome || "").length)
    .map((x) => x.a)
    .slice(0, limite);
}

/** Mantém só os ativos da categoria escolhida. */
export function filtrarPorCategoria(resultados = [], categoria = "todos") {
  if (categoria === "todos") return resultados;
  return resultados.filter((a) => categoriaDoAtivo(a) === categoria);
}

// O que aparece quando o campo está vazio: os mais procurados por quem
// está começando no Brasil. Lista vazia seria um convite a fechar.
export const SUGESTOES = [
  "VALE3.SA", "PETR4.SA", "ITUB4.SA", "BBDC4.SA", "BBAS3.SA",
  "BTC-USD", "ETH-USD", "SOL-USD",
  "GC=F", "USDBRL=X", "^BVSP",
];

/** As sugestões, na ordem acima, a partir do catálogo que já veio. */
export function sugestoesDoMercado(mercado = []) {
  return SUGESTOES
    .map((tk) => mercado.find((m) => m.ticker === tk))
    .filter(Boolean);
}

/** Iniciais do círculo colorido, quando não há logo. */
export function iniciaisDoAtivo(ativo) {
  const base = (ativo?.simbolo || ativo?.ticker || "?").replace(/[^A-Za-z0-9]/g, "");
  return (base.slice(0, 2) || "?").toUpperCase();
}
