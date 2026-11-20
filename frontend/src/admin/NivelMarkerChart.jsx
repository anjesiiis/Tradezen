import { useEffect, useRef, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { candleDaData } from "./periodoDoPadrao.js";
import { createChart, ColorType, CandlestickSeries, BaselineSeries, HistogramSeries, createSeriesMarkers } from "lightweight-charts";
import {
  MARGENS_PRECO_COM_VOLUME, MARGENS_PRECO_SEM_VOLUME, MARGENS_VOLUME,
  barrasDeVolume, temVolume,
} from "./volumeDoTemplate.js";

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
function GraficoDeNivel({
  candles,
  cor = "#00D68F",
  initialToques,
  onChange,
  readOnly = false,
  dual = false,
  cores,
  toquesIniciais,
  grupoAtivo,
  faixaInicial,            // { from, to } em índice de candle
  aoMudarFaixa,            // avisa a faixa visível a cada rolagem/zoom
  marcadoresExtras = [],   // padrões já salvos deste ativo: viram emoji no gráfico
  limparEm = 0,            // muda de valor = apaga os toques do grupo ativo sem recriar o gráfico
  aoClicarMarcador,
  // ── A FAIXA ARRASTÁVEL ──────────────────────────────────────
  // Até agora a faixa era SÓ o intervalo entre o toque mais baixo e o
  // mais alto. Isso funciona pra achar o nível, mas não pra desenhá-lo:
  // suporte e resistência não são uma linha exata, são uma região, e
  // dois toques raramente delimitam a região que a pessoa está vendo.
  //
  // `ajustesIniciais` é a faixa já ajustada (por grupo, no modo dual) e
  // `aoAjustarFaixa` avisa quem guarda. Sem ajuste, a faixa continua
  // derivada dos toques — nada muda pra quem não arrastar.
  ajustesIniciais,
  aoAjustarFaixa,
  // ── FLUXO DE 3 PONTOS ───────────────────────────────────────
  // `maxToques` trava o clique: com 3 marcados, o quarto é ignorado em
  // vez de virar um toque solto. `aoCompletar` avisa a tela quando o
  // último ponto entrou, e é ela que abre o modal do tipo.
  maxToques = 0,            // 0 = sem teto (o comportamento antigo)
  aoCompletar,
}) {
  // o gráfico é criado uma vez só; sem o ref, o handler ficaria com a
  // versão antiga da função
  const [versaoGrafico, setVersaoGrafico] = useState(0);
  void versaoGrafico;   // só força o recálculo das posições dos emojis
  const aoMudarFaixaRef = useRef(aoMudarFaixa);
  useEffect(() => { aoMudarFaixaRef.current = aoMudarFaixa; }, [aoMudarFaixa]);
  // Faixa ajustada à mão, por grupo. `null` num grupo = segue derivada
  // dos toques.
  const [ajustePorGrupo, setAjustePorGrupo] = useState(() => {
    if (!ajustesIniciais) return {};
    return dual ? { ...ajustesIniciais } : { [GRUPO_UNICO]: ajustesIniciais };
  });
  const ajusteRef = useRef(ajustePorGrupo);
  useEffect(() => { ajusteRef.current = ajustePorGrupo; }, [ajustePorGrupo]);
  const aoAjustarRef = useRef(aoAjustarFaixa);
  useEffect(() => { aoAjustarRef.current = aoAjustarFaixa; }, [aoAjustarFaixa]);

  // O gesto em curso: qual borda está sendo puxada e de onde começou.
  // `arrastou` existe pra o clique que encerra o arrasto NÃO virar um
  // toque novo — sem isso, cada ajuste deixaria um toque solto no nível.
  const maxToquesRef = useRef(maxToques);
  useEffect(() => { maxToquesRef.current = maxToques; }, [maxToques]);
  const aoCompletarRef = useRef(aoCompletar);
  useEffect(() => { aoCompletarRef.current = aoCompletar; }, [aoCompletar]);
  const gestoRef = useRef(null);
  const arrastouRef = useRef(false);
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const volumeRef = useRef();
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

    // Escala própria pro volume, igual à tela de padrões (ver
    // volumeDoTemplate.js): na escala do preço a maior barra achataria os
    // candles. Num nível o volume é o argumento — um toque com volume
    // confirma a linha, um sem volume pode ser só ruído.
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      scaleMargins: MARGENS_VOLUME,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: MARGENS_VOLUME });

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

    chart.timeScale().subscribeVisibleLogicalRangeChange((faixa) => {
      // redesenha os emojis dos padrões salvos junto com o gráfico
      setVersaoGrafico((v) => v + 1);
      if (faixa && Number.isFinite(faixa.from)) aoMudarFaixaRef.current?.(faixa);
    });
    chartRef.current = chart;
    volumeRef.current = volume;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);

    chart.subscribeClick((param) => {
      if (readOnly) return;
      // Veio de um arrasto de faixa: não é pedido de toque novo.
      if (arrastouRef.current) { arrastouRef.current = false; return; }
      if (!param.point || param.time === undefined) return;
      const idx = timeToIndexRef.current.get(param.time);
      if (idx === undefined) return;

      const preco = series.coordinateToPrice(param.point.y);
      if (preco === null || preco === undefined) return;

      const chave = grupoAtivoRef.current;
      const novoToque = { i: idx, preco: Math.round(preco * 10000) / 10000 };
      setToquesPorGrupo((prev) => {
        const atuais = prev[chave] || [];
        // TRAVA NO TETO. Sem isto o quarto clique virava um toque solto,
        // e a zona passava a ter um ponto que não é nem borda nem preço —
        // era o bug relatado de "deixa continuar clicando".
        //
        // MAS O CLIQUE NÃO PODE MORRER EM SILÊNCIO. Quem fecha o modal
        // sem escolher fica com a zona cheia e, ao clicar pra marcar
        // outra, não acontecia NADA — nem ponto, nem aviso, nem o modal
        // de volta. Parecia que a ferramenta tinha sumido. Agora o
        // clique na zona cheia chama de novo quem abre o modal, que é a
        // única coisa que falta fazer.
        if (maxToquesRef.current > 0 && atuais.length >= maxToquesRef.current) {
          setTimeout(() => aoCompletarRef.current?.(atuais), 0);
          return prev;
        }
        const proximos = [...atuais, novoToque];
        if (maxToquesRef.current > 0 && proximos.length === maxToquesRef.current) {
          // Depois do render, pra a tela já ter os três pontos quando
          // abrir o modal do tipo.
          setTimeout(() => aoCompletarRef.current?.(proximos), 0);
        }
        return { ...prev, [chave]: proximos };
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

    const comVolume = temVolume(candles);
    volumeRef.current?.setData(comVolume ? barrasDeVolume(candles) : []);
    chartRef.current?.priceScale("right").applyOptions({
      scaleMargins: comVolume ? MARGENS_PRECO_COM_VOLUME : MARGENS_PRECO_SEM_VOLUME,
    });

    timeToIndexRef.current = new Map(candles.map((c, i) => [toChartTime(c), i]));

    // Trocar de padrão não pode fazer perder o lugar: com uma faixa vinda
    // de fora (a de antes da troca), o gráfico abre nela em vez de voltar
    // pro gráfico inteiro.
    const escala = chartRef.current?.timeScale();
    if (faixaInicial && Number.isFinite(faixaInicial.from)) escala?.setVisibleLogicalRange(faixaInicial);
    else escala?.fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  useEffect(() => {
    if (!markersApiRef.current || !candles?.length) return;

    const todosMarcadores = [];

    grupos.forEach((g) => {
      const c = corDe(g);
      // Toque cujo candle não está mais no array é descartado aqui, no
      // único lugar: tanto os marcadores quanto a banda saem desta lista.
      // Sem isto, `candles[t.i]` undefined estourava em "undefined is not
      // an object (evaluating 'c.timestamp')" ao trocar de template, e o
      // ErrorBoundary comia a página toda.
      const ordenados = (toquesPorGrupo[g] || [])
        .filter((t) => candles[t?.i])
        .sort((a, b) => a.i - b.i);

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
        // A FAIXA AJUSTADA GANHA DA DERIVADA. Quem arrastou disse onde a
        // região está; os toques continuam sendo a prova de que ela
        // existe, e seguem desenhados onde foram marcados.
        const { de: min, ate: max } = faixaDoGrupo(g, ordenados);
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

  // A faixa de um grupo: a ajustada à mão, ou o intervalo dos toques.
  // Em módulo seria melhor, mas ela lê o ajuste do estado — e manter a
  // leitura num lugar só é o que impede o desenho e o arrasto de
  // discordarem sobre onde a faixa está.
  function faixaDoGrupo(g, ordenados) {
    const ajuste = ajusteRef.current?.[g];
    if (ajuste && Number.isFinite(ajuste.de) && Number.isFinite(ajuste.ate)) {
      return { de: Math.min(ajuste.de, ajuste.ate), ate: Math.max(ajuste.de, ajuste.ate) };
    }
    const precos = (ordenados || []).map((t) => t.preco);
    if (precos.length < 2) return null;
    return { de: Math.min(...precos), ate: Math.max(...precos) };
  }

  function toquesOrdenados(g) {
    return (toquesPorGrupo[g] || []).filter((t) => candles[t?.i]).sort((a, b) => a.i - b.i);
  }

  // ── ARRASTAR A FAIXA ────────────────────────────────────────
  //
  // Lightweight Charts não tem objeto arrastável: a faixa é uma série, e
  // série não recebe gesto. Então o gesto é capturado no contêiner e
  // traduzido de pixel pra preço com `coordinateToPrice` — a mesma
  // conversão que o clique de toque já usa, então faixa e toques falam
  // da mesma escala.
  //
  // Três zonas, com 7px de tolerância: a borda de cima move só o teto, a
  // de baixo só o piso, e o meio move a faixa inteira mantendo a altura.
  // Fora delas o gesto não é nosso e o clique segue virando toque.
  const TOLERANCIA = 7;

  function zonaDoPonteiro(y) {
    if (readOnly) return null;
    const serie = seriesRef.current;
    const g = grupoAtivoRef.current;
    const faixa = faixaDoGrupo(g, toquesOrdenados(g));
    if (!serie || !faixa) return null;
    const yTeto = serie.priceToCoordinate(faixa.ate);
    const yPiso = serie.priceToCoordinate(faixa.de);
    if (yTeto === null || yPiso === null) return null;
    if (Math.abs(y - yTeto) <= TOLERANCIA) return { modo: "teto", faixa };
    if (Math.abs(y - yPiso) <= TOLERANCIA) return { modo: "piso", faixa };
    if (y > yTeto && y < yPiso) return { modo: "mover", faixa };
    return null;
  }

  function aoDescerPonteiro(e) {
    const caixa = containerRef.current?.getBoundingClientRect();
    if (!caixa) return;
    const zona = zonaDoPonteiro(e.clientY - caixa.top);
    if (!zona) return;
    const preco = seriesRef.current.coordinateToPrice(e.clientY - caixa.top);
    if (preco === null || preco === undefined) return;
    e.preventDefault();
    gestoRef.current = { ...zona, precoInicial: preco, moveu: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function aoMoverPonteiro(e) {
    const caixa = containerRef.current?.getBoundingClientRect();
    if (!caixa) return;
    const y = e.clientY - caixa.top;
    const gesto = gestoRef.current;

    if (!gesto) {
      // Sem gesto em curso, só o cursor avisa que dá pra pegar.
      const zona = zonaDoPonteiro(y);
      if (containerRef.current) {
        containerRef.current.style.cursor =
          !zona ? "" : zona.modo === "mover" ? "grab" : "ns-resize";
      }
      return;
    }

    const preco = seriesRef.current?.coordinateToPrice(y);
    if (preco === null || preco === undefined) return;
    const delta = preco - gesto.precoInicial;
    const arredonda = (v) => Math.round(v * 10000) / 10000;

    let nova;
    if (gesto.modo === "mover") {
      nova = { de: arredonda(gesto.faixa.de + delta), ate: arredonda(gesto.faixa.ate + delta) };
    } else if (gesto.modo === "teto") {
      nova = { de: gesto.faixa.de, ate: arredonda(preco) };
    } else {
      nova = { de: arredonda(preco), ate: gesto.faixa.ate };
    }
    // Inverter a faixa no meio do gesto é confuso; o mínimo manda.
    if (nova.ate <= nova.de) return;

    gesto.moveu = true;
    arrastouRef.current = true;
    const g = grupoAtivoRef.current;
    setAjustePorGrupo((prev) => ({ ...prev, [g]: nova }));
  }

  function aoSoltarPonteiro() {
    const gesto = gestoRef.current;
    gestoRef.current = null;
    if (!gesto?.moveu) { arrastouRef.current = false; return; }
    const g = grupoAtivoRef.current;
    const nova = ajusteRef.current?.[g];
    if (!nova) return;
    aoAjustarRef.current?.(dual ? { ...ajusteRef.current } : nova);
  }

  function removerUltimo() {
    const chave = grupoAtivoRef.current;
    setToquesPorGrupo((prev) => ({ ...prev, [chave]: (prev[chave] || []).slice(0, -1) }));
  }

  function limpar() {
    const chave = grupoAtivoRef.current;
    setToquesPorGrupo((prev) => ({ ...prev, [chave]: [] }));
  }

  // Depois de salvar, a tela zera os toques pra marcar o próximo nível.
  // Trocar a `key` do componente faria isso recriando o gráfico inteiro —
  // o ativo, o período e o trecho na tela precisam continuar como estão.
  const limpezaRef = useRef(limparEm);
  useEffect(() => {
    if (limparEm === limpezaRef.current) return;
    limpezaRef.current = limparEm;
    limpar();
  }, [limparEm]);

  const grupoAtual = dual ? grupoAtivo : GRUPO_UNICO;
  const toquesAtuais = toquesPorGrupo[grupoAtual] || [];
  const completo = toquesAtuais.length >= 2;
  const precosAtuais = toquesAtuais.map((t) => t.preco);
  const faixaAtual = completo ? { min: Math.min(...precosAtuais), max: Math.max(...precosAtuais) } : null;

  // Onde desenhar o emoji de um padrão já salvo: em cima da máxima do
  // candle do primeiro ponto dele.
  function posicaoDoMarcador(extra) {
    const lista = candles;
    const chart = chartRef.current;
    const serie = seriesRef.current;
    if (!lista?.length || !chart || !serie) return null;
    // Fora do período carregado não desenha (ver candleDaData): senão os
    // padrões antigos se empilham todos na borda esquerda.
    const melhor = candleDaData(lista, extra?.time);
    if (melhor === null) return null;
    const candle = lista[melhor];
    const x = chart.timeScale().timeToCoordinate(toChartTime(candle));
    const y = serie.priceToCoordinate(extra.acima === false ? candle.minima : candle.maxima);
    if (x == null || y == null) return null;
    return { x, y: y + (extra.acima === false ? 26 : -26), time: toChartTime(candle) };
  }

  function marcadoresVisiveis() {
    return marcadoresExtras
      .map((extra) => ({ extra, pos: posicaoDoMarcador(extra) }))
      .filter(({ pos }) => pos);
  }

  return (
    <div style={{ background: "#0D1117", border: "1px solid #21262D", borderRadius: 10, overflow: "hidden", position: "relative" }}>
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

      <div style={{ position: "relative" }}>
        {/* Os gestos são do contêiner, não da série: Lightweight Charts
            não tem objeto arrastável. O clique do gráfico (que cria
            toque) continua passando — o arrasto só é "nosso" quando o
            ponteiro desce em cima da faixa. */}
        <div
          ref={containerRef}
          style={{ padding: "8px", touchAction: "none" }}
          onPointerDown={aoDescerPonteiro}
          onPointerMove={aoMoverPonteiro}
          onPointerUp={aoSoltarPonteiro}
          onPointerCancel={aoSoltarPonteiro}
          onPointerLeave={() => { if (!gestoRef.current && containerRef.current) containerRef.current.style.cursor = ""; }}
        />

        {/* Emojis dos padrões já marcados neste ativo — qualquer padrão,
            não só nível. É o aviso de "aqui já tem algo marcado". */}
        <div className="lampadas">
          {/* A posição de cada emoji depende da escala do gráfico AGORA, que
              só o objeto do chart sabe — por isso é lida no render. O
              componente re-renderiza a cada rolagem/zoom (versaoGrafico),
              então as posições nunca ficam velhas. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {marcadoresVisiveis().map(({ extra, pos }) => (
            <button
              key={extra.id ?? extra.time}
              className={`lampada ${extra.classe || "cor-neutro"}`}
              style={{ left: pos.x, top: pos.y }}
              title={extra.dica || extra.rotulo || "Padrão marcado"}
              onClick={() => aoClicarMarcador?.(extra)}
            >{extra.icone || "💡"}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// A rede de segurança fica AQUI, e não nas duas telas que montam este
// gráfico: assim um erro de desenho derruba só o gráfico, e a lista, o
// formulário e o botão de salvar continuam de pé — em vez de a página
// inteira virar a tela de "Algo quebrou".
export default function NivelMarkerChart(props) {
  return (
    <ErrorBoundary compacto="Não deu pra desenhar o gráfico desta marcação.">
      <GraficoDeNivel {...props} />
    </ErrorBoundary>
  );
}
