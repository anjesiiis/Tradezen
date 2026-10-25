import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineSeries, LineStyle, createChart, createSeriesMarkers } from "lightweight-charts";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { FERRAMENTA_INFO, _anchorFechar, _desenharBandeira, _desenharBotaoFechar, _desenharDesenhoUsuario, _desenharNivel, _desenharOCO, _desenharTopoDuplo, _distPontoSegmento, pontoDaParalela } from "../lib/grafico/desenhos.js";
import { calcularATR, calcularEstocastico, calcularOBV, calcularRSI, calcularVWAP, calcularVolumeMA, toLWCandles } from "../lib/grafico/indicadores.js";
import { estiloNivel, nivelChave, normalizarTipo } from "../lib/grafico/padroes.js";
import { corDoPadrao, descricaoDoPadrao, ehInvertido, iconeDoPadrao } from "../lib/iconesPadroes.js";

// ── Gráfico de Candlestick — Página de Análise ───────────────
export function CandleChart({candles, padroes, niveis=[], activeTools, selPat, setSelPat, showVolume=true, onLampPos, tema="dark", ferramentaAtiva=null, setFerramentaAtiva, desenhos=[], setDesenhos, registrarHistorico, aoChegarNoComeco}){
  const isMobile = useIsMobile();
  // Sobe de 1 a cada vez que o gráfico é CRIADO. Os efeitos que alimentam
  // o gráfico (candles, indicadores, níveis) dependem dele: sem isso, um
  // gráfico recriado nasce vazio, porque `candles` não mudou e o efeito
  // que faz setData não roda de novo. Era exatamente esse o bug da tela
  // preta ao estreitar a janela — ver o comentário na criação.
  const [geracao, setGeracao] = useState(0);
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const candleRef    = useRef(null);
  const volRef       = useRef(null);
  const sma20Ref     = useRef(null);
  const sma100Ref    = useRef(null);
  const sma200Ref    = useRef(null);
  const bbUpperRef   = useRef(null);
  const bbMidRef     = useRef(null);
  const bbLowerRef   = useRef(null);
  const vwapRef      = useRef(null);
  const volMaRef     = useRef(null);
  const oscilRef     = useRef({}); // { [id]: {paneIndex, series:[...]} } — RSI/Estocástico/ATR/OBV
  const markersRef   = useRef(null);
  const canvasRef    = useRef(null);
  // onde cada ícone de padrão já marcado foi desenhado, pra saber
  // quando o mouse está em cima de um deles
  const iconesRef    = useRef([]);
  const [dicaPadrao, setDicaPadrao] = useState(null);   // { x, y, texto }
  const redrawRef    = useRef(null);
  // ref: o listener de rolagem é registrado uma vez só (deps:[tema]) e
  // ficaria preso na primeira versão da função
  const aoChegarNoCoRef = useRef(aoChegarNoComeco);
  // o que havia antes da última troca de candles — serve pra saber se o
  // array CRESCEU PELO COMEÇO (lazy loading) e segurar a tela no lugar
  const anteriorRef = useRef({primeiro:null, total:0});
  const nivelLinesRef = useRef([]);
  const [nivelSel, setNivelSel] = useState(null);

  useEffect(()=>{ aoChegarNoCoRef.current = aoChegarNoComeco; },[aoChegarNoComeco]);

  // Ferramentas de desenho do usuário (trend/horizontal/retângulo/canal) —
  // `desenhos` é dono do pai (ChartPane), porque o botão "Limpar desenhos"
  // e o dropdown que arma a ferramenta também vivem lá. Refs espelham os
  // props mais recentes pros handlers de mouse (registrados uma vez só,
  // deps:[], então fecham sobre valores desatualizados sem os refs).
  const [pontosProgresso, setPontosProgresso] = useState([]);
  const pontosProgressoRef = useRef([]);
  useEffect(()=>{ pontosProgressoRef.current = pontosProgresso; },[pontosProgresso]);
  const desenhosRef = useRef(desenhos);
  useEffect(()=>{ desenhosRef.current = desenhos; },[desenhos]);
  // Os candles pro handler de clique (que é um listener nativo registrado
  // uma vez só, com deps []): sem o ref, `candles` ficaria congelado no
  // array vazio da montagem e o canal nunca acharia o pico da paralela.
  const candlesRef = useRef(candles);
  useEffect(()=>{ candlesRef.current = candles; },[candles]);
  const ferramentaAtivaRef = useRef(ferramentaAtiva);
  useEffect(()=>{ ferramentaAtivaRef.current = ferramentaAtiva; },[ferramentaAtiva]);
  // Régua — medição rápida (estilo TradingView): fica em state próprio, fora
  // de `desenhos`, porque não é uma anotação salva; some sozinha assim que o
  // usuário clica de novo em qualquer lugar do gráfico (o "3º clique").
  const [reguaFinalizada, setReguaFinalizada] = useState(null);
  const reguaFinalizadaRef = useRef(null);
  useEffect(()=>{ reguaFinalizadaRef.current = reguaFinalizada; },[reguaFinalizada]);
  const arrastandoRef = useRef(null); // {desenhoId, pontoIndex} | null
  const cliqueInicioRef = useRef(null); // {x,y} em coords de tela — onde o mousedown começou, pra distinguir clique de arraste
  const previewPontoRef = useRef(null); // {logical,preco} do mouse, só enquanto uma ferramenta de 2+ pontos está no meio da colocação
  // Âncora do desenho feito ARRASTANDO (segurar e puxar, sem soltar) —
  // {logical,preco,x,y} do ponto onde o dedo/botão desceu. É o gesto que
  // funciona no celular, onde acertar dois toques num ponto do gráfico é
  // difícil. Null quando ninguém está arrastando.
  const arrastoNovoRef = useRef(null);
  const [menuCtx, setMenuCtx] = useState(null); // {x,y,desenhoId} em coords de tela
  const [textoEditando, setTextoEditando] = useState(null); // {x,y,logical,preco} — input flutuante da ferramenta Texto, só enquanto o usuário está digitando
  const [valorTextoNovo, setValorTextoNovo] = useState("");
  // `textoEditando=null` de propósito ANTES de ler o valor — assim, se
  // onKeyDown (Enter) e onBlur disparados em sequência (o Enter também
  // pode soltar o foco do input dependendo do browser), a segunda chamada
  // já encontra textoEditando null e não duplica o desenho.
  const confirmarTexto = () => {
    if(!textoEditando) return;
    const valor = valorTextoNovo.trim();
    const pos = textoEditando;
    setTextoEditando(null);
    setValorTextoNovo("");
    if(valor){
      registrarHistorico?.();
      const novoDesenho = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:"texto", pontos:[{logical:pos.logical, preco:pos.preco}], texto:valor };
      setDesenhos?.(atual=>[...atual, novoDesenho]);
    }
  };
  const cancelarTexto = () => { setTextoEditando(null); setValorTextoNovo(""); };

  // Trocou de ferramenta (ou desarmou) → começa a contagem de pontos do zero
  useEffect(()=>{
    setPontosProgresso([]);
    previewPontoRef.current = null;
    arrastoNovoRef.current = null;
    redrawRef.current?.();
  },[ferramentaAtiva]);

  // Cursor crosshair enquanto uma ferramenta está esperando clique; volta
  // ao normal quando nenhuma está armada (o próprio
  // mousemove troca pra "move" ao passar perto de um handle arrastável).
  //
  // No mobile, o mesmo toque que devia marcar um ponto também é lido pelo
  // Lightweight Charts como pan/zoom nativo (handleScroll/handleScale
  // ficavam sempre ligados) — o gráfico se movia em vez de registrar o
  // ponto, e o "slider" azul que aparecia era o próprio eixo de preço
  // sendo arrastado sem querer. Desliga os dois enquanto uma ferramenta
  // está armada (mesma condição do cursor acima) e religa assim que
  // desarma — o desenho fica completo/cancelado.
  useEffect(()=>{
    if(!containerRef.current) return;
    const armado = !!ferramentaAtiva;
    // A classe (e não o style) é o que deixa o CSS trocar pra "grabbing"
    // enquanto o botão está pressionado — regra de :active não vence
    // style inline.
    containerRef.current.classList.toggle("ferramenta-armada", armado);
    // touch-action:none trava o navegador de tentar fazer pan/zoom nativo
    // com o dedo enquanto uma ferramenta está armada — sem isso, mesmo com
    // handleScroll/handleScale desligados no chart, o navegador ainda podia
    // "roubar" o toque antes do nosso pointerdown/pointerup rodar.
    containerRef.current.style.touchAction = armado ? "none" : "auto";
    chartRef.current?.applyOptions({ handleScroll: !armado, handleScale: !armado });
  },[ferramentaAtiva]);

  // Inicializa o gráfico
  useEffect(()=>{
    if(!containerRef.current) return;

    const claro = tema==="light";
    const corFundo   = claro ? "#FFFFFF" : "#06080F";
    const corTexto   = claro ? "#5B6B84" : "#8FA3C7";
    const corGrid    = claro ? "rgba(15,23,32,.06)"  : "rgba(255,255,255,.04)";
    const corBorda   = claro ? "rgba(15,23,32,.10)"  : "rgba(255,255,255,.06)";
    const corCross   = claro ? "rgba(47,111,239,.25)" : "rgba(200,216,247,.15)";

    chartRef.current = createChart(containerRef.current, {
      layout:{
        background:{ type: ColorType.Solid, color: corFundo },
        textColor: corTexto,
        fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace',
        fontSize: 12,
      },
      grid:{
        vertLines:{ color: corGrid },
        horzLines:{ color: corGrid },
      },
      crosshair:{
        mode: CrosshairMode.Normal,
        vertLine:{ color:corCross, width:1, style: LineStyle.Dashed, labelBackgroundColor:"#3D7EFF" },
        horzLine:{ color:corCross, width:1, style: LineStyle.Dashed, labelBackgroundColor:"#3D7EFF" },
      },
      rightPriceScale:{
        borderColor: corBorda,
        textColor: corTexto,
        // No mobile o container é bem mais baixo, então a mesma fatia de
        // 20% pro volume vira poucos pixels reais — as barras somem quase
        // todas, só o pico das maiores aparece. Dando 25% pro volume (em
        // vez de 20%) no mobile, o bottom aqui casa com o top:0.75 do
        // priceScale("volume") logo abaixo, sem sobra nem sobreposição.
        scaleMargins: showVolume ? { top:0.05, bottom: isMobile ? 0.25 : 0.2 } : { top:0.08, bottom:0.08 },
      },
      timeScale:{
        borderColor: corBorda,
        textColor: corTexto,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        // Espaço vazio à direita do último candle: é onde se projeta uma
        // linha de tendência pra frente, e é o que dá a sensação de que
        // o gráfico "continua".
        rightOffset: 12,
        // fixRightEdge travava o gráfico no último candle: arrastar pra
        // esquerda a partir da visão inicial simplesmente não fazia nada,
        // e parecia que o arrastar não funcionava. Solto, o gráfico anda
        // pros dois lados.
        fixRightEdge: false,
        fixLeftEdge: false,
      },
      // Escrito item a item, e não `true`, porque é a lista do que o
      // gesto de arrastar faz: segurar e puxar dentro do gráfico
      // (pressedMouseMove) é o pan; os dois touchDrag são o mesmo gesto
      // com o dedo.
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
    });

    // Candlestick series
    candleRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor:         "#00D68F",
      downColor:       "#FF4560",
      borderUpColor:   "#00D68F",
      borderDownColor: "#FF4560",
      wickUpColor:     "#00D68F",
      wickDownColor:   "#FF4560",
      priceLineVisible: false,
    });

    // Volume — só cria se showVolume (esconde pra commodities/futuros, cujo volume do Yahoo é ruim).
    // No mobile ocupa 25% (top:0.75) em vez de 20% (top:0.8) — ver o
    // comentário no rightPriceScale acima, os dois têm que bater.
    if(showVolume){
      const scaleMarginsVolume = { top: isMobile ? 0.75 : 0.8, bottom:0 };
      volRef.current = chartRef.current.addSeries(HistogramSeries, {
        color: "#26a69a",
        priceFormat:{ type:"volume" },
        priceScaleId: "volume",
        scaleMargins: scaleMarginsVolume,
      });
      chartRef.current.priceScale("volume").applyOptions({
        scaleMargins: scaleMarginsVolume,
      });
    }

    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((faixa)=>{
      redrawRef.current?.();
      // Chegou perto do começo dos dados: quem tem mais histórico pra
      // buscar é o pai (ele é dono do array de candles). 50 candles de
      // antecedência pra o próximo lote chegar antes da borda aparecer.
      if(faixa && faixa.from < 50) aoChegarNoCoRef.current?.();
    });

    const ro = new ResizeObserver(()=>{
      // 0x0 NÃO se aplica ao gráfico. O container zera quando a tela está
      // escondida (mesa de trás no celular, aba em segundo plano, janela
      // minimizada) — e mandar o gráfico pra 0 nesse momento é pedir pra
      // ele voltar quebrado. Ignorar é o certo: quando reaparecer, o
      // próprio observer dispara de novo com o tamanho de verdade.
      if(!chartRef.current || !containerRef.current) return;
      const l = containerRef.current.clientWidth, a = containerRef.current.clientHeight;
      if(l <= 0 || a <= 0) return;
      chartRef.current.applyOptions({ width:l, height:a });
      redrawRef.current?.();
    });
    ro.observe(containerRef.current);

    // ── Volta da invisibilidade ────────────────────────────────
    // O navegador pode jogar fora o conteúdo dos canvas enquanto a página
    // está escondida (é memória de vídeo que ele recupera). Quando se
    // volta, o canvas está em branco e o Lightweight Charts não repinta
    // sozinho: ele só redesenha quando alguém rola, dá zoom ou troca o
    // dado. Resultado: a área do gráfico fica preta até recarregar.
    //
    // Aqui a gente força a repintura (o 3º argumento do resize) e
    // redesenha a nossa camada por cima. A faixa visível é guardada e
    // reposta, pra não jogar o zoom de quem estava olhando um trecho.
    const repintar = () => {
      const chart = chartRef.current, cont = containerRef.current;
      if(!chart || !cont) return;
      const l = cont.clientWidth, a = cont.clientHeight;
      if(l <= 0 || a <= 0) return;   // ainda escondido: não adianta
      let faixa = null;
      try { faixa = chart.timeScale().getVisibleLogicalRange(); } catch { /* gráfico vazio */ }
      try { chart.resize(l, a, true); } catch { return; }
      if(faixa){ try { chart.timeScale().setVisibleLogicalRange(faixa); } catch { /* ignora */ } }
      redrawRef.current?.();
    };
    // rAF: logo ao voltar, o layout ainda pode estar com as medidas
    // antigas; um quadro depois elas já são as de verdade.
    const aoVoltar = () => {
      if(document.visibilityState === "hidden") return;
      requestAnimationFrame(repintar);
    };

    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("pageshow", aoVoltar);   // volta do cache de histórico (Safari)
    // O evento é por canvas, e o Lightweight Charts cria vários (painel,
    // eixos, volume). Delegar no container pega todos, inclusive os que
    // ele criar depois.
    // preventDefault no contextlost é o que PEDE a restauração: sem ele,
    // a perda é definitiva e o canvas nunca mais volta.
    const aoPerderContexto = (e) => { e.preventDefault?.(); };
    containerRef.current.addEventListener("contextrestored", repintar, true);
    containerRef.current.addEventListener("contextlost", aoPerderContexto, true);

    const contEfeito = containerRef.current;
    return()=>{
      ro.disconnect();
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pageshow", aoVoltar);
      contEfeito?.removeEventListener("contextrestored", repintar, true);
      contEfeito?.removeEventListener("contextlost", aoPerderContexto, true);
      markersRef.current = null;
      sma20Ref.current = null;
      sma100Ref.current = null;
      sma200Ref.current = null;
      bbUpperRef.current = bbMidRef.current = bbLowerRef.current = null;
      vwapRef.current = null;
      volMaRef.current = null;
      oscilRef.current = {};
      candleRef.current = null;
      volRef.current = null;
      try { chartRef.current?.remove(); } catch {}
      chartRef.current = null;
    };
    // setState dentro do efeito, de propósito: é o aviso de que existe um
    // gráfico NOVO, e quem alimenta precisa rodar outra vez.
    setGeracao((g) => g + 1);
  // `isMobile` NÃO entra aqui. Ele só muda margem de escala, e recriar o
  // gráfico por causa disso é o que deixava a tela preta: ao cruzar os
  // 768px o gráfico era destruído e recriado, mas os efeitos que fazem
  // setData dependem de `candles` — que não mudou — e nunca rodavam.
  // O gráfico novo ficava sem dado nenhum, só o fundo, até um F5.
  // A margem agora é aplicada em quente, no efeito logo abaixo.
  },[showVolume]);

  // Margem das escalas conforme a largura (no celular o volume ocupa mais
  // espaço embaixo). Aplicada em quente — trocar isso não justifica
  // recriar o gráfico.
  useEffect(()=>{
    if(!candleRef.current) return;
    try {
      candleRef.current.priceScale().applyOptions({
        scaleMargins: showVolume ? { top:0.05, bottom: isMobile ? 0.25 : 0.2 } : { top:0.08, bottom:0.08 },
      });
      volRef.current?.priceScale().applyOptions({ scaleMargins:{ top: isMobile ? 0.75 : 0.8, bottom:0 } });
    } catch { /* gráfico ainda não montado */ }
  },[isMobile, showVolume, geracao]);

  // Troca de tema depois de montado: só reestiliza (applyOptions), nunca
  // recria o chart — recriar perderia todos os dados já plotados, porque
  // os efeitos que fazem setData() não dependem de `tema` e não rodariam
  // de novo sozinhos.
  useEffect(()=>{
    if(!chartRef.current) return;
    const claro = tema==="light";
    const corTexto = claro ? "#5B6B84" : "#8FA3C7";
    const corGrid  = claro ? "rgba(15,23,32,.06)" : "rgba(255,255,255,.04)";
    const corBorda = claro ? "rgba(15,23,32,.10)" : "rgba(255,255,255,.06)";
    const corCross = claro ? "rgba(47,111,239,.25)" : "rgba(200,216,247,.15)";
    chartRef.current.applyOptions({
      layout:{ background:{ type: ColorType.Solid, color: claro ? "#FFFFFF" : "#06080F" }, textColor: corTexto },
      grid:{ vertLines:{ color: corGrid }, horzLines:{ color: corGrid } },
      crosshair:{ vertLine:{ color:corCross }, horzLine:{ color:corCross } },
      rightPriceScale:{ borderColor: corBorda, textColor: corTexto },
      timeScale:{ borderColor: corBorda, textColor: corTexto },
    });
  },[tema]);

  // Atualiza candles
  useEffect(()=>{
    if(!candleRef.current || !candles.length) return;
    // Lazy loading: quando chega histórico mais antigo, o array cresce
    // PELO COMEÇO e todos os índices lógicos andam pra frente. Sem
    // recolocar a faixa visível no lugar, o gráfico daria um salto pro
    // passado bem na hora em que a pessoa está rolando.
    const anterior = anteriorRef.current;
    const cresceuNoComeco = anterior.total > 0
      && candles.length > anterior.total
      && candles[0].timestamp < anterior.primeiro;
    const faixaAntes = cresceuNoComeco ? chartRef.current?.timeScale().getVisibleLogicalRange() : null;

    const lw = toLWCandles(candles);
    candleRef.current.setData(lw);

    if(faixaAntes){
      const deslocou = candles.length - anterior.total;
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: faixaAntes.from + deslocou,
        to:   faixaAntes.to + deslocou,
      });
    }
    anteriorRef.current = {primeiro: candles[0].timestamp, total: candles.length};

    // Volume — filtra timestamps duplicados (acontece em intradiários após arredondar pra segundos)
    const volMap = new Map();
    for(const c of candles){
      const t = Math.floor(c.timestamp/1000);
      volMap.set(t, {
        time:  t,
        value: c.volume || 0,
        color: c.fechamento >= c.abertura ? "rgba(0,214,143,.5)" : "rgba(255,69,96,.5)",
      });
    }
    const volData = [...volMap.values()].sort((a,b)=>a.time-b.time);
    volRef.current?.setData(volData);

    // Reforça tamanho + margens do volume a cada troca de candles (ticker
    // OU timeframe) — o ResizeObserver só dispara quando o container muda
    // de tamanho de verdade; trocar de 60m pra 1D/1S não muda o tamanho da
    // tela, só os dados, então sem isso um gráfico que nasceu com o
    // tamanho errado (ex: container ainda não tinha o min-height mobile
    // aplicado no primeiro paint) ficava preso naquele tamanho pro resto
    // da sessão, em qualquer timeframe.
    if(chartRef.current && containerRef.current){
      chartRef.current.applyOptions({
        width:  containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      if(volRef.current){
        chartRef.current.priceScale("volume").applyOptions({
          scaleMargins: { top: isMobile ? 0.75 : 0.8, bottom:0 },
        });
      }
    }

    // Mostra os últimos 60 candles por padrão, bem próximo — usuário pode
    // arrastar pra ver o histórico completo.
    const totalCandles = candles.length;
    const visibleCount = 60;
    const from = Math.max(0, totalCandles - visibleCount);
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from,
      to: totalCandles + 5,
    });
  },[candles, geracao]);

  // SMAs
  useEffect(()=>{
    if(!chartRef.current || !candles.length) return;

    const calcSMA = (period) => {
      const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);
      const result = [];
      for(let i = period-1; i < sorted.length; i++){
        const avg = sorted.slice(i-period+1, i+1).reduce((s,c)=>s+c.fechamento,0)/period;
        result.push({ time: Math.floor(sorted[i].timestamp/1000), value: avg });
      }
      return result;
    };

    // Helper: remove série com segurança (v5 é estrita; tenta e ignora se já foi)
    const safeRemove = (ref) => {
      if(ref.current && chartRef.current){
        try { chartRef.current.removeSeries(ref.current); } catch {}
        ref.current = null;
      }
    };

    // Helper: cria ou atualiza uma SMA
    const upsertSMA = (ref, period, color, condition) => {
      if(condition){
        if(!ref.current){
          ref.current = chartRef.current.addSeries(LineSeries, { color, lineWidth:1.5, priceLineVisible:false, lastValueVisible:false });
        }
        ref.current.setData(calcSMA(period));
      } else {
        safeRemove(ref);
      }
    };

    upsertSMA(sma20Ref,  20,  "#F5A623", activeTools.has("sma20")  && candles.length >= 20);
    upsertSMA(sma100Ref, 100, "#9B6DFF", activeTools.has("sma100") && candles.length >= 100);
    upsertSMA(sma200Ref, 200, "#3D7EFF", activeTools.has("sma200") && candles.length >= 200);

    // Bandas de Bollinger (período 20, 2 desvios)
    const hasBB = activeTools.has("bb") && candles.length >= 20;
    if(hasBB){
      const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);
      const upper=[], mid=[], lower=[];
      for(let i=19; i<sorted.length; i++){
        const slice = sorted.slice(i-19, i+1).map(c=>c.fechamento);
        const mean  = slice.reduce((s,v)=>s+v,0)/20;
        const std   = Math.sqrt(slice.reduce((s,v)=>s+(v-mean)**2,0)/20);
        const t     = Math.floor(sorted[i].timestamp/1000);
        upper.push({time:t, value:mean+2*std});
        mid.push(  {time:t, value:mean});
        lower.push({time:t, value:mean-2*std});
      }
      const bbOpts = {lineWidth:1, priceLineVisible:false, lastValueVisible:false, crosshairMarkerVisible:false};
      if(!bbUpperRef.current) bbUpperRef.current = chartRef.current.addSeries(LineSeries,{...bbOpts,color:"rgba(0,214,143,.6)"});
      if(!bbMidRef.current)   bbMidRef.current   = chartRef.current.addSeries(LineSeries,{...bbOpts,color:"rgba(0,214,143,.35)",lineStyle:1});
      if(!bbLowerRef.current) bbLowerRef.current = chartRef.current.addSeries(LineSeries,{...bbOpts,color:"rgba(0,214,143,.6)"});
      bbUpperRef.current.setData(upper);
      bbMidRef.current.setData(mid);
      bbLowerRef.current.setData(lower);
    } else {
      [bbUpperRef,bbMidRef,bbLowerRef].forEach(ref=>{
        if(ref.current && chartRef.current){ try{chartRef.current.removeSeries(ref.current);}catch{} ref.current=null; }
      });
    }

    const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);

    // VWAP — overlay no preço, mesma escala do candle.
    if(activeTools.has("vwap")){
      if(!vwapRef.current){
        vwapRef.current = chartRef.current.addSeries(LineSeries, { color:"#F5A623", lineWidth:1.5, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
      }
      vwapRef.current.setData(calcularVWAP(sorted));
    } else {
      safeRemove(vwapRef);
    }

    // Volume médio — overlay na mesma escala do histograma de volume (só existe se showVolume).
    if(activeTools.has("volume_ma") && volRef.current && candles.length >= 20){
      if(!volMaRef.current){
        volMaRef.current = chartRef.current.addSeries(LineSeries, { color:"#00D68F", lineWidth:1.5, priceScaleId:"volume", priceLineVisible:false, lastValueVisible:false, crosshairMarkerVisible:false });
      }
      volMaRef.current.setData(calcularVolumeMA(sorted, 20));
    } else {
      safeRemove(volMaRef);
    }
  },[candles, activeTools, geracao]);

  // Osciladores (RSI, Estocástico, ATR, OBV) — cada um no seu próprio pane,
  // abaixo do preço/volume. Mais simples reconstruir tudo a cada mudança do
  // que tentar reconciliar índice de pane por pane; toggle de indicador não
  // é um caminho quente, então o custo é irrelevante.
  useEffect(()=>{
    if(!chartRef.current || !candles.length) return;
    const chart = chartRef.current;
    const sorted = [...candles].sort((a,b)=>a.timestamp-b.timestamp);

    // Remove tudo que existia antes...
    Object.values(oscilRef.current).forEach(o=>{
      o.series.forEach(s=>{ try{ chart.removeSeries(s); }catch{} });
    });
    // ...e os panes vazios que sobraram (de trás pra frente, senão os
    // índices dos que ainda faltam remover mudam no meio do caminho).
    const totalPanesAntes = chart.panes().length;
    for(let i=totalPanesAntes-1; i>=1; i--){
      try{ chart.removePane(i); }catch{}
    }
    oscilRef.current = {};

    const definicoes = [
      {
        id:"rsi", ativo: activeTools.has("rsi") && candles.length>=15,
        montar: (paneIndex)=>{
          const s = chart.addSeries(LineSeries, {color:"#3D7EFF", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"RSI"}, paneIndex);
          s.setData(calcularRSI(sorted, 14));
          s.createPriceLine({ price:70, color:"rgba(255,69,96,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          s.createPriceLine({ price:30, color:"rgba(0,214,143,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          return [s];
        },
      },
      {
        id:"estocastico", ativo: activeTools.has("estocastico") && candles.length>=17,
        montar: (paneIndex)=>{
          const { k, d } = calcularEstocastico(sorted, 14, 3, 3);
          const sK = chart.addSeries(LineSeries, {color:"#9B6DFF", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"%K"}, paneIndex);
          const sD = chart.addSeries(LineSeries, {color:"#F5A623", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"%D"}, paneIndex);
          sK.setData(k);
          sD.setData(d);
          sK.createPriceLine({ price:80, color:"rgba(255,69,96,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          sK.createPriceLine({ price:20, color:"rgba(0,214,143,.4)", lineWidth:1, lineStyle:LineStyle.Dashed, axisLabelVisible:false });
          return [sK, sD];
        },
      },
      {
        id:"atr", ativo: activeTools.has("atr") && candles.length>=15,
        montar: (paneIndex)=>{
          const s = chart.addSeries(LineSeries, {color:"#F5A623", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"ATR"}, paneIndex);
          s.setData(calcularATR(sorted, 14));
          return [s];
        },
      },
      {
        id:"obv", ativo: activeTools.has("obv") && candles.length>=2,
        montar: (paneIndex)=>{
          const s = chart.addSeries(LineSeries, {color:"#9B6DFF", lineWidth:1.5, priceLineVisible:false, lastValueVisible:false, title:"OBV"}, paneIndex);
          s.setData(calcularOBV(sorted));
          return [s];
        },
      },
    ];

    let proximoPane = 1;
    definicoes.forEach(def=>{
      if(!def.ativo) return;
      const series = def.montar(proximoPane);
      try{ chart.panes()[proximoPane]?.setHeight(110); }catch{}
      oscilRef.current[def.id] = { paneIndex: proximoPane, series };
      proximoPane++;
    });
  },[candles, activeTools, geracao]);

  // Limpa markers do Lightweight Charts (emoji é desenhado no canvas)
  useEffect(()=>{
    if(!candleRef.current) return;
    try {
      if(!markersRef.current){
        markersRef.current = createSeriesMarkers(candleRef.current, []);
      } else {
        markersRef.current.setMarkers([]);
      }
    } catch {}
  },[candles, geracao]);

  // Clique → seleciona padrão mais próximo
  const selPatRef = useRef(selPat);
  useEffect(()=>{ selPatRef.current = selPat; },[selPat]);

  useEffect(()=>{
    if(!chartRef.current) return;
    const handler = (param) => {
      if(!param.time || !padroes.length) return;
      let melhor = null, menorDiff = Infinity;
      for(const p of padroes){
        if(!activeTools.has(normalizarTipo(p.tipo))) continue;
        const idxLamp = p.lampada?.i ?? p.pontos?.cabeca?.i;
        const c = candles[idxLamp];
        if(!c) continue;
        const tLamp = Math.floor(c.timestamp/1000);
        const diff = Math.abs(tLamp - param.time);
        const intervaloSeg = candles.length > 1
          ? Math.abs(Math.floor(candles[1].timestamp/1000) - Math.floor(candles[0].timestamp/1000))
          : 3600;
        if(diff < intervaloSeg * 8 && diff < menorDiff){
          menorDiff = diff;
          melhor = p;
        }
      }
      if(melhor){
        const cur = selPatRef.current;
        const isSame = cur?.tipo === melhor.tipo &&
          cur?.intervalo_candles?.inicio === melhor.intervalo_candles?.inicio;
        setSelPat(isSame ? null : melhor);
      }
    };
    chartRef.current.subscribeClick(handler);
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch{} };
  },[padroes, candles, activeTools, setSelPat]);

  // Hover/arrastar/clique-direito/colocar-ponto — tudo em eventos de
  // mouse nativos no container (não dá pra usar subscribeClick do LWC aqui,
  // ele só cobre clique simples, não arraste). Registrado uma vez só
  // (deps:[]); usa refs pra sempre ler o estado mais novo sem re-registrar
  // a cada render.
  useEffect(()=>{
    const container = containerRef.current;
    if(!container) return;
    const RAIO_HANDLE = 8;

    const pontosPixel = (d) => {
      const chart = chartRef.current, series = candleRef.current;
      if(!chart || !series) return [];
      if(d.tipo==="horizontal"){
        const y = series.priceToCoordinate(d.pontos[0].preco);
        return y==null ? [] : [{x:null, y, idx:0}];
      }
      return d.pontos
        .map((p,idx)=>{
          const x = chart.timeScale().logicalToCoordinate(p.logical);
          const y = series.priceToCoordinate(p.preco);
          return (x==null||y==null) ? null : {x,y,idx};
        })
        .filter(Boolean);
    };

    const acharHandleProximo = (mx,my) => {
      for(const d of desenhosRef.current){
        for(const pp of pontosPixel(d)){
          if(pp.x==null){ // horizontal — a linha inteira é arrastável, não só um ponto
            if(Math.abs(my-pp.y) <= RAIO_HANDLE) return {desenhoId:d.id, pontoIndex:0};
          } else if(Math.hypot(mx-pp.x, my-pp.y) <= RAIO_HANDLE){
            return {desenhoId:d.id, pontoIndex:pp.idx};
          }
        }
      }
      return null;
    };

    // Testa o "x" de fechar rápido desenhado em cima de cada linha (ver
    // _anchorFechar/_desenharBotaoFechar) — usa chart/series direto (não
    // toLogX/toY do effect de render, que é outro effect) pra chegar no
    // mesmo ponto que foi desenhado na tela.
    const acharBotaoFecharProximo = (mx,my) => {
      const chart = chartRef.current, series = candleRef.current;
      if(!chart || !series) return null;
      const canvasWidth = containerRef.current?.clientWidth || 0;
      const toX = logical => chart.timeScale().logicalToCoordinate(logical);
      const toY = preco => series.priceToCoordinate(preco);
      for(const d of desenhosRef.current){
        const anc = _anchorFechar(d, toX, toY, canvasWidth);
        if(anc && Math.hypot(mx-anc.x, my-anc.y) <= 10) return d.id;
      }
      return null;
    };

    const acharDesenhoProximo = (mx,my) => {
      // pro clique direito — mais tolerante, testa a linha/forma inteira
      for(const d of desenhosRef.current){
        if(d.tipo==="horizontal"){
          const series = candleRef.current;
          const y = series?.priceToCoordinate(d.pontos[0].preco);
          if(y!=null && Math.abs(my-y)<=6) return d.id;
          continue;
        }
        if(d.tipo==="texto"){
          // Só 1 ponto — testa distância direto até a âncora (raio maior,
          // já que o texto renderizado ocupa uma área bem maior que o ponto).
          const pts1 = pontosPixel(d);
          if(pts1.length===1 && Math.hypot(mx-pts1[0].x, my-pts1[0].y)<=24) return d.id;
          continue;
        }
        const pts = pontosPixel(d);
        if(pts.length<2) continue;
        let achou = false;
        for(let i=0;i<pts.length-1 && !achou;i++){
          if(_distPontoSegmento(mx,my,pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y) <= 6) achou = true;
        }
        if(!achou && (d.tipo==="retangulo_desenho" || d.tipo==="regua") && pts.length===2){
          const [p1,p2] = pts;
          if(_distPontoSegmento(mx,my,p1.x,p1.y,p2.x,p1.y)<=6) achou = true;
          if(_distPontoSegmento(mx,my,p2.x,p2.y,p1.x,p2.y)<=6) achou = true;
        }
        if(achou) return d.id;
      }
      return null;
    };

    // Pontos definitivos do desenho. Hoje só o canal acrescenta algo: a
    // paralela, calculada do maior desvio entre os dois pontos. Este é o
    // único lugar com os candles na mão, e vale tanto pro desenho feito
    // em dois cliques quanto pro feito arrastando.
    const pontosDoDesenho = (ferramenta, pontos) => {
      if(ferramenta !== "canal" || pontos.length < 2) return pontos;
      const paralela = pontoDaParalela(pontos[0], pontos[1], candlesRef.current);
      return paralela ? [...pontos, paralela] : pontos;   // sem candle entre eles: só a base
    };

    const onMouseMove = (e) => {
      // Passou perto de um ícone de padrão já marcado? Mostra o que é e
      // de quando é.
      {
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const emCima = iconesRef.current.find((ic) => Math.hypot(ic.x - mx, ic.y - my) <= 13);
        setDicaPadrao(emCima ? { x: emCima.x, y: emCima.y, texto: emCima.texto } : null);
      }

      if(ferramentaAtivaRef.current){
        // Ferramenta armada e já tem pelo menos 1 ponto colocado — mostra o
        // desenho "se formando" seguindo o mouse até o clique que confirma
        // o próximo ponto (ex: retângulo entre o 1º canto e o cursor).
        // Arrastando conta como "um ponto colocado": a âncora.
        if(pontosProgressoRef.current.length > 0 || arrastoNovoRef.current){
          const chart = chartRef.current, series = candleRef.current;
          if(chart && series){
            const rect = container.getBoundingClientRect();
            const mx = e.clientX-rect.left, my = e.clientY-rect.top;
            const logical = chart.timeScale().coordinateToLogical(mx);
            const preco = series.coordinateToPrice(my);
            if(logical!=null && preco!=null){
              previewPontoRef.current = {logical, preco};
              redrawRef.current?.();
            }
          }
        }
        return; // colocando um desenho novo — sem hover/arraste nos já existentes
      }
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;

      if(arrastandoRef.current){
        const { desenhoId, pontoIndex } = arrastandoRef.current;
        const series = candleRef.current, chart = chartRef.current;
        if(!series || !chart) return;
        const preco = series.coordinateToPrice(my);
        if(preco==null) return;
        const logicalArraste = d_tipo => d_tipo==="horizontal" ? null : chart.timeScale().coordinateToLogical(mx);
        // setDesenhos é do pai (ChartPane) — adiado por microtask pelo mesmo
        // motivo do handler de clique acima (evita "update durante o render
        // de outro componente", já que subscribeCrosshairMove do LWC também
        // reage a esse mesmo mousemove nativo).
        queueMicrotask(()=>{
          setDesenhos?.(prev=>prev.map(d=>{
            if(d.id!==desenhoId) return d;
            if(d.tipo==="horizontal") return {...d, pontos:[{preco}]};
            const logical = logicalArraste(d.tipo);
            if(logical==null) return d;
            const novosPontos = d.pontos.slice();
            novosPontos[pontoIndex] = {logical, preco};
            return {...d, pontos:novosPontos};
          }));
        });
        return;
      }

      // "" (e não "default") devolve a decisão ao CSS: é ele que mantém a
      // mão aberta do pan. Escrever "default" aqui apagava o grab pra
      // sempre, no primeiro movimento do mouse sobre o gráfico.
      container.style.cursor = acharHandleProximo(mx,my) ? "move" : "";
    };

    const onMouseDown = (e) => {
      if(e.button!==0) return;
      // Régua: qualquer clique novo (o "3º clique" da medição) descarta o
      // resultado anterior — é uma medição passageira, não uma anotação
      // salva, então não fica acumulando no gráfico.
      if(reguaFinalizadaRef.current){
        queueMicrotask(()=>setReguaFinalizada(null));
      }
      if(ferramentaAtivaRef.current){
        // Colocando um ponto novo — guarda onde o botão desceu; o clique só
        // "conta" no mouseup se o mouse não tiver se mexido quase nada (ver
        // onMouseUp). Não dá pra usar chart.subscribeClick do LWC aqui: ele
        // engole o 2º/3º clique quando chegam rápido um atrás do outro
        // (trata como duplo-clique) — clique-a-clique nosso, sem esse limite.
        cliqueInicioRef.current = {x:e.clientX, y:e.clientY};
        // Ferramenta que aceita arraste e ainda sem ponto nenhum: este
        // é o ponto A. Se o ponteiro andar, vira desenho por arraste; se
        // não andar, o mouseup trata como clique e o fluxo antigo segue.
        const infoFerr = FERRAMENTA_INFO[ferramentaAtivaRef.current];
        if(infoFerr?.arrasta && pontosProgressoRef.current.length === 0){
          const chart = chartRef.current, series = candleRef.current;
          const rect0 = container.getBoundingClientRect();
          const logical = chart?.timeScale().coordinateToLogical(e.clientX-rect0.left);
          const preco = series?.coordinateToPrice(e.clientY-rect0.top);
          if(logical!=null && preco!=null){
            arrastoNovoRef.current = {logical, preco, x:e.clientX, y:e.clientY};
          }
        }
        return;
      }
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      // "x" de fechar rápido de alguma linha — remove na hora, sem precisar
      // do menu de clique-direito (ver _anchorFechar/acharBotaoFecharProximo).
      const fechar = acharBotaoFecharProximo(mx,my);
      if(fechar){
        queueMicrotask(()=>{
          registrarHistorico?.();
          setDesenhos?.(prev=>prev.filter(x=>x.id!==fechar));
        });
        e.preventDefault();
        return;
      }
      const proximo = acharHandleProximo(mx,my);
      if(proximo){
        arrastandoRef.current = proximo;
        // Mesma dupla trava de "toque não pode vazar pro navegador" do
        // effect que arma uma ferramenta nova (handleScroll/handleScale do
        // chart + touch-action do container) — sem o touch-action aqui, o
        // navegador ainda conseguia interpretar o arrastar de um ponto já
        // colocado (não criar um novo) como gesto de pan da página inteira.
        chartRef.current?.applyOptions({ handleScroll:false, handleScale:false });
        container.style.touchAction = "none";
        e.preventDefault();
      }
    };

    const onMouseUp = (e) => {
      if(arrastandoRef.current){
        arrastandoRef.current = null;
        chartRef.current?.applyOptions({ handleScroll:true, handleScale:true });
        container.style.touchAction = "auto";
        return;
      }
      const inicio = cliqueInicioRef.current;
      cliqueInicioRef.current = null;
      const ancora = arrastoNovoRef.current;
      arrastoNovoRef.current = null;
      if(!ferramentaAtivaRef.current || !inicio) return;

      const andou = Math.hypot(e.clientX-inicio.x, e.clientY-inicio.y);

      // ── Desenho por ARRASTE: desceu num ponto, soltou noutro ──
      // 8px e não 5: num celular o dedo treme, e tremor não é arraste.
      // Abaixo disso cai no fluxo de cliques logo adiante.
      if(ancora && andou > 8){
        const chart = chartRef.current, series = candleRef.current;
        if(!chart || !series) return;
        const rect = container.getBoundingClientRect();
        const logical = chart.timeScale().coordinateToLogical(e.clientX-rect.left);
        const preco = series.coordinateToPrice(e.clientY-rect.top);
        if(logical == null || preco == null) return;
        const pontos = pontosDoDesenho(ferramentaAtivaRef.current, [ancora, {logical, preco}]);
        const novoDesenho = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:ferramentaAtivaRef.current, pontos };
        previewPontoRef.current = null;
        queueMicrotask(()=>{
          registrarHistorico?.();
          setDesenhos?.(atual=>[...atual, novoDesenho]);
          setFerramentaAtiva?.(null);
        });
        return;
      }

      if(andou > 5) return; // foi arraste/pan, não clique

      const chart = chartRef.current, series = candleRef.current;
      if(!chart || !series) return;
      const ferramenta = ferramentaAtivaRef.current;
      const info = FERRAMENTA_INFO[ferramenta];
      if(!info) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      const logical = chart.timeScale().coordinateToLogical(mx);
      const preco = series.coordinateToPrice(my);
      if(logical == null || preco == null) return;

      const novo = [...pontosProgressoRef.current, {logical, preco}];
      if(novo.length >= info.npontos){
        setPontosProgresso([]);
        // Texto não finaliza no clique — abre um campo flutuante pra
        // digitar o conteúdo primeiro; só vira desenho de verdade quando o
        // usuário confirma (Enter/blur com texto), ver renderTextoEditando.
        if(ferramenta === "texto"){
          queueMicrotask(()=>{
            setFerramentaAtiva?.(null);
            setTextoEditando({ x:e.clientX, y:e.clientY, logical, preco });
          });
          return;
        }
        // Régua não vira `desenho` permanente — fica em state próprio e some
        // sozinha no próximo clique (ver reguaFinalizada/onMouseDown). Por
        // isso também não entra no histórico de desfazer/refazer.
        if(ferramenta === "regua"){
          const novaRegua = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:"regua", pontos:novo };
          queueMicrotask(()=>{
            setReguaFinalizada(novaRegua);
            setFerramentaAtiva?.(null);
          });
          return;
        }
        const novoDesenho = { id:`d${Date.now()}${Math.random().toString(36).slice(2,7)}`, tipo:ferramenta, pontos:pontosDoDesenho(ferramenta, novo) };
        // setDesenhos/setFerramentaAtiva são do pai (ChartPane) — chamar
        // direto aqui (ainda dentro do listener de mouseup nativo) disparava
        // "Cannot update a component while rendering a different component"
        // (subscribeCrosshairMove do LWC também reage ao mesmo evento).
        // Adiar pro próximo microtask evita a colisão sem o usuário notar.
        queueMicrotask(()=>{
          registrarHistorico?.();
          setDesenhos?.(atual=>[...atual, novoDesenho]);
          setFerramentaAtiva?.(null);
        });
      } else {
        setPontosProgresso(novo);
      }
    };

    const onContextMenu = (e) => {
      if(ferramentaAtivaRef.current) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      const desenhoId = acharDesenhoProximo(mx,my);
      if(desenhoId){
        e.preventDefault();
        setMenuCtx({x:e.clientX, y:e.clientY, desenhoId});
      }
    };

    // Pointer Events (não mouse) — cobre mouse E toque com o mesmo código,
    // sem depender do navegador "traduzir" toque em mousedown/mouseup
    // sintético (tradução que atrasa ou nem acontece quando outra coisa no
    // elemento também está de olho no toque, ex: o próprio Lightweight
    // Charts cuidando de pan/zoom) — era por isso que colocar ponto de
    // desenho não funcionava de verdade no celular.
    container.addEventListener("pointermove", onMouseMove);
    container.addEventListener("pointerdown", onMouseDown);
    window.addEventListener("pointerup", onMouseUp);
    container.addEventListener("contextmenu", onContextMenu);
    return () => {
      container.removeEventListener("pointermove", onMouseMove);
      container.removeEventListener("pointerdown", onMouseDown);
      window.removeEventListener("pointerup", onMouseUp);
      container.removeEventListener("contextmenu", onContextMenu);
    };
  },[]);

  // Suportes/Resistências — linhas de preço nativas (recalculadas a cada troca de timeframe/ticker,
  // e filtradas pelos toggles "Suporte"/"Resistência" na lista de indicadores)
  useEffect(()=>{
    if(!candleRef.current) return;
    nivelLinesRef.current.forEach(({priceLine})=>{
      try{ candleRef.current.removePriceLine(priceLine); }catch{}
    });
    const niveisAtivos = niveis.filter(nv=>activeTools.has(nv.tipo));
    nivelLinesRef.current = niveisAtivos.map(nivel=>{
      const {color, lineWidth} = estiloNivel(nivel, false);
      const priceLine = candleRef.current.createPriceLine({
        price: nivel.preco,
        color,
        lineWidth,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${nivel.tipo==="suporte" ? "Suporte" : "Resistência"} · ${nivel.toques}x`,
      });
      return { nivel, priceLine };
    });
    setNivelSel(null);
  },[niveis, activeTools, geracao]);

  // Clique → realça um nível de suporte/resistência (clique de novo pra desfazer)
  useEffect(()=>{
    if(!chartRef.current || !candleRef.current) return;
    const handler = (param) => {
      if(!param.point || !nivelLinesRef.current.length) return;
      const precoClicado = candleRef.current.coordinateToPrice(param.point.y);
      if(precoClicado===null || precoClicado===undefined) return;
      let melhor = null, menorDiff = Infinity;
      for(const {nivel} of nivelLinesRef.current){
        const diff = Math.abs(nivel.preco - precoClicado) / precoClicado;
        if(diff < 0.003 && diff < menorDiff){
          menorDiff = diff;
          melhor = nivel;
        }
      }
      setNivelSel(prev=>{
        const chave = melhor ? nivelChave(melhor) : null;
        return (chave && chave!==prev) ? chave : null;
      });
    };
    chartRef.current.subscribeClick(handler);
    return () => { try{ chartRef.current?.unsubscribeClick(handler); }catch{} };
  },[niveis, geracao]);

  // Reestiliza as linhas quando a seleção muda
  useEffect(()=>{
    nivelLinesRef.current.forEach(({nivel, priceLine})=>{
      const {color, lineWidth} = estiloNivel(nivel, nivelChave(nivel)===nivelSel);
      try{ priceLine.applyOptions({color, lineWidth}); }catch{}
    });
  },[nivelSel]);

  // Canvas — desenha padrões via _desenharOCO
  useEffect(()=>{
    const redraw = () => {
      const canvas = canvasRef.current;
      const chart  = chartRef.current;
      const series = candleRef.current;
      if(!canvas || !chart || !series || !candles.length) return;

      canvas.width  = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const toX = idx => {
        const c = candles[idx];
        if(!c) return null;
        return chart.timeScale().timeToCoordinate(Math.floor(c.timestamp/1000));
      };
      const toY = price => series.priceToCoordinate(price);
      // Coordenada lógica em vez de índice de candle — só ela cobre posições
      // além do último candle (linha de tendência/canal se estendendo pro
      // futuro); ver comentário no effect de captura de clique acima.
      const toLogX = logical => chart.timeScale().logicalToCoordinate(logical);

      for(const p of padroes){
        if(!activeTools.has(normalizarTipo(p.tipo))) continue;
        const isSel = selPat?.tipo === p.tipo &&
          selPat?.intervalo_candles?.inicio === p.intervalo_candles?.inicio;
        const tipoNorm = normalizarTipo(p.tipo);
        if(tipoNorm === "topo_duplo") _desenharTopoDuplo(ctx, toX, toY, p, isSel);
        else if(tipoNorm === "suporte" || tipoNorm === "resistencia") _desenharNivel(ctx, toX, toY, p, isSel);
        // bandeira e flâmula têm a mesma marcação (8 pontos em 4 pares) —
        // muda só o formato da consolidação, que o próprio desenho reflete
        else if(["bandeira_alta","bandeira_baixa","flamula_alta","flamula_baixa"].includes(tipoNorm)) _desenharBandeira(ctx, toX, toY, p, isSel);
        else _desenharOCO(ctx, toX, toY, p, isSel);
      }

      // Ferramentas de desenho do usuário (trend/horizontal/retângulo/canal)
      // — cada linha ganha um "x" de fechar rápido (ver _anchorFechar), pra
      // remover sem precisar abrir o menu de clique-direito.
      for(const d of desenhos){
        _desenharDesenhoUsuario(ctx, toLogX, toY, d, false, canvas.width, false, canvas.height);
        const anc = _anchorFechar(d, toLogX, toY, canvas.width);
        if(anc) _desenharBotaoFechar(ctx, anc.x, anc.y);
      }

      // Régua — some sozinha no 3º clique (ver onMouseDown), não é uma
      // anotação persistida como as outras; por isso vive fora de `desenhos`.
      if(reguaFinalizada){
        _desenharDesenhoUsuario(ctx, toLogX, toY, reguaFinalizada, false, canvas.width, false, canvas.height);
      }

      // Preview ao vivo — a ferramenta ainda está sendo colocada (já tem
      // 1+ ponto clicado) e o mouse se moveu desde então: desenha como se o
      // cursor fosse o próximo ponto, tracejado, pra dar o feedback visual
      // de "o retângulo/linha/canal se formando" antes do clique final.
      // A âncora do arraste conta como ponto colocado: quem está puxando
      // o canal vê ele se formando a cada pixel, igual a quem clicou.
      const inicioPreview = arrastoNovoRef.current
        ? [{ logical: arrastoNovoRef.current.logical, preco: arrastoNovoRef.current.preco }]
        : pontosProgresso;
      if(ferramentaAtiva && inicioPreview.length>0 && previewPontoRef.current){
        let pontosPreview = [...inicioPreview, previewPontoRef.current];
        // O canal só fica legível em preview se a paralela vier junto —
        // com uma linha só não dá pra ver se a largura está boa. Recalcula
        // a cada movimento, que é o que faz o canal "respirar" junto com
        // o cursor.
        if(ferramentaAtiva === "canal" && pontosPreview.length === 2){
          const paralela = pontoDaParalela(pontosPreview[0], pontosPreview[1], candles);
          if(paralela) pontosPreview = [...pontosPreview, paralela];
        }
        const desenhoPreview = { tipo: ferramentaAtiva, pontos: pontosPreview };
        _desenharDesenhoUsuario(ctx, toLogX, toY, desenhoPreview, false, canvas.width, true, canvas.height);
      }

      // ── Ícone de "já tem padrão marcado aqui" ──────────────
      // Um por padrão salvo, no ponto em que ele começa. É o aviso visual
      // pra não rotular duas vezes o mesmo trecho.
      iconesRef.current = [];
      ctx.save();
      ctx.font = "15px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Sem filtrar por activeTools de propósito: as ferramentas de padrão
      // começam todas desligadas, e o ícone não é o desenho do padrão — é o
      // aviso de que ali JÁ existe um marcado. Se dependesse da ferramenta
      // ligada, só apareceria pra quem já sabia que tinha algo ali.
      for(const p of padroes){
        const idx = p.lampada?.i ?? p.pontos?.cabeca?.i;
        const preco = p.lampada?.preco ?? p.pontos?.cabeca?.preco;
        if(idx == null || preco == null) continue;
        const x = toX(idx), y = toY(preco);
        if(x == null || y == null) continue;
        const topo = y - 22;
        // A direção do padrão é a cor do brilho em volta do emoji (verde
        // alta, vermelho baixa) — o glifo em si não aceita cor. No canvas
        // isso é o shadow; no admin é o drop-shadow das classes cor-*.
        ctx.shadowColor = corDoPadrao(p.tipo);
        ctx.shadowBlur = 8;
        if(ehInvertido(p.tipo)){
          // OCO Invertido: mesmo ⛰️ de cabeça pra baixo
          ctx.save();
          ctx.translate(x, topo);
          ctx.scale(1, -1);
          ctx.fillText(iconeDoPadrao(p.tipo), 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(iconeDoPadrao(p.tipo), x, topo);
        }
        ctx.shadowBlur = 0;
        iconesRef.current.push({
          x, y: topo,
          texto: descricaoDoPadrao(p.tipo, p.marcado_em, p.nome),
        });
      }
      ctx.restore();

      // Emite posição da lâmpada do padrão selecionado pro pai
      // SÓ se o tipo do padrão ainda estiver ativo nas tools — senão limpa
      const tipoSelAtivo = selPat && activeTools.has(normalizarTipo(selPat.tipo));
      if(selPat && tipoSelAtivo && onLampPos){
        const idxHead = selPat.pontos?.cabeca?.i ?? selPat.lampada?.i;
        const precoHead = selPat.pontos?.cabeca?.preco ?? selPat.lampada?.preco;
        if(idxHead != null && precoHead != null){
          const x = toX(idxHead);
          const y = toY(precoHead);
          if(x != null && y != null){
            const rect = containerRef.current.getBoundingClientRect();
            onLampPos({x: rect.left + x, y: rect.top + y - 38});
          } else {
            onLampPos(null);
          }
        }
      } else if(onLampPos){
        onLampPos(null);
      }
    };

    redrawRef.current = redraw;
    redraw();
  },[candles, padroes, activeTools, selPat, desenhos, ferramentaAtiva, pontosProgresso, reguaFinalizada]);

  return(
    <div ref={containerRef} className="chart-container" style={{position:"absolute",inset:0}}>
      <canvas ref={canvasRef} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10}}/>

      {/* Dica do ícone de padrão já marcado — div solto, sem pointer-events,
          pra não roubar o cursor do gráfico */}
      {dicaPadrao && (
        <div
          className="padrao-dica"
          style={{position:"absolute",left:dicaPadrao.x,top:dicaPadrao.y - 14,transform:"translate(-50%,-100%)",zIndex:11,pointerEvents:"none"}}
        >
          {dicaPadrao.texto}
        </div>
      )}
      {ferramentaAtiva && FERRAMENTA_INFO[ferramentaAtiva] && (
        <div style={{
          position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",
          background:"rgba(6,8,15,.85)",border:"1px solid rgba(41,98,255,.4)",color:"#2962ff",
          fontSize:11,fontFamily:"var(--font-m)",padding:"6px 8px 6px 14px",borderRadius:20,zIndex:15,
          display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap",
        }}>
          <span style={{pointerEvents:"none"}}>{FERRAMENTA_INFO[ferramentaAtiva].hints[pontosProgresso.length] || "Toque no gráfico..."}</span>
          <button
            onClick={()=>setFerramentaAtiva(null)}
            title="Cancelar"
            style={{background:"rgba(255,255,255,.08)",border:"none",color:"inherit",width:20,height:20,borderRadius:"50%",cursor:"pointer",fontSize:12,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
          >✕</button>
        </div>
      )}
      {menuCtx && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={()=>setMenuCtx(null)}>
          <div
            style={{
              position:"fixed",top:menuCtx.y,left:menuCtx.x,background:"var(--card)",
              border:"1px solid var(--border)",borderRadius:8,padding:4,minWidth:130,
              boxShadow:"0 8px 32px rgba(0,0,0,.4)",zIndex:9999,
            }}
            onMouseDown={e=>e.stopPropagation()}
          >
            <div
              onClick={()=>{
                const d = desenhos.find(x=>x.id===menuCtx.desenhoId);
                if(d){
                  registrarHistorico?.();
                  setDesenhos?.(prev=>prev.filter(x=>x.id!==d.id));
                  setFerramentaAtiva?.(d.tipo);
                }
                setMenuCtx(null);
              }}
              style={{padding:"7px 10px",fontSize:12,color:"var(--text)",cursor:"pointer",borderRadius:5}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >Editar</div>
            <div
              onClick={()=>{
                registrarHistorico?.();
                setDesenhos?.(prev=>prev.filter(x=>x.id!==menuCtx.desenhoId));
                setMenuCtx(null);
              }}
              style={{padding:"7px 10px",fontSize:12,color:"var(--down)",cursor:"pointer",borderRadius:5}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >Remover</div>
          </div>
        </div>,
        document.body
      )}
      {textoEditando && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999}} onMouseDown={confirmarTexto}>
          <input
            autoFocus
            type="text"
            value={valorTextoNovo}
            onChange={e=>setValorTextoNovo(e.target.value)}
            placeholder="Digite o texto..."
            onMouseDown={e=>e.stopPropagation()}
            onKeyDown={e=>{
              if(e.key==="Enter") confirmarTexto();
              else if(e.key==="Escape") cancelarTexto();
            }}
            onBlur={confirmarTexto}
            style={{
              position:"fixed", left:textoEditando.x, top:textoEditando.y-14,
              background:"var(--card)", border:"1.5px solid #2962FF", borderRadius:6,
              color:"var(--text)", fontSize:13, fontFamily:"var(--font-b)", fontWeight:600,
              padding:"5px 9px", outline:"none", minWidth:160, zIndex:9999,
              boxShadow:"0 4px 16px rgba(0,0,0,.35)",
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
