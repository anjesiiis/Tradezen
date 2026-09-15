import { IconeAtivo } from "./IconeAtivo.jsx";
import { MiniLine } from "./MiniLine.jsx";
import { MKTC, fmtP } from "../lib/mercado.js";

// ── Asset Card ────────────────────────────────────────────────
export function AssetCard({a,onClick,favorito=false,onToggleFavorito}){
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

export function SkeletonCard(){
  return(
    <div className="ac" style={{opacity:.25,cursor:"default"}}>
      <div style={{height:30,width:30,borderRadius:"50%",background:"var(--border)",marginBottom:10}}/>
      <div style={{height:14,width:"60%",background:"var(--border)",borderRadius:4,marginBottom:6}}/>
      <div style={{height:10,width:"80%",background:"var(--border)",borderRadius:4,marginBottom:10}}/>
      <div style={{height:12,width:"50%",background:"var(--border)",borderRadius:4}}/>
    </div>
  );
}
