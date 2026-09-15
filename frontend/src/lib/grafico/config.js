// Painel de padrões (OCO/Topo Duplo/Suporte-Resistência) escondido pro
// primeiro grupo de teste — não está pronto pra eles verem ainda. Um
// flag só, fácil de religar quando decidir trazer de volta.
export const PAINEL_PADROES_ATIVO = false;

export const TOOLS=[
  // GRÁTIS
  {id:"oco",           name:"Ombro-Cabeça-Ombro", type:"Reversão",    free:true,  plano:"free"},
  {id:"tri_simetrico", name:"Triângulo Simétrico", type:"Continuação", free:true,  plano:"free"},
  {id:"topo_duplo",    name:"Topo Duplo",          type:"Reversão",    free:true,  plano:"free"},
  {id:"suporte",       name:"Suporte",             type:"Nível",       free:true,  plano:"free"},
  {id:"resistencia",   name:"Resistência",         type:"Nível",       free:true,  plano:"free"},
  // PREMIUM
  {id:"bandeira_alta",   name:"Bandeira de Alta",      type:"Continuação", free:false, plano:"premium"},
  {id:"bandeira_baixa",  name:"Bandeira de Baixa",     type:"Continuação", free:false, plano:"premium"},
  {id:"tri_descendente", name:"Triângulo Descendente", type:"Continuação", free:false, plano:"premium"},
  {id:"tri_ascendente",  name:"Triângulo",             type:"Continuação", free:false, plano:"premium"},
  {id:"cunha",           name:"Cunha",                 type:"Reversão",    free:false, plano:"premium"},
  {id:"retangulo",       name:"Retângulo",             type:"Continuação", free:false, plano:"premium"},
];

// "max" no 1D e 1S (não "5y"/"1y"): os padrões marcados no admin (OCO/Topo
// Duplo/S-R) vêm de qualquer ponto do histórico do ativo, às vezes lá em
// 2000 — com um período curto o candle do padrão simplesmente não entra na
// janela carregada e resolverPadroesPorTimestamp descarta ele em silêncio.
// 60m: Yahoo Finance só libera ~2 anos de candle de hora em hora (limite da
// fonte de dado, não nosso) — por isso "2y", não "max". Os padrões marcados
// no admin hoje são todos timeframe="1d" (/padroes-marcados filtra por
// timeframe no banco), então no 60m e no 1S eles não aparecem — comportamento
// limpo (nenhum padrão), não "alguns sumindo por estarem fora da janela".
export const TFS=[
  {label:"60m", periodo:"2y",  intervalo:"60m"},
  {label:"1D",  periodo:"max", intervalo:"1d"},
  {label:"1S",  periodo:"max", intervalo:"1wk"},
];

export const INDICADORES = [
  {id:"sma20",  label:"SMA 20",             cor:"#F5A623", grupo:"Médias Móveis"},
  {id:"sma100", label:"SMA 100",             cor:"#9B6DFF", grupo:"Médias Móveis"},
  {id:"sma200", label:"SMA 200",             cor:"#3D7EFF", grupo:"Médias Móveis"},
  {id:"bb",     label:"Bandas de Bollinger", cor:"#00D68F", grupo:"Volatilidade"},
  {id:"atr",    label:"ATR",                cor:"#F5A623", grupo:"Volatilidade"},
  {id:"rsi",         label:"RSI",         cor:"#3D7EFF", grupo:"Osciladores"},
  {id:"estocastico", label:"Estocástico", cor:"#9B6DFF", grupo:"Osciladores"},
  {id:"vwap",      label:"VWAP",          cor:"#F5A623", grupo:"Volume"},
  {id:"volume_ma", label:"Volume médio",  cor:"#00D68F", grupo:"Volume"},
  {id:"obv",       label:"OBV",           cor:"#9B6DFF", grupo:"Volume"},
];

// Ferramentas de desenho — botão/dropdown próprio na toolbar, separado do
// de Indicadores (ver ChartPane). Fibonacci usa o mecanismo antigo
// (toggleTool/activeTools, igual antes); as outras 4 usam `ferramentaAtiva`
// (ver FERRAMENTA_INFO/CandleChart) — o dropdown sabe qual usar pelo
// `desenho:true`.
export const FERRAMENTAS_DESENHO_LISTA = [
  {id:"trend",      label:"Linha de Tendência", cor:"#2962FF", icone:"⟋", desenho:true},
  {id:"horizontal", label:"Linha Horizontal",   cor:"#2962FF", icone:"➖", desenho:true},
  {id:"fibo",       label:"Fibonacci",          cor:"#F5A623", icone:"Φ"},
  {id:"retangulo_desenho", label:"Retângulo",   cor:"#2962FF", icone:"▭", desenho:true},
  {id:"canal",      label:"Canal Paralelo",     cor:"#2962FF", icone:"∥", desenho:true},
  {id:"texto",      label:"Texto",              cor:"#2962FF", icone:"T", desenho:true},
];

// Legenda dos indicadores ativos (canto superior esquerdo do gráfico, estilo
// TradingView) — junta os dois catálogos (indicadores técnicos + padrões de
// gráfico) já que os dois ligam/desligam pelo mesmo Set `tools`. Padrões não
// têm cor fixa (variam com o resultado no próprio desenho), então usam um
// cinza neutro só pra bolinha da legenda.
export const LEGENDA_ITENS = [
  ...INDICADORES.map(i => ({ id: i.id, label: i.label, cor: i.cor })),
  ...TOOLS.map(t => ({ id: t.id, label: t.name, cor: "#8B949E" })),
  // Fibonacci não está mais em INDICADORES (ganhou botão próprio de
  // Ferramentas de Desenho), mas continua ligando/desligando pelo mesmo
  // Set `tools` — sem essa linha ele sumia da legenda do gráfico.
  { id:"fibo", label:"Fibonacci", cor:"#F5A623" },
];
