import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from "lightweight-charts";

function toChartTime(candle) {
  return Math.floor(candle.timestamp / 1000);
}

// Componente genérico: não sabe nada sobre nenhum padrão específico.
// Quem chama decide os `steps` (quais pontos marcar) e `linePairs`
// (quais pares de pontos ligar com uma linha, ex: a neckline do OCO).
export default function TemplateMarkerChart({ candles, steps, linePairs = [], initialPontos, onChange, readOnly = false }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const markersApiRef = useRef();
  const lineSeriesRef = useRef([]);
  const timeToIndexRef = useRef(new Map());
  const activeStepRef = useRef(steps[0].key);

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

    lineSeriesRef.current = linePairs.map(() =>
      chart.addSeries(LineSeries, {
        color: "#9B6DFF",
        lineWidth: 2,
        lineStyle: 2,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      })
    );

    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);

    chart.subscribeClick((param) => {
      if (readOnly) return;
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

    linePairs.forEach(([keyA, keyB], idx) => {
      const lineSeries = lineSeriesRef.current[idx];
      if (!lineSeries) return;
      if (pontos[keyA] && pontos[keyB]) {
        const pA = { time: toChartTime(candles[pontos[keyA].i]), value: pontos[keyA].preco };
        const pB = { time: toChartTime(candles[pontos[keyB].i]), value: pontos[keyB].preco };
        const [a, b] = pA.time <= pB.time ? [pA, pB] : [pB, pA];
        lineSeries.setData([a, b]);
      } else {
        lineSeries.setData([]);
      }
    });

    onChange?.(pontos);
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
            ? "Todos os pontos marcados. Clique em um chip acima para refazer algum ponto."
            : `Clique no gráfico para marcar: ${steps.find((s) => s.key === activeStep)?.label}`}
      </p>

      <div ref={containerRef} style={{ padding: "8px" }} />
    </div>
  );
}
