import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../lib/api.js";
import { CATEGORIAS, PONTOS_DO_GLOBO, variacaoDoDia } from "../lib/mercadosGlobais.js";

// Bloco do globo da página inicial: o globo em si, a coluna de filtros e o
// card que abre ao clicar num ponto. O desenho do globo fica no GlobeD3,
// que entra por lazy() — ele carrega o d3-geo e o mapa do mundo, e quem
// está no celular (onde o bloco some) não baixa nada disso.
const GlobeD3 = lazy(() => import("./GlobeD3.jsx"));

const TICKERS = PONTOS_DO_GLOBO.map((m) => m.indice);
const MIN_GLOBO = 240;
const MAX_GLOBO = 440;
const MAX_GLOBO_COMPACTO = 280;   // celular: cabe sem empurrar a lista

export default function GloboMercados({ compacto = false }) {
  const navigate = useNavigate();
  const [cotacoes, setCotacoes] = useState(null);
  // { acao:true, moeda:true, cripto:true, indice:true } — todos ligados
  const [filtros, setFiltros] = useState(() =>
    Object.fromEntries(CATEGORIAS.map((c) => [c.id, true]))
  );
  const [selecionado, setSelecionado] = useState(null);
  const [posicao, setPosicao] = useState(null);
  const [tamanho, setTamanho] = useState(320);
  // medidas da área do globo: é nelas que o card flutuante se encaixa
  const [area, setArea] = useState({ largura: 320, altura: 320 });
  const areaRef = useRef(null);

  // Mesma rota /ativos/batch que o resto do app usa — os seis índices já
  // são servidos por ela, então não há número inventado na tela.
  useEffect(() => {
    let vivo = true;
    fetch(`${API}/ativos/batch?tickers=${encodeURIComponent(TICKERS.join(","))}&periodo=1mo&intervalo=1d`)
      .then((r) => r.json())
      .then((dados) => {
        if (!vivo) return;
        const porTicker = {};
        for (const resultado of dados?.resultados || []) {
          porTicker[resultado.ticker] = variacaoDoDia(resultado.candles);
        }
        setCotacoes(porTicker);
      })
      .catch(() => { if (vivo) setCotacoes({}); });
    return () => { vivo = false; };
  }, []);

  // O globo acompanha a largura que sobra: a sidebar abre e fecha, e o
  // bloco inteiro encolhe junto.
  useEffect(() => {
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === "undefined") return;
    // No compacto a altura é fixa e o próprio SVG a ocupa inteira — medir
    // a altura aqui daria um laço (globo cresce → área cresce → globo
    // cresce). Por isso o compacto se guia só pela largura.
    const teto = compacto ? MAX_GLOBO_COMPACTO : MAX_GLOBO;
    const observador = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      const base = compacto ? width : Math.min(width, height || width);
      setArea({ largura: width, altura: compacto ? Math.min(width, teto) : (height || width) });
      setTamanho(Math.max(MIN_GLOBO, Math.min(teto, base)));
    });
    observador.observe(area);
    return () => observador.disconnect();
  }, [compacto]);

  function alternarFiltro(id) {
    setFiltros((antes) => ({ ...antes, [id]: !antes[id] }));
    setSelecionado(null);
  }

  // Só os pontos das categorias ligadas chegam ao globo — o mapa em si não
  // é redesenhado por causa disso, só a lista de pontos muda.
  const visiveis = PONTOS_DO_GLOBO.filter((m) => filtros[m.categoria]);

  return (
    <div className={`card globo-bloco${compacto ? " compacto" : ""}`} onClick={() => setSelecionado(null)}>
      <div className="globo-bloco-head">
        <span className="globo-bloco-titulo">Mercados Globais</span>
        {!compacto && <span className="globo-bloco-sub">Clique num ponto para ver a bolsa</span>}
      </div>

      <div className="globo-bloco-corpo">
        <div className="globo-area" ref={areaRef} onClick={(e) => e.stopPropagation()}>
          <Suspense fallback={<div className="globo-carregando" style={{ width: tamanho, height: tamanho }} />}>
            <GlobeD3
              mercados={visiveis}
              selecionado={selecionado}
              tamanho={tamanho}
              aoSelecionar={(mercado, ponto) => { setSelecionado(mercado); setPosicao(ponto); }}
            />
          </Suspense>

          {visiveis.length === 0 && (
            <p className="globo-vazio">Nenhum mercado foi escolhido.</p>
          )}

          {selecionado && posicao && (
            <PopupMercado
              mercado={selecionado}
              dado={cotacoes?.[selecionado.indice]}
              posicao={posicao}
              area={area}
              aoFechar={() => setSelecionado(null)}
              aoVerIndice={() => navigate(`/ativo/${encodeURIComponent(selecionado.indice)}`)}
            />
          )}
        </div>

        <div className="globo-filtros" onClick={(e) => e.stopPropagation()}>
          {CATEGORIAS.map(({ id, rotulo }) => {
            const ligado = filtros[id];
            const quantos = PONTOS_DO_GLOBO.filter((m) => m.categoria === id).length;
            return (
              <button
                key={id}
                type="button"
                className={`globo-filtro${ligado ? " ligado" : ""}`}
                aria-pressed={ligado}
                title={quantos ? `${quantos} no globo` : "Nenhum mercado nesta categoria ainda"}
                onClick={() => alternarFiltro(id)}
              >
                <span className="globo-filtro-caixa" aria-hidden="true">{ligado ? "✓" : ""}</span>
                {rotulo}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Card flutuante do ponto clicado, preso dentro da área do globo.
function PopupMercado({ mercado, dado, posicao, area, aoFechar, aoVerIndice }) {
  const LARGURA = 226;
  const ALTURA = 188;   // o suficiente pro texto de duas linhas e o rodapé
  // O ponto clicado está em coordenada do SVG, que é centralizado na área:
  // sem somar essa sobra o card nasceria deslocado pra esquerda.
  const sobraX = Math.max(0, (area.largura - Math.min(area.largura, area.altura)) / 2);
  const esquerda = Math.max(4, Math.min(posicao.x + sobraX + 14, Math.max(4, area.largura - LARGURA - 4)));
  const topo = Math.max(4, Math.min(posicao.y - 30, Math.max(4, area.altura - ALTURA)));
  const alta = dado ? dado.variacao >= 0 : null;

  return (
    <div className="globo-popup" style={{ left: esquerda, top: topo, width: LARGURA }} role="dialog" aria-label={mercado.nome}>
      <button type="button" className="globo-popup-x" onClick={aoFechar} aria-label="Fechar">✕</button>
      <strong style={{ color: mercado.cor }}>{mercado.sigla}</strong>
      <span className="globo-popup-local">{mercado.nome} · {mercado.pais}</span>
      <p>{mercado.descricao}</p>
      <div className="globo-popup-rodape">
        <span className={`globo-popup-var ${alta === null ? "" : alta ? "alta" : "baixa"}`}>
          {dado ? `${alta ? "▲" : "▼"} ${Math.abs(dado.variacao).toFixed(2)}%` : "—"}
        </span>
        <button type="button" className="globo-popup-btn" onClick={aoVerIndice}>Ver Índice</button>
      </div>
    </div>
  );
}
