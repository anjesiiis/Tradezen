import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { CandleChart } from "../components/CandleChart.jsx";
import { API } from "../lib/api.js";
import { FERRAMENTAS_DESENHO_LISTA, INDICADORES, LEGENDA_ITENS, PAINEL_PADROES_ATIVO, TFS, TOOLS } from "../lib/grafico/config.js";
import { fetchPadroesMarcados, normalizarTipo, resolverPadroesPorTimestamp } from "../lib/grafico/padroes.js";
import { fmtP } from "../lib/mercado.js";

// Um gráfico de análise completo e independente: ativo, candles, padrões
// marcados, indicadores ativos e o padrão selecionado são todos estado
// local desta instância — é isso que permite abrir duas telas lado a lado
// (multitelas) sem uma pisar no estado da outra. `onAddSplit` só é passado
// pra tela principal (mostra o "+"); `onClose` só pra tela extra (mostra o "✕").
function ChartPane({ mercado, ticker, onTickerChange, onAddSplit, onClose, ocultoMobile=false, tema="dark", user, favoritos, toggleFavorito, ativoConfig, salvarConfigAtivo }){
  const navigate = useNavigate();
  const [tf, setTf] = useState(TFS[0]);

  const [selAtivo,setSel]     = useState(null);
  const [candles,setCandles]  = useState([]);
  const [padroes,setPadroes]  = useState([]);
  const [niveis,setNiveis]    = useState([]);
  const [loading,setLoading]  = useState(false);
  const [tools,setTools]      = useState(new Set());
  const [selPat,setSelPat]    = useState(null);
  const [lampPos,setLampPos]  = useState(null);   // {x,y} em pixels na tela
  const [tooltipAberto,setTooltipAberto] = useState(false);
  const [indOpen,setIndOpen]  = useState(false);
  const indBtnRef = useRef(null);
  const [indPos,setIndPos]    = useState({top:0,left:0});
  const [painelAberto,setPainelAberto] = useState(true);
  const [switcherAberto,setSwitcherAberto] = useState(false);
  const [maisAberto,setMaisAberto] = useState(false); // legenda: mostra os indicadores "a mais" (além do limite visível)
  const [ferramentaAtiva,setFerramentaAtiva] = useState(null); // ferramenta de desenho armada (trend/horizontal/retangulo_desenho/canal)
  const [desenhos,setDesenhos] = useState([]); // desenhos do usuário nesta tela — só sessão, não salva no backend
  const [desenhoOpen,setDesenhoOpen] = useState(false); // dropdown de ferramentas de desenho — botão próprio, separado do de Indicadores
  // Espelha o prop mais recente pro effect de troca de ticker ler sem
  // precisar entrar nas deps dele (entrar nas deps causaria um refetch
  // toda vez que QUALQUER ativo salvasse configuração, não só o ticker que
  // está sendo trocado).
  const ativoConfigRef = useRef(ativoConfig);
  useEffect(()=>{ ativoConfigRef.current = ativoConfig; },[ativoConfig]);
  const desenhoBtnRef = useRef(null);
  const [desenhoPos,setDesenhoPos] = useState({top:0,left:0});

  // Desfazer/Refazer (Ctrl+Z) — cobre indicadores (tools) e linhas (desenhos)
  // juntos numa única linha do tempo por ativo. `registrarHistorico` é
  // passado pro CandleChart (que registra os handlers de mouse uma vez só,
  // deps:[]) — por isso usa useCallback com deps fixas e lê tools/desenhos
  // via ref, senão o filho ficaria preso numa versão velha da função.
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const toolsHistRef = useRef(tools);
  useEffect(()=>{ toolsHistRef.current = tools; },[tools]);
  const desenhosHistRef = useRef(desenhos);
  useEffect(()=>{ desenhosHistRef.current = desenhos; },[desenhos]);
  const registrarHistorico = useCallback(()=>{
    setUndoStack(prev=>[...prev, { tools:new Set(toolsHistRef.current), desenhos:[...desenhosHistRef.current] }]);
    setRedoStack([]);
  },[]);
  const desfazer = () => {
    if(undoStack.length===0) return;
    const ultimo = undoStack[undoStack.length-1];
    setRedoStack(prev=>[...prev, { tools:new Set(tools), desenhos:[...desenhos] }]);
    setUndoStack(prev=>prev.slice(0,-1));
    setTools(ultimo.tools);
    setDesenhos(ultimo.desenhos);
  };
  const refazer = () => {
    if(redoStack.length===0) return;
    const proximo = redoStack[redoStack.length-1];
    setUndoStack(prev=>[...prev, { tools:new Set(tools), desenhos:[...desenhos] }]);
    setRedoStack(prev=>prev.slice(0,-1));
    setTools(proximo.tools);
    setDesenhos(proximo.desenhos);
  };
  // Atalho de teclado igual Ctrl+Z/Ctrl+Shift+Z (Cmd no Mac) — ignora quando
  // o foco está num campo de texto (ex: input da ferramenta Texto), senão
  // rouba o desfazer nativo de digitação.
  useEffect(()=>{
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if(tag==="INPUT" || tag==="TEXTAREA") return;
      if(!(e.ctrlKey || e.metaKey)) return;
      if(e.key.toLowerCase()!=="z" && e.key.toLowerCase()!=="y") return;
      e.preventDefault();
      if(e.key.toLowerCase()==="y" || (e.key.toLowerCase()==="z" && e.shiftKey)) refazer();
      else desfazer();
    };
    window.addEventListener("keydown", onKeyDown);
    return ()=>window.removeEventListener("keydown", onKeyDown);
  },[undoStack, redoStack, tools, desenhos]);

  // Fecha dropdown de indicadores ao clicar fora
  useEffect(()=>{
    if(!indOpen) return;
    const h = e => { if(!e.target.closest(".ind-wrap")) setIndOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  },[indOpen]);

  // Fecha dropdown de ferramentas de desenho ao clicar fora
  useEffect(()=>{
    if(!desenhoOpen) return;
    const h = e => { if(!e.target.closest(".ind-wrap")) setDesenhoOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  },[desenhoOpen]);

  // Busca candles + padrões marcados sempre que o ticker OU o timeframe
  // DESTA tela mudam — cada ChartPane tem o seu próprio ciclo de fetch,
  // independente das outras. Reseta tools/desenhos/histórico igual troca de
  // ticker: um desenho feito em 1D não faz sentido no índice lógico do 60m
  // (candles completamente diferentes), então não dá pra manter.
  useEffect(()=>{
    if(!ticker) return;
    // Guarda contra corrida: se o ticker mudar de novo antes desse fetch
    // terminar (troca rápida no switcher), a resposta antiga não pode
    // pisar no estado da nova — sem isso, o "info" (nome/símbolo/mercado)
    // de um ticker desatualizado podia chegar depois e ficar colado com o
    // preço do ticker novo.
    let cancelado = false;

    let ativo = mercado.find(m=>m.ticker===ticker);
    if(!ativo){
      ativo = { ticker, simbolo: ticker.split(".")[0].split("-")[0], nome: ticker, mercado: "—", moeda: "—" };
    }
    setSel(ativo);
    setLoading(true);
    setSelPat(null);
    setLampPos(null);
    setTooltipAberto(false);
    setCandles([]);
    setPadroes([]);
    setNiveis([]);
    setFerramentaAtiva(null);
    // Começa limpo — a restauração (se houver conta e dado salvo) roda no
    // effect separado logo abaixo, que também reage a `user`. Isso evita
    // vazar os indicadores do ativo anterior pro novo.
    setTools(new Set());
    setDesenhos([]);
    // Histórico de desfazer/refazer é por ativo — trocar de ticker começa
    // uma linha do tempo nova, sem carregar ações de outro gráfico.
    setUndoStack([]);
    setRedoStack([]);
    // Candles e padrões marcados disparam juntos, mas não esperam um pelo
    // outro pra aparecer — antes um Promise.all travava o gráfico até os
    // dois voltarem, e padrões-marcados (consulta ao Supabase) sozinho já
    // leva mais de 1s. Candles aparece assim que chega; padrões (as
    // lâmpadas) entram por cima logo depois, sem segurar o resto da tela.
    const padroesPromise = fetchPadroesMarcados(ativo.ticker, tf.intervalo);
    fetch(`${API}/ativo/${ativo.ticker}?periodo=${tf.periodo}&intervalo=${tf.intervalo}`)
      .then(r=>r.json())
      .then(d=>{
        if(cancelado) return;
        const candlesRecebidos = d.candles||[];
        setCandles(candlesRecebidos);
        setNiveis(d.niveis||[]);
        if(d.info){
          setSel(prev=>({...prev, ...d.info, ticker}));
        }
        setLoading(false);
        padroesPromise.then(marcados=>{
          if(cancelado) return;
          setPadroes(resolverPadroesPorTimestamp(marcados.padroes, candlesRecebidos));
        });
      })
      .catch(()=>{ if(!cancelado) setLoading(false); });

    return () => { cancelado = true; };
  },[ticker, tf.intervalo]);

  // Restaura indicadores/desenhos salvos — em effect próprio (não junto do
  // fetch acima) porque precisa reagir a `user` também: numa montagem via
  // reload direto na URL do ativo, o ticker já chega certo desde o início
  // e não muda de novo, então um effect só com deps [ticker] nunca rerodaria
  // depois que a sessão do Supabase resolve de forma assíncrona (user
  // passa de null pra logado *depois* do primeiro render). Também reage a
  // `tf`: a configuração salva é por ticker (não por timeframe), então
  // trocar pro 60m e voltar pro 1D restaura os mesmos indicadores/desenhos.
  useEffect(()=>{
    if(!ticker || !user) return;
    const configSalva = ativoConfigRef.current?.[ticker];
    if(configSalva){
      setTools(new Set(configSalva.tools||[]));
      setDesenhos(configSalva.desenhos||[]);
    }
  },[ticker, user, tf.intervalo]);

  const toggleTool=id=>{
    // Só entra no histórico de desfazer/refazer quando é de fato "adicionar
    // um indicador/linha" (indicador técnico ou Fibonacci) — os outros ids
    // que passam por aqui são filtros de visibilidade dos padrões já
    // detectados na legenda, não conteúdo criado pelo usuário.
    if(INDICADORES.some(i=>i.id===id) || id==="fibo") registrarHistorico();
    setTools(prev=>{
      const n=new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      // Se desmarcou o padrão que estava selecionado, limpa seleção
      if(selPat && normalizarTipo(selPat.tipo) === id && !n.has(id)){
        setSelPat(null);
        setTooltipAberto(false);
      }
      return n;
    });
  };

  // Favoritar é só a estrela — o gate de "precisa de conta" já mora dentro
  // do toggleFavorito (App), que mostra o aviso de cadastro sozinho se
  // `user` for null. ChartPane não precisa saber disso.
  const handleFavoritar = () => {
    if(!ticker || !toggleFavorito) return;
    toggleFavorito(ticker);
  };

  // Salva indicadores + desenhos DESSE ativo a cada mudança — vale pra
  // qualquer ticker (favoritado ou não), mas só se tiver conta (ver
  // configSalva lá em cima, no effect de troca de ticker, que só restaura
  // com `user` truthy). Régua fica de fora: é medição rápida, não uma
  // anotação pra guardar — salvar ela só acumularia lixo no retrato salvo.
  useEffect(()=>{
    if(!ticker || !user) return;
    salvarConfigAtivo?.(ticker, { tools:[...tools], desenhos: desenhos.filter(d=>d.tipo!=="regua") });
  },[tools, desenhos, user, ticker]);

  if(!selAtivo) return null;

  return (
    <div className="analysis" style={ocultoMobile ? {display:"none"} : undefined}>
      <div className="atb">
        {!onClose && <button className="bbtn" onClick={()=>navigate("/mercados")} title="Voltar pra home">←</button>}

        <span className="atick" onClick={()=>setSwitcherAberto(v=>!v)} title="Trocar ativo desta tela">
          {selAtivo.simbolo} <span style={{fontSize:11}}>▾</span>
        </span>

        {toggleFavorito && (
          <button
            className={`ac-fav ${favoritos?.has(ticker)?"on":""}`}
            style={{fontSize:18}}
            title={favoritos?.has(ticker)
              ? "Remover dos favoritos (indicadores e desenhos salvos serão apagados)"
              : "Adicionar aos favoritos — salva os indicadores e desenhos deste gráfico"}
            onClick={handleFavoritar}
          >{favoritos?.has(ticker)?"★":"☆"}</button>
        )}

        {selAtivo.preco>0&&<>
          <span className="apr">{fmtP(selAtivo.preco)}</span>
          <span className={`achg ${selAtivo.alta?"bup":"bdn"}`}>{selAtivo.alta?"▲":"▼"}{Math.abs(selAtivo.variacao_pct||0).toFixed(2)}%</span>
        </>}
        <span style={{fontSize:10,color:"var(--text2)",fontFamily:"var(--font-m)"}}>{selAtivo.mercado}</span>

        <div className="sep"/>

        {/* Timeframe — select nativo (1D = histórico completo diário, 1S =
            histórico completo semanal, 60m = intraday, ~2 anos no Yahoo —
            limite da fonte de dado). Trocar reseta indicadores/desenhos/
            histórico igual troca de ativo (ver effect de fetch). */}
        <select
          value={tf.label}
          onChange={e=>{
            const escolhido = TFS.find(t=>t.label===e.target.value);
            if(escolhido) setTf(escolhido);
          }}
          title="Timeframe do gráfico"
          style={{
            background:"var(--s2)",color:"var(--text)",border:"1px solid var(--border)",
            borderRadius:6,padding:"5px 8px",fontSize:11,fontWeight:700,
            fontFamily:"var(--font-m)",cursor:"pointer",outline:"none",
          }}
        >
          {TFS.map(t=>(
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>

        <div className="sep"/>

        {/* Dropdown Indicadores — via portal pra evitar z-index do .analysis */}
        <div className="ind-wrap">
          <button
            ref={indBtnRef}
            className={`ind-btn ${indOpen?"open":""}`}
            onClick={()=>{
              if(!indOpen && indBtnRef.current){
                const r = indBtnRef.current.getBoundingClientRect();
                setIndPos({top: r.bottom+4, left: r.left});
              }
              setIndOpen(v=>!v);
            }}
          >
            Indicadores <span className="arr">▼</span>
            {INDICADORES.filter(i=>tools.has(i.id)).length>0&&(
              <span style={{background:"var(--accent)",color:"#fff",borderRadius:8,padding:"1px 5px",fontSize:9,fontWeight:700}}>
                {INDICADORES.filter(i=>tools.has(i.id)).length}
              </span>
            )}
          </button>
        </div>

        {/* Dropdown Ferramentas de Desenho — botão próprio, separado do de Indicadores */}
        <div className="ind-wrap">
          <button
            ref={desenhoBtnRef}
            className={`ind-btn ${desenhoOpen?"open":""}`}
            onClick={()=>{
              if(!desenhoOpen && desenhoBtnRef.current){
                const r = desenhoBtnRef.current.getBoundingClientRect();
                setDesenhoPos({top: r.bottom+4, left: r.left});
              }
              setDesenhoOpen(v=>!v);
            }}
          >
            Linhas <span className="arr">▼</span>
            {(desenhos.length + (tools.has("fibo")?1:0))>0&&(
              <span style={{background:"var(--accent)",color:"#fff",borderRadius:8,padding:"1px 5px",fontSize:9,fontWeight:700}}>
                {desenhos.length + (tools.has("fibo")?1:0)}
              </span>
            )}
          </button>
        </div>

        {/* Régua — mede a distância entre 2 pontos (preço/%/velas), estilo
            TradingView. Ícone próprio ao lado de Linhas, sem dropdown: um
            clique arma, outro clique no gráfico marca o início, mais um
            marca o fim. */}
        <button
          className="pane-btn"
          style={ferramentaAtiva==="regua" ? {background:"var(--accent)",borderColor:"var(--accent)",color:"#fff"} : undefined}
          title="Régua — medir variação entre 2 pontos"
          onClick={()=>setFerramentaAtiva(prev=>prev==="regua" ? null : "regua")}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/>
            <path d="m14.5 12.5 2-2"/>
            <path d="m11.5 9.5 2-2"/>
            <path d="m8.5 6.5 2-2"/>
            <path d="m17.5 15.5 2-2"/>
          </svg>
        </button>

        {/* Desfazer/Refazer — cobre indicadores e linhas juntos (ver
            registrarHistorico/desfazer/refazer). Também funciona com
            Ctrl+Z / Ctrl+Shift+Z (ver effect de teclado acima). */}
        <button
          className="pane-btn"
          disabled={undoStack.length===0}
          style={undoStack.length===0 ? {opacity:.35,cursor:"not-allowed"} : undefined}
          title="Desfazer (Ctrl+Z)"
          onClick={desfazer}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
        <button
          className="pane-btn"
          disabled={redoStack.length===0}
          style={redoStack.length===0 ? {opacity:.35,cursor:"not-allowed"} : undefined}
          title="Refazer (Ctrl+Shift+Z)"
          onClick={refazer}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {onAddSplit && (
            <button className="pane-btn" onClick={onAddSplit} title="Adicionar mesa">+</button>
          )}
          {onClose && (
            <button className="pane-btn danger" onClick={onClose} title="Fechar esta tela">✕</button>
          )}
          {PAINEL_PADROES_ATIVO && !painelAberto && (
            <button
              onClick={()=>setPainelAberto(true)}
              title="Mostrar painel de indicadores"
              className="pane-btn"
            >«</button>
          )}
        </div>
      </div>

      <div className="abody">
        <div className="achart">
          {loading&&<div className="ld"><div className="spin"/><div className="ldtxt">CARREGANDO...</div></div>}
          {!loading&&candles.length>0&&(
            <CandleChart
              candles={candles}
              padroes={padroes}
              niveis={niveis}
              activeTools={tools}
              selPat={selPat}
              setSelPat={setSelPat}
              onLampPos={pos=>{ setLampPos(pos); if(!pos) setTooltipAberto(false); }}
              showVolume={selAtivo.mercado!=="COMMODITY"}
              tema={tema}
              ferramentaAtiva={ferramentaAtiva}
              setFerramentaAtiva={setFerramentaAtiva}
              toggleTool={toggleTool}
              desenhos={desenhos}
              setDesenhos={setDesenhos}
              registrarHistorico={registrarHistorico}
            />
          )}
          {/* Legenda dos indicadores ativos — estilo TradingView: cada chip
              tem um "×" que desliga na hora, sem precisar abrir o painel.
              Só mostra os primeiros LEGENDA_LIMITE direto; o resto fica
              atrás do "···" (abre com hover ou clique), pra não poluir o
              gráfico quando tem muito indicador ligado ao mesmo tempo. */}
          {!loading&&candles.length>0&&tools.size>0&&(()=>{
            const ativos = LEGENDA_ITENS.filter(it=>tools.has(it.id));
            const LEGENDA_LIMITE = 3;
            const visiveis = ativos.slice(0, LEGENDA_LIMITE);
            const extras = ativos.slice(LEGENDA_LIMITE);

            const chip = (it) => (
              <div key={it.id} style={{
                display:"flex",alignItems:"center",gap:6,
                background:"rgba(6,8,15,.82)",border:"1px solid var(--border)",borderRadius:5,
                padding:"3px 4px 3px 8px",
              }}>
                <span style={{width:7,height:7,borderRadius:"50%",background:it.cor,flexShrink:0}}/>
                <span style={{fontSize:10,fontFamily:"var(--font-m)",color:"var(--text)",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.label}</span>
                <button
                  onClick={()=>toggleTool(it.id)}
                  title={`Remover ${it.label}`}
                  style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:11,lineHeight:1,padding:"1px 3px",flexShrink:0}}
                  onMouseEnter={e=>{e.currentTarget.style.color="var(--down)"}}
                  onMouseLeave={e=>{e.currentTarget.style.color="var(--text2)"}}
                >✕</button>
              </div>
            );

            return (
              <div style={{position:"absolute",top:10,left:14,zIndex:12,maxWidth:210}}>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {visiveis.map(chip)}
                </div>

                {extras.length>0 && (
                  <div
                    style={{position:"relative",marginTop:4}}
                    onMouseEnter={()=>setMaisAberto(true)}
                    onMouseLeave={()=>setMaisAberto(false)}
                  >
                    <div
                      onClick={()=>setMaisAberto(v=>!v)}
                      title={`+${extras.length} indicador${extras.length>1?"es":""}`}
                      style={{
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                        background:"rgba(6,8,15,.82)",border:"1px solid var(--border)",borderRadius:5,
                        padding:"3px 8px",cursor:"pointer",
                        fontSize:10,fontFamily:"var(--font-m)",color:"var(--text2)",
                      }}
                    >
                      +{extras.length} ···
                    </div>
                    {maisAberto && (
                      <div style={{position:"absolute",top:"100%",left:0,marginTop:4,display:"flex",flexDirection:"column",gap:4,zIndex:13}}>
                        {extras.map(chip)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {PAINEL_PADROES_ATIVO && painelAberto&&<div className="rpanel">
          <button className="rp-toggle" onClick={()=>setPainelAberto(false)} title="Recolher painel" style={{position:"absolute",top:8,right:8,zIndex:10}}>»</button>

          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>

            {/* ── INDICADORES GRÁTIS ── */}
            <div className="rpsec">
              <div className="tsec-head">
                <span className="rptitle">Indicadores</span>
                <span className="tsec-tag free">Grátis</span>
              </div>
              {TOOLS.filter(t=>t.plano==="free").map(t=>(
                <div key={t.id}>
                  <div className={`titem ${tools.has(t.id)?"active":""}`} onClick={()=>toggleTool(t.id)}>
                    <div className="tchk">{tools.has(t.id)&&"✓"}</div>
                    <div className="tinf">
                      <div className="tnm">{t.name}</div>
                      <div className="tty">{t.type}</div>
                    </div>
                  </div>
                  {t.nota&&<div style={{fontSize:9,color:"var(--text3)",padding:"1px 10px 5px 36px",fontStyle:"italic"}}>ℹ️ {t.nota}</div>}
                </div>
              ))}
            </div>

            {/* ── INDICADORES PREMIUM ── */}
            <div className="rpsec">
              <div className="tsec-head">
                <span className="rptitle">Indicadores</span>
                <span className="tsec-tag prem">Premium</span>
              </div>
              {TOOLS.filter(t=>t.plano==="premium").map(t=>(
                <div key={t.id} className="titem" style={{opacity:.45,cursor:"default"}}>
                  <div className="tchk"></div>
                  <div className="tinf"><div className="tnm">{t.name}</div><div className="tty">{t.type}</div></div>
                  <span className="tlock"><svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
                </div>
              ))}
              {/* Sem página de planos ainda — fica desabilitado com "Em
                  breve" (mesmo tratamento dos outros CTAs incompletos do
                  app) em vez de levar pra uma rota que não existe. */}
              <button
                disabled
                title="Em breve"
                style={{width:"100%",marginTop:10,padding:"8px",background:"none",border:"1px solid var(--border)",borderRadius:7,color:"var(--text3)",fontSize:11,fontWeight:700,cursor:"default",letterSpacing:".3px",opacity:.6}}
              >Saiba mais →</button>
            </div>

            {/* ── HINT quando nenhum indicador ativo ── */}
            {tools.size===0&&candles.length>0&&(
              <div className="rpsec">
                <div style={{fontSize:11,color:"var(--text3)",textAlign:"center",lineHeight:1.6,padding:"4px 0"}}>
                  Ative um indicador acima<br/>para ver os padrões no gráfico
                </div>
              </div>
            )}

          </div>
        </div>}

      </div>

      {/* ── BOTÃO SAIBA MAIS ── */}
      {selPat && lampPos && (
        <button
          className="saiba-mais-btn"
          style={{left: lampPos.x, top: lampPos.y}}
          onClick={e=>{ e.stopPropagation(); setTooltipAberto(v=>!v); }}
        >
          Saiba mais →
        </button>
      )}

      {/* ── PAINEL DE EXPLICAÇÃO (sidebar direita sobreposta) ── */}
      {selPat && tooltipAberto && (()=>{
        const conf    = selPat.confiabilidade ?? 0;
        const corConf = conf >= 80 ? "var(--up)" : "var(--gold)";

        return (
          <div className="exp-panel">
            <div className="exp-header">
              <div className="exp-nome">{selPat.nome}</div>
              <button className="exp-close" onClick={()=>setTooltipAberto(false)}>✕</button>
            </div>

            <div className="exp-body">
              {selPat.resultado && selPat.resultado !== "pendente" && (
                <div className="exp-badges">
                  <span className="exp-badge" style={{
                    background:selPat.resultado==="sucesso"?"rgba(0,214,143,.1)":"rgba(255,69,96,.1)",
                    color:selPat.resultado==="sucesso"?"var(--up)":"var(--down)"}}>
                    {selPat.resultado==="sucesso"?"Confirmado":"Não confirmado"}
                  </span>
                </div>
              )}

              <div className="exp-texto">{selPat.explicacao||selPat.descricao}</div>

              <div>
                <div className="exp-qual-row">
                  <span>Confiabilidade do padrão</span>
                  <span style={{color:corConf,fontWeight:700}}>{conf}%</span>
                </div>
                <div className="exp-bar">
                  <div className="exp-bar-fill" style={{width:`${conf}%`,background:corConf}}/>
                </div>
              </div>

              <div className="exp-aviso">Conteúdo educativo · não é recomendação</div>
            </div>
          </div>
        );
      })()}

      {/* ── PORTAL DO DROPDOWN DE INDICADORES ── */}
      {indOpen && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={()=>setIndOpen(false)}>
          <div
            className="ind-drop ind-drop-sheet"
            style={{position:"fixed",top:indPos.top,left:indPos.left}}
            onMouseDown={e=>e.stopPropagation()}
          >
            {[...new Set(INDICADORES.map(i=>i.grupo))].map(grupo=>(
              <div key={grupo}>
                <div className="ind-section">{grupo}</div>
                {INDICADORES.filter(i=>i.grupo===grupo).map(ind=>(
                  <div
                    key={ind.id}
                    className="ind-item"
                    onMouseDown={e=>{
                      e.stopPropagation();
                      toggleTool(ind.id);
                    }}
                  >
                    <div className={`ind-chk ${tools.has(ind.id)?"on":""}`}>
                      {tools.has(ind.id)&&"✓"}
                    </div>
                    <span className="ind-label">{ind.label}</span>
                    <span className="ind-color" style={{background:ind.cor}}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── PORTAL DO DROPDOWN DE FERRAMENTAS DE DESENHO ── */}
      {desenhoOpen && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={()=>setDesenhoOpen(false)}>
          <div
            className="ind-drop ind-drop-sheet"
            style={{position:"fixed",top:desenhoPos.top,left:desenhoPos.left}}
            onMouseDown={e=>e.stopPropagation()}
          >
            <div className="ind-section">Linhas</div>
            {FERRAMENTAS_DESENHO_LISTA.map(ind=>{
              const ligado = ind.desenho ? ferramentaAtiva===ind.id : tools.has(ind.id);
              return (
                <div
                  key={ind.id}
                  className="ind-item"
                  onMouseDown={e=>{
                    e.stopPropagation();
                    if(ind.desenho){
                      setFerramentaAtiva(prev=>prev===ind.id?null:ind.id);
                    } else {
                      toggleTool(ind.id);
                    }
                    setDesenhoOpen(false);
                  }}
                >
                  <div className={`ind-chk ${ligado?"on":""}`}>{ligado&&"✓"}</div>
                  <span className="ind-label">{ind.label}</span>
                  <span style={{fontSize:12,color:ind.cor,fontFamily:"var(--font-m)",width:14,textAlign:"center",flexShrink:0}}>{ind.icone}</span>
                </div>
              );
            })}
            {desenhos.length>0 && (
              <button
                onMouseDown={e=>{ e.stopPropagation(); registrarHistorico(); setDesenhos([]); }}
                style={{
                  width:"calc(100% - 12px)",margin:"4px 6px 2px",padding:"7px 8px",
                  background:"none",border:"1px solid var(--border)",borderRadius:6,
                  color:"var(--down)",fontSize:11,fontWeight:600,cursor:"pointer",
                }}
              >Limpar desenhos</button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── POPOVER DE TROCA DE ATIVO DESTA TELA ── */}
      {switcherAberto && createPortal(
        <div
          style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:100}}
          onMouseDown={()=>setSwitcherAberto(false)}
        >
          <div className="ind-drop" style={{position:"relative",top:0,left:0,width:340,padding:0}} onMouseDown={e=>e.stopPropagation()}>
            <AssetSwitcher mercado={mercado} onSelect={a=>{ onTickerChange(a.ticker); setSwitcherAberto(false); }}/>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Dropdown de busca pra trocar de ativo
function AssetSwitcher({mercado, onSelect}){
  const [q,setQ] = useState("");
  const filtered = mercado.filter(a=>{
    if(!q) return true;
    const lower = q.toLowerCase();
    return a.simbolo?.toLowerCase().includes(lower) || a.nome?.toLowerCase().includes(lower) || a.ticker?.toLowerCase().includes(lower);
  });
  return (
    <div>
      <input
        autoFocus
        type="text"
        placeholder="Buscar ativo..."
        value={q}
        onChange={e=>setQ(e.target.value)}
        style={{width:"100%",padding:"10px 12px",background:"var(--s2)",border:"none",borderBottom:"1px solid var(--border)",color:"var(--text)",fontSize:12,fontFamily:"var(--font-b)",outline:"none"}}
      />
      <div style={{maxHeight:340,overflowY:"auto"}}>
        {filtered.length===0&&<div style={{padding:16,fontSize:11,color:"var(--text2)",textAlign:"center"}}>Nenhum ativo</div>}
        {filtered.map(a=>(
          <div key={a.ticker} className="dd-item" onClick={()=>onSelect(a)}>
            <span style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontWeight:600,color:"var(--text)"}}>{a.simbolo}</span>
              <span style={{fontSize:10,color:"var(--text2)"}}>{a.nome} · {a.mercado}</span>
            </span>
            <span className={a.alta?"bup":"bdn"} style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:600}}>
              {a.alta?"▲":"▼"}{Math.abs(a.variacao_pct||0).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChartPane;
