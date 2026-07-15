import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from "lightweight-charts";

function toChartTime(candle) {
  return Math.floor(candle.timestamp / 1000);
}

// Marcação de nível (suporte/resistência): diferente do TemplateMarkerChart
// (pontos fixos nomeados), aqui cada clique ADICIONA um toque no nível —
// quantidade livre, mínimo 2. A linha do nível é a média dos toques.
export default function NivelMarkerChart({ candles, cor = "#00D68F", initialToques, onChange }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const markersApiRef = useRef();
  const nivelLineRef = useRef();
  const timeToIndexRef = useRef(new Map());

  const [toques, setToques] = useState(initialToques || []);

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

    nivelLineRef.current = chart.addSeries(LineSeries, {
      color: cor,
      lineWidth: 2,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);

    chart.subscribeClick((param) => {
      if (!param.point || param.time === undefined) return;
      const idx = timeToIndexRef.current.get(param.time);
      if (idx === undefined) return;

      const preco = series.coordinateToPrice(param.point.y);
      if (preco === null || preco === undefined) return;

      const novoToque = { i: idx, preco: Math.round(preco * 10000) / 10000 };
      setToques((prev) => [...prev, novoToque]);
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

    const ordenados = [...toques].sort((a, b) => a.i - b.i);

    const marcadores = ordenados.map((t, idx) => ({
      time: toChartTime(candles[t.i]),
      position: "atPriceMiddle",
      price: t.preco,
      color: cor,
      shape: "circle",
      text: String(idx + 1),
    }));
    markersApiRef.current.setMarkers(marcadores);

    if (nivelLineRef.current) {
      if (ordenados.length >= 2) {
        const media = ordenados.reduce((s, t) => s + t.preco, 0) / ordenados.length;
        nivelLineRef.current.setData([
          { time: toChartTime(candles[ordenados[0].i]), value: media },
          { time: toChartTime(candles[ordenados[ordenados.length - 1].i]), value: media },
        ]);
      } else {
        nivelLineRef.current.setData([]);
      }
    }

    onChange?.(toques);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toques, candles]);

  function removerUltimo() {
    setToques((prev) => prev.slice(0, -1));
  }

  function limpar() {
    setToques([]);
  }

  const completo = toques.length >= 2;

  return (
    <div style={{ background: "#0D1117", border: "1px solid #21262D", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #21262D", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#8FA3C7" }}>
          Toques marcados: <strong style={{ color: cor }}>{toques.length}</strong> (mínimo 2)
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={removerUltimo} disabled={!toques.length} className="admin-link-btn">Remover último</button>
          <button onClick={limpar} disabled={!toques.length} className="admin-link-btn">Limpar</button>
        </div>
      </div>

      <p style={{ padding: "8px 14px", fontSize: 12, color: "#5A7299", borderBottom: "1px solid #21262D", margin: 0 }}>
        {completo
          ? "Nível pronto. Clique no gráfico pra adicionar mais toques, ou salve."
          : "Clique no gráfico em cada ponto onde o preço tocou/repicou nesse nível."}
      </p>

      <div ref={containerRef} style={{ padding: "8px" }} />
    </div>
  );
}
