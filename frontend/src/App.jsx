import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, useNavigate, useLocation } from "react-router-dom";
import { createChart, ColorType, CrosshairMode, LineStyle, AreaSeries, LineSeries, CandlestickSeries, HistogramSeries, createSeriesMarkers } from "lightweight-charts";
import AdminLogin from "./admin/AdminLogin.jsx";
import AdminCallback from "./admin/AdminCallback.jsx";
import AdminTemplates from "./admin/AdminTemplates.jsx";
import AdminTemplatesTopoDuplo from "./admin/AdminTemplatesTopoDuplo.jsx";
import AdminTemplatesNiveis from "./admin/AdminTemplatesNiveis.jsx";
import RequireAdmin from "./admin/RequireAdmin.jsx";

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
/* Tema claro — mesma paleta de marca, ajustada pra contraste em fundo branco
   (o dark theme foi calibrado pra quase-preto; alguns tons de acento ficam
   "lavados" em branco se não escurecerem um pouco). */
:root[data-theme="light"]{
  --bg:#F3F5F9;
  --s1:#FFFFFF;
  --s2:#EBEEF3;
  --card:#FFFFFF;
  --border:#DCE2EB;
  --up:#0CA678;
  --down:#E1354D;
  --accent:#2F6FEF;
  --gold:#B8720A;
  --text:#0F1720;
  --text2:#5B6B84;
  --text3:#7C8798;
  --pro:#7C5CDB;
}
html,body,#root{height:100%;width:100%;background:var(--bg);color:var(--text);font-family:var(--font-b);overflow:hidden;max-width:none!important}
#root{display:flex;flex-direction:column}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* NAV */
.nav{height:52px;display:flex;align-items:center;gap:20px;padding:0 28px;border-bottom:1px solid var(--border);background:var(--s1);flex-shrink:0;z-index:200;position:relative}
.logo{font-family:var(--font-h);font-size:22px;letter-spacing:3px;color:var(--text);cursor:pointer;user-select:none}
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
.search-group-head{padding:8px 14px 4px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;position:sticky;top:0;background:var(--s1)}
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

