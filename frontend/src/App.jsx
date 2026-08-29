import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, useNavigate, useLocation } from "react-router-dom";
import { createChart, ColorType, CrosshairMode, LineStyle, AreaSeries, LineSeries, CandlestickSeries, HistogramSeries, createSeriesMarkers } from "lightweight-charts";
import AdminLogin from "./admin/AdminLogin.jsx";
import AdminCallback from "./admin/AdminCallback.jsx";
import AdminTemplates from "./admin/AdminTemplates.jsx";
import AdminTemplatesTopoDuplo from "./admin/AdminTemplatesTopoDuplo.jsx";
import AdminTemplatesNiveis from "./admin/AdminTemplatesNiveis.jsx";
import AdminTemplatesBandeiraAlta from "./admin/AdminTemplatesBandeiraAlta.jsx";
import AdminTemplatesBandeiraBaixa from "./admin/AdminTemplatesBandeiraBaixa.jsx";
import RequireAdmin from "./admin/RequireAdmin.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";
import Login from "./auth/Login.jsx";
import Cadastro from "./auth/Cadastro.jsx";
import RecuperarSenha from "./auth/RecuperarSenha.jsx";
import RedefinirSenha from "./auth/RedefinirSenha.jsx";
import AuthCallback from "./auth/AuthCallback.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Painel de padrões (OCO/Topo Duplo/Suporte-Resistência) escondido pro
// primeiro grupo de teste — não está pronto pra eles verem ainda. Um
// flag só, fácil de religar quando decidir trazer de volta.
const PAINEL_PADROES_ATIVO = false;

// Breakpoints do site inteiro: mobile <768px, tablet 768–1024px, desktop
// >1024px — os mesmos valores usados nas media queries do CSS abaixo.
// Esse hook é só pra decisões que precisam acontecer em JS (não dá pra
// resolver só com CSS), tipo trocar o comportamento de um clique.
const MOBILE_BREAKPOINT = 768;
function useIsMobile(){
  const [isMobile, setIsMobile] = useState(
    ()=> typeof window!=="undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(()=>{
    const mq = window.matchMedia(`(max-width:${MOBILE_BREAKPOINT-1}px)`);
    const onChange = ()=> setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return ()=> mq.removeEventListener("change", onChange);
  },[]);
  return isMobile;
}

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
  --pro:#3D7EFF;
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
  --pro:#2F6FEF;
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
.btn-pr{background:#3D7EFF;border:none;color:#fff;font-weight:700;font-size:12px;padding:6px 18px;border-radius:7px;cursor:pointer;font-family:var(--font-b)}

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
.tscroll{display:flex;align-items:center;animation:scl 60s linear infinite;white-space:nowrap}
@keyframes scl{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ti{display:flex;align-items:center;gap:6px;padding:0 18px;border-right:1px solid var(--border);height:26px;font-size:10px;font-family:var(--font-m)}
.tn{color:var(--text3)}

/* ANALYSIS */
.analysis{display:flex;flex-direction:column;height:calc(100vh - 52px);min-width:960px;position:relative}
/* Multitelas: até 2 telas → linha única, cada .analysis vira metade da
   largura (min-width bem menor, senão 2×960px nunca cabe numa tela comum).
   3-4 telas → classe "grid4", grade 2×2 (4×480px numa linha só não cabe em
   tela nenhuma). */
.analysis-row{display:flex;height:calc(100vh - 52px);overflow:hidden}
.analysis-row .analysis{flex:1;min-width:480px;height:100%}
.analysis-row .analysis:not(:last-child){border-right:1px solid var(--border)}
.analysis-row.grid4{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.analysis-row.grid4 .analysis{min-width:0}
.analysis-row.grid4 .analysis:not(:last-child){border-right:1px solid var(--border)}
.analysis-row.grid4 .analysis:nth-child(even){border-right:none}
.analysis-row.grid4 .analysis:nth-child(-n+2){border-bottom:1px solid var(--border)}
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

/* ───────── DASHBOARD (mesmo estilo da página de Cripto) ───────── */
.dash-top-row{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;width:100%}
@media (max-width:1100px){.dash-top-row{grid-template-columns:repeat(3,1fr)!important}}
@media (max-width:600px){.dash-top-row{grid-template-columns:repeat(2,1fr)!important}}

/* ───────── PRINCIPAIS ATIVOS (gráfico comparativo) ───────── */
.pa-grid{display:grid;grid-template-columns:7fr 3fr;gap:16px;align-items:stretch;width:100%}
@media (max-width:1100px){.pa-grid{grid-template-columns:1fr!important}}
.pa-toggle-row{display:flex;gap:8px;flex-wrap:wrap}
.pa-toggle{display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);color:var(--text2);font-size:11px;font-family:var(--font-m);padding:5px 10px;border-radius:999px;cursor:pointer;transition:all .15s;opacity:.55}
.pa-toggle.on{opacity:1}
.pa-toggle:hover{border-color:var(--accent)}
.pa-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.pa-carousel{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px}
.pa-carousel-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;min-width:172px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;cursor:pointer;transition:transform .15s,border-color .15s,background .15s}
.pa-carousel-card:hover{transform:translateY(-2px);border-color:var(--accent);background:var(--s2)}

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
.ab-hero h1{font-family:var(--font-h);font-size:clamp(44px,8.5vw,104px);line-height:.98;font-weight:400;letter-spacing:2px;color:var(--text);margin-bottom:28px;opacity:0;animation:abrise .9s ease forwards .15s;text-shadow:0 2px 24px rgba(61,126,255,.25)}
.ab-hero h1 .l2{display:block;color:var(--accent)}
.ab-hero p{max-width:600px;font-size:clamp(16px,2.2vw,21px);font-weight:500;line-height:1.6;color:var(--text);margin-bottom:44px;opacity:0;animation:abrise .9s ease forwards .35s}
.ab-entrar{background:var(--accent);color:#fff;border:none;font-family:var(--font-b);font-size:19px;font-weight:800;letter-spacing:.3px;padding:18px 64px;border-radius:999px;cursor:pointer;transition:transform .18s,box-shadow .18s;opacity:0;animation:abrise .9s ease forwards .55s;box-shadow:0 10px 40px rgba(61,126,255,.35)}
.ab-entrar:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(47,111,239,.35)}
@keyframes abrise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:600px){.ab-head{padding:18px 20px}}

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVO — breakpoints do site inteiro:
   mobile <768px · tablet 768–1024px · desktop >1024px
   (mesmos valores do hook useIsMobile, em JS, pra decisões que CSS
   sozinho não resolve — ex: o clique de "+ tela" no multitelas)
   ═══════════════════════════════════════════════════════════════ */

/* ── Header: elementos exclusivos de mobile ficam escondidos no
   desktop por padrão; a media query abaixo inverte pra <768px. ── */
.hamburger-btn,.search-toggle-btn,.search-close-btn,.tema-toggle-mobile{display:none}
.hamburger-btn{background:none;border:1px solid var(--border);color:var(--text2);border-radius:8px;cursor:pointer;align-items:center;justify-content:center;width:44px;height:44px;flex-shrink:0}
.hamburger-btn svg,.search-toggle-btn svg,.tema-toggle-mobile svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.search-toggle-btn,.tema-toggle-mobile{width:44px;height:44px;flex-shrink:0}
.nav-search-wrap{display:contents}
/* Dentro do drawer, o tema já aparece sozinho no canto do header mobile
   (.tema-toggle-mobile) — evita duplicar o botão lá dentro. */
.mobile-drawer-conta .tema-toggle{display:none}

/* ── Menu hambúrguer (drawer + backdrop) — só existe/anima no mobile,
   mas fica sempre no DOM (classes de visibilidade cuidam do resto). ── */
.mobile-drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;animation:mdFade .15s ease}
@keyframes mdFade{from{opacity:0}to{opacity:1}}
.mobile-drawer{position:fixed;top:0;left:0;bottom:0;width:82vw;max-width:300px;background:var(--s1);border-right:1px solid var(--border);z-index:901;display:flex;flex-direction:column;padding:14px;overflow-y:auto;animation:mdSlide .2s cubic-bezier(.25,.46,.45,.94)}
@keyframes mdSlide{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.mobile-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 16px}
.mobile-drawer-close{width:40px;height:40px;border-radius:8px;background:var(--card);border:1px solid var(--border);color:var(--text2);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
.mobile-drawer-nav{display:flex;flex-direction:column;gap:2px}
.mobile-drawer-nav .sb-item{min-height:44px}
.mobile-drawer-divider{height:1px;background:var(--border);margin:14px 4px}
.mobile-drawer-conta{display:flex;flex-direction:column;gap:8px;padding:0 4px}
.mobile-drawer-conta .btn-in,.mobile-drawer-conta .btn-pr{width:100%;min-height:44px;text-align:center}

/* ── Toast "multitelas indisponível" — ChartPane, mobile ── */
.mobile-toast{position:fixed;left:50%;bottom:calc(26px + 16px);transform:translateX(-50%);background:var(--s1);border:1px solid var(--border);color:var(--text);font-size:12px;font-weight:600;padding:10px 16px;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.4);z-index:1200;white-space:nowrap;animation:toastIn .2s ease}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ── Aviso "crie sua conta" — favoritar/salvar desenhos sem login ── */
.cadastro-toast{position:fixed;left:50%;bottom:calc(26px + 16px);transform:translateX(-50%);display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--s1);border:1px solid var(--accent);color:var(--text);font-size:12px;font-weight:600;line-height:1.4;padding:10px 10px 10px 16px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:1300;max-width:min(420px,calc(100vw - 24px));animation:toastIn .2s ease}
.cadastro-toast span{flex:1 1 200px}
.cadastro-toast>button:first-of-type{flex-shrink:0;background:var(--accent);color:#fff;border:none;border-radius:7px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.cadastro-toast-x{flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;width:28px;height:28px;border-radius:6px}
.cadastro-toast-x:hover{background:var(--card);color:var(--text)}

/* ═══════════════════ TABLET — 768–1024px ═══════════════════ */
@media (max-width:1024px) and (min-width:768px){
  .mkt3-grid{grid-template-columns:1fr 1fr!important}
}

/* ═══════════════════ MOBILE — <768px ═══════════════════ */
@media (max-width:767px){
  /* Só a página (documento) rola — não html/body/#root/.home todos com
     overflow-y próprio ao mesmo tempo. Essa pilha de scrolls aninhados era
     o motivo da rolagem travar: o dedo arrastava um container que não
     necessariamente continha o resto, então descer/subir "tudo" deixava
     pedaço cortado, e só dava pra ver o resto arrastando a barrinha de
     rolagem interna do .home. Com altura natural (sem calc(100vh-52px) +
     overflow-y:auto duplicado) e overflow só no html/body, é uma rolagem
     só, do jeito que o navegador já faz sozinho — inclusive some a barra
     de rolagem visível (webkit-scrollbar abaixo). */
  html,body{overflow-x:hidden;overflow-y:auto;height:auto;-webkit-overflow-scrolling:touch}
  #root{overflow:visible;height:auto;min-height:100%}
  html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}
  html,body{scrollbar-width:none}
  *{-webkit-tap-highlight-color:transparent}

  /* Textos legíveis sem zoom + botões com alvo de toque de 44px */
  body{-webkit-text-size-adjust:100%}
  button,.btn-in,.btn-pr,input,select,textarea{font-size:max(14px,1em)}
  button{min-height:44px}
  .idx-btn,.crypto-top-card,.pa-carousel-card,.ac,.card>button,.sb-item,.ind-item,.dd-item,.search-item,.si{min-height:44px}
  .ac-fav{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center}
  .pane-btn{width:40px;height:40px}

  /* ── HEADER ── */
  .nav{padding:0 12px;gap:10px;position:relative}
  .logo{font-size:19px;letter-spacing:2px}
  .nav-r{display:none}
  .hamburger-btn,.search-toggle-btn,.tema-toggle-mobile{display:flex}
  .nav-search-wrap{display:none}
  .nav-search-wrap.aberta{
    display:flex;align-items:center;gap:6px;
    position:absolute;inset:0;background:var(--s1);padding:0 10px;z-index:210;
  }
  .nav-search-wrap.aberta .search{max-width:none;flex:1}
  .nav-search-wrap .search-close-btn{display:flex;width:40px;height:40px;flex-shrink:0}

  /* ── SIDEBAR (desktop, dentro de .dash) — some, vira drawer ── */
  .sb{display:none}
  .dash{display:block;width:100%}
  .dash-main{width:100%}

  /* ── HOME / DASHBOARD ── */
  .home{padding:14px 12px 40px;height:auto;overflow-y:visible}

  /* Cards de ativos do topo — scroll horizontal, ~140px cada */
  .dash-top-row{display:flex!important;flex-shrink:0;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;gap:10px;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding-bottom:4px}
  .dash-top-row>*{flex:0 0 auto;min-width:140px;scroll-snap-align:start}

  /* Gráfico principal 100% largura + painel de padrões desce pra baixo
     (o grid 7fr/3fr já vira 1 coluna em ≤1100px — aqui só garante altura
     mínima e que os cards empilham verticalmente, sem cortar texto). */
  .crypto-main-grid{gap:14px}
  .mc-chart{height:250px;min-height:250px}
  .mc-price{font-size:26px}
  .mc-top{flex-wrap:wrap}

  /* Contador/legendas que podem quebrar em 2 linhas em vez de cortar */
  .idx-name,.ac-nm,.pat-nome{white-space:normal}

  /* ── PÁGINA MERCADOS (3 colunas) → 1 coluna ── */
  .mkt3-grid{grid-template-columns:1fr!important;gap:12px!important}

  /* ── CRIPTOMOEDAS ── */
  .crypto-top-row{display:flex!important;flex-shrink:0;flex-wrap:nowrap;overflow-x:auto;gap:10px;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding-bottom:4px}
  .crypto-top-row>*{flex:0 0 46%;min-width:150px;scroll-snap-align:start}

  /* ── PRINCIPAIS ÍNDICES ── */
  .pa-carousel{-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}
  .pa-carousel-card{scroll-snap-align:start;min-width:150px}

  /* ── ANÁLISE (gráfico de um ativo) ── */
  .analysis{min-width:0!important;width:100%}
  /* Piso de altura pro container do candlestick+volume — sem isso, num
     viewport bem baixo (teclado aberto, celular deitado) o flex:1 podia
     encolher demais e o volume (25% desse espaço) virar pixels de menos
     pra aparecer de verdade. */
  .achart{min-height:400px}
  /* Multitelas no celular = trocar de "mesa" (estilo poker), não grade lado
     a lado: força layout de bloco cheio mesmo se a classe grid4 (2x2 do
     desktop) estiver aplicada — a tela oculta já vem com display:none via
     inline style (prop ocultoMobile no ChartPane), então só a ativa ocupa
     espaço. A classe analysis-wrap é quem reserva os 100vh-52px agora
     (mesa-tabs + o gráfico dividem essa altura); analysis-row vira flex:1
     dentro dela em vez de reservar a tela inteira sozinha — senão, com a
     barra de abas visível, o gráfico vazaria pra baixo da tela. */
  .analysis-wrap{display:flex;flex-direction:column;height:calc(100vh - 52px)}
  .analysis-row, .analysis-row.grid4{display:block!important;overflow-x:hidden;flex:1;min-height:0}
  .analysis-row .analysis{min-width:0!important;width:100%!important;height:100%!important;border:none!important}

  /* Barra de abas das mesas — só aparece com 2+ telas abertas (ver JSX) */
  .mesa-tabs{display:flex;align-items:center;gap:6px;padding:8px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:var(--s1);border-bottom:1px solid var(--border);flex-shrink:0}
  .mesa-tab{display:flex;align-items:center;gap:6px;flex-shrink:0;padding:7px 12px;border-radius:8px;background:var(--s2);color:var(--text2);font-size:12px;font-weight:700;font-family:var(--font-m);white-space:nowrap;border:1px solid var(--border);min-height:32px}
  .mesa-tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
  .mesa-tab-x{opacity:.7;padding:2px;line-height:1}
  .mesa-tab-add{color:var(--text);font-size:15px;font-weight:800;padding:7px 14px}

  .atb{padding:0 10px;gap:6px;height:48px}
  .atick{font-size:17px}
  .ind-btn{padding:6px 9px;min-height:44px}
  /* A setinha ▼ sugere "abre pra baixo", mas no mobile isso agora é um
     bottom sheet (sobe de baixo pra cima) — mantê-la ficaria incoerente. */
  .ind-btn .arr{display:none}
  .sep{display:none}
  .apr,.achg{display:none}

  /* Indicadores / Desenho — viram bottom sheet em vez de dropdown ancorado */
  .ind-drop-sheet{
    top:auto!important;left:0!important;right:0!important;bottom:0!important;
    width:100%!important;max-width:100%;min-width:0;
    border-radius:16px 16px 0 0;
    max-height:75vh;overflow-y:auto;
    padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px));
    animation:sheetUp .2s cubic-bezier(.25,.46,.45,.94);
    box-shadow:0 -8px 32px rgba(0,0,0,.5);
  }
  .ind-drop-sheet .ind-item{min-height:44px}
  @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}

  /* Painel lateral de padrões (quando ligado) desce pra baixo do gráfico */
  .abody{flex-direction:column}
  .rpanel{width:100%;border-left:none;border-top:1px solid var(--border)}

  /* ── TICKER DE RODAPÉ ── */
  .ti{font-size:11px;padding:0 14px}

  /* ── LANDING PAGE ── */
  .ab-hero h1{font-size:2.25rem!important;letter-spacing:1px}
  .ab-hero p{font-size:15px;font-weight:600;padding:0 4px}
  .ab-entrar{width:100%;padding:17px 24px;font-size:17px}
}
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
const TFS=[
  {label:"60m", periodo:"2y",  intervalo:"60m"},
  {label:"1D",  periodo:"max", intervalo:"1d"},
  {label:"1S",  periodo:"max", intervalo:"1wk"},
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
];

