import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../lib/api.js";
import { CATEGORIAS, PONTOS_DO_GLOBO, variacaoDoDia } from "../lib/mercadosGlobais.js";
import { buscarTopAcoes } from "../lib/topAcoes.js";
import { fmtP } from "../lib/mercado.js";

// Bloco do globo da página inicial: o globo em si, a coluna de filtros e o
// card que abre ao clicar num ponto. O desenho do globo fica no GlobeD3,
// que entra por lazy() — ele carrega o d3-geo e o mapa do mundo, e quem
// está no celular (onde o bloco some) não baixa nada disso.
const GlobeD3 = lazy(() => import("./GlobeD3.jsx"));

const TICKERS = PONTOS_DO_GLOBO.map((m) => m.indice).filter(Boolean);
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
              aoTocarFora={() => setSelecionado(null)}
            />
          </Suspense>

          {visiveis.length === 0 && (
            <p className="globo-vazio">Nenhum mercado foi escolhido.</p>
          )}

          {selecionado && posicao && (
            selecionado.categoria === "acao" ? (
              <PopupAcoes
                mercado={selecionado}
                posicao={posicao}
                area={area}
                aoFechar={() => setSelecionado(null)}
                aoAbrirAcao={(acao) => {
                  setSelecionado(null);
                  navigate(`/ativo/${encodeURIComponent(acao.ticker)}`);
                }}
              />
            ) : (
              <PopupMercado
                mercado={selecionado}
                dado={cotacoes?.[selecionado.indice]}
                posicao={posicao}
                area={area}
                aoFechar={() => setSelecionado(null)}
                aoVerIndice={() => navigate(`/ativo/${encodeURIComponent(selecionado.indice)}`)}
              />
            )
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

// Popup de uma praça de ações: as cinco mais negociadas do dia, por
// volume de verdade (ver lib/topAcoes.js). Cada linha abre o gráfico.
function PopupAcoes({ mercado, posicao, area, aoFechar, aoAbrirAcao }) {
  // { estado: "buscando" | "pronto" | "erro", lista }
  const [busca, setBusca] = useState({ estado: "buscando", lista: [] });

  useEffect(() => {
    let vivo = true;
    buscarTopAcoes(mercado.praca)
      .then((lista) => {
        if (!vivo) return;
        setBusca(lista.length ? { estado: "pronto", lista } : { estado: "erro", lista: [] });
      })
      .catch(() => { if (vivo) setBusca({ estado: "erro", lista: [] }); });
    return () => { vivo = false; };
  }, [mercado.praca]);

  const acoes = busca.estado === "pronto" ? busca.lista : null;
  const erro = busca.estado === "erro";

  const { esquerda, topo } = encaixar(posicao, area, 248, 340);

  return (
    <div
      className="globo-popup globo-popup-acoes"
      style={{ left: esquerda, top: topo, width: 248 }}
      role="dialog"
      aria-label={mercado.nome}
    >
      <button type="button" className="globo-popup-x" onClick={aoFechar} aria-label="Fechar">✕</button>
      <strong style={{ color: mercado.cor }}>{mercado.sigla}</strong>
      <span className="globo-popup-local">{mercado.cidade} · {mercado.pais}</span>
      <span className="globo-popup-rotulo">Top 5 mais negociadas</span>

      {erro && <p className="globo-popup-vazio">Não foi possível carregar agora.</p>}
      {!erro && !acoes && <p className="globo-popup-vazio">Carregando o pregão…</p>}

      {acoes?.map((a) => (
        <button key={a.ticker} type="button" className="acao-linha" onClick={() => aoAbrirAcao(a)}>
          <span className="acao-ticker">{a.simbolo}</span>
          <span className="acao-nome">{a.nome}</span>
          <span className={`acao-variacao ${a.alta ? "alta" : "baixa"}`}>
            {a.alta ? "▲" : "▼"} {Math.abs(a.variacao).toFixed(2)}%
          </span>
        </button>
      ))}

      {acoes?.length > 0 && (
        <span className="globo-popup-nota">
          Maior volume: {acoes[0].simbolo}, {acoes[0].moeda} {fmtP(acoes[0].preco)}
        </span>
      )}
    </div>
  );
}

// Encaixa o card dentro da área do globo, sem sair pelas bordas.
function encaixar(posicao, area, largura, altura) {
  const sobraX = Math.max(0, (area.largura - Math.min(area.largura, area.altura)) / 2);
  return {
    esquerda: Math.max(4, Math.min(posicao.x + sobraX + 14, Math.max(4, area.largura - largura - 4))),
    topo: Math.max(4, Math.min(posicao.y - 30, Math.max(4, area.altura - altura))),
  };
}

// Card flutuante do ponto clicado, preso dentro da área do globo.
function PopupMercado({ mercado, dado, posicao, area, aoFechar, aoVerIndice }) {
  const LARGURA = 226;
  const ALTURA = 188;   // o suficiente pro texto de duas linhas e o rodapé
  const { esquerda, topo } = encaixar(posicao, area, LARGURA, ALTURA);
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
