import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { AssetCard, SkeletonCard } from "../components/AssetCard.jsx";
import { MaisAtivos } from "../components/MaisAtivos.jsx";
import { TopAtivosMobile } from "../components/TopAtivosMobile.jsx";
import Header from "../components/Header.jsx";
import { IconeAtivo } from "../components/IconeAtivo.jsx";
import { MiniLine } from "../components/MiniLine.jsx";
import { NavInferiorMobile } from "../components/NavBarMobile.jsx";
import { Sidebar } from "../components/Sidebar.jsx";
import { SkeletonGraficoLinha, SkeletonSecao, SkeletonValor } from "../components/Skeleton.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useSessaoTelas } from "../hooks/useSessaoTelas.js";
import { API } from "../lib/api.js";
import { CSS } from "../styles/appCss.js";
import ModalAdicionarGrafico from "../components/ModalAdicionarGrafico.jsx";
import { carregarDaConta, faltandoNaConta, gravarLocal, juntar, lerLocal, salvarNaConta } from "../lib/graficosSalvos.js";

// Seções carregadas sob demanda (code splitting): cada uma vira um chunk
// próprio e só é baixada quando o usuário abre a tela. O gráfico de
// candles (lightweight-charts + ferramentas de desenho) é o maior deles.
const PaginaMercadosOverview = lazy(() => import("./MercadosOverview.jsx"));
// Mercados Globais carrega o globo (d3 + mapa do mundo) — por isso entra
// por lazy como as outras seções, e só pra quem abre essa aba.
const PaginaMercadosGlobais = lazy(() => import("./MercadosGlobais.jsx"));
import GloboMercados from "../components/GloboMercados.jsx";
const PaginaCriptomoedas = lazy(() => import("./Criptomoedas.jsx"));
const PaginaListaAtivos = lazy(() => import("./Favoritos.jsx"));
const PaginaPrincipaisAtivosComparativo = lazy(() => import("./PrincipaisAtivos.jsx"));
const ChartPane = lazy(() => import("./Grafico.jsx"));
const Pagina404 = lazy(() => import("./NaoEncontrada.jsx"));
const HomeLineChart = lazy(() => import("../components/HomeLineChart.jsx"));

import { fmtP } from "../lib/mercado.js";