// Ferramentas de desenho — botão/dropdown próprio na toolbar, separado do
// de Indicadores (ver ChartPane). Fibonacci usa o mecanismo antigo
// (toggleTool/activeTools, igual antes); as outras 4 usam `ferramentaAtiva`
// (ver FERRAMENTA_INFO/CandleChart) — o dropdown sabe qual usar pelo
// `desenho:true`.
const FERRAMENTAS_DESENHO_LISTA = [
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
const LEGENDA_ITENS = [
  ...INDICADORES.map(i => ({ id: i.id, label: i.label, cor: i.cor })),
  ...TOOLS.map(t => ({ id: t.id, label: t.name, cor: "#8B949E" })),
  // Fibonacci não está mais em INDICADORES (ganhou botão próprio de
  // Ferramentas de Desenho), mas continua ligando/desligando pelo mesmo
  // Set `tools` — sem essa linha ele sumia da legenda do gráfico.
  { id:"fibo", label:"Fibonacci", cor:"#F5A623" },
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

// Marcador de resultado do padrão — bolinha colorida com um ícone
// vetorial (✓ sucesso, ✕ falhou, ponto pendente) desenhado no canvas.
// Substitui os antigos emojis 💡/❌/⏳/🎯, que destoavam do resto da
// interface (sem controle de cor/peso, ficavam grandes e infantis).
function _desenharMarcadorResultado(ctx, x, y, resultado, cor, raio=9){
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI*2);
  ctx.fillStyle = cor;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = cor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  if(resultado === "sucesso"){
    ctx.beginPath();
    ctx.moveTo(x-raio*0.45, y+raio*0.02);
    ctx.lineTo(x-raio*0.1,  y+raio*0.4);
    ctx.lineTo(x+raio*0.5,  y-raio*0.35);
    ctx.stroke();
  } else if(resultado === "falhou"){
    ctx.beginPath();
    ctx.moveTo(x-raio*0.38, y-raio*0.38); ctx.lineTo(x+raio*0.38, y+raio*0.38);
    ctx.moveTo(x+raio*0.38, y-raio*0.38); ctx.lineTo(x-raio*0.38, y+raio*0.38);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, raio*0.24, 0, Math.PI*2);
    ctx.fillStyle = cor;
    ctx.fill();
  }
  ctx.restore();
}

