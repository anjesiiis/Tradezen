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
// Não adianta oferecer "Fundos" ou "Futuros" como filtro: nenhum ativo
// cairia neles e a pessoa clicaria numa pílula que só esvazia a lista.
export const CATEGORIAS = [
  { id: "todos", rotulo: "Todos", mercados: null },
  { id: "acoes", rotulo: "Ações", mercados: ["B3", "NYSE", "NASDAQ"] },
  { id: "cripto", rotulo: "Cripto", mercados: ["CRIPTO"] },
  { id: "forex", rotulo: "Forex", mercados: ["FOREX"] },
  { id: "commodities", rotulo: "Commodities", mercados: ["COMMODITY"] },
  { id: "indices", rotulo: "Índices", mercados: ["INDICE"] },
];

// Cor do selo por categoria. São as do design system do app (index.css),
// não cores novas.
export const COR_DA_CATEGORIA = {
  acoes: "#00D68F",
  cripto: "#F7931A",
  forex: "#3D7EFF",
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

/** Rótulo curto do selo. */
export function rotuloDaCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id)?.rotulo || "Outros";
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
