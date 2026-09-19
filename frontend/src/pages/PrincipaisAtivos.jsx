import { useEffect, useRef, useState } from "react";
import { ColorType, CrosshairMode, LineSeries, createChart } from "lightweight-charts";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import { API } from "../lib/api.js";
import { fmtP } from "../lib/mercado.js";
import { BadgeMkt3, IconeAtivoMkt3, LinhaAtivoMkt3, SeloEstimadoMkt3, VariacaoMkt3 } from "./MercadosOverview.jsx";

// ── Página Principais Ativos — gráfico comparativo (rota /principais-ativos) ──
const COMPARATIVO_ATIVOS = [
  { ticker:"^BVSP",    nome:"Ibovespa",   badge:"IBOV",    letra:"I", cor:"#2962FF", prefixo:"",   unidade:"pts" },
  { ticker:"BTC-USD",  nome:"Bitcoin",    badge:"BTC",     letra:"B", cor:"#F7931A", prefixo:"$",  unidade:null },
  { ticker:"GC=F",     nome:"Ouro",       badge:"GC1!",    letra:"O", cor:"#D4AF37", prefixo:"$",  unidade:null },
  { ticker:"^IXIC",    nome:"Nasdaq",     badge:"IXIC",    letra:"N", cor:"#26A69A", prefixo:"",   unidade:"pts" },
  { ticker:"USDBRL=X", nome:"USD/BRL", badge:"USD/BRL", letra:"$", cor:"#9B6DFF", prefixo:"R$", unidade:null },
];
const PERIODOS_COMPARATIVO = ["1M","3M","6M","1A","YTD"];
const INDICES_GLOBAIS_FOOTER = [
  { ticker:"^GSPC",  nome:"S&P 500",    badge:"SPX",  letra:"S", cor:"#3D7EFF", mockBase:5580  },
  { ticker:"^NDX",   nome:"Nasdaq 100", badge:"NDX",  letra:"N", cor:"#9B6DFF", mockBase:19600 },
  { ticker:"^DJI",   nome:"Dow 30",     badge:"DJI",  letra:"D", cor:"#26A69A", mockBase:40200 },
  { ticker:"^N225",  nome:"Japão 225",  badge:"N225", letra:"J", cor:"#EF5350", mockBase:38800 },
  { ticker:"^FTSE",  nome:"FTSE 100",   badge:"FTSE", letra:"F", cor:"#F5A623", mockBase:8200  },
  { ticker:"^GDAXI", nome:"DAX",        badge:"DAX",  letra:"D", cor:"#E8B84B", mockBase:18500 },
];

function _cutoffComparativo(periodo){
  const agora = new Date();
  if(periodo==="YTD") return new Date(agora.getFullYear(),0,1).getTime();
  const dias = { "1M":30, "3M":90, "6M":180, "1A":365 }[periodo] || 180;
  return agora.getTime() - dias*86400000;
}

// Busca candles de vários tickers em lote; qualquer um que faltar na
// resposta (Yahoo às vezes derruba UM ticker específico quando várias
// buscas rodam em paralelo no mesmo lote — mesmo comportamento já visto
// nos cards do dashboard, ver fetcher.py) ganha uma segunda tentativa
// individual, fora do lote, antes de desistir.
async function _fetchCandlesComRetry(tickers, periodo, intervalo){
  const resp = await fetch(`${API}/ativos/batch?tickers=${encodeURIComponent(tickers.join(","))}&periodo=${periodo}&intervalo=${intervalo}`).then(r=>r.json()).catch(()=>null);
  const mapa = {};
  const faltando = [];
  for(const t of tickers){
    const r = (resp?.resultados||[]).find(x=>x.ticker?.toUpperCase()===t.toUpperCase());
    if(r?.status==="ok" && r.candles?.length) mapa[t] = r.candles;
    else faltando.push(t);
  }
  if(faltando.length){
    const retries = await Promise.all(faltando.map(t=>
      fetch(`${API}/ativo/${encodeURIComponent(t)}?periodo=${periodo}&intervalo=${intervalo}`).then(r=>r.json()).catch(()=>null)
    ));
    faltando.forEach((t,i)=>{ if(retries[i]?.candles?.length) mapa[t] = retries[i].candles; });
  }
  return mapa;
}

function _prngSeed(str){ let h=0; for(let i=0;i<str.length;i++) h = Math.imul(31,h)+str.charCodeAt(i)|0; return h>>>0; }
function _mulberry32(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed>>>15, 1 | seed);
    t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
    return ((t ^ t>>>14)>>>0) / 4294967296;
  };
}