.ac{background:var(--s2);border:1px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;transition:all .2s;overflow:hidden}
.ac:hover{border-color:rgba(61,126,255,.4);transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.ac-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.ac-ic{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.ac-chg{font-size:10px;padding:2px 7px;border-radius:5px;font-weight:700}
.ac-fav{background:none;border:none;color:var(--text3);font-size:15px;line-height:1;cursor:pointer;padding:0;transition:color .15s,transform .15s}
.ac-fav:hover{transform:scale(1.15);color:var(--gold)}
.ac-fav.on{color:var(--gold)}
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
.analysis{display:flex;flex-direction:column;height:calc(100vh - 52px);min-width:960px;position:relative}
/* Multitelas: 2 .analysis lado a lado — cada uma vira metade da largura, com
   um min-width bem menor (senão 2×960px nunca cabe numa tela comum). */
.analysis-row{display:flex;height:calc(100vh - 52px);overflow:hidden}
.analysis-row .analysis{flex:1;min-width:480px;height:100%}
.analysis-row .analysis:not(:last-child){border-right:1px solid var(--border)}
.atb{height:44px;display:flex;align-items:center;gap:10px;padding:0 20px;border-bottom:1px solid var(--border);background:var(--s1);flex-shrink:0;overflow-x:auto;position:relative;z-index:20}
.bbtn{background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:2px 8px 2px 0;line-height:1}
.bbtn:hover{color:var(--text)}
.atick{font-family:var(--font-h);font-size:21px;letter-spacing:2px;color:var(--text);flex-shrink:0;cursor:pointer;user-select:none}
.atick:hover{color:var(--accent)}
.pane-btn{margin-left:8px;background:var(--card);border:1px solid var(--border);color:var(--text2);cursor:pointer;width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;transition:all .15s}
.pane-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.pane-btn.danger:hover{background:var(--down);border-color:var(--down)}
.apr{font-family:var(--font-m);font-size:14px;color:var(--text);flex-shrink:0}
.achg{font-size:11px;padding:2px 8px;border-radius:5px;flex-shrink:0;font-weight:700}
.sep{width:1px;height:20px;background:var(--border);margin:0 6px;flex-shrink:0}
.ohlc{display:flex;gap:14px;font-size:10px;font-family:var(--font-m);color:var(--text2);flex-shrink:0;margin-left:8px}

.abody{display:flex;flex:1;overflow:hidden}
.achart{flex:1;position:relative;background:var(--bg);overflow:hidden}

/* RIGHT PANEL */
.rpanel{width:208px;border-left:1px solid var(--border);background:var(--s1);display:flex;flex-direction:column;overflow:hidden;position:relative;padding-top:4px}
.rp-toggle{width:24px;height:24px;border-radius:6px;background:transparent;border:none;color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;transition:background .15s,color .15s;flex-shrink:0}
.rp-toggle:hover{background:var(--card);color:var(--text)}
.rp-head{display:flex;justify-content:flex-end;padding:8px 10px 0}
/* botão para reabrir quando a barra está fechada */
.rp-reabrir{position:absolute;right:12px;top:12px;z-index:10;width:30px;height:30px;border-radius:8px;background:var(--card);border:1px solid var(--border);color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;transition:background .15s,color .15s,border-color .15s}
.rp-reabrir:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.rpsec{padding:12px;border-bottom:1px solid var(--border)}
.rptitle{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--text2);text-transform:uppercase;margin-bottom:10px}
.titem{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;margin-bottom:3px;cursor:pointer;transition:all .15s;border:1px solid transparent}
.titem:hover{background:rgba(61,126,255,.06);border-color:var(--border)}
.titem.active{background:rgba(61,126,255,.1);border-color:var(--accent)}
.tchk{width:15px;height:15px;border-radius:4px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px}
.titem.active .tchk{background:var(--accent);border-color:var(--accent);color:#fff}
.tinf{flex:1}
.tnm{font-size:11px;font-weight:500;color:var(--text)}
.tty{font-size:9px;color:var(--text2);margin-top:1px}
.tlock{font-size:9px;padding:2px 6px;border-radius:4px;background:rgba(155,109,255,.12);color:var(--pro);font-weight:700}
.tfree{font-size:9px;padding:2px 6px;border-radius:4px;background:rgba(0,214,143,.1);color:var(--up);font-weight:700}
.pd{flex:1;overflow-y:auto;padding:16px}
.pde{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--text2);font-size:11px;text-align:center;line-height:1.6}
/* ── Dropdown Indicadores ── */
.ind-wrap{position:relative}
.ind-btn{display:flex;align-items:center;gap:5px;background:none;border:1px solid var(--border);color:var(--text2);font-family:var(--font-m);font-size:10px;padding:3px 10px;border-radius:5px;cursor:pointer;transition:all .15s;white-space:nowrap}
.ind-btn:hover,.ind-btn.open{background:var(--card);border-color:var(--text3);color:var(--text)}
.ind-btn .arr{font-size:8px;transition:transform .15s}
.ind-btn.open .arr{transform:rotate(180deg)}
.ind-drop{position:absolute;top:calc(100% + 6px);left:0;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:200px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.7);animation:indIn .15s ease}
@keyframes indIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.ind-section{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;padding:6px 8px 4px;font-family:var(--font-m)}
.ind-item{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:6px;cursor:pointer;transition:background .12s;width:100%}
.ind-item:hover{background:var(--s2)}
.ind-chk{width:14px;height:14px;border-radius:3px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;transition:all .12s}
.ind-chk.on{background:var(--accent);border-color:var(--accent);color:#fff}
.ind-label{font-size:11px;color:var(--text2);flex:1}
.ind-color{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.saiba-mais-btn{position:fixed;transform:translate(-50%,-100%) translateY(-18px);z-index:150;background:linear-gradient(135deg,#F5A623,#e8940f);color:#000;border:none;border-radius:20px;padding:5px 12px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(245,166,35,.4);animation:smBtnIn .25s cubic-bezier(.34,1.56,.64,1);letter-spacing:.3px}
.saiba-mais-btn:hover{filter:brightness(1.1);transform:translate(-50%,-100%) translateY(-18px) scale(1.04)}
@keyframes smBtnIn{from{opacity:0;transform:translate(-50%,-100%) translateY(-18px) scale(.8)}to{opacity:1;transform:translate(-50%,-100%) translateY(-18px) scale(1)}}
.exp-panel{position:absolute;top:0;right:0;width:340px;height:50%;background:var(--s1);border-left:1px solid rgba(245,166,35,.2);border-bottom:1px solid rgba(245,166,35,.2);border-radius:0 0 0 12px;display:flex;flex-direction:column;overflow-y:auto;z-index:50;animation:expSlide .22s cubic-bezier(.25,.46,.45,.94)}
@keyframes expSlide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.exp-header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 12px;border-bottom:1px solid var(--border)}
.exp-nome{font-size:15px;font-weight:700;color:var(--text)}
.exp-close{background:rgba(255,255,255,.06);border:none;color:var(--text2);cursor:pointer;width:26px;height:26px;border-radius:7px;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .15s}
.exp-close:hover{background:rgba(255,255,255,.12);color:var(--text)}
.exp-body{padding:16px;display:flex;flex-direction:column;gap:14px}
.exp-badges{display:flex;gap:6px;flex-wrap:wrap}
.exp-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:4px;letter-spacing:.5px}
.exp-qual-row{display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:6px}
.exp-bar{height:4px;border-radius:2px;background:var(--border);overflow:hidden}
.exp-bar-fill{height:100%;border-radius:2px;transition:width .6s ease}
.exp-texto{font-size:12px;color:var(--text2);line-height:1.8;padding:14px;background:rgba(255,255,255,.02);border-radius:8px;border-left:2px solid var(--gold)}
.exp-aviso{font-size:9px;font-weight:700;padding:5px 10px;border-radius:4px;background:rgba(245,166,35,.08);color:var(--gold);display:inline-block}
.exp-breakdown{display:flex;flex-direction:column;gap:6px}
.exp-bk-row{display:flex;align-items:center;gap:8px}
.exp-bk-label{font-size:10px;color:var(--text2);width:150px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.exp-bk-bar{flex:1;height:3px;border-radius:2px;background:var(--border);overflow:hidden}
.exp-bk-fill{height:100%;border-radius:2px;transition:width .5s ease}
.exp-bk-val{font-size:10px;font-family:var(--font-m);font-weight:700;width:28px;text-align:right;flex-shrink:0}
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
.ubt{font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px}
.ubd{font-size:10px;color:var(--text3);line-height:1.5;margin-bottom:10px}
.ubb{width:100%;background:linear-gradient(135deg,var(--accent),var(--pro));border:none;color:#fff;font-weight:700;font-size:11px;padding:8px;border-radius:7px;cursor:pointer;letter-spacing:.5px}

/* ───────── SEÇÕES DE PADRÕES (free / premium) ───────── */
.tsec-tag{font-size:8px;font-weight:800;letter-spacing:1px;padding:2px 7px;border-radius:20px;text-transform:uppercase}
.tsec-tag.free{background:rgba(0,214,143,.12);color:var(--up)}
.tsec-tag.prem{background:rgba(61,126,255,.12);color:var(--accent)}
.tsec-tag.completo{background:rgba(155,109,255,.12);color:var(--pro)}
.tsec-head{display:flex;align-items:center;gap:8px;margin:14px 0 10px}
.tsec-head .rptitle{margin:0}
.tcount{font-size:9px;font-family:var(--font-m);font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(245,166,35,.12);color:var(--gold);white-space:nowrap}
.tcount.zero{background:rgba(255,69,96,.12);color:var(--down)}
.plan-box{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.plan-card{border:1px solid var(--border);border-radius:10px;padding:11px 13px;cursor:pointer;transition:border-color .15s,background .15s;background:var(--card)}
.plan-card:hover{border-color:var(--pro);background:var(--s2)}
.plan-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px}
.plan-name{font-size:12px;font-weight:700;color:var(--text)}
.plan-price{font-family:var(--font-m);font-size:14px;font-weight:700;color:var(--pro)}
.plan-desc{font-size:10px;color:var(--text3)}

/* ───────── LISTA DE PADRÕES (lâmpadas clicáveis) ───────── */
.pat-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.pat-item{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;cursor:pointer;transition:border-color .15s,background .15s;text-align:left;width:100%;position:relative}
.pat-item:hover{border-color:var(--gold);background:var(--s2)}
.pat-item.sel{border-color:var(--gold);background:rgba(245,166,35,.08)}
.pat-lamp{font-size:18px;flex-shrink:0}
.pat-info{flex:1;min-width:0}
.pat-nome{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pat-meta{font-size:10px;color:var(--text3);font-family:var(--font-m)}
.pat-conf{font-size:10px;font-weight:700;font-family:var(--font-m);padding:2px 7px;border-radius:20px;flex-shrink:0}
/* efeito GLOW amarelo ao clicar */
@keyframes glowYellow{
  0%{box-shadow:0 0 0 0 rgba(245,166,35,0)}
  30%{box-shadow:0 0 22px 6px rgba(245,166,35,.55)}
  100%{box-shadow:0 0 0 0 rgba(245,166,35,0)}
}
.pat-item.glow{animation:glowYellow .7s ease-out}

/* ───────── SIDEBAR / DASHBOARD ───────── */
.dash{display:flex;align-items:flex-start;width:100%}
.sb{flex-shrink:0;width:230px;background:var(--s1);border-right:1px solid var(--border);min-height:calc(100vh - 52px);padding:16px 12px;transition:width .2s ease;position:sticky;top:52px;align-self:stretch}
.sb.collapsed{width:62px}
.sb-toggle{width:100%;display:flex;align-items:center;justify-content:flex-end;background:none;border:none;color:var(--text3);cursor:pointer;padding:6px 8px;margin-bottom:8px;font-size:18px;border-radius:8px;transition:background .15s,color .15s}
.sb-toggle:hover{background:var(--card);color:var(--text)}
.sb-item{display:flex;align-items:center;gap:13px;width:100%;background:none;border:none;color:var(--text3);cursor:pointer;padding:11px 13px;border-radius:10px;font-size:14px;font-weight:500;font-family:var(--font-b);transition:background .15s,color .15s;margin-bottom:3px;text-align:left;white-space:nowrap;overflow:hidden}
.sb-item:hover{background:var(--card);color:var(--text)}
.sb-item.active{background:linear-gradient(135deg,rgba(61,126,255,.18),rgba(61,126,255,.06));color:var(--accent)}
.sb-item.active svg{stroke:var(--accent)}
.sb-item svg{width:20px;height:20px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.sb.collapsed .sb-item span{opacity:0;width:0}
.sb-label{transition:opacity .15s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dash-main{flex:1;min-width:0;display:flex;flex-direction:column}
.embreve{min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;color:var(--text3)}
.embreve .eb-ic{font-size:48px;opacity:.5}
.embreve h2{font-family:var(--font-h);font-size:26px;color:var(--text);letter-spacing:1px}
.embreve p{font-size:14px;max-width:340px;line-height:1.5}
.nav-ic{width:36px;height:36px;border-radius:9px;background:var(--card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);transition:background .15s,color .15s}
.nav-ic:hover{background:var(--s2);color:var(--text)}
.nav-ic svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

/* ───────── FILEIRA DE ÍNDICES (home) ───────── */
.idx-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;width:100%}
.idx-btn{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:9px 14px;cursor:pointer;transition:transform .15s,border-color .15s,background .15s;text-align:left;display:flex;flex-direction:column;gap:5px;min-width:0}
.idx-btn:hover{transform:translateY(-2px);border-color:var(--accent);background:var(--s2)}
.idx-top{display:flex;align-items:center;gap:7px;min-width:0}
.idx-ic{width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;color:#fff}
.idx-name{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.idx-line{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.idx-price{font-family:var(--font-m);font-size:16px;font-weight:600;color:var(--text)}
.idx-chg{font-family:var(--font-m);font-size:11px;font-weight:600;white-space:nowrap}
.idx-chg.up{color:var(--up)}
.idx-chg.down{color:var(--down)}
.idx-skel{height:62px;background:var(--card);border:1px solid var(--border);border-radius:12px;position:relative;overflow:hidden}
.idx-skel::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.03),transparent);animation:idxshimmer 1.4s infinite}
@keyframes idxshimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}

/* ───────── CRIPTOMOEDAS (estilo TradingView) ───────── */
.crypto-top-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;width:100%}
.crypto-top-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;cursor:pointer;transition:transform .15s,border-color .15s,background .15s;display:flex;flex-direction:column;gap:8px;min-width:0}
.crypto-top-card:hover{transform:translateY(-2px);border-color:var(--accent);background:var(--s2)}
.crypto-top-spark{position:relative;height:34px;margin-top:2px}
.crypto-main-grid{display:grid;grid-template-columns:7fr 3fr;gap:16px;align-items:stretch;width:100%}
.crypto-badge-total{font-size:9px;font-weight:700;letter-spacing:.5px;color:var(--accent);background:rgba(47,111,239,.12);padding:2px 8px;border-radius:5px}
@media (max-width:1100px){.crypto-main-grid{grid-template-columns:1fr!important}}
@media (max-width:700px){.crypto-top-row{grid-template-columns:repeat(2,1fr)!important}}

/* ───────── PRINCIPAIS ATIVOS (gráfico comparativo) ───────── */
.pa-grid{display:grid;grid-template-columns:7fr 3fr;gap:16px;align-items:stretch;width:100%}
@media (max-width:1100px){.pa-grid{grid-template-columns:1fr!important}}
.pa-toggle-row{display:flex;gap:8px;flex-wrap:wrap}
.pa-toggle{display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);color:var(--text2);font-size:11px;font-family:var(--font-m);padding:5px 10px;border-radius:999px;cursor:pointer;transition:all .15s;opacity:.55}
.pa-toggle.on{opacity:1}
.pa-toggle:hover{border-color:var(--accent)}
.pa-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.pa-carousel{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px}
.pa-carousel-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;min-width:172px;flex-shrink:0;display:flex;flex-direction:column;gap:8px}

/* ───────── PÁGINA DE ABERTURA ───────── */
.abertura{position:fixed;inset:0;background:var(--bg);overflow:hidden;z-index:1000}
.ab-fx{position:absolute;inset:0;z-index:0;display:block}
.ab-glow{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(60% 50% at 50% 38%,rgba(61,126,255,.10),transparent 70%),radial-gradient(40% 40% at 80% 82%,rgba(155,109,255,.08),transparent 70%)}
.ab-wrap{position:relative;z-index:2;height:100%;display:flex;flex-direction:column}
.ab-head{display:flex;align-items:center;justify-content:space-between;padding:22px 40px;flex-shrink:0}
.ab-logo{font-family:var(--font-h);font-size:24px;letter-spacing:3px;color:var(--text);display:flex;align-items:center;gap:10px;user-select:none}
.ab-logo span{color:var(--accent)}
.ab-logo .ic{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--pro));display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.ab-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px 24px 60px;overflow-y:auto}
.ab-hero h1{font-family:var(--font-h);font-size:clamp(40px,7.5vw,96px);line-height:.98;font-weight:400;letter-spacing:2px;color:var(--text);margin-bottom:26px;opacity:0;animation:abrise .9s ease forwards .15s}
.ab-hero h1 .l2{display:block;color:var(--accent)}
.ab-hero p{max-width:580px;font-size:clamp(15px,2vw,19px);line-height:1.55;color:var(--text2);margin-bottom:38px;opacity:0;animation:abrise .9s ease forwards .35s}
.ab-entrar{background:var(--accent);color:#fff;border:none;font-family:var(--font-b);font-size:17px;font-weight:700;padding:15px 50px;border-radius:999px;cursor:pointer;transition:transform .18s,box-shadow .18s;opacity:0;animation:abrise .9s ease forwards .55s}
.ab-entrar:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(47,111,239,.35)}
.ab-tiles{display:flex;gap:18px;margin-top:60px;flex-wrap:wrap;justify-content:center;opacity:0;animation:abrise .9s ease forwards .75s}
.ab-tile{width:132px;height:120px;background:var(--card);border:1px solid var(--border);border-radius:18px;box-shadow:0 1px 4px rgba(0,0,0,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:pointer;transition:transform .18s,border-color .18s,background .18s;color:var(--text2)}
.ab-tile:hover{transform:translateY(-4px);border-color:var(--accent);background:var(--s2);color:var(--text)}
.ab-tile svg{width:30px;height:30px;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ab-tile span{font-size:12px;font-weight:600;text-align:center;padding:0 6px}
@keyframes abrise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:600px){.ab-head{padding:18px 20px}.ab-tiles{gap:12px}.ab-tile{width:104px;height:104px}}
@media (max-width:900px){.mkt3-grid{grid-template-columns:1fr!important}}
`;

const MKTC={"B3":"#009C3B","CRIPTO":"#F7931A","FOREX":"#3D7EFF","NASDAQ":"#9B6DFF","NYSE":"#E8B84B","COMMODITY":"#F5A623","—":"#5A7299"};
const MERCADOS_ORDEM=["B3","CRIPTO","FOREX","NASDAQ","NYSE","COMMODITY"];

const TOOLS=[
  // GRÁTIS
  {id:"oco",           name:"Ombro-Cabeça-Ombro", type:"Reversão",    free:true,  plano:"free"},
  {id:"tri_simetrico", name:"Triângulo Simétrico", type:"Continuação", free:true,  plano:"free"},
  {id:"topo_duplo",    name:"Topo Duplo",          type:"Reversão",    free:true,  plano:"free"},
  {id:"suporte",       name:"Suporte",             type:"Nível",       free:true,  plano:"free"},
  {id:"resistencia",   name:"Resistência",         type:"Nível",       free:true,  plano:"free"},
  // PREMIUM
  {id:"bandeira",        name:"Bandeira",              type:"Continuação", free:false, plano:"premium"},
  {id:"tri_descendente", name:"Triângulo Descendente", type:"Continuação", free:false, plano:"premium"},
  {id:"tri_ascendente",  name:"Triângulo",             type:"Continuação", free:false, plano:"premium"},
  {id:"cunha",           name:"Cunha",                 type:"Reversão",    free:false, plano:"premium"},
  {id:"retangulo",       name:"Retângulo",             type:"Continuação", free:false, plano:"premium"},
];

// Só 1D por enquanto (60m e 1S removidos da UI). "max" (não "5y"): os
// padrões marcados no admin (OCO/Topo Duplo/S-R) vêm de qualquer ponto do
// histórico do ativo, às vezes lá em 2000 — com um período curto o candle
// do padrão simplesmente não entra na janela carregada e
// resolverPadroesPorTimestamp descarta ele em silêncio.
const TFS=[
  {label:"1D", periodo:"max", intervalo:"1d"},
];

const INDICADORES = [
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
  // Ferramentas de desenho — fibo já existia (mecanismo próprio, ver
  // FERRAMENTA_INFO/CandleChart); as outras 4 são novas, todas com
  // `desenho:true` pra o dropdown saber que o clique arma uma ferramenta
  // de colocar pontos no gráfico em vez de ligar/desligar um indicador.
  {id:"fibo",       label:"Fibonacci",          cor:"#F5A623",  grupo:"Ferramentas de Desenho", icone:"Φ"},
  {id:"trend",      label:"Linha de Tendência",  cor:"#2962FF", grupo:"Ferramentas de Desenho", icone:"⟋", desenho:true},
  {id:"horizontal", label:"Linha Horizontal",    cor:"#2962FF", grupo:"Ferramentas de Desenho", icone:"➖", desenho:true},
  {id:"retangulo_desenho", label:"Retângulo",    cor:"#2962FF", grupo:"Ferramentas de Desenho", icone:"▭", desenho:true},
  {id:"canal",      label:"Canal Paralelo",      cor:"#2962FF", grupo:"Ferramentas de Desenho", icone:"∥", desenho:true},
];

// Legenda dos indicadores ativos (canto superior esquerdo do gráfico, estilo
// TradingView) — junta os dois catálogos (indicadores técnicos + padrões de
// gráfico) já que os dois ligam/desligam pelo mesmo Set `tools`. Padrões não
// têm cor fixa (variam com o resultado no próprio desenho), então usam um
// cinza neutro só pra bolinha da legenda.
const LEGENDA_ITENS = [
  ...INDICADORES.map(i => ({ id: i.id, label: i.label, cor: i.cor })),
  ...TOOLS.map(t => ({ id: t.id, label: t.name, cor: "#8B949E" })),
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

const normalizarTipo = (tipo = "") => {
  const t = (tipo || "").toLowerCase();
  return t;
};

function _desenharOCO(ctx, toX, toY, p, isSel, cw){
  const P = p.pontos;
  if(!P) return;

  // 7 pontos: F0 → OmbroEsq → Neck1 → Cabeça → Neck2 → OmbroDir → F_final
  // OCO tradicional: OE e OD são TOPOS, Neck1/Neck2 são FUNDOS, Cabeça é TOPO mais alto
  const pts    = [P.f0, P.ombro_esq, P.neck1, P.cabeca, P.neck2, P.ombro_dir, P.f_final];
  const labels = ["",   "Ombro",     "",      "Cabeça", "",      "Ombro",     ""];
  // true = label acima, false = abaixo
  const acima  = [false, true,       false,   true,     false,   true,        false];

  const coords = pts.map(pt => {
    if(!pt) return null;
    const x = toX(pt.i), y = toY(pt.preco);
    return (x == null || y == null) ? null : {x, y};
  });

  ctx.save();

  // ── ESTADO NÃO SELECIONADO: desenha SÓ o símbolo do resultado ──
  const headC = coords[3];
  const resultado = p.resultado || "pendente";
  const simbolo = resultado === "sucesso" ? "💡"
                : resultado === "falhou"  ? "❌"
                : "⏳";
  const corLinha = resultado === "sucesso" ? "#F5A623"
                 : resultado === "falhou"  ? "#FF2D55"
                 : "#888888";

  if(!isSel){
    if(headC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(simbolo, headC.x, headC.y - 30);
    }
    ctx.restore();
    return;
  }

  // ── ESTADO SELECIONADO: desenha o padrão completo ────────────
  ctx.globalAlpha = 1;
  ctx.strokeStyle = corLinha;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = "round";
  ctx.setLineDash([8, 5]);
  ctx.shadowColor = resultado === "falhou" ? "rgba(255,45,85,0.5)" : "rgba(245,166,35,0.4)";
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  let started = false;
  for(const c of coords){
    if(!c){ started = false; continue; }
    if(!started){ ctx.moveTo(c.x, c.y); started = true; }
    else ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // Símbolo acima da cabeça
  if(headC){
    ctx.globalAlpha = 1;
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, headC.x, headC.y - 32);
  }

  // ── Pontos com labels (OE, Cabeça, OD) ───────────────────────
  for(let i = 1; i <= 5; i++){
    const c = coords[i];
    if(!c) continue;
    const isHead = i === 3;
    const radius = isHead ? 5 : 3.5;

    // círculo amarelo
    ctx.globalAlpha = 0.95;
    ctx.fillStyle   = "#F5A623";
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // label
    if(labels[i]){
      ctx.fillStyle    = "#FFFFFF";
      ctx.font         = `bold ${isHead ? 10 : 9}px 'JetBrains Mono',monospace`;
      ctx.textAlign    = "center";
      if(acima[i]){
        ctx.textBaseline = "bottom";
        ctx.fillText(labels[i], c.x, c.y - radius - 4);
      } else {
        ctx.textBaseline = "top";
        ctx.fillText(labels[i], c.x, c.y + radius + 4);
      }
    }
  }

  // ── Neckline tracejada entre neck1 e neck2 (sem estender muito) ──
  const n1 = coords[2], n2 = coords[4];
  if(n1 && n2){
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(200,216,247,0.55)";
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#8B949E";
    ctx.font = "bold 9px 'JetBrains Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText("NECK " + fmtP(p.neckline), n2.x + 8, n2.y - 4);
  }

  ctx.restore();
}

// Desenho do Topo Duplo — mesma linguagem visual do OCO (lâmpada, linha
// tracejada, neckline), só que com 3 pontos (Topo 1 → Vale → Topo 2) em vez
// dos 7 do OCO.
function _desenharTopoDuplo(ctx, toX, toY, p, isSel){
  const P = p.pontos;
  if(!P) return;

  const pts    = [P.topo1, P.vale, P.topo2];
  const labels = ["Topo 1", "Vale", "Topo 2"];

  const coords = pts.map(pt => {
    if(!pt) return null;
    const x = toX(pt.i), y = toY(pt.preco);
    return (x == null || y == null) ? null : {x, y};
  });

  ctx.save();

  const headC = coords[2]; // Topo 2 é a referência da lâmpada
  const resultado = p.resultado || "pendente";
  const simbolo = resultado === "sucesso" ? "💡"
                : resultado === "falhou"  ? "❌"
                : "⏳";
  const corLinha = resultado === "sucesso" ? "#F5A623"
                 : resultado === "falhou"  ? "#FF2D55"
                 : "#888888";

  if(!isSel){
    if(headC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(simbolo, headC.x, headC.y - 30);
    }
    ctx.restore();
    return;
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = corLinha;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = "round";
  ctx.setLineDash([8, 5]);
  ctx.shadowColor = resultado === "falhou" ? "rgba(255,45,85,0.5)" : "rgba(245,166,35,0.4)";
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  let started = false;
  for(const c of coords){
    if(!c){ started = false; continue; }
    if(!started){ ctx.moveTo(c.x, c.y); started = true; }
    else ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  if(headC){
    ctx.globalAlpha = 1;
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, headC.x, headC.y - 32);
  }

  coords.forEach((c, i) => {
    if(!c) return;
    const isVale = i === 1;
    const radius = isVale ? 3.5 : 5;

    ctx.globalAlpha = 0.95;
    ctx.fillStyle   = "#F5A623";
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle    = "#FFFFFF";
    ctx.font         = `bold ${isVale ? 9 : 10}px 'JetBrains Mono',monospace`;
    ctx.textAlign    = "center";
    if(isVale){
      ctx.textBaseline = "top";
      ctx.fillText(labels[i], c.x, c.y + radius + 4);
    } else {
      ctx.textBaseline = "bottom";
      ctx.fillText(labels[i], c.x, c.y - radius - 4);
    }
  });

  // Neckline tracejada no preço do vale, entre os dois topos
  const valeC = coords[1];
  if(coords[0] && coords[2] && valeC){
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(200,216,247,0.55)";
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(coords[0].x, valeC.y);
    ctx.lineTo(coords[2].x, valeC.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#8B949E";
    ctx.font = "bold 9px 'JetBrains Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText("NECK " + fmtP(P.vale.preco), coords[2].x + 8, valeC.y - 4);
  }

  ctx.restore();
}

// Suporte/Resistência marcado manualmente — diferente da reta infinita do
// antigo detector automático, aqui é uma FAIXA sombreada limitada aos
// candles entre o primeiro e o último toque (igual a marcação no admin).
function _desenharNivel(ctx, toX, toY, p, isSel){
  const toques = p.toquesResolvidos;
  if(!toques || toques.length < 2) return;

  const coords = toques.map(t => {
    const x = toX(t.i), y = toY(t.preco);
    return (x == null || y == null) ? null : {x, y, preco: t.preco};
  }).filter(Boolean);
  if(coords.length < 2) return;

  const precos = coords.map(c => c.preco);
  const precoMin = Math.min(...precos), precoMax = Math.max(...precos);
  const xMin = Math.min(...coords.map(c => c.x));
  const xMax = Math.max(...coords.map(c => c.x));
  const yTopo = toY(precoMax);
  const yFundo = toY(precoMin);
  if(yTopo == null || yFundo == null) return;

  ctx.save();

  const resultado = p.resultado || "pendente";
  // Suporte/Resistência não tem "resultado" no sentido de padrão confirmado
  // ou não (o texto marcado é tipo "Suporte", "Suporte muito forte" — nunca
  // bate com "sucesso"/"falhou"), então sempre cai no caso padrão. Por isso
  // usa 🎯 aqui em vez da ⏳ dos outros padrões — combina mais com "nível
  // de preço visado" do que com "aguardando resultado".
  const simbolo = resultado === "sucesso" ? "💡" : resultado === "falhou" ? "❌" : "🎯";
  const cor = p.tipo === "resistencia" ? "#00D68F" : "#FF4560";
  const lampC = coords[coords.length - 1];

  if(!isSel){
    if(lampC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(simbolo, lampC.x, yTopo - 16);
    }
    ctx.restore();
    return;
  }

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = cor;
  ctx.fillRect(xMin, yTopo, xMax - xMin, Math.max(1, yFundo - yTopo));

  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(xMin, yTopo, xMax - xMin, Math.max(1, yFundo - yTopo));
  ctx.setLineDash([]);

  coords.forEach(c => {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  if(lampC){
    ctx.globalAlpha = 1;
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, lampC.x, yTopo - 18);
  }

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#8B949E";
  ctx.font = "bold 9px 'JetBrains Mono',monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${p.nome} ${fmtP(precoMin)}–${fmtP(precoMax)}`, xMax + 8, (yTopo + yFundo) / 2);

  ctx.restore();
}

