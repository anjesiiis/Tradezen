import { useEffect, useState } from "react";
import { GRUPOS_FERRAMENTAS } from "./ferramentasGrafico.js";
import { ICONES_FERRAMENTAS } from "./IconesFerramentas.jsx";

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

// Os ícones são desenhados, não escritos, e moram em IconesFerramentas.jsx.
// Os glifos de antes (─ ∥ ╱ ▭) dependem da fonte do sistema ter aquele
// caractere: na máquina do dono a linha horizontal e o canal paralelo
// viravam o quadradinho de "não tenho esse símbolo", e ele leu os dois
// como um X de cursor. SVG sai igual em qualquer fonte e acompanha a cor
// do botão (currentColor).

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
              <span aria-hidden="true">{ICONES_FERRAMENTAS[item.id] || item.icone}</span>
              {dica === item.id && <span className="chart-tool-dica">{item.rotulo}</span>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
