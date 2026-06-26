import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter, useNavigate, useLocation } from "react-router-dom";
import { createChart, ColorType, CrosshairMode, LineStyle, AreaSeries, LineSeries, CandlestickSeries, HistogramSeries, createSeriesMarkers } from "lightweight-charts";

const API = "http://localhost:8000";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#06080F;
  --s1:#0D1117;
  --s2:#161B22;
  --card:#0D1117;
  --border:#21262D;
  --up:#00D68F;
  --down:#FF4560;
  --accent:#3D7EFF;
  --gold:#F5A623;
  --text:#E6EDF3;
  --text2:#5A7299;
  --text3:#8B949E;
  --pro:#9B6DFF;
  --font-h:'Bebas Neue',sans-serif;
  --font-b:'DM Sans',sans-serif;
  --font-m:'JetBrains Mono',monospace;
  --r:10px;
}
html,body,#root{height:100%;width:100%;background:var(--bg);color:var(--text);font-family:var(--font-b);overflow:hidden;max-width:none!important}
#root{display:flex;flex-direction:column}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* NAV */
.nav{height:52px;display:flex;align-items:center;gap:20px;padding:0 28px;border-bottom:1px solid var(--border);background:var(--s1);flex-shrink:0;z-index:200;position:relative}
.logo{font-family:var(--font-h);font-size:22px;letter-spacing:3px;color:#fff;cursor:pointer;user-select:none}
.logo span{color:var(--accent)}
/* SEARCH BAR */
.search{flex:1;max-width:440px;position:relative;display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 14px;transition:border-color .2s}
.search:focus-within{border-color:var(--accent)}
.search-ic{color:var(--text2);font-size:15px}
.search input{background:none;border:none;outline:none;color:var(--text);font-family:var(--font-m);font-size:12px;flex:1;min-width:0}
.search input::placeholder{color:var(--text2)}
.search-dd{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--s1);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:300;overflow:hidden;max-height:380px;overflow-y:auto}
.search-item{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s}
.search-item:last-child{border-bottom:none}
.search-item.hi,.search-item:hover{background:var(--s2)}
.sbox{flex:1;max-width:440px;position:relative}
.sw{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:7px 14px;transition:border-color .2s}
.sw:focus-within{border-color:var(--accent)}
.sw input{background:none;border:none;outline:none;color:var(--text);font-family:var(--font-m);font-size:12px;flex:1;min-width:0}
.sw input::placeholder{color:var(--text2)}
.sc{background:none;border:none;color:var(--text2);cursor:pointer;font-size:13px;padding:0 2px}
.sdrop{position:absolute;top:calc(100% + 8px);left:0;right:0;background:var(--s1);border:1px solid var(--border);border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.8);z-index:500;max-height:380px;overflow-y:auto}
.sst{font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text2);text-transform:uppercase;padding:10px 14px 6px;background:var(--s2);border-bottom:1px solid var(--border);position:sticky;top:0}
.si{display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;transition:background .15s;border-bottom:1px solid var(--border)}
.si:hover,.si.hl{background:rgba(61,126,255,.08)}
.sic{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.sinf{flex:1;min-width:0}
.sitk{font-family:var(--font-m);font-size:12px;color:var(--text);font-weight:600}
.sinm{font-size:10px;color:var(--text2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sempty{padding:24px;text-align:center;font-size:12px;color:var(--text2)}
.nav-r{display:flex;align-items:center;gap:10px;margin-left:auto}
.btn-in{background:none;border:1px solid var(--border);color:var(--text3);font-size:12px;padding:6px 16px;border-radius:7px;cursor:pointer;transition:all .2s;font-family:var(--font-b)}
.btn-in:hover{border-color:var(--accent);color:var(--text)}
.btn-pr{background:linear-gradient(135deg,#3D7EFF,#9B6DFF);border:none;color:#fff;font-weight:700;font-size:12px;padding:6px 18px;border-radius:7px;cursor:pointer;font-family:var(--font-b)}

/* HOME */
.home{height:calc(100vh - 52px);overflow-y:auto;padding:24px 40px 48px;display:flex;flex-direction:column;gap:24px;width:100%;max-width:none}
@media (min-width:1600px){.home{padding:24px 60px 48px}}
@media (min-width:2000px){.home{padding:24px 80px 48px}}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.st{font-size:13px;font-weight:600;color:var(--text)}
.sl{font-size:11px;color:var(--accent);cursor:pointer}
.sl:hover{text-decoration:underline}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}

/* ESTUDO DE MERCADO */
.mc{padding:20px 24px 0;position:relative;z-index:2}
.mc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0;gap:16px}
.mc-label{font-size:10px;font-weight:600;letter-spacing:1px;color:var(--text2);text-transform:uppercase;margin-bottom:6px;display:block}
.mc-price{font-size:32px;font-weight:700;color:var(--text);font-family:var(--font-m);letter-spacing:-1px;line-height:1}
.mc-cur{font-size:13px;color:var(--text2);margin-left:8px;font-weight:400}
.mc-chg{font-size:12px;padding:3px 10px;border-radius:6px;margin-top:8px;display:inline-block;font-weight:600}
.mc-tabs{display:flex;gap:6px;flex-shrink:0}
.mc-tab{background:none;border:1px solid var(--border);color:var(--text2);font-size:11px;font-family:var(--font-m);padding:4px 12px;border-radius:6px;cursor:pointer;transition:all .2s}
.mc-tab.active{background:var(--accent);border-color:var(--accent);color:#fff}
.mc-chart{height:380px;position:relative;width:100%}
@media (min-width:1600px){.mc-chart{height:460px}}

/* ASSET GRID — 6 colunas preenchendo toda a largura disponível */
.agrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;width:100%}

/* TOOLBAR ANALYSIS — novos elementos */
.abtn{background:var(--s2);border:1px solid var(--border);color:var(--text);font-size:11px;font-family:var(--font-m);padding:6px 12px;border-radius:6px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:4px;position:relative;white-space:nowrap}
.abtn:hover{background:var(--s1);border-color:var(--accent)}
.badge{background:var(--accent);color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:4px;font-weight:700}
.dropdown{position:absolute;top:calc(100% + 6px);left:0;background:var(--s1);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:50;overflow:hidden}
.dd-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:pointer;font-size:11px;color:var(--text);border-bottom:1px solid var(--border);gap:8px;transition:background .15s}
.dd-item:hover{background:var(--s2)}
.dd-item:last-child{border-bottom:none}

/* FULLSCREEN */
.analysis.fullscreen .abody .achart{width:100%}
.analysis.fullscreen .rpanel{display:none}

.ac{background:var(--s2);border:1px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;transition:all .2s;overflow:hidden}
.ac:hover{border-color:rgba(61,126,255,.4);transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.ac-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.ac-ic{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.ac-chg{font-size:10px;padding:2px 7px;border-radius:5px;font-weight:700}
.ac-tk{font-family:var(--font-h);font-size:17px;letter-spacing:1px;color:var(--text);line-height:1;margin-bottom:3px}
.ac-nm{font-size:9px;color:var(--text2);margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-pr{font-family:var(--font-m);font-size:12px;color:var(--text);font-weight:600}
.ac-mini{height:44px;position:relative;margin-top:8px}
.bup{background:rgba(0,214,143,.12);color:var(--up)}
.bdn{background:rgba(255,69,96,.12);color:var(--down)}
.up{color:var(--up)}.dn{color:var(--down)}

/* TICKER */
.tbar{position:fixed;bottom:0;left:0;right:0;height:26px;background:var(--s1);border-top:1px solid var(--border);display:flex;align-items:center;overflow:hidden;z-index:100}
.tbl{padding:0 14px;font-size:9px;font-weight:700;letter-spacing:2px;color:var(--accent);text-transform:uppercase;flex-shrink:0;border-right:1px solid var(--border);height:100%;display:flex;align-items:center}
.tscroll{display:flex;align-items:center;animation:scl 60s linear infinite;white-space:nowrap}
@keyframes scl{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ti{display:flex;align-items:center;gap:6px;padding:0 18px;border-right:1px solid var(--border);height:26px;font-size:10px;font-family:var(--font-m)}
.tn{color:var(--text3)}

/* ANALYSIS */
.analysis{display:flex;flex-direction:column;height:calc(100vh - 52px);min-width:960px}
.atb{height:44px;display:flex;align-items:center;gap:10px;padding:0 20px;border-bottom:1px solid var(--border);background:var(--s1);flex-shrink:0;overflow-x:auto}
.bbtn{background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:2px 8px 2px 0;line-height:1}
.bbtn:hover{color:var(--text)}
.atick{font-family:var(--font-h);font-size:21px;letter-spacing:2px;color:#fff;flex-shrink:0}
.apr{font-family:var(--font-m);font-size:14px;color:var(--text);flex-shrink:0}
.achg{font-size:11px;padding:2px 8px;border-radius:5px;flex-shrink:0;font-weight:700}
.tfg{display:flex;gap:4px;margin-left:10px;flex-shrink:0}
.tfb{background:none;border:1px solid var(--border);color:var(--text2);font-family:var(--font-m);font-size:10px;padding:3px 10px;border-radius:5px;cursor:pointer;transition:all .15s}
.tfb.active,.tfb:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.sep{width:1px;height:20px;background:var(--border);margin:0 6px;flex-shrink:0}
.ohlc{display:flex;gap:14px;font-size:10px;font-family:var(--font-m);color:var(--text2);flex-shrink:0;margin-left:8px}

.abody{display:flex;flex:1;overflow:hidden}
.achart{flex:1;position:relative;background:var(--bg);overflow:hidden}

/* RIGHT PANEL */
.rpanel{width:272px;border-left:1px solid var(--border);background:var(--s1);display:flex;flex-direction:column;overflow:hidden}
.rpsec{padding:14px 16px;border-bottom:1px solid var(--border)}
.rptitle{font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text2);text-transform:uppercase;margin-bottom:10px}
.titem{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;margin-bottom:3px;cursor:pointer;transition:all .15s;border:1px solid transparent}
.titem:hover{background:rgba(61,126,255,.06);border-color:var(--border)}
.titem.active{background:rgba(61,126,255,.1);border-color:var(--accent)}
.tchk{width:16px;height:16px;border-radius:4px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px}
.titem.active .tchk{background:var(--accent);border-color:var(--accent);color:#fff}
.tinf{flex:1}
.tnm{font-size:11px;font-weight:500;color:var(--text)}
.tty{font-size:9px;color:var(--text2);margin-top:1px}
.tlock{font-size:9px;padding:2px 6px;border-radius:4px;background:rgba(155,109,255,.12);color:var(--pro);font-weight:700}
.tfree{font-size:9px;padding:2px 6px;border-radius:4px;background:rgba(0,214,143,.1);color:var(--up);font-weight:700}
.pd{flex:1;overflow-y:auto;padding:16px}
.pde{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--text2);font-size:11px;text-align:center;line-height:1.6}
.pdn{font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px}
.pdb{display:inline-block;font-size:9px;font-weight:700;letter-spacing:1px;padding:3px 8px;border-radius:4px;margin-bottom:12px}
.pdd{font-size:11px;color:var(--text3);line-height:1.7;margin-bottom:12px}
.pds{font-size:11px;font-weight:600;padding:10px 12px;border-radius:8px;line-height:1.5;border:1px solid}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.sbox{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px}
.slbl{font-size:9px;color:var(--text2);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.sval{font-family:var(--font-m);font-size:11px;color:var(--text)}
.ld{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--bg);z-index:10}
.spin{width:32px;height:32px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.ldtxt{font-size:10px;color:var(--text2);font-family:var(--font-m);letter-spacing:2px}
.upg{margin:0 16px 16px;background:linear-gradient(135deg,rgba(61,126,255,.1),rgba(155,109,255,.1));border:1px solid rgba(155,109,255,.2);border-radius:10px;padding:14px}
.ubt{font-size:12px;font-weight:700;color:#fff;margin-bottom:4px}
.ubd{font-size:10px;color:var(--text3);line-height:1.5;margin-bottom:10px}
.ubb{width:100%;background:linear-gradient(135deg,var(--accent),var(--pro));border:none;color:#fff;font-weight:700;font-size:11px;padding:8px;border-radius:7px;cursor:pointer;letter-spacing:.5px}

/* ───────── PÁGINA DE ABERTURA ───────── */
.abertura{position:fixed;inset:0;background:var(--bg);overflow:hidden;z-index:1000}
.ab-fx{position:absolute;inset:0;z-index:0;display:block}
.ab-glow{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(60% 50% at 50% 38%,rgba(61,126,255,.10),transparent 70%),radial-gradient(40% 40% at 80% 82%,rgba(155,109,255,.08),transparent 70%)}
.ab-wrap{position:relative;z-index:2;height:100%;display:flex;flex-direction:column}
.ab-head{display:flex;align-items:center;justify-content:space-between;padding:22px 40px;flex-shrink:0}
.ab-logo{font-family:var(--font-h);font-size:24px;letter-spacing:3px;color:#fff;display:flex;align-items:center;gap:10px;user-select:none}
.ab-logo span{color:var(--accent)}
.ab-logo .ic{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--pro));display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.ab-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px 24px 60px;overflow-y:auto}
.ab-hero h1{font-family:var(--font-h);font-size:clamp(40px,7.5vw,96px);line-height:.98;font-weight:400;letter-spacing:2px;color:#fff;margin-bottom:26px;opacity:0;animation:abrise .9s ease forwards .15s}
.ab-hero h1 .l2{display:block;color:var(--accent)}
.ab-hero p{max-width:580px;font-size:clamp(15px,2vw,19px);line-height:1.55;color:var(--text3);margin-bottom:38px;opacity:0;animation:abrise .9s ease forwards .35s}
.ab-entrar{background:#fff;color:var(--bg);border:none;font-family:var(--font-b);font-size:17px;font-weight:700;padding:15px 50px;border-radius:999px;cursor:pointer;transition:transform .18s,box-shadow .18s;opacity:0;animation:abrise .9s ease forwards .55s}
.ab-entrar:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(255,255,255,.18)}
.ab-tiles{display:flex;gap:18px;margin-top:60px;flex-wrap:wrap;justify-content:center;opacity:0;animation:abrise .9s ease forwards .75s}
.ab-tile{width:132px;height:120px;background:var(--card);border:1px solid var(--border);border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:pointer;transition:transform .18s,border-color .18s,background .18s;color:var(--text3)}
.ab-tile:hover{transform:translateY(-4px);border-color:var(--accent);background:var(--s2);color:var(--text)}
.ab-tile svg{width:30px;height:30px;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ab-tile span{font-size:12px;font-weight:600;text-align:center;padding:0 6px}
@keyframes abrise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:600px){.ab-head{padding:18px 20px}.ab-tiles{gap:12px}.ab-tile{width:104px;height:104px}}
`;

const MKTC={"B3":"#009C3B","CRIPTO":"#F7931A","FOREX":"#3D7EFF","NASDAQ":"#9B6DFF","NYSE":"#E8B84B","COMMODITY":"#F5A623","—":"#5A7299"};

const TOOLS=[
  {id:"sr",           name:"Suporte e Resistência",type:"Estrutura",   free:true},
  {id:"sma20",        name:"Média Móvel 20",       type:"Tendência",   free:true},
  {id:"topo_duplo",   name:"Topo Duplo",           type:"Clássico",    free:true},
  {id:"fundo_duplo",  name:"Fundo Duplo",          type:"Clássico",    free:true},
  {id:"oco",          name:"OCO",                  type:"Clássico",    free:true},
  {id:"oco_invertido",name:"OCO Invertido",        type:"Clássico",    free:true},
  {id:"sma100",       name:"Média Móvel 100",      type:"Tendência",   free:false},
  {id:"sma200",       name:"Média Móvel 200",      type:"Tendência",   free:false},
  {id:"rsi",          name:"RSI",                  type:"Oscilador",   free:false},
  {id:"bb",           name:"Bandas de Bollinger",  type:"Volatilidade",free:false},
];

const TFS=[
  {label:"15m",periodo:"60d", intervalo:"15m"},
  {label:"60m",periodo:"2y",  intervalo:"60m"},
  {label:"1D", periodo:"5y",  intervalo:"1d"},
  {label:"1S", periodo:"5y",  intervalo:"1wk"},
];

const ATIVOS=[
  {ticker:"^BVSP",    simbolo:"IBOV",    nome:"Ibovespa",        mercado:"B3",       moeda:"BRL"},
  {ticker:"PETR4.SA", simbolo:"PETR4",   nome:"Petrobras PN",    mercado:"B3",       moeda:"BRL"},
  {ticker:"VALE3.SA", simbolo:"VALE3",   nome:"Vale ON",         mercado:"B3",       moeda:"BRL"},
  {ticker:"ITUB4.SA", simbolo:"ITUB4",   nome:"Itaú Unibanco",   mercado:"B3",       moeda:"BRL"},
  {ticker:"BBDC4.SA", simbolo:"BBDC4",   nome:"Bradesco PN",     mercado:"B3",       moeda:"BRL"},
  {ticker:"WEGE3.SA", simbolo:"WEGE3",   nome:"WEG ON",          mercado:"B3",       moeda:"BRL"},
  {ticker:"MGLU3.SA", simbolo:"MGLU3",   nome:"Magazine Luiza",  mercado:"B3",       moeda:"BRL"},
  {ticker:"BBAS3.SA", simbolo:"BBAS3",   nome:"Banco do Brasil", mercado:"B3",       moeda:"BRL"},
  {ticker:"RENT3.SA", simbolo:"RENT3",   nome:"Localiza",        mercado:"B3",       moeda:"BRL"},
  {ticker:"BTC-USD",  simbolo:"BTC",     nome:"Bitcoin",         mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"ETH-USD",  simbolo:"ETH",     nome:"Ethereum",        mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"SOL-USD",  simbolo:"SOL",     nome:"Solana",          mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"BNB-USD",  simbolo:"BNB",     nome:"Binance Coin",    mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"XRP-USD",  simbolo:"XRP",     nome:"Ripple",          mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"ADA-USD",  simbolo:"ADA",     nome:"Cardano",         mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"DOGE-USD", simbolo:"DOGE",    nome:"Dogecoin",        mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"AVAX-USD", simbolo:"AVAX",    nome:"Avalanche",       mercado:"CRIPTO",   moeda:"USD"},
  {ticker:"USDBRL=X", simbolo:"USD/BRL", nome:"Dólar / Real",    mercado:"FOREX",    moeda:"BRL"},
  {ticker:"EURUSD=X", simbolo:"EUR/USD", nome:"Euro / Dólar",    mercado:"FOREX",    moeda:"USD"},
  {ticker:"EURBRL=X", simbolo:"EUR/BRL", nome:"Euro / Real",     mercado:"FOREX",    moeda:"BRL"},
  {ticker:"GBPUSD=X", simbolo:"GBP/USD", nome:"Libra / Dólar",   mercado:"FOREX",    moeda:"USD"},
  {ticker:"AAPL",     simbolo:"AAPL",    nome:"Apple",           mercado:"NASDAQ",   moeda:"USD"},
  {ticker:"MSFT",     simbolo:"MSFT",    nome:"Microsoft",       mercado:"NASDAQ",   moeda:"USD"},
  {ticker:"NVDA",     simbolo:"NVDA",    nome:"Nvidia",          mercado:"NASDAQ",   moeda:"USD"},
  {ticker:"TSLA",     simbolo:"TSLA",    nome:"Tesla",           mercado:"NASDAQ",   moeda:"USD"},
  {ticker:"AMZN",     simbolo:"AMZN",    nome:"Amazon",          mercado:"NASDAQ",   moeda:"USD"},
  {ticker:"GOOGL",    simbolo:"GOOGL",   nome:"Alphabet",        mercado:"NASDAQ",   moeda:"USD"},
  {ticker:"META",     simbolo:"META",    nome:"Meta",            mercado:"NASDAQ",   moeda:"USD"},
];

const fmtP=v=>{
  if(!v&&v!==0)return"—";
  if(v>100000)return v.toLocaleString("pt-BR",{maximumFractionDigits:0});
  if(v>1000)  return v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  if(v>10)    return v.toFixed(2);
  if(v>1)     return v.toFixed(3);
  return v.toFixed(4);
};

// ── Converte candles do backend pro formato Lightweight Charts ──
const toLWCandles = (candles) =>
  candles.map(c => ({
    time: Math.floor(c.timestamp / 1000),
    open:  c.abertura,
    high:  c.maxima,
    low:   c.minima,
    close: c.fechamento,
  })).sort((a,b) => a.time - b.time);

const toLWSeries = (candles) =>
  candles.map(c => ({
    time:  Math.floor(c.timestamp / 1000),
    value: c.fechamento,
  })).sort((a,b) => a.time - b.time);

// ── Mini Line (canvas simples pra cards) ─────────────────────
function MiniLine({data,color}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current;if(!c||!data?.length)return;
    c.width=c.offsetWidth;c.height=c.offsetHeight;
    const ctx=c.getContext("2d"),W=c.width,H=c.height;
    const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
    const pts=data.map((v,i)=>({x:i/(data.length-1)*W,y:H*0.9-(v-mn)/rng*H*0.78}));
    ctx.clearRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,color+"30");g.addColorStop(1,color+"00");
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
    ctx.fillStyle=g;ctx.fill();
  },[data,color]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ── Gráfico de Linha — Estudo de Mercado (Lightweight Charts) ─
function HomeLineChart({data, color}){
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  useEffect(()=>{
    if(!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
      layout:{
        background:{ type: ColorType.Solid, color: "transparent" },
        textColor: "#5A7299",
        fontFamily: "JetBrains Mono",
        fontSize: 10,
      },
      grid:{
        vertLines:{ color: "rgba(255,255,255,.03)" },
        horzLines:{ color: "rgba(255,255,255,.03)" },
      },
      crosshair:{
        mode: CrosshairMode.Normal,
        vertLine:{ color: "rgba(200,216,247,.2)", labelBackgroundColor:"#3D7EFF" },
        horzLine:{ color: "rgba(200,216,247,.2)", labelBackgroundColor:"#3D7EFF" },
      },
      rightPriceScale:{
        borderColor: "rgba(255,255,255,.06)",
        textColor: "#5A7299",
      },
      timeScale:{
        borderColor: "rgba(255,255,255,.06)",
        textColor: "#5A7299",
        timeVisible: true,
        barSpacing: 1,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale:  false,
    });

    seriesRef.current = chartRef.current.addSeries(AreaSeries, {
      lineColor: color,
      topColor:  color + "40",
      bottomColor: color + "00",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    const ro = new ResizeObserver(()=>{
      if(chartRef.current && containerRef.current){
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return()=>{
      ro.disconnect();
      chartRef.current?.remove();
    };
  },[]);

  useEffect(()=>{
    if(!seriesRef.current || !data?.length) return;
    seriesRef.current.setData(toLWSeries(data));
    chartRef.current?.timeScale().fitContent();
    // Atualiza cor se mudar
    seriesRef.current.applyOptions({
      lineColor: color,
      topColor:  color + "40",
      bottomColor: color + "00",
    });
  },[data, color]);

  return <div ref={containerRef} style={{position:"absolute",inset:0}}/>;
}

// ── Gráfico de Candlestick — Página de Análise ───────────────
function CandleChart({candles, padroes, activeTools, selPat, setSelPat, setHoverC, showVolume=true}){
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const candleRef    = useRef(null);
  const volRef       = useRef(null);
  const sma20Ref     = useRef(null);
  const sma100Ref    = useRef(null);
  const sma200Ref    = useRef(null);
  const markersRef   = useRef(null);

  // Inicializa o gráfico
  useEffect(()=>{
    if(!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
      layout:{
        background:{ type: ColorType.Solid, color: "#06080F" },
        textColor: "#5A7299",
        fontFamily: "JetBrains Mono",
        fontSize: 10,
      },
      grid:{
        vertLines:{ color: "rgba(255,255,255,.04)" },
        horzLines:{ color: "rgba(255,255,255,.04)" },
      },
      crosshair:{
        mode: CrosshairMode.Normal,
        vertLine:{ color:"rgba(200,216,247,.15)", width:1, style: LineStyle.Dashed, labelBackgroundColor:"#3D7EFF" },
        horzLine:{ color:"rgba(200,216,247,.15)", width:1, style: LineStyle.Dashed, labelBackgroundColor:"#3D7EFF" },
      },
      rightPriceScale:{
        borderColor: "rgba(255,255,255,.06)",
        textColor: "#5A7299",
        scaleMargins: showVolume ? { top:0.05, bottom:0.2 } : { top:0.08, bottom:0.08 },
      },
      timeScale:{
        borderColor: "rgba(255,255,255,.06)",
        textColor: "#5A7299",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        rightOffset: 8,
        fixRightEdge: true,
      },
      handleScroll: true,
      handleScale:  true,
    });

    // Candlestick series
    candleRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor:         "#00D68F",
      downColor:       "#FF4560",
      borderUpColor:   "#00D68F",
      borderDownColor: "#FF4560",
      wickUpColor:     "#00D68F",
      wickDownColor:   "#FF4560",
    });

    // Volume — só cria se showVolume (esconde pra commodities/futuros, cujo volume do Yahoo é ruim)
    if(showVolume){
      volRef.current = chartRef.current.addSeries(HistogramSeries, {
        color: "#26a69a",
        priceFormat:{ type:"volume" },
        priceScaleId: "volume",
        scaleMargins:{ top:0.8, bottom:0 },
      });
      chartRef.current.priceScale("volume").applyOptions({
        scaleMargins:{ top:0.8, bottom:0 },
      });
    }

    // Crosshair → atualiza OHLC na toolbar
    chartRef.current.subscribeCrosshairMove(param=>{
      if(param.time && candleRef.current){
        const data = param.seriesData.get(candleRef.current);
        if(data) setHoverC({
          abertura:   data.open,
          maxima:     data.high,
          minima:     data.low,
          fechamento: data.close,
          data: new Date(param.time * 1000).toISOString().slice(0,10),
        });
        else setHoverC(null);
      } else {
        setHoverC(null);
      }
    });

    // ResizeObserver
    const ro = new ResizeObserver(()=>{
      if(chartRef.current && containerRef.current){
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return()=>{
      ro.disconnect();
      // Limpa refs antes do remove pra evitar acesso em séries já destruídas
      markersRef.current = null;
      sma20Ref.current = null;
      sma100Ref.current = null;
      sma200Ref.current = null;
      candleRef.current = null;
      volRef.current = null;
      try { chartRef.current?.remove(); } catch(e) {}
      chartRef.current = null;
    };
  },[showVolume]);

  // Atualiza candles
  useEffect(()=>{
    if(!candleRef.current || !candles.length) return;
    const lw = toLWCandles(candles);
    candleRef.current.setData(lw);

    // Volume — filtra timestamps duplicados (acontece em intradiários após arredondar pra segundos)
    const volMap = new Map();
    for(const c of candles){
      const t = Math.floor(c.timestamp/1000);
      volMap.set(t, {
        time:  t,
        value: c.volume || 0,
        color: c.fechamento >= c.abertura ? "rgba(0,214,143,.5)" : "rgba(255,69,96,.5)",
      });
    }
    const volData = [...volMap.values()].sort((a,b)=>a.time-b.time);
    volRef.current?.setData(volData);

    // Mostra os últimos 100 candles por padrão — usuário pode arrastar pra ver o histórico
    const totalCandles = candles.length;
    const visibleCount = 100;
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from: Math.max(0, totalCandles - visibleCount),
      to: totalCandles + 5,
    });
  },[candles]);

  // SMAs
  useEffect(()=>{
    if(!chartRef.current || !candles.length) return;

    const calcSMA = (period) => {
      const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);
      const result = [];
      for(let i = period-1; i < sorted.length; i++){
        const avg = sorted.slice(i-period+1, i+1).reduce((s,c)=>s+c.fechamento,0)/period;
        result.push({ time: Math.floor(sorted[i].timestamp/1000), value: avg });
      }
      return result;
    };

    // Helper: remove série com segurança (v5 é estrita; tenta e ignora se já foi)
    const safeRemove = (ref) => {
      if(ref.current && chartRef.current){
        try { chartRef.current.removeSeries(ref.current); } catch(e) {}
        ref.current = null;
      }
    };

    // Helper: cria ou atualiza uma SMA
    const upsertSMA = (ref, period, color, condition) => {
      if(condition){
        if(!ref.current){
          ref.current = chartRef.current.addSeries(LineSeries, { color, lineWidth:1.5, priceLineVisible:false, lastValueVisible:false });
        }
        ref.current.setData(calcSMA(period));
      } else {
        safeRemove(ref);
      }
    };

    upsertSMA(sma20Ref,  20,  "#F5A623", activeTools.has("sma20")  && candles.length >= 20);
    upsertSMA(sma100Ref, 100, "#9B6DFF", activeTools.has("sma100") && candles.length >= 100);
    upsertSMA(sma200Ref, 200, "#3D7EFF", activeTools.has("sma200") && candles.length >= 200);
  },[candles, activeTools]);

  // Markers — padrões clássicos
  useEffect(()=>{
    if(!candleRef.current || !candles.length) return;
    const tipos = new Set(["topo_duplo","fundo_duplo","oco","oco_invertido"].filter(t=>activeTools.has(t)));
    const markers = padroes
      .filter(p => tipos.has(p.tipo))
      .map(p => {
        const c = candles[p.idx_fim];
        if(!c) return null;
        const bull = p.vies === "alta";
        return {
          time:     Math.floor(c.timestamp/1000),
          position: bull ? "belowBar" : "aboveBar",
          color:    bull ? "#00D68F"  : "#FF4560",
          shape:    bull ? "arrowUp"  : "arrowDown",
          text:     p.nome,
          size:     1.5,
        };
      })
      .filter(Boolean)
      .sort((a,b)=>a.time-b.time);

    // Remove duplicatas de time
    const seen = new Set();
    const unique = markers.filter(m => {
      if(seen.has(m.time)) return false;
      seen.add(m.time);
      return true;
    });

    // v5: setMarkers virou plugin separado. Cria uma vez, depois atualiza.
    try {
      if(!markersRef.current){
        markersRef.current = createSeriesMarkers(candleRef.current, unique);
      } else {
        markersRef.current.setMarkers(unique);
      }
    } catch(e) {
      console.warn("Markers não puderam ser aplicados:", e);
    }
  },[candles, padroes, activeTools]);

  return <div ref={containerRef} style={{position:"absolute",inset:0}}/>;
}


// ── Search ────────────────────────────────────────────────────
function SearchBar({onSelect}){
  const [q,setQ]=useState("");
  const [res,setRes]=useState([]);
  const [open,setOpen]=useState(false);
  const [hi,setHi]=useState(0);
  const boxRef=useRef(null);

  useEffect(()=>{
    if(!q.trim()){ setRes([]); return; }
    const timer=setTimeout(()=>{
      fetch(`${API}/ativos/buscar?q=${encodeURIComponent(q)}`)
        .then(r=>r.json())
        .then(d=>{ setRes(d.resultados||[]); setOpen(true); setHi(0); })
        .catch(()=>setRes([]));
    },250);
    return ()=>clearTimeout(timer);
  },[q]);

  // Fecha ao clicar fora
  useEffect(()=>{
    const click=(e)=>{ if(boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",click);
    return ()=>document.removeEventListener("mousedown",click);
  },[]);

  const escolher=(a)=>{
    setQ(""); setRes([]); setOpen(false);
    onSelect(a);
  };

  const handleKey=(e)=>{
    if(!open||res.length===0) return;
    if(e.key==="ArrowDown"){ e.preventDefault(); setHi(h=>Math.min(h+1,res.length-1)); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setHi(h=>Math.max(h-1,0)); }
    else if(e.key==="Enter"){ e.preventDefault(); res[hi]&&escolher(res[hi]); }
    else if(e.key==="Escape"){ setOpen(false); }
  };

  return(
    <div className="search" ref={boxRef}>
      <span className="search-ic">⌕</span>
      <input
        value={q}
        onChange={e=>setQ(e.target.value)}
        onFocus={()=>q&&setOpen(true)}
        onKeyDown={handleKey}
        placeholder="Buscar... PETR4, BTC, OURO, EUR/USD, AAPL"
      />
      {open&&res.length>0&&(
        <div className="search-dd">
          {res.map((a,i)=>(
            <div
              key={a.ticker}
              className={`search-item ${i===hi?"hi":""}`}
              onMouseEnter={()=>setHi(i)}
              onClick={()=>escolher(a)}
            >
              <span style={{display:"flex",flexDirection:"column",gap:2}}>
                <span style={{fontWeight:600,color:"var(--text)",fontSize:12}}>{a.simbolo}</span>
                <span style={{fontSize:10,color:"var(--text2)"}}>{a.nome}</span>
              </span>
              <span style={{fontSize:9,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{a.mercado}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Asset Card ────────────────────────────────────────────────
function AssetCard({a,onClick}){
  const cor=MKTC[a.mercado]||"#5A7299";
  return(
    <div className="ac" onClick={onClick}>
      <div className="ac-top">
        <div className="ac-ic" style={{background:cor+"22",color:cor}}>{a.simbolo[0]}</div>
        <span className={`ac-chg ${a.alta?"bup":"bdn"}`}>{a.alta?"▲":"▼"}{Math.abs(a.variacao_pct||0).toFixed(2)}%</span>
      </div>
      <div className="ac-tk">{a.simbolo}</div>
      <div className="ac-nm">{a.nome}</div>
      <div className="ac-pr">{fmtP(a.preco)}</div>
      <div className="ac-mini"><MiniLine data={a.serie||[]} color={a.alta?"#00D68F":"#FF4560"}/></div>
    </div>
  );
}

function SkeletonCard(){
  return(
    <div className="ac" style={{opacity:.25,cursor:"default"}}>
      <div style={{height:30,width:30,borderRadius:"50%",background:"var(--border)",marginBottom:10}}/>
      <div style={{height:14,width:"60%",background:"var(--border)",borderRadius:4,marginBottom:6}}/>
      <div style={{height:10,width:"80%",background:"var(--border)",borderRadius:4,marginBottom:10}}/>
      <div style={{height:12,width:"50%",background:"var(--border)",borderRadius:4}}/>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
// ── PÁGINA DE ABERTURA (tela inicial leve com efeito de fundo) ──
function Abertura(){
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, points = [], raf;
    const mouse = { x:-9999, y:-9999 };

    const resize = ()=>{
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(90, Math.floor(w*h/16000));
      points = [];
      for(let i=0;i<count;i++){
        points.push({
          x:Math.random()*w, y:Math.random()*h,
          vx:(Math.random()-0.5)*0.4, vy:(Math.random()-0.5)*0.4
        });
      }
    };
    const onMove = e=>{ mouse.x=e.clientX; mouse.y=e.clientY; };
    const onOut  = ()=>{ mouse.x=-9999; mouse.y=-9999; };

    const draw = ()=>{
      ctx.clearRect(0,0,w,h);
      for(const p of points){
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>w) p.vx*=-1;
        if(p.y<0||p.y>h) p.vy*=-1;
        const dx=mouse.x-p.x, dy=mouse.y-p.y, dist=Math.hypot(dx,dy);
        if(dist<160){ p.x+=dx*0.008; p.y+=dy*0.008; }
        ctx.beginPath();
        ctx.arc(p.x,p.y,1.6,0,Math.PI*2);
        ctx.fillStyle="rgba(61,126,255,0.7)";
        ctx.fill();
      }
      for(let i=0;i<points.length;i++){
        for(let j=i+1;j<points.length;j++){
          const a=points[i], b=points[j];
          const d=Math.hypot(a.x-b.x,a.y-b.y);
          if(d<130){
            ctx.beginPath();
            ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
            ctx.strokeStyle=`rgba(99,130,200,${0.12*(1-d/130)})`;
            ctx.stroke();
          }
        }
      }
      raf=requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseout",onOut);
    window.addEventListener("resize",resize);
    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMove);
      window.removeEventListener("mouseout",onOut);
      window.removeEventListener("resize",resize);
    };
  },[]);

  return(
    <div className="abertura">
      <canvas ref={canvasRef} className="ab-fx"/>
      <div className="ab-glow"/>
      <div className="ab-wrap">
        <div className="ab-head">
          <div className="ab-logo">
            <span className="ic">✦</span>
            <span>TRADE<span>TEC</span></span>
          </div>
        </div>
        <div className="ab-hero">
          <h1>
            VEJA PADRÕES DE ANÁLISE
            <span className="l2">TÉCNICA DIARIAMENTE</span>
          </h1>
          <p>Estude padrões gráficos e veja como cada ativo tende a reagir às flutuações do mercado.</p>
          <button className="ab-entrar" onClick={()=>navigate("/mercados")}>Entrar</button>
          <div className="ab-tiles">
            <div className="ab-tile" onClick={()=>navigate("/sobre")}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Sobre Nós</span>
            </div>
            <div className="ab-tile" onClick={()=>navigate("/faq")}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Perguntas Frequentes</span>
            </div>
            <div className="ab-tile" onClick={()=>navigate("/termos")}>
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Termos de Uso</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppInner(){
  const navigate = useNavigate();
  const location = useLocation();

  const [mercado,setMercado] = useState([]);
  const [selAtivo,setSel]    = useState(null);
  const [candles,setCandles] = useState([]);
  const [padroes,setPadroes] = useState([]);
  const [loading,setLoading] = useState(false);
  const [tools,setTools]     = useState(new Set());
  const [tf,setTf]           = useState(TFS[2]);
  const [selPat,setSelPat]   = useState(null);
  const [hoverC,setHoverC]   = useState(null);
  const [marketTab,setMTab]  = useState("1D");
  const [ibovChart,setIbovChart] = useState([]);
  const [ibovLoading,setIbovLoading] = useState(false);
  const [erro,setErro]       = useState("");

  // Novos estados pro cabeçalho da análise
  const [chartType,setChartType] = useState("candles"); // candles | linha | area
  const [showAssetSwitcher,setShowAssetSwitcher] = useState(false);
  const [showIndicators,setShowIndicators] = useState(false);
  const [fullscreen,setFullscreen] = useState(false);

  // Deriva qual "página" estamos baseado na URL
  const path = location.pathname;
  const isAnalysis = path.startsWith("/ativo/");
  const isLista = path.startsWith("/lista/");
  const listaTipo = isLista ? path.split("/lista/")[1] : null;
  const tickerUrl = isAnalysis ? decodeURIComponent(path.split("/ativo/")[1]) : null;

  // Carrega mercado em lazy
  useEffect(()=>{
    // Primeiro: IBOV (gráfico principal)
    fetch(`${API}/mercado`)
      .then(r=>r.json())
      .then(d=>setMercado(d.dados||[]))
      .catch(()=>setErro("Backend offline. Rode: python -m uvicorn main:app --reload --port 8000"));
  },[]);

  // Busca gráfico do IBOV de acordo com o timeframe (1D/1S/1M)
  useEffect(()=>{
    const periodos = {
      "1D": { periodo: "1mo", intervalo: "1d"  },  // 1 mês de candles diários
      "1S": { periodo: "1y",  intervalo: "1wk" },  // 1 ano de candles semanais
      "1M": { periodo: "5y",  intervalo: "1mo" },  // 5 anos de candles mensais
    };
    const p = periodos[marketTab] || periodos["1D"];
    setIbovLoading(true);
    fetch(`${API}/ativo/^BVSP?periodo=${p.periodo}&intervalo=${p.intervalo}`)
      .then(r=>r.json())
      .then(d=>{
        const candles = d.candles || [];
        // Converte pro formato esperado pelo HomeLineChart
        const serie = candles.map(c => ({
          timestamp: c.timestamp,
          fechamento: c.fechamento,
        }));
        setIbovChart(serie);
        setIbovLoading(false);
      })
      .catch(()=>setIbovLoading(false));
  },[marketTab]);

  const abrirAtivo=a=>{
    navigate(`/ativo/${encodeURIComponent(a.ticker)}`);
  };

  // Quando a URL é /ativo/XXX, busca os dados (funciona até em F5 ou link direto)
  useEffect(()=>{
    if(!tickerUrl) return;

    // Procura o ativo no mercado já carregado. Se não achar, monta um stub mínimo.
    let ativo = mercado.find(m=>m.ticker===tickerUrl);
    if(!ativo){
      ativo = { ticker: tickerUrl, simbolo: tickerUrl.split(".")[0].split("-")[0], nome: tickerUrl, mercado: "—", moeda: "—" };
    }
    setSel(ativo);
    setLoading(true);
    setSelPat(null);
    setCandles([]);
    setPadroes([]);
    fetch(`${API}/ativo/${ativo.ticker}?periodo=${tf.periodo}&intervalo=${tf.intervalo}`)
      .then(r=>r.json())
      .then(d=>{
        setCandles(d.candles||[]);
        setPadroes(d.padroes||[]);
        // Atualiza info do ativo com dados do backend se disponível
        if(d.info){
          setSel(prev=>({...prev, ...d.info, ticker: tickerUrl}));
        }
        setLoading(false);
      })
      .catch(()=>setLoading(false));
  },[tickerUrl, tf.periodo, tf.intervalo]);

  const trocarTF=t=>{
    setTf(t);
    // O useEffect do tickerUrl/tf detecta a mudança e rebusca
  };

  // Atualiza dados manualmente (botão refresh)
  const atualizarAtivo = () => {
    if(!selAtivo) return;
    setLoading(true);setCandles([]);setPadroes([]);
    fetch(`${API}/ativo/${selAtivo.ticker}?periodo=${tf.periodo}&intervalo=${tf.intervalo}`)
      .then(r=>r.json())
      .then(d=>{setCandles(d.candles||[]);setPadroes(d.padroes||[]);setLoading(false);})
      .catch(()=>setLoading(false));
  };

  const toggleTool=id=>setTools(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});

  const ibov        = mercado.find(m=>m.ticker==="^BVSP")||mercado[0];
  const criptos     = mercado.filter(m=>m.mercado==="CRIPTO");
  const acoes       = mercado.filter(m=>m.mercado==="B3"&&m.ticker!=="^BVSP");
  const forex       = mercado.filter(m=>m.mercado==="FOREX");

  // Série pro gráfico da home — usa dados reais se já carregou, senão fallback do resumo
  const ibovSerie = ibovChart.length > 0
    ? ibovChart
    : (ibov?.serie?.length
        ? ibov.serie.map((v,i)=>({ timestamp: (Date.now() - (ibov.serie.length-i)*86400000), fechamento: v }))
        : []);

  return(
    <>
      <style>{CSS}</style>

      {/* NAV (escondida na tela de abertura) */}
      {path!=="/"&&(
      <nav className="nav">
        <div className="logo" onClick={()=>navigate("/mercados")}>TRADE<span>TEC</span></div>
        <SearchBar onSelect={abrirAtivo}/>
        <div style={{flex:1}}/>
        <div className="nav-r">
          <button className="btn-in">Entrar</button>
          <button className="btn-pr">✦ Pro</button>
        </div>
      </nav>
      )}

      {/* ── HOME (mercados) ── */}
      {path==="/mercados"&&(
        <div className="home">
          {erro&&(
            <div style={{padding:"10px 16px",color:"var(--down)",fontSize:11,fontFamily:"var(--font-m)",background:"rgba(255,69,96,.06)",borderRadius:8,border:"1px solid rgba(255,69,96,.2)"}}>
              ⚠️ {erro}
            </div>
          )}

          {/* ESTUDO DE MERCADO */}
          <div>
            <div className="sh">
              <span className="st">📊 Estudo de Mercado</span>
              <span className="sl" onClick={()=>ibov&&abrirAtivo(ibov)}>Análise completa →</span>
            </div>
            <div className="card">
              <div className="mc">
                <div className="mc-top">
                  <div
                    style={{cursor:"pointer"}}
                    onClick={()=>ibov&&abrirAtivo(ibov)}
                    title="Clique para abrir análise completa"
                  >
                    <div className="mc-label">Ibovespa · B3 · BRL</div>
                    <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                      <span className="mc-price">{fmtP(ibov?.preco)}</span>
                      <span className="mc-cur">BRL</span>
                    </div>
                    <div className={`mc-chg ${ibov?.alta?"bup":"bdn"}`} style={{marginTop:8}}>
                      {ibov?.alta?"▲":"▼"} {Math.abs(ibov?.variacao_pct||0).toFixed(2)}%
                    </div>
                  </div>
                  <div className="mc-tabs">
                    {["1D","1S","1M"].map(t=>(
                      <button key={t} className={`mc-tab ${marketTab===t?"active":""}`} onClick={()=>setMTab(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mc-chart">
                {ibovSerie.length>0
                  ?<HomeLineChart data={ibovSerie} color={ibov?.alta?"#00D68F":"#FF4560"}/>
                  :<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><div className="spin"/></div>
                }
              </div>
            </div>
          </div>

          {/* CRIPTO */}
          <div>
            <div className="sh">
              <span className="st">₿ Mercado Cripto</span>
              <span className="sl" onClick={()=>navigate("/lista/cripto")}>Ver todos →</span>
            </div>
            <div className="card" style={{padding:16}}>
              <div className="agrid">
                {criptos.length>0
                  ?criptos.slice(0,6).map((a,i)=><AssetCard key={i} a={a} onClick={()=>abrirAtivo(a)}/>)
                  :[...Array(6)].map((_,i)=><SkeletonCard key={i}/>)
                }
              </div>
            </div>
          </div>

          {/* PRINCIPAIS ATIVOS */}
          <div>
            <div className="sh">
              <span className="st">📈 Análise dos Principais Ativos</span>
              <span className="sl" onClick={()=>navigate("/lista/acoes")}>Ver todos →</span>
            </div>
            <div className="card" style={{padding:16}}>
              <div className="agrid">
                {[...acoes,...forex].length>0
                  ?[...acoes,...forex].slice(0,6).map((a,i)=><AssetCard key={i} a={a} onClick={()=>abrirAtivo(a)}/>)
                  :[...Array(6)].map((_,i)=><SkeletonCard key={i}/>)
                }
              </div>
            </div>
          </div>

          {/* Ticker */}
          <div className="tbar">
            <div className="tbl">AO VIVO</div>
            <div style={{overflow:"hidden",flex:1}}>
              <div className="tscroll">
                {[...mercado,...mercado].map((m,i)=>(
                  <div key={i} className="ti">
                    <span className="tn">{m.simbolo}</span>
                    <span style={{color:m.alta?"var(--up)":"var(--down)",fontWeight:700}}>{m.alta?"▲":"▼"} {Math.abs(m.variacao_pct||0).toFixed(2)}%</span>
                    <span style={{color:"var(--text2)"}}>{fmtP(m.preco)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTA (Ver todos: Cripto / Ações) ── */}
      {isLista&&(
        <div className="home">
          <div className="sh" style={{marginTop:8}}>
            <span style={{display:"flex",alignItems:"center",gap:12}}>
              <button className="bbtn" onClick={()=>navigate("/mercados")}>←</button>
              <span className="st" style={{fontSize:18}}>
                {listaTipo==="cripto"&&"₿ Todas as Criptomoedas"}
                {listaTipo==="acoes"&&"📈 Todos os Ativos B3 e Forex"}
              </span>
            </span>
            <span style={{fontSize:11,color:"var(--text2)"}}>
              {(()=>{
                if(listaTipo==="cripto") return criptos.length;
                if(listaTipo==="acoes") return acoes.length+forex.length;
                return 0;
              })()} ativos
            </span>
          </div>

          <div className="card" style={{padding:16}}>
            <div className="agrid">
              {(()=>{
                let lista=[];
                if(listaTipo==="cripto") lista=criptos;
                else if(listaTipo==="acoes") lista=[...acoes,...forex];

                if(lista.length===0){
                  return [...Array(8)].map((_,i)=><SkeletonCard key={i}/>);
                }
                return lista.map((a,i)=><AssetCard key={i} a={a} onClick={()=>abrirAtivo(a)}/>);
              })()}
            </div>
          </div>
        </div>
      )}

      {isAnalysis&&selAtivo&&(
        <div className={`analysis ${fullscreen?"fullscreen":""}`}>
          <div className="atb">
            <button className="bbtn" onClick={()=>navigate("/mercados")} title="Voltar pra home">←</button>
            <span className="atick">{selAtivo.simbolo}</span>

            {selAtivo.preco>0&&<>
              <span className="apr">{fmtP(selAtivo.preco)}</span>
              <span className={`achg ${selAtivo.alta?"bup":"bdn"}`}>{selAtivo.alta?"▲":"▼"}{Math.abs(selAtivo.variacao_pct||0).toFixed(2)}%</span>
            </>}
            <span style={{fontSize:10,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{selAtivo.mercado}</span>

            <div className="sep"/>

            {/* Timeframes */}
            <div className="tfg">
              {TFS.map(t=>(
                <button key={t.label} className={`tfb ${tf.label===t.label?"active":""}`} onClick={()=>trocarTF(t)}>{t.label}</button>
              ))}
            </div>

            {hoverC&&(
              <div className="ohlc">
                <span>A:<span style={{color:"var(--text)"}}> {fmtP(hoverC.abertura)}</span></span>
                <span>M:<span style={{color:"var(--up)"}}> {fmtP(hoverC.maxima)}</span></span>
                <span>m:<span style={{color:"var(--down)"}}> {fmtP(hoverC.minima)}</span></span>
                <span>F:<span style={{color:hoverC.fechamento>=hoverC.abertura?"var(--up)":"var(--down)"}}> {fmtP(hoverC.fechamento)}</span></span>
                <span style={{color:"var(--text3)"}}>{hoverC.data}</span>
              </div>
            )}
            <span style={{marginLeft:"auto",fontSize:10,color:"var(--text2)",fontFamily:"var(--font-m)",flexShrink:0}}>
              {padroes.length} padrões · {candles.length} candles
            </span>
          </div>

          <div className="abody">
            <div className="achart">
              {loading&&<div className="ld"><div className="spin"/><div className="ldtxt">CARREGANDO...</div></div>}
              {!loading&&candles.length>0&&(
                <CandleChart
                  candles={candles}
                  padroes={padroes}
                  activeTools={tools}
                  selPat={selPat}
                  setSelPat={setSelPat}
                  setHoverC={setHoverC}
                  showVolume={selAtivo.mercado!=="COMMODITY"}
                />
              )}
              {!loading&&candles.length>0&&(
                <div style={{position:"absolute",top:10,left:14,display:"flex",gap:16,pointerEvents:"none",zIndex:5}}>
                  {tools.has("sma20")  &&<span style={{fontSize:9,color:"#F5A623",fontFamily:"var(--font-m)",background:"rgba(6,8,15,.7)",padding:"2px 6px",borderRadius:4}}>── MM20</span>}
                  {tools.has("sma100") &&<span style={{fontSize:9,color:"#9B6DFF",fontFamily:"var(--font-m)",background:"rgba(6,8,15,.7)",padding:"2px 6px",borderRadius:4}}>── MM100</span>}
                  {tools.has("sma200") &&<span style={{fontSize:9,color:"#3D7EFF",fontFamily:"var(--font-m)",background:"rgba(6,8,15,.7)",padding:"2px 6px",borderRadius:4}}>── MM200</span>}
                  {tools.has("sr")     &&<span style={{fontSize:9,color:"var(--text2)",fontFamily:"var(--font-m)",background:"rgba(6,8,15,.7)",padding:"2px 6px",borderRadius:4}}>--- S/R</span>}
                </div>
              )}
            </div>

            {!fullscreen&&<div className="rpanel">
              <div className="rpsec">
                <div className="rptitle">Análises Técnicas</div>
                {TOOLS.map(t=>(
                  <div key={t.id} className={`titem ${tools.has(t.id)?"active":""}`}
                    onClick={()=>t.free&&toggleTool(t.id)}
                    style={!t.free?{opacity:.45,cursor:"default"}:{}}>
                    <div className="tchk">{tools.has(t.id)&&"✓"}</div>
                    <div className="tinf">
                      <div className="tnm">{t.name}</div>
                      <div className="tty">{t.type}</div>
                    </div>
                    {t.free?<span className="tfree">FREE</span>:<span className="tlock">🔒 PRO</span>}
                  </div>
                ))}
              </div>

              {candles.length>0&&(
                <div className="rpsec">
                  <div className="rptitle">Resumo</div>
                  <div className="sgrid">
                    <div className="sbox"><div className="slbl">Máx</div><div className="sval">{fmtP(Math.max(...candles.map(c=>c.maxima)))}</div></div>
                    <div className="sbox"><div className="slbl">Mín</div><div className="sval">{fmtP(Math.min(...candles.map(c=>c.minima)))}</div></div>
                    <div className="sbox"><div className="slbl">Padrões</div><div className="sval">{padroes.length}</div></div>
                    <div className="sbox"><div className="slbl">Candles</div><div className="sval">{candles.length}</div></div>
                  </div>
                </div>
              )}

              <div className="pd">
                {!selPat?(
                  <div className="pde">
                    <div style={{fontSize:36,opacity:.15,marginBottom:4}}>👆</div>
                    <div>Clique em uma marcação<br/>no gráfico para ver<br/>a análise completa</div>
                    {padroes.length===0&&candles.length>0&&(
                      <div style={{marginTop:16,fontSize:10,color:"var(--text2)",background:"var(--s2)",padding:"12px 16px",borderRadius:8,border:"1px solid var(--border)",lineHeight:1.6}}>
                        Nenhum padrão detectado<br/>neste período.<br/>Tente um período maior.
                      </div>
                    )}
                  </div>
                ):(
                  <div>
                    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
                      <button onClick={()=>setSelPat(null)} style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:16}}>✕</button>
                    </div>
                    <div style={{fontSize:30,marginBottom:8}}>{selPat.icone}</div>
                    <div className="pdn">{selPat.nome}</div>
                    <span className="pdb" style={{
                      background:selPat.vies==="alta"?"rgba(0,214,143,.1)":"rgba(255,69,96,.1)",
                      color:selPat.vies==="alta"?"var(--up)":"var(--down)"
                    }}>{selPat.vies?.toUpperCase()}</span>
                    <div className="pdd">{selPat.descricao}</div>
                    <div className="pds" style={{
                      color:selPat.vies==="alta"?"var(--up)":"var(--down)",
                      background:selPat.vies==="alta"?"rgba(0,214,143,.06)":"rgba(255,69,96,.06)",
                      borderColor:selPat.vies==="alta"?"rgba(0,214,143,.2)":"rgba(255,69,96,.2)"
                    }}>{selPat.sinal}</div>
                    <div style={{fontSize:10,color:"var(--text2)",fontFamily:"var(--font-m)",marginTop:10}}>{selPat.data_deteccao}</div>
                    <div style={{
                      fontSize:10,marginTop:8,padding:"5px 10px",borderRadius:5,display:"inline-block",fontWeight:700,
                      background:selPat.confirmado?"rgba(0,214,143,.1)":"rgba(245,166,35,.1)",
                      color:selPat.confirmado?"var(--up)":"var(--gold)"
                    }}>{selPat.confirmado?"✅ Confirmado":"⏳ Aguardando confirmação"}</div>
                  </div>
                )}
              </div>

              <div className="upg">
                <div className="ubt">✦ Desbloqueie o Pro</div>
                <div className="ubd">MM100, MM200, RSI, Bollinger Bands e muito mais por R$29/mês.</div>
                <button className="ubb">ASSINAR AGORA</button>
              </div>
            </div>}
          </div>
        </div>
      )}
    </>
  );
}

// Decide entre a Abertura (sobreposta) e o app. O AppInner fica sempre
// montado para que os dados de mercado já carreguem no fundo enquanto o
// usuário vê a tela de abertura.
function Router(){
  const location = useLocation();
  const naAbertura = location.pathname === "/";
  return (
    <>
      <AppInner/>
      {naAbertura && <Abertura/>}
    </>
  );
}

// Componente raiz com o BrowserRouter
export default function App(){
  return (
    <BrowserRouter>
      <Router/>
    </BrowserRouter>
  );
}

// Dropdown de busca pra trocar de ativo
function AssetSwitcher({mercado, onSelect}){
  const [q,setQ] = useState("");
  const filtered = mercado.filter(a=>{
    if(!q) return true;
    const lower = q.toLowerCase();
    return a.simbolo?.toLowerCase().includes(lower) || a.nome?.toLowerCase().includes(lower) || a.ticker?.toLowerCase().includes(lower);
  });
  return (
    <div>
      <input
        autoFocus
        type="text"
        placeholder="Buscar ativo..."
        value={q}
        onChange={e=>setQ(e.target.value)}
        style={{width:"100%",padding:"10px 12px",background:"var(--s2)",border:"none",borderBottom:"1px solid var(--border)",color:"var(--text)",fontSize:12,fontFamily:"var(--font-b)",outline:"none"}}
      />
      <div style={{maxHeight:340,overflowY:"auto"}}>
        {filtered.length===0&&<div style={{padding:16,fontSize:11,color:"var(--text2)",textAlign:"center"}}>Nenhum ativo</div>}
        {filtered.map(a=>(
          <div key={a.ticker} className="dd-item" onClick={()=>onSelect(a)}>
            <span style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontWeight:600,color:"var(--text)"}}>{a.simbolo}</span>
              <span style={{fontSize:10,color:"var(--text2)"}}>{a.nome} · {a.mercado}</span>
            </span>
            <span className={a.alta?"bup":"bdn"} style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:600}}>
              {a.alta?"▲":"▼"}{Math.abs(a.variacao_pct||0).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}