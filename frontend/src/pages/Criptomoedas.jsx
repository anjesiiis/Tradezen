import { useEffect, useState } from "react";
import { HomeLineChart } from "../components/HomeLineChart.jsx";
import { IconeAtivo } from "../components/IconeAtivo.jsx";
import { MiniLine } from "../components/MiniLine.jsx";
import { API } from "../lib/api.js";
import { fmtP } from "../lib/mercado.js";
import { SeloEstimadoMkt3, VariacaoMkt3, fmtGrandeMkt3 } from "./MercadosOverview.jsx";

const CRYPTO_TOP4 = ["BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD"];
const CORES_CRYPTO_TOP = { "BTC-USD":"#F7931A", "ETH-USD":"#627EEA", "BNB-USD":"#F3BA2F", "XRP-USD":"#3A4048" };
// Banners da direita — criptos voláteis fora do topo-4, com espaço pra
// adicionar mais (botão "+") entre as que ainda não estão em nenhum dos
// dois lugares.
const CRYPTO_BANNER_PADRAO = ["SOL-USD", "DOGE-USD", "AVAX-USD"];
const CORES_CRYPTO_BANNER = { "SOL-USD":"#9945FF", "DOGE-USD":"#C2A633", "AVAX-USD":"#E84142", "ADA-USD":"#0033AD" };

// Página de Criptomoedas — hero estilo TradingView (cards principais +
// capitalização total + dominância + volatilidade) com a identidade visual
// do TradeZen.
function PaginaCriptomoedas({ tema, mercado, abrirAtivo }){
  const [geral, setGeral] = useState(null);

  useEffect(()=>{
    let cancelado = false;
    fetch(`${API}/mercado/visao-geral`).then(r=>r.json()).then(d=>{ if(!cancelado) setGeral(d); }).catch(()=>{});
    return ()=>{ cancelado = true; };
  },[]);

  const cripto  = geral?.cripto;
  const criptos = mercado.filter(m=>m.mercado==="CRIPTO");

  const capPositiva = (cripto?.market_cap_variacao_pct||0) >= 0;
  const marketCapSerie24h = cripto?.market_cap_serie_24h || [];

  return (
    <div className="home">
      <div className="sh" style={{marginTop:8}}>
        <span className="st" style={{fontSize:18}}>Criptomoedas</span>
      </div>

      {/* TOPO — 4 cards principais, sempre dados reais (Binance via /mercado) */}
      <div className="crypto-top-row">
        {CRYPTO_TOP4.map(tk=>{
          const a = criptos.find(c=>c.ticker===tk);
          if(!a) return <div key={tk} className="idx-skel" style={{height:96}}/>;
          const cor = CORES_CRYPTO_TOP[tk];
          return (
            <div key={tk} className="crypto-top-card" onClick={()=>abrirAtivo(a)}>
              <div className="idx-top">
                <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={cor}/>
                <span className="idx-name">{a.nome}</span>
              </div>
              <div className="idx-line">
                <span className="idx-price">${fmtP(a.preco)}</span>
                <span className={`idx-chg ${a.alta?"up":"down"}`}>{a.alta?"▲":"▼"} {Math.abs(a.variacao_pct||0).toFixed(2)}%</span>
              </div>
              <div className="crypto-top-spark"><MiniLine data={a.serie||[]} color={a.alta?"#00D68F":"#FF4560"}/></div>
            </div>
          );
        })}
      </div>

      {/* ÁREA PRINCIPAL — 70% capitalização total / 30% stablecoins+dominância+volatilidade */}
      <div className="crypto-main-grid">
        <div className="card" style={{padding:20,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>Capitalização total de mercado</span>
            <span className="crypto-badge-total">TOTAL</span>
            {cripto?.mock && <SeloEstimadoMkt3/>}
          </div>
          {cripto ? (
            <>
              <div style={{display:"flex",gap:36,flexWrap:"wrap",marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>Valor total</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:24,fontWeight:700,fontFamily:"var(--font-m)",color:"var(--text)"}}>{fmtGrandeMkt3(cripto.market_cap_usd)}</span>
                    <VariacaoMkt3 pct={cripto.market_cap_variacao_pct}/>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>Volume 24h</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:24,fontWeight:700,fontFamily:"var(--font-m)",color:"var(--text)"}}>{fmtGrandeMkt3(cripto.volume_24h_usd)}</span>
                    <VariacaoMkt3 pct={cripto.volume_24h_variacao_pct}/>
                  </div>
                </div>
              </div>
              <div style={{position:"relative",height:300,flex:1}}>
                {marketCapSerie24h.length>0
                  ? <HomeLineChart data={marketCapSerie24h} color={capPositiva?"#00D68F":"#FF4560"} tema={tema}/>
                  : <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><div className="spin"/></div>
                }
              </div>
            </>
          ) : <div className="idx-skel" style={{height:340}}/>}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Banners — cada um é 1 criptomoeda volátil, mesmo estilo dos cards do topo */}
          {CRYPTO_BANNER_PADRAO.map(tk=>{
            const a = criptos.find(c=>c.ticker===tk);
            const cor = CORES_CRYPTO_BANNER[tk] || "#8B949E";
            if(!a) return <div key={tk} className="idx-skel" style={{height:96}}/>;
            return (
              <div key={tk} className="crypto-top-card" onClick={()=>abrirAtivo(a)}>
                <div className="idx-top">
                  <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={cor}/>
                  <span className="idx-name">{a.nome}</span>
                </div>
                <div className="idx-line">
                  <span className="idx-price">${fmtP(a.preco)}</span>
                  <span className={`idx-chg ${a.alta?"up":"down"}`}>{a.alta?"▲":"▼"} {Math.abs(a.variacao_pct||0).toFixed(2)}%</span>
                </div>
                <div className="crypto-top-spark"><MiniLine data={a.serie||[]} color={a.alta?"#00D68F":"#FF4560"}/></div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{fontSize:10,color:"var(--text3)",textAlign:"right",marginTop:-8}}>Dados via Binance</div>
    </div>
  );
}

export default PaginaCriptomoedas;
