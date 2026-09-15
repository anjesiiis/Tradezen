import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "../assets/hero-bg.jpg";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { CSS } from "../styles/appCss.js";

// ── App ───────────────────────────────────────────────────────
// ── PÁGINA DE ABERTURA (tela inicial leve com efeito de fundo) ──
// Landing no celular — layout próprio sobre foto (ver .abm no CSS). O texto
// é diferente do desktop, então é um componente à parte em vez de esconder
// metade do HTML por CSS (ficariam dois <h1> na mesma página).
const ABM_OVERLAY = "linear-gradient(180deg,rgba(11,14,20,.4) 0%,rgba(11,14,20,.2) 50%,rgba(11,14,20,.6) 100%)";

function AberturaMobile(){
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const ir = (rota) => { setMenuAberto(false); navigate(rota); };

  return (
    <div className="abm" style={{backgroundImage:`${ABM_OVERLAY}, url(${heroBg})`}}>
      <header className="abm-head">
        <div className="abm-logo notranslate">
          <svg viewBox="0 0 28 24" aria-hidden="true">
            <path d="M5 2h20l-2.4 5.4H15L10.6 22H4.4L8.8 7.4H2.6z" fill="#2962ff"/>
            <path d="M16.8 10.4H27l-2.2 5.2h-4.1l-2.6 6.4h-5.9z" fill="#4d8bff"/>
          </svg>
          <b>TRADE<span>ZEN</span></b>
        </div>
        <div className="abm-acoes">
          <button className="abm-entrar" onClick={()=>ir("/login")}>Entrar</button>
          <button
            className="abm-menu-btn"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            onClick={()=>setMenuAberto(v=>!v)}
          >
            <svg viewBox="0 0 24 18"><line x1="1" y1="2" x2="23" y2="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="1" y1="16" x2="23" y2="16"/></svg>
          </button>
        </div>
        {menuAberto && (
          <nav className="abm-menu">
            <button onClick={()=>ir("/mercados")}>Explorar mercados</button>
            <button onClick={()=>ir("/login")}>Entrar</button>
            <button onClick={()=>ir("/cadastro")}>Criar conta grátis</button>
          </nav>
        )}
      </header>

      <main className="abm-conteudo" onClick={()=>menuAberto && setMenuAberto(false)}>
        <p className="abm-tags">Análise<i>·</i>Gráficos<i>·</i>Mercado</p>
        <h1 className="abm-titulo">Mercado<br/>com mais<br/><span>clareza.</span></h1>
        <p className="abm-sub">Explore padrões, visualize movimentos e entenda o comportamento dos ativos.</p>
        <button className="abm-cta" onClick={()=>ir("/mercados")}>
          Explorar TradeZen
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </main>
    </div>
  );
}

function Abertura(){
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const isMobile = useIsMobile();

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
  },[isMobile]);

  if(isMobile) return <AberturaMobile/>;

  return(
    <div className="abertura">
      <canvas ref={canvasRef} className="ab-fx"/>
      <div className="ab-glow"/>
      <div className="ab-wrap">
        <div className="ab-head">
          <div className="ab-logo">
            <span className="ic">✦</span>
            <span className="notranslate">TRADE<span>ZEN</span></span>
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

// A landing pode aparecer antes do chunk do Dashboard (que é quem injeta o
// CSS do app) — então ela injeta o mesmo CSS também. Duas <style> iguais
// enquanto as duas telas estão montadas não mudam nada no resultado.
function Landing(){
  return (
    <>
      <style>{CSS}</style>
      <Abertura/>
    </>
  );
}

export default Landing;
