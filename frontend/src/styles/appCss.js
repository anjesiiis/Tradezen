// Estilos globais do app (injetados pelo Dashboard via <style>). Chama
// "CSS" como antes; exportado com nome explícito porque `CSS` também é
// um global do navegador (window.CSS).
export const CSS = `
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
.notranslate{translate:no}
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
/* Nome do indicador na lista: era --text2 (#5A7299, azul-acinzentado
   apagado) e ficava dificil de ler. --text e o texto mais claro do
   tema (quase branco no escuro) e vira escuro no tema claro sozinho. */
.ind-label{font-size:11px;color:var(--text);flex:1}
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
  /* Fonte única das duas alturas fixas do layout mobile. Antes o 52px do
     header estava escrito à mão em cada calc() — mudar exigia caçar todos.
     Agora quem precisa do espaço usa var(). */
  :root{
    --h-header:44px; --h-nav-inferior:56px;
    /* Superfícies do mobile como variáveis, não hex fixo: senão o tema
       claro trocava só o texto (que usa --text) e deixava tudo escrito em
       preto sobre fundo preto. */
    --mob-superficie:rgba(19,23,34,.95);
    --mob-borda:rgba(30,34,45,.6);
    --mob-borda-forte:rgba(30,34,45,.8);
    --mob-lista:rgba(19,23,34,.55);
    --mob-fundo:linear-gradient(180deg,#0f1118 0%,#0d1a2a 40%,#0f1118 100%);
    --mob-brilho-1:rgba(41,98,255,.08);
    --mob-brilho-2:rgba(38,166,154,.06);
  }
  :root[data-theme="light"]{
    --mob-superficie:rgba(255,255,255,.95);
    --mob-borda:rgba(210,217,228,.9);
    --mob-borda-forte:rgba(205,213,226,.95);
    --mob-lista:#FFFFFF;
    --mob-fundo:linear-gradient(180deg,#F3F5F9 0%,#E7EEF9 40%,#F3F5F9 100%);
    --mob-brilho-1:rgba(41,98,255,.07);
    --mob-brilho-2:rgba(38,166,154,.07);
  }

  /* Só a página (documento) rola — não html/body/#root/.home todos com
     overflow-y próprio ao mesmo tempo. Essa pilha de scrolls aninhados era
     o motivo da rolagem travar: o dedo arrastava um container que não
     necessariamente continha o resto, então descer/subir "tudo" deixava
     pedaço cortado, e só dava pra ver o resto arrastando a barrinha de
     rolagem interna do .home. Com altura natural (sem calc(100vh-52px) +
     overflow-y:auto duplicado) e overflow só no html/body, é uma rolagem
     só, do jeito que o navegador já faz sozinho — inclusive some a barra
     de rolagem visível (webkit-scrollbar abaixo). */
  /* Só o html rola; body fica overflow visível. Com overflow nos DOIS, o
     body virava um segundo container de rolagem, e no Chrome/Safari do
     celular a barra inferior fixa descia junto quando a barra de endereço
     do navegador recolhia ao rolar a lista. */
  html{overflow-x:hidden;overflow-y:auto;height:auto;-webkit-overflow-scrolling:touch}
  body{overflow:visible;overflow-x:clip;height:auto}
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

  /* ── HEADER (fixo, sempre visível) ── */
  .nav{
    position:fixed;top:0;left:0;right:0;height:var(--h-header);
    padding:0 12px;gap:10px;z-index:100;
    background:var(--mob-superficie);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    border-bottom:.5px solid var(--mob-borda);
  }
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

  /* ── HOME / DASHBOARD ──
     Fundo com profundidade em vez de cor chapada: gradiente vertical mais
     os dois brilhos difusos (::before/::after). São decorativos, então
     pointer-events:none — não podem roubar toque de nada. O padding
     reserva o espaço do header fixo e da barra inferior fixa. */
  .home{
    position:relative;height:auto;overflow-y:visible;
    padding:calc(var(--h-header) + 12px) 12px calc(var(--h-nav-inferior) + 16px);
    background:var(--mob-fundo);
  }
  .home::before,.home::after{content:"";position:absolute;pointer-events:none;z-index:0}
  .home::before{
    top:0;right:0;width:200px;height:200px;
    background:radial-gradient(circle,var(--mob-brilho-1) 0%,transparent 70%);
  }
  .home::after{
    top:38%;left:0;width:180px;height:180px;
    background:radial-gradient(circle,var(--mob-brilho-2) 0%,transparent 70%);
  }
  /* Conteúdo acima dos brilhos */
  .home>*{position:relative;z-index:1}

  /* Cards da home somem no celular — a lista em linhas ocupa o lugar.
     Classe própria (e não .crypto-main-grid direto) porque essa mesma
     classe é usada na página de Criptomoedas, que continua com cards. */
  .dash-so-desktop{display:none!important}

  /* ── LISTA DE ATIVOS EM LINHAS (mobile) ── */
  .mlista-secao{font-size:11px;letter-spacing:1.4px;font-weight:700;color:var(--text3);
    text-transform:uppercase;margin:18px 0 6px;font-family:var(--font-m)}
  .mlista{display:flex;flex-direction:column;border-radius:12px;overflow:hidden;
    background:var(--mob-lista);border:.5px solid var(--mob-borda-forte)}
  .mlista-item{display:flex;align-items:center;gap:11px;padding:11px 12px;min-height:56px;
    border-bottom:.5px solid var(--mob-borda);cursor:pointer;-webkit-tap-highlight-color:transparent}
  .mlista-item:last-child{border-bottom:none}
  .mlista-item:active{background:rgba(41,98,255,.07)}
  .mlista-txt{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
  .mlista-tk{font-size:13px;font-weight:700;color:var(--text);font-family:var(--font-m);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mlista-nm{font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mlista-dir{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
  .mlista-pr{font-size:13px;font-weight:600;color:var(--text);font-family:var(--font-m)}
  .mlista-var{font-size:11px;font-weight:700;font-family:var(--font-m)}

  /* ── BARRA DE NAVEGAÇÃO INFERIOR (5 abas) ── */
  /* Sempre fixa e visível: renderizada direto no body (portal), sem
     transform/opacity/hide-on-scroll. A altura soma a área segura do
     iPhone pra os ícones não ficarem sob a barra de gestos. */
  .mnav{position:fixed!important;bottom:0;left:0;right:0;z-index:9999;
    height:calc(var(--h-nav-inferior) + env(safe-area-inset-bottom,0px));
    display:flex;align-items:stretch;
    background-color:#131722;background:var(--mob-superficie);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    border-top:.5px solid var(--mob-borda);
    padding-bottom:env(safe-area-inset-bottom,0px)}
  :root[data-theme="light"] .mnav{background-color:#fff}
  /* Espaço no fim de qualquer página com a barra (Lista, Favoritos,
     Cripto...), pra o último ativo não ficar escondido atrás dela. */
  html.com-mnav #root{padding-bottom:calc(var(--h-nav-inferior) + env(safe-area-inset-bottom,0px) + 12px)}
  html.com-mnav .home{padding-bottom:16px}
  .mnav-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    background:none;border:none;padding:0;cursor:pointer;color:var(--text3);
    font-family:var(--font-b);font-size:10px;font-weight:600;min-height:0;
    -webkit-tap-highlight-color:transparent}
  .mnav-item svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.9;
    stroke-linecap:round;stroke-linejoin:round}
  .mnav-item.active{color:var(--accent)}

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
  /* Multitelas no celular = trocar de "mesa" (estilo poker), não grade lado
     a lado: força layout de bloco cheio mesmo se a classe grid4 (2x2 do
     desktop) estiver aplicada — a tela oculta já vem com display:none via
     inline style (prop ocultoMobile no ChartPane), então só a ativa ocupa
     espaço. A classe analysis-wrap é quem reserva os 100vh-52px agora
     (mesa-tabs + o gráfico dividem essa altura); analysis-row vira flex:1
     dentro dela em vez de reservar a tela inteira sozinha — senão, com a
     barra de abas visível, o gráfico vazaria pra baixo da tela.

     Nada aqui pode ter min-height fixo em px (tipo "450px") — num
     viewport mais baixo isso força o miolo a crescer além do espaço real,
     e como só overflow-x era travado (não overflow-y), o excesso vazava
     pra fora do .analysis-row/.analysis-wrap e virava scroll da PÁGINA
     inteira — daí o header/barra do ativo "sumindo" ao rolar e sem jeito
     de voltar. Com flex:1 puro (sem piso de altura) + overflow-y:hidden
     nos dois containers, o gráfico sempre cabe exatamente no que sobra,
     nunca estoura, e a única coisa que rola é o próprio gráfico (arrastar
     candles, já nativo da lib). O nav vira fixed só nesta página (via
     :has(~ .analysis-wrap), não afeta as outras) pra nunca sumir junto. */
  body:has(.analysis-wrap){overflow:hidden;height:100%}
  .nav:has(~ .analysis-wrap){position:fixed;top:0;left:0;right:0}
  /* dvh (não vh) aqui é o que importa: 100vh é fixo do tamanho MÁXIMO
     possível de tela, sem contar a barra do navegador quando ela está
     visível — então o fundo do gráfico (onde fica o volume) ficava
     desenhado embaixo da área real visível, coberto pela própria barra
     do navegador. dvh se ajusta sozinho conforme a barra aparece/some. */
  .analysis-wrap{display:flex;flex-direction:column;height:calc(100dvh - var(--h-header));margin-top:var(--h-header);overflow-y:hidden}
  .analysis-row, .analysis-row.grid4{display:block!important;overflow:hidden;flex:1;min-height:0}
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
  /* Fita de cotacoes do rodape sai no mobile: o espaco de baixo agora e
     da barra de navegacao de 5 abas (.mnav), as duas fixas no bottom:0
     ficariam uma por cima da outra. */
  .tbar{display:none}
  .ti{font-size:11px;padding:0 14px}

  /* ── LANDING (mobile) ──
     No celular a landing é outro componente (AberturaMobile): foto de fundo
     no lugar da malha animada, texto centralizado. Cores fixas de propósito,
     fora do sistema de tema: o fundo é uma fotografia escura, então o texto
     precisa continuar claro mesmo no tema claro — senão fica escuro sobre
     escuro, o mesmo bug que já aconteceu no dashboard. */
  .abm{
    position:fixed;inset:0;z-index:1000;overflow-y:auto;
    min-height:100vh;min-height:100dvh;
    display:flex;flex-direction:column;
    background-color:#0b0e14;background-size:cover;
    background-position:center right;background-repeat:no-repeat;
    font-family:var(--font-b);color:#fff;
  }
  .abm-head{position:relative;z-index:2;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:16px 20px}
  .abm-logo{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:500;letter-spacing:4px;color:#fff;user-select:none}
  .abm-logo b{font-weight:inherit}.abm-logo span{color:#4d8bff}
  .abm-logo svg{width:28px;height:24px;flex-shrink:0}
  .abm-acoes{display:flex;align-items:center;gap:14px}
  .abm-entrar{background:none;border:none;color:#fff;font-family:var(--font-b);font-size:15px;font-weight:500;padding:8px 4px;cursor:pointer}
  .abm-menu-btn{background:none;border:none;padding:0;margin-right:-10px;cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:44px}
  .abm-menu-btn svg{width:24px;height:18px;stroke:#4d8bff;stroke-width:2;stroke-linecap:round;fill:none}
  .abm-conteudo{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:clamp(32px,10vh,110px) 24px 24px}
  /* letter-spacing soma espaço depois da última letra também; o padding
     à esquerda devolve o texto pro centro visual */
  .abm-tags{font-family:var(--font-m);font-size:12px;letter-spacing:3px;padding-left:3px;color:#a0a4ad;text-transform:uppercase;margin:0}
  .abm-tags i{font-style:normal;margin:0 8px}
  .abm-titulo{font-family:var(--font-b);font-size:48px;font-weight:400;line-height:1.1;color:#fff;margin:24px 0 0;letter-spacing:-.5px}
  .abm-titulo span{color:#4d8bff}
  .abm-sub{font-size:16px;line-height:1.5;color:#c0c4cc;max-width:320px;margin:24px auto 40px}
  .abm-cta{display:inline-flex;align-items:center;gap:12px;background:#2962ff;color:#fff;border:none;padding:16px 40px;border-radius:32px;font-family:var(--font-b);font-size:16px;font-weight:500;cursor:pointer;box-shadow:0 4px 24px rgba(41,98,255,.4);transition:opacity .15s;-webkit-tap-highlight-color:transparent}
  .abm-cta:hover,.abm-cta:active{opacity:.9}
  .abm-cta svg{width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .abm-entrar:focus-visible,.abm-menu-btn:focus-visible,.abm-cta:focus-visible,.abm-menu button:focus-visible{outline:2px solid #4d8bff;outline-offset:3px}
  /* Menu do ícone: só destinos que já existem no site */
  .abm-menu{position:absolute;top:62px;right:14px;z-index:3;min-width:210px;display:flex;flex-direction:column;padding:6px;border-radius:14px;background:rgba(15,19,28,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:.5px solid rgba(77,139,255,.25);box-shadow:0 12px 36px rgba(0,0,0,.5)}
  .abm-menu button{background:none;border:none;text-align:left;color:#e6e8ec;font-family:var(--font-b);font-size:15px;padding:12px 14px;border-radius:9px;cursor:pointer}
  .abm-menu button:active{background:rgba(77,139,255,.12)}
}
`;