function _desenharOCO(ctx, toX, toY, p, isSel){
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

  // ── ESTADO NÃO SELECIONADO: desenha SÓ o marcador do resultado ──
  const headC = coords[3];
  const resultado = p.resultado || "pendente";
  const corLinha = resultado === "sucesso" ? "#F5A623"
                 : resultado === "falhou"  ? "#FF2D55"
                 : "#888888";

  if(!isSel){
    if(headC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, headC.x, headC.y - 30, resultado, corLinha, 8);
      ctx.globalAlpha = 1;
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

  // Marcador acima da cabeça
  if(headC){
    _desenharMarcadorResultado(ctx, headC.x, headC.y - 32, resultado, corLinha, 9);
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
  const corLinha = resultado === "sucesso" ? "#F5A623"
                 : resultado === "falhou"  ? "#FF2D55"
                 : "#888888";

  if(!isSel){
    if(headC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, headC.x, headC.y - 30, resultado, corLinha, 8);
      ctx.globalAlpha = 1;
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
    _desenharMarcadorResultado(ctx, headC.x, headC.y - 32, resultado, corLinha, 9);
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

// Desenho da Bandeira (alta/baixa) — mastro (linha sólida, início→fim) +
// canal de consolidação (as duas linhas tracejadas, topo1→topo2 e
// fundo1→fundo2), mesmos 6 pontos marcados no admin (ver STEPS/linePairs em
// AdminTemplatesBandeiraAlta/Baixa.jsx — aqui só redesenha o mesmo par de
// linhas no gráfico real).
function _desenharBandeira(ctx, toX, toY, p, isSel){
  const P = p.pontos;
  if(!P) return;

  const par = (a, b) => {
    if(!a || !b) return null;
    const xa = toX(a.i), ya = toY(a.preco);
    const xb = toX(b.i), yb = toY(b.preco);
    return (xa==null || ya==null || xb==null || yb==null) ? null : {a:{x:xa,y:ya}, b:{x:xb,y:yb}};
  };
  const mastro = par(P.mastro_inicio, P.mastro_fim);
  const canalTopo = par(P.topo1, P.topo2);
  const canalFundo = par(P.fundo1, P.fundo2);
  const fimMastro = mastro?.b;

  ctx.save();

  const resultado = p.resultado || "pendente";
  const cor = resultado === "sucesso" ? "#F5A623" : resultado === "falhou" ? "#FF2D55" : "#888888";

  if(!isSel){
    if(fimMastro){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, fimMastro.x, fimMastro.y - 16, resultado, cor, 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  if(mastro){
    ctx.globalAlpha = 1;
    ctx.strokeStyle = cor;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(mastro.a.x, mastro.a.y);
    ctx.lineTo(mastro.b.x, mastro.b.y);
    ctx.stroke();
  }

  for(const canal of [canalTopo, canalFundo]){
    if(!canal) continue;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#3D7EFF";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(canal.a.x, canal.a.y);
    ctx.lineTo(canal.b.x, canal.b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if(fimMastro){
    _desenharMarcadorResultado(ctx, fimMastro.x, fimMastro.y - 18, resultado, cor, 9);
  }

  for(const [key, pt] of Object.entries(P)){
    const x = toX(pt.i), y = toY(pt.preco);
    if(x==null || y==null) continue;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = key.startsWith("mastro") ? cor : "#3D7EFF";
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI*2);
    ctx.fill();
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
  // bate com "sucesso"/"falhou"), então o marcador sempre cai no caso
  // padrão (bolinha), que combina mais com "nível de preço visado" do que
  // com "aguardando resultado".
  const cor = p.tipo === "resistencia" ? "#00D68F" : "#FF4560";
  const lampC = coords[coords.length - 1];

  if(!isSel){
    if(lampC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, lampC.x, yTopo - 16, resultado, cor, 8);
      ctx.globalAlpha = 1;
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
    _desenharMarcadorResultado(ctx, lampC.x, yTopo - 18, resultado, cor, 9);
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
  texto: {
    npontos: 1,
    hints: ["Texto: clique no gráfico pra escolher onde escrever"],
  },
  regua: {
    npontos: 2,
    hints: ["Régua: clique no ponto inicial", "Régua: clique no ponto final pra medir"],
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

function _desenharTexto(ctx, toX, toY, pontos, texto, isSel){
  if(pontos.length<1 || !texto) return;
  const x=toX(pontos[0].logical), y=toY(pontos[0].preco);
  if(x==null || y==null) return;
  ctx.save();
  ctx.font = "600 13px 'DM Sans',sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const largura = ctx.measureText(texto).width;
  const padX = 7, padY = 5;
  const bx = x-padX, by = y-9-padY, bw = largura+padX*2, bh = 18+padY*2;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,5); else ctx.rect(bx,by,bw,bh);
  ctx.fillStyle = "rgba(6,8,15,.78)";
  ctx.fill();
  if(isSel){ ctx.strokeStyle = DESENHO_COR; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = "#fff";
  ctx.fillText(texto, x, y);
  ctx.restore();
  _desenharHandle(ctx,x,y,DESENHO_COR);
}

// Régua/medição — estilo TradingView: mede a distância entre 2 pontos e
// mostra variação de preço (absoluta + %) e quantas velas o movimento
// abrange. Cor muda conforme a direção (verde subindo, vermelho descendo),
// igual ao resto do app.
function _desenharRegua(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;

  const p1 = pontos[0].preco, p2 = pontos[1].preco;
  const delta = p2-p1;
  const pct = p1 ? (delta/p1)*100 : 0;
  const subiu = delta>=0;
  const cor = subiu ? "#00D68F" : "#FF4560";

  const x=Math.min(x1,x2), y=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = cor;
  ctx.fillRect(x,y,w,h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = cor;
  ctx.lineWidth = isSel?2:1.5;
  ctx.setLineDash([5,4]);
  ctx.strokeRect(x,y,w,h);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
  ctx.lineWidth = isSel?2.5:1.5;
  ctx.stroke();
  ctx.restore();

  _desenharHandle(ctx,x1,y1,cor);
  _desenharHandle(ctx,x2,y2,cor);

  const nBarras = Math.round(Math.abs(pontos[1].logical - pontos[0].logical));
  const linha1 = `${subiu?"+":""}${fmtP(delta)} (${subiu?"+":""}${pct.toFixed(2)}%)`;
  const linha2 = `${nBarras} vela${nBarras===1?"":"s"}`;

  ctx.save();
  ctx.font = "800 12px 'JetBrains Mono',monospace";
  const largura = Math.max(ctx.measureText(linha1).width, 70);
  const padX=8, padY=6;
  let bx = Math.max(x1,x2)+10;
  const by = Math.min(y1,y2);
  const bw = largura+padX*2, bh = 34+padY;
  if(bx+bw > canvasWidth) bx = Math.min(x1,x2)-10-bw; // sem espaço à direita → mostra à esquerda
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,6); else ctx.rect(bx,by,bw,bh);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.fillStyle = "#0a0a0f";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(linha1, bx+padX, by+padY);
  ctx.font = "600 10px 'JetBrains Mono',monospace";
  ctx.fillText(linha2, bx+padX, by+padY+16);
  ctx.restore();
}

// Ponto-âncora do "x" de fechar rápido de cada linha — função pura (só
// recebe os conversores de coordenada), usada tanto no desenho (canvas, via
// toLogX/toPrecoY do effect de render) quanto no teste de clique (via
// chart.timeScale()/series diretos, no effect de interação) — assim as duas
// pontas concordam sempre sobre onde o botão fica, sem duplicar a regra.
function _anchorFechar(d, toX, toY, canvasWidth){
  if(d.tipo==="horizontal"){
    const y = toY(d.pontos[0].preco);
    return y==null ? null : { x: canvasWidth-22, y };
  }
  const p0 = d.pontos[0];
  const x = toX(p0.logical), y = toY(p0.preco);
  if(x==null || y==null) return null;
  return d.tipo==="texto" ? { x:x+8, y:y-24 } : { x, y:y-14 };
}

function _desenharBotaoFechar(ctx, x, y){
  const r = 8;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = "rgba(6,8,15,.82)";
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = "#8B949E";
  ctx.stroke();
  const k = r*0.4;
  ctx.beginPath();
  ctx.moveTo(x-k,y-k); ctx.lineTo(x+k,y+k);
  ctx.moveTo(x+k,y-k); ctx.lineTo(x-k,y+k);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

// Despacha pro desenho certo conforme `d.tipo`. `toLogX`/`toPrecoY` convertem
// logical-index/preço pra pixel (ver comentário no redraw() do CandleChart
// sobre por que usamos coordenada lógica em vez de tempo — permite
// desenhar além do último candle, ex: linha de tendência se estendendo
// pro futuro).
// `preview`: true enquanto o usuário ainda está arrastando o mouse antes do
// clique final (ver comentário no redraw() do CandleChart) — desenha
// tracejado/translúcido pra distinguir do desenho já confirmado.
function _desenharDesenhoUsuario(ctx, toLogX, toPrecoY, d, isSel, canvasWidth, preview=false){
  if(preview){ ctx.save(); ctx.globalAlpha = 0.55; ctx.setLineDash([6,4]); }
  if(d.tipo==="trend")      _desenharTrend(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="horizontal") _desenharHorizontal(ctx, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="retangulo_desenho") _desenharRetanguloDesenho(ctx, toLogX, toPrecoY, d.pontos, isSel);
  else if(d.tipo==="canal")  _desenharCanal(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="texto")  _desenharTexto(ctx, toLogX, toPrecoY, d.pontos, d.texto, isSel);
  else if(d.tipo==="regua")  _desenharRegua(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  if(preview){ ctx.restore(); }
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
function MiniLine({data,color,padding=4}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current;if(!c||!data?.length)return;
    c.width=c.offsetWidth;c.height=c.offsetHeight;
    const ctx=c.getContext("2d"),W=c.width,H=c.height;
    const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
    // Padding interno — sem isso a linha (e os pontos de mínimo/máximo)
    // encostava exatamente nas bordas do canvas, cortando visualmente.
    const iw=W-padding*2, ih=H-padding*2;
    const pts=data.map((v,i)=>({x:padding+i/(data.length-1)*iw,y:padding+ih*0.9-(v-mn)/rng*ih*0.78}));
    ctx.clearRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,color+"30");g.addColorStop(1,color+"00");
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
    ctx.lineTo(W-padding,H-padding);ctx.lineTo(padding,H-padding);ctx.closePath();
    ctx.fillStyle=g;ctx.fill();
  },[data,color,padding]);
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
function CandleChart({candles, padroes, niveis=[], activeTools, selPat, setSelPat, showVolume=true, onLampPos, tema="dark", ferramentaAtiva=null, setFerramentaAtiva, desenhos=[], setDesenhos, registrarHistorico}){
  const isMobile = useIsMobile();
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
  // Régua — medição rápida (estilo TradingView): fica em state próprio, fora
  // de `desenhos`, porque não é uma anotação salva; some sozinha assim que o
  // usuário clica de novo em qualquer lugar do gráfico (o "3º clique").
  const [reguaFinalizada, setReguaFinalizada] = useState(null);
  const reguaFinalizadaRef = useRef(null);
  useEffect(()=>{ reguaFinalizadaRef.current = reguaFinalizada; },[reguaFinalizada]);
  const arrastandoRef = useRef(null); // {desenhoId, pontoIndex} | null
  const cliqueInicioRef = useRef(null); // {x,y} em coords de tela — onde o mousedown começou, pra distinguir clique de arraste
  const previewPontoRef = useRef(null); // {logical,preco} do mouse, só enquanto uma ferramenta de 2+ pontos está no meio da colocação
  const [menuCtx, setMenuCtx] = useState(null); // {x,y,desenhoId} em coords de tela
  const [textoEditando, setTextoEditando] = useState(null); // {x,y,logical,preco} — input flutuante da ferramenta Texto, só enquanto o usuário está digitando
  const [valorTextoNovo, setValorTextoNovo] = useState("");
  // `textoEditando=null` de propósito ANTES de ler o valor — assim, se
  // onKeyDown (Enter) e onBlur disparados em sequência (o Enter também
  // pode soltar o foco do input dependendo do browser), a segunda chamada
  // já encontra textoEditando null e não duplica o desenho.
  const confirmarTexto = () => {
    if(!textoEditando) return;
    const valor = valorTextoNovo.trim();
    const pos = textoEditando;
    setTextoEditando(null);
    setValorTextoNovo("");
    if(valor){
      registrarHistorico?.();
      const novoDesenho = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:"texto", pontos:[{logical:pos.logical, preco:pos.preco}], texto:valor };
      setDesenhos?.(atual=>[...atual, novoDesenho]);
    }
  };
  const cancelarTexto = () => { setTextoEditando(null); setValorTextoNovo(""); };

  // Trocou de ferramenta (ou desarmou) → começa a contagem de pontos do zero
  useEffect(()=>{ setPontosProgresso([]); previewPontoRef.current = null; redrawRef.current?.(); },[ferramentaAtiva]);

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
        // No mobile o container é bem mais baixo, então a mesma fatia de
        // 20% pro volume vira poucos pixels reais — as barras somem quase
        // todas, só o pico das maiores aparece. Dando 25% pro volume (em
        // vez de 20%) no mobile, o bottom aqui casa com o top:0.75 do
        // priceScale("volume") logo abaixo, sem sobra nem sobreposição.
        scaleMargins: showVolume ? { top:0.05, bottom: isMobile ? 0.25 : 0.2 } : { top:0.08, bottom:0.08 },
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
      priceLineVisible: false,
    });

    // Volume — só cria se showVolume (esconde pra commodities/futuros, cujo volume do Yahoo é ruim).
    // No mobile ocupa 25% (top:0.75) em vez de 20% (top:0.8) — ver o
    // comentário no rightPriceScale acima, os dois têm que bater.
    if(showVolume){
      const scaleMarginsVolume = { top: isMobile ? 0.75 : 0.8, bottom:0 };
      volRef.current = chartRef.current.addSeries(HistogramSeries, {
        color: "#26a69a",
        priceFormat:{ type:"volume" },
        priceScaleId: "volume",
        scaleMargins: scaleMarginsVolume,
      });
      chartRef.current.priceScale("volume").applyOptions({
        scaleMargins: scaleMarginsVolume,
      });
    }

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
      try { chartRef.current?.remove(); } catch {}
      chartRef.current = null;
    };
  },[showVolume, isMobile]);

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

    // Mostra os últimos 60 candles por padrão, bem próximo — usuário pode
    // arrastar pra ver o histórico completo.
    const totalCandles = candles.length;
    const visibleCount = 60;
    const from = Math.max(0, totalCandles - visibleCount);
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from,
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
        try { chartRef.current.removeSeries(ref.current); } catch {}
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
        if(ref.current && chartRef.current){ try{chartRef.current.removeSeries(ref.current);}catch{} ref.current=null; }
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
      o.series.forEach(s=>{ try{ chart.removeSeries(s); }catch{} });
    });
    // ...e os panes vazios que sobraram (de trás pra frente, senão os
    // índices dos que ainda faltam remover mudam no meio do caminho).
    const totalPanesAntes = chart.panes().length;
    for(let i=totalPanesAntes-1; i>=1; i--){
      try{ chart.removePane(i); }catch{}
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
      try{ chart.panes()[proximoPane]?.setHeight(110); }catch{}
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
    } catch {}
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
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch{} };
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
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch{} };
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

    // Testa o "x" de fechar rápido desenhado em cima de cada linha (ver
    // _anchorFechar/_desenharBotaoFechar) — usa chart/series direto (não
    // toLogX/toY do effect de render, que é outro effect) pra chegar no
    // mesmo ponto que foi desenhado na tela.
    const acharBotaoFecharProximo = (mx,my) => {
      const chart = chartRef.current, series = candleRef.current;
      if(!chart || !series) return null;
      const canvasWidth = containerRef.current?.clientWidth || 0;
      const toX = logical => chart.timeScale().logicalToCoordinate(logical);
      const toY = preco => series.priceToCoordinate(preco);
      for(const d of desenhosRef.current){
        const anc = _anchorFechar(d, toX, toY, canvasWidth);
        if(anc && Math.hypot(mx-anc.x, my-anc.y) <= 10) return d.id;
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
        if(d.tipo==="texto"){
          // Só 1 ponto — testa distância direto até a âncora (raio maior,
          // já que o texto renderizado ocupa uma área bem maior que o ponto).
          const pts1 = pontosPixel(d);
          if(pts1.length===1 && Math.hypot(mx-pts1[0].x, my-pts1[0].y)<=24) return d.id;
          continue;
        }
        const pts = pontosPixel(d);
        if(pts.length<2) continue;
        let achou = false;
        for(let i=0;i<pts.length-1 && !achou;i++){
          if(_distPontoSegmento(mx,my,pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y) <= 6) achou = true;
        }
        if(!achou && (d.tipo==="retangulo_desenho" || d.tipo==="regua") && pts.length===2){
          const [p1,p2] = pts;
          if(_distPontoSegmento(mx,my,p1.x,p1.y,p2.x,p1.y)<=6) achou = true;
          if(_distPontoSegmento(mx,my,p2.x,p2.y,p1.x,p2.y)<=6) achou = true;
        }
        if(achou) return d.id;
      }
      return null;
    };

    const onMouseMove = (e) => {
      if(ferramentaAtivaRef.current){
        // Ferramenta armada e já tem pelo menos 1 ponto colocado — mostra o
        // desenho "se formando" seguindo o mouse até o clique que confirma
        // o próximo ponto (ex: retângulo entre o 1º canto e o cursor).
        if(pontosProgressoRef.current.length > 0){
          const chart = chartRef.current, series = candleRef.current;
          if(chart && series){
            const rect = container.getBoundingClientRect();
            const mx = e.clientX-rect.left, my = e.clientY-rect.top;
            const logical = chart.timeScale().coordinateToLogical(mx);
            const preco = series.coordinateToPrice(my);
            if(logical!=null && preco!=null){
              previewPontoRef.current = {logical, preco};
              redrawRef.current?.();
            }
          }
        }
        return; // colocando um desenho novo — sem hover/arraste nos já existentes
      }
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
      // Régua: qualquer clique novo (o "3º clique" da medição) descarta o
      // resultado anterior — é uma medição passageira, não uma anotação
      // salva, então não fica acumulando no gráfico.
      if(reguaFinalizadaRef.current){
        queueMicrotask(()=>setReguaFinalizada(null));
      }
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
      // "x" de fechar rápido de alguma linha — remove na hora, sem precisar
      // do menu de clique-direito (ver _anchorFechar/acharBotaoFecharProximo).
      const fechar = acharBotaoFecharProximo(mx,my);
      if(fechar){
        queueMicrotask(()=>{
          registrarHistorico?.();
          setDesenhos?.(prev=>prev.filter(x=>x.id!==fechar));
        });
        e.preventDefault();
        return;
      }
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
        setPontosProgresso([]);
        // Texto não finaliza no clique — abre um campo flutuante pra
        // digitar o conteúdo primeiro; só vira desenho de verdade quando o
        // usuário confirma (Enter/blur com texto), ver renderTextoEditando.
        if(ferramenta === "texto"){
          queueMicrotask(()=>{
            setFerramentaAtiva?.(null);
            setTextoEditando({ x:e.clientX, y:e.clientY, logical, preco });
          });
          return;
        }
        // Régua não vira `desenho` permanente — fica em state próprio e some
        // sozinha no próximo clique (ver reguaFinalizada/onMouseDown). Por
        // isso também não entra no histórico de desfazer/refazer.
        if(ferramenta === "regua"){
          const novaRegua = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:"regua", pontos:novo };
          queueMicrotask(()=>{
            setReguaFinalizada(novaRegua);
            setFerramentaAtiva?.(null);
          });
          return;
        }
        const novoDesenho = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:ferramenta, pontos:novo };
        // setDesenhos/setFerramentaAtiva são do pai (ChartPane) — chamar
        // direto aqui (ainda dentro do listener de mouseup nativo) disparava
        // "Cannot update a component while rendering a different component"
        // (subscribeCrosshairMove do LWC também reage ao mesmo evento).
        // Adiar pro próximo microtask evita a colisão sem o usuário notar.
        queueMicrotask(()=>{
          registrarHistorico?.();
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
      try{ candleRef.current.removePriceLine(priceLine); }catch{}
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
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch{} };
  },[niveis]);

  // Reestiliza as linhas quando a seleção muda
  useEffect(()=>{
    nivelLinesRef.current.forEach(({nivel, priceLine})=>{
      const {color, lineWidth} = estiloNivel(nivel, nivelChave(nivel)===nivelSel);
      try{ priceLine.applyOptions({color, lineWidth}); }catch{}
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
        else if(tipoNorm === "bandeira_alta" || tipoNorm === "bandeira_baixa") _desenharBandeira(ctx, toX, toY, p, isSel);
        else _desenharOCO(ctx, toX, toY, p, isSel);
      }

      // Fibonacci — marcado pelo usuário, só desenha com os 2 pontos prontos
      if(activeTools.has("fibo") && fibo?.a && fibo?.b){
        _desenharFibonacci(ctx, toX, toY, fibo, canvas.width);
      }

      // Ferramentas de desenho do usuário (trend/horizontal/retângulo/canal)
      // — cada linha ganha um "x" de fechar rápido (ver _anchorFechar), pra
      // remover sem precisar abrir o menu de clique-direito.
      for(const d of desenhos){
        _desenharDesenhoUsuario(ctx, toLogX, toY, d, false, canvas.width);
        const anc = _anchorFechar(d, toLogX, toY, canvas.width);
        if(anc) _desenharBotaoFechar(ctx, anc.x, anc.y);
      }

      // Régua — some sozinha no 3º clique (ver onMouseDown), não é uma
      // anotação persistida como as outras; por isso vive fora de `desenhos`.
      if(reguaFinalizada){
        _desenharDesenhoUsuario(ctx, toLogX, toY, reguaFinalizada, false, canvas.width);
      }

      // Preview ao vivo — a ferramenta ainda está sendo colocada (já tem
      // 1+ ponto clicado) e o mouse se moveu desde então: desenha como se o
      // cursor fosse o próximo ponto, tracejado, pra dar o feedback visual
      // de "o retângulo/linha/canal se formando" antes do clique final.
      if(ferramentaAtiva && pontosProgresso.length>0 && previewPontoRef.current){
        const desenhoPreview = { tipo: ferramentaAtiva, pontos: [...pontosProgresso, previewPontoRef.current] };
        _desenharDesenhoUsuario(ctx, toLogX, toY, desenhoPreview, false, canvas.width, true);
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
  },[candles, padroes, activeTools, selPat, fibo, desenhos, ferramentaAtiva, pontosProgresso, reguaFinalizada]);

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
                  registrarHistorico?.();
                  setDesenhos?.(prev=>prev.filter(x=>x.id!==d.id));
                  setFerramentaAtiva?.(d.tipo);
                }
                setMenuCtx(null);
              }}
              style={{padding:"7px 10px",fontSize:12,color:"var(--text)",cursor:"pointer",borderRadius:5}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >Editar</div>
            <div
              onClick={()=>{
                registrarHistorico?.();
                setDesenhos?.(prev=>prev.filter(x=>x.id!==menuCtx.desenhoId));
                setMenuCtx(null);
              }}
              style={{padding:"7px 10px",fontSize:12,color:"var(--down)",cursor:"pointer",borderRadius:5}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >Remover</div>
          </div>
        </div>,
        document.body
      )}
      {textoEditando && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={confirmarTexto}>
          <input
            autoFocus
            type="text"
            value={valorTextoNovo}
            onChange={e=>setValorTextoNovo(e.target.value)}
            placeholder="Digite o texto..."
            onMouseDown={e=>e.stopPropagation()}
            onKeyDown={e=>{
              if(e.key==="Enter") confirmarTexto();
              else if(e.key==="Escape") cancelarTexto();
            }}
            onBlur={confirmarTexto}
            style={{
              position:"fixed", left:textoEditando.x, top:textoEditando.y-14,
              background:"var(--card)", border:"1.5px solid #2962FF", borderRadius:6,
              color:"var(--text)", fontSize:13, fontFamily:"var(--font-b)", fontWeight:600,
              padding:"5px 9px", outline:"none", minWidth:160, zIndex:9999,
              boxShadow:"0 4px 16px rgba(0,0,0,.35)",
            }}
          />
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
        <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={cor} tamanho={30}/>
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
    const claro = localStorage.getItem("tradezen-tema") === "light";
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
            <span>TRADE<span>ZEN</span></span>
          </div>
        </div>
        <div className="ab-hero">
          <h1>
            VEJA PADRÕES DE ANÁLISE
            <span className="l2">TÉCNICA DIARIAMENTE</span>
          </h1>
          <p>Estude padrões gráficos e veja como cada ativo tende a reagir às flutuações do mercado.</p>
          <button className="ab-entrar" onClick={()=>navigate("/mercados")}>Entrar</button>
          {/* "Sobre Nós" / "Perguntas Frequentes" / "Termos de Uso" — tiradas
              por enquanto (as rotas /sobre, /faq, /termos nem existem ainda).
              Volta fácil quando essas páginas forem criadas de verdade. */}
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR do dashboard ──
const SB_ITENS = [
  { id:"inicio",     label:"Início",          icon:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></> },
  { id:"mercados",   label:"Mercados",        icon:<><line x1="3" y1="3" x2="3" y2="21"/><line x1="3" y1="21" x2="21" y2="21"/><polyline points="7 14 11 10 14 13 19 7"/></> },
  { id:"cripto",     label:"Criptomoedas",    icon:<><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h4a2 2 0 0 1 0 4h-4zm0 4h4.5a2 2 0 0 1 0 4h-4.5zm1.5-7v2m0 9v2"/></> },
  { id:"ativos",     label:"Principais Índices",icon:<><path d="M3 17l6-6 4 4 8-8"/><polyline points="21 3 21 9 15 3"/></>, route:"/principais-ativos" },
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

// Logo real por ativo — cripto e ações têm empresa/moeda de verdade por trás
// (CoinGecko/Clearbit); commodity e forex não têm "logo de empresa", usam um
// símbolo (Au/Ag/$/€/£) no lugar. `cor` aqui é a cor de fallback — mostrada
// se a imagem falhar (ver IconeAtivo) ou já usada direto pros tipos "simbolo".
const ICONE_ATIVO_INFO = {
  // Cripto
  "BTC-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/1/small/bitcoin.png",     cor:"#F7931A" },
  "ETH-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/279/small/ethereum.png",  cor:"#627EEA" },
  "SOL-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/4128/small/solana.png",   cor:"#9945FF" },
  "BNB-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", cor:"#F3BA2F" },
  "XRP-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png", cor:"#3A4048" },
  "ADA-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/975/small/cardano.png",    cor:"#0033AD" },
  "DOGE-USD": { tipo:"img", url:"https://assets.coingecko.com/coins/images/5/small/dogecoin.png",     cor:"#C2A633" },
  "AVAX-USD": { tipo:"img", url:"https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png", cor:"#E84142" },
  // Ações B3 — o Clearbit (logo.clearbit.com) saiu do ar de vez (nem o DNS
  // resolve mais, confirmado testando direto), então usa o serviço de
  // favicon do Google — não pede chave/cadastro e é estável há anos. Mesma
  // cor de fallback pras seis (identidade "ação BR" genérica; a cor de
  // marca de cada empresa só importava enquanto o quadradinho de 1 letra
  // era a única opção).
  "PETR4.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=petrobras.com.br&sz=128",     cor:"#003087" },
  "VALE3.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=vale.com&sz=128",             cor:"#003087" },
  "ITUB4.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=itau.com.br&sz=128",          cor:"#003087" },
  "BBDC4.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=bradesco.com.br&sz=128",      cor:"#003087" },
  "WEGE3.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=weg.net&sz=128",               cor:"#003087" },
  "MGLU3.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=128", cor:"#003087" },
  // Commodities e forex — sem logo de empresa, símbolo dentro do círculo.
  // Cor de cada uma remete à própria commodity (ouro amarelo, cobre
  // alaranjado, WTI x Brent em tons diferentes de petróleo etc.) em vez de
  // todas caírem no mesmo cinza genérico — mais fácil de reconhecer de
  // relance na lista/ticker.
  "GC=F":     { tipo:"simbolo", texto:"Au",  cor:"#FFD700" },
  "SI=F":     { tipo:"simbolo", texto:"Ag",  cor:"#C0C0C0" },
  "HG=F":     { tipo:"simbolo", texto:"Cu",  cor:"#B87333" },
  "PL=F":     { tipo:"simbolo", texto:"Pt",  cor:"#A9B4C2" },
  "CL=F":     { tipo:"simbolo", texto:"WTI", cor:"#4A4A4A" },
  "BZ=F":     { tipo:"simbolo", texto:"BRT", cor:"#1B3A57" },
  "NG=F":     { tipo:"simbolo", texto:"Gás", cor:"#4A90D9" },
  "ZC=F":     { tipo:"simbolo", texto:"Mi",  cor:"#F4C430" },
  "ZS=F":     { tipo:"simbolo", texto:"Sj",  cor:"#7CB342" },
  "KC=F":     { tipo:"simbolo", texto:"Ca",  cor:"#6F4E37" },
  "SB=F":     { tipo:"simbolo", texto:"Aç",  cor:"#E8B4B8" },
  "CT=F":     { tipo:"simbolo", texto:"Al",  cor:"#D7DEE6" },
  "USDBRL=X": { tipo:"simbolo", texto:"R$",  cor:"#009C3B" },
  "EURBRL=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "GBPBRL=X": { tipo:"simbolo", texto:"£",   cor:"#C8102E" },
  "EURUSD=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "GBPUSD=X": { tipo:"simbolo", texto:"£",   cor:"#C8102E" },
  "USDJPY=X": { tipo:"simbolo", texto:"¥",   cor:"#BC002D" },
  "USDCNY=X": { tipo:"simbolo", texto:"元",  cor:"#DE2910" },
  "GBPJPY=X": { tipo:"simbolo", texto:"£",   cor:"#C8102E" },
  "EURJPY=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "EURGBP=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "AUDUSD=X": { tipo:"simbolo", texto:"A$",  cor:"#00843D" },
  "NZDUSD=X": { tipo:"simbolo", texto:"NZ$", cor:"#00247D" },
  "USDCAD=X": { tipo:"simbolo", texto:"C$",  cor:"#FF0000" },
  "USDCHF=X": { tipo:"simbolo", texto:"Fr",  cor:"#DA291C" },
  "AUDJPY=X": { tipo:"simbolo", texto:"A$",  cor:"#00843D" },
  "CHFJPY=X": { tipo:"simbolo", texto:"Fr",  cor:"#DA291C" },
  "USDMXN=X": { tipo:"simbolo", texto:"MX$", cor:"#006341" },
  "USDINR=X": { tipo:"simbolo", texto:"₹",   cor:"#FF9933" },
  "USDKRW=X": { tipo:"simbolo", texto:"₩",   cor:"#003478" },
  "USDSGD=X": { tipo:"simbolo", texto:"S$",  cor:"#EF3340" },
  "USDHKD=X": { tipo:"simbolo", texto:"HK$", cor:"#A8112D" },
  "USDZAR=X": { tipo:"simbolo", texto:"ZAR", cor:"#007A4D" },
};

