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
// Timeframes do gráfico. O período é o máximo que a fonte dá de graça em
// cada um (ver PERIODO_MAXIMO em backend/ativos.py): pedir mais volta
// vazio, não dá erro, e o gráfico abriria em branco.
export const TFS=[
  {label:"1m",  periodo:"5d",  intervalo:"1m"},
  {label:"5m",  periodo:"60d", intervalo:"5m"},
  {label:"15m", periodo:"60d", intervalo:"15m"},
  {label:"60m", periodo:"60d", intervalo:"60m"},
  {label:"1D",  periodo:"max", intervalo:"1d"},
  {label:"1S",  periodo:"max", intervalo:"1wk"},
];

// Com qual o gráfico abre: diário, que é onde os padrões do TradeZen
// vivem. Os intraday ficam a um clique pra quem quer olhar de perto.
export const TF_PADRAO = TFS.find(t=>t.label==="1D");

export const INDICADORES = [
  {id:"sma20",  label:"SMA 20",  cor:"#F5A623", grupo:"Médias Móveis", categoria:"medias",      subgrupo:"Simples",     aliases:"media movel simples sma 20"},
  {id:"sma100", label:"SMA 100", cor:"#9B6DFF", grupo:"Médias Móveis", categoria:"medias",      subgrupo:"Simples",     aliases:"media movel simples sma 100"},
  {id:"sma200", label:"SMA 200", cor:"#3D7EFF", grupo:"Médias Móveis", categoria:"medias",      subgrupo:"Simples",     aliases:"media movel simples sma 200"},
  // EMA 9/21/50 — médias EXPONENCIAIS. Reagem mais rápido que a simples
  // porque pesam as velas recentes, e é o que a maioria usa pra swing.
  // Entram liberadas: sem elas a plataforma fica atrás de qualquer
  // concorrente gratuito.
  {id:"ema9",   label:"EMA 9",   cor:"#FF7AB6", grupo:"Médias Móveis", categoria:"medias",      subgrupo:"Exponenciais", aliases:"media movel exponencial ema 9"},
  {id:"ema21",  label:"EMA 21",  cor:"#A855F7", grupo:"Médias Móveis", categoria:"medias",      subgrupo:"Exponenciais", aliases:"media movel exponencial ema 21"},
  {id:"ema50",  label:"EMA 50",  cor:"#22D3EE", grupo:"Médias Móveis", categoria:"medias",      subgrupo:"Exponenciais", aliases:"media movel exponencial ema 50"},
  {id:"bb",     label:"Bandas de Bollinger", cor:"#00D68F", grupo:"Volatilidade", categoria:"volatilidade", subgrupo:"Bandas",  aliases:"bollinger bandas desvio padrao"},
  {id:"atr",    label:"ATR",                 cor:"#F5A623", grupo:"Volatilidade", categoria:"volatilidade", subgrupo:"Amplitude", aliases:"atr average true range amplitude"},
  {id:"rsi",         label:"RSI",         cor:"#3D7EFF", grupo:"Osciladores", categoria:"osciladores", subgrupo:"Força",   aliases:"rsi indice de força relativa sobrecompra sobrevenda"},
  {id:"estocastico", label:"Estocástico", cor:"#9B6DFF", grupo:"Osciladores", categoria:"osciladores", subgrupo:"Força",   aliases:"estocastico stochastic k d"},
  {id:"vwap",      label:"VWAP",         cor:"#F5A623", grupo:"Volume", categoria:"volume", subgrupo:"Preço médio", aliases:"vwap preco medio ponderado por volume"},
  {id:"volume_ma", label:"Volume médio", cor:"#00D68F", grupo:"Volume", categoria:"volume", subgrupo:"Fluxo",       aliases:"volume medio barras"},
  {id:"obv",       label:"OBV",          cor:"#9B6DFF", grupo:"Volume", categoria:"volume", subgrupo:"Fluxo",       aliases:"obv on balance volume acumulado"},
];

// AS ABAS DO PAINEL, e a ordem delas.
// "Todos" não entra aqui: é um caso à parte no painel (mostra o catálogo
// inteiro) e não tem indicador nenhum marcado com essa categoria.
export const CATEGORIAS_INDICADOR = [
  {id:"medias",       label:"Médias"},
  {id:"tendencia",    label:"Tendência"},
  {id:"volatilidade", label:"Volatilidade"},
  {id:"osciladores",  label:"Osciladores"},
  {id:"volume",       label:"Volume"},
];

