import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from "lightweight-charts";

const STEPS = [
  { key: "ombro_esq", label: "Ombro Esquerdo", short: "OE", color: "#3D7EFF" },
  { key: "cabeca", label: "Cabeça", short: "C", color: "#F5A623" },
  { key: "ombro_dir", label: "Ombro Direito", short: "OD", color: "#3D7EFF" },
  { key: "neck1", label: "Neckline 1", short: "N1", color: "#9B6DFF" },
  { key: "neck2", label: "Neckline 2", short: "N2", color: "#9B6DFF" },
];

function toChartTime(candle) {
  return Math.floor(candle.timestamp / 1000);
}

export default function TemplateMarkerChart({ candles, initialPontos, onChange }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const markersApiRef = useRef();
  const necklineSeriesRef = useRef();
  const timeToIndexRef = useRef(new Map());
  const activeStepRef = useRef(STEPS[0].key);

  const [pontos, setPontos] = useState(initialPontos || {});
  const [activeStep, setActiveStep] = useState(() => {
    const primeiroFaltando = STEPS.find((s) => !(initialPontos || {})[s.key]);
    return primeiroFaltando ? primeiroFaltando.key : null;
  });

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 420,
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

    const necklineSeries = chart.addSeries(LineSeries, {
      color: "#9B6DFF",
      lineWidth: 2,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    necklineSeriesRef.current = necklineSeries;
    markersApiRef.current = createSeriesMarkers(series, []);

    chart.subscribeClick((param) => {
      if (!param.point || param.time === undefined) return;
      const idx = timeToIndexRef.current.get(param.time);
      if (idx === undefined) return;
      const step = activeStepRef.current;
      if (!step) return;

      const price = series.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      const novoPonto = { i: idx, preco: Math.round(price * 10000) / 10000 };
      setPontos((prev) => {
        const atualizado = { ...prev, [step]: novoPonto };
        const proximo = STEPS.find((s) => !atualizado[s.key]);
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

    const marcadores = STEPS.filter((s) => pontos[s.key]).map((s) => ({
      time: toChartTime(candles[pontos[s.key].i]),
      position: "inBar",
      color: s.color,
      shape: "circle",
      text: s.short,
    }));
    marcadores.sort((a, b) => a.time - b.time);
    markersApiRef.current.setMarkers(marcadores);

    if (pontos.neck1 && pontos.neck2 && necklineSeriesRef.current) {
      const p1 = { time: toChartTime(candles[pontos.neck1.i]), value: pontos.neck1.preco };
      const p2 = { time: toChartTime(candles[pontos.neck2.i]), value: pontos.neck2.preco };
      const [a, b] = p1.time <= p2.time ? [p1, p2] : [p2, p1];
      necklineSeriesRef.current.setData([a, b]);
    } else {
      necklineSeriesRef.current?.setData([]);
    }

    onChange?.(pontos);
  }, [pontos, candles]);

  function limpar() {
    setPontos({});
    setActiveStep(STEPS[0].key);
  }

  const completo = STEPS.every((s) => pontos[s.key]);

  return (
    <div style={{ background: "#0D1117", border: "1px solid #21262D", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #21262D", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STEPS.map((s) => {
            const marcado = pontos[s.key];
            const ativo = activeStep === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveStep(s.key)}
                className={`admin-chip${ativo ? " active" : ""}${marcado ? " filled" : ""}`}
                style={marcado ? { boxShadow: `inset 3px 0 0 ${s.color}` } : undefined}
              >
                {s.label}
                {marcado && <span className="val">{marcado.preco.toFixed(2)}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={limpar} className="admin-link-btn">Limpar</button>
      </div>

      <p style={{ padding: "8px 14px", fontSize: 12, color: "#5A7299", borderBottom: "1px solid #21262D", margin: 0 }}>
        {completo
          ? "Todos os pontos marcados. Clique em um chip acima para refazer algum ponto."
          : `Clique no gráfico para marcar: ${STEPS.find((s) => s.key === activeStep)?.label}`}
      </p>

      <div ref={containerRef} style={{ padding: "8px" }} />
    </div>
  );
}
