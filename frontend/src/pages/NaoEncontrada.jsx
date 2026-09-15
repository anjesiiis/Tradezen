import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

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

export default Pagina404;
