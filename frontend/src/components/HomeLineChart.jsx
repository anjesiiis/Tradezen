import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, CrosshairMode, createChart } from "lightweight-charts";
import { toLWSeries } from "../lib/grafico/indicadores.js";

// ── Gráfico de Linha — Estudo de Mercado (Lightweight Charts) ─
export function HomeLineChart({data, color, tema="dark"}){
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  useEffect(()=>{
    if(!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
      layout:{
        background:{ type: ColorType.Solid, color: "transparent" },
        textColor: "#5A7299",
        fontFamily: "JetBrains Mono",
        fontSize: 10,
      },
      grid:{
        vertLines:{ color: "rgba(255,255,255,.03)" },
        horzLines:{ color: "rgba(255,255,255,.03)" },
      },
      crosshair:{
        mode: CrosshairMode.Normal,
        vertLine:{ color: "rgba(200,216,247,.2)", labelBackgroundColor:"#3D7EFF" },
        horzLine:{ color: "rgba(200,216,247,.2)", labelBackgroundColor:"#3D7EFF" },
      },
      rightPriceScale:{
        borderColor: "rgba(255,255,255,.06)",
        textColor: "#5A7299",
      },
      timeScale:{
        borderColor: "rgba(255,255,255,.06)",
        textColor: "#5A7299",
        timeVisible: true,
        barSpacing: 1,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale:  false,
    });

    seriesRef.current = chartRef.current.addSeries(AreaSeries, {
      lineColor: color,
      topColor:  color + "40",
      bottomColor: color + "00",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    const ro = new ResizeObserver(()=>{
      if(chartRef.current && containerRef.current){
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return()=>{
      ro.disconnect();
      chartRef.current?.remove();
    };
  },[]);

  // Troca de tema: só reestiliza via applyOptions, nunca recria o chart
  // (recriar perderia os dados — o efeito de setData não depende de `tema`).
  useEffect(()=>{
    if(!chartRef.current) return;
    const claro = tema==="light";
    const corTexto = claro ? "#5B6B84" : "#5A7299";
    const corGrid  = claro ? "rgba(15,23,32,.05)" : "rgba(255,255,255,.03)";
    const corBorda = claro ? "rgba(15,23,32,.10)" : "rgba(255,255,255,.06)";
    const corCross = claro ? "rgba(47,111,239,.25)" : "rgba(200,216,247,.2)";
    chartRef.current.applyOptions({
      layout:{ textColor: corTexto },
      grid:{ vertLines:{ color: corGrid }, horzLines:{ color: corGrid } },
      crosshair:{ vertLine:{ color: corCross }, horzLine:{ color: corCross } },
      rightPriceScale:{ borderColor: corBorda, textColor: corTexto },
      timeScale:{ borderColor: corBorda, textColor: corTexto },
    });
  },[tema]);

  useEffect(()=>{
    if(!seriesRef.current || !data?.length) return;
    seriesRef.current.setData(toLWSeries(data));
    chartRef.current?.timeScale().fitContent();
    // Atualiza cor se mudar
    seriesRef.current.applyOptions({
      lineColor: color,
      topColor:  color + "40",
      bottomColor: color + "00",
    });
  },[data, color]);

  return <div ref={containerRef} style={{position:"absolute",inset:0}}/>;
}

export default HomeLineChart;