// TODO: só entra em ação se um ativo continuar sem dado mesmo depois da
// retentativa individual em `_fetchCandlesComRetry` — não é fonte de
// mercado real, é só pra a linha não sumir do gráfico comparativo (o
// usuário vê o selo "ESTIMADO" nesse caso, tanto no toggle quanto na lista).
function _gerarSerieMockComparativo(ticker, pontos=60){
  const rnd = _mulberry32(_prngSeed(ticker));
  const agora = Date.now();
  let valor = 0;
  const serie = [];
  for(let i=0;i<pontos;i++){
    valor += (rnd()-0.5) * 1.4;
    serie.push({ time: Math.floor((agora-(pontos-i)*86400000)/1000), value: Number(valor.toFixed(2)) });
  }
  return serie;
}

function _gerarMockIndiceFooter(cfg){
  const rnd = _mulberry32(_prngSeed(cfg.ticker));
  return { preco: cfg.mockBase, variacaoPct: Number(((rnd()-0.5)*4).toFixed(2)), mock:true };
}

// Gráfico de múltiplas linhas sobrepostas (Lightweight Charts) — cada
// ativo é uma LineSeries própria na mesma escala (%), pra poder comparar
// ativos com preços muito diferentes lado a lado. Séries desligadas nos
// toggles são removidas do chart (não só escondidas) pra não pesar o fit.
function ComparativoChart({ series, config, ligados, selecionado, tema }){
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRefs = useRef({});

  useEffect(()=>{
    if(!containerRef.current) return;
    chartRef.current = createChart(containerRef.current, {
      layout:{ background:{type:ColorType.Solid,color:"transparent"}, textColor:"#5A7299", fontFamily:"JetBrains Mono", fontSize:10 },
      grid:{ vertLines:{color:"rgba(255,255,255,.03)"}, horzLines:{color:"rgba(255,255,255,.03)"} },
      crosshair:{ mode:CrosshairMode.Normal, vertLine:{color:"rgba(200,216,247,.2)",labelBackgroundColor:"#3D7EFF"}, horzLine:{color:"rgba(200,216,247,.2)",labelBackgroundColor:"#3D7EFF"} },
      rightPriceScale:{ borderColor:"rgba(255,255,255,.06)", textColor:"#5A7299" },
      timeScale:{ borderColor:"rgba(255,255,255,.06)", textColor:"#5A7299", timeVisible:true, rightOffset:8 },
      localization:{ priceFormatter:v=>`${v>=0?"+":""}${v.toFixed(2)}%` },
      handleScroll:false, handleScale:false,
    });
    const ro = new ResizeObserver(()=>{
      if(chartRef.current && containerRef.current){
        chartRef.current.applyOptions({ width:containerRef.current.clientWidth, height:containerRef.current.clientHeight });
      }
    });
    ro.observe(containerRef.current);
    return ()=>{ ro.disconnect(); chartRef.current?.remove(); chartRef.current=null; seriesRefs.current={}; };
  },[]);

  // Troca de tema: só reestiliza via applyOptions, nunca recria o chart.
  useEffect(()=>{
    if(!chartRef.current) return;
    const claro = tema==="light";
    const corTexto = claro ? "#5B6B84" : "#5A7299";
    const corGrid  = claro ? "rgba(15,23,32,.05)" : "rgba(255,255,255,.03)";
    const corBorda = claro ? "rgba(15,23,32,.10)" : "rgba(255,255,255,.06)";
    const corCross = claro ? "rgba(47,111,239,.25)" : "rgba(200,216,247,.2)";
    chartRef.current.applyOptions({
      layout:{ textColor: corTexto },
      grid:{ vertLines:{ color: corGrid }, horzLines:{ color: corGrid } },
      crosshair:{ vertLine:{ color: corCross }, horzLine:{ color: corCross } },
      rightPriceScale:{ borderColor: corBorda, textColor: corTexto },
      timeScale:{ borderColor: corBorda, textColor: corTexto },
    });
  },[tema]);

  useEffect(()=>{
    if(!chartRef.current) return;
    for(const cfg of config){
      const dados = series[cfg.ticker];
      const mostrar = ligados.has(cfg.ticker) && dados?.length>1;
      let s = seriesRefs.current[cfg.ticker];
      if(mostrar){
        if(!s){
          s = chartRef.current.addSeries(LineSeries, {
            lineWidth: 2, priceLineVisible:false, lastValueVisible:true, title: cfg.badge,
          });
          seriesRefs.current[cfg.ticker] = s;
        }
        s.setData(dados);
        const destacada = !selecionado || selecionado===cfg.ticker;
        s.applyOptions({
          color: destacada ? cfg.cor : cfg.cor+"33",
          lineWidth: selecionado===cfg.ticker ? 3 : 2,
        });
      } else if(s){
        chartRef.current.removeSeries(s);
        delete seriesRefs.current[cfg.ticker];
      }
    }
    chartRef.current.timeScale().fitContent();
  },[series, config, ligados, selecionado]);

  return <div ref={containerRef} style={{position:"absolute",inset:0}}/>;
}

