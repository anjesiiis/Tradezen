import { useState } from "react";
import { AssetCard, SkeletonCard } from "../components/AssetCard.jsx";
import { MERCADOS_ORDEM } from "../lib/mercado.js";

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

export default PaginaListaAtivos;