// O QUE AINDA NÃO DESENHA
// =======================
// A matemática destes já existe (lib/grafico/indicadoresAvancados.js) e é
// testada, mas nada deles chega ao gráfico ainda: os de painel próprio
// (MACD, ADX, MFI...) precisam de sub-painel abaixo das velas, que é
// mudança de arquitetura, não de catálogo.
//
// Eles aparecem no painel DESLIGADOS, com a etiqueta "em breve", e não
// são clicáveis. A alternativa seria deixá-los clicáveis e não acontecer
// nada — pior que não listar: a pessoa clica, não vê nada e conclui que a
// plataforma está quebrada. Listado e marcado é informação; listado e
// morto é defeito.
export const INDICADORES_EM_BREVE = [
  {id:"supertrend", label:"SuperTrend",      cor:"#00D68F", categoria:"tendencia",    subgrupo:"Seguidores de tendência", aliases:"supertrend super trend stop"},
  {id:"sar",        label:"Parabolic SAR",   cor:"#F5A623", categoria:"tendencia",    subgrupo:"Seguidores de tendência", aliases:"sar parabolico parabolic stop and reverse"},
  {id:"adx",        label:"ADX",             cor:"#3D7EFF", categoria:"tendencia",    subgrupo:"Força da tendência",      aliases:"adx dmi direcional força de tendencia"},
  {id:"pivos",      label:"Pivôs do dia",    cor:"#9B6DFF", categoria:"tendencia",    subgrupo:"Níveis calculados",       aliases:"pivot point pivos suporte resistencia classico"},
  {id:"keltner",    label:"Canais de Keltner", cor:"#22D3EE", categoria:"volatilidade", subgrupo:"Bandas",               aliases:"keltner canal atr"},
  {id:"macd",       label:"MACD",            cor:"#3D7EFF", categoria:"osciladores",  subgrupo:"Momento",                 aliases:"macd convergencia divergencia media movel histograma"},
  {id:"ao",         label:"Awesome Oscillator", cor:"#00D68F", categoria:"osciladores", subgrupo:"Momento",              aliases:"awesome oscillator ao bill williams"},
  {id:"cci",        label:"CCI",             cor:"#F5A623", categoria:"osciladores",  subgrupo:"Força",                   aliases:"cci commodity channel index"},
  {id:"williams",   label:"Williams %R",     cor:"#FF7AB6", categoria:"osciladores",  subgrupo:"Força",                   aliases:"williams percent r sobrecompra"},
  {id:"mfi",        label:"MFI",             cor:"#A855F7", categoria:"volume",       subgrupo:"Fluxo",                   aliases:"mfi money flow index fluxo de dinheiro"},
  {id:"cmf",        label:"Chaikin Money Flow", cor:"#00D68F", categoria:"volume",    subgrupo:"Fluxo",                   aliases:"chaikin money flow cmf"},
  {id:"acc_dist",   label:"Acumulação/Distribuição", cor:"#9B6DFF", categoria:"volume", subgrupo:"Fluxo",                 aliases:"acumulacao distribuicao accumulation distribution ad"},
  {id:"volume_profile", label:"Volume Profile", cor:"#F5A623", categoria:"volume",    subgrupo:"Perfil",                  aliases:"volume profile perfil de volume poc"},
];

// O catálogo que o painel mostra: o que funciona primeiro, o que vem
// depois marcado. `pronto` é o que decide se o chip é clicável.
export const CATALOGO_INDICADORES = [
  ...INDICADORES.map(i => ({...i, pronto:true})),
  ...INDICADORES_EM_BREVE.map(i => ({...i, pronto:false})),
];

// Legenda dos indicadores ativos (canto superior esquerdo do gráfico, estilo
// TradingView) — junta os dois catálogos (indicadores técnicos + padrões de
// gráfico) já que os dois ligam/desligam pelo mesmo Set `tools`. Padrões não
// têm cor fixa (variam com o resultado no próprio desenho), então usam um
// cinza neutro só pra bolinha da legenda.
export const LEGENDA_ITENS = [
  ...INDICADORES.map(i => ({ id: i.id, label: i.label, cor: i.cor })),
  ...TOOLS.map(t => ({ id: t.id, label: t.name, cor: "#8B949E" })),
];
