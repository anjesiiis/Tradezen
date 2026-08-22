import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// Página de vendas — pública, fora do dashboard (sem sidebar/header do
// AppInner). Cores puxadas da linguagem visual dos gráficos do próprio
// TradeZen (azul das ferramentas de desenho, verde das velas de alta), não
// do --accent do dashboard — a ideia é que pareça uma vitrine do produto,
// não uma tela a mais dentro dele. Emoji trocados por SVG (mesmo padrão do
// resto do app, ver comentário sobre profissionalismo em App.jsx).
const AZUL = "#2962ff";
const VERDE = "#26a69a";
const AMARELO = "#f5a623";

const VENDAS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');

/* Reseta o boilerplate original do Vite (frontend/src/index.css), que
   ainda define #root com text-align:center e max-width:1126px — sem isso
   os parágrafos/headlines dessa página (que quebram em várias linhas,
   diferente do resto do dashboard, mais compacto) ficam centralizados por
   engano. Também zera o #root{display:flex;height:100%} desse boilerplate:
   como essa página é longa (rola bastante, ao contrário do dashboard, que é
   de tela única com scroll interno), manter display:flex+height:100% no
   #root espremia TODAS as seções dentro da altura da viewport em vez de
   deixar a página crescer e rolar — por isso vira display:block+height:auto
   aqui, diferente do reset usado em auth/admin (que nunca tiveram esse
   problema por serem páginas curtas, cabendo numa tela só). */
html,body{margin:0}
#root{display:block!important;height:auto!important;min-height:100vh;width:100%;max-width:none!important;border-inline:none!important;text-align:left}

.v-page{
  --v-bg:#0a0a0f; --v-bg2:#0f1118; --v-card:#131722; --v-border:#1f2430;
  --v-text:#eef0f4; --v-text2:#8b8f99; --v-text3:#5c6270;
  --v-azul:${AZUL}; --v-verde:${VERDE}; --v-amarelo:${AMARELO};
  background:var(--v-bg); color:var(--v-text); font-family:'DM Sans',sans-serif;
  min-height:100vh; width:100%; overflow-x:hidden; scroll-behavior:smooth;
}
.v-page *,.v-page *::before,.v-page *::after{box-sizing:border-box}
.v-page h1,.v-page h2{font-family:'DM Sans',sans-serif;margin:0;text-wrap:balance}

/* ── HEADER ── */
.v-header{position:sticky;top:0;z-index:50;background:rgba(10,10,15,.72);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.06)}
.v-header-inner{max-width:1280px;margin:0 auto;padding:16px 32px;display:flex;align-items:center;gap:28px}
.v-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1.5px;color:#fff;cursor:pointer;user-select:none;flex-shrink:0}
.v-logo span{color:var(--v-azul)}
.v-nav{display:flex;align-items:center;gap:26px;flex:1}
.v-nav a{font-size:14px;font-weight:600;color:var(--v-text2);cursor:pointer;transition:color .15s;white-space:nowrap}
.v-nav a:hover{color:var(--v-text)}
.v-nav-inert{font-size:14px;font-weight:600;color:var(--v-text3);cursor:default;white-space:nowrap}
.v-header-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
.v-search{background:rgba(255,255,255,.05);border:1px solid var(--v-border);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--v-text);width:200px;outline:none;font-family:'DM Sans',sans-serif}
.v-search::placeholder{color:var(--v-text3)}
.v-search:focus{border-color:var(--v-azul)}
.v-btn-entrar{background:none;border:1px solid var(--v-border);color:var(--v-text);font-size:13px;font-weight:700;padding:9px 18px;border-radius:8px;cursor:pointer;transition:border-color .15s,background .15s;font-family:'DM Sans',sans-serif}
.v-btn-entrar:hover{border-color:var(--v-azul);background:rgba(41,98,255,.08)}

/* ── BOTÕES ── */
.v-btn-primario{display:inline-flex;align-items:center;gap:6px;background:var(--v-azul);color:#fff;border:none;border-radius:9px;padding:14px 26px;font-size:15px;font-weight:700;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:'DM Sans',sans-serif;box-shadow:0 8px 24px rgba(41,98,255,.25)}
.v-btn-primario:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(41,98,255,.35)}
.v-btn-verde{background:var(--v-verde);box-shadow:0 8px 24px rgba(38,166,154,.25)}
.v-btn-verde:hover{box-shadow:0 10px 30px rgba(38,166,154,.35)}