function PaginaPrincipaisAtivosComparativo({ tema, abrirAtivo }){
  const [candles, setCandles] = useState({});
  const [mockTickers, setMockTickers] = useState(new Set());
  const [footer, setFooter] = useState({});
  const [ligados, setLigados] = useState(()=>new Set(COMPARATIVO_ATIVOS.map(a=>a.ticker)));
  const [periodo, setPeriodo] = useState("6M");
  const [selecionado, setSelecionado] = useState(null);

  useEffect(()=>{
    let cancelado = false;
    _fetchCandlesComRetry(COMPARATIVO_ATIVOS.map(a=>a.ticker), "2y", "1d").then(mapa=>{
      if(cancelado) return;
      const faltando = new Set(COMPARATIVO_ATIVOS.map(a=>a.ticker).filter(t=>!mapa[t]?.length));
      setCandles(mapa);
      setMockTickers(faltando);
    });
    return ()=>{ cancelado = true; };
  },[]);

  useEffect(()=>{
    let cancelado = false;
    _fetchCandlesComRetry(INDICES_GLOBAIS_FOOTER.map(a=>a.ticker), "1mo", "1d").then(mapa=>{
      if(cancelado) return;
      const out = {};
      for(const cfg of INDICES_GLOBAIS_FOOTER){
        const c = mapa[cfg.ticker];
        if(c?.length){
          const primeiro=c[0].fechamento, ultimo=c[c.length-1].fechamento;
          out[cfg.ticker] = { preco:ultimo, variacaoPct: primeiro?((ultimo-primeiro)/primeiro)*100:0 };
        } else {
          out[cfg.ticker] = _gerarMockIndiceFooter(cfg);
        }
      }
      setFooter(out);
    });
    return ()=>{ cancelado = true; };
  },[]);

  const cutoff = _cutoffComparativo(periodo);
  const seriesNormalizadas = {};
  const variacaoAtual = {};
  const precoAtual = {};
  for(const cfg of COMPARATIVO_ATIVOS){
    if(mockTickers.has(cfg.ticker)){
      const serieMock = _gerarSerieMockComparativo(cfg.ticker);
      seriesNormalizadas[cfg.ticker] = serieMock;
      variacaoAtual[cfg.ticker] = serieMock[serieMock.length-1]?.value ?? 0;
      continue;
    }
    const raw = candles[cfg.ticker];
    if(!raw?.length) continue;
    const janela = raw.filter(c=>c.timestamp>=cutoff);
    const usavel = janela.length>1 ? janela : raw.slice(-2);
    if(usavel.length<2) continue;
    const base = usavel[0].fechamento;
    seriesNormalizadas[cfg.ticker] = usavel.map(c=>({ time:Math.floor(c.timestamp/1000), value: base ? Number((((c.fechamento/base)-1)*100).toFixed(2)) : 0 }));
    const ultimo = usavel[usavel.length-1];
    variacaoAtual[cfg.ticker] = base ? ((ultimo.fechamento/base)-1)*100 : 0;
    precoAtual[cfg.ticker] = ultimo.fechamento;
  }

  const carregando = Object.keys(candles).length===0 && mockTickers.size===0;

  return (
    <div className="home">
      <div className="sh" style={{marginTop:8}}>
        <span className="st" style={{fontSize:18}}>Principais Índices</span>
      </div>

      <div className="pa-grid">
        {/* ESQUERDA — gráfico comparativo, normalizado em % */}
        <div className="card" style={{padding:20,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:14}}>
            <div className="pa-toggle-row">
              {COMPARATIVO_ATIVOS.map(cfg=>{
                const on = ligados.has(cfg.ticker);
                return (
                  <button
                    key={cfg.ticker}
                    className={`pa-toggle ${on?"on":""}`}
                    style={on?{borderColor:cfg.cor,color:cfg.cor}:{}}
                    onClick={()=>setLigados(prev=>{
                      const next = new Set(prev);
                      if(next.has(cfg.ticker)) next.delete(cfg.ticker); else next.add(cfg.ticker);
                      return next;
                    })}
                  >
                    <span className="pa-dot" style={{background:cfg.cor,opacity:on?1:.35}}/>
                    {cfg.badge}
                    {mockTickers.has(cfg.ticker) && <SeloEstimadoMkt3/>}
                  </button>
                );
              })}
            </div>
            <div className="mc-tabs">
              {PERIODOS_COMPARATIVO.map(p=>(
                <button key={p} className={`mc-tab ${periodo===p?"active":""}`} onClick={()=>setPeriodo(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{position:"relative",height:400,flex:1}}>
            {carregando
              ? <SkeletonGraficoLinha/>
              : <ComparativoChart series={seriesNormalizadas} config={COMPARATIVO_ATIVOS} ligados={ligados} selecionado={selecionado} tema={tema}/>
            }
          </div>
        </div>

        {/* DIREITA — lista vertical, clicar destaca a linha no gráfico */}
        <div className="card" style={{padding:18,display:"flex",flexDirection:"column"}}>
          <span style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:4}}>Ativos</span>
          <div style={{display:"flex",flexDirection:"column"}}>
            {COMPARATIVO_ATIVOS.map(cfg=>{
              const variacao = variacaoAtual[cfg.ticker];
              const preco = precoAtual[cfg.ticker];
              const mock = mockTickers.has(cfg.ticker);
              if(variacao===undefined) return <div key={cfg.ticker} className="idx-skel" style={{height:56,marginBottom:4}}/>;
              return (
                <div
                  key={cfg.ticker}
                  onMouseEnter={()=>setSelecionado(cfg.ticker)}
                  onMouseLeave={()=>setSelecionado(null)}
                  onClick={()=>abrirAtivo({ticker:cfg.ticker})}
                  title={`Ver ${cfg.nome}`}
                  style={{
                    borderRadius:8, cursor:"pointer",
                    background: selecionado===cfg.ticker ? "var(--s2)" : "transparent",
                    boxShadow: selecionado===cfg.ticker ? `inset 2px 0 0 ${cfg.cor}` : "none",
                  }}
                >
                  <LinhaAtivoMkt3
                    letra={cfg.letra} cor={cfg.cor} nome={cfg.nome}
                    badge={mock ? `${cfg.badge} · ESTIMADO` : cfg.badge}
                    badgeFundo={cfg.cor+"1a"} badgeTexto={cfg.cor}
                    preco={mock ? "—" : cfg.prefixo+fmtP(preco)}
                    unidade={mock ? undefined : cfg.unidade}
                    variacaoPct={variacao}
                  />
                </div>
              );
            })}
          </div>
          <span
            style={{fontSize:12,color:"var(--text3)",marginTop:"auto",paddingTop:12}}
            title="Em breve"
          >Ver todos os indicadores →</span>
        </div>
      </div>

      {/* RODAPÉ — carrossel horizontal de índices globais */}
      <div>
        <div className="sh">
          <span className="st" style={{fontSize:13}}>Índices Globais</span>
        </div>
        <div className="pa-carousel">
          {INDICES_GLOBAIS_FOOTER.map(cfg=>{
            const d = footer[cfg.ticker];
            if(!d) return <div key={cfg.ticker} className="idx-skel pa-carousel-card"/>;
            return (
              <div key={cfg.ticker} className="pa-carousel-card" onClick={()=>abrirAtivo({ticker:cfg.ticker})} title={`Ver ${cfg.nome}`}>
                <div className="idx-top">
                  <IconeAtivoMkt3 letra={cfg.letra} cor={cfg.cor}/>
                  <span className="idx-name">{cfg.nome}</span>
                </div>
                <BadgeMkt3 corFundo={cfg.cor+"1a"} corTexto={cfg.cor}>{cfg.badge}{d.mock?" · ESTIMADO":""}</BadgeMkt3>
                <div className="idx-line" style={{marginTop:6}}>
                  <span className="idx-price">{fmtP(d.preco)}</span>
                  <VariacaoMkt3 pct={d.variacaoPct}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PaginaPrincipaisAtivosComparativo;
