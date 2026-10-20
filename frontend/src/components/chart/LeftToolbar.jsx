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

// Os ícones são desenhados, não escritos. Os glifos de antes (─ ∥ ╱ ▭)
// dependem da fonte do sistema ter aquele caractere: na máquina do dono
// a linha horizontal e o canal paralelo viravam o quadradinho de "não
// tenho esse símbolo", e ele leu os dois como um X de cursor. SVG sai
// igual em qualquer fonte e acompanha a cor do botão (currentColor).
const TRACO = {
  viewBox: "0 0 16 16", width: 13, height: 13, stroke: "currentColor",
  strokeWidth: 1.4, fill: "none", strokeLinecap: "round",
};

const ICONES = {
  // linha de tendência: diagonal subindo
  trend: <svg {...TRACO} aria-hidden="true"><line x1="2.5" y1="13" x2="13.5" y2="3" /></svg>,
  // linha horizontal: o preço que não muda
  horizontal: <svg {...TRACO} aria-hidden="true"><line x1="1.5" y1="8" x2="14.5" y2="8" /></svg>,
  retangulo_desenho: (
    <svg {...TRACO} aria-hidden="true"><rect x="2" y="4" width="12" height="8" rx="1" /></svg>
  ),
  // canal paralelo: duas diagonais que nunca se encontram
  canal: (
    <svg {...TRACO} aria-hidden="true">
      <line x1="2" y1="12" x2="12" y2="2.5" />
      <line x1="4" y1="13.5" x2="14" y2="4" />
    </svg>
  ),
  // Fibonacci: os níveis de retração, com o espaçamento desigual que
  // eles têm no gráfico (0 · 38,2 · 50 · 61,8 · 100)
  fibo: (
    <svg {...TRACO} aria-hidden="true">
      <line x1="2" y1="2.5" x2="14" y2="2.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="2" y1="9" x2="14" y2="9" />
      <line x1="2" y1="13.5" x2="14" y2="13.5" />
    </svg>
  ),
};

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
              <span aria-hidden="true">{ICONES[item.id] || item.icone}</span>
              {dica === item.id && <span className="chart-tool-dica">{item.rotulo}</span>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