function AppInner(){
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [drawerAberto,setDrawerAberto] = useState(false); // menu hambúrguer (mobile) — sidebar + conta

  const [mercado,setMercado] = useState([]);
  const [marketTab,setMTab]  = useState("1D");
  const [ibovChart,setIbovChart] = useState([]);
  const [erro,setErro]       = useState("");
  // Recolhida por padrão: sobra largura pro bloco IBOV + globo. Abrir
  // encolhe o conteúdo sozinho (a .sb é flex-item com transição).
  const [sbCollapsed,setSbCollapsed] = useState(true);
  // Suporta /mercados?secao=favoritos (usado pelo redirecionamento de
  // /favoritos) — só lido na primeira renderização, de propósito.
  const [secao,setSecao]     = useState(()=> new URLSearchParams(location.search).get("secao") || "inicio");

  // Barra inferior do mobile. "Gráfico" abre o ativo que já está aberto (se
  // houver) ou o primeiro da lista — sem isso a aba não teria pra onde ir.
  // "Menu" reaproveita o drawer que já existe (o mesmo do hambúrguer), em
  // vez de duplicar a navegação em dois lugares.
  const aoTocarNavInferior = (id) => {
    if(id === "menu"){ setDrawerAberto(true); return; }
    if(id === "grafico"){
      // Lê o ticker da própria URL (em vez de usar `tickerUrl`, que só é
      // declarado mais abaixo) — assim o handler não depende da ordem das
      // declarações dentro do componente.
      const naRotaDeAtivo = location.pathname.startsWith("/ativo/");
      const alvo = naRotaDeAtivo
        ? decodeURIComponent(location.pathname.split("/ativo/")[1])
        : mercado[0]?.ticker;
      if(alvo) navigate(`/ativo/${encodeURIComponent(alvo)}`);
      return;
    }
    setSecao(id);
    if(location.pathname !== "/mercados") navigate("/mercados");
  };

  // Qual aba fica acesa: no gráfico é "grafico"; fora dele, segue a seção.
  const abaAtiva = location.pathname.startsWith("/ativo/") ? "grafico" : secao;

  // Tema claro/escuro — persiste em localStorage, aplicado via atributo
  // data-theme na <html> (é o que os seletores :root[data-theme="light"] escutam).
  const [tema,setTema] = useState(()=> localStorage.getItem("tradezen-tema") || "dark");
  useEffect(()=>{
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tradezen-tema", tema);
  },[tema]);
  const alternarTema = () => setTema(t => t==="dark" ? "light" : "dark");

  // Favoritos e desenhos salvos exigem cadastro — ambos são "ganchos" pra
  // criar conta. `avisoCadastro` liga um aviso global (qualquer tela) com
  // botão direto pro /cadastro; ver toggleFavorito e o render mais abaixo.
  const [avisoCadastro, setAvisoCadastro] = useState(false);
  useEffect(()=>{
    if(!avisoCadastro) return;
    const timer = setTimeout(()=>setAvisoCadastro(false), 6000);
    return ()=>clearTimeout(timer);
  },[avisoCadastro]);

  // Favoritos — client-side (localStorage), mas só existe se tiver conta.
  const [favoritos,setFavoritos] = useState(()=>{
    try{ return new Set(JSON.parse(localStorage.getItem("tradezen-favoritos")||"[]")); }
    catch{ return new Set(); }
  });
  const toggleFavorito = (ticker) => {
    if(!user){ setAvisoCadastro(true); return; }
    setFavoritos(prev=>{
      const n = new Set(prev);
      n.has(ticker) ? n.delete(ticker) : n.add(ticker);
      localStorage.setItem("tradezen-favoritos", JSON.stringify([...n]));
      return n;
    });
  };

  // Configuração salva POR ATIVO (indicadores ligados + desenhos) — vale
  // pra qualquer ticker visitado, não só os favoritados, mas só existe pra
  // quem tem conta (ver gate em ChartPane, no effect que salva a cada
  // mudança de tools/desenhos). Chave nova (tradezen-ativo-config) porque
  // o modelo mudou: antes só favoritava salvava, agora qualquer ativo salva.
  const [ativoConfig,setAtivoConfig] = useState(lerLocal);

  // Entrou na conta: busca o que ela tem guardado e junta com o que havia
  // neste navegador. O que estava só aqui SOBE — é o caso de quem
  // desenhou antes de se cadastrar e não pode perder o trabalho ao criar
  // a conta. Ver lib/graficosSalvos.js.
  useEffect(()=>{
    if(!user?.id) return;
    let vivo = true;
    carregarDaConta(user.id).then(daConta=>{
      if(!vivo || !daConta) return;
      setAtivoConfig(local=>{
        const juntos = juntar(daConta, local);
        gravarLocal(juntos);
        for(const ticker of faltandoNaConta(daConta, local)){
          salvarNaConta(user.id, ticker, juntos[ticker]);
        }
        return juntos;
      });
    });
    return ()=>{ vivo = false; };
  },[user?.id]);

  // Gravar a cada mudança encheria o banco de UPDATE: arrastar um ponto
  // de desenho dispara uma mudança por quadro. O navegador recebe na
  // hora (é ele que pinta a tela); a conta recebe quando a mão para.
  const gravacaoPendente = useRef({});
  useEffect(()=>()=>{ for(const t of Object.values(gravacaoPendente.current)) clearTimeout(t); },[]);

  const salvarConfigAtivo = (ticker, config) => {
    setAtivoConfig(prev=>{
      const next = {...prev, [ticker]: config};
      gravarLocal(next);
      return next;
    });
    if(!user?.id) return;
    clearTimeout(gravacaoPendente.current[ticker]);
    gravacaoPendente.current[ticker] = setTimeout(()=>{
      salvarNaConta(user.id, ticker, config);
    }, 1200);
  };

  // Multitelas: até 4 telas no total (1 principal + até 3 extras). A
  // principal continua vindo da URL (permite F5/link direto); as extras são
  // só estado local, não vão pra URL. Índice no array vira a `key` de cada
  // ChartPane extra — ao fechar uma do meio, as de trás "sobem" de índice e
  // o React reconcilia o mesmo componente pra um ticker novo, que é
  // exatamente o que já acontece quando o usuário troca de ativo dentro da
  // mesma tela (o effect de troca de ticker do ChartPane cuida do reset).
  const MAX_TELAS_EXTRAS = 3;
  const [telasExtras,setTelasExtras] = useState([]);
  // O tempo da mesa PRINCIPAL mora aqui porque o ticker dela vem da URL:
  // sem isto, dar F5 numa mesa no semanal devolvia o diário.
  //
  // São DOIS valores de propósito. `tempoPrincipal` acompanha a mesa e é
  // o que vai pro banco. `tempoAberturaPrincipal` só muda na restauração,
  // e é ele que entra na `key` do ChartPane — a mesa lê o tempo de
  // abertura uma vez só, então precisa remontar pra aceitar o que veio do
  // banco. Se a `key` seguisse o tempo atual, cada troca de timeframe
  // remontaria a mesa e apagaria os desenhos da tela.
  const [tempoPrincipal,setTempoPrincipal] = useState(null);
  const [tempoAberturaPrincipal,setTempoAberturaPrincipal] = useState(null);
  const fecharTela = (idx) => {
    setTelasExtras(prev => prev.filter((_,i)=>i!==idx));
  };
  const trocarTela = (idx, novoTicker) => {
    setTelasExtras(prev => prev.map((t,i)=> i===idx ? {...t, ticker:novoTicker} : t));
  };

  // Multitelas no celular — estilo "trocar de mesa" de app de poker: em vez
  // de espremer os gráficos lado a lado (ilegível numa tela de celular),
  // só uma tela fica visível por vez (ver ocultoMobile no ChartPane) e uma
  // aba no topo troca qual delas aparece. `telaAtivaMobile` é o índice na
  // lista combinada [principal, ...telasExtras] (0 = principal).
  const isMobile = useIsMobile();
  const [telaAtivaMobile, setTelaAtivaMobile] = useState(0);

  // ── A bancada sobrevive ao F5 ──────────────────────────────────
  //
  // Só com conta, por pedido do dono. A mesa principal continua vindo da
  // URL (é o que faz um link de ativo funcionar); o que volta daqui são
  // as mesas EXTRAS, o tempo de cada uma e qual estava na frente.
  const { restaurada, guardar } = useSessaoTelas(user?.id);
  const jaRestaurou = useRef(false);
  useEffect(()=>{
    if(!restaurada || jaRestaurou.current) return;
    jaRestaurou.current = true;
    if(restaurada.extras.length) setTelasExtras(restaurada.extras);
    if(restaurada.tempoPrincipal){
      setTempoPrincipal(restaurada.tempoPrincipal);
      setTempoAberturaPrincipal(restaurada.tempoPrincipal);
    }
    setTelaAtivaMobile(restaurada.ativa);
  },[restaurada]);

  // Sair da conta solta a trava: entrar de novo restaura outra vez.
  useEffect(()=>{ if(!user?.id) jaRestaurou.current = false; },[user?.id]);

  // Só grava DEPOIS de ler o que havia guardado — senão a bancada vazia
  // do primeiro quadro apagaria a que estava lá.
  useEffect(()=>{
    if(!user?.id || !restaurada) return;
    guardar({ extras: telasExtras, tempoPrincipal, ativa: telaAtivaMobile });
  },[user?.id, restaurada, telasExtras, tempoPrincipal, telaAtivaMobile, guardar]);
  // Cada mesa extra guarda o ticker e com que tempo ela abre: duas mesas
  // do MESMO ativo só fazem sentido em tempos diferentes.
  const adicionarTelaEIrPara = (ticker, tempo) => {
    if(telasExtras.length >= MAX_TELAS_EXTRAS) return;
    setTelasExtras(prev => [...prev, { ticker, tempo }]);
    setTelaAtivaMobile(telasExtras.length + 1); // combinado: 0=principal, 1..N=extras
  };

  // O "+" pergunta antes: mesmo ativo noutro tempo, ou outro ativo.
  // Guarda o tempo da mesa que pediu, pra sugerir o degrau seguinte.
  const [modalAdicionar,setModalAdicionar] = useState(null);   // { tempo } | null
  const fecharTelaMobile = (idx) => {
    fecharTela(idx);
    setTelaAtivaMobile(atual => {
      const idxCombinado = idx + 1;
      if(atual === idxCombinado) return 0;      // estava vendo a que fechou → volta pra principal
      if(atual > idxCombinado) return atual - 1; // as de trás "sobem" de índice junto
      return atual;
    });
  };
  // Rótulo curto da aba — usa o símbolo já conhecido em `mercado` quando dá
  // (mesmo texto do resto do app); senão tira o sufixo técnico do ticker.
  const labelMesa = (tk) => mercado.find(m=>m.ticker===tk)?.simbolo || tk.replace(/\.SA$|-USD$|=X$/,"");

  // Deriva qual "página" estamos baseado na URL
  const path = location.pathname;
  const isAnalysis = path.startsWith("/ativo/");
  const isLista = path.startsWith("/lista/");
  const listaTipo = isLista ? path.split("/lista/")[1] : null;
  const tickerUrl = isAnalysis ? decodeURIComponent(path.split("/ativo/")[1]) : null;

  // Ao trocar o ativo principal (nova navegação/URL), volta a aba mobile pra
  // principal — foi ela que acabou de mudar, então é a que faz sentido ver.
  // Ajuste durante a renderização (guardado pelo comparativo abaixo), não
  // useEffect, pra não disparar um segundo render em cascata.
  const [ultimoTickerUrlMesa, setUltimoTickerUrlMesa] = useState(tickerUrl);
  if(tickerUrl !== ultimoTickerUrlMesa){
    setUltimoTickerUrlMesa(tickerUrl);
    setTelaAtivaMobile(0);
  }

  // Carrega mercado e mantém atualizado — antes só buscava 1x no mount,
  // então a cotação da home ficava parada até a próxima navegação/refresh.
  // O backend cacheia /mercado por 5min (TTL_CURTO), então repetir a cada
  // 60s aqui é barato (na maioria das vezes cai no cache) e garante que o
  // preço nunca fica mais que ~5min desatualizado na tela.
  useEffect(()=>{
    const buscar = () => {
      // Aba escondida não precisa de preço novo: a cada volta o efeito
      // busca uma vez, então quem reabre a aba vê dado atual mesmo assim.
      if(document.visibilityState === "hidden") return;
      fetch(`${API}/mercado`)
        .then(r=>r.json())
        .then(d=>setMercado(d.dados||[]))
        .catch(()=>setErro("Não foi possível carregar as cotações agora. Tentando de novo em instantes."));
    };
    buscar();
    const id = setInterval(buscar, 60000);
    document.addEventListener("visibilitychange", buscar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", buscar);
    };
  },[]);

  // Busca gráfico do IBOV de acordo com o timeframe (1D/1S/1M)
  useEffect(()=>{
    const periodos = {
      "1D": { periodo: "1mo", intervalo: "1d"  },  // 1 mês de candles diários
      "1S": { periodo: "1y",  intervalo: "1wk" },  // 1 ano de candles semanais
      "1M": { periodo: "5y",  intervalo: "1mo" },  // 5 anos de candles mensais
    };
    const p = periodos[marketTab] || periodos["1D"];
    fetch(`${API}/ativo/^BVSP?periodo=${p.periodo}&intervalo=${p.intervalo}`)
      .then(r=>r.json())
      .then(d=>{
        const candles = d.candles || [];
        // Converte pro formato esperado pelo HomeLineChart
        const serie = candles.map(c => ({
          timestamp: c.timestamp,
          fechamento: c.fechamento,
        }));
        setIbovChart(serie);
      })
      .catch(()=>{});
  },[marketTab]);

  const abrirAtivo=a=>{
    navigate(`/ativo/${encodeURIComponent(a.ticker)}`);
  };

  const ibov        = mercado.find(m=>m.ticker==="^BVSP")||mercado[0];
  const criptos     = mercado.filter(m=>m.mercado==="CRIPTO");
  const acoes       = mercado.filter(m=>m.mercado==="B3"&&m.ticker!=="^BVSP");
  const forex       = mercado.filter(m=>m.mercado==="FOREX");

  // Série pro gráfico da home — usa dados reais se já carregou, senão fallback do resumo
  const ibovSerie = ibovChart.length > 0
    ? ibovChart
    : (ibov?.serie?.length
        ? ibov.serie.map((v,i)=>({ timestamp: (Date.now() - (ibov.serie.length-i)*86400000), fechamento: v }))
        : []);

  return(
    <>
      <style>{CSS}</style>

      {/* NAV (escondida na tela de abertura) */}
      {path!=="/" && (
        <Header
          mercado={mercado} abrirAtivo={abrirAtivo}
          tema={tema} alternarTema={alternarTema}
          secao={secao} setSecao={setSecao}
          drawerAberto={drawerAberto} setDrawerAberto={setDrawerAberto}
          // Na tela do gráfico a busca desce pra toolbar, colada no nome
          // do ativo — é lá que ela faz sentido, porque é busca de ativo.
          // O tema fica no header em todas as telas, ao lado do login.
          semBusca={isAnalysis}
        />
      )}

      <Suspense fallback={<SkeletonSecao tipo={isAnalysis ? "grafico" : "painel"} mobile={isMobile}/>}>
      {/* ── HOME (mercados) com SIDEBAR ── */}
      {path==="/mercados"&&(
        <div className="dash">
          <Sidebar secao={secao} setSecao={setSecao} collapsed={sbCollapsed} setCollapsed={setSbCollapsed}/>
          <div className="dash-main">
          {secao==="mercados" && (
            <PaginaMercadosOverview tema={tema} abrirAtivo={abrirAtivo} setSecao={setSecao}/>
          )}
          {secao==="globais" && (
            <Suspense fallback={<SkeletonSecao tipo="mercados"/>}><PaginaMercadosGlobais/></Suspense>
          )}
          {secao==="cripto" && (
            <PaginaCriptomoedas tema={tema} mercado={mercado} abrirAtivo={abrirAtivo}/>
          )}
          {secao==="favoritos" && (
            <PaginaListaAtivos
              titulo="Favoritos"
              ativos={mercado.filter(m=>favoritos.has(m.ticker))}
              mensagemVazio="Você ainda não favoritou nenhum ativo — clique na estrela ☆ de qualquer card pra adicionar aqui."
              favoritos={favoritos} toggleFavorito={toggleFavorito} abrirAtivo={abrirAtivo}
            />
          )}
          {secao==="inicio" && (
          <div className="home">
          {/* CELULAR — globo compacto e os 20 mais acompanhados. O layout
              de desktop (cards + gráfico do IBOV + globo) fica escondido
              por .dash-so-desktop. */}
          {isMobile && (
            <>
              <GloboMercados compacto/>
              <TopAtivosMobile mercado={mercado} abrirAtivo={abrirAtivo}/>
            </>
          )}
          {erro&&(
            <div style={{padding:"10px 16px",color:"var(--down)",fontSize:11,fontFamily:"var(--font-m)",background:"rgba(255,69,96,.06)",borderRadius:8,border:"1px solid rgba(255,69,96,.2)"}}>
              {erro}
            </div>
          )}

          {/* ÁREA PRINCIPAL — gráfico do IBOV (55%) + globo (45%) */}
          <div className="home-principal dash-so-desktop">
            <div className="card" style={{padding:20,display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",rowGap:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>IBOV</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10,fontWeight:700,letterSpacing:.4,textTransform:"uppercase",color:"#009C3B",background:"rgba(0,156,60,.12)",padding:"4px 10px",borderRadius:999,whiteSpace:"nowrap",flexShrink:0}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#009C3B",flexShrink:0}}/>
                    Bolsa Brasileira
                  </span>
                </div>
                <span className="sl" style={{whiteSpace:"nowrap"}} onClick={()=>ibov&&abrirAtivo(ibov)}>Análise completa →</span>
              </div>
              <div
                style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,cursor:"pointer"}}
                onClick={()=>ibov&&abrirAtivo(ibov)}
                title="Clique para abrir análise completa"
              >
                <div>
                  <div className="mc-label">Ibovespa · B3 · BRL</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                    <span className="mc-price">{fmtP(ibov?.preco)}</span>
                    <span className="mc-cur">BRL</span>
                  </div>
                  <div className={`mc-chg ${ibov?.alta?"bup":"bdn"}`} style={{marginTop:8}}>
                    {ibov?.alta?"▲":"▼"} {Math.abs(ibov?.variacao_pct||0).toFixed(2)}%
                  </div>
                </div>
                <div className="mc-tabs">
                  {["1D"].map(t=>(
                    <button key={t} className={`mc-tab ${marketTab===t?"active":""}`} onClick={e=>{ e.stopPropagation(); setMTab(t); }}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="mc-chart" style={{flex:1,marginTop:12}}>
                {/* Só fora do mobile: no celular esse card inteiro é
                    escondido (.dash-so-desktop) e montar o gráfico ali
                    baixava o lightweight-charts à toa. */}
                {ibovSerie.length>0 && !isMobile
                  ?<Suspense fallback={<SkeletonGraficoLinha/>}>
                    <HomeLineChart data={ibovSerie} color={ibov?.alta?"#00D68F":"#FF4560"} tema={tema}/>
                  </Suspense>
                  :<SkeletonGraficoLinha/>
                }
              </div>
            </div>

            {/* Globo dos mercados globais — ocupa a direita do Estudo de
                Mercado. No celular ele é escondido por CSS, então nem monta:
                montado, buscava cotação e carregava o mapa do mundo pra
                ninguém ver. */}
            {!isMobile && <GloboMercados/>}
          </div>

          <MaisAtivos mercado={mercado} abrirAtivo={abrirAtivo}/>

          {/* Ticker */}
          <div className="tbar">
            <div style={{overflow:"hidden",flex:1}}>
              <div className="tscroll">
                {[...mercado,...mercado].map((m,i)=>(
                  <div key={i} className="ti">
                    <span className="tn">{m.simbolo}</span>
                    <span style={{color:m.alta?"var(--up)":"var(--down)",fontWeight:700}}>{m.alta?"▲":"▼"} {Math.abs(m.variacao_pct||0).toFixed(2)}%</span>
                    <span style={{color:"var(--text2)"}}>{fmtP(m.preco)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
          )}
          </div>
        </div>
      )}

      {/* ── PRINCIPAIS ATIVOS (rota própria — gráfico comparativo) ── */}
      {path==="/principais-ativos"&&(
        <div className="dash">
          <Sidebar secao={secao} setSecao={setSecao} collapsed={sbCollapsed} setCollapsed={setSbCollapsed}/>
          <div className="dash-main">
            <PaginaPrincipaisAtivosComparativo tema={tema} abrirAtivo={abrirAtivo}/>
          </div>
        </div>
      )}

      {/* ── LISTA (Ver todos: Cripto / Ações) ── */}
      {isLista&&(
        <div className="home">
          <div className="sh" style={{marginTop:8}}>
            <span style={{display:"flex",alignItems:"center",gap:12}}>
              <button className="bbtn" onClick={()=>navigate("/mercados")}>←</button>
              <span className="st" style={{fontSize:18}}>
                {listaTipo==="cripto"&&"₿ Todas as Criptomoedas"}
                {listaTipo==="acoes"&&"Todos os Ativos B3 e Forex"}
              </span>
            </span>
            <span style={{fontSize:11,color:"var(--text2)"}}>
              {(()=>{
                if(listaTipo==="cripto") return criptos.length;
                if(listaTipo==="acoes") return acoes.length+forex.length;
                return 0;
              })()} ativos
            </span>
          </div>

          <div className="card" style={{padding:16}}>
            <div className="agrid">
              {(()=>{
                let lista=[];
                if(listaTipo==="cripto") lista=criptos;
                else if(listaTipo==="acoes") lista=[...acoes,...forex];

                if(lista.length===0){
                  return [...Array(8)].map((_,i)=><SkeletonCard key={i}/>);
                }
                return lista.map((a,i)=><AssetCard key={i} a={a} onClick={()=>abrirAtivo(a)} favorito={favoritos.has(a.ticker)} onToggleFavorito={()=>toggleFavorito(a.ticker)}/>);
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── ANÁLISE: 1 tela, 2 lado a lado, ou até 4 em grade 2×2 no desktop
          (multitelas) ── A tela principal usa key="primary" sempre — assim,
          ao abrir/fechar telas extras, o React reconcilia o mesmo
          componente em vez de desmontar e remontar (o que perderia
          indicadores/seleção e dispararia um refetch à toa). Com 3+ telas
          no total, `.analysis-row` ganha a classe "grid4" (ver CSS) e vira
          grade 2×2 em vez de linha única — 4 telas de 480px cada numa
          linha só não caberia em tela nenhuma.

          No celular todas as telas continuam montadas (mesmo motivo acima),
          mas só a ativa fica visível (`ocultoMobile` nas outras) — trocar de
          "mesa" é só mudar `telaAtivaMobile`, igual ao seletor de mesas de
          um app de poker, sem desmontar/refazer fetch de nada. */}
      {isAnalysis && tickerUrl && (
        <div className="analysis-wrap">
          {isMobile && telasExtras.length>0 && (
            <div className="mesa-tabs">
              <button
                className={`mesa-tab ${telaAtivaMobile===0 ? "active" : ""}`}
                onClick={()=>setTelaAtivaMobile(0)}
              >{labelMesa(tickerUrl)}</button>
              {telasExtras.map((mesa,idx)=>(
                <button
                  key={idx}
                  className={`mesa-tab ${telaAtivaMobile===idx+1 ? "active" : ""}`}
                  onClick={()=>setTelaAtivaMobile(idx+1)}
                >
                  {labelMesa(mesa.ticker)}{mesa.tempo ? ` · ${mesa.tempo}` : ""}
                  <span
                    className="mesa-tab-x"
                    onClick={e=>{ e.stopPropagation(); fecharTelaMobile(idx); }}
                  >✕</span>
                </button>
              ))}
              {telasExtras.length<MAX_TELAS_EXTRAS && (
                <button className="mesa-tab mesa-tab-add" onClick={()=>setModalAdicionar({tempo:null})} title="Adicionar mesa">+</button>
              )}
            </div>
          )}
          <div className={`analysis-row ${!isMobile && (1+telasExtras.length)>2 ? "grid4" : ""}`}>
          <ChartPane
            key={`primary-${tempoAberturaPrincipal || "padrao"}`}
            mercado={mercado}
            ticker={tickerUrl}
            tempoInicial={tempoAberturaPrincipal || undefined}
            aoTrocarTempo={setTempoPrincipal}
            onTickerChange={t=>navigate(`/ativo/${encodeURIComponent(t)}`)}
            onAddSplit={telasExtras.length<MAX_TELAS_EXTRAS ? (tempo)=>setModalAdicionar({tempo}) : undefined}
            ocultoMobile={isMobile && telaAtivaMobile!==0}
            tema={tema}
            user={user}
            favoritos={favoritos}
            toggleFavorito={toggleFavorito}
            ativoConfig={ativoConfig}
            salvarConfigAtivo={salvarConfigAtivo}
          />
          {telasExtras.map((mesa,idx)=>(
            <ChartPane
              key={`extra-${idx}`}
              mercado={mercado}
              ticker={mesa.ticker}
              tempoInicial={mesa.tempo}
              aoTrocarTempo={(tempo)=>setTelasExtras(prev=>prev.map((t,i)=> i===idx ? {...t, tempo} : t))}
              onTickerChange={novo=>trocarTela(idx, novo)}
              onClose={()=>fecharTelaMobile(idx)}
              ocultoMobile={isMobile && telaAtivaMobile!==idx+1}
              tema={tema}
              user={user}
              favoritos={favoritos}
              toggleFavorito={toggleFavorito}
              ativoConfig={ativoConfig}
              salvarConfigAtivo={salvarConfigAtivo}
            />
          ))}
          </div>
          {modalAdicionar && (
            <ModalAdicionarGrafico
              ticker={tickerUrl}
              simbolo={labelMesa(tickerUrl)}
              tempoAtual={modalAdicionar.tempo}
              mercado={mercado}
              aoFechar={()=>setModalAdicionar(null)}
              aoEscolher={({ticker, tempo})=>{ setModalAdicionar(null); adicionarTelaEIrPara(ticker, tempo); }}
            />
          )}
        </div>
      )}

      {path!=="/" && path!=="/mercados" && path!=="/principais-ativos" && !isAnalysis && !isLista && (
        <Pagina404/>
      )}

      </Suspense>

      {/* Barra inferior — só mobile, e fora da abertura e do gráfico: a
          página de ativo é tela cheia de propósito (ver .analysis-wrap, que
          reserva exatamente a altura da tela menos o header) e ganhar mais
          56px fixos ali cortaria o gráfico. A volta de lá é pela seta que
          já existe na barra do ativo. */}
      {isMobile && path!=="/" && !isAnalysis && (
        <NavInferiorMobile ativo={abaAtiva} onSelecionar={aoTocarNavInferior}/>
      )}

      {avisoCadastro && (
        <div className="cadastro-toast">
          <span>Crie sua conta grátis pra favoritar ativos e salvar seus desenhos e indicadores</span>
          <button onClick={()=>{ setAvisoCadastro(false); navigate("/cadastro"); }}>Cadastrar</button>
          <button className="cadastro-toast-x" title="Fechar" onClick={()=>setAvisoCadastro(false)}>✕</button>
        </div>
      )}
      </>
    );
}

export default AppInner;
