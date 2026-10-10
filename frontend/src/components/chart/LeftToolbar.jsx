import { useEffect, useState } from "react";
import { GRUPOS_FERRAMENTAS } from "./ferramentasGrafico.js";

// Barra vertical de ferramentas do gráfico, à esquerda — o lugar onde
// quem usa TradingView procura por elas. Antes isso era um dropdown
// "Linhas" no topo: cada desenho custava dois cliques e um menu que
// tampava o próprio gráfico.
//
// A barra só escolhe a ferramenta ARMADA; quem desenha é o CandleChart,
// que já sabia fazer isso pelo mesmo `ferramentaAtiva`. Por isso ela não
// toca em candle, indicador nem padrão — é só um seletor com memória.

/**
 * @param {string|null} ativa — ferramenta armada
 * @param {(id: string|null) => void} aoEscolher
 * @param {(acao: string) => void} aoAgir — limpar, templates, config...
 * @param {{escondidos?: boolean, travados?: boolean}} estado — botões que ficam acesos
 */
export default function LeftToolbar({ ativa, aoEscolher, aoAgir, estado = {} }) {
  const [dica, setDica] = useState(null);

  // Esc larga a ferramenta e volta pro cursor — o reflexo de quem desenha
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape") aoEscolher(null); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoEscolher]);

  function aceso(item) {
    if (item.acao === "visibilidade") return estado.escondidos;
    if (item.acao === "travar") return estado.travados;
    return !item.acao && ativa === item.id;
  }

  return (
    <nav className="chart-toolbar" aria-label="Ferramentas do gráfico">
      {GRUPOS_FERRAMENTAS.map((grupo, n) => (
        <div className="chart-toolbar-grupo" key={n}>
          {grupo.map((item) => {
            const chave = item.acao || item.id || "cursor";
            return (
              <button
                key={chave}
                type="button"
                data-ferramenta={chave}
                className={`chart-tool${aceso(item) ? " ativo" : ""}${item.destaque ? " destaque" : ""}`}
                aria-pressed={item.acao ? undefined : ativa === item.id}
                aria-label={item.rotulo}
                onMouseEnter={() => setDica(chave)}
                onMouseLeave={() => setDica(null)}
                onFocus={() => setDica(chave)}
                onBlur={() => setDica(null)}
                onClick={() => (item.acao ? aoAgir?.(item.acao) : aoEscolher(item.id))}
              >
                <span aria-hidden="true">{item.icone}</span>
                {dica === chave && <span className="chart-tool-dica">{item.rotulo}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
