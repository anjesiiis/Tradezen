// Ferramentas do gráfico: a lista dos grupos e a memória da escolha.
//
// Fica fora do LeftToolbar porque aquele arquivo exporta um componente:
// misturar dado e componente no mesmo módulo quebra o hot reload do Vite.
const CHAVE_FERRAMENTA = "tradezen_ferramenta_grafico";

/** Ferramenta ativa da última visita (volta no reload, como no TradingView). */
export function lerFerramentaSalva() {
  try {
    const salva = localStorage.getItem(CHAVE_FERRAMENTA);
    return salva && salva !== "cursor" ? salva : null;
  } catch {
    return null;   // aba anônima ou storage bloqueado: começa no cursor
  }
}

export function guardarFerramenta(id) {
  try {
    localStorage.setItem(CHAVE_FERRAMENTA, id || "cursor");
  } catch { /* sem storage, vale só nesta sessão */ }
}

// Grupos na ordem em que aparecem. `acao` marca os botões que fazem algo
// na hora (limpar, esconder) em vez de armar uma ferramenta.
export const GRUPOS_FERRAMENTAS = [
  [
    { id: null, rotulo: "Cursor", icone: "⌖" },
  ],
  [
    { id: "trend", rotulo: "Linha de tendência", icone: "╱" },
    { id: "horizontal", rotulo: "Linha horizontal", icone: "─" },
    { id: "vertical", rotulo: "Linha vertical", icone: "│" },
  ],
  [
    { id: "retangulo_desenho", rotulo: "Retângulo", icone: "▭" },
    { id: "triangulo_desenho", rotulo: "Triângulo", icone: "◁" },
    { id: "canal", rotulo: "Canal paralelo", icone: "∥" },
  ],
  [
    { id: "fibo", rotulo: "Fibonacci — retração", icone: "𝝋" },
    { id: "fibo_extensao", rotulo: "Fibonacci — extensão", icone: "⟲" },
  ],
  [
    { id: "texto", rotulo: "Texto", icone: "T" },
    { id: "regua", rotulo: "Régua — medir variação", icone: "📏" },
    { acao: "visibilidade", rotulo: "Mostrar/esconder desenhos", icone: "👁" },
    { acao: "travar", rotulo: "Travar desenhos", icone: "🔒" },
  ],
  [
    { acao: "templates", rotulo: "Padrões do TradeZen", icone: "📐", destaque: true },
  ],
  [
    { acao: "limpar", rotulo: "Limpar desenhos", icone: "🗑" },
    { acao: "config", rotulo: "Configurações do gráfico", icone: "⚙" },
  ],
];
