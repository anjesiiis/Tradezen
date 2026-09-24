import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, LineStyle, createSeriesMarkers } from "lightweight-charts";
import { limitarIndice, passouDoArrasto, pontoSobCursor } from "./arrastar.js";

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
export default function TemplateMarkerChart({ candles, steps, linePairs = [], linhas, initialPontos, onChange, readOnly = false }) {
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
  const cursorRef = useRef(null);
  const panTravadoRef = useRef(false);
  // Onde cada ponto está na tela agora. Serve pro cursor "grab" e é o que
  // os testes de navegador usam pra saber onde pegar um ponto — a escala
  // do gráfico muda sozinha quando as linhas entram, então o ponto raramente
  // fica no pixel onde foi clicado.
  const [posicoes, setPosicoes] = useState({});
  const [arrastando, setArrastando] = useState(null);
  const [sobrePonto, setSobrePonto] = useState(false);

  const [pontos, setPontos] = useState(initialPontos || {});
  const [activeStep, setActiveStep] = useState(() => {
    const primeiroFaltando = steps.find((s) => !(initialPontos || {})[s.key]);
    return primeiroFaltando ? primeiroFaltando.key : null;
  });

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

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
      if (readOnly) return;

      const chave = arrastandoRef.current;
      if (!chave) {
        const emCima = Boolean(param.point && pontoSobCursor(posicoesDosPontos(), param.point.x, param.point.y));
        setSobrePonto(emCima);
        // Trava o pan do gráfico ENQUANTO o cursor está sobre um ponto. Tem
        // que ser antes do clique: se o gráfico começar a arrastar o painel,
        // ele para de reportar a posição do cursor e o ponto não se move.
        travarPan(emCima);
        return;
      }
      if (!param.point) return;
      if (!passouDoArrasto(origemRef.current, param.point.x, param.point.y)) return;

      const indice = limitarIndice(chart.timeScale().coordinateToLogical(param.point.x), candlesRef.current?.length || 0);
      const preco = series.coordinateToPrice(param.point.y);
      if (indice == null || preco == null) return;
      setPontos((prev) => ({ ...prev, [chave]: { i: indice, preco: Math.round(preco * 10000) / 10000 } }));
    });

    chart.subscribeClick((param) => {
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

    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // ── Arrastar pontos ─────────────────────────────────────────
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

  // Liga/desliga o arrasto do próprio gráfico (pan e zoom). Guarda o
  // estado num ref pra não mandar applyOptions a cada movimento do mouse.
  function travarPan(travar) {
    if (panTravadoRef.current === travar) return;
    panTravadoRef.current = travar;
    chartRef.current?.applyOptions({ handleScroll: !travar, handleScale: !travar });
  }

  function aoPressionar() {
    if (readOnly) return;
    const cursor = cursorRef.current;
    if (!cursor) return;
    const chave = pontoSobCursor(posicoesDosPontos(), cursor.x, cursor.y);
    if (!chave) return;

    arrastandoRef.current = chave;
    origemRef.current = { x: cursor.x, y: cursor.y };
    setArrastando(chave);
    travarPan(true);
  }

  function aoSoltar() {
    if (!arrastandoRef.current) return;
    arrastandoRef.current = null;
    origemRef.current = null;
    setArrastando(null);
    fimDoArrastoRef.current = Date.now();
    travarPan(false);
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
    const quadro = requestAnimationFrame(() => setPosicoes(posicoesDosPontos()));
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
            ? "Todos os pontos marcados. Arraste qualquer ponto no gráfico para ajustar, ou clique em um chip acima para refazer."
            : `Clique no gráfico para marcar: ${steps.find((s) => s.key === activeStep)?.label} — os pontos já marcados podem ser arrastados.`}
      </p>

      <div
        ref={containerRef}
        data-marcacao="grafico"
        data-sobre-ponto={sobrePonto ? "1" : "0"}
        data-arrastando={arrastando || ""}
        data-posicoes={JSON.stringify(posicoes)}
        onPointerDown={aoPressionar}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onPointerLeave={aoSoltar}
        style={{
          padding: "8px",
          cursor: arrastando ? "grabbing" : sobrePonto ? "grab" : "default",
          touchAction: arrastando ? "none" : undefined,
        }}
      />
    </div>
  );
}
