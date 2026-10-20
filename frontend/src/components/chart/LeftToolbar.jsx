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
//
// São seis ferramentas de desenho e nada mais. Limpar, esconder, travar e
// régua ficam na barra de cima: são ações, não ferramentas, e misturar as
// duas coisas era o que enchia esta coluna de ícones.

// Níveis de retração, com o espaçamento desigual que eles têm no gráfico
// (0 · 38,2 · 50 · 61,8 · 100). Entra no lugar do Φ, que não dizia nada.
function IconeFibo() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"
         stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="2" y1="2.5" x2="14" y2="2.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="2" y1="9" x2="14" y2="9" />
      <line x1="2" y1="13.5" x2="14" y2="13.5" />
    </svg>
  );
}

/**
 * @param {string|null} ativa — ferramenta armada
 * @param {(id: string|null) => void} aoEscolher
 */
export default function LeftToolbar({ ativa, aoEscolher }) {
  const [dica, setDica] = useState(null);

  // Esc larga a ferramenta e volta pro cursor — o reflexo de quem desenha
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape") aoEscolher(null); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoEscolher]);

  // Segundo clique na ferramenta acesa larga ela. Virou o jeito de voltar
  // pro cursor depois que o botão de cursor saiu da barra — além do Esc.
  function escolher(item) {
    aoEscolher(ativa === item.id ? null : item.id);
  }

  return (
    <nav className="chart-toolbar" aria-label="Ferramentas do gráfico">
      {GRUPOS_FERRAMENTAS.map((grupo, n) => (
        <div className="chart-toolbar-grupo" key={n}>
          {grupo.map((item) => (
            <button
              key={item.id}
              type="button"
              data-ferramenta={item.id}
              className={`chart-tool${ativa === item.id ? " ativo" : ""}`}
              aria-pressed={ativa === item.id}
              aria-label={item.rotulo}
              onMouseEnter={() => setDica(item.id)}
              onMouseLeave={() => setDica(null)}
              onFocus={() => setDica(item.id)}
              onBlur={() => setDica(null)}
              onClick={() => escolher(item)}
            >
              <span aria-hidden="true">{item.svg === "fibo" ? <IconeFibo /> : item.icone}</span>
              {dica === item.id && <span className="chart-tool-dica">{item.rotulo}</span>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
