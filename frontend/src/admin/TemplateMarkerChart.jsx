import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, LineStyle, createSeriesMarkers } from "lightweight-charts";
import { limitarIndice, linhaSobCursor, moverPar, passouDoArrasto, pontoSobCursor } from "./arrastar.js";
import AnotacoesGrafico from "./AnotacoesGrafico.jsx";
import { faixaDeLeitura } from "./enquadrar.js";
import { candleDaData } from "./periodoDoPadrao.js";
import { classeDoPadrao, iconeDoPadrao } from "../lib/iconesPadroes.js";

const DURACAO_ZOOM = 500;   // ms da animação do zoom ao abrir um padrão salvo

function toChartTime(candle) {
  return Math.floor(candle.timestamp / 1000);
}

// Componente genérico: não sabe nada sobre nenhum padrão específico.
// Quem chama decide os `steps` (quais pontos marcar) e como ligar esses
// pontos, de duas formas:
//   • `linePairs` — pares de pontos ligados por uma linha (neckline do OCO)
//   • `linhas`    — função (pontos, candles) => linhas calculadas, cada uma
//     com cor, espessura e tracejado próprios. É o que a bandeira usa pra
//     esticar o canal até o rompimento e projetar o alvo.
export default function TemplateMarkerChart({
  candles, steps, linePairs = [], linhas, pares,
  marcadoresExtras = [],   // templates já salvos deste ativo: viram 💡 clicáveis
  desenhoSalvo,            // { linhas, pontos, anotacoes } do template aberto pela 💡
  desenhosExtras = [],     // desenhos dos padrões já salvos que o sidebar deixa visíveis
  areas = [],              // polígonos preenchidos (triângulo, retângulo)
  aoClicarLampada,
  anotacoes,               // etiquetas de texto do template (vão pro banco)
  aoMudarAnotacoes,
  faixaInicial,            // { from, to } em índice de candle: abre o gráfico já nesse zoom
  aoMudarFaixa,            // avisa a faixa visível a cada rolagem/zoom
  padraoMarcado,           // { id, ancora, acima } — emoji do padrão em cima da marcação
  enquadrarPontos,         // true: abre já enquadrado nos pontos (modo visualizar)
  limparEm = 0,            // muda de valor = apaga os pontos marcados sem recriar o gráfico
  initialPontos, onChange, readOnly = false,
}) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const markersApiRef = useRef();
  const lineSeriesRef = useRef([]);
  const timeToIndexRef = useRef(new Map());
  const activeStepRef = useRef(steps[0].key);
  // Arrastar ponto já marcado: os refs guardam o estado do gesto sem
  // depender do ciclo de render (os handlers do gráfico são registrados
  // uma vez só, no mount, e ficariam com valores velhos).
  const candlesRef = useRef(candles);
  const pontosRef = useRef(initialPontos || {});
  const arrastandoRef = useRef(null);
  const origemRef = useRef(null);
  const fimDoArrastoRef = useRef(0);
  const moveuRef = useRef(false);
  const cursorRef = useRef(null);
  const aoMudarFaixaRef = useRef(aoMudarFaixa);
  aoMudarFaixaRef.current = aoMudarFaixa;
  // Onde cada ponto está na tela agora. Serve pro cursor "grab" e é o que
  // os testes de navegador usam pra saber onde pegar um ponto — a escala
  // do gráfico muda sozinha quando as linhas entram, então o ponto raramente
  // fica no pixel onde foi clicado.
  const [posicoes, setPosicoes] = useState({});
  const [modoTexto, setModoTexto] = useState(false);
  // muda a cada rolagem/zoom: é o gatilho pra as anotações se reposicionarem
  const [versaoGrafico, setVersaoGrafico] = useState(0);
  const posicoesRef = useRef({});
  const [arrastando, setArrastando] = useState(null);
  const [sobreAlgo, setSobreAlgo] = useState(null); // "ponto" | "linha" | null

  const chavesDosExtras = desenhosExtras.map((d) => d.chave).join("|");

  const [pontos, setPontos] = useState(initialPontos || {});
  const [activeStep, setActiveStep] = useState(() => {
    const primeiroFaltando = steps.find((s) => !(initialPontos || {})[s.key]);
    return primeiroFaltando ? primeiroFaltando.key : null;
  });

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  // Guarda as posições só quando elas mudam de verdade (mais de meio
  // pixel), pra não re-renderizar a cada movimento do mouse.
  function atualizarPosicoesSeMudaram() {
    const atuais = posicoesDosPontos();
    const anteriores = posicoesRef.current;
    const chaves = new Set([...Object.keys(atuais), ...Object.keys(anteriores)]);
    let mudou = false;
    for (const chave of chaves) {
      const a = atuais[chave];
      const b = anteriores[chave];
      if (!a || !b || Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) {
        mudou = true;
        break;
      }
    }
    if (!mudou) return;
    posicoesRef.current = atuais;
    setPosicoes(atuais);
  }

  // Onde cada ponto marcado está na tela, em pixels
  function posicoesDosPontos() {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const lista = candlesRef.current;
    if (!chart || !series || !lista?.length) return {};
    const escalaTempo = chart.timeScale();
    const posicoes = {};
    for (const [chave, ponto] of Object.entries(pontosRef.current || {})) {
      const candle = lista[ponto.i];
      if (!candle) continue;
      const x = escalaTempo.timeToCoordinate(toChartTime(candle));
      const y = series.priceToCoordinate(ponto.preco);
      if (x == null || y == null) continue;
      posicoes[chave] = { x, y };
    }
    return posicoes;
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 620,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#5A7299" },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#21262D" },
      timeScale: { borderColor: "#21262D", timeVisible: false },
      // Navegação do gráfico ligada explicitamente: arrastar pra rolar,
      // rodinha e pinça pra dar zoom, arrastar as escalas pra esticar e
      // duplo clique pra voltar ao normal. O arrastar-para-rolar é suspenso
      // só enquanto um ponto ou uma linha está sendo movido (ver `pan`).
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00D68F",
      downColor: "#FF4560",
      borderUpColor: "#00D68F",
      borderDownColor: "#FF4560",
      wickUpColor: "#00D68F",
      wickDownColor: "#FF4560",
    });

    // As séries de linha são criadas sob demanda (ver `serieDeLinha`): o
    // número delas muda conforme o padrão e quantos pontos já foram marcados.
    lineSeriesRef.current = [];

    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);

    // Posição do cursor DENTRO do gráfico. Vem do próprio gráfico, no mesmo
    // sistema de coordenadas de timeToCoordinate/priceToCoordinate — tentar
    // deduzir isso do retângulo do canvas não bate (as escalas deslocam a
    // origem) e o arrasto simplesmente não pegava no ponto.
    chart.subscribeCrosshairMove((param) => {
      cursorRef.current = param.point || null;
      // A escala do gráfico se reajusta sozinha quando linhas entram ou
      // saem, e aí os pontos mudam de lugar na tela. Como este callback já
      // roda a cada movimento do mouse, aproveita pra manter as posições
      // atualizadas — só re-renderiza quando algo realmente mudou de lugar.
      atualizarPosicoesSeMudaram();
      if (readOnly) return;

      const gesto = arrastandoRef.current;
      if (!gesto) {
        const alvo = param.point ? alvoSobCursor(param.point.x, param.point.y) : null;
        setSobreAlgo(alvo?.tipo || null);
        return;
      }
      if (!param.point) return;
      if (!passouDoArrasto(origemRef.current, param.point.x, param.point.y)) return;
      moveuRef.current = true;

      const total = candlesRef.current?.length || 0;
      const indiceExato = chart.timeScale().coordinateToLogical(param.point.x);
      const preco = series.coordinateToPrice(param.point.y);
      if (indiceExato == null || preco == null) return;

      if (gesto.tipo === "linha") {
        // A linha inteira anda junto: o mesmo deslocamento nas 2 pontas
        setPontos((prev) => moverPar(
          gesto.pontosOriginais ?? prev,
          gesto.chaves,
          indiceExato - gesto.indiceBase,
          preco - gesto.precoBase,
          total,
        ));
        return;
      }

      const indice = limitarIndice(indiceExato, total);
      if (indice == null) return;
      setPontos((prev) => ({ ...prev, [gesto.chave]: { i: indice, preco: Math.round(preco * 10000) / 10000 } }));
    });

    // Marca o ponto onde o usuário clicou. Vale pro clique normal E pro
    // duplo clique: quando dois cliques vêm rápido (menos de meio segundo),
    // a biblioteca do gráfico entende o segundo como duplo clique e não
    // dispara "click" — sem isso, marcar dois pontos em sequência rápida
    // perdia o segundo.
    const marcar = (param) => {
      if (readOnly) return;
      // Clique que veio de um arrasto (ou de pegar um ponto) não marca
      // nada — senão mover o ponto 4 criaria um ponto novo por baixo.
      if (Date.now() - fimDoArrastoRef.current < 250) return;
      if (!param.point || param.time === undefined) return;
      const idx = timeToIndexRef.current.get(param.time);
      if (idx === undefined) return;
      const step = activeStepRef.current;
      if (!step) return;

      const preco = series.coordinateToPrice(param.point.y);
      if (preco === null || preco === undefined) return;

      const novoPonto = { i: idx, preco: Math.round(preco * 10000) / 10000 };
      setPontos((prev) => {
        const atualizado = { ...prev, [step]: novoPonto };
        const proximo = steps.find((s) => !atualizado[s.key]);
        activeStepRef.current = proximo ? proximo.key : null;
        setActiveStep(activeStepRef.current);
        return atualizado;
      });
    };

    chart.subscribeClick(marcar);
    chart.subscribeDblClick(marcar);

    chart.timeScale().subscribeVisibleLogicalRangeChange((faixa) => {
      setVersaoGrafico((v) => v + 1);
      // quem chama guarda isso pra devolver no `faixaInicial` quando o
      // gráfico for remontado (trocar de padrão, por exemplo)
      if (faixa && Number.isFinite(faixa.from)) aoMudarFaixaRef.current?.(faixa);
    });

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pontosRef.current = pontos;
  }, [pontos]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    if (!seriesRef.current || !candles?.length) return;

    const data = candles.map((c) => ({
      time: toChartTime(c),
      open: c.abertura,
      high: c.maxima,
      low: c.minima,
      close: c.fechamento,
    }));
    seriesRef.current.setData(data);

    timeToIndexRef.current = new Map(candles.map((c, i) => [toChartTime(c), i]));

    // Trocar de padrão não pode fazer perder o lugar: se veio uma faixa de
    // fora (a de antes da troca), o gráfico abre exatamente nela em vez de
    // voltar pro gráfico inteiro.
    const ts = chartRef.current?.timeScale();
    if (faixaInicial && Number.isFinite(faixaInicial.from)) ts?.setVisibleLogicalRange(faixaInicial);
    else ts?.fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  // ── Arrastar pontos ─────────────────────────────────────────

  // Liga/desliga o arrastar-para-rolar do próprio gráfico
  function pan(ligado) {
    chartRef.current?.applyOptions({ handleScroll: { pressedMouseMove: ligado } });
  }

  // O que está sob o cursor: um ponto (prioridade) ou uma linha inteira
  function alvoSobCursor(x, y) {
    const posicoes = posicoesDosPontos();
    const chave = pontoSobCursor(posicoes, x, y);
    if (chave) return { tipo: "ponto", chave };
    const chaves = linhaSobCursor(segmentosDosPares(posicoes), x, y);
    if (chaves) return { tipo: "linha", chaves };
    return null;
  }

  // Segmentos arrastáveis: os pares do padrão (bandeira/flâmula) ou os
  // `linePairs` de quem usa o formato antigo (OCO, topo duplo).
  function segmentosDosPares(posicoes) {
    const lista = pares?.length ? pares : linePairs;
    return (lista || [])
      .map(([de, ate]) => ({ chaves: [de, ate], a: posicoes[de], b: posicoes[ate] }))
      .filter((seg) => seg.a && seg.b);
  }

  function aoPressionar() {
    if (readOnly) return;
    const cursor = cursorRef.current;
    if (!cursor) return;
    const alvo = alvoSobCursor(cursor.x, cursor.y);
    if (!alvo) return;

    const chart = chartRef.current;
    const series = seriesRef.current;
    arrastandoRef.current = alvo.tipo === "linha"
      ? {
          ...alvo,
          // guarda o estado do par no início do gesto: o deslocamento é
          // sempre medido a partir daqui, senão a linha "escorrega"
          pontosOriginais: pontosRef.current,
          indiceBase: chart?.timeScale().coordinateToLogical(cursor.x),
          precoBase: series?.coordinateToPrice(cursor.y),
        }
      : alvo;
    origemRef.current = { x: cursor.x, y: cursor.y };
    moveuRef.current = false;
    // Só enquanto este gesto durar: senão o gráfico rolaria junto com o
    // ponto. Trocar essa opção a cada passada do mouse (o que eu fazia
    // antes) fazia o gráfico perder o clique seguinte — por isso a troca
    // acontece uma vez só, quando algo é realmente pego.
    pan(false);
    setArrastando(alvo.tipo === "linha" ? alvo.chaves.join("+") : alvo.chave);
  }

  // Botão direito em cima de um ponto apaga aquele ponto
  function aoClicarComBotaoDireito(evento) {
    if (readOnly) return;
    const cursor = cursorRef.current;
    if (!cursor) return;
    const chave = pontoSobCursor(posicoesDosPontos(), cursor.x, cursor.y);
    if (!chave) return;
    evento.preventDefault();
    apagarPonto(chave);
  }

  function apagarPonto(chave) {
    setPontos((prev) => {
      const restante = { ...prev };
      delete restante[chave];
      return restante;
    });
    // volta a ser o passo ativo, pra remarcar com um clique
    activeStepRef.current = chave;
    setActiveStep(chave);
  }

  function aoSoltar() {
    const gesto = arrastandoRef.current;
    if (!gesto) return;
    arrastandoRef.current = null;
    origemRef.current = null;
    setArrastando(null);

    // Só engole o clique que vem a seguir se o gesto foi mesmo um arrasto,
    // ou se o dedo/mouse estava em cima de um PONTO (aí clicar ali nunca
    // deve criar outro ponto). Clicar parado em cima de uma LINHA continua
    // marcando normalmente — senão, com as linhas na tela, metade dos
    // cliques pra marcar os pontos seguintes se perdia.
    if (gesto.tipo === "ponto" || moveuRef.current) fimDoArrastoRef.current = Date.now();
    moveuRef.current = false;
    pan(true);
  }

  // As lâmpadas visíveis, já empilhadas: dois padrões que começam no mesmo
  // candle cairiam exatamente no mesmo pixel e uma cobriria a outra.
  function lampadasVisiveis() {
    const lista = marcadoresExtras
      .map((extra) => ({ extra, pos: posicaoDaLampada(extra) }))
      .filter((l) => l.pos);

    const ocupados = new Map();
    return lista.map(({ extra, pos }) => {
      const coluna = Math.round(pos.x / 14);
      const quantas = ocupados.get(coluna) || 0;
      ocupados.set(coluna, quantas + 1);
      return { extra, pos: { ...pos, y: pos.y - quantas * 19 } };
    });
  }

  // Modo visualizar: abre já enquadrado no padrão, com contexto em volta.
  // Sem isso, um padrão de 2023 abria com o gráfico inteiro na tela e era
  // preciso procurá-lo.
  useEffect(() => {
    if (!enquadrarPontos || !candles?.length || !chartRef.current) return;
    const indices = Object.values(initialPontos || {}).map((pt) => pt?.i).filter((i) => candles[i]);
    const alvo = faixaDeLeitura(indices, candles.length);
    if (alvo) chartRef.current.timeScale().setVisibleLogicalRange(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquadrarPontos, candles]);

  // Ao abrir um padrão salvo pela 💡, o gráfico vai pra uma distância
  // confortável de leitura — e não pro zoom em que o padrão foi marcado,
  // que costuma ser coladíssimo (a marcação exige precisão, a leitura não).
  // O padrão ocupa mais ou menos 40% da largura, com um mínimo de candles
  // na tela pra dar contexto e um máximo pra o candle não virar risco.
  useEffect(() => {
    const pontosDoDesenho = desenhoSalvo?.pontos || [];
    if (!pontosDoDesenho.length || !candles?.length || !chartRef.current) return;

    const indices = pontosDoDesenho.map((pt) => pt.i).filter((i) => candles[i]);
    if (!indices.length) return;

    const alvo = faixaDeLeitura(indices, candles.length);
    if (!alvo) return;

    const escala = chartRef.current.timeScale();
    const inicio = escala.getVisibleLogicalRange();
    if (!inicio || !Number.isFinite(inicio.from) || !Number.isFinite(inicio.to)) {
      escala.setVisibleLogicalRange(alvo);
      return;
    }

    // Deslizar em vez de saltar: com o corte seco se perde a noção de onde
    // o padrão estava no gráfico.
    let quadro;
    const comeco = performance.now();
    const suavizar = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const passo = (agora) => {
      const t = Math.min(1, (agora - comeco) / DURACAO_ZOOM);
      const k = suavizar(t);
      escala.setVisibleLogicalRange({
        from: inicio.from + (alvo.from - inicio.from) * k,
        to: inicio.to + (alvo.to - inicio.to) * k,
      });
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [desenhoSalvo, candles]);

  // Onde desenhar a 💡 de um template salvo: em cima da máxima do candle
  // do primeiro ponto dele.
  function posicaoDaLampada(extra) {
    const lista = candlesRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!lista?.length || !chart || !series) return null;

    // Fora do período carregado, o emoji não é desenhado: antes ele caía
    // no candle mais próximo, que pra um padrão antigo é o primeiro da
    // tela — e todos acabavam empilhados na borda esquerda.
    const melhor = candleDaData(lista, extra?.time);
    if (melhor === null) return null;
    const time = toChartTime(lista[melhor]);
    const x = chart.timeScale().timeToCoordinate(time);
    const y = series.priceToCoordinate(lista[melhor].maxima);
    if (x == null || y == null) return null;
    return { x, y: y - 10, time };
  }

  // Pega a série de linha nº `idx`, criando se ainda não existir.
  function serieDeLinha(idx) {
    const chart = chartRef.current;
    if (!chart) return null;
    if (!lineSeriesRef.current[idx]) {
      lineSeriesRef.current[idx] = chart.addSeries(LineSeries, {
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
    }
    return lineSeriesRef.current[idx];
  }

  useEffect(() => {
    if (!markersApiRef.current || !candles?.length) return;

    const marcadores = steps.filter((s) => pontos[s.key]).map((s) => ({
      time: toChartTime(candles[pontos[s.key].i]),
      position: "atPriceMiddle",
      price: pontos[s.key].preco,
      color: s.color,
      shape: "circle",
      text: s.short,
    }));

    // Os padrões já salvos entram sem rótulo nenhum: é como eles vão
    // aparecer pro usuário, sem P1/P2/M1 em cima. São os visíveis no
    // sidebar, mais o que foi aberto pela 💡.
    // o aberto pela 💡 ganha do mesmo padrão vindo do sidebar, pra não
    // desenhar duas vezes em cima
    const desenhos = [
      ...desenhosExtras.filter((d) => d.chave !== desenhoSalvo?.chave),
      ...(desenhoSalvo ? [desenhoSalvo] : []),
    ];
    for (const desenho of desenhos) {
      for (const ponto of desenho.pontos || []) {
        const candle = candles[ponto.i];
        if (!candle) continue;
        marcadores.push({
          time: toChartTime(candle),
          position: "atPriceMiddle",
          price: ponto.preco,
          color: ponto.cor || "#FFD700",
          shape: "circle",
          text: "",
        });
      }
    }
    marcadores.sort((a, b) => a.time - b.time);
    markersApiRef.current.setMarkers(marcadores);

    // Une as duas formas de desenhar num formato só
    const defs = linhas
      ? linhas(pontos, candles)
      : linePairs
          .filter(([a, b]) => pontos[a] && pontos[b])
          .map(([a, b]) => ({
            cor: "#9B6DFF", largura: 2, tracejada: true,
            dados: [{ i: pontos[a].i, preco: pontos[a].preco }, { i: pontos[b].i, preco: pontos[b].preco }],
          }));

    const todasAsLinhas = [...defs, ...desenhos.flatMap((d) => d.linhas || [])];
    todasAsLinhas.forEach((def, idx) => {
      const serie = serieDeLinha(idx);
      if (!serie) return;
      serie.applyOptions({
        color: def.cor,
        lineWidth: def.largura ?? 2,
        lineStyle: def.tracejada ? LineStyle.Dashed : LineStyle.Solid,
      });
      const pontosValidos = (def.dados || [])
        .filter((d) => candles[d.i] && d.preco !== null && d.preco !== undefined)
        .map((d) => ({ time: toChartTime(candles[d.i]), value: d.preco }))
        .sort((a, b) => a.time - b.time);
      serie.setData(pontosValidos.length >= 2 ? pontosValidos : []);
    });
    // Sobrou série de uma marcação anterior (o usuário apagou um ponto)? esvazia
    lineSeriesRef.current.slice(todasAsLinhas.length).forEach((serie) => serie.setData([]));

    onChange?.(pontos);

    // Depois que o gráfico repinta (a escala pode ter mudado), guarda onde
    // cada ponto ficou.
    const quadro = requestAnimationFrame(atualizarPosicoesSeMudaram);
    return () => cancelAnimationFrame(quadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // `desenhosExtras` NÃO entra aqui: o valor padrão (`= []`) é um array
    // novo a cada render, e como este efeito chama onChange — que troca o
    // estado de quem renderiza —, a dependência mudava sozinha e o render
    // entrava em loop ("Maximum update depth exceeded"). O que identifica
    // os desenhos é a lista de chaves; o conteúdo deles depende dos
    // candles, que já são dependência.
  }, [pontos, candles, desenhoSalvo, chavesDosExtras]);

  function limpar() {
    setPontos({});
    setActiveStep(steps[0].key);
  }

  // Depois de salvar, a tela pede os pontos de volta ao zero pra marcar o
  // próximo padrão. Não dá pra fazer isso trocando a `key` do componente:
  // isso recriaria o gráfico e jogaria fora o ativo, o período e o trecho
  // que está na tela — justamente o que precisa continuar igual.
  const limpezaRef = useRef(limparEm);
  useEffect(() => {
    if (limparEm === limpezaRef.current) return;
    limpezaRef.current = limparEm;
    limpar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limparEm]);

  const completo = steps.every((s) => pontos[s.key]);


  // Âncora (candle, preço) ⇄ pixel na tela. As anotações guardam âncora, não
  // pixel: assim voltam grudadas no mesmo candle depois de zoom, scroll — e
  // depois de fechar e reabrir o template.
  function ancoraParaPixel({ i, preco }) {
    const candle = candlesRef.current?.[i];
    if (!candle) return null;
    const x = chartRef.current?.timeScale().timeToCoordinate(toChartTime(candle));
    const y = seriesRef.current?.priceToCoordinate(preco);
    return x == null || y == null ? null : { x, y };
  }

  function pixelParaAncora(x, y) {
    const i = limitarIndice(chartRef.current?.timeScale().coordinateToLogical(x), candlesRef.current?.length || 0);
    const preco = seriesRef.current?.coordinateToPrice(y);
    return i == null || preco == null ? null : { i, preco };
  }

  return (
    <div style={{ background: "#0D1117", border: "1px solid #21262D", borderRadius: 10, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #21262D", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {steps.map((s) => {
            const marcado = pontos[s.key];
            const ativo = !readOnly && activeStep === s.key;
            return (
              <button
                key={s.key}
                onClick={() => !readOnly && setActiveStep(s.key)}
                disabled={readOnly}
                className={`admin-chip${ativo ? " active" : ""}${marcado ? " filled" : ""}`}
                style={marcado ? { boxShadow: `inset 3px 0 0 ${s.color}` } : undefined}
              >
                {s.label}
                {marcado && <span className="val">{marcado.preco.toFixed(2)}</span>}
                {marcado && !readOnly && (
                  <span
                    className="admin-chip-x"
                    role="button"
                    tabIndex={0}
                    title={`Apagar "${s.label}"`}
                    onClick={(e) => { e.stopPropagation(); apagarPonto(s.key); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); apagarPonto(s.key); } }}
                  >✕</span>
                )}
              </button>
            );
          })}
        </div>
        {!readOnly && (
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <button
              onClick={() => setModoTexto((v) => !v)}
              className={`admin-chip-acao${modoTexto ? " active" : ""}`}
              title="Escrever uma anotação em cima do gráfico"
            >📝 Texto</button>
            <button onClick={limpar} className="admin-link-btn">Limpar</button>
          </div>
        )}
      </div>

      {padraoMarcado?.modo && (
        <span className={`modo-badge ${padraoMarcado.modo === "visualizar" ? "vendo" : "editando"}`}>
          {padraoMarcado.modo === "visualizar" ? "👁 Visualizando" : "✏️ Editando"}
        </span>
      )}

      <p style={{ padding: "8px 14px", fontSize: 12, color: "#5A7299", borderBottom: "1px solid #21262D", margin: 0 }}>
        {readOnly
          ? "Visualização — somente leitura."
          : completo
            ? "Todos os pontos marcados. Arraste um ponto para ajustar, arraste a linha para mover as duas pontas juntas, e apague no ✕ do botão ou com o botão direito em cima do ponto."
            : `Clique no gráfico para marcar: ${steps.find((s) => s.key === activeStep)?.label} — o que já está marcado pode ser arrastado (ponto ou linha inteira) e apagado no ✕.`}
      </p>

      <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        data-marcacao="grafico"
        data-sobre-ponto={sobreAlgo === "ponto" ? "1" : "0"}
        data-sobre-linha={sobreAlgo === "linha" ? "1" : "0"}
        data-arrastando={arrastando || ""}
        data-posicoes={JSON.stringify(posicoes)}
        onPointerDown={aoPressionar}
        onContextMenu={aoClicarComBotaoDireito}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onPointerLeave={aoSoltar}
        style={{
          padding: "8px",
          cursor: arrastando ? "grabbing" : sobreAlgo ? "grab" : "default",
          touchAction: arrastando ? "none" : undefined,
        }}
      />

      {/* Área preenchida do padrão (triângulos e retângulo).
          O TradingView desenha séries, não polígonos — então a área sai
          num SVG por cima do canvas, com cada canto convertido de
          (candle, preço) pra pixel. `versaoGrafico` muda a cada rolagem
          e zoom, o que faz o polígono ser recalculado junto. */}
      {areas.length > 0 && (() => {
        const poligonos = areas
          .map((area) => ({
            area,
            cantos: area.pontos.map((pt) => ancoraParaPixel(pt)),
          }))
          .filter(({ cantos }) => cantos.every(Boolean));
        if (!poligonos.length) return null;
        return (
          <svg className="area-padrao" aria-hidden="true">
            {poligonos.map(({ area, cantos }) => (
              <polygon
                key={area.id}
                points={cantos.map((c) => `${c.x},${c.y}`).join(" ")}
                fill={area.cor}
                fillOpacity={area.opacidade}
                stroke={area.borda ? area.cor : "none"}
                strokeWidth={area.borda ? 1 : 0}
                strokeOpacity={area.borda ? 0.6 : 0}
              />
            ))}
          </svg>
        );
      })()}

      {/* Emoji do padrão que está sendo marcado agora, ancorado no ponto
          principal dele — acima quando o padrão é de topo, abaixo quando é
          de fundo. Serve de conferência: o símbolo que vai ficar no
          gráfico depois de salvar é esse. */}
      {(() => {
        const ancora = padraoMarcado?.ancora && pontos[padraoMarcado.ancora];
        if (!ancora) return null;
        const pos = ancoraParaPixel(ancora);
        if (!pos) return null;
        return (
          <div className="lampadas">
            <span
              className={`emoji-marcacao ${classeDoPadrao(padraoMarcado.id)}`}
              style={{ left: pos.x, top: pos.y + (padraoMarcado.acima ? -34 : 24) }}
              title={`Assim este padrão vai aparecer no gráfico`}
            >
              {iconeDoPadrao(padraoMarcado.id)}
            </span>
          </div>
        );
      })()}

      {/* 💡 dos templates já salvos: elemento próprio por cima do gráfico,
          sem bolinha nenhuma embaixo. Clicar abre o desenho daquele padrão. */}
      <div className="lampadas">
        {lampadasVisiveis().map(({ extra, pos }) => {
          return (
            <button
              key={extra.id ?? extra.time}
              className={`lampada ${extra.classe || "cor-neutro"}${extra.automatico ? " automatica" : ""}`}
              disabled={extra.automatico}
              style={{ left: pos.x, top: pos.y + (extra.acima === false ? 30 : 0) }}
              title={extra.automatico
                ? extra.dica
                : `${extra.dica || extra.rotulo || "Padrão marcado"} · clique para ver o desenho`}
              /* Sem salto seco aqui: quem enquadra é a animação de cima,
                 quando o desenho do padrão chega. */
              onClick={() => aoClicarLampada?.(extra)}
            >{extra.icone || "💡"}</button>
          );
        })}
      </div>

      {/* As etiquetas do que está sendo marcado — no modo leitura elas
          continuam aparecendo, só não dá pra mexer. */}
      <AnotacoesGrafico
        modo={modoTexto && !readOnly}
        aoSairDoModo={() => setModoTexto(false)}
        versao={versaoGrafico}
        valor={anotacoes}
        aoMudar={aoMudarAnotacoes}
        somenteLeitura={readOnly}
        paraPixel={ancoraParaPixel}
        paraAncora={pixelParaAncora}
      />

      {/* E as do template aberto pela 💡, por cima, só pra ler */}
      {desenhoSalvo?.anotacoes?.length > 0 && (
        <AnotacoesGrafico
          somenteLeitura
          versao={versaoGrafico}
          valor={desenhoSalvo.anotacoes}
          paraPixel={ancoraParaPixel}
          paraAncora={pixelParaAncora}
        />
      )}
      </div>
    </div>
  );
}
