import { useEffect } from "react";
import { createPortal } from "react-dom";

// ── MOBILE: barra de navegação inferior (5 abas) ──
const MNAV_ITENS = [
  { id:"inicio",    label:"Lista",     icon:<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
  { id:"grafico",   label:"Gráfico",   icon:<><path d="M3 3v18h18"/><polyline points="7 14 11 9 15 13 20 6"/></> },
  { id:"cripto",    label:"Cripto",    icon:<><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h4a2 2 0 0 1 0 4h-4zm0 4h4.5a2 2 0 0 1 0 4h-4.5zm1.5-7v2m0 9v2"/></> },
  { id:"favoritos", label:"Favoritos", icon:<polygon points="12 2 15 9 22 9.5 17 14.5 18.5 21.5 12 17.8 5.5 21.5 7 14.5 2 9.5 9 9"/> },
  // Grade 2x2 (e nao as linhas horizontais de antes): as linhas ficavam
  // praticamente iguais ao icone de "Lista", dava pra confundir as duas abas.
  { id:"menu",      label:"Menu",      icon:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></> },
];

export function NavInferiorMobile({ ativo, onSelecionar }){
  // Classe no <html> enquanto a barra existe: o CSS usa pra reservar o
  // espaço dela no fim da página.
  useEffect(()=>{
    document.documentElement.classList.add("com-mnav");
    return ()=>document.documentElement.classList.remove("com-mnav");
  },[]);
  // Portal no body: nenhum ancestral com transform/filter consegue
  // "prender" o position:fixed e arrastar a barra junto com a rolagem.
  return createPortal(
    <nav className="mnav">
      {MNAV_ITENS.map(it=>(
        <button
          key={it.id}
          className={`mnav-item ${ativo===it.id ? "active" : ""}`}
          onClick={()=>onSelecionar(it.id)}
        >
          <svg viewBox="0 0 24 24">{it.icon}</svg>
          {it.label}
        </button>
      ))}
    </nav>,
    document.body
  );
}
