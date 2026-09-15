import { useLocation, useNavigate } from "react-router-dom";

// ── SIDEBAR do dashboard ──
export const SB_ITENS = [
  { id:"inicio",     label:"Início",          icon:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></> },
  { id:"mercados",   label:"Mercados",        icon:<><line x1="3" y1="3" x2="3" y2="21"/><line x1="3" y1="21" x2="21" y2="21"/><polyline points="7 14 11 10 14 13 19 7"/></> },
  { id:"cripto",     label:"Criptomoedas",    icon:<><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h4a2 2 0 0 1 0 4h-4zm0 4h4.5a2 2 0 0 1 0 4h-4.5zm1.5-7v2m0 9v2"/></> },
  { id:"ativos",     label:"Principais Índices",icon:<><path d="M3 17l6-6 4 4 8-8"/><polyline points="21 3 21 9 15 3"/></>, route:"/principais-ativos" },
  { id:"favoritos",  label:"Favoritos",       icon:<><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 21.5 12 17.8 5.5 21.5 7 14.5 2 9.5 9 9"/></> },
];

// Itens com `route` são páginas próprias (URL dedicada, ex: Principais
// Ativos em /principais-ativos); os demais só trocam a `secao` local
// dentro de /mercados, sem navegar.
export function Sidebar({ secao, setSecao, collapsed, setCollapsed }){
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
