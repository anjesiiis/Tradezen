import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { SearchBar } from "./SearchBar.jsx";
import { SB_ITENS } from "./Sidebar.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

// Header fixo + drawer do mobile (hambúrguer). `drawerAberto` vem de fora
// porque a aba "Menu" da barra inferior também abre esse mesmo drawer.
export default function Header({ mercado, abrirAtivo, tema, alternarTema, secao, setSecao, drawerAberto, setDrawerAberto }){
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [userMenuAberto,setUserMenuAberto] = useState(false); // menu "Sair" no nome do usuário no header
  const [buscaMobileAberta,setBuscaMobileAberta] = useState(false); // ícone de lupa → expande a busca (mobile)

  // Ações de conta (tema/sino/entrar-usuário/pro) — renderizadas duas
  // vezes: uma no header (visível só no desktop) e outra dentro do
  // menu hambúrguer (visível só no mobile). É o mesmo bloco reusado
  // via variável pra não duplicar a lógica do menu "Sair".
  const acoesConta = (
    <>
      <ThemeToggle className="tema-toggle" tema={tema} onToggle={alternarTema}/>
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

      <div className="logo notranslate" onClick={()=>{ navigate("/mercados"); setDrawerAberto(false); setBuscaMobileAberta(false); }}>TRADE<span>ZEN</span></div>

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
      <ThemeToggle className="tema-toggle-mobile" tema={tema} onToggle={alternarTema}/>

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
            <div className="logo notranslate" style={{fontSize:18}}>TRADE<span>ZEN</span></div>
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
}
