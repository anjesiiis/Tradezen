// Arrastar pontos já marcados no gráfico de marcação.
// A parte que dá pra testar sem navegador mora aqui: qual ponto está sob o
// cursor, e como virar a posição do mouse em (candle, preço).

// Raio de pega, em pixels. 14px é o suficiente pra acertar o marcador com o
// mouse sem grudar em pontos vizinhos quando eles estão próximos.
export const RAIO_PEGADA = 14;

// Distância mínima, em pixels, pra considerar que o usuário ARRASTOU e não
// só clicou — sem isso, um clique tremido viraria arrasto e o clique de
// marcar um ponto novo se perderia.
export const MIN_ARRASTO = 3;

/**
 * Qual ponto marcado está sob (x, y)? Devolve a chave dele ou null.
 * `posicoes`: { chave: {x, y} } em pixels, já convertidos pelo gráfico.
 */
export function pontoSobCursor(posicoes, x, y, raio = RAIO_PEGADA) {
  let escolhido = null;
  let menorDistancia = Infinity;
  for (const [chave, pos] of Object.entries(posicoes || {})) {
    if (!pos || pos.x == null || pos.y == null) continue;
    const distancia = Math.hypot(pos.x - x, pos.y - y);
    if (distancia <= raio && distancia < menorDistancia) {
      menorDistancia = distancia;
      escolhido = chave;
    }
  }
  return escolhido;
}

/** O ponteiro saiu do lugar o bastante pra contar como arrasto? */
export function passouDoArrasto(origem, x, y, minimo = MIN_ARRASTO) {
  if (!origem) return false;
  return Math.hypot(origem.x - x, origem.y - y) >= minimo;
}

/** Mantém o índice dentro do intervalo de candles disponível. */
export function limitarIndice(indice, total) {
  if (!Number.isFinite(indice)) return null;
  const ultimo = Math.max(0, total - 1);
  return Math.min(ultimo, Math.max(0, Math.round(indice)));
}