// Fibonacci — desenhado a partir de 2 pontos que o próprio usuário marcou no
// gráfico (fibo = {a:{i,preco}, b:{i,preco}}), não vem de padrão nenhum.
// As linhas vão do ponto mais antigo até a borda direita do canvas — jeito
// clássico de projetar os níveis pra frente no tempo.
function _desenharFibonacci(ctx, toX, toY, fibo, canvasWidth){
  const { a, b } = fibo;
  const xA = toX(a.i);
  if(xA == null) return;

  const precoAlto = Math.max(a.preco, b.preco);
  const precoBaixo = Math.min(a.preco, b.preco);
  const amplitude = precoAlto - precoBaixo;
  if(amplitude <= 0) return;

  ctx.save();
  ctx.font = "bold 9px 'JetBrains Mono',monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  FIBO_NIVEIS.forEach(nivel => {
    // 0% sempre no preço mais alto dos dois pontos, 100% no mais baixo —
    // convenção padrão de retração.
    const preco = precoAlto - amplitude*nivel;
    const y = toY(preco);
    if(y == null) return;

    const destaque = nivel === 0 || nivel === 1 || nivel === 0.5;
    ctx.globalAlpha = destaque ? 0.85 : 0.55;
    ctx.strokeStyle = "#F5A623";
    ctx.lineWidth = destaque ? 1.3 : 1;
    ctx.setLineDash(nivel === 0 || nivel === 1 ? [] : [5,4]);
    ctx.beginPath();
    ctx.moveTo(xA, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#F5A623";
    ctx.fillText(`${(nivel*100).toFixed(1)}% · ${fmtP(preco)}`, xA + 6, y - 8);
  });

  ctx.setLineDash([]);
  ctx.restore();
}

// ── Ferramentas de desenho (usuário) ─────────────────────────
// Cor única pros 4 desenhos livres (trend/horizontal/retângulo/canal) — o
// Fibonacci continua laranja (já existia antes, ver _desenharFibonacci acima).
const DESENHO_COR  = "#2962ff";
const DESENHO_FILL = "rgba(41,98,255,0.1)";

// Metadados de cada ferramenta de desenho por clique (quantos pontos precisa
// e o texto de dica mostrado enquanto o usuário ainda não terminou de
// clicar). "fibo" fica de fora — continua no mecanismo antigo
// (tools/activeTools), só ganha um ícone novo na lista pra aparecer junto.
const FERRAMENTA_INFO = {
  trend: {
    npontos: 2,
    hints: ["Linha de Tendência: clique no 1º ponto", "Linha de Tendência: clique no 2º ponto"],
  },
  horizontal: {
    npontos: 1,
    hints: ["Linha Horizontal: clique no gráfico pra fixar o preço"],
  },
  retangulo_desenho: {
    npontos: 2,
    hints: ["Retângulo: clique no 1º canto", "Retângulo: clique no canto oposto"],
  },
  canal: {
    npontos: 3,
    hints: ["Canal Paralelo: clique no 1º ponto da linha base", "Canal Paralelo: clique no 2º ponto da linha base", "Canal Paralelo: clique pra definir a largura"],
  },
};

function _desenharHandle(ctx, x, y, cor){
  ctx.save();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// Distância de um ponto (px,py) até o segmento (x1,y1)-(x2,y2) — usado pra
// achar qual desenho está sob o cursor no clique direito (mais tolerante
// que testar só os pontos/handles).
function _distPontoSegmento(px, py, x1, y1, x2, y2){
  const dx = x2-x1, dy = y2-y1;
  const lenSq = dx*dx + dy*dy;
  let t = lenSq === 0 ? 0 : ((px-x1)*dx + (py-y1)*dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t*dx, projY = y1 + t*dy;
  return Math.hypot(px-projX, py-projY);
}

function _desenharTrend(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;
  const [xL,yL,xR,yR] = x1<=x2 ? [x1,y1,x2,y2] : [x2,y2,x1,y1];
  const m = xR!==xL ? (yR-yL)/(xR-xL) : 0;
  const xEnd = canvasWidth;
  const yEnd = yR + m*(xEnd-xR);

  ctx.save();
  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?3:2;
  ctx.beginPath();
  ctx.moveTo(xL,yL);
  ctx.lineTo(xEnd,yEnd);
  ctx.stroke();
  ctx.restore();
  _desenharHandle(ctx,x1,y1,DESENHO_COR);
  _desenharHandle(ctx,x2,y2,DESENHO_COR);
}

function _desenharHorizontal(ctx, toY, pontos, isSel, canvasWidth){
  if(pontos.length<1) return;
  const y = toY(pontos[0].preco);
  if(y==null) return;
  ctx.save();
  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?3:2;
  ctx.beginPath();
  ctx.moveTo(0,y);
  ctx.lineTo(canvasWidth,y);
  ctx.stroke();
  ctx.font = "bold 10px 'JetBrains Mono',monospace";
  ctx.fillStyle = DESENHO_COR;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(fmtP(pontos[0].preco), canvasWidth-6, y-4);
  ctx.restore();
}

function _desenharRetanguloDesenho(ctx, toX, toY, pontos, isSel){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;
  const x=Math.min(x1,x2), y=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
  ctx.save();
  ctx.fillStyle = DESENHO_FILL;
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?2.5:1.5;
  ctx.strokeRect(x,y,w,h);
  ctx.restore();
  _desenharHandle(ctx,x1,y1,DESENHO_COR);
  _desenharHandle(ctx,x2,y2,DESENHO_COR);
}

function _desenharCanal(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<3) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  const x3=toX(pontos[2].logical), y3=toY(pontos[2].preco);
  if([x1,y1,x2,y2,x3,y3].some(v=>v==null)) return;
  const [xL,yL,xR,yR] = x1<=x2 ? [x1,y1,x2,y2] : [x2,y2,x1,y1];
  const m = xR!==xL ? (yR-yL)/(xR-xL) : 0;
  const xEnd = canvasWidth;
  const yBaseEnd = yR + m*(xEnd-xR);
  const yBaseAtX3 = yL + m*(x3-xL);
  const offset = y3 - yBaseAtX3;

  ctx.save();
  ctx.fillStyle = DESENHO_FILL;
  ctx.beginPath();
  ctx.moveTo(xL,yL);
  ctx.lineTo(xEnd,yBaseEnd);
  ctx.lineTo(xEnd,yBaseEnd+offset);
  ctx.lineTo(xL,yL+offset);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?3:2;
  ctx.beginPath(); ctx.moveTo(xL,yL); ctx.lineTo(xEnd,yBaseEnd); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xL,yL+offset); ctx.lineTo(xEnd,yBaseEnd+offset); ctx.stroke();
  ctx.restore();

  _desenharHandle(ctx,x1,y1,DESENHO_COR);
  _desenharHandle(ctx,x2,y2,DESENHO_COR);
  _desenharHandle(ctx,x3,y3,DESENHO_COR);
}