/* ── BADGES ── */
.v-badge{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;padding:7px 14px;border-radius:999px;border:1px solid;margin-bottom:20px}
.v-badge-azul{color:var(--v-azul);border-color:rgba(41,98,255,.35);background:rgba(41,98,255,.08)}
.v-badge-verde{color:var(--v-verde);border-color:rgba(38,166,154,.35);background:rgba(38,166,154,.08)}

/* ── SEÇÕES (genérico) ── */
.v-section{padding:110px 32px}
.v-section-inner,.v-hero-inner{max-width:1280px;margin:0 auto;display:grid;gap:64px;align-items:center}
.v-hero-inner{grid-template-columns:7fr 5fr;padding-top:40px}
.v-section-inner{grid-template-columns:1fr 1fr}
.v-section-inner.v-reverso{grid-template-columns:1fr 1fr}
.v-section h2{font-size:38px;font-weight:800;color:#fff;line-height:1.18;margin-bottom:16px}
.v-section-sub,.v-hero-sub{font-size:17px;color:var(--v-text2);line-height:1.6;margin:0 0 30px}

/* ── HERO ── */
.v-hero{padding:70px 32px 100px}
.v-hero-text h1{font-size:50px;font-weight:800;color:#fff;line-height:1.16;margin-bottom:18px}
.v-hero-text h1 .v-acento{color:var(--v-azul)}
.v-hero-sub{font-size:18px;margin-bottom:34px}
.v-stats{display:flex;flex-wrap:wrap;gap:28px;margin-top:36px}
.v-stat{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--v-text2)}
.v-stat svg{color:var(--v-azul);flex-shrink:0}
.v-dot-live{width:8px;height:8px;border-radius:50%;background:#ef5350;position:relative;flex-shrink:0}
.v-dot-live::after{content:"";position:absolute;inset:-5px;border-radius:50%;background:#ef5350;opacity:.45;animation:vPulse 1.7s ease-out infinite}
@keyframes vPulse{0%{transform:scale(.5);opacity:.5}100%{transform:scale(2.4);opacity:0}}

.v-hero-visual{position:relative;display:flex;flex-direction:column;align-items:center}
.v-radar-badge{display:inline-flex;align-items:center;gap:7px;align-self:flex-start;font-size:12px;font-weight:700;color:var(--v-azul);background:rgba(41,98,255,.1);border:1px solid rgba(41,98,255,.3);border-radius:999px;padding:6px 13px;margin-bottom:8px}
.v-radar-badge .v-dot-badge{width:6px;height:6px;border-radius:50%;background:var(--v-azul)}
.v-radar-svg{width:100%;max-width:380px;height:auto}

/* ── TÓPICOS (seções 2/3) ── */
.v-topicos{display:flex;flex-direction:column;gap:22px;margin-bottom:32px}
.v-topico{display:flex;gap:16px;align-items:flex-start}
.v-topico-ic{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.v-ic-azul{background:rgba(41,98,255,.12);color:var(--v-azul)}
.v-ic-verde{background:rgba(38,166,154,.12);color:var(--v-verde)}
.v-topico-titulo{font-size:16px;font-weight:700;color:#fff;margin-bottom:4px}
.v-topico-desc{font-size:14px;color:var(--v-text2);line-height:1.55}

/* ── MOCKUP: card de padrões (seção 2) ── */
.v-mock-card{background:var(--v-card);border:1px solid var(--v-border);border-radius:14px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.v-mock-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--v-border)}
.v-mock-head>span:first-child{font-size:11px;font-weight:800;letter-spacing:.8px;color:var(--v-text2)}
.v-mock-premium{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:var(--v-amarelo);background:rgba(245,166,35,.12);border-radius:6px;padding:4px 8px}
.v-mock-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.v-mock-ativo{font-size:14px;font-weight:700;color:#fff}
.v-mock-padrao{font-size:12px;color:var(--v-text2);margin-top:2px}
.v-mock-tag{font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;white-space:nowrap}
.v-tag-verde{color:var(--v-verde);background:rgba(38,166,154,.14)}
.v-tag-amarelo{color:var(--v-amarelo);background:rgba(245,166,35,.14)}
.v-mock-stats{display:flex;gap:28px;margin-top:18px;padding-top:18px;border-top:1px solid var(--v-border)}
.v-mock-stat-label{font-size:11px;color:var(--v-text3);margin-bottom:4px}
.v-mock-stat-valor{font-size:18px;font-weight:800;color:#fff;font-family:'JetBrains Mono',monospace}
.v-mock-stat-valor.v-verde{color:var(--v-verde)}

/* ── MOCKUP: card de chat (seção 3) ── */
.v-chat-card{background:var(--v-card);border:1px solid var(--v-border);border-radius:14px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:14px}
.v-chat-head{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#fff;padding-bottom:14px;border-bottom:1px solid var(--v-border)}
.v-chat-head svg{color:var(--v-azul)}
.v-chat-msg{border-radius:12px;padding:13px 16px;font-size:13px;line-height:1.6}
.v-chat-user{align-self:flex-end;background:var(--v-azul);color:#fff;font-weight:600;max-width:82%;border-bottom-right-radius:4px}
.v-chat-bot{background:rgba(255,255,255,.045);color:var(--v-text2);border-bottom-left-radius:4px}
.v-chat-bot ul{margin:8px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:5px}
.v-hl{color:var(--v-azul);font-weight:700}
.v-chat-sugestoes{display:flex;flex-wrap:wrap;gap:8px}
.v-chat-sugestoes button{background:rgba(255,255,255,.05);border:1px solid var(--v-border);color:var(--v-text2);font-size:11px;font-weight:600;padding:8px 12px;border-radius:999px;cursor:default;font-family:'DM Sans',sans-serif}

/* ── SCROLL REVEAL ── */
.v-reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
.v-reveal.v-in{opacity:1;transform:translateY(0)}
@media (prefers-reduced-motion: reduce){
  .v-reveal{opacity:1;transform:none;transition:none}
  .v-dot-live::after{animation:none}
}

/* ── RESPONSIVO ── */
@media (max-width:900px){
  .v-hero-inner,.v-section-inner{grid-template-columns:1fr;gap:44px}
  .v-hero-text h1{font-size:36px}
  .v-section h2{font-size:28px}
  .v-nav{display:none}
  .v-search{display:none}
  .v-section{padding:70px 20px}
  .v-hero{padding:44px 20px 60px}
  .v-header-inner{padding:14px 20px}
}
`;

// ── Ícones (mesmo padrão stroke-SVG do resto do app — sem emoji) ──
const svgProps = { viewBox: "0 0 24 24", width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const IconTrend    = () => <svg {...svgProps}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconGema      = () => <svg {...svgProps}><rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)"/></svg>;
const IconBarras    = () => <svg {...svgProps} width={14} height={14}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconOlho      = () => <svg {...svgProps}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconGraduacao = () => <svg {...svgProps}><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>;
const IconRaio      = () => <svg {...svgProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconAlvo      = () => <svg {...svgProps}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconLivro     = () => <svg {...svgProps} width={14} height={14}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IconVelas     = () => <svg {...svgProps}><line x1="6" y1="4" x2="6" y2="20"/><rect x="4" y="9" width="4" height="6"/><line x1="15" y1="2" x2="15" y2="22"/><rect x="13" y="7" width="4" height="10"/></svg>;
const IconLampada   = () => <svg {...svgProps}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2Z"/></svg>;
const IconDatabase  = () => <svg {...svgProps}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const IconLupa      = () => <svg {...svgProps}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconCadeado   = () => <svg {...svgProps} width={11} height={11} strokeWidth={2.5}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
const IconFaisca    = () => <svg {...svgProps}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>;

// Revela com fade-in + leve translação quando entra na viewport (uma vez só).
function Reveal({ children, className = "", delay = 0, style = {} }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisivel(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`v-reveal ${visivel ? "v-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

// Radar de 5 eixos — calculado em runtime (sem coordenada chutada na mão),
// mostrando os diferenciais da plataforma. Pontuações fixas (marketing),
// não vêm de dado real de usuário.
function RadarChart() {
  const eixos = [
    { label: "Detecção", valor: 92 },
    { label: "Precisão", valor: 87 },
    { label: "Velocidade", valor: 95 },
    { label: "Educação", valor: 88 },
    { label: "Acessibilidade", valor: 90 },
  ];
  const cx = 170, cy = 158, rMax = 105, n = eixos.length;
  const ponto = (i, frac) => {
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    return [cx + rMax * frac * Math.cos(ang), cy + rMax * frac * Math.sin(ang)];
  };
  const aneis = [0.25, 0.5, 0.75, 1];
  const pontosValor = eixos.map((e, i) => ponto(i, e.valor / 100));
  const pathValor = pontosValor.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 340 320" className="v-radar-svg">
      {aneis.map(f => {
        const pts = eixos.map((_, i) => ponto(i, f));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
        return <path key={f} d={d} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1" />;
      })}
      {eixos.map((_, i) => {
        const [x, y] = ponto(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.09)" strokeWidth="1" />;
      })}
      <path d={pathValor} fill={AZUL} fillOpacity="0.3" stroke={AZUL} strokeWidth="2" strokeLinejoin="round" />
      {pontosValor.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={AZUL} />)}
      {eixos.map((e, i) => {
        const [x, y] = ponto(i, 1.24);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#c9cdd6" fontSize="12.5" fontWeight="700" fontFamily="'DM Sans',sans-serif">
            {e.label}
          </text>
        );
      })}
    </svg>
  );
}

const TOPICOS_ANALISES = [
  { Ic: IconOlho, cor: "v-ic-azul", titulo: "Visualize padrões em tempo real", desc: "Após detectado, você será sinalizado sobre o padrão e terá uma breve explicação educativa" },
  { Ic: IconGraduacao, cor: "v-ic-verde", titulo: "Aprenda mais rápido que qualquer curso", desc: "Veja os padrões acontecendo em ativos reais, com contexto e dados — não em slides teóricos" },
  { Ic: IconRaio, cor: "v-ic-azul", titulo: "Machine Learning em constante evolução", desc: "Milhares de padrões detectados, testados e validados — e o sistema continua aprendendo" },
  { Ic: IconAlvo, cor: "v-ic-verde", titulo: "Saiba a probabilidade antes de acontecer", desc: "Cada padrão vem com estatísticas reais: quantas vezes se formou naquele ativo, quantas confirmou e quantas falhou. Você vê a taxa de acerto histórica antes de tomar qualquer decisão." },
];

const TOPICOS_PADROES = [
  { Ic: IconVelas, cor: "v-ic-azul", titulo: "Padrões desenhados automaticamente", desc: "OCO, Topo Duplo, Bandeiras, Triângulos e mais — desenhados direto no gráfico com pontos marcados" },
  { Ic: IconLampada, cor: "v-ic-verde", titulo: "Explicação educativa em cada padrão", desc: "Clique na lâmpada e entenda o que aquele padrão significa e como ele se comporta historicamente" },
  { Ic: IconDatabase, cor: "v-ic-azul", titulo: "Dados reais da B3, Binance e mais", desc: "Ações como PETR4, VALE3, ITUB4. Criptos como BTC, ETH. Commodities como Ouro e Prata." },
  { Ic: IconLupa, cor: "v-ic-verde", titulo: "Pesquise por você", desc: "Desenhe no gráfico o que você acha que está vendo e o sistema identifica o padrão pra você" },
];

export default function VendasPage() {
  const navigate = useNavigate();
  const scrollPara = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="v-page">
      <style>{VENDAS_CSS}</style>

      {/* ── HEADER ── */}
      <header className="v-header">
        <div className="v-header-inner">
          <div className="v-logo" onClick={() => navigate("/")}>TRADE<span>ZEN</span></div>
          <nav className="v-nav">
            <a onClick={() => scrollPara("recursos")}>Recursos</a>
            <a onClick={() => scrollPara("padroes")}>Análises</a>
            {/* Tabela de preços ainda não existe — fica inerte (não-clicável)
                em vez de apontar pra uma rota que não existe. */}
            <span className="v-nav-inert" title="Em breve">Preços</span>
          </nav>
          <div className="v-header-right">
            <input className="v-search" placeholder="Buscar ativos..." />
            <button className="v-btn-entrar" onClick={() => navigate("/login")}>Entrar</button>
          </div>
        </div>
      </header>

      {/* ── SEÇÃO 1 — HERO ── */}
      <section className="v-hero">
        <div className="v-hero-inner">
          <div className="v-hero-text">
            <h1>Sua plataforma de análise técnica<br /><span className="v-acento">visíveis em segundos</span></h1>
            <p className="v-hero-sub">Para suas análises serem bem sucedidas</p>
            <button className="v-btn-primario" onClick={() => scrollPara("recursos")}>Saiba mais →</button>
            <div className="v-stats">
              <div className="v-stat"><IconTrend /><span>95+ ativos disponíveis</span></div>
              <div className="v-stat"><span className="v-dot-live" /><span>Mercado em tempo real</span></div>
              <div className="v-stat"><IconGema /><span>Plano grátis</span></div>
            </div>
          </div>
          <Reveal className="v-hero-visual">
            <div className="v-radar-badge"><span className="v-dot-badge" />Plataforma TradeZen</div>
            <RadarChart />
          </Reveal>
        </div>
      </section>

      {/* ── SEÇÃO 2 — ANÁLISES ── */}
      <section className="v-section" id="recursos">
        <div className="v-section-inner">
          <Reveal>
            <div className="v-badge v-badge-verde"><IconBarras /> Análises</div>
            <h2>Acompanhe padrões de análise técnica em tempo real</h2>
            <p className="v-section-sub">Faça parte da nossa comunidade, aprendendo análise técnica sem dor de cabeça.</p>
            <div className="v-topicos">
              {TOPICOS_ANALISES.map((t, i) => (
                <div className="v-topico" key={i}>
                  <div className={`v-topico-ic ${t.cor}`}><t.Ic /></div>
                  <div>
                    <div className="v-topico-titulo">{t.titulo}</div>
                    <div className="v-topico-desc">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="v-btn-primario v-btn-verde" onClick={() => navigate("/cadastro")}>Cadastre-se grátis →</button>
          </Reveal>

          <Reveal delay={150}>
            <div className="v-mock-card">
              <div className="v-mock-head">
                <span>PADRÕES DETECTADOS</span>
                <span className="v-mock-premium"><IconCadeado /> Premium</span>
              </div>
              <div className="v-mock-row">
                <div><div className="v-mock-ativo">PETR4</div><div className="v-mock-padrao">OCO detectado</div></div>
                <span className="v-mock-tag v-tag-verde">Confirmado 79%</span>
              </div>
              <div className="v-mock-row">
                <div><div className="v-mock-ativo">VALE3</div><div className="v-mock-padrao">Topo Duplo</div></div>
                <span className="v-mock-tag v-tag-amarelo">Em formação</span>
              </div>
              <div className="v-mock-stats">
                <div>
                  <div className="v-mock-stat-label">Retorno acumulado</div>
                  <div className="v-mock-stat-valor v-verde">+12,4%</div>
                </div>
                <div>
                  <div className="v-mock-stat-label">Padrões ativos</div>
                  <div className="v-mock-stat-valor">3</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SEÇÃO 3 — ESTUDE PADRÕES REAIS ── */}
      <section className="v-section" id="padroes">
        <div className="v-section-inner">
          <Reveal>
            <div className="v-badge v-badge-azul"><IconLivro /> Estude padrões reais de análise técnica</div>
            <h2>Todos os padrões mais recorrentes visíveis, sem precisar detectar um por um</h2>
            <p className="v-section-sub">Dados de ativos reais. Tenha acesso a ações brasileiras, criptomoedas, commodities e muito mais.</p>
            <div className="v-topicos">
              {TOPICOS_PADROES.map((t, i) => (
                <div className="v-topico" key={i}>
                  <div className={`v-topico-ic ${t.cor}`}><t.Ic /></div>
                  <div>
                    <div className="v-topico-titulo">{t.titulo}</div>
                    <div className="v-topico-desc">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="v-chat-card">
              <div className="v-chat-head"><IconFaisca /> TradeZen</div>
              <div className="v-chat-msg v-chat-user">Quais padrões foram detectados em PETR4?</div>
              <div className="v-chat-msg v-chat-bot">
                Encontramos <b>3 padrões</b> em PETR4 no último mês:
                <ul>
                  <li><span className="v-hl">OCO no diário</span> — confirmado (<span className="v-hl">87% de confiança</span>)</li>
                  <li><span className="v-hl">Suporte em R$38,50</span> — testado 4 vezes</li>
                  <li><span className="v-hl">Triângulo simétrico</span> — em formação</li>
                </ul>
              </div>
              <div className="v-chat-sugestoes">
                <button>Ver padrões de VALE3</button>
                <button>Comparar PETR4 com ITUB4</button>
                <button>Analisar BTC</button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
