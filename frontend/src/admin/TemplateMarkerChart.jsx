import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, LineStyle, createSeriesMarkers } from "lightweight-charts";
import { limitarIndice, linhaSobCursor, moverPar, passouDoArrasto, pontoSobCursor } from "./arrastar.js";

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
export default function TemplateMarkerChart({ candles, steps, linePairs = [], linhas, pares, initialPontos, onChange, readOnly = false }) {
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
  // Onde cada ponto está na tela agora. Serve pro cursor "grab" e é o que
  // os testes de navegador usam pra saber onde pegar um ponto — a escala
  // do gráfico muda sozinha quando as linhas entram, então o ponto raramente
  // fica no pixel onde foi clicado.
  const [posicoes, setPosicoes] = useState({});
  const posicoesRef = useRef({});
  const [arrastando, setArrastando] = useState(null);
  const [sobreAlgo, setSobreAlgo] = useState(null); // "ponto" | "linha" | null

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
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
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

    chartRef.current?.timeScale().fitContent();
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

    defs.forEach((def, idx) => {
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
    lineSeriesRef.current.slice(defs.length).forEach((serie) => serie.setData([]));

    onChange?.(pontos);

    // Depois que o gráfico repinta (a escala pode ter mudado), guarda onde
    // cada ponto ficou.
    const quadro = requestAnimationFrame(atualizarPosicoesSeMudaram);
    return () => cancelAnimationFrame(quadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos, candles]);

  function limpar() {
    setPontos({});
    setActiveStep(steps[0].key);
  }

  const completo = steps.every((s) => pontos[s.key]);

  return (
    <div style={{ background: "#0D1117", border: "1px solid #21262D", borderRadius: 10, overflow: "hidden" }}>
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
        {!readOnly && <button onClick={limpar} className="admin-link-btn">Limpar</button>}
      </div>

      <p style={{ padding: "8px 14px", fontSize: 12, color: "#5A7299", borderBottom: "1px solid #21262D", margin: 0 }}>
        {readOnly
          ? "Visualização — somente leitura."
          : completo
            ? "Todos os pontos marcados. Arraste um ponto para ajustar, arraste a linha para mover as duas pontas juntas, e apague no ✕ do botão ou com o botão direito em cima do ponto."
            : `Clique no gráfico para marcar: ${steps.find((s) => s.key === activeStep)?.label} — o que já está marcado pode ser arrastado (ponto ou linha inteira) e apagado no ✕.`}
      </p>

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
    </div>
  );
}