// Ícone circular de um ativo nos cards do dashboard (32x32 por padrão) —
// cripto/ação carregam o logo real; commodity/forex e qualquer ticker sem
// entrada no mapa (ou cuja imagem falhe ao carregar) caem no círculo com
// símbolo/inicial, sempre pela cor de fallback certa.
function IconeAtivo({ ticker, simbolo, corPadrao, tamanho=32 }){
  const [erro, setErro] = useState(false);
  const info = ICONE_ATIVO_INFO[ticker];
  const cor = info?.cor || corPadrao || "#5A7299";

  if(info?.tipo==="img" && !erro){
    return (
      <img
        src={info.url}
        alt={simbolo||ticker}
        width={tamanho}
        height={tamanho}
        style={{width:tamanho,height:tamanho,borderRadius:"50%",objectFit:"cover",flexShrink:0,background:"#fff"}}
        onError={()=>setErro(true)}
      />
    );
  }

  const texto = info?.tipo==="simbolo" ? info.texto : (simbolo?.[0] || "?");
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" style={{flexShrink:0}}>
      <circle cx="16" cy="16" r="16" fill={cor+"26"}/>
      <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fill={cor} fontSize={texto.length>2?9:texto.length>1?11:14} fontWeight="800" fontFamily="var(--font-b)">{texto}</text>
    </svg>
  );
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

