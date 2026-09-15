import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MiniLine } from "../components/MiniLine.jsx";
import { API } from "../lib/api.js";
import { fmtP } from "../lib/mercado.js";

// Página "Mercados" — todos os ativos carregados, com busca por nome/ticker
// e filtro por tipo de mercado (B3, Cripto, Forex...). Reaproveita os
// mesmos AssetCard/agrid/mc-tab já usados na home, só que sem limite de 6.
// ── Página Mercados — visão geral em 3 colunas, estilo TradingView ──────
// Cripto/USD-BRL/Commodities vêm de dados reais (mesmo endpoint /ativos/batch
// que o resto do app já usa). Market cap de cripto, dominância do Bitcoin e
// os indicadores econômicos do Brasil vêm de /mercado/visao-geral, que HOJE
// é mockado no backend (ver TODO lá) — não temos fonte de dado real pra
// isso ainda (precisaria de CoinGecko/CoinMarketCap pro market cap, e
// Trading Economics ou BCB/IBGE pros indicadores). Assim que existir,
// só troca o que o backend devolve — esse componente não muda.
const TICKERS_MKT3 = ["BTC-USD","ETH-USD","USDBRL=X","CL=F","NG=F","GC=F","HG=F"];
const CORES_ATIVO_MKT3 = { "BTC-USD":"#F7931A", "ETH-USD":"#627EEA", "GC=F":"#F5A623", "CL=F":"#8B8B8B", "NG=F":"#3D7EFF", "HG=F":"#B87333" };
const COMMODITY_INFO_MKT3 = {
  "CL=F": { nome:"Petróleo leve", badge:"CL1!", unidade:"/bbl" },
  "NG=F": { nome:"Gás natural",   badge:"NG1!", unidade:"/MMBtu" },
  "GC=F": { nome:"Ouro",          badge:"GC1!", unidade:"/oz" },
  "HG=F": { nome:"Cobre",         badge:"HG1!", unidade:"/lb" },
};

export function fmtGrandeMkt3(v){
  if(v>=1e12) return `$${(v/1e12).toFixed(2)}T`;
  if(v>=1e9)  return `$${(v/1e9).toFixed(2)}B`;
  if(v>=1e6)  return `$${(v/1e6).toFixed(2)}M`;
  return `$${(v||0).toFixed(2)}`;
}

export function IconeAtivoMkt3({ letra, cor }){
  return <div style={{width:26,height:26,borderRadius:"50%",background:cor+"26",color:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{letra}</div>;
}

export function BadgeMkt3({ children, corFundo, corTexto }){
  return <span style={{background:corFundo,color:corTexto,fontSize:10,fontFamily:"var(--font-m)",padding:"2px 7px",borderRadius:5,fontWeight:600}}>{children}</span>;
}

export function VariacaoMkt3({ pct }){
  const positivo = pct>=0;
  const cor = positivo ? "#26a69a" : "#ef5350";
  return <span style={{color:cor,fontSize:12,fontWeight:700,fontFamily:"var(--font-m)"}}>{positivo?"+":""}{pct.toFixed(2)}%</span>;
}

// Selo discreto pros blocos que ainda são mock (hoje só BR10Y, e o resto
// dos indicadores de juros/inflação só cai aqui se a API do BC estiver fora).
export function SeloEstimadoMkt3(){
  return (
    <span
      title="Ainda não temos fonte de dado real pra isso — valor de referência, não é o mercado ao vivo."
      style={{marginLeft:6,fontSize:9,fontWeight:700,letterSpacing:.3,padding:"1px 5px",borderRadius:4,background:"rgba(245,166,35,.15)",color:"#F5A623",verticalAlign:"middle"}}
    >ESTIMADO</span>
  );
}

export function LinhaAtivoMkt3({ letra, cor, nome, badge, badgeFundo, badgeTexto, preco, unidade, variacaoPct, onClick }){
  return (
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:onClick?"pointer":"default"}}>
      <IconeAtivoMkt3 letra={letra} cor={cor}/>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:3}}>
        <span style={{fontSize:12,color:"var(--text)",fontWeight:600}}>{nome}</span>
        <BadgeMkt3 corFundo={badgeFundo} corTexto={badgeTexto}>{badge}</BadgeMkt3>
      </div>
      <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:3}}>
        <span style={{fontSize:12,fontFamily:"var(--font-m)",color:"var(--text)"}}>{preco}{unidade&&<span style={{color:"var(--text2)",fontSize:10}}> {unidade}</span>}</span>
        <VariacaoMkt3 pct={variacaoPct}/>
      </div>
    </div>
  );
}

