import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "../assets/hero-bg.jpg";
import { CSS } from "../styles/appCss.js";

// ── PÁGINA DE ABERTURA ────────────────────────────────────────
// Uma tela só pro celular e pro computador: foto de fundo, texto
// centralizado e o botão azul. O que muda entre os dois são só os
// tamanhos, no CSS (.abm* + o bloco @media (min-width:768px)) — antes o
// computador tinha uma landing própria, com malha animada em canvas e
// outro texto.
function Abertura(){
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const ir = (rota) => { setMenuAberto(false); navigate(rota); };

  return (
    // A foto entra por variável: o véu que vai por cima dela muda com a
    // largura da tela, e isso é decisão de CSS (ver .abm em appCss).
    <div className="abm" style={{"--hero":`url(${heroBg})`}}>
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
        <h1 className="abm-titulo">Vantagem operacional em <span>análise técnica.</span></h1>
        <p className="abm-sub">
          Receba avisos de padrões se formando em tempo real. Explore ativos, faça
          seus próprios estudos e análises do seu jeito — tudo de forma gratuita.
        </p>
        <div className="abm-ctas">
          {/* Explorar segue sem pedir conta: é o que a frase acima promete.
              Quem quiser os planos tem o segundo botão. */}
          <button className="abm-cta" onClick={()=>ir("/mercados")}>
            Explorar TradeZen
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button className="abm-cta-2" onClick={()=>ir("/pagina-de-vendas")}>Ver planos</button>
        </div>
      </main>
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
