import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../lib/api.js";
import { MERCADOS_GLOBAIS, variacaoDoDia } from "../lib/mercadosGlobais.js";
import { SkeletonValor } from "../components/Skeleton.jsx";

// Mercados Globais: a lista das bolsas à esquerda e o globo à direita.
// O globo entra por lazy() — ele carrega o d3-geo e o mapa do mundo, e
// quem está no celular (onde o globo não aparece) não baixa nada disso.
const GlobeD3 = lazy(() => import("../components/GlobeD3.jsx"));

const TICKERS = MERCADOS_GLOBAIS.map((m) => m.indice);

function Variacao({ dado, tamanho = 13 }) {
  if (!dado) return <span className="mg-var-vazio">—</span>;
  const alta = dado.variacao >= 0;
  return (
    <span className={`mg-var ${alta ? "alta" : "baixa"}`} style={{ fontSize: tamanho }}>
      {alta ? "▲" : "▼"} {Math.abs(dado.variacao).toFixed(2)}%
    </span>
  );
}

export default function MercadosGlobais() {
  const navigate = useNavigate();
  const [cotacoes, setCotacoes] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [posicaoPopup, setPosicaoPopup] = useState({ x: 0, y: 0 });

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

  function abrirIndice(mercado) {
    navigate(`/ativo/${encodeURIComponent(mercado.indice)}`);
  }

  function selecionarNoGlobo(mercado, posicao) {
    setSelecionado(mercado);
    setPosicaoPopup(posicao);
  }

  return (
    <section className="mg" onClick={() => setSelecionado(null)}>
      <header className="mg-head">
        <h1>Mercados Globais</h1>
        <p>As principais bolsas do mundo e como elas fecharam o último pregão.</p>
      </header>

      <div className="mg-corpo">
        <div className="mg-lista">
          {MERCADOS_GLOBAIS.map((m) => {
            const dado = cotacoes?.[m.indice];
            return (
              <article
                key={m.id}
                className={`mg-card${selecionado?.id === m.id ? " ativo" : ""}`}
                onClick={(e) => { e.stopPropagation(); setSelecionado(m); setPosicaoPopup(null); }}
              >
                <span className="mg-cor" style={{ background: m.cor }} aria-hidden="true" />
                <div className="mg-card-info">
                  <strong>{m.sigla}</strong>
                  <span className="mg-local">{m.cidade} · {m.pais}</span>
                  <span className="mg-indice">{m.nomeIndice}</span>
                </div>
                <div className="mg-card-dir">
                  {cotacoes ? <Variacao dado={dado} /> : <SkeletonValor />}
                  <button
                    type="button"
                    className="mg-btn-ver"
                    onClick={(e) => { e.stopPropagation(); abrirIndice(m); }}
                  >
                    Ver mais
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mg-globo" onClick={(e) => e.stopPropagation()}>
          <Suspense fallback={<div className="globo-carregando" style={{ width: 460, height: 460 }} />}>
            <GlobeD3
              mercados={MERCADOS_GLOBAIS}
              selecionado={selecionado}
              aoSelecionar={selecionarNoGlobo}
            />
          </Suspense>

          {selecionado && posicaoPopup && (
            <PopupMercado
              mercado={selecionado}
              dado={cotacoes?.[selecionado.indice]}
              posicao={posicaoPopup}
              aoFechar={() => setSelecionado(null)}
              aoVerIndice={() => abrirIndice(selecionado)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// Card flutuante do ponto clicado. Nasce ao lado do marcador, mas sem sair
// da área do globo — por isso o limite nos 200px.
function PopupMercado({ mercado, dado, posicao, aoFechar, aoVerIndice }) {
  const esquerda = Math.min(Math.max(posicao.x + 16, 8), 200);
  const topo = Math.min(Math.max(posicao.y - 40, 8), 300);

  return (
    <div className="mg-popup" style={{ left: esquerda, top: topo }} role="dialog" aria-label={mercado.nome}>
      <button type="button" className="mg-popup-x" onClick={aoFechar} aria-label="Fechar">✕</button>
      <strong style={{ color: mercado.cor }}>{mercado.nome}</strong>
      <span className="mg-popup-local">{mercado.pais} · {mercado.continente}</span>
      <p>{mercado.descricao}</p>
      <div className="mg-popup-rodape">
        <div>
          <span className="mg-popup-rotulo">{mercado.nomeIndice}</span>
          <Variacao dado={dado} tamanho={14} />
        </div>
        <button type="button" className="mg-popup-btn" onClick={aoVerIndice}>Ver Índice</button>
      </div>
    </div>
  );
}
