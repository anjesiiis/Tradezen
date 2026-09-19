import { useLocation } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile.js";

// Skeletons de carregamento — nunca texto "Carregando". Cada um imita o
// formato da tela que está chegando (header, lista, cards, candles...), pra
// o conteúdo real entrar no mesmo lugar sem a página "pular".
//
// O CSS vem daqui mesmo, e não do appCss: os fallbacks de rota aparecem
// antes do chunk do Dashboard (que é quem injeta o CSS do app) chegar.
// <style href precedence> faz o React 19 injetar uma vez só no <head>, por
// mais skeletons que estejam na tela.
const SK_CSS = `
:root,.sk-area{--sk-base:#161B22;--sk-brilho:rgba(255,255,255,.06);--sk-fundo:#06080F;--sk-superficie:#0D1117;--sk-borda:#21262D}
:root[data-theme="light"],:root[data-theme="light"] .sk-area{--sk-base:#E3E8EF;--sk-brilho:rgba(255,255,255,.75);--sk-fundo:#F3F5F9;--sk-superficie:#FFFFFF;--sk-borda:#DCE2EB}
:root .sk-area.sk-escuro,:root[data-theme] .sk-area.sk-escuro{--sk-base:rgba(255,255,255,.08);--sk-brilho:rgba(255,255,255,.07);--sk-fundo:#0b0e14;--sk-superficie:transparent;--sk-borda:transparent}
.sk{display:block;position:relative;overflow:hidden;flex-shrink:0;background:var(--sk-base)}
.sk::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,var(--sk-brilho),transparent);animation:sk-brilho 1.5s ease-in-out infinite}
.sk-mudo::after{display:none}
.sk-varredura{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.sk-varredura::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-40%;background:linear-gradient(90deg,transparent,var(--sk-brilho),transparent);animation:sk-varrer 1.8s ease-in-out infinite}
@keyframes sk-brilho{to{transform:translateX(100%)}}
@keyframes sk-varrer{to{left:100%}}
@media (prefers-reduced-motion:reduce){.sk::after,.sk-varredura::after{animation:none;display:none}}
`;

function EstiloSkeleton(){
  return <style href="tradezen-skeleton" precedence="medium">{SK_CSS}</style>;
}

// Bloco básico. `mudo` tira o brilho individual — usado nos candles e
// barras de volume, que são muitos: ali uma varredura só cobre a área toda.
function Sk({ w = "100%", h = 12, r = 6, mudo = false, style }){
  return <span className={mudo ? "sk sk-mudo" : "sk"} style={{ width:w, height:h, borderRadius:r, ...style }}/>;
}

// Raiz de todo skeleton exportado: anuncia o carregamento pra leitor de
// tela (aria-busy) sem mostrar texto nenhum na tela.
function Area({ children, className = "", style }){
  return (
    <div className={`sk-area ${className}`} role="status" aria-busy="true" aria-label="Carregando conteúdo" style={style}>
      <EstiloSkeleton/>
      {children}
    </div>
  );
}

const CARD = { background:"var(--sk-superficie)", border:"1px solid var(--sk-borda)", borderRadius:12 };
const LINHA_GRADE = { position:"absolute", left:0, right:0, height:1, background:"var(--sk-borda)", opacity:.6 };

// Onda determinística (sem Math.random): o skeleton sai igual a cada
// render, então não "treme" quando o React re-renderiza o fallback.
const onda = (i) => 50 + Math.sin(i / 4.2) * 16 + Math.sin(i / 1.7) * 6;

// ── Pedaços ───────────────────────────────────────────────────

function HeaderCorpo({ mobile }){
  if (mobile) {
    return (
      <div style={{ height:44, display:"flex", alignItems:"center", gap:10, padding:"0 12px", background:"var(--sk-superficie)", borderBottom:"1px solid var(--sk-borda)", flexShrink:0 }}>
        <Sk w={32} h={32} r={9}/>
        <Sk w={96} h={18}/>
        <span style={{ flex:1 }}/>
        <Sk w={32} h={32} r={9}/>
        <Sk w={32} h={32} r={9}/>
      </div>
    );
  }
  return (
    <div style={{ height:52, display:"flex", alignItems:"center", gap:20, padding:"0 28px", background:"var(--sk-superficie)", borderBottom:"1px solid var(--sk-borda)", flexShrink:0 }}>
      <Sk w={120} h={22}/>
      <Sk w={300} h={34} r={8}/>
      <span style={{ flex:1 }}/>
      <Sk w={36} h={36} r={9}/>
      <Sk w={76} h={34} r={8}/>
    </div>
  );
}

