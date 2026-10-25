import { useEffect, useRef } from "react";
import { IconeAtivo } from "./IconeAtivo.jsx";
import { MiniLine } from "./MiniLine.jsx";
import { fmtP } from "../lib/mercado.js";
import { escolherAtivos } from "../lib/maisAtivos.js";

// Faixa de cards que rola na horizontal (lista e escolha em
// lib/maisAtivos.js).
export function MaisAtivos({ mercado = [], abrirAtivo }) {
  const faixaRef = useRef(null);
  const ativos = escolherAtivos(mercado);

  // Roda do mouse rola a faixa de lado, sem precisar segurar Shift. Tem que
  // ser listener nativo com { passive: false }: no React o wheel é passivo
  // e o preventDefault() seria ignorado (a página rolaria junto).
  useEffect(() => {
    const faixa = faixaRef.current;
    if (!faixa) return;
    const naRoda = (evento) => {
      if (!evento.deltaY) return;
      evento.preventDefault();
      faixa.scrollLeft += evento.deltaY;
    };
    faixa.addEventListener("wheel", naRoda, { passive: false });
    return () => faixa.removeEventListener("wheel", naRoda);
  }, []);

  // Uma "página" de rolagem = a largura visível menos um card, pra sobrar
  // uma pista do que vinha antes e não dar a sensação de ter pulado algo.
  const rolar = (direcao) => {
    const faixa = faixaRef.current;
    if (!faixa) return;
    const card = faixa.querySelector(".mais-ativos-card");
    const passo = card ? card.getBoundingClientRect().width + 16 : 260;
    const quantos = Math.max(1, Math.floor(faixa.clientWidth / passo) - 1);
    faixa.scrollBy({ left: passo * quantos * direcao, behavior: "smooth" });
  };

  return (
    <section className="mais-ativos">
      <div className="mais-ativos-topo">
        <span className="mais-ativos-titulo">Mais Ativos</span>
        {/* As setas ficam no cabeçalho, à direita — sobre os cards elas
            tapariam preço e variação justamente de quem está olhando.
            No celular somem: lá o dedo arrasta a faixa direto. */}
        <div className="mais-ativos-setas">
          <button type="button" className="mais-ativos-seta" aria-label="Ativos anteriores" onClick={() => rolar(-1)}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" className="mais-ativos-seta" aria-label="Próximos ativos" onClick={() => rolar(1)}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      <div className="mais-ativos-faixa" ref={faixaRef}>
        {ativos.map((a) => (
          <article
            key={a.ticker}
            className="crypto-top-card mais-ativos-card"
            style={a.semDados ? { cursor: "default", opacity: 0.55 } : undefined}
            onClick={() => !a.semDados && abrirAtivo(a)}
          >
            <div className="idx-top">
              {a.semDados
                ? <div className="cripto-sem-icone">{a.simbolo[0]}</div>
                : <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={a.cor}/>}
              <span className="idx-name">{a.nome}</span>
            </div>
            {a.semDados ? (
              <div className="idx-line">
                <span style={{ fontSize: 11, color: "var(--text3)" }}>Cotação indisponível agora</span>
              </div>
            ) : (
              <>
                <div className="idx-line">
                  <span className="idx-price">{fmtP(a.preco)}</span>
                  <span className={`idx-chg ${a.alta ? "up" : "down"}`}>
                    {a.alta ? "▲" : "▼"} {Math.abs(a.variacao_pct || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="crypto-top-spark">
                  <MiniLine data={a.serie || []} color={a.alta ? "#00D68F" : "#FF4560"}/>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