function BarraProporcaoMkt3({ segmentos }){
  return (
    <div>
      <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:10}}>
        {segmentos.map((s,i)=><div key={i} style={{width:`${s.valor}%`,background:s.cor}}/>)}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
        {segmentos.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:s.cor,flexShrink:0}}/>
            <span style={{color:"var(--text2)"}}>{s.label}</span>
            <span style={{color:"var(--text)",fontWeight:700}}>{s.valor}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBarrasMkt3({ dados, tema }){
  const max = Math.max(...dados.map(d=>d.valor), 0.01);
  const cor = tema==="light" ? "#2962FF" : "#3D7EFF";
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height:60}}>
      {dados.map((d,i)=>(
        <div key={i} title={`${d.mes}: ${d.valor}%`} style={{flex:1,height:"100%",display:"flex",alignItems:"flex-end"}}>
          <div style={{width:"100%",height:`${Math.max(6,(d.valor/max)*100)}%`,background:cor,borderRadius:2,opacity:.85}}/>
        </div>
      ))}
    </div>
  );
}

function ColunaMkt3({ titulo, corCard, corBorda, children, linkTexto, onLink }){
  return (
    <div style={{background:corCard,border:`1px solid ${corBorda}`,borderRadius:12,padding:18,display:"flex",flexDirection:"column",gap:16,minWidth:0,height:"100%"}}>
      <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{titulo}</span>
      {children}
      {linkTexto && (
        <span
          onClick={onLink}
          style={{fontSize:12,color:onLink?"var(--accent)":"var(--text3)",cursor:onLink?"pointer":"default",marginTop:"auto",paddingTop:4}}
          title={onLink?undefined:"Em breve"}
        >{linkTexto}</span>
      )}
    </div>
  );
}

