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

// Grupos na ordem em que aparecem. São SÓ as ferramentas de desenho: o
// que faz algo na hora (limpar, esconder, travar, régua) mora na barra de
// cima, junto de desfazer/refazer, que é da mesma natureza.
//
// A barra ficou nessas seis por pedido do dono: ela estava com vinte
// ícones e a maioria nunca era usada — cursor, vertical, triângulo,
// extensão de Fibonacci, engrenagem. Quem larga a ferramenta é o Esc, ou
// um segundo clique no ícone aceso.
export const GRUPOS_FERRAMENTAS = [
  [
    { id: "trend", rotulo: "Linha de tendência", icone: "╱" },
    { id: "horizontal", rotulo: "Linha horizontal", icone: "─" },
  ],
  [
    { id: "retangulo_desenho", rotulo: "Retângulo", icone: "▭" },
    { id: "canal", rotulo: "Canal paralelo", icone: "∥" },
  ],
  [
    // `svg` troca o glifo por um desenho de verdade: o Φ não dizia nada,
    // e as linhas horizontais com espaçamento desigual são como a
    // retração aparece no gráfico. O `icone` fica de reserva.
    { id: "fibo", rotulo: "Fibonacci — retração", icone: "≡", svg: "fibo" },
    { id: "texto", rotulo: "Texto", icone: "T" },
  ],
];