// Despacha pro desenho certo conforme `d.tipo`. `toLogX`/`toPrecoY` convertem
// logical-index/preço pra pixel (ver comentário no redraw() do CandleChart
// sobre por que usamos coordenada lógica em vez de tempo — permite
// desenhar além do último candle, ex: linha de tendência se estendendo
// pro futuro).
function _desenharDesenhoUsuario(ctx, toLogX, toPrecoY, d, isSel, canvasWidth){
  if(d.tipo==="trend")      _desenharTrend(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="horizontal") _desenharHorizontal(ctx, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="retangulo_desenho") _desenharRetanguloDesenho(ctx, toLogX, toPrecoY, d.pontos, isSel);
  else if(d.tipo==="canal")  _desenharCanal(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
}

// ── Templates marcados manualmente no admin (OCO/Topo Duplo/Suporte-Resistência),
// plugados no gráfico principal — não é detecção automática, é o histórico
// real já confirmado. Os pontos vêm com timestamp (não índice), porque foram
// marcados num recorte de candles diferente do que o usuário está vendo
// agora; resolvemos pro índice certo aqui.
async function fetchPadroesMarcados(ticker, timeframe){
  try {
    const r = await fetch(`${API}/padroes-marcados/${encodeURIComponent(ticker)}?timeframe=${timeframe}`);
    if(!r.ok) return { padroes: [], niveis: [] };
    const d = await r.json();
    return { padroes: d.padroes || [], niveis: d.niveis || [] };
  } catch {
    return { padroes: [], niveis: [] };
  }
}

function resolverPadroesPorTimestamp(padroesBrutos, candles){
  const tsParaIdx = new Map(candles.map((c,i) => [Math.floor(c.timestamp/1000), i]));
  const resolverPonto = (pt) => {
    if(!pt) return null;
    const idx = tsParaIdx.get(Math.floor(pt.timestamp/1000));
    return idx === undefined ? null : { i: idx, preco: pt.preco };
  };

  return padroesBrutos.map(p => {
    // Suporte/Resistência marcados vêm como uma LISTA de toques (2+), não
    // pontos fixos nomeados — a faixa só existe entre o primeiro e o
    // último toque, nunca uma reta infinita.
    if(p.pontos?.toques){
      const toquesResolvidos = p.pontos.toques.map(resolverPonto);
      if(toquesResolvidos.length < 2 || toquesResolvidos.some(v => !v)) return null;

      const indices = toquesResolvidos.map(t => t.i);
      return {
        ...p,
        toquesResolvidos,
        lampada: toquesResolvidos[toquesResolvidos.length - 1],
        intervalo_candles: { inicio: Math.min(...indices), fim: Math.max(...indices) },
      };
    }

    const pontosResolvidos = Object.fromEntries(
      Object.entries(p.pontos || {}).map(([k,v]) => [k, resolverPonto(v)])
    );
    const lampada = resolverPonto(p.lampada);
    // Se algum ponto (ou a lâmpada) caiu fora da janela de candles visível
    // agora, o padrão inteiro não aparece — evita desenhar pela metade.
    if(!lampada || Object.values(pontosResolvidos).some(v => !v)) return null;

    const indices = Object.values(pontosResolvidos).map(pt => pt.i);
    return {
      ...p,
      pontos: pontosResolvidos,
      lampada,
      intervalo_candles: { inicio: Math.min(...indices), fim: Math.max(...indices) },
    };
  }).filter(Boolean);
}

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

// ── Cálculo dos indicadores técnicos ──────────────────────────
// Todas recebem `sorted` (candles já ordenados por timestamp crescente,
// o chamador garante isso) e devolvem série(s) no formato do Lightweight
// Charts ({time, value}). Tudo client-side, direto do OHLCV — sem
// depender do backend/ML.

// RSI (Wilder) — período 14 por padrão.
function calcularRSI(sorted, periodo=14){
  if(sorted.length < periodo+1) return [];
  const closes = sorted.map(c=>c.fechamento);
  let ganho=0, perda=0;
  for(let i=1;i<=periodo;i++){
    const diff = closes[i]-closes[i-1];
    if(diff>=0) ganho+=diff; else perda-=diff;
  }
  let mediaGanho = ganho/periodo, mediaPerda = perda/periodo;
  const rsiDe = (mg,mp)=> mp===0 ? 100 : 100-(100/(1+mg/mp));
  const out = [{ time: Math.floor(sorted[periodo].timestamp/1000), value: rsiDe(mediaGanho,mediaPerda) }];
  for(let i=periodo+1;i<closes.length;i++){
    const diff = closes[i]-closes[i-1];
    mediaGanho = (mediaGanho*(periodo-1) + Math.max(diff,0))/periodo;
    mediaPerda = (mediaPerda*(periodo-1) + Math.max(-diff,0))/periodo;
    out.push({ time: Math.floor(sorted[i].timestamp/1000), value: rsiDe(mediaGanho,mediaPerda) });
  }
  return out;
}

// Estocástico — %K bruto (period 14) suavizado por SMA3, e %D = SMA3 do %K.
function calcularEstocastico(sorted, periodoK=14, suavK=3, periodoD=3){
  if(sorted.length < periodoK) return { k: [], d: [] };
  const bruto = [];
  for(let i=periodoK-1; i<sorted.length; i++){
    const janela = sorted.slice(i-periodoK+1, i+1);
    const maxima = Math.max(...janela.map(c=>c.maxima));
    const minima = Math.min(...janela.map(c=>c.minima));
    const valor = maxima===minima ? 50 : (sorted[i].fechamento-minima)/(maxima-minima)*100;
    bruto.push({ time: Math.floor(sorted[i].timestamp/1000), value: valor });
  }
  const suavizar = (serie, periodo) => {
    const out = [];
    for(let i=periodo-1; i<serie.length; i++){
      const media = serie.slice(i-periodo+1, i+1).reduce((s,p)=>s+p.value,0)/periodo;
      out.push({ time: serie[i].time, value: media });
    }
    return out;
  };
  const k = suavizar(bruto, suavK);
  const d = suavizar(k, periodoD);
  return { k, d };
}

// ATR (Wilder) — período 14 por padrão.
function calcularATR(sorted, periodo=14){
  if(sorted.length < periodo+1) return [];
  const trs = [];
  for(let i=1; i<sorted.length; i++){
    const atual = sorted[i], anterior = sorted[i-1];
    trs.push(Math.max(
      atual.maxima - atual.minima,
      Math.abs(atual.maxima - anterior.fechamento),
      Math.abs(atual.minima - anterior.fechamento),
    ));
  }
  let media = trs.slice(0, periodo).reduce((s,v)=>s+v,0)/periodo;
  const out = [{ time: Math.floor(sorted[periodo].timestamp/1000), value: media }];
  for(let i=periodo; i<trs.length; i++){
    media = (media*(periodo-1) + trs[i])/periodo;
    out.push({ time: Math.floor(sorted[i+1].timestamp/1000), value: media });
  }
  return out;
}

// Volume médio (SMA do volume, período 20).
function calcularVolumeMA(sorted, periodo=20){
  const out = [];
  for(let i=periodo-1; i<sorted.length; i++){
    const media = sorted.slice(i-periodo+1, i+1).reduce((s,c)=>s+(c.volume||0),0)/periodo;
    out.push({ time: Math.floor(sorted[i].timestamp/1000), value: media });
  }
  return out;
}

// VWAP — como só temos candle diário (sem sessão intradiária pra ancorar),
// é uma acumulada desde o primeiro candle carregado. Com "max" de histórico
// isso vira uma média de prazo bem longo lá pro fim da série — ainda assim
// serve de referência de "preço médio ponderado por volume" do período todo.
function calcularVWAP(sorted){
  let cumPV=0, cumVol=0;
  return sorted.map(c=>{
    const tipico = (c.maxima+c.minima+c.fechamento)/3;
    cumPV += tipico*(c.volume||0);
    cumVol += (c.volume||0);
    return { time: Math.floor(c.timestamp/1000), value: cumVol>0 ? cumPV/cumVol : tipico };
  });
}

// OBV — On-Balance Volume, acumulado.
function calcularOBV(sorted){
  let obv=0;
  return sorted.map((c,i)=>{
    if(i>0){
      if(c.fechamento > sorted[i-1].fechamento) obv += c.volume||0;
      else if(c.fechamento < sorted[i-1].fechamento) obv -= c.volume||0;
    }
    return { time: Math.floor(c.timestamp/1000), value: obv };
  });
}

// Fibonacci — os 7 níveis clássicos de retração entre dois preços marcados
// pelo usuário (não é calculado a partir de candles, é geometria pura).
const FIBO_NIVEIS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// ── Estilo das linhas de Suporte/Resistência (rank mais forte = mais nítido) ──
const NIVEL_COR = { suporte: "0,214,143", resistencia: "255,69,96" };
const nivelChave = (nivel) => `${nivel.tipo}:${nivel.preco}`;
const estiloNivel = (nivel, selecionado) => {
  const rgb = NIVEL_COR[nivel.tipo];
  if(selecionado) return { color:`rgba(${rgb},1)`, lineWidth:3 };
  const alpha = nivel.rank===0 ? 0.9 : 0.4;
  const lineWidth = nivel.rank===0 ? 2 : 1;
  return { color:`rgba(${rgb},${alpha})`, lineWidth };
};

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
function HomeLineChart({data, color, tema="dark"}){
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

  // Troca de tema: só reestiliza via applyOptions, nunca recria o chart
  // (recriar perderia os dados — o efeito de setData não depende de `tema`).
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
function CandleChart({candles, padroes, niveis=[], activeTools, selPat, setSelPat, setHoverC, showVolume=true, onLampPos, tema="dark", ferramentaAtiva=null, setFerramentaAtiva, desenhos=[], setDesenhos}){
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const candleRef    = useRef(null);
  const volRef       = useRef(null);
  const sma20Ref     = useRef(null);
  const sma100Ref    = useRef(null);
  const sma200Ref    = useRef(null);
  const bbUpperRef   = useRef(null);
  const bbMidRef     = useRef(null);
  const bbLowerRef   = useRef(null);
  const vwapRef      = useRef(null);
  const volMaRef     = useRef(null);
  const oscilRef     = useRef({}); // { [id]: {paneIndex, series:[...]} } — RSI/Estocástico/ATR/OBV
  const markersRef   = useRef(null);
  const canvasRef    = useRef(null);
  const redrawRef    = useRef(null);
  const nivelLinesRef = useRef([]);
  const [nivelSel, setNivelSel] = useState(null);

  // Fibonacci — pontos marcados pelo próprio usuário (não vem de padrão
  // nenhum). fiboRef espelha o state pro handler de clique (fechamento do
  // effect não pega o valor mais novo sem isso).
  const [fibo, setFibo] = useState(null); // {a:{i,preco}, b:{i,preco}} | null
  const fiboRef = useRef(null);
  useEffect(()=>{ fiboRef.current = fibo; },[fibo]);

  // Ferramentas de desenho do usuário (trend/horizontal/retângulo/canal) —
  // `desenhos` é dono do pai (ChartPane), porque o botão "Limpar desenhos"
  // e o dropdown que arma a ferramenta também vivem lá. Refs espelham os
  // props mais recentes pros handlers de mouse (registrados uma vez só,
  // deps:[], então fecham sobre valores desatualizados sem os refs).
  const [pontosProgresso, setPontosProgresso] = useState([]);
  const pontosProgressoRef = useRef([]);
  useEffect(()=>{ pontosProgressoRef.current = pontosProgresso; },[pontosProgresso]);
  const desenhosRef = useRef(desenhos);
  useEffect(()=>{ desenhosRef.current = desenhos; },[desenhos]);
  const ferramentaAtivaRef = useRef(ferramentaAtiva);
  useEffect(()=>{ ferramentaAtivaRef.current = ferramentaAtiva; },[ferramentaAtiva]);
  const arrastandoRef = useRef(null); // {desenhoId, pontoIndex} | null
  const cliqueInicioRef = useRef(null); // {x,y} em coords de tela — onde o mousedown começou, pra distinguir clique de arraste
  const [menuCtx, setMenuCtx] = useState(null); // {x,y,desenhoId} em coords de tela

  // Trocou de ferramenta (ou desarmou) → começa a contagem de pontos do zero
  useEffect(()=>{ setPontosProgresso([]); },[ferramentaAtiva]);

  // Cursor crosshair enquanto uma ferramenta (nova ou o fibo antigo) está
  // esperando clique; volta ao normal quando nenhuma está armada (o próprio
  // mousemove troca pra "move" ao passar perto de um handle arrastável).
  useEffect(()=>{
    if(!containerRef.current) return;
    const fiboArmado = activeTools.has("fibo") && !fibo?.b;
    containerRef.current.style.cursor = (ferramentaAtiva || fiboArmado) ? "crosshair" : "default";
  },[ferramentaAtiva, activeTools, fibo]);

  // Inicializa o gráfico
  useEffect(()=>{
    if(!containerRef.current) return;

    const claro = tema==="light";
    const corFundo   = claro ? "#FFFFFF" : "#06080F";
    const corTexto   = claro ? "#5B6B84" : "#8FA3C7";
    const corGrid    = claro ? "rgba(15,23,32,.06)"  : "rgba(255,255,255,.04)";
    const corBorda   = claro ? "rgba(15,23,32,.10)"  : "rgba(255,255,255,.06)";
    const corCross   = claro ? "rgba(47,111,239,.25)" : "rgba(200,216,247,.15)";

    chartRef.current = createChart(containerRef.current, {
      layout:{
        background:{ type: ColorType.Solid, color: corFundo },
        textColor: corTexto,
        fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace',
        fontSize: 12,
      },
      grid:{
        vertLines:{ color: corGrid },
        horzLines:{ color: corGrid },
      },
      crosshair:{
        mode: CrosshairMode.Normal,
        vertLine:{ color:corCross, width:1, style: LineStyle.Dashed, labelBackgroundColor:"#3D7EFF" },
        horzLine:{ color:corCross, width:1, style: LineStyle.Dashed, labelBackgroundColor:"#3D7EFF" },
      },
      rightPriceScale:{
        borderColor: corBorda,
        textColor: corTexto,
        scaleMargins: showVolume ? { top:0.05, bottom:0.2 } : { top:0.08, bottom:0.08 },
      },
      timeScale:{
        borderColor: corBorda,
        textColor: corTexto,
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

    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(()=>{
      redrawRef.current?.();
    });

    const ro = new ResizeObserver(()=>{
      if(chartRef.current && containerRef.current){
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        redrawRef.current?.();
      }
    });
    ro.observe(containerRef.current);

    return()=>{
      ro.disconnect();
      markersRef.current = null;
      sma20Ref.current = null;
      sma100Ref.current = null;
      sma200Ref.current = null;
      bbUpperRef.current = bbMidRef.current = bbLowerRef.current = null;
      vwapRef.current = null;
      volMaRef.current = null;
      oscilRef.current = {};
      candleRef.current = null;
      volRef.current = null;
      try { chartRef.current?.remove(); } catch(e) {}
      chartRef.current = null;
    };
  },[showVolume]);

  // Troca de tema depois de montado: só reestiliza (applyOptions), nunca
  // recria o chart — recriar perderia todos os dados já plotados, porque
  // os efeitos que fazem setData() não dependem de `tema` e não rodariam
  // de novo sozinhos.
  useEffect(()=>{
    if(!chartRef.current) return;
    const claro = tema==="light";
    const corTexto = claro ? "#5B6B84" : "#8FA3C7";
    const corGrid  = claro ? "rgba(15,23,32,.06)" : "rgba(255,255,255,.04)";
    const corBorda = claro ? "rgba(15,23,32,.10)" : "rgba(255,255,255,.06)";
    const corCross = claro ? "rgba(47,111,239,.25)" : "rgba(200,216,247,.15)";
    chartRef.current.applyOptions({
      layout:{ background:{ type: ColorType.Solid, color: claro ? "#FFFFFF" : "#06080F" }, textColor: corTexto },
      grid:{ vertLines:{ color: corGrid }, horzLines:{ color: corGrid } },
      crosshair:{ vertLine:{ color:corCross }, horzLine:{ color:corCross } },
      rightPriceScale:{ borderColor: corBorda, textColor: corTexto },
      timeScale:{ borderColor: corBorda, textColor: corTexto },
    });
  },[tema]);

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

    // Mostra os últimos 100 candles por padrão — usuário pode arrastar pra ver
    // o histórico. Se tiver padrão marcado manualmente mais antigo que isso,
    // estende o começo da janela pra incluir ele — senão a marcação fica
    // escondida fora da vista, sem o usuário saber que precisa rolar pra trás.
    const totalCandles = candles.length;
    const visibleCount = 100;
    let from = Math.max(0, totalCandles - visibleCount);
    const iniciosMarcados = padroes.map(p => p.intervalo_candles?.inicio).filter(i => i != null);
    if(iniciosMarcados.length){
      from = Math.min(from, Math.max(0, Math.min(...iniciosMarcados) - 10));
    }
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from,
      to: totalCandles + 5,
    });
  },[candles, padroes]);

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
    console.log("[Indicadores] SMAs:", {sma20: activeTools.has("sma20"), sma100: activeTools.has("sma100"), sma200: activeTools.has("sma200"), bb: activeTools.has("bb"), candles: candles.length});

    // Bandas de Bollinger (período 20, 2 desvios)
    const hasBB = activeTools.has("bb") && candles.length >= 20;
    if(hasBB){
      const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);
      const upper=[], mid=[], lower=[];
      for(let i=19; i<sorted.length; i++){
        const slice = sorted.slice(i-19, i+1).map(c=>c.fechamento);
        const mean  = slice.reduce((s,v)=>s+v,0)/20;
        const std   = Math.sqrt(slice.reduce((s,v)=>s+(v-mean)**2,0)/20);
        const t     = Math.floor(sorted[i].timestamp/1000);
        upper.push({time:t, value:mean+2*std});
        mid.push(  {time:t, value:mean});
        lower.push({time:t, value:mean-2*std});
      }
      const bbOpts = {lineWidth:1, priceLineVisible:false, lastValueVisible:false, crosshairMarkerVisible:false};
      if(!bbUpperRef.current) bbUpperRef.current = chartRef.current.addSeries(LineSeries,{...bbOpts,color:"rgba(0,214,143,.6)"});
      if(!bbMidRef.current)   bbMidRef.current   = chartRef.current.addSeries(LineSeries,{...bbOpts,color:"rgba(0,214,143,.35)",lineStyle:1});
      if(!bbLowerRef.current) bbLowerRef.current = chartRef.current.addSeries(LineSeries,{...bbOpts,color:"rgba(0,214,143,.6)"});
      bbUpperRef.current.setData(upper);
      bbMidRef.current.setData(mid);
      bbLowerRef.current.setData(lower);
    } else {
      [bbUpperRef,bbMidRef,bbLowerRef].forEach(ref=>{
        if(ref.current && chartRef.current){ try{chartRef.current.removeSeries(ref.current);}catch(e){} ref.current=null; }
      });
    }

    const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);

    // VWAP — overlay no preço, mesma escala do candle.
    if(activeTools.has("vwap")){
      if(!vwapRef.current){
        vwapRef.current = chartRef.current.addSeries(LineSeries, { color:"#F5A623", lineWidth:1.5, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
      }
      vwapRef.current.setData(calcularVWAP(sorted));
    } else {
      safeRemove(vwapRef);
    }

    // Volume médio — overlay na mesma escala do histograma de volume (só existe se showVolume).
    if(activeTools.has("volume_ma") && volRef.current && candles.length >= 20){
      if(!volMaRef.current){
        volMaRef.current = chartRef.current.addSeries(LineSeries, { color:"#00D68F", lineWidth:1.5, priceScaleId:"volume", priceLineVisible:false, lastValueVisible:false, crosshairMarkerVisible:false });
      }
      volMaRef.current.setData(calcularVolumeMA(sorted, 20));
    } else {
      safeRemove(volMaRef);
    }
  },[candles, activeTools]);

  // Osciladores (RSI, Estocástico, ATR, OBV) — cada um no seu próprio pane,
  // abaixo do preço/volume. Mais simples reconstruir tudo a cada mudança do
  // que tentar reconciliar índice de pane por pane; toggle de indicador não
  // é um caminho quente, então o custo é irrelevante.
  useEffect(()=>{
    if(!chartRef.current || !candles.length) return;
    const chart = chartRef.current;
    const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);

    // Remove tudo que existia antes...
    Object.values(oscilRef.current).forEach(o=>{
      o.series.forEach(s=>{ try{ chart.removeSeries(s); }catch(e){} });
    });
    // ...e os panes vazios que sobraram (de trás pra frente, senão os
    // índices dos que ainda faltam remover mudam no meio do caminho).
    const totalPanesAntes = chart.panes().length;
    for(let i=totalPanesAntes-1; i>=1; i--){
      try{ chart.removePane(i); }catch(e){}
    }
    oscilRef.current = {};

    const definicoes = [
      {
        id:"rsi", ativo: activeTools.has("rsi") && candles.length>=15,
        montar: (paneIndex)=>{
          const s = chart.addSeries(LineSeries, {color:"#3D7EFF", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"RSI"}, paneIndex);
          s.setData(calcularRSI(sorted, 14));
          s.createPriceLine({ price:70, color:"rgba(255,69,96,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          s.createPriceLine({ price:30, color:"rgba(0,214,143,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          return [s];
        },
      },
      {
        id:"estocastico", ativo: activeTools.has("estocastico") && candles.length>=17,
        montar: (paneIndex)=>{
          const { k, d } = calcularEstocastico(sorted, 14, 3, 3);
          const sK = chart.addSeries(LineSeries, {color:"#9B6DFF", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"%K"}, paneIndex);
          const sD = chart.addSeries(LineSeries, {color:"#F5A623", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"%D"}, paneIndex);
          sK.setData(k);
          sD.setData(d);
          sK.createPriceLine({ price:80, color:"rgba(255,69,96,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          sK.createPriceLine({ price:20, color:"rgba(0,214,143,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          return [sK, sD];
        },
      },
      {
        id:"atr", ativo: activeTools.has("atr") && candles.length>=15,
        montar: (paneIndex)=>{
          const s = chart.addSeries(LineSeries, {color:"#F5A623", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"ATR"}, paneIndex);
          s.setData(calcularATR(sorted, 14));
          return [s];
        },
      },
      {
        id:"obv", ativo: activeTools.has("obv") && candles.length>=2,
        montar: (paneIndex)=>{
          const s = chart.addSeries(LineSeries, {color:"#9B6DFF", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"OBV"}, paneIndex);
          s.setData(calcularOBV(sorted));
          return [s];
        },
      },
    ];

    let proximoPane = 1;
    definicoes.forEach(def=>{
      if(!def.ativo) return;
      const series = def.montar(proximoPane);
      try{ chart.panes()[proximoPane]?.setHeight(110); }catch(e){}
      oscilRef.current[def.id] = { paneIndex: proximoPane, series };
      proximoPane++;
    });
  },[candles, activeTools]);

  // Limpa markers do Lightweight Charts (emoji é desenhado no canvas)
  useEffect(()=>{
    if(!candleRef.current) return;
    try {
      if(!markersRef.current){
        markersRef.current = createSeriesMarkers(candleRef.current, []);
      } else {
        markersRef.current.setMarkers([]);
      }
    } catch(e) {}
  },[candles]);

  // Clique → seleciona padrão mais próximo
  const selPatRef = useRef(selPat);
  useEffect(()=>{ selPatRef.current = selPat; },[selPat]);

  useEffect(()=>{
    if(!chartRef.current) return;
    const handler = (param) => {
      if(!param.time || !padroes.length) return;
      let melhor = null, menorDiff = Infinity;
      for(const p of padroes){
        if(!activeTools.has(normalizarTipo(p.tipo))) continue;
        const idxLamp = p.lampada?.i ?? p.pontos?.cabeca?.i;
        const c = candles[idxLamp];
        if(!c) continue;
        const tLamp = Math.floor(c.timestamp/1000);
        const diff = Math.abs(tLamp - param.time);
        const intervaloSeg = candles.length > 1
          ? Math.abs(Math.floor(candles[1].timestamp/1000) - Math.floor(candles[0].timestamp/1000))
          : 3600;
        if(diff < intervaloSeg * 8 && diff < menorDiff){
          menorDiff = diff;
          melhor = p;
        }
      }
      if(melhor){
        const cur = selPatRef.current;
        const isSame = cur?.tipo === melhor.tipo &&
          cur?.intervalo_candles?.inicio === melhor.intervalo_candles?.inicio;
        setSelPat(isSame ? null : melhor);
      }
    };
    chartRef.current.subscribeClick(handler);
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch(e){} };
  },[padroes, candles, activeTools, setSelPat]);

  // Fibonacci — captura os 2 cliques do usuário no gráfico (índice do candle
  // + preço exato do clique). Depois dos 2 pontos, novos cliques não fazem
  // mais nada até a ferramenta ser desligada e ligada de novo.
  useEffect(()=>{
    if(!chartRef.current || !candleRef.current || !candles.length) return;
    const timeToIndex = new Map(candles.map((c,i)=>[Math.floor(c.timestamp/1000), i]));
    const handler = (param) => {
      if(!activeTools.has("fibo")) return;
      if(fiboRef.current?.b) return;
      if(!param.time || !param.point) return;
      const idx = timeToIndex.get(param.time);
      if(idx === undefined) return;
      const preco = candleRef.current.coordinateToPrice(param.point.y);
      if(preco === null || preco === undefined) return;
      setFibo(prev=>{
        if(!prev) return { a: { i:idx, preco } };
        if(!prev.b) return { ...prev, b: { i:idx, preco } };
        return prev;
      });
    };
    chartRef.current.subscribeClick(handler);
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch(e){} };
  },[candles, activeTools]);

  // Desliga a ferramenta → limpa o desenho (próxima vez que ligar, começa do zero)
  useEffect(()=>{
    if(!activeTools.has("fibo")) setFibo(null);
  },[activeTools]);

  // Trocou de candles (novo ativo/timeframe) → os pontos antigos não fazem
  // mais sentido nesse gráfico
  useEffect(()=>{
    setFibo(null);
  },[candles]);

  // Hover/arrastar/clique-direito/colocar-ponto — tudo em eventos de
  // mouse nativos no container (não dá pra usar subscribeClick do LWC aqui,
  // ele só cobre clique simples, não arraste). Registrado uma vez só
  // (deps:[]); usa refs pra sempre ler o estado mais novo sem re-registrar
  // a cada render.
  useEffect(()=>{
    const container = containerRef.current;
    if(!container) return;
    const RAIO_HANDLE = 8;

    const pontosPixel = (d) => {
      const chart = chartRef.current, series = candleRef.current;
      if(!chart || !series) return [];
      if(d.tipo==="horizontal"){
        const y = series.priceToCoordinate(d.pontos[0].preco);
        return y==null ? [] : [{x:null, y, idx:0}];
      }
      return d.pontos
        .map((p,idx)=>{
          const x = chart.timeScale().logicalToCoordinate(p.logical);
          const y = series.priceToCoordinate(p.preco);
          return (x==null||y==null) ? null : {x,y,idx};
        })
        .filter(Boolean);
    };

    const acharHandleProximo = (mx,my) => {
      for(const d of desenhosRef.current){
        for(const pp of pontosPixel(d)){
          if(pp.x==null){ // horizontal — a linha inteira é arrastável, não só um ponto
            if(Math.abs(my-pp.y) <= RAIO_HANDLE) return {desenhoId:d.id, pontoIndex:0};
          } else if(Math.hypot(mx-pp.x, my-pp.y) <= RAIO_HANDLE){
            return {desenhoId:d.id, pontoIndex:pp.idx};
          }
        }
      }
      return null;
    };

    const acharDesenhoProximo = (mx,my) => {
      // pro clique direito — mais tolerante, testa a linha/forma inteira
      for(const d of desenhosRef.current){
        if(d.tipo==="horizontal"){
          const series = candleRef.current;
          const y = series?.priceToCoordinate(d.pontos[0].preco);
          if(y!=null && Math.abs(my-y)<=6) return d.id;
          continue;
        }
        const pts = pontosPixel(d);
        if(pts.length<2) continue;
        let achou = false;
        for(let i=0;i<pts.length-1 && !achou;i++){
          if(_distPontoSegmento(mx,my,pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y) <= 6) achou = true;
        }
        if(!achou && d.tipo==="retangulo_desenho" && pts.length===2){
          const [p1,p2] = pts;
          if(_distPontoSegmento(mx,my,p1.x,p1.y,p2.x,p1.y)<=6) achou = true;
          if(_distPontoSegmento(mx,my,p2.x,p2.y,p1.x,p2.y)<=6) achou = true;
        }
        if(achou) return d.id;
      }
      return null;
    };

    const onMouseMove = (e) => {
      if(ferramentaAtivaRef.current) return; // colocando um desenho novo — sem hover/arraste nos já existentes
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;

      if(arrastandoRef.current){
        const { desenhoId, pontoIndex } = arrastandoRef.current;
        const series = candleRef.current, chart = chartRef.current;
        if(!series || !chart) return;
        const preco = series.coordinateToPrice(my);
        if(preco==null) return;
        const logicalArraste = d_tipo => d_tipo==="horizontal" ? null : chart.timeScale().coordinateToLogical(mx);
        // setDesenhos é do pai (ChartPane) — adiado por microtask pelo mesmo
        // motivo do handler de clique acima (evita "update durante o render
        // de outro componente", já que subscribeCrosshairMove do LWC também
        // reage a esse mesmo mousemove nativo).
        queueMicrotask(()=>{
          setDesenhos?.(prev=>prev.map(d=>{
            if(d.id!==desenhoId) return d;
            if(d.tipo==="horizontal") return {...d, pontos:[{preco}]};
            const logical = logicalArraste(d.tipo);
            if(logical==null) return d;
            const novosPontos = d.pontos.slice();
            novosPontos[pontoIndex] = {logical, preco};
            return {...d, pontos:novosPontos};
          }));
        });
        return;
      }

      container.style.cursor = acharHandleProximo(mx,my) ? "move" : "default";
    };

    const onMouseDown = (e) => {
      if(e.button!==0) return;
      if(ferramentaAtivaRef.current){
        // Colocando um ponto novo — guarda onde o botão desceu; o clique só
        // "conta" no mouseup se o mouse não tiver se mexido quase nada (ver
        // onMouseUp). Não dá pra usar chart.subscribeClick do LWC aqui: ele
        // engole o 2º/3º clique quando chegam rápido um atrás do outro
        // (trata como duplo-clique) — clique-a-clique nosso, sem esse limite.
        cliqueInicioRef.current = {x:e.clientX, y:e.clientY};
        return;
      }
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      const proximo = acharHandleProximo(mx,my);
      if(proximo){
        arrastandoRef.current = proximo;
        chartRef.current?.applyOptions({ handleScroll:false, handleScale:false });
        e.preventDefault();
      }
    };

    const onMouseUp = (e) => {
      if(arrastandoRef.current){
        arrastandoRef.current = null;
        chartRef.current?.applyOptions({ handleScroll:true, handleScale:true });
        return;
      }
      const inicio = cliqueInicioRef.current;
      cliqueInicioRef.current = null;
      if(!ferramentaAtivaRef.current || !inicio) return;
      if(Math.hypot(e.clientX-inicio.x, e.clientY-inicio.y) > 5) return; // foi arraste/pan, não clique

      const chart = chartRef.current, series = candleRef.current;
      if(!chart || !series) return;
      const ferramenta = ferramentaAtivaRef.current;
      const info = FERRAMENTA_INFO[ferramenta];
      if(!info) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      const logical = chart.timeScale().coordinateToLogical(mx);
      const preco = series.coordinateToPrice(my);
      if(logical == null || preco == null) return;

      const novo = [...pontosProgressoRef.current, {logical, preco}];
      if(novo.length >= info.npontos){
        const novoDesenho = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:ferramenta, pontos:novo };
        setPontosProgresso([]);
        // setDesenhos/setFerramentaAtiva são do pai (ChartPane) — chamar
        // direto aqui (ainda dentro do listener de mouseup nativo) disparava
        // "Cannot update a component while rendering a different component"
        // (subscribeCrosshairMove do LWC também reage ao mesmo evento).
        // Adiar pro próximo microtask evita a colisão sem o usuário notar.
        queueMicrotask(()=>{
          setDesenhos?.(atual=>[...atual, novoDesenho]);
          setFerramentaAtiva?.(null);
        });
      } else {
        setPontosProgresso(novo);
      }
    };

    const onContextMenu = (e) => {
      if(ferramentaAtivaRef.current) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      const desenhoId = acharDesenhoProximo(mx,my);
      if(desenhoId){
        e.preventDefault();
        setMenuCtx({x:e.clientX, y:e.clientY, desenhoId});
      }
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("contextmenu", onContextMenu);
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("contextmenu", onContextMenu);
    };
  },[]);

  // Suportes/Resistências — linhas de preço nativas (recalculadas a cada troca de timeframe/ticker,
  // e filtradas pelos toggles "Suporte"/"Resistência" na lista de indicadores)
  useEffect(()=>{
    if(!candleRef.current) return;
    nivelLinesRef.current.forEach(({priceLine})=>{
      try{ candleRef.current.removePriceLine(priceLine); }catch(e){}
    });
    const niveisAtivos = niveis.filter(nv=>activeTools.has(nv.tipo));
    nivelLinesRef.current = niveisAtivos.map(nivel=>{
      const {color, lineWidth} = estiloNivel(nivel, false);
      const priceLine = candleRef.current.createPriceLine({
        price: nivel.preco,
        color,
        lineWidth,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${nivel.tipo==="suporte" ? "Suporte" : "Resistência"} · ${nivel.toques}x`,
      });
      return { nivel, priceLine };
    });
    setNivelSel(null);
  },[niveis, activeTools]);

  // Clique → realça um nível de suporte/resistência (clique de novo pra desfazer)
  useEffect(()=>{
    if(!chartRef.current || !candleRef.current) return;
    const handler = (param) => {
      if(!param.point || !nivelLinesRef.current.length) return;
      const precoClicado = candleRef.current.coordinateToPrice(param.point.y);
      if(precoClicado===null || precoClicado===undefined) return;
      let melhor = null, menorDiff = Infinity;
      for(const {nivel} of nivelLinesRef.current){
        const diff = Math.abs(nivel.preco - precoClicado) / precoClicado;
        if(diff < 0.003 && diff < menorDiff){
          menorDiff = diff;
          melhor = nivel;
        }
      }
      setNivelSel(prev=>{
        const chave = melhor ? nivelChave(melhor) : null;
        return (chave && chave!==prev) ? chave : null;
      });
    };
    chartRef.current.subscribeClick(handler);
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch(e){} };
  },[niveis]);

  // Reestiliza as linhas quando a seleção muda
  useEffect(()=>{
    nivelLinesRef.current.forEach(({nivel, priceLine})=>{
      const {color, lineWidth} = estiloNivel(nivel, nivelChave(nivel)===nivelSel);
      try{ priceLine.applyOptions({color, lineWidth}); }catch(e){}
    });
  },[nivelSel]);

  // Canvas — desenha padrões via _desenharOCO
  useEffect(()=>{
    const redraw = () => {
      const canvas = canvasRef.current;
      const chart  = chartRef.current;
      const series = candleRef.current;
      if(!canvas || !chart || !series || !candles.length) return;

      canvas.width  = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const toX = idx => {
        const c = candles[idx];
        if(!c) return null;
        return chart.timeScale().timeToCoordinate(Math.floor(c.timestamp/1000));
      };
      const toY = price => series.priceToCoordinate(price);
      // Coordenada lógica em vez de índice de candle — só ela cobre posições
      // além do último candle (linha de tendência/canal se estendendo pro
      // futuro); ver comentário no effect de captura de clique acima.
      const toLogX = logical => chart.timeScale().logicalToCoordinate(logical);

      for(const p of padroes){
        if(!activeTools.has(normalizarTipo(p.tipo))) continue;
        const isSel = selPat?.tipo === p.tipo &&
          selPat?.intervalo_candles?.inicio === p.intervalo_candles?.inicio;
        const tipoNorm = normalizarTipo(p.tipo);
        if(tipoNorm === "topo_duplo") _desenharTopoDuplo(ctx, toX, toY, p, isSel);
        else if(tipoNorm === "suporte" || tipoNorm === "resistencia") _desenharNivel(ctx, toX, toY, p, isSel);
        else _desenharOCO(ctx, toX, toY, p, isSel, canvas.width);
      }

      // Fibonacci — marcado pelo usuário, só desenha com os 2 pontos prontos
      if(activeTools.has("fibo") && fibo?.a && fibo?.b){
        _desenharFibonacci(ctx, toX, toY, fibo, canvas.width);
      }

      // Ferramentas de desenho do usuário (trend/horizontal/retângulo/canal)
      for(const d of desenhos){
        _desenharDesenhoUsuario(ctx, toLogX, toY, d, false, canvas.width);
      }

      // Emite posição da lâmpada do padrão selecionado pro pai
      // SÓ se o tipo do padrão ainda estiver ativo nas tools — senão limpa
      const tipoSelAtivo = selPat && activeTools.has(normalizarTipo(selPat.tipo));
      if(selPat && tipoSelAtivo && onLampPos){
        const idxHead = selPat.pontos?.cabeca?.i ?? selPat.lampada?.i;
        const precoHead = selPat.pontos?.cabeca?.preco ?? selPat.lampada?.preco;
        if(idxHead != null && precoHead != null){
          const x = toX(idxHead);
          const y = toY(precoHead);
          if(x != null && y != null){
            const rect = containerRef.current.getBoundingClientRect();
            onLampPos({x: rect.left + x, y: rect.top + y - 38});
          } else {
            onLampPos(null);
          }
        }
      } else if(onLampPos){
        onLampPos(null);
      }
    };

    redrawRef.current = redraw;
    redraw();
  },[candles, padroes, activeTools, selPat, fibo, desenhos]);

  return(
    <div ref={containerRef} style={{position:"absolute",inset:0}}>
      <canvas ref={canvasRef} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10}}/>
      {activeTools.has("fibo") && !fibo?.b && (
        <div style={{
          position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",
          background:"rgba(6,8,15,.85)",border:"1px solid rgba(245,166,35,.4)",color:"#F5A623",
          fontSize:11,fontFamily:"var(--font-m)",padding:"6px 14px",borderRadius:20,zIndex:15,
          pointerEvents:"none",whiteSpace:"nowrap",
        }}>
          {!fibo ? "Fibonacci: clique no 1º ponto do gráfico" : "Fibonacci: clique no 2º ponto do gráfico"}
        </div>
      )}
      {ferramentaAtiva && FERRAMENTA_INFO[ferramentaAtiva] && (
        <div style={{
          position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",
          background:"rgba(6,8,15,.85)",border:"1px solid rgba(41,98,255,.4)",color:"#2962ff",
          fontSize:11,fontFamily:"var(--font-m)",padding:"6px 14px",borderRadius:20,zIndex:15,
          pointerEvents:"none",whiteSpace:"nowrap",
        }}>
          {FERRAMENTA_INFO[ferramentaAtiva].hints[pontosProgresso.length] || "Clique no gráfico..."}
        </div>
      )}
      {menuCtx && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={()=>setMenuCtx(null)}>
          <div
            style={{
              position:"fixed",top:menuCtx.y,left:menuCtx.x,background:"var(--card)",
              border:"1px solid var(--border)",borderRadius:8,padding:4,minWidth:130,
              boxShadow:"0 8px 32px rgba(0,0,0,.4)",zIndex:9999,
            }}
            onMouseDown={e=>e.stopPropagation()}
          >
            <div
              onClick={()=>{
                const d = desenhos.find(x=>x.id===menuCtx.desenhoId);
                if(d){
                  setDesenhos?.(prev=>prev.filter(x=>x.id!==d.id));
                  setFerramentaAtiva?.(d.tipo);
                }
                setMenuCtx(null);
              }}
              style={{padding:"7px 10px",fontSize:12,color:"var(--text)",cursor:"pointer",borderRadius:5}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >✏️ Editar</div>
            <div
              onClick={()=>{
                setDesenhos?.(prev=>prev.filter(x=>x.id!==menuCtx.desenhoId));
                setMenuCtx(null);
              }}
              style={{padding:"7px 10px",fontSize:12,color:"var(--down)",cursor:"pointer",borderRadius:5}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >🗑️ Remover</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


// ── Search ────────────────────────────────────────────────────
function SearchItem({a,hi,onHover,onClick}){
  return(
    <div
      className={`search-item ${hi?"hi":""}`}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <span style={{display:"flex",flexDirection:"column",gap:2}}>
        <span style={{fontWeight:600,color:"var(--text)",fontSize:12}}>{a.simbolo}</span>
        <span style={{fontSize:10,color:"var(--text2)"}}>{a.nome}</span>
      </span>
      <span style={{fontSize:9,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{a.mercado}</span>
    </div>
  );
}

function SearchBar({onSelect, mercado=[]}){
  const [q,setQ]=useState("");
  const [res,setRes]=useState([]);
  const [open,setOpen]=useState(false);
  const [hi,setHi]=useState(0);
  const boxRef=useRef(null);

  const buscando = q.trim().length>0;

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
    if(!open||!buscando||res.length===0) return;
    if(e.key==="ArrowDown"){ e.preventDefault(); setHi(h=>Math.min(h+1,res.length-1)); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setHi(h=>Math.max(h-1,0)); }
    else if(e.key==="Enter"){ e.preventDefault(); res[hi]&&escolher(res[hi]); }
    else if(e.key==="Escape"){ setOpen(false); }
  };

  // Sem texto digitado: navega por mercado, listando tudo que temos.
  const grupos = MERCADOS_ORDEM
    .map(m=>({ mercado:m, ativos: mercado.filter(a=>a.mercado===m) }))
    .filter(g=>g.ativos.length>0);

  return(
    <div className="search" ref={boxRef}>
      <span className="search-ic">⌕</span>
      <input
        value={q}
        onChange={e=>setQ(e.target.value)}
        onFocus={()=>setOpen(true)}
        onKeyDown={handleKey}
        placeholder="Buscar... PETR4, BTC, OURO, EUR/USD, AAPL"
      />
      {open&&buscando&&res.length>0&&(
        <div className="search-dd">
          {res.map((a,i)=>(
            <SearchItem key={a.ticker} a={a} hi={i===hi} onHover={()=>setHi(i)} onClick={()=>escolher(a)}/>
          ))}
        </div>
      )}
      {open&&!buscando&&grupos.length>0&&(
        <div className="search-dd">
          {grupos.map(g=>(
            <div key={g.mercado}>
              <div className="search-group-head" style={{color:MKTC[g.mercado]||"#5A7299"}}>{g.mercado}</div>
              {g.ativos.map(a=>(
                <SearchItem key={a.ticker} a={a} hi={false} onHover={()=>{}} onClick={()=>escolher(a)}/>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Asset Card ────────────────────────────────────────────────
function AssetCard({a,onClick,favorito=false,onToggleFavorito}){
  const cor=MKTC[a.mercado]||"#5A7299";
  return(
    <div className="ac" onClick={onClick}>
      <div className="ac-top">
        <div className="ac-ic" style={{background:cor+"22",color:cor}}>{a.simbolo[0]}</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {onToggleFavorito && (
            <button
              className={`ac-fav ${favorito?"on":""}`}
              title={favorito?"Remover dos favoritos":"Adicionar aos favoritos"}
              onClick={e=>{ e.stopPropagation(); onToggleFavorito(); }}
            >{favorito?"★":"☆"}</button>
          )}
          <span className={`ac-chg ${a.alta?"bup":"bdn"}`}>{a.alta?"▲":"▼"}{Math.abs(a.variacao_pct||0).toFixed(2)}%</span>
        </div>
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

    // Lê o tema salvo direto do localStorage (não do atributo da <html>,
    // que pode ainda não ter sido setado pelo efeito do AppInner na hora
    // que esse efeito monta) — no claro, o mesh precisa de mais opacidade
    // pra não sumir num fundo quase branco.
    const claro = localStorage.getItem("tradeup-tema") === "light";
    const corPonto  = claro ? "rgba(47,111,239,0.6)" : "rgba(61,126,255,0.7)";
    const corLinha  = claro ? "47,111,239" : "99,130,200";
    const opLinhaMax = claro ? 0.28 : 0.12;

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
        ctx.fillStyle=corPonto;
        ctx.fill();
      }
      for(let i=0;i<points.length;i++){
        for(let j=i+1;j<points.length;j++){
          const a=points[i], b=points[j];
          const d=Math.hypot(a.x-b.x,a.y-b.y);
          if(d<130){
            ctx.beginPath();
            ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
            ctx.strokeStyle=`rgba(${corLinha},${opLinhaMax*(1-d/130)})`;
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
            <span>TRADE<span>UP</span></span>
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

// ── SIDEBAR do dashboard ──
const SB_ITENS = [
  { id:"inicio",     label:"Dashboard",       icon:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></> },
  { id:"mercados",   label:"Mercados",        icon:<><line x1="3" y1="3" x2="3" y2="21"/><line x1="3" y1="21" x2="21" y2="21"/><polyline points="7 14 11 10 14 13 19 7"/></> },
  { id:"cripto",     label:"Criptomoedas",    icon:<><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h4a2 2 0 0 1 0 4h-4zm0 4h4.5a2 2 0 0 1 0 4h-4.5zm1.5-7v2m0 9v2"/></> },
  { id:"ativos",     label:"Principais Ativos",icon:<><path d="M3 17l6-6 4 4 8-8"/><polyline points="21 3 21 9 15 3"/></>, route:"/principais-ativos" },
  { id:"favoritos",  label:"Favoritos",       icon:<><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 21.5 12 17.8 5.5 21.5 7 14.5 2 9.5 9 9"/></> },
];

// Itens com `route` são páginas próprias (URL dedicada, ex: Principais
// Ativos em /principais-ativos); os demais só trocam a `secao` local
// dentro de /mercados, sem navegar.
function Sidebar({ secao, setSecao, collapsed, setCollapsed }){
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <aside className={`sb ${collapsed?"collapsed":""}`}>
      <button className="sb-toggle" onClick={()=>setCollapsed(c=>!c)} title={collapsed?"Expandir":"Recolher"}>
        {collapsed ? "»" : "«"}
      </button>
      {/* Numa rota própria (ex: /principais-ativos), `secao` continua com
          o último valor que tinha dentro de /mercados — sem essa checagem,
          o item de dentro de /mercados ficava "active" ao mesmo tempo que
          o item da rota própria. */}
      {SB_ITENS.map(it=>{
        const numaRotaPropria = SB_ITENS.some(x=>x.route && location.pathname===x.route);
        const ativo = it.route ? location.pathname===it.route : (!numaRotaPropria && secao===it.id);
        return (
          <button
            key={it.id}
            className={`sb-item ${ativo?"active":""}`}
            onClick={()=>{
              if(it.route){ navigate(it.route); return; }
              // Item sem rota própria só existe dentro de /mercados — se o
              // clique veio de outra rota própria (ex: /principais-ativos),
              // precisa navegar de volta pra lá também, senão o clique não
              // faz nada visível e a sidebar parece travada.
              setSecao(it.id);
              if(location.pathname!=="/mercados") navigate("/mercados");
            }}
            title={collapsed?it.label:""}
          >
            <svg viewBox="0 0 24 24">{it.icon}</svg>
            <span className="sb-label">{it.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

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

function fmtGrandeMkt3(v){
  if(v>=1e12) return `$${(v/1e12).toFixed(2)}T`;
  if(v>=1e9)  return `$${(v/1e9).toFixed(2)}B`;
  if(v>=1e6)  return `$${(v/1e6).toFixed(2)}M`;
  return `$${(v||0).toFixed(2)}`;
}

function IconeAtivoMkt3({ letra, cor }){
  return <div style={{width:26,height:26,borderRadius:"50%",background:cor+"26",color:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{letra}</div>;
}

function BadgeMkt3({ children, corFundo, corTexto }){
  return <span style={{background:corFundo,color:corTexto,fontSize:10,fontFamily:"var(--font-m)",padding:"2px 7px",borderRadius:5,fontWeight:600}}>{children}</span>;
}

function VariacaoMkt3({ pct }){
  const positivo = pct>=0;
  const cor = positivo ? "#26a69a" : "#ef5350";
  return <span style={{color:cor,fontSize:12,fontWeight:700,fontFamily:"var(--font-m)"}}>{positivo?"+":""}{pct.toFixed(2)}%</span>;
}

// Selo discreto pros blocos que ainda são mock (hoje só BR10Y, e o resto
// dos indicadores de juros/inflação só cai aqui se a API do BC estiver fora).
function SeloEstimadoMkt3(){
  return (
    <span
      title="Ainda não temos fonte de dado real pra isso — valor de referência, não é o mercado ao vivo."
      style={{marginLeft:6,fontSize:9,fontWeight:700,letterSpacing:.3,padding:"1px 5px",borderRadius:4,background:"rgba(245,166,35,.15)",color:"#F5A623",verticalAlign:"middle"}}
    >ESTIMADO</span>
  );
}

function LinhaAtivoMkt3({ letra, cor, nome, badge, badgeFundo, badgeTexto, preco, unidade, variacaoPct, onClick }){
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
        <span className="st" style={{fontSize:18}}>🌐 Mercados</span>
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

const CRYPTO_TOP4 = ["BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD"];
const CORES_CRYPTO_TOP = { "BTC-USD":"#F7931A", "ETH-USD":"#627EEA", "BNB-USD":"#F3BA2F", "XRP-USD":"#3A4048" };

// Página de Criptomoedas — hero estilo TradingView (cards principais +
// capitalização total + dominância + volatilidade) com a identidade visual
// do TradeUp.
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
        <span className="st" style={{fontSize:18}}>🪙 Criptomoedas</span>
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
                <div className="idx-ic" style={{background:cor+"26",color:cor}}>{a.simbolo[0]}</div>
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
          {/* Market Cap de Stablecoins */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:8}}>
              Market Cap de Stablecoins {cripto?.stablecoins?.mock && <SeloEstimadoMkt3/>}
            </div>
            {cripto ? <>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-m)",color:"var(--text)"}}>{fmtGrandeMkt3(cripto.stablecoins.market_cap_usd)}</span>
                <VariacaoMkt3 pct={cripto.stablecoins.variacao_pct}/>
              </div>
              <div style={{position:"relative",height:52,marginTop:8}}>
                <MiniLine data={cripto.stablecoins.serie} color={cripto.stablecoins.variacao_pct>=0?"#26a69a":"#ef5350"}/>
              </div>
            </> : <div className="idx-skel" style={{height:88}}/>}
          </div>

          {/* Dominância do Bitcoin */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:10}}>
              Dominância do Bitcoin {cripto?.mock && <SeloEstimadoMkt3/>}
            </div>
            {cripto ? (
              <>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontFamily:"var(--font-m)",marginBottom:6}}>
                  <span style={{color:"#2962ff"}}>₿ {cripto.dominancia.bitcoin.toFixed(1)}%</span>
                  <span style={{color:"#26a69a"}}>Ξ {cripto.dominancia.ethereum.toFixed(1)}%</span>
                  <span style={{color:"#ef5350"}}>Outros {cripto.dominancia.outros.toFixed(1)}%</span>
                </div>
                <div style={{display:"flex",height:10,borderRadius:5,overflow:"hidden"}}>
                  <div style={{width:`${cripto.dominancia.bitcoin}%`,background:"#2962ff"}}/>
                  <div style={{width:`${cripto.dominancia.ethereum}%`,background:"#26a69a"}}/>
                  <div style={{width:`${cripto.dominancia.outros}%`,background:"#ef5350"}}/>
                </div>
              </>
            ) : <div className="idx-skel" style={{height:54}}/>}
          </div>

          {/* Volatilidade */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:10}}>
              Volatilidade {cripto?.volatilidade?.mock && <SeloEstimadoMkt3/>}
            </div>
            {cripto ? (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  {nome:"Bitcoin",  letra:"₿", cor:"#F7931A", v:cripto.volatilidade.bitcoin},
                  {nome:"Ethereum", letra:"Ξ", cor:"#627EEA", v:cripto.volatilidade.ethereum},
                ].map(({nome,letra,cor,v})=>(
                  <div key={nome} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:cor+"26",color:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>{letra}</div>
                      <span style={{fontSize:12,color:"var(--text)"}}>{nome}</span>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,fontFamily:"var(--font-m)",color:"var(--text)"}}>{v.indice.toFixed(1)}</div>
                      <VariacaoMkt3 pct={v.variacao_pct}/>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="idx-skel" style={{height:76}}/>}
          </div>
        </div>
      </div>

      <div style={{fontSize:10,color:"var(--text3)",textAlign:"right",marginTop:-8}}>Dados via Binance</div>
    </div>
  );
}

// ── Página Principais Ativos — gráfico comparativo (rota /principais-ativos) ──
const COMPARATIVO_ATIVOS = [
  { ticker:"^BVSP",    nome:"Ibovespa",   badge:"IBOV",    letra:"I", cor:"#2962FF", prefixo:"",   unidade:"pts" },
  { ticker:"BTC-USD",  nome:"Bitcoin",    badge:"BTC",     letra:"B", cor:"#F7931A", prefixo:"$",  unidade:null },
  { ticker:"GC=F",     nome:"Ouro",       badge:"GC1!",    letra:"O", cor:"#D4AF37", prefixo:"$",  unidade:null },
  { ticker:"^IXIC",    nome:"Nasdaq",     badge:"IXIC",    letra:"N", cor:"#26A69A", prefixo:"",   unidade:"pts" },
  { ticker:"USDBRL=X", nome:"Dólar/Real", badge:"USD/BRL", letra:"$", cor:"#9B6DFF", prefixo:"R$", unidade:null },
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

function PaginaPrincipaisAtivosComparativo({ tema }){
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
        <span className="st" style={{fontSize:18}}>📊 Principais Ativos</span>
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
              ? <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><div className="spin"/></div>
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
                  onClick={()=>setSelecionado(prev=>prev===cfg.ticker?null:cfg.ticker)}
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
          <span className="st" style={{fontSize:13}}>🌍 Índices Globais</span>
        </div>
        <div className="pa-carousel">
          {INDICES_GLOBAIS_FOOTER.map(cfg=>{
            const d = footer[cfg.ticker];
            if(!d) return <div key={cfg.ticker} className="idx-skel pa-carousel-card"/>;
            return (
              <div key={cfg.ticker} className="pa-carousel-card">
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

// Página genérica de listagem de ativos — usada por Favoritos. Busca por
// nome/ticker sempre disponível; o filtro por tipo de mercado só aparece
// quando a lista tem mais de um tipo.
function PaginaListaAtivos({ icone, titulo, ativos, carregando=false, mensagemVazio="Nenhum ativo encontrado.", favoritos, toggleFavorito, abrirAtivo }){
  const [filtro, setFiltro] = useState("TODOS");
  const [busca, setBusca] = useState("");

  const mercadosNaLista = [...new Set(ativos.map(a=>a.mercado))];
  const mostrarFiltro = mercadosNaLista.length > 1;

  const filtrado = ativos.filter(a => {
    if(mostrarFiltro && filtro!=="TODOS" && a.mercado!==filtro) return false;
    if(busca){
      const q = busca.toLowerCase();
      const bate = a.simbolo?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q) || a.ticker?.toLowerCase().includes(q);
      if(!bate) return false;
    }
    return true;
  });

  return (
    <div className="home">
      <div className="sh" style={{marginTop:8}}>
        <span className="st" style={{fontSize:18}}>{icone} {titulo}</span>
        <span style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{filtrado.length} ativos</span>
      </div>

      <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <div className="search" style={{maxWidth:280,flex:"1 1 240px"}}>
          <span className="search-ic">🔎</span>
          <input
            placeholder="Buscar por nome ou ticker..."
            value={busca}
            onChange={e=>setBusca(e.target.value)}
          />
        </div>
        {mostrarFiltro && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button className={`mc-tab ${filtro==="TODOS"?"active":""}`} onClick={()=>setFiltro("TODOS")}>Todos</button>
            {MERCADOS_ORDEM.filter(m=>mercadosNaLista.includes(m)).map(m=>(
              <button key={m} className={`mc-tab ${filtro===m?"active":""}`} onClick={()=>setFiltro(m)}>{m}</button>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{padding:16}}>
        <div className="agrid">
          {carregando
            ? [...Array(12)].map((_,i)=><SkeletonCard key={i}/>)
            : filtrado.length===0
              ? <div style={{gridColumn:"1 / -1",textAlign:"center",color:"var(--text2)",fontSize:12,padding:"40px 0"}}>{mensagemVazio}</div>
              : filtrado.map((a,i)=><AssetCard key={a.ticker||i} a={a} onClick={()=>abrirAtivo(a)} favorito={favoritos.has(a.ticker)} onToggleFavorito={()=>toggleFavorito(a.ticker)}/>)
          }
        </div>
      </div>
    </div>
  );
}

// Um gráfico de análise completo e independente: ativo, candles, padrões
// marcados, indicadores ativos e o padrão selecionado são todos estado
// local desta instância — é isso que permite abrir duas telas lado a lado
// (multitelas) sem uma pisar no estado da outra. `onAddSplit` só é passado
// pra tela principal (mostra o "+"); `onClose` só pra tela extra (mostra o "✕").
function ChartPane({ mercado, ticker, onTickerChange, onAddSplit, onClose, tema="dark" }){
  const navigate = useNavigate();
  const tf = TFS[0];

  const [selAtivo,setSel]     = useState(null);
  const [candles,setCandles]  = useState([]);
  const [padroes,setPadroes]  = useState([]);
  const [niveis,setNiveis]    = useState([]);
  const [loading,setLoading]  = useState(false);
  const [tools,setTools]      = useState(new Set());
  const [selPat,setSelPat]    = useState(null);
  const [lampPos,setLampPos]  = useState(null);   // {x,y} em pixels na tela
  const [tooltipAberto,setTooltipAberto] = useState(false);
  const [indOpen,setIndOpen]  = useState(false);
  const indBtnRef = useRef(null);
  const [indPos,setIndPos]    = useState({top:0,left:0});
  const [hoverC,setHoverC]    = useState(null);
  const [painelAberto,setPainelAberto] = useState(true);
  const [switcherAberto,setSwitcherAberto] = useState(false);
  const [maisAberto,setMaisAberto] = useState(false); // legenda: mostra os indicadores "a mais" (além do limite visível)
  const [ferramentaAtiva,setFerramentaAtiva] = useState(null); // ferramenta de desenho armada (trend/horizontal/retangulo_desenho/canal)
  const [desenhos,setDesenhos] = useState([]); // desenhos do usuário nesta tela — só sessão, não salva no backend

  // Fecha dropdown de indicadores ao clicar fora
  useEffect(()=>{
    if(!indOpen) return;
    const h = e => { if(!e.target.closest(".ind-wrap")) setIndOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  },[indOpen]);

  // Busca candles + padrões marcados sempre que o ticker DESTA tela muda —
  // cada ChartPane tem o seu próprio ciclo de fetch, independente das outras.
  useEffect(()=>{
    if(!ticker) return;
    // Guarda contra corrida: se o ticker mudar de novo antes desse fetch
    // terminar (troca rápida no switcher), a resposta antiga não pode
    // pisar no estado da nova — sem isso, o "info" (nome/símbolo/mercado)
    // de um ticker desatualizado podia chegar depois e ficar colado com o
    // preço do ticker novo.
    let cancelado = false;

    let ativo = mercado.find(m=>m.ticker===ticker);
    if(!ativo){
      ativo = { ticker, simbolo: ticker.split(".")[0].split("-")[0], nome: ticker, mercado: "—", moeda: "—" };
    }
    setSel(ativo);
    setLoading(true);
    setSelPat(null);
    setLampPos(null);
    setTooltipAberto(false);
    setCandles([]);
    setPadroes([]);
    setNiveis([]);
    setFerramentaAtiva(null);
    setDesenhos([]);
    Promise.all([
      fetch(`${API}/ativo/${ativo.ticker}?periodo=${tf.periodo}&intervalo=${tf.intervalo}`).then(r=>r.json()),
      fetchPadroesMarcados(ativo.ticker, tf.intervalo),
    ])
      .then(([d, marcados])=>{
        if(cancelado) return;
        const candlesRecebidos = d.candles||[];
        setCandles(candlesRecebidos);
        setPadroes(resolverPadroesPorTimestamp(marcados.padroes, candlesRecebidos));
        setNiveis(d.niveis||[]);
        if(d.info){
          setSel(prev=>({...prev, ...d.info, ticker}));
        }
        setLoading(false);
      })
      .catch(()=>{ if(!cancelado) setLoading(false); });

    return () => { cancelado = true; };
  },[ticker]);

  const toggleTool=id=>{
    setTools(prev=>{
      const n=new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      // Se desmarcou o padrão que estava selecionado, limpa seleção
      if(selPat && normalizarTipo(selPat.tipo) === id && !n.has(id)){
        setSelPat(null);
        setTooltipAberto(false);
      }
      return n;
    });
  };

  if(!selAtivo) return null;

  return (
    <div className="analysis">
      <div className="atb">
        {!onClose && <button className="bbtn" onClick={()=>navigate("/mercados")} title="Voltar pra home">←</button>}

        <span className="atick" onClick={()=>setSwitcherAberto(v=>!v)} title="Trocar ativo desta tela">
          {selAtivo.simbolo} <span style={{fontSize:11}}>▾</span>
        </span>

        {selAtivo.preco>0&&<>
          <span className="apr">{fmtP(selAtivo.preco)}</span>
          <span className={`achg ${selAtivo.alta?"bup":"bdn"}`}>{selAtivo.alta?"▲":"▼"}{Math.abs(selAtivo.variacao_pct||0).toFixed(2)}%</span>
        </>}
        <span style={{fontSize:10,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{selAtivo.mercado}</span>

        <div className="sep"/>

        {/* Dropdown Indicadores — via portal pra evitar z-index do .analysis */}
        <div className="ind-wrap">
          <button
            ref={indBtnRef}
            className={`ind-btn ${indOpen?"open":""}`}
            onClick={()=>{
              if(!indOpen && indBtnRef.current){
                const r = indBtnRef.current.getBoundingClientRect();
                setIndPos({top: r.bottom+4, left: r.left});
              }
              setIndOpen(v=>!v);
            }}
          >
            Indicadores <span className="arr">▼</span>
            {INDICADORES.filter(i=>tools.has(i.id)).length>0&&(
              <span style={{background:"var(--accent)",color:"#fff",borderRadius:8,padding:"1px 5px",fontSize:9,fontWeight:700}}>
                {INDICADORES.filter(i=>tools.has(i.id)).length}
              </span>
            )}
          </button>
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
        {onAddSplit && (
          <button className="pane-btn" onClick={onAddSplit} title="Adicionar tela">+</button>
        )}
        {onClose && (
          <button className="pane-btn danger" onClick={onClose} title="Fechar esta tela">✕</button>
        )}
        {!painelAberto && (
          <button
            onClick={()=>setPainelAberto(true)}
            title="Mostrar painel de indicadores"
            className="pane-btn"
          >«</button>
        )}
      </div>

      <div className="abody">
        <div className="achart">
          {loading&&<div className="ld"><div className="spin"/><div className="ldtxt">CARREGANDO...</div></div>}
          {!loading&&candles.length>0&&(
            <CandleChart
              candles={candles}
              padroes={padroes}
              niveis={niveis}
              activeTools={tools}
              selPat={selPat}
              setSelPat={setSelPat}
              onLampPos={pos=>{ setLampPos(pos); if(!pos) setTooltipAberto(false); }}
              setHoverC={setHoverC}
              showVolume={selAtivo.mercado!=="COMMODITY"}
              tema={tema}
              ferramentaAtiva={ferramentaAtiva}
              setFerramentaAtiva={setFerramentaAtiva}
              desenhos={desenhos}
              setDesenhos={setDesenhos}
            />
          )}
          {/* Legenda dos indicadores ativos — estilo TradingView: cada chip
              tem um "×" que desliga na hora, sem precisar abrir o painel.
              Só mostra os primeiros LEGENDA_LIMITE direto; o resto fica
              atrás do "···" (abre com hover ou clique), pra não poluir o
              gráfico quando tem muito indicador ligado ao mesmo tempo. */}
          {!loading&&candles.length>0&&tools.size>0&&(()=>{
            const ativos = LEGENDA_ITENS.filter(it=>tools.has(it.id));
            const LEGENDA_LIMITE = 3;
            const visiveis = ativos.slice(0, LEGENDA_LIMITE);
            const extras = ativos.slice(LEGENDA_LIMITE);

            const chip = (it) => (
              <div key={it.id} style={{
                display:"flex",alignItems:"center",gap:6,
                background:"rgba(6,8,15,.82)",border:"1px solid var(--border)",borderRadius:5,
                padding:"3px 4px 3px 8px",
              }}>
                <span style={{width:7,height:7,borderRadius:"50%",background:it.cor,flexShrink:0}}/>
                <span style={{fontSize:10,fontFamily:"var(--font-m)",color:"var(--text)",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.label}</span>
                <button
                  onClick={()=>toggleTool(it.id)}
                  title={`Remover ${it.label}`}
                  style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:11,lineHeight:1,padding:"1px 3px",flexShrink:0}}
                  onMouseEnter={e=>{e.currentTarget.style.color="var(--down)"}}
                  onMouseLeave={e=>{e.currentTarget.style.color="var(--text2)"}}
                >✕</button>
              </div>
            );

            return (
              <div style={{position:"absolute",top:10,left:14,zIndex:12,maxWidth:210}}>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {visiveis.map(chip)}
                </div>

                {extras.length>0 && (
                  <div
                    style={{position:"relative",marginTop:4}}
                    onMouseEnter={()=>setMaisAberto(true)}
                    onMouseLeave={()=>setMaisAberto(false)}
                  >
                    <div
                      onClick={()=>setMaisAberto(v=>!v)}
                      title={`+${extras.length} indicador${extras.length>1?"es":""}`}
                      style={{
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                        background:"rgba(6,8,15,.82)",border:"1px solid var(--border)",borderRadius:5,
                        padding:"3px 8px",cursor:"pointer",
                        fontSize:10,fontFamily:"var(--font-m)",color:"var(--text2)",
                      }}
                    >
                      +{extras.length} ···
                    </div>
                    {maisAberto && (
                      <div style={{position:"absolute",top:"100%",left:0,marginTop:4,display:"flex",flexDirection:"column",gap:4,zIndex:13}}>
                        {extras.map(chip)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {painelAberto&&<div className="rpanel">
          <button className="rp-toggle" onClick={()=>setPainelAberto(false)} title="Recolher painel" style={{position:"absolute",top:8,right:8,zIndex:10}}>»</button>

          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>

            {/* ── INDICADORES GRÁTIS ── */}
            <div className="rpsec">
              <div className="tsec-head">
                <span className="rptitle">Indicadores</span>
                <span className="tsec-tag free">Grátis</span>
              </div>
              {TOOLS.filter(t=>t.plano==="free").map(t=>(
                <div key={t.id}>
                  <div className={`titem ${tools.has(t.id)?"active":""}`} onClick={()=>toggleTool(t.id)}>
                    <div className="tchk">{tools.has(t.id)&&"✓"}</div>
                    <div className="tinf">
                      <div className="tnm">{t.name}</div>
                      <div className="tty">{t.type}</div>
                    </div>
                  </div>
                  {t.nota&&<div style={{fontSize:9,color:"var(--text3)",padding:"1px 10px 5px 36px",fontStyle:"italic"}}>ℹ️ {t.nota}</div>}
                </div>
              ))}
            </div>

            {/* ── INDICADORES PREMIUM ── */}
            <div className="rpsec">
              <div className="tsec-head">
                <span className="rptitle">Indicadores</span>
                <span className="tsec-tag prem">Premium</span>
              </div>
              {TOOLS.filter(t=>t.plano==="premium").map(t=>(
                <div key={t.id} className="titem" style={{opacity:.45,cursor:"default"}}>
                  <div className="tchk"></div>
                  <div className="tinf"><div className="tnm">{t.name}</div><div className="tty">{t.type}</div></div>
                  <span className="tlock">🔒</span>
                </div>
              ))}
              <button
                onClick={()=>navigate("/precos")}
                style={{width:"100%",marginTop:10,padding:"8px",background:"none",border:"1px solid rgba(155,109,255,.3)",borderRadius:7,color:"var(--pro)",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:".3px"}}
              >Saiba mais →</button>
            </div>

            {/* ── HINT quando nenhum indicador ativo ── */}
            {tools.size===0&&candles.length>0&&(
              <div className="rpsec">
                <div style={{fontSize:11,color:"var(--text3)",textAlign:"center",lineHeight:1.6,padding:"4px 0"}}>
                  Ative um indicador acima<br/>para ver os padrões no gráfico
                </div>
              </div>
            )}

          </div>
        </div>}

      </div>

      {/* ── BOTÃO SAIBA MAIS ── */}
      {selPat && lampPos && (
        <button
          className="saiba-mais-btn"
          style={{left: lampPos.x, top: lampPos.y}}
          onClick={e=>{ e.stopPropagation(); setTooltipAberto(v=>!v); }}
        >
          Saiba mais →
        </button>
      )}

      {/* ── PAINEL DE EXPLICAÇÃO (sidebar direita sobreposta) ── */}
      {selPat && tooltipAberto && (()=>{
        const conf    = selPat.confiabilidade ?? 0;
        const corConf = conf >= 80 ? "var(--up)" : "var(--gold)";

        return (
          <div className="exp-panel">
            <div className="exp-header">
              <div className="exp-nome">{selPat.nome}</div>
              <button className="exp-close" onClick={()=>setTooltipAberto(false)}>✕</button>
            </div>

            <div className="exp-body">
              {selPat.resultado && selPat.resultado !== "pendente" && (
                <div className="exp-badges">
                  <span className="exp-badge" style={{
                    background:selPat.resultado==="sucesso"?"rgba(0,214,143,.1)":"rgba(255,69,96,.1)",
                    color:selPat.resultado==="sucesso"?"var(--up)":"var(--down)"}}>
                    {selPat.resultado==="sucesso"?"✅ Confirmado":"❌ Não confirmado"}
                  </span>
                </div>
              )}

              <div className="exp-texto">{selPat.explicacao||selPat.descricao}</div>

              <div>
                <div className="exp-qual-row">
                  <span>Confiabilidade do padrão</span>
                  <span style={{color:corConf,fontWeight:700}}>{conf}%</span>
                </div>
                <div className="exp-bar">
                  <div className="exp-bar-fill" style={{width:`${conf}%`,background:corConf}}/>
                </div>
              </div>

              <div className="exp-aviso">⚠️ Conteúdo educativo · não é recomendação</div>
            </div>
          </div>
        );
      })()}

      {/* ── PORTAL DO DROPDOWN DE INDICADORES ── */}
      {indOpen && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={()=>setIndOpen(false)}>
          <div
            className="ind-drop"
            style={{position:"fixed",top:indPos.top,left:indPos.left}}
            onMouseDown={e=>e.stopPropagation()}
          >
            {[...new Set(INDICADORES.map(i=>i.grupo))].map(grupo=>(
              <div key={grupo}>
                <div className="ind-section">{grupo}</div>
                {INDICADORES.filter(i=>i.grupo===grupo).map(ind=>{
                  // Ferramentas de desenho (trend/horizontal/retângulo/canal)
                  // armam `ferramentaAtiva` em vez de ligar/desligar um
                  // indicador — clique no gráfico é que efetivamente desenha
                  // (ver FERRAMENTA_INFO/CandleChart). O Fibonacci continua
                  // no mecanismo antigo (toggleTool), só ganhou ícone aqui.
                  const ligado = ind.desenho ? ferramentaAtiva===ind.id : tools.has(ind.id);
                  return (
                    <div
                      key={ind.id}
                      className="ind-item"
                      onMouseDown={e=>{
                        e.stopPropagation();
                        if(ind.desenho){
                          setFerramentaAtiva(prev=>prev===ind.id?null:ind.id);
                          setIndOpen(false);
                        } else {
                          toggleTool(ind.id);
                        }
                      }}
                    >
                      <div className={`ind-chk ${ligado?"on":""}`}>{ligado&&"✓"}</div>
                      <span className="ind-label">{ind.label}</span>
                      {ind.icone
                        ? <span style={{fontSize:12,color:ind.cor,fontFamily:"var(--font-m)",width:14,textAlign:"center",flexShrink:0}}>{ind.icone}</span>
                        : <span className="ind-color" style={{background:ind.cor}}/>
                      }
                    </div>
                  );
                })}
                {grupo==="Ferramentas de Desenho" && desenhos.length>0 && (
                  <button
                    onMouseDown={e=>{ e.stopPropagation(); setDesenhos([]); }}
                    style={{
                      width:"calc(100% - 12px)",margin:"4px 6px 2px",padding:"7px 8px",
                      background:"none",border:"1px solid var(--border)",borderRadius:6,
                      color:"var(--down)",fontSize:11,fontWeight:600,cursor:"pointer",
                    }}
                  >🗑️ Limpar desenhos</button>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── POPOVER DE TROCA DE ATIVO DESTA TELA ── */}
      {switcherAberto && createPortal(
        <div
          style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:100}}
          onMouseDown={()=>setSwitcherAberto(false)}
        >
          <div className="ind-drop" style={{position:"relative",top:0,left:0,width:340,padding:0}} onMouseDown={e=>e.stopPropagation()}>
            <AssetSwitcher mercado={mercado} onSelect={a=>{ onTickerChange(a.ticker); setSwitcherAberto(false); }}/>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function AppInner(){
  const navigate = useNavigate();
  const location = useLocation();

  const [mercado,setMercado] = useState([]);
  const [marketTab,setMTab]  = useState("1D");
  const [ibovChart,setIbovChart] = useState([]);
  const [ibovLoading,setIbovLoading] = useState(false);
  const [erro,setErro]       = useState("");
  const [sbCollapsed,setSbCollapsed] = useState(false);
  const [secao,setSecao]     = useState("inicio");

  // Tema claro/escuro — persiste em localStorage, aplicado via atributo
  // data-theme na <html> (é o que os seletores :root[data-theme="light"] escutam).
  const [tema,setTema] = useState(()=> localStorage.getItem("tradeup-tema") || "dark");
  useEffect(()=>{
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tradeup-tema", tema);
  },[tema]);
  const alternarTema = () => setTema(t => t==="dark" ? "light" : "dark");

  // Favoritos — só client-side (localStorage) por enquanto, sem backend/login.
  const [favoritos,setFavoritos] = useState(()=>{
    try{ return new Set(JSON.parse(localStorage.getItem("tradeup-favoritos")||"[]")); }
    catch(e){ return new Set(); }
  });
  const toggleFavorito = (ticker) => {
    setFavoritos(prev=>{
      const n = new Set(prev);
      n.has(ticker) ? n.delete(ticker) : n.add(ticker);
      localStorage.setItem("tradeup-favoritos", JSON.stringify([...n]));
      return n;
    });
  };

  // Multitelas: null = uma tela só; com ticker = segunda tela aberta ao
  // lado da principal. A tela principal continua vindo da URL (permite
  // F5/link direto); a segunda é só estado local, não vai pra URL.
  const [splitTicker,setSplitTicker] = useState(null);

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

  const ibov        = mercado.find(m=>m.ticker==="^BVSP")||mercado[0];
  const criptos     = mercado.filter(m=>m.mercado==="CRIPTO");
  const acoes       = mercado.filter(m=>m.mercado==="B3"&&m.ticker!=="^BVSP");
  const forex       = mercado.filter(m=>m.mercado==="FOREX");

  // Fileira de índices da home: Ibovespa, Petrobras, Vale, Itaú, Bradesco,
  // nessa ordem. O /mercado às vezes falha em buscar UM ativo específico
  // naquele ciclo (sem derrubar o endpoint todo, o Yahoo derruba algumas
  // requisições concorrentes de vez em quando — o backend já tenta de novo
  // sozinho, mas nem sempre resolve) — pra nunca deixar um buraco vazio na
  // fileira, quem faltar é substituído na hora por outra ação B3
  // disponível (nunca repete um ticker já mostrado). Se não sobrar nenhuma
  // ação B3 pra substituir, mostra o nome do ativo pretendido com "Sem
  // dados" em vez de um card em branco.
  const INDICES_CONFIG = [
    {ticker:"^BVSP",    nome:"Ibovespa",  simbolo:"IBOV"},
    {ticker:"PETR4.SA", nome:"Petrobras", simbolo:"PETR4"},
    {ticker:"VALE3.SA", nome:"Vale",      simbolo:"VALE3"},
    {ticker:"ITUB4.SA", nome:"Itaú",      simbolo:"ITUB4"},
    {ticker:"BBDC4.SA", nome:"Bradesco",  simbolo:"BBDC4"},
  ];
  const TICKERS_INDICES = INDICES_CONFIG.map(c=>c.ticker);
  const substitutosIndices = mercado.filter(m=>m.mercado==="B3"&&!TICKERS_INDICES.includes(m.ticker));
  const indices = (()=>{
    const usados = new Set();
    let cursor = 0;
    return INDICES_CONFIG.map(cfg=>{
      const achado = mercado.find(m=>m.ticker===cfg.ticker);
      if(achado){ usados.add(achado.ticker); return achado; }
      while(cursor < substitutosIndices.length){
        const candidato = substitutosIndices[cursor++];
        if(!usados.has(candidato.ticker)){ usados.add(candidato.ticker); return candidato; }
      }
      // Esgotou os substitutos — se o /mercado ainda nem respondeu (mercado
      // vazio), é só carregamento normal; se já respondeu e mesmo assim
      // não achou nem substituto, é falha de verdade.
      return { ticker:cfg.ticker, nome:cfg.nome, simbolo:cfg.simbolo, semDados: mercado.length>0 };
    });
  })();

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
        <div className="logo" onClick={()=>navigate("/mercados")}>TRADE<span>UP</span></div>
        <SearchBar onSelect={abrirAtivo} mercado={mercado}/>
        <div style={{flex:1}}/>
        <div className="nav-r">
          <button className="nav-ic" title={tema==="dark" ? "Mudar pro tema claro" : "Mudar pro tema escuro"} onClick={alternarTema}>
            {tema==="dark"
              ? <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              : <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            }
          </button>
          <button className="nav-ic" title="Notificações">
            <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <button className="btn-in">Entrar</button>
          <button className="btn-pr">✦ Pro</button>
        </div>
      </nav>
      )}

      {/* ── HOME (mercados) com SIDEBAR ── */}
      {path==="/mercados"&&(
        <div className="dash">
          <Sidebar secao={secao} setSecao={setSecao} collapsed={sbCollapsed} setCollapsed={setSbCollapsed}/>
          <div className="dash-main">
          {secao==="mercados" && (
            <PaginaMercadosOverview tema={tema} abrirAtivo={abrirAtivo} setSecao={setSecao}/>
          )}
          {secao==="cripto" && (
            <PaginaCriptomoedas tema={tema} mercado={mercado} abrirAtivo={abrirAtivo}/>
          )}
          {secao==="favoritos" && (
            <PaginaListaAtivos
              icone="⭐" titulo="Favoritos"
              ativos={mercado.filter(m=>favoritos.has(m.ticker))}
              mensagemVazio="Você ainda não favoritou nenhum ativo — clique na estrela ☆ de qualquer card pra adicionar aqui."
              favoritos={favoritos} toggleFavorito={toggleFavorito} abrirAtivo={abrirAtivo}
            />
          )}
          {secao==="inicio" && (
          <div className="home">
          {erro&&(
            <div style={{padding:"10px 16px",color:"var(--down)",fontSize:11,fontFamily:"var(--font-m)",background:"rgba(255,69,96,.06)",borderRadius:8,border:"1px solid rgba(255,69,96,.2)"}}>
              ⚠️ {erro}
            </div>
          )}

          {/* FILEIRA DE ÍNDICES */}
          <div>
            <div className="sh">
              <span className="st">📌 Índices e Principais Ações</span>
            </div>
            <div className="idx-row">
              {indices.map((a,i)=>{
                // Ticker sem dado (e sem substituto) — mostra o nome do
                // ativo pretendido em vez de um card em branco. "semDados"
                // distingue "ainda carregando" (mercado nem respondeu) de
                // "respondeu e mesmo assim não achou" (falha de verdade).
                if("semDados" in a){
                  return (
                    <div key={a.ticker||i} className="idx-btn" style={{cursor:"default",opacity:.55}}>
                      <div className="idx-top">
                        <div className="idx-ic" style={{background:"var(--border)",color:"var(--text3)"}}>{a.simbolo[0]}</div>
                        <span className="idx-name">{a.nome}</span>
                      </div>
                      <div className="idx-line">
                        {a.semDados
                          ? <span style={{fontSize:11,color:"var(--text3)"}}>Sem dados</span>
                          : <span style={{fontSize:11,color:"var(--text3)",display:"flex",alignItems:"center",gap:6}}>
                              <span className="spin" style={{width:10,height:10,borderWidth:2}}/>Carregando
                            </span>
                        }
                      </div>
                    </div>
                  );
                }
                const cor = MKTC[a.mercado] || "var(--accent)";
                return (
                  <div key={a.ticker} className="idx-btn" onClick={()=>abrirAtivo(a)}>
                    <div className="idx-top">
                      <div className="idx-ic" style={{background:cor}}>{a.simbolo[0]}</div>
                      <span className="idx-name">{a.nome||a.simbolo}</span>
                    </div>
                    <div className="idx-line">
                      <span className="idx-price">{fmtP(a.preco)}</span>
                      <span className={`idx-chg ${a.alta?"up":"down"}`}>
                        {a.alta?"▲":"▼"} {Math.abs(a.variacao_pct||0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                    {["1D"].map(t=>(
                      <button key={t} className={`mc-tab ${marketTab===t?"active":""}`} onClick={()=>setMTab(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mc-chart">
                {ibovSerie.length>0
                  ?<HomeLineChart data={ibovSerie} color={ibov?.alta?"#00D68F":"#FF4560"} tema={tema}/>
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
                  ?criptos.slice(0,6).map((a,i)=><AssetCard key={i} a={a} onClick={()=>abrirAtivo(a)} favorito={favoritos.has(a.ticker)} onToggleFavorito={()=>toggleFavorito(a.ticker)}/>)
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
                  ?[...acoes,...forex].slice(0,6).map((a,i)=><AssetCard key={i} a={a} onClick={()=>abrirAtivo(a)} favorito={favoritos.has(a.ticker)} onToggleFavorito={()=>toggleFavorito(a.ticker)}/>)
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
          </div>
        </div>
      )}

      {/* ── PRINCIPAIS ATIVOS (rota própria — gráfico comparativo) ── */}
      {path==="/principais-ativos"&&(
        <div className="dash">
          <Sidebar secao={secao} setSecao={setSecao} collapsed={sbCollapsed} setCollapsed={setSbCollapsed}/>
          <div className="dash-main">
            <PaginaPrincipaisAtivosComparativo tema={tema}/>
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
                return lista.map((a,i)=><AssetCard key={i} a={a} onClick={()=>abrirAtivo(a)} favorito={favoritos.has(a.ticker)} onToggleFavorito={()=>toggleFavorito(a.ticker)}/>);
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── ANÁLISE: 1 tela, ou 2 lado a lado (multitelas) ──
          A tela principal usa key="primary" sempre — assim, ao abrir/fechar
          a segunda tela, o React reconcilia o mesmo componente em vez de
          desmontar e remontar (o que perderia indicadores/seleção e
          disparodava um refetch à toa). */}
      {isAnalysis && tickerUrl && (
        <div className="analysis-row">
          <ChartPane
            key="primary"
            mercado={mercado}
            ticker={tickerUrl}
            onTickerChange={t=>navigate(`/ativo/${encodeURIComponent(t)}`)}
            onAddSplit={splitTicker ? undefined : ()=>setSplitTicker(tickerUrl)}
            tema={tema}
          />
          {splitTicker && (
            <ChartPane
              key="secondary"
              mercado={mercado}
              ticker={splitTicker}
              onTickerChange={setSplitTicker}
              onClose={()=>setSplitTicker(null)}
              tema={tema}
            />
          )}
        </div>
      )}
      </>
    );
}


// Decide entre a Abertura (sobreposta) e o app.
// montado para que os dados de mercado já carreguem no fundo enquanto o
// usuário vê a tela de abertura.
function Router(){
  const location = useLocation();
  const naAbertura = location.pathname === "/";

  if (location.pathname === "/admin/login") return <AdminLogin/>;
  if (location.pathname === "/admin/callback") return <AdminCallback/>;
  if (location.pathname === "/admin/templates") {
    return <RequireAdmin><AdminTemplates/></RequireAdmin>;
  }
  if (location.pathname === "/admin/templates/topo-duplo") {
    return <RequireAdmin><AdminTemplatesTopoDuplo/></RequireAdmin>;
  }
  if (location.pathname === "/admin/templates/niveis") {
    return <RequireAdmin><AdminTemplatesNiveis/></RequireAdmin>;
  }

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