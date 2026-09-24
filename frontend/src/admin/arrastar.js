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

// Raio de pega das LINHAS (o traço entre os 2 pontos de um par). Menor que
// o dos pontos: o ponto sempre ganha a disputa quando os dois estão perto.
export const RAIO_LINHA = 8;

/** Distância do ponto (x,y) até o segmento a—b, em pixels. */
export function distanciaAoSegmento(x, y, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const tamanho = dx * dx + dy * dy;
  if (tamanho === 0) return Math.hypot(x - a.x, y - a.y);
  // projeta o cursor na reta e prende o resultado dentro do segmento
  let t = ((x - a.x) * dx + (y - a.y) * dy) / tamanho;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}

/**
 * Qual linha está sob o cursor? `segmentos`: [{ chaves:[de,ate], a:{x,y}, b:{x,y} }].
 * Devolve as chaves das duas pontas, ou null.
 */
export function linhaSobCursor(segmentos, x, y, raio = RAIO_LINHA) {
  let escolhida = null;
  let menorDistancia = Infinity;
  for (const seg of segmentos || []) {
    if (!seg?.a || !seg?.b) continue;
    const distancia = distanciaAoSegmento(x, y, seg.a, seg.b);
    if (distancia <= raio && distancia < menorDistancia) {
      menorDistancia = distancia;
      escolhida = seg.chaves;
    }
  }
  return escolhida;
}

/**
 * Move um par inteiro: aplica o mesmo deslocamento (candles e preço) nas
 * duas pontas, sem deixar nenhuma sair do gráfico. Se uma ponta bateria no
 * limite, o par todo para junto — assim a linha nunca "encolhe" sozinha.
 */
export function moverPar(pontos, chaves, deslocamentoI, deslocamentoPreco, totalCandles) {
  const [de, ate] = chaves;
  const origem = [pontos[de], pontos[ate]];
  if (!origem[0] || !origem[1]) return pontos;

  const ultimo = Math.max(0, totalCandles - 1);
  const passo = Math.round(deslocamentoI);
  const menorI = Math.min(origem[0].i, origem[1].i);
  const maiorI = Math.max(origem[0].i, origem[1].i);
  const passoPermitido = Math.max(-menorI, Math.min(ultimo - maiorI, passo));

  return {
    ...pontos,
    [de]: { i: origem[0].i + passoPermitido, preco: origem[0].preco + deslocamentoPreco },
    [ate]: { i: origem[1].i + passoPermitido, preco: origem[1].preco + deslocamentoPreco },
  };
}
