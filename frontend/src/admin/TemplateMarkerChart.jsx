import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, LineStyle, createSeriesMarkers } from "lightweight-charts";

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