// Mesmas seções da lista mobile (Índices, Ações, Cripto, Moedas...)
const SECOES_MOBILE = [1, 5, 3, 3];
function ListaMobileCorpo(){
  let n = 0;
  return (
    <>
      {SECOES_MOBILE.map((qtd, s) => (
        <div key={s}>
          <Sk w={s % 2 ? 64 : 84} h={10} style={{ margin:"18px 0 8px" }}/>
          <div style={{ ...CARD, borderWidth:.5, overflow:"hidden" }}>
            {Array.from({ length:qtd }, (_, i) => {
              const k = n++;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 12px", minHeight:56, borderTop: i ? ".5px solid var(--sk-borda)" : "none" }}>
                  <Sk w={30} h={30} r={15}/>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6, minWidth:0 }}>
                    <Sk w={`${38 + (k * 17) % 28}%`} h={11}/>
                    <Sk w={`${24 + (k * 11) % 22}%`} h={9}/>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                    <Sk w={58} h={11}/>
                    <Sk w={40} h={9}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function NavInferiorCorpo(){
  return (
    <div style={{ position:"fixed", left:0, right:0, bottom:0, zIndex:9999, height:"calc(56px + env(safe-area-inset-bottom,0px))", paddingBottom:"env(safe-area-inset-bottom,0px)", display:"flex", background:"var(--sk-superficie)", borderTop:".5px solid var(--sk-borda)" }}>
      {Array.from({ length:5 }, (_, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:5 }}>
          <Sk w={20} h={20} r={5}/>
          <Sk w={34} h={8}/>
        </div>
      ))}
    </div>
  );
}

function CardAtivoCorpo({ i }){
  return (
    <div style={{ ...CARD, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Sk w={32} h={32} r={16}/>
        <Sk w={`${45 + (i * 13) % 30}%`} h={12}/>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <Sk w="55%" h={16}/>
        <Sk w="25%" h={12}/>
      </div>
      <Sk h={34} r={4}/>
    </div>
  );
}

// Gráfico de linha: grade, a linha em si e o eixo de datas
function LinhaCorpo(){
  const pontos = Array.from({ length:24 }, (_, i) =>
    `${(i / 23) * 100},${50 - Math.sin(i / 3.1) * 18 - Math.sin(i / 1.3) * 6 - i * .8}`
  ).join(" ");
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column" }}>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        {[25, 50, 75].map((t) => <span key={t} style={{ ...LINHA_GRADE, top:`${t}%` }}/>)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
          <polyline points={pontos} fill="none" stroke="var(--sk-base)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
        </svg>
        <span className="sk-varredura"/>
      </div>
      <div style={{ height:22, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 4px" }}>
        {Array.from({ length:6 }, (_, i) => <Sk key={i} w={32} h={8}/>)}
      </div>
    </div>
  );
}

// Layout do painel no desktop: sidebar + fileira de cards + gráfico do
// Ibovespa com os cards laterais
function CorpoDesktop(){
  return (
    <div style={{ display:"flex", flex:1, minHeight:0 }}>
      <div style={{ width:230, flexShrink:0, padding:"16px 12px", borderRight:"1px solid var(--sk-borda)", background:"var(--sk-superficie)", display:"flex", flexDirection:"column", gap:6 }}>
        <Sk w={24} h={18} style={{ alignSelf:"flex-end", margin:"6px 8px 8px" }}/>
        {Array.from({ length:5 }, (_, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:13, padding:"11px 13px" }}>
            <Sk w={20} h={20} r={5}/>
            <Sk w={`${50 + (i * 19) % 35}%`} h={12}/>
          </div>
        ))}
      </div>
      <div style={{ flex:1, minWidth:0, padding:"24px 40px 48px", display:"flex", flexDirection:"column", gap:24, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
          {Array.from({ length:6 }, (_, i) => <CardAtivoCorpo key={i} i={i}/>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"7fr 3fr", gap:16 }}>
          <div style={{ ...CARD, padding:20, display:"flex", flexDirection:"column", gap:12, height:420 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <Sk w={130} h={14}/>
              <Sk w={110} h={22} r={11}/>
              <span style={{ flex:1 }}/>
              <Sk w={120} h={12}/>
            </div>
            <Sk w={150} h={10}/>
            <Sk w={180} h={28}/>
            <Sk w={70} h={18} r={5}/>
            <div style={{ flex:1, position:"relative" }}><LinhaCorpo/></div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Sk w={90} h={14}/>
            {Array.from({ length:3 }, (_, i) => <CardAtivoCorpo key={i} i={i + 3}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Barra de ferramentas do gráfico: voltar, ticker, preço, timeframe,
// Indicadores/Linhas e os botões de régua/desfazer/refazer
function GraficoToolbar({ mobile }){
  return (
    <div style={{ height: mobile ? 48 : 44, display:"flex", alignItems:"center", gap: mobile ? 6 : 10, padding: mobile ? "0 10px" : "0 20px", borderBottom:"1px solid var(--sk-borda)", background:"var(--sk-superficie)", flexShrink:0, overflow:"hidden" }}>
      <Sk w={28} h={28} r={7}/>
      <Sk w={mobile ? 54 : 72} h={16}/>
      <Sk w={20} h={20} r={10}/>
      <Sk w={mobile ? 52 : 70} h={14}/>
      <Sk w={mobile ? 40 : 52} h={14}/>
      {!mobile && <Sk w={34} h={10}/>}
      <Sk w={44} h={26}/>
      <Sk w={mobile ? 70 : 92} h={26}/>
      {!mobile && (
        <>
          <Sk w={70} h={26}/>
          <Sk w={28} h={28} r={7}/>
          <Sk w={28} h={28} r={7}/>
          <Sk w={28} h={28} r={7}/>
        </>
      )}
    </div>
  );
}

// Área do gráfico de candles: candles, eixo de preço, volume e eixo de datas
function GraficoCorpo({ mobile }){
  const n = mobile ? 22 : 48;
  const eixo = mobile ? 48 : 64;
  const vao = mobile ? 3 : 4;
  return (
    <div style={{ position:"relative", flex:1, minHeight:0, display:"flex", flexDirection:"column", background:"var(--sk-fundo)" }}>
      <div style={{ flex:1, display:"flex", minHeight:0 }}>
        <div style={{ flex:1, position:"relative", display:"flex", gap:vao, padding:"24px 10px 8px" }}>
          {[20, 40, 60, 80].map((t) => <span key={t} style={{ ...LINHA_GRADE, top:`${t}%` }}/>)}
          {Array.from({ length:n }, (_, i) => {
            const centro = onda(i);
            const corpo = 4 + ((i * 7) % 5) * 1.6;
            return (
              <div key={i} style={{ flex:1, position:"relative" }}>
                <Sk mudo w={1} h={`${corpo + 8}%`} r={0} style={{ position:"absolute", left:"50%", top:`${centro - corpo / 2 - 4}%` }}/>
                <Sk mudo w="70%" h={`${corpo}%`} r={1} style={{ position:"absolute", left:"15%", top:`${centro - corpo / 2}%` }}/>
              </div>
            );
          })}
        </div>
        <div style={{ width:eixo, display:"flex", flexDirection:"column", justifyContent:"space-around", alignItems:"center", borderLeft:"1px solid var(--sk-borda)" }}>
          {Array.from({ length:6 }, (_, i) => <Sk key={i} w={mobile ? 30 : 40} h={9}/>)}
        </div>
      </div>
      <div style={{ height: mobile ? "22%" : "18%", display:"flex", alignItems:"flex-end", gap:vao, padding:"0 10px", marginRight:eixo, borderTop:"1px solid var(--sk-borda)" }}>
        {Array.from({ length:n }, (_, i) => <Sk key={i} mudo w="auto" h={`${25 + (i * 37) % 60}%`} r={1} style={{ flex:1 }}/>)}
      </div>
      <div style={{ height:26, display:"flex", justifyContent:"space-around", alignItems:"center", marginRight:eixo, borderTop:"1px solid var(--sk-borda)" }}>
        {Array.from({ length: mobile ? 4 : 7 }, (_, i) => <Sk key={i} w={mobile ? 28 : 40} h={9}/>)}
      </div>
      <span className="sk-varredura"/>
    </div>
  );
}

// Login / cadastro / recuperar senha: logo, card com título, campos e botão
function AuthCorpo({ campos }){
  return (
    <div style={{ minHeight:"100vh", background:"var(--sk-fundo)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, boxSizing:"border-box" }}>
      <Sk w={140} h={26} style={{ marginBottom:28 }}/>
      <div style={{ ...CARD, width:"100%", maxWidth:380, padding:"32px 28px", boxSizing:"border-box", display:"flex", flexDirection:"column" }}>
        <Sk w={110} h={20}/>
        <Sk w="92%" h={11} style={{ marginTop:12 }}/>
        <Sk w="60%" h={11} style={{ marginTop:6, marginBottom:22 }}/>
        {Array.from({ length:campos }, (_, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:14 }}>
            <Sk w={i === 0 && campos === 3 ? 96 : 48} h={10}/>
            <Sk h={42} r={8}/>
          </div>
        ))}
        <Sk h={44} r={8} style={{ marginTop:4 }}/>
      </div>
      <Sk w={180} h={12} style={{ marginTop:20 }}/>
    </div>
  );
}

// Painel admin: barra superior, card de nova marcação e tabela de templates
function AdminCorpo(){
  return (
    <div style={{ minHeight:"100vh", background:"var(--sk-fundo)" }}>
      <div style={{ height:56, display:"flex", alignItems:"center", gap:18, padding:"0 24px", borderBottom:"1px solid var(--sk-borda)", background:"var(--sk-superficie)", overflow:"hidden" }}>
        <Sk w={130} h={20}/>
        {Array.from({ length:5 }, (_, i) => <Sk key={i} w={78} h={12}/>)}
        <span style={{ flex:1 }}/>
        <Sk w={64} h={30} r={8}/>
      </div>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:24, display:"flex", flexDirection:"column", gap:18 }}>
        <div style={{ ...CARD, padding:16, display:"flex", flexDirection:"column", gap:14 }}>
          <Sk w={140} h={16}/>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
            {[260, 120, 120].map((w, i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <Sk w={54} h={10}/>
                <Sk w={w} h={36} r={8}/>
              </div>
            ))}
            <Sk w={132} h={36} r={8}/>
          </div>
        </div>
        <div style={{ ...CARD, padding:16, display:"flex", flexDirection:"column", gap:12 }}>
          <Sk w={170} h={16}/>
          {Array.from({ length:6 }, (_, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"50px 1.2fr 1fr 1fr 2fr 90px", gap:12, padding:"8px 0", borderTop:"1px solid var(--sk-borda)" }}>
              {Array.from({ length:6 }, (_, j) => <Sk key={j} h={11} w={`${60 + ((i + j) * 17) % 40}%`}/>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Landing: fundo escuro fixo (a foto é escura nos dois temas), header,
// tags, título de 3 linhas, subtítulo e o botão
function LandingCorpo({ mobile }){
  const titulo = mobile ? [190, 230, 160] : [560, 640, 420];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"var(--sk-fundo)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding: mobile ? "16px 20px" : "28px 48px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Sk w={28} h={24} r={4}/>
          <Sk w={mobile ? 120 : 150} h={16}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <Sk w={52} h={16}/>
          {mobile && <Sk w={26} h={18} r={3}/>}
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding: mobile ? "clamp(32px,10vh,110px) 24px 24px" : "12vh 24px 24px" }}>
        <Sk w={mobile ? 230 : 300} h={11}/>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap: mobile ? 10 : 14, marginTop:24 }}>
          {titulo.map((w, i) => <Sk key={i} w={`min(${w}px, 90vw)`} h={mobile ? 44 : 72} r={8}/>)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginTop:24 }}>
          <Sk w={`min(${mobile ? 300 : 560}px, 86vw)`} h={14}/>
          <Sk w={`min(${mobile ? 240 : 420}px, 70vw)`} h={14}/>
        </div>
        <Sk w={mobile ? 240 : 260} h={mobile ? 54 : 60} r={32} style={{ marginTop:40 }}/>
      </div>
    </div>
  );
}

// ── Exportados ────────────────────────────────────────────────

// Página inteira: presa na tela toda. Não pode depender do #root — o
// index.css base limita a largura dele e quem desfaz isso é o CSS do app,
// que só chega junto com o Dashboard. Sem isso o skeleton saía estreito no
// desktop e a página "pulava" quando a tela de verdade entrava.
const TELA_TODA = { position:"fixed", inset:0, overflow:"hidden", background:"var(--sk-fundo)" };

const CAMPOS_AUTH = { "/login":2, "/cadastro":3, "/recuperar-senha":1, "/redefinir-senha":2, "/auth/callback":1 };

// Fallback de página inteira (troca de rota): escolhe o formato pela URL.
export function SkeletonPagina(){
  const { pathname } = useLocation();
  const mobile = useIsMobile();

  if (pathname === "/") {
    return <Area className="sk-escuro" style={TELA_TODA}><LandingCorpo mobile={mobile}/></Area>;
  }
  if (pathname in CAMPOS_AUTH) {
    return <Area style={TELA_TODA}><AuthCorpo campos={CAMPOS_AUTH[pathname]}/></Area>;
  }
  if (pathname.startsWith("/admin")) {
    return <Area style={TELA_TODA}><AdminCorpo/></Area>;
  }

  const grafico = pathname.startsWith("/ativo/");
  return (
    <Area style={{ ...TELA_TODA, display:"flex", flexDirection:"column" }}>
      <HeaderCorpo mobile={mobile}/>
      {grafico
        ? <div style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column" }}><GraficoToolbar mobile={mobile}/><GraficoCorpo mobile={mobile}/></div>
        : mobile
          ? <div style={{ flex:1, overflow:"hidden", padding:"0 12px 80px" }}><ListaMobileCorpo/><NavInferiorCorpo/></div>
          : <CorpoDesktop/>
      }
    </Area>
  );
}

// Fallback das seções dentro do Dashboard (o header de verdade já está na
// tela, então aqui vem só o corpo).
export function SkeletonSecao({ tipo, mobile }){
  if (tipo === "grafico") {
    return (
      <Area style={{ display:"flex", flexDirection:"column", height: mobile ? "calc(100dvh - 44px)" : "calc(100vh - 52px)", marginTop: mobile ? 44 : 0 }}>
        <GraficoToolbar mobile={mobile}/>
        <GraficoCorpo mobile={mobile}/>
      </Area>
    );
  }
  if (mobile) return <Area style={{ padding:"56px 12px 80px" }}><ListaMobileCorpo/></Area>;
  return <Area style={{ display:"flex", height:"calc(100vh - 52px)" }}><CorpoDesktop/></Area>;
}

// Candles carregando dentro da tela do gráfico (a barra de ferramentas de
// verdade já está em cima).
export function SkeletonGraficoArea(){
  const mobile = useIsMobile();
  return (
    <Area style={{ position:"absolute", inset:0, zIndex:10, display:"flex", flexDirection:"column", background:"var(--sk-fundo)" }}>
      <GraficoCorpo mobile={mobile}/>
    </Area>
  );
}

// Gráfico de linha carregando (Ibovespa, market cap, comparativo, admin)
export function SkeletonGraficoLinha({ style }){
  return (
    <Area style={{ position:"relative", width:"100%", height:"100%", minHeight:120, ...style }}>
      <LinhaCorpo/>
    </Area>
  );
}

// Preço + variação de um card que ainda não recebeu cotação
export function SkeletonValor(){
  return (
    <span className="sk-area" role="status" aria-busy="true" aria-label="Carregando cotação" style={{ display:"flex", alignItems:"center", gap:8 }}>
      <EstiloSkeleton/>
      <Sk w={76} h={14}/>
      <Sk w={46} h={12}/>
    </span>
  );
}