// Página genérica de listagem de ativos — usada por Favoritos. Busca por
// nome/ticker sempre disponível; o filtro por tipo de mercado só aparece
// quando a lista tem mais de um tipo.
function PaginaListaAtivos({ titulo, ativos, carregando=false, mensagemVazio="Nenhum ativo encontrado.", favoritos, toggleFavorito, abrirAtivo }){
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
        <span className="st" style={{fontSize:18}}>{titulo}</span>
        <span style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{filtrado.length} ativos</span>
      </div>

      <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <div className="search" style={{maxWidth:280,flex:"1 1 240px"}}>
          <span className="search-ic"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
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
function ChartPane({ mercado, ticker, onTickerChange, onAddSplit, onClose, ocultoMobile=false, tema="dark", user, favoritos, toggleFavorito, ativoConfig, salvarConfigAtivo }){
  const navigate = useNavigate();
  const [tf, setTf] = useState(TFS[0]);

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
  const [painelAberto,setPainelAberto] = useState(true);
  const [switcherAberto,setSwitcherAberto] = useState(false);
  const [maisAberto,setMaisAberto] = useState(false); // legenda: mostra os indicadores "a mais" (além do limite visível)
  const [ferramentaAtiva,setFerramentaAtiva] = useState(null); // ferramenta de desenho armada (trend/horizontal/retangulo_desenho/canal)
  const [desenhos,setDesenhos] = useState([]); // desenhos do usuário nesta tela — só sessão, não salva no backend
  const [desenhoOpen,setDesenhoOpen] = useState(false); // dropdown de ferramentas de desenho — botão próprio, separado do de Indicadores
  // Espelha o prop mais recente pro effect de troca de ticker ler sem
  // precisar entrar nas deps dele (entrar nas deps causaria um refetch
  // toda vez que QUALQUER ativo salvasse configuração, não só o ticker que
  // está sendo trocado).
  const ativoConfigRef = useRef(ativoConfig);
  useEffect(()=>{ ativoConfigRef.current = ativoConfig; },[ativoConfig]);
  const desenhoBtnRef = useRef(null);
  const [desenhoPos,setDesenhoPos] = useState({top:0,left:0});

  // Desfazer/Refazer (Ctrl+Z) — cobre indicadores (tools) e linhas (desenhos)
  // juntos numa única linha do tempo por ativo. `registrarHistorico` é
  // passado pro CandleChart (que registra os handlers de mouse uma vez só,
  // deps:[]) — por isso usa useCallback com deps fixas e lê tools/desenhos
  // via ref, senão o filho ficaria preso numa versão velha da função.
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const toolsHistRef = useRef(tools);
  useEffect(()=>{ toolsHistRef.current = tools; },[tools]);
  const desenhosHistRef = useRef(desenhos);
  useEffect(()=>{ desenhosHistRef.current = desenhos; },[desenhos]);
  const registrarHistorico = useCallback(()=>{
    setUndoStack(prev=>[...prev, { tools:new Set(toolsHistRef.current), desenhos:[...desenhosHistRef.current] }]);
    setRedoStack([]);
  },[]);
  const desfazer = () => {
    if(undoStack.length===0) return;
    const ultimo = undoStack[undoStack.length-1];
    setRedoStack(prev=>[...prev, { tools:new Set(tools), desenhos:[...desenhos] }]);
    setUndoStack(prev=>prev.slice(0,-1));
    setTools(ultimo.tools);
    setDesenhos(ultimo.desenhos);
  };
  const refazer = () => {
    if(redoStack.length===0) return;
    const proximo = redoStack[redoStack.length-1];
    setUndoStack(prev=>[...prev, { tools:new Set(tools), desenhos:[...desenhos] }]);
    setRedoStack(prev=>prev.slice(0,-1));
    setTools(proximo.tools);
    setDesenhos(proximo.desenhos);
  };
  // Atalho de teclado igual Ctrl+Z/Ctrl+Shift+Z (Cmd no Mac) — ignora quando
  // o foco está num campo de texto (ex: input da ferramenta Texto), senão
  // rouba o desfazer nativo de digitação.
  useEffect(()=>{
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if(tag==="INPUT" || tag==="TEXTAREA") return;
      if(!(e.ctrlKey || e.metaKey)) return;
      if(e.key.toLowerCase()!=="z" && e.key.toLowerCase()!=="y") return;
      e.preventDefault();
      if(e.key.toLowerCase()==="y" || (e.key.toLowerCase()==="z" && e.shiftKey)) refazer();
      else desfazer();
    };
    window.addEventListener("keydown", onKeyDown);
    return ()=>window.removeEventListener("keydown", onKeyDown);
  },[undoStack, redoStack, tools, desenhos]);

  // Fecha dropdown de indicadores ao clicar fora
  useEffect(()=>{
    if(!indOpen) return;
    const h = e => { if(!e.target.closest(".ind-wrap")) setIndOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  },[indOpen]);

  // Fecha dropdown de ferramentas de desenho ao clicar fora
  useEffect(()=>{
    if(!desenhoOpen) return;
    const h = e => { if(!e.target.closest(".ind-wrap")) setDesenhoOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  },[desenhoOpen]);

  // Busca candles + padrões marcados sempre que o ticker OU o timeframe
  // DESTA tela mudam — cada ChartPane tem o seu próprio ciclo de fetch,
  // independente das outras. Reseta tools/desenhos/histórico igual troca de
  // ticker: um desenho feito em 1D não faz sentido no índice lógico do 60m
  // (candles completamente diferentes), então não dá pra manter.
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
    // Começa limpo — a restauração (se houver conta e dado salvo) roda no
    // effect separado logo abaixo, que também reage a `user`. Isso evita
    // vazar os indicadores do ativo anterior pro novo.
    setTools(new Set());
    setDesenhos([]);
    // Histórico de desfazer/refazer é por ativo — trocar de ticker começa
    // uma linha do tempo nova, sem carregar ações de outro gráfico.
    setUndoStack([]);
    setRedoStack([]);
    // Candles e padrões marcados disparam juntos, mas não esperam um pelo
    // outro pra aparecer — antes um Promise.all travava o gráfico até os
    // dois voltarem, e padrões-marcados (consulta ao Supabase) sozinho já
    // leva mais de 1s. Candles aparece assim que chega; padrões (as
    // lâmpadas) entram por cima logo depois, sem segurar o resto da tela.
    const padroesPromise = fetchPadroesMarcados(ativo.ticker, tf.intervalo);
    fetch(`${API}/ativo/${ativo.ticker}?periodo=${tf.periodo}&intervalo=${tf.intervalo}`)
      .then(r=>r.json())
      .then(d=>{
        if(cancelado) return;
        const candlesRecebidos = d.candles||[];
        setCandles(candlesRecebidos);
        setNiveis(d.niveis||[]);
        if(d.info){
          setSel(prev=>({...prev, ...d.info, ticker}));
        }
        setLoading(false);
        padroesPromise.then(marcados=>{
          if(cancelado) return;
          setPadroes(resolverPadroesPorTimestamp(marcados.padroes, candlesRecebidos));
        });
      })
      .catch(()=>{ if(!cancelado) setLoading(false); });

    return () => { cancelado = true; };
  },[ticker, tf.intervalo]);

  // Restaura indicadores/desenhos salvos — em effect próprio (não junto do
  // fetch acima) porque precisa reagir a `user` também: numa montagem via
  // reload direto na URL do ativo, o ticker já chega certo desde o início
  // e não muda de novo, então um effect só com deps [ticker] nunca rerodaria
  // depois que a sessão do Supabase resolve de forma assíncrona (user
  // passa de null pra logado *depois* do primeiro render). Também reage a
  // `tf`: a configuração salva é por ticker (não por timeframe), então
  // trocar pro 60m e voltar pro 1D restaura os mesmos indicadores/desenhos.
  useEffect(()=>{
    if(!ticker || !user) return;
    const configSalva = ativoConfigRef.current?.[ticker];
    if(configSalva){
      setTools(new Set(configSalva.tools||[]));
      setDesenhos(configSalva.desenhos||[]);
    }
  },[ticker, user, tf.intervalo]);

  const toggleTool=id=>{
    // Só entra no histórico de desfazer/refazer quando é de fato "adicionar
    // um indicador/linha" (indicador técnico ou Fibonacci) — os outros ids
    // que passam por aqui são filtros de visibilidade dos padrões já
    // detectados na legenda, não conteúdo criado pelo usuário.
    if(INDICADORES.some(i=>i.id===id) || id==="fibo") registrarHistorico();
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

  // Favoritar é só a estrela — o gate de "precisa de conta" já mora dentro
  // do toggleFavorito (App), que mostra o aviso de cadastro sozinho se
  // `user` for null. ChartPane não precisa saber disso.
  const handleFavoritar = () => {
    if(!ticker || !toggleFavorito) return;
    toggleFavorito(ticker);
  };

  // Salva indicadores + desenhos DESSE ativo a cada mudança — vale pra
  // qualquer ticker (favoritado ou não), mas só se tiver conta (ver
  // configSalva lá em cima, no effect de troca de ticker, que só restaura
  // com `user` truthy). Régua fica de fora: é medição rápida, não uma
  // anotação pra guardar — salvar ela só acumularia lixo no retrato salvo.
  useEffect(()=>{
    if(!ticker || !user) return;
    salvarConfigAtivo?.(ticker, { tools:[...tools], desenhos: desenhos.filter(d=>d.tipo!=="regua") });
  },[tools, desenhos, user, ticker]);

  if(!selAtivo) return null;

  return (
    <div className="analysis" style={ocultoMobile ? {display:"none"} : undefined}>
      <div className="atb">
        {!onClose && <button className="bbtn" onClick={()=>navigate("/mercados")} title="Voltar pra home">←</button>}

        <span className="atick" onClick={()=>setSwitcherAberto(v=>!v)} title="Trocar ativo desta tela">
          {selAtivo.simbolo} <span style={{fontSize:11}}>▾</span>
        </span>

        {toggleFavorito && (
          <button
            className={`ac-fav ${favoritos?.has(ticker)?"on":""}`}
            style={{fontSize:18}}
            title={favoritos?.has(ticker)
              ? "Remover dos favoritos (indicadores e desenhos salvos serão apagados)"
              : "Adicionar aos favoritos — salva os indicadores e desenhos deste gráfico"}
            onClick={handleFavoritar}
          >{favoritos?.has(ticker)?"★":"☆"}</button>
        )}

        {selAtivo.preco>0&&<>
          <span className="apr">{fmtP(selAtivo.preco)}</span>
          <span className={`achg ${selAtivo.alta?"bup":"bdn"}`}>{selAtivo.alta?"▲":"▼"}{Math.abs(selAtivo.variacao_pct||0).toFixed(2)}%</span>
        </>}
        <span style={{fontSize:10,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{selAtivo.mercado}</span>

        <div className="sep"/>

        {/* Timeframe — select nativo (1D = histórico completo diário, 1S =
            histórico completo semanal, 60m = intraday, ~2 anos no Yahoo —
            limite da fonte de dado). Trocar reseta indicadores/desenhos/
            histórico igual troca de ativo (ver effect de fetch). */}
        <select
          value={tf.label}
          onChange={e=>{
            const escolhido = TFS.find(t=>t.label===e.target.value);
            if(escolhido) setTf(escolhido);
          }}
          title="Timeframe do gráfico"
          style={{
            background:"var(--s2)",color:"var(--text)",border:"1px solid var(--border)",
            borderRadius:6,padding:"5px 8px",fontSize:11,fontWeight:700,
            fontFamily:"var(--font-m)",cursor:"pointer",outline:"none",
          }}
        >
          {TFS.map(t=>(
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>

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

        {/* Dropdown Ferramentas de Desenho — botão próprio, separado do de Indicadores */}
        <div className="ind-wrap">
          <button
            ref={desenhoBtnRef}
            className={`ind-btn ${desenhoOpen?"open":""}`}
            onClick={()=>{
              if(!desenhoOpen && desenhoBtnRef.current){
                const r = desenhoBtnRef.current.getBoundingClientRect();
                setDesenhoPos({top: r.bottom+4, left: r.left});
              }
              setDesenhoOpen(v=>!v);
            }}
          >
            Linhas <span className="arr">▼</span>
            {(desenhos.length + (tools.has("fibo")?1:0))>0&&(
              <span style={{background:"var(--accent)",color:"#fff",borderRadius:8,padding:"1px 5px",fontSize:9,fontWeight:700}}>
                {desenhos.length + (tools.has("fibo")?1:0)}
              </span>
            )}
          </button>
        </div>

        {/* Régua — mede a distância entre 2 pontos (preço/%/velas), estilo
            TradingView. Ícone próprio ao lado de Linhas, sem dropdown: um
            clique arma, outro clique no gráfico marca o início, mais um
            marca o fim. */}
        <button
          className="pane-btn"
          style={ferramentaAtiva==="regua" ? {background:"var(--accent)",borderColor:"var(--accent)",color:"#fff"} : undefined}
          title="Régua — medir variação entre 2 pontos"
          onClick={()=>setFerramentaAtiva(prev=>prev==="regua" ? null : "regua")}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/>
            <path d="m14.5 12.5 2-2"/>
            <path d="m11.5 9.5 2-2"/>
            <path d="m8.5 6.5 2-2"/>
            <path d="m17.5 15.5 2-2"/>
          </svg>
        </button>

        {/* Desfazer/Refazer — cobre indicadores e linhas juntos (ver
            registrarHistorico/desfazer/refazer). Também funciona com
            Ctrl+Z / Ctrl+Shift+Z (ver effect de teclado acima). */}
        <button
          className="pane-btn"
          disabled={undoStack.length===0}
          style={undoStack.length===0 ? {opacity:.35,cursor:"not-allowed"} : undefined}
          title="Desfazer (Ctrl+Z)"
          onClick={desfazer}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
        <button
          className="pane-btn"
          disabled={redoStack.length===0}
          style={redoStack.length===0 ? {opacity:.35,cursor:"not-allowed"} : undefined}
          title="Refazer (Ctrl+Shift+Z)"
          onClick={refazer}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {onAddSplit && (
            <button className="pane-btn" onClick={onAddSplit} title="Adicionar mesa">+</button>
          )}
          {onClose && (
            <button className="pane-btn danger" onClick={onClose} title="Fechar esta tela">✕</button>
          )}
          {PAINEL_PADROES_ATIVO && !painelAberto && (
            <button
              onClick={()=>setPainelAberto(true)}
              title="Mostrar painel de indicadores"
              className="pane-btn"
            >«</button>
          )}
        </div>
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
              showVolume={selAtivo.mercado!=="COMMODITY"}
              tema={tema}
              ferramentaAtiva={ferramentaAtiva}
              setFerramentaAtiva={setFerramentaAtiva}
              desenhos={desenhos}
              setDesenhos={setDesenhos}
              registrarHistorico={registrarHistorico}
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

        {PAINEL_PADROES_ATIVO && painelAberto&&<div className="rpanel">
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
                  <span className="tlock"><svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
                </div>
              ))}
              {/* Sem página de planos ainda — fica desabilitado com "Em
                  breve" (mesmo tratamento dos outros CTAs incompletos do
                  app) em vez de levar pra uma rota que não existe. */}
              <button
                disabled
                title="Em breve"
                style={{width:"100%",marginTop:10,padding:"8px",background:"none",border:"1px solid var(--border)",borderRadius:7,color:"var(--text3)",fontSize:11,fontWeight:700,cursor:"default",letterSpacing:".3px",opacity:.6}}
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
                    {selPat.resultado==="sucesso"?"Confirmado":"Não confirmado"}
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

              <div className="exp-aviso">Conteúdo educativo · não é recomendação</div>
            </div>
          </div>
        );
      })()}

      {/* ── PORTAL DO DROPDOWN DE INDICADORES ── */}
      {indOpen && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={()=>setIndOpen(false)}>
          <div
            className="ind-drop ind-drop-sheet"
            style={{position:"fixed",top:indPos.top,left:indPos.left}}
            onMouseDown={e=>e.stopPropagation()}
          >
            {[...new Set(INDICADORES.map(i=>i.grupo))].map(grupo=>(
              <div key={grupo}>
                <div className="ind-section">{grupo}</div>
                {INDICADORES.filter(i=>i.grupo===grupo).map(ind=>(
                  <div
                    key={ind.id}
                    className="ind-item"
                    onMouseDown={e=>{
                      e.stopPropagation();
                      toggleTool(ind.id);
                    }}
                  >
                    <div className={`ind-chk ${tools.has(ind.id)?"on":""}`}>
                      {tools.has(ind.id)&&"✓"}
                    </div>
                    <span className="ind-label">{ind.label}</span>
                    <span className="ind-color" style={{background:ind.cor}}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── PORTAL DO DROPDOWN DE FERRAMENTAS DE DESENHO ── */}
      {desenhoOpen && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={()=>setDesenhoOpen(false)}>
          <div
            className="ind-drop ind-drop-sheet"
            style={{position:"fixed",top:desenhoPos.top,left:desenhoPos.left}}
            onMouseDown={e=>e.stopPropagation()}
          >
            <div className="ind-section">Linhas</div>
            {FERRAMENTAS_DESENHO_LISTA.map(ind=>{
              const ligado = ind.desenho ? ferramentaAtiva===ind.id : tools.has(ind.id);
              return (
                <div
                  key={ind.id}
                  className="ind-item"
                  onMouseDown={e=>{
                    e.stopPropagation();
                    if(ind.desenho){
                      setFerramentaAtiva(prev=>prev===ind.id?null:ind.id);
                    } else {
                      toggleTool(ind.id);
                    }
                    setDesenhoOpen(false);
                  }}
                >
                  <div className={`ind-chk ${ligado?"on":""}`}>{ligado&&"✓"}</div>
                  <span className="ind-label">{ind.label}</span>
                  <span style={{fontSize:12,color:ind.cor,fontFamily:"var(--font-m)",width:14,textAlign:"center",flexShrink:0}}>{ind.icone}</span>
                </div>
              );
            })}
            {desenhos.length>0 && (
              <button
                onMouseDown={e=>{ e.stopPropagation(); registrarHistorico(); setDesenhos([]); }}
                style={{
                  width:"calc(100% - 12px)",margin:"4px 6px 2px",padding:"7px 8px",
                  background:"none",border:"1px solid var(--border)",borderRadius:6,
                  color:"var(--down)",fontSize:11,fontWeight:600,cursor:"pointer",
                }}
              >Limpar desenhos</button>
            )}
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

// Linha de preço em movimento contínuo (random walk), bem discreta, atrás
// do conteúdo da 404 — só ambientação, por isso opacidade baixíssima e
// sem cor chamativa (mesmo azul do --accent, mas quase transparente).
// Respeita prefers-reduced-motion: desenha 1 frame parado, sem animar.
function GraficoFundo404(){
  const canvasRef = useRef(null);
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let largura=0, altura=0, valores=[];
    const PASSO_PX = 6;

    const gerarValores = () => {
      const nPontos = Math.ceil(largura/PASSO_PX) + 4;
      const vals = [altura*0.5];
      for(let i=1;i<nPontos;i++){
        const delta = (Math.random()-0.5)*altura*0.035;
        vals.push(Math.max(altura*0.15, Math.min(altura*0.85, vals[i-1]+delta)));
      }
      return vals;
    };

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      largura = canvas.width = rect.width;
      altura = canvas.height = rect.height;
      valores = gerarValores();
    };
    resize();
    window.addEventListener("resize", resize);

    const desenhar = (offset) => {
      ctx.clearRect(0,0,largura,altura);
      ctx.save();
      ctx.translate(-offset, 0);
      ctx.beginPath();
      valores.forEach((v,i)=>{ i===0 ? ctx.moveTo(i*PASSO_PX,v) : ctx.lineTo(i*PASSO_PX,v); });
      ctx.strokeStyle = "rgba(61,126,255,.18)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.lineTo((valores.length-1)*PASSO_PX, altura);
      ctx.lineTo(0, altura);
      ctx.closePath();
      const gradiente = ctx.createLinearGradient(0,0,0,altura);
      gradiente.addColorStop(0,"rgba(61,126,255,.07)");
      gradiente.addColorStop(1,"rgba(61,126,255,0)");
      ctx.fillStyle = gradiente;
      ctx.fill();
      ctx.restore();
    };

    if(reduzMovimento){
      desenhar(0);
      return () => window.removeEventListener("resize", resize);
    }

    let offset = 0, raf = null;
    const passo = () => {
      offset += 0.35;
      if(offset >= PASSO_PX){
        offset -= PASSO_PX;
        valores.shift();
        const delta = (Math.random()-0.5)*altura*0.035;
        const ultimo = valores[valores.length-1];
        valores.push(Math.max(altura*0.15, Math.min(altura*0.85, ultimo+delta)));
      }
      desenhar(offset);
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);

    return () => {
      window.removeEventListener("resize", resize);
      if(raf) cancelAnimationFrame(raf);
    };
  },[]);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

// Qualquer rota que caia dentro do AppInner sem bater em nenhuma página
// conhecida (ex: link antigo, digitação errada) — mantém o header (logo,
// busca, menu) visível pra pessoa conseguir sair daqui, só troca o corpo.
function Pagina404(){
  const navigate = useNavigate();
  return (
    <div style={{position:"relative",minHeight:"calc(100vh - 52px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:24,textAlign:"center",overflow:"hidden"}}>
      <GraficoFundo404/>
      <div style={{position:"relative",zIndex:1,fontFamily:"var(--font-h)",fontSize:80,color:"var(--text3)",letterSpacing:2,lineHeight:1}}>404</div>
      <div style={{position:"relative",zIndex:1,fontSize:18,fontWeight:700,color:"var(--text)"}}>Página não encontrada</div>
      <div style={{position:"relative",zIndex:1,fontSize:13,color:"var(--text2)",maxWidth:360,lineHeight:1.5}}>
        O link que você seguiu não existe ou foi movido. Confira o endereço ou volte pro início.
      </div>
      <button
        onClick={()=>navigate("/mercados")}
        style={{position:"relative",zIndex:1,marginTop:6,background:"var(--accent)",color:"#fff",border:"none",borderRadius:8,padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}
      >Ir pros Mercados</button>
    </div>
  );
}

function AppInner(){
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [userMenuAberto,setUserMenuAberto] = useState(false); // menu "Sair" no nome do usuário no header
  const [buscaMobileAberta,setBuscaMobileAberta] = useState(false); // ícone de lupa → expande a busca (mobile)
  const [drawerAberto,setDrawerAberto] = useState(false); // menu hambúrguer (mobile) — sidebar + conta

  const [mercado,setMercado] = useState([]);
  const [marketTab,setMTab]  = useState("1D");
  const [ibovChart,setIbovChart] = useState([]);
  const [erro,setErro]       = useState("");
  const [sbCollapsed,setSbCollapsed] = useState(false);
  // Suporta /mercados?secao=favoritos (usado pelo redirecionamento de
  // /favoritos) — só lido na primeira renderização, de propósito.
  const [secao,setSecao]     = useState(()=> new URLSearchParams(location.search).get("secao") || "inicio");

  // Tema claro/escuro — persiste em localStorage, aplicado via atributo
  // data-theme na <html> (é o que os seletores :root[data-theme="light"] escutam).
  const [tema,setTema] = useState(()=> localStorage.getItem("tradezen-tema") || "dark");
  useEffect(()=>{
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tradezen-tema", tema);
  },[tema]);
  const alternarTema = () => setTema(t => t==="dark" ? "light" : "dark");

  // Favoritos e desenhos salvos exigem cadastro — ambos são "ganchos" pra
  // criar conta. `avisoCadastro` liga um aviso global (qualquer tela) com
  // botão direto pro /cadastro; ver toggleFavorito e o render mais abaixo.
  const [avisoCadastro, setAvisoCadastro] = useState(false);
  useEffect(()=>{
    if(!avisoCadastro) return;
    const timer = setTimeout(()=>setAvisoCadastro(false), 6000);
    return ()=>clearTimeout(timer);
  },[avisoCadastro]);

  // Favoritos — client-side (localStorage), mas só existe se tiver conta.
  const [favoritos,setFavoritos] = useState(()=>{
    try{ return new Set(JSON.parse(localStorage.getItem("tradezen-favoritos")||"[]")); }
    catch{ return new Set(); }
  });
  const toggleFavorito = (ticker) => {
    if(!user){ setAvisoCadastro(true); return; }
    setFavoritos(prev=>{
      const n = new Set(prev);
      n.has(ticker) ? n.delete(ticker) : n.add(ticker);
      localStorage.setItem("tradezen-favoritos", JSON.stringify([...n]));
      return n;
    });
  };

  // Configuração salva POR ATIVO (indicadores ligados + desenhos) — vale
  // pra qualquer ticker visitado, não só os favoritados, mas só existe pra
  // quem tem conta (ver gate em ChartPane, no effect que salva a cada
  // mudança de tools/desenhos). Chave nova (tradezen-ativo-config) porque
  // o modelo mudou: antes só favoritava salvava, agora qualquer ativo salva.
  const [ativoConfig,setAtivoConfig] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("tradezen-ativo-config")||"{}"); }
    catch{ return {}; }
  });
  const salvarConfigAtivo = (ticker, config) => {
    setAtivoConfig(prev=>{
      const next = {...prev, [ticker]: config};
      localStorage.setItem("tradezen-ativo-config", JSON.stringify(next));
      return next;
    });
  };

  // Multitelas: até 4 telas no total (1 principal + até 3 extras). A
  // principal continua vindo da URL (permite F5/link direto); as extras são
  // só estado local, não vão pra URL. Índice no array vira a `key` de cada
  // ChartPane extra — ao fechar uma do meio, as de trás "sobem" de índice e
  // o React reconcilia o mesmo componente pra um ticker novo, que é
  // exatamente o que já acontece quando o usuário troca de ativo dentro da
  // mesma tela (o effect de troca de ticker do ChartPane cuida do reset).
  const MAX_TELAS_EXTRAS = 3;
  const [telasExtras,setTelasExtras] = useState([]);
  const fecharTela = (idx) => {
    setTelasExtras(prev => prev.filter((_,i)=>i!==idx));
  };
  const trocarTela = (idx, novoTicker) => {
    setTelasExtras(prev => prev.map((t,i)=> i===idx ? novoTicker : t));
  };

  // Multitelas no celular — estilo "trocar de mesa" de app de poker: em vez
  // de espremer os gráficos lado a lado (ilegível numa tela de celular),
  // só uma tela fica visível por vez (ver ocultoMobile no ChartPane) e uma
  // aba no topo troca qual delas aparece. `telaAtivaMobile` é o índice na
  // lista combinada [principal, ...telasExtras] (0 = principal).
  const isMobile = useIsMobile();
  const [telaAtivaMobile, setTelaAtivaMobile] = useState(0);
  const adicionarTelaEIrPara = (ticker) => {
    if(telasExtras.length >= MAX_TELAS_EXTRAS) return;
    setTelasExtras(prev => [...prev, ticker]);
    setTelaAtivaMobile(telasExtras.length + 1); // combinado: 0=principal, 1..N=extras
  };
  const fecharTelaMobile = (idx) => {
    fecharTela(idx);
    setTelaAtivaMobile(atual => {
      const idxCombinado = idx + 1;
      if(atual === idxCombinado) return 0;      // estava vendo a que fechou → volta pra principal
      if(atual > idxCombinado) return atual - 1; // as de trás "sobem" de índice junto
      return atual;
    });
  };
  // Rótulo curto da aba — usa o símbolo já conhecido em `mercado` quando dá
  // (mesmo texto do resto do app); senão tira o sufixo técnico do ticker.
  const labelMesa = (tk) => mercado.find(m=>m.ticker===tk)?.simbolo || tk.replace(/\.SA$|-USD$|=X$/,"");

  // Deriva qual "página" estamos baseado na URL
  const path = location.pathname;
  const isAnalysis = path.startsWith("/ativo/");
  const isLista = path.startsWith("/lista/");
  const listaTipo = isLista ? path.split("/lista/")[1] : null;
  const tickerUrl = isAnalysis ? decodeURIComponent(path.split("/ativo/")[1]) : null;

  // Ao trocar o ativo principal (nova navegação/URL), volta a aba mobile pra
  // principal — foi ela que acabou de mudar, então é a que faz sentido ver.
  // Ajuste durante a renderização (guardado pelo comparativo abaixo), não
  // useEffect, pra não disparar um segundo render em cascata.
  const [ultimoTickerUrlMesa, setUltimoTickerUrlMesa] = useState(tickerUrl);
  if(tickerUrl !== ultimoTickerUrlMesa){
    setUltimoTickerUrlMesa(tickerUrl);
    setTelaAtivaMobile(0);
  }

  // Carrega mercado e mantém atualizado — antes só buscava 1x no mount,
  // então a cotação da home ficava parada até a próxima navegação/refresh.
  // O backend cacheia /mercado por 5min (TTL_CURTO), então repetir a cada
  // 60s aqui é barato (na maioria das vezes cai no cache) e garante que o
  // preço nunca fica mais que ~5min desatualizado na tela.
  useEffect(()=>{
    const buscar = () => {
      fetch(`${API}/mercado`)
        .then(r=>r.json())
        .then(d=>setMercado(d.dados||[]))
        .catch(()=>setErro("Não foi possível carregar as cotações agora. Tentando de novo em instantes."));
    };
    buscar();
    const id = setInterval(buscar, 60000);
    return () => clearInterval(id);
  },[]);

  // Busca gráfico do IBOV de acordo com o timeframe (1D/1S/1M)
  useEffect(()=>{
    const periodos = {
      "1D": { periodo: "1mo", intervalo: "1d"  },  // 1 mês de candles diários
      "1S": { periodo: "1y",  intervalo: "1wk" },  // 1 ano de candles semanais
      "1M": { periodo: "5y",  intervalo: "1mo" },  // 5 anos de candles mensais
    };
    const p = periodos[marketTab] || periodos["1D"];
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
      })
      .catch(()=>{});
  },[marketTab]);

  const abrirAtivo=a=>{
    navigate(`/ativo/${encodeURIComponent(a.ticker)}`);
  };

  const ibov        = mercado.find(m=>m.ticker==="^BVSP")||mercado[0];
  const criptos     = mercado.filter(m=>m.mercado==="CRIPTO");
  const acoes       = mercado.filter(m=>m.mercado==="B3"&&m.ticker!=="^BVSP");
  const forex       = mercado.filter(m=>m.mercado==="FOREX");

  // Fileira do topo do Dashboard: Bitcoin, Petrobras, Vale, Itaú, Ouro,
  // Dólar/Real, nessa ordem — mesmo estilo dos cards da página de
  // Criptomoedas. Cada slot tem uma lista de substitutos da mesma categoria
  // (cripto/B3/commodity/forex): se o ativo preferido não vier na resposta
  // do /mercado (Yahoo derruba ticker individual em lote concorrente às
  // vezes), o card cai pro próximo da lista em vez de ficar "Sem dados" —
  // um substituto não usado por outro card é sempre melhor que um card
  // vazio.
  const DASH_TOP_CONFIG = [
    {ticker:"BTC-USD",  nome:"Bitcoin",   simbolo:"BTC",   cor:"#F7931A", fallback:["ETH-USD","SOL-USD","BNB-USD","XRP-USD","ADA-USD","DOGE-USD","AVAX-USD"]},
    {ticker:"PETR4.SA", nome:"Petrobras", simbolo:"PETR4", cor:"#00A650", fallback:["VALE3.SA","ITUB4.SA","BBDC4.SA","WEGE3.SA","MGLU3.SA"]},
    {ticker:"VALE3.SA", nome:"Vale",      simbolo:"VALE3", cor:"#EAB308", fallback:["ITUB4.SA","PETR4.SA","BBDC4.SA","WEGE3.SA","MGLU3.SA"]},
    {ticker:"ITUB4.SA", nome:"Itaú",      simbolo:"ITUB4", cor:"#EC7000", fallback:["BBDC4.SA","PETR4.SA","VALE3.SA","WEGE3.SA","MGLU3.SA"]},
    {ticker:"GC=F",     nome:"Ouro",      simbolo:"OURO",  cor:"#F5A623", fallback:["SI=F","CL=F","BZ=F","NG=F","ZC=F","ZS=F","KC=F"]},
    {ticker:"USDBRL=X", nome:"USD/BRL",simbolo:"USD/BRL",cor:"#9CA3AF", fallback:["EURUSD=X","EURBRL=X","GBPUSD=X"]},
  ];
  const dashTopUsados = new Set();
  const dashTop = DASH_TOP_CONFIG.map(cfg=>{
    let achado = mercado.find(m=>m.ticker===cfg.ticker && !dashTopUsados.has(m.ticker));
    if(!achado){
      for(const tk of cfg.fallback){
        achado = mercado.find(m=>m.ticker===tk && !dashTopUsados.has(m.ticker));
        if(achado) break;
      }
    }
    if(achado){ dashTopUsados.add(achado.ticker); return achado; }
    return { ticker:cfg.ticker, nome:cfg.nome, simbolo:cfg.simbolo, semDados: mercado.length>0 };
  });

  // Banners da direita — antes era o "Detector de Análise Técnica"
  // bloqueado com cadeado; por enquanto, enquanto a detecção automática
  // de padrões não está pronta pra todo mundo ver, viram só mais 3 ativos
  // reais e clicáveis (sem cadeado). Reusa dashTopUsados pra não repetir
  // nenhum ticker que já apareceu na fileira do topo.
  const DASH_SIDE_CONFIG = [
    {ticker:"ETH-USD",  nome:"Ethereum", simbolo:"ETH",   cor:"#627EEA", fallback:["SOL-USD","BNB-USD","XRP-USD","ADA-USD","DOGE-USD","AVAX-USD"]},
    {ticker:"BBDC4.SA", nome:"Bradesco", simbolo:"BBDC4", cor:"#CC092F", fallback:["WEGE3.SA","MGLU3.SA","PETR4.SA","VALE3.SA","ITUB4.SA"]},
    {ticker:"SI=F",     nome:"Prata",    simbolo:"PRATA", cor:"#C0C0C0", fallback:["CL=F","BZ=F","NG=F","ZC=F","ZS=F","KC=F"]},
  ];
  const dashSide = DASH_SIDE_CONFIG.map(cfg=>{
    let achado = mercado.find(m=>m.ticker===cfg.ticker && !dashTopUsados.has(m.ticker));
    if(!achado){
      for(const tk of cfg.fallback){
        achado = mercado.find(m=>m.ticker===tk && !dashTopUsados.has(m.ticker));
        if(achado) break;
      }
    }
    if(achado){ dashTopUsados.add(achado.ticker); return achado; }
    return { ticker:cfg.ticker, nome:cfg.nome, simbolo:cfg.simbolo, semDados: mercado.length>0 };
  });

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
      {path!=="/"&&(()=>{
        // Ações de conta (tema/sino/entrar-usuário/pro) — renderizadas duas
        // vezes: uma no header (visível só no desktop) e outra dentro do
        // menu hambúrguer (visível só no mobile). É o mesmo bloco reusado
        // via variável pra não duplicar a lógica do menu "Sair".
        const acoesConta = (
          <>
            <button className="nav-ic tema-toggle" title={tema==="dark" ? "Mudar pro tema claro" : "Mudar pro tema escuro"} onClick={alternarTema}>
              {tema==="dark"
                ? <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                : <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              }
            </button>
            {user
              ? <div style={{position:"relative"}}>
                  <button className="btn-in" onClick={()=>setUserMenuAberto(v=>!v)}>
                    {(user.user_metadata?.nome?.trim().split(" ")[0] || user.email.split("@")[0]).toUpperCase()} <span style={{fontSize:9}}>▾</span>
                  </button>
                  {userMenuAberto && (
                    <>
                      <div style={{position:"fixed",inset:0,zIndex:998}} onClick={()=>setUserMenuAberto(false)}/>
                      <div className="ind-drop" style={{left:"auto",right:0,minWidth:180}}>
                        <div style={{padding:"6px 10px 8px",fontSize:11,color:"var(--text3)",borderBottom:"1px solid var(--border)",marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
                        <div className="ind-item" onClick={()=>{ setUserMenuAberto(false); logout(); navigate("/"); }}>
                          <span className="ind-label" style={{color:"var(--down)"}}>Sair</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              : <button className="btn-in" onClick={()=>navigate("/login")}>Entrar</button>
            }
          </>
        );

        // Só as páginas com Sidebar (Mercados / Principais Índices) têm
        // navegação própria pra oferecer dentro do drawer — nas demais
        // (gráfico de um ativo, login...) o hambúrguer fica escondido via
        // CSS, então `drawerAberto` nunca chega a abrir fora delas.
        const numaRotaPropria = SB_ITENS.some(x=>x.route && location.pathname===x.route);

        return (
          <>
          <nav className="nav">
            <button
              className="hamburger-btn"
              title="Menu"
              onClick={()=>setDrawerAberto(true)}
            >
              <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>

            <div className="logo" onClick={()=>{ navigate("/mercados"); setDrawerAberto(false); setBuscaMobileAberta(false); }}>TRADE<span>ZEN</span></div>

            <div className={`nav-search-wrap ${buscaMobileAberta?"aberta":""}`}>
              <SearchBar onSelect={a=>{ abrirAtivo(a); setBuscaMobileAberta(false); }} mercado={mercado}/>
              <button className="nav-ic search-close-btn" title="Fechar busca" onClick={()=>setBuscaMobileAberta(false)}>✕</button>
            </div>

            <div style={{flex:1}}/>

            <button className="nav-ic search-toggle-btn" title="Buscar" onClick={()=>setBuscaMobileAberta(true)}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>

            {/* Tema — no mobile fica sozinho no canto superior direito (fora
                do menu hambúrguer, que só tem navegação + conta agora). */}
            <button className="nav-ic tema-toggle-mobile" title={tema==="dark" ? "Mudar pro tema claro" : "Mudar pro tema escuro"} onClick={alternarTema}>
              {tema==="dark"
                ? <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                : <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              }
            </button>

            <div className="nav-r">
              {acoesConta}
            </div>
          </nav>

          {/* ── DRAWER MOBILE (sidebar + conta) ── */}
          {drawerAberto && (
            <>
              <div className="mobile-drawer-backdrop" onClick={()=>setDrawerAberto(false)}/>
              <div className="mobile-drawer">
                <div className="mobile-drawer-head">
                  <div className="logo" style={{fontSize:18}}>TRADE<span>ZEN</span></div>
                  <button className="mobile-drawer-close" title="Fechar menu" onClick={()=>setDrawerAberto(false)}>✕</button>
                </div>
                <div className="mobile-drawer-nav">
                  {SB_ITENS.map(it=>{
                    const ativo = it.route ? location.pathname===it.route : (!numaRotaPropria && secao===it.id);
                    return (
                      <button
                        key={it.id}
                        className={`sb-item ${ativo?"active":""}`}
                        onClick={()=>{
                          setDrawerAberto(false);
                          if(it.route){ navigate(it.route); return; }
                          setSecao(it.id);
                          if(location.pathname!=="/mercados") navigate("/mercados");
                        }}
                      >
                        <svg viewBox="0 0 24 24">{it.icon}</svg>
                        <span className="sb-label">{it.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mobile-drawer-divider"/>
                <div className="mobile-drawer-conta">
                  {acoesConta}
                </div>
              </div>
            </>
          )}
          </>
        );
      })()}

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
              titulo="Favoritos"
              ativos={mercado.filter(m=>favoritos.has(m.ticker))}
              mensagemVazio="Você ainda não favoritou nenhum ativo — clique na estrela ☆ de qualquer card pra adicionar aqui."
              favoritos={favoritos} toggleFavorito={toggleFavorito} abrirAtivo={abrirAtivo}
            />
          )}
          {secao==="inicio" && (
          <div className="home">
          {erro&&(
            <div style={{padding:"10px 16px",color:"var(--down)",fontSize:11,fontFamily:"var(--font-m)",background:"rgba(255,69,96,.06)",borderRadius:8,border:"1px solid rgba(255,69,96,.2)"}}>
              {erro}
            </div>
          )}

          {/* TOPO — mesmo estilo dos cards da página de Criptomoedas */}
          <div className="dash-top-row">
            {dashTop.map((a,i)=>{
              const cfg = DASH_TOP_CONFIG[i];
              if("semDados" in a){
                return (
                  <div key={cfg.ticker} className="crypto-top-card" style={{cursor:"default",opacity:.55}}>
                    <div className="idx-top">
                      <div style={{width:32,height:32,borderRadius:"50%",background:"var(--border)",color:"var(--text3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{cfg.simbolo[0]}</div>
                      <span className="idx-name">{cfg.nome}</span>
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
              return (
                <div key={a.ticker} className="crypto-top-card" onClick={()=>abrirAtivo(a)}>
                  <div className="idx-top">
                    <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={cfg.cor}/>
                    <span className="idx-name">{a.nome}</span>
                  </div>
                  <div className="idx-line">
                    <span className="idx-price">{fmtP(a.preco)}</span>
                    <span className={`idx-chg ${a.alta?"up":"down"}`}>{a.alta?"▲":"▼"} {Math.abs(a.variacao_pct||0).toFixed(2)}%</span>
                  </div>
                  <div className="crypto-top-spark"><MiniLine data={a.serie||[]} color={a.alta?"#00D68F":"#FF4560"}/></div>
                </div>
              );
            })}
          </div>

          {/* ÁREA PRINCIPAL — gráfico do Ibovespa (70%) + painel lateral (30%) */}
          <div className="crypto-main-grid">
            <div className="card" style={{padding:20,display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",rowGap:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>Estudo de Mercado</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10,fontWeight:700,letterSpacing:.4,textTransform:"uppercase",color:"#009C3B",background:"rgba(0,156,60,.12)",padding:"4px 10px",borderRadius:999,whiteSpace:"nowrap",flexShrink:0}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#009C3B",flexShrink:0}}/>
                    Bolsa Brasileira
                  </span>
                </div>
                <span className="sl" style={{whiteSpace:"nowrap"}} onClick={()=>ibov&&abrirAtivo(ibov)}>Análise completa →</span>
              </div>
              <div
                style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,cursor:"pointer"}}
                onClick={()=>ibov&&abrirAtivo(ibov)}
                title="Clique para abrir análise completa"
              >
                <div>
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
                    <button key={t} className={`mc-tab ${marketTab===t?"active":""}`} onClick={e=>{ e.stopPropagation(); setMTab(t); }}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="mc-chart" style={{flex:1,marginTop:12}}>
                {ibovSerie.length>0
                  ?<HomeLineChart data={ibovSerie} color={ibov?.alta?"#00D68F":"#FF4560"} tema={tema}/>
                  :<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><div className="spin"/></div>
                }
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Mais Ativos — antes era o "Detector de Análise Técnica"
                  bloqueado com cadeado; por enquanto, viram só mais 3 ativos
                  reais, clicáveis, sem cadeado nenhum (ver comentário perto
                  de DASH_SIDE_CONFIG, mais acima nesse componente). */}
              <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>Mais Ativos</span>
              {dashSide.map((a,i)=>{
                const cfg = DASH_SIDE_CONFIG[i];
                if("semDados" in a){
                  return (
                    <div key={cfg.ticker} className="crypto-top-card" style={{cursor:"default",opacity:.55}}>
                      <div className="idx-top">
                        <div style={{width:32,height:32,borderRadius:"50%",background:"var(--border)",color:"var(--text3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{cfg.simbolo[0]}</div>
                        <span className="idx-name">{cfg.nome}</span>
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
                return (
                  <div key={a.ticker} className="crypto-top-card" onClick={()=>abrirAtivo(a)}>
                    <div className="idx-top">
                      <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={cfg.cor}/>
                      <span className="idx-name">{a.nome}</span>
                    </div>
                    <div className="idx-line">
                      <span className="idx-price">{fmtP(a.preco)}</span>
                      <span className={`idx-chg ${a.alta?"up":"down"}`}>{a.alta?"▲":"▼"} {Math.abs(a.variacao_pct||0).toFixed(2)}%</span>
                    </div>
                    <div className="crypto-top-spark"><MiniLine data={a.serie||[]} color={a.alta?"#00D68F":"#FF4560"}/></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticker */}
          <div className="tbar">
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
            <PaginaPrincipaisAtivosComparativo tema={tema} abrirAtivo={abrirAtivo}/>
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
                {listaTipo==="acoes"&&"Todos os Ativos B3 e Forex"}
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

      {/* ── ANÁLISE: 1 tela, 2 lado a lado, ou até 4 em grade 2×2 no desktop
          (multitelas) ── A tela principal usa key="primary" sempre — assim,
          ao abrir/fechar telas extras, o React reconcilia o mesmo
          componente em vez de desmontar e remontar (o que perderia
          indicadores/seleção e dispararia um refetch à toa). Com 3+ telas
          no total, `.analysis-row` ganha a classe "grid4" (ver CSS) e vira
          grade 2×2 em vez de linha única — 4 telas de 480px cada numa
          linha só não caberia em tela nenhuma.

          No celular todas as telas continuam montadas (mesmo motivo acima),
          mas só a ativa fica visível (`ocultoMobile` nas outras) — trocar de
          "mesa" é só mudar `telaAtivaMobile`, igual ao seletor de mesas de
          um app de poker, sem desmontar/refazer fetch de nada. */}
      {isAnalysis && tickerUrl && (
        <div className="analysis-wrap">
          {isMobile && telasExtras.length>0 && (
            <div className="mesa-tabs">
              <button
                className={`mesa-tab ${telaAtivaMobile===0 ? "active" : ""}`}
                onClick={()=>setTelaAtivaMobile(0)}
              >{labelMesa(tickerUrl)}</button>
              {telasExtras.map((tk,idx)=>(
                <button
                  key={idx}
                  className={`mesa-tab ${telaAtivaMobile===idx+1 ? "active" : ""}`}
                  onClick={()=>setTelaAtivaMobile(idx+1)}
                >
                  {labelMesa(tk)}
                  <span
                    className="mesa-tab-x"
                    onClick={e=>{ e.stopPropagation(); fecharTelaMobile(idx); }}
                  >✕</span>
                </button>
              ))}
              {telasExtras.length<MAX_TELAS_EXTRAS && (
                <button className="mesa-tab mesa-tab-add" onClick={()=>adicionarTelaEIrPara(tickerUrl)} title="Adicionar mesa">+</button>
              )}
            </div>
          )}
          <div className={`analysis-row ${!isMobile && (1+telasExtras.length)>2 ? "grid4" : ""}`}>
          <ChartPane
            key="primary"
            mercado={mercado}
            ticker={tickerUrl}
            onTickerChange={t=>navigate(`/ativo/${encodeURIComponent(t)}`)}
            onAddSplit={telasExtras.length<MAX_TELAS_EXTRAS ? ()=>adicionarTelaEIrPara(tickerUrl) : undefined}
            ocultoMobile={isMobile && telaAtivaMobile!==0}
            tema={tema}
            user={user}
            favoritos={favoritos}
            toggleFavorito={toggleFavorito}
            ativoConfig={ativoConfig}
            salvarConfigAtivo={salvarConfigAtivo}
          />
          {telasExtras.map((tk,idx)=>(
            <ChartPane
              key={`extra-${idx}`}
              mercado={mercado}
              ticker={tk}
              onTickerChange={novo=>trocarTela(idx, novo)}
              onClose={()=>fecharTelaMobile(idx)}
              ocultoMobile={isMobile && telaAtivaMobile!==idx+1}
              tema={tema}
              user={user}
              favoritos={favoritos}
              toggleFavorito={toggleFavorito}
              ativoConfig={ativoConfig}
              salvarConfigAtivo={salvarConfigAtivo}
            />
          ))}
          </div>
        </div>
      )}

      {path!=="/" && path!=="/mercados" && path!=="/principais-ativos" && !isAnalysis && !isLista && (
        <Pagina404/>
      )}

      {avisoCadastro && (
        <div className="cadastro-toast">
          <span>Crie sua conta grátis pra favoritar ativos e salvar seus desenhos e indicadores</span>
          <button onClick={()=>{ setAvisoCadastro(false); navigate("/cadastro"); }}>Cadastrar</button>
          <button className="cadastro-toast-x" title="Fechar" onClick={()=>setAvisoCadastro(false)}>✕</button>
        </div>
      )}
      </>
    );
}


// Decide entre a Abertura (sobreposta) e o app.
// montado para que os dados de mercado já carreguem no fundo enquanto o
// usuário vê a tela de abertura.
// Redireciona client-side (sem reload) — usado pelas rotas protegidas
// /dashboard e /favoritos, que hoje são só "apelidos" pra telas que já
// existem dentro de /mercados (ver `secao` em AppInner).
function Redirecionar({ to }){
  const navigate = useNavigate();
  useEffect(()=>{ navigate(to, { replace:true }); },[to]);
  return null;
}

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
  if (location.pathname === "/admin/templates/bandeira-alta") {
    return <RequireAdmin><AdminTemplatesBandeiraAlta/></RequireAdmin>;
  }
  if (location.pathname === "/admin/templates/bandeira-baixa") {
    return <RequireAdmin><AdminTemplatesBandeiraBaixa/></RequireAdmin>;
  }

  if (location.pathname === "/login") return <Login/>;
  if (location.pathname === "/cadastro") return <Cadastro/>;
  if (location.pathname === "/recuperar-senha") return <RecuperarSenha/>;
  if (location.pathname === "/redefinir-senha") return <RedefinirSenha/>;
  if (location.pathname === "/auth/callback") return <AuthCallback/>;
  if (location.pathname === "/dashboard") {
    return <RequireAuth><Redirecionar to="/mercados"/></RequireAuth>;
  }
  if (location.pathname === "/favoritos") {
    return <RequireAuth><Redirecionar to="/mercados?secao=favoritos"/></RequireAuth>;
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
      <AuthProvider>
        <Router/>
      </AuthProvider>
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