function PaginaMercadosOverview({ tema, abrirAtivo, setSecao }){
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);     // ticker -> {preco, variacaoPct, serie}
  const [geral, setGeral] = useState(null);

  useEffect(()=>{
    let cancelado = false;
    Promise.all([
      fetch(`${API}/ativos/batch?tickers=${encodeURIComponent(TICKERS_MKT3.join(","))}&periodo=1mo&intervalo=1d`).then(r=>r.json()),
      fetch(`${API}/mercado/visao-geral`).then(r=>r.json()),
    ]).then(([batch, visaoGeral])=>{
      if(cancelado) return;
      const mapa = {};
      for(const r of (batch.resultados||[])){
        if(r.status!=="ok" || !r.candles?.length) continue;
        const c = r.candles;
        const primeiro = c[0].fechamento, ultimo = c[c.length-1].fechamento;
        mapa[r.ticker] = {
          preco: ultimo,
          variacaoPct: primeiro ? ((ultimo-primeiro)/primeiro)*100 : 0,
          serie: c.map(k=>({timestamp:k.timestamp, fechamento:k.fechamento})),
        };
      }
      setDados(mapa);
      setGeral(visaoGeral);
    }).catch(()=>{});
    return ()=>{ cancelado = true; };
  },[]);

  const claro = tema==="light";
  const corCard  = claro ? "#ffffff" : "#131722";
  const corBorda = claro ? "#e0e0e0" : "#2a2e39";

  const btc = dados?.["BTC-USD"], eth = dados?.["ETH-USD"], usdbrl = dados?.["USDBRL=X"];
  const cripto = geral?.cripto, econ = geral?.economia_brasil;

  return (
    <div className="home">
      <div className="sh" style={{marginTop:8}}>
        <span className="st" style={{fontSize:18}}>Mercados</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,alignItems:"stretch"}} className="mkt3-grid">

        {/* COLUNA 1 — CRIPTOMOEDAS */}
        <ColunaMkt3 titulo="Criptomoedas" corCard={corCard} corBorda={corBorda} linkTexto="Veja todas as criptomoedas >" onLink={()=>setSecao("cripto")}>
          <div>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>Valor de mercado de Cripto</div>
            {cripto ? <>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{fmtGrandeMkt3(cripto.market_cap_usd)}</span>
                <VariacaoMkt3 pct={cripto.market_cap_variacao_pct}/>
              </div>
              <div style={{position:"relative",height:64,marginTop:6}}>
                <MiniLine data={cripto.market_cap_serie} color={cripto.market_cap_variacao_pct>=0?"#26a69a":"#ef5350"}/>
              </div>
            </> : <div className="idx-skel" style={{height:90}}/>}
          </div>

          {cripto && <div>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:8}}>Dominância do Bitcoin</div>
            <BarraProporcaoMkt3 segmentos={[
              {label:"Bitcoin",  valor:cripto.dominancia.bitcoin,  cor:"#F7931A"},
              {label:"Ethereum", valor:cripto.dominancia.ethereum, cor:"#627EEA"},
              {label:"Outros",   valor:cripto.dominancia.outros,   cor:"var(--text3)"},
            ]}/>
          </div>}

          <div style={{display:"flex",flexDirection:"column"}}>
            {btc && <LinhaAtivoMkt3 letra="₿" cor={CORES_ATIVO_MKT3["BTC-USD"]} nome="Bitcoin" badge="BTCUSD" badgeFundo="rgba(247,147,26,.12)" badgeTexto="#F7931A" preco={fmtP(btc.preco)} variacaoPct={btc.variacaoPct} onClick={()=>abrirAtivo({ticker:"BTC-USD"})}/>}
            {eth && <LinhaAtivoMkt3 letra="Ξ" cor={CORES_ATIVO_MKT3["ETH-USD"]} nome="Ethereum" badge="ETHUSD" badgeFundo="rgba(98,126,234,.12)" badgeTexto="#627EEA" preco={fmtP(eth.preco)} variacaoPct={eth.variacaoPct} onClick={()=>abrirAtivo({ticker:"ETH-USD"})}/>}
            {!btc && !eth && <div className="idx-skel" style={{height:56}}/>}
          </div>
        </ColunaMkt3>

        {/* COLUNA 2 — CÂMBIO E COMMODITIES */}
        <ColunaMkt3 titulo="Câmbio e Commodities" corCard={corCard} corBorda={corBorda} linkTexto="Ver todos os futuros >" onLink={()=>navigate("/principais-ativos")}>
          <div>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>USD para BRL</div>
            {usdbrl ? <>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{fmtP(usdbrl.preco)}</span>
                <VariacaoMkt3 pct={usdbrl.variacaoPct}/>
              </div>
              <div style={{position:"relative",height:64,marginTop:6}}>
                <MiniLine data={usdbrl.serie.map(s=>s.fechamento)} color={usdbrl.variacaoPct>=0?"#26a69a":"#ef5350"}/>
              </div>
            </> : <div className="idx-skel" style={{height:90}}/>}
          </div>

          <div style={{display:"flex",flexDirection:"column"}}>
            {["CL=F","NG=F","GC=F","HG=F"].map(tk=>{
              const d = dados?.[tk];
              const info = COMMODITY_INFO_MKT3[tk];
              if(!d) return <div key={tk} className="idx-skel" style={{height:56,marginBottom:4}}/>;
              return (
                <LinhaAtivoMkt3
                  key={tk}
                  letra={info.nome[0]} cor={CORES_ATIVO_MKT3[tk]}
                  nome={info.nome} badge={info.badge}
                  badgeFundo={claro?"#f0f0f0":"#1e222d"} badgeTexto="var(--text2)"
                  preco={"$"+fmtP(d.preco)} unidade={info.unidade}
                  variacaoPct={d.variacaoPct}
                  onClick={()=>abrirAtivo({ticker:tk})}
                />
              );
            })}
          </div>
        </ColunaMkt3>

        {/* COLUNA 3 — INDICADORES ECONÔMICOS (mock — ver comentário no backend) */}
        <ColunaMkt3 titulo="Indicadores Econômicos" corCard={corCard} corBorda={corBorda} linkTexto="Ver todos os indicadores econômicos >" onLink={null}>
          <div>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>
              Brasil 10A yield <span style={{opacity:.6}}>(BR10Y)</span>
              {econ?.yield_10a?.mock && <SeloEstimadoMkt3/>}
            </div>
            {econ ? <>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{econ.yield_10a.valor.toFixed(2)}%</span>
                <VariacaoMkt3 pct={econ.yield_10a.variacao_pct}/>
              </div>
              <div style={{position:"relative",height:64,marginTop:6}}>
                <MiniLine data={econ.yield_10a.serie} color={econ.yield_10a.variacao_pct>=0?"#26a69a":"#ef5350"}/>
              </div>
            </> : <div className="idx-skel" style={{height:90}}/>}
          </div>

          {econ && <div>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:8}}>Taxa de inflação anual do Brasil <span style={{opacity:.6}}>(BRIRYY)</span></div>
            <MiniBarrasMkt3 dados={econ.inflacao_mensal.dados} tema={tema}/>
          </div>}

          {econ && <div>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:8}}>Taxa de juros do Brasil{econ.juros.mock && <SeloEstimadoMkt3/>}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:9,color:"var(--text3)",marginBottom:2}}>Real</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{econ.juros.atual}%</div>
              </div>
              <div>
                <div style={{fontSize:9,color:"var(--text3)",marginBottom:2}}>Previsão</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{econ.juros.previsao}%</div>
              </div>
              <div>
                <div style={{fontSize:9,color:"var(--text3)",marginBottom:2}}>Próx. lançamento</div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{(()=>{ const [a,m,d]=econ.juros.proximo_lancamento.split("-"); return `${d}/${m}/${a}`; })()}</div>
              </div>
            </div>
          </div>}
        </ColunaMkt3>

      </div>
    </div>
  );
}

export default PaginaMercadosOverview;
