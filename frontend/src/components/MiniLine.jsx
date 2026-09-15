import { useEffect, useRef } from "react";

// ── Mini Line (canvas simples pra cards) ─────────────────────
export function MiniLine({data,color,padding=4}){
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
