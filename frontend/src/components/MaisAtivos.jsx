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

  return (
    <section className="mais-ativos">
      <span className="mais-ativos-titulo">Mais Ativos</span>
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
