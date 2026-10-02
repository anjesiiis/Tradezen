import { IconeAtivo } from "./IconeAtivo.jsx";
import { fmtP } from "../lib/mercado.js";
import { TOP_20 } from "../lib/topAtivos.js";

// "Top 20 mais acompanhados" — a lista da tela inicial no celular.
//
// A ordem é a da curadoria (ver lib/topAtivos.js) e os preços são os
// mesmos do resto do app, vindos do /mercado que o Dashboard já carregou.
// Ativo que não veio na resposta sai da lista, em vez de aparecer com
// preço inventado.
export function TopAtivosMobile({ mercado = [], abrirAtivo }) {
  const porTicker = new Map(mercado.map((a) => [a.ticker, a]));
  const ativos = TOP_20.map((t) => porTicker.get(t)).filter(Boolean);

  return (
    <section className="top20">
      {ativos.length === 0 ? (
        <div className="idx-skel" style={{ height: 260 }} />
      ) : (
        <div className="top20-lista">
          {ativos.map((a) => (
            <button key={a.ticker} type="button" className="top20-linha" onClick={() => abrirAtivo(a)}>
              <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao="#8B949E" />
              <span className="top20-nome">
                <strong>{a.simbolo}</strong>
                <span>{a.nome}</span>
              </span>
              <span className="top20-valor">
                <strong>{fmtP(a.preco)}</strong>
                <span className={a.alta ? "up" : "down"}>
                  {a.alta ? "▲" : "▼"} {Math.abs(a.variacao_pct || 0).toFixed(2)}%
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
