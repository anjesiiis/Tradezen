import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, BaselineSeries, createSeriesMarkers } from "lightweight-charts";

function toChartTime(candle) {
  return Math.floor(candle.timestamp / 1000);
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const GRUPO_UNICO = "_single";

// Marcação de nível (suporte/resistência): diferente do TemplateMarkerChart
// (pontos fixos nomeados), aqui cada clique ADICIONA um toque no nível —
// quantidade livre, mínimo 2. A faixa é o intervalo (min–max) dos toques.
//
// Modo padrão (single): um grupo só de toques — usado por Editar/Visualizar,
// onde cada template já é um nível fechado.
// Modo dual (dual=true): dois grupos independentes (ex: suporte E
// resistência) marcados ao mesmo tempo no mesmo gráfico, cada um com sua
// cor — usado na tela de "Nova marcação", pra não perder o progresso de um
// grupo enquanto marca o outro.
export default function NivelMarkerChart({
  candles,
  cor = "#00D68F",
  initialToques,
  onChange,
  readOnly = false,
  dual = false,
  cores,
  toquesIniciais,
  grupoAtivo,
}) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const markersApiRef = useRef();
  const bandaSeriesRef = useRef({});
  const timeToIndexRef = useRef(new Map());
  const grupoAtivoRef = useRef(dual ? grupoAtivo : GRUPO_UNICO);

  const grupos = dual ? Object.keys(cores) : [GRUPO_UNICO];
  const corDe = (g) => (dual ? cores[g] : cor);

  const [toquesPorGrupo, setToquesPorGrupo] = useState(() => {
    const seed = dual ? (toquesIniciais || {}) : { [GRUPO_UNICO]: initialToques || [] };
    return Object.fromEntries(grupos.map((g) => [g, seed[g] || []]));
  });

  useEffect(() => {
    grupoAtivoRef.current = dual ? grupoAtivo : GRUPO_UNICO;
  }, [dual, grupoAtivo]);

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

    // Baseline preenche a área entre a linha de dados (topo da faixa) e o
    // baseValue (fundo da faixa) — usamos isso pra desenhar a faixa de
    // preço em vez de uma reta única. O lado "bottom" fica transparente
    // porque a linha nunca cruza pra baixo do baseValue. Uma série dessas
    // por grupo, pra desenhar suporte e resistência ao mesmo tempo.
    bandaSeriesRef.current = {};
    grupos.forEach((g) => {
      const c = corDe(g);
      bandaSeriesRef.current[g] = chart.addSeries(BaselineSeries, {
        baseValue: { type: "price", price: 0 },
        topLineColor: c,
        topFillColor1: hexToRgba(c, 0.25),
        topFillColor2: hexToRgba(c, 0.08),
        bottomLineColor: "rgba(0,0,0,0)",
        bottomFillColor1: "rgba(0,0,0,0)",
        bottomFillColor2: "rgba(0,0,0,0)",
        lineWidth: 1,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);

    chart.subscribeClick((param) => {
      if (readOnly) return;
      if (!param.point || param.time === undefined) return;
      const idx = timeToIndexRef.current.get(param.time);
      if (idx === undefined) return;

      const preco = series.coordinateToPrice(param.point.y);
      if (preco === null || preco === undefined) return;

      const chave = grupoAtivoRef.current;
      const novoToque = { i: idx, preco: Math.round(preco * 10000) / 10000 };
      setToquesPorGrupo((prev) => ({ ...prev, [chave]: [...(prev[chave] || []), novoToque] }));
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

    const todosMarcadores = [];

    grupos.forEach((g) => {
      const c = corDe(g);
      const ordenados = [...(toquesPorGrupo[g] || [])].sort((a, b) => a.i - b.i);

      ordenados.forEach((t, idx) => {
        todosMarcadores.push({
          time: toChartTime(candles[t.i]),
          position: "atPriceMiddle",
          price: t.preco,
          color: c,
          shape: "circle",
          text: String(idx + 1),
        });
      });

      const bandaSeries = bandaSeriesRef.current[g];
      if (!bandaSeries) return;

      if (ordenados.length >= 2) {
        const precos = ordenados.map((t) => t.preco);
        const min = Math.min(...precos);
        const max = Math.max(...precos);
        bandaSeries.applyOptions({
          baseValue: { type: "price", price: min },
          topLineColor: c,
          topFillColor1: hexToRgba(c, 0.25),
          topFillColor2: hexToRgba(c, 0.08),
        });
        bandaSeries.setData([
          { time: toChartTime(candles[ordenados[0].i]), value: max },
          { time: toChartTime(candles[ordenados[ordenados.length - 1].i]), value: max },
        ]);
      } else {
        bandaSeries.setData([]);
      }
    });

    todosMarcadores.sort((a, b) => a.time - b.time);
    markersApiRef.current.setMarkers(todosMarcadores);

    if (dual) onChange?.(toquesPorGrupo);
    else onChange?.(toquesPorGrupo[GRUPO_UNICO] || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toquesPorGrupo, candles]);

  function removerUltimo() {
    const chave = grupoAtivoRef.current;
    setToquesPorGrupo((prev) => ({ ...prev, [chave]: (prev[chave] || []).slice(0, -1) }));
  }

  function limpar() {
    const chave = grupoAtivoRef.current;
    setToquesPorGrupo((prev) => ({ ...prev, [chave]: [] }));
  }

  const grupoAtual = dual ? grupoAtivo : GRUPO_UNICO;
  const toquesAtuais = toquesPorGrupo[grupoAtual] || [];
  const completo = toquesAtuais.length >= 2;
  const precosAtuais = toquesAtuais.map((t) => t.preco);
  const faixaAtual = completo ? { min: Math.min(...precosAtuais), max: Math.max(...precosAtuais) } : null;

  return (
    <div style={{ background: "#0D1117", border: "1px solid #21262D", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #21262D", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#8FA3C7" }}>
          {dual ? (
            grupos.map((g, idx) => {
              const t = toquesPorGrupo[g] || [];
              return (
                <span key={g}>
                  {idx > 0 && " · "}
                  <strong style={{ color: corDe(g) }}>{g === "suporte" ? "Suporte" : "Resistência"}</strong>: {t.length} toque{t.length === 1 ? "" : "s"}
                </span>
              );
            })
          ) : (
            <>
              Toques marcados: <strong style={{ color: cor }}>{toquesAtuais.length}</strong> (mínimo 2)
              {faixaAtual && (
                <> · Faixa: <strong style={{ color: cor }}>{faixaAtual.min.toFixed(4)} – {faixaAtual.max.toFixed(4)}</strong></>
              )}
            </>
          )}
        </span>
        {!readOnly && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={removerUltimo} disabled={!toquesAtuais.length} className="admin-link-btn">Remover último</button>
            <button onClick={limpar} disabled={!toquesAtuais.length} className="admin-link-btn">Limpar</button>
          </div>
        )}
      </div>

      <p style={{ padding: "8px 14px", fontSize: 12, color: "#5A7299", borderBottom: "1px solid #21262D", margin: 0 }}>
        {readOnly
          ? "Visualização — somente leitura."
          : dual
            ? `Clique no gráfico pra marcar toques de ${grupoAtual === "suporte" ? "Suporte" : "Resistência"} (o outro grupo não se perde ao trocar o tipo acima).`
            : completo
              ? "Faixa pronta. Clique no gráfico pra adicionar mais toques, ou salve."
              : "Clique no gráfico em cada ponto onde o preço tocou/repicou nesse nível."}
      </p>

      <div ref={containerRef} style={{ padding: "8px" }} />
    </div>
  );
}
