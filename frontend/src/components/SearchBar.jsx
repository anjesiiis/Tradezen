import { useEffect, useRef, useState } from "react";
import { API } from "../lib/api.js";
import { MERCADOS_ORDEM, MKTC } from "../lib/mercado.js";

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

export function SearchBar({onSelect, mercado=[]}){
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
