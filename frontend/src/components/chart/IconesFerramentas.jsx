// Ícones da barra de ferramentas do gráfico.
//
// Saíram do LeftToolbar pra cá porque viraram desenho de verdade, com
// regra própria: todos no mesmo viewBox de 24, traço 2, ponta e canto
// redondos. Misturar isso com o componente deixava o arquivo da barra
// metade CSS-em-SVG.
//
// Por que traço 2 e não 1,4: o traço fino sobre o fundo escuro ficava
// quase invisível. A cor de antes (--text2, #5A7299 sobre #0D1117) dá
// 3,9:1 de contraste — passa raspando o mínimo de 3:1 que o WCAG pede
// pra elemento gráfico, e num traço de 1,4px isso lê como borrão. O
// contraste virou --text (#E6EDF3, ~14:1, no CSS) e o traço engrossou:
// são as duas pontas do mesmo problema.
//
// O tamanho vem do CSS (--tool-icone), não daqui: é o que deixa o ícone
// crescer no celular sem mexer em JSX. `currentColor` é o que faz o
// ícone herdar hover e estado aceso do botão.

// Mesma caneta pra todos — é isso que faz os seis parecerem um conjunto.
const CANETA = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

// As pontas que a ferramenta deixa no gráfico pra arrastar. Fazem o ícone
// dizer "isto é uma linha que você ancora", não "isto é um risco".
const Ponta = ({ cx, cy }) => <circle cx={cx} cy={cy} r="1.6" fill="currentColor" stroke="none" />;

export const ICONES_FERRAMENTAS = {
  // linha de tendência: diagonal subindo, com as duas âncoras
  trend: (
    <svg {...CANETA}>
      <line x1="5" y1="18.5" x2="19" y2="5.5" />
      <Ponta cx="5" cy="18.5" /><Ponta cx="19" cy="5.5" />
    </svg>
  ),

  // linha horizontal: o preço que não muda
  horizontal: (
    <svg {...CANETA}>
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <Ponta cx="7.5" cy="12" /><Ponta cx="16.5" cy="12" />
    </svg>
  ),

  retangulo_desenho: (
    <svg {...CANETA}>
      <rect x="3.5" y="6.5" width="17" height="11" rx="1.5" />
    </svg>
  ),

  // Canal paralelo: duas diagonais mais a FAIXA entre elas. Sem a faixa
  // eram dois tracinhos soltos — era o ícone que o dono não reconhecia.
  // A faixa vem antes das linhas pra ficar por baixo delas.
  canal: (
    <svg {...CANETA}>
      <path d="M3.5 15.5 L20.5 6 L20.5 11 L3.5 20.5 Z" fill="currentColor" fillOpacity="0.18" stroke="none" />
      <line x1="3.5" y1="15.5" x2="20.5" y2="6" />
      <line x1="3.5" y1="20.5" x2="20.5" y2="11" />
    </svg>
  ),

  // Fibonacci: os níveis de retração no espaçamento DESIGUAL que eles têm
  // no gráfico (0 · 38,2 · 50 · 61,8 · 100). O espaçamento é o que
  // identifica o padrão — esmaecer as linhas de baixo identificaria menos
  // e devolveria o problema de contraste que esta mudança resolve.
  fibo: (
    <svg {...CANETA}>
      <line x1="3.5" y1="4.5" x2="20.5" y2="4.5" />
      <line x1="3.5" y1="11" x2="20.5" y2="11" />
      <line x1="3.5" y1="13.5" x2="20.5" y2="13.5" />
      <line x1="3.5" y1="19.5" x2="20.5" y2="19.5" />
    </svg>
  ),

  // Texto: o T desenhado, não a letra. A letra pegava o peso da fonte do
  // sistema e ficava magra do lado dos outros cinco.
  texto: (
    <svg {...CANETA} strokeWidth="2.3">
      <line x1="6" y1="5.5" x2="18" y2="5.5" />
      <line x1="12" y1="5.5" x2="12" y2="18.5" />
    </svg>
  ),
};

export default ICONES_FERRAMENTAS;
