// Recorte que vai pro banco como `candles` de um template: a região do
// padrão com uma folga dos dois lados. Pontos e etiquetas são reindexados
// pra esse recorte — do contrário voltariam no candle errado ao reabrir.
//
// Mesma função nas telas de marcação de padrão (OCO, topo duplo e os
// padrões de continuação): uma correção aqui vale pra todas. A de níveis
// tem a sua, porque lá se marcam toques, não pontos nomeados.

// Folga de contexto nos dois lados do padrão, em candles. Eram 15, e com
// isso um topo duplo (que ocupa poucos candles) reabria espremido, quase
// encostando na borda. 40 dá o antes e o depois que fazem o padrão ser
// lido como padrão.
const PADDING = 40;

export function janelaDoPadrao(candlesContexto, pontos, anotacoes = []) {
  const indices = Object.values(pontos).map((p) => p.i);
  const minIdx = Math.max(0, Math.min(...indices) - PADDING);
  const maxIdx = Math.min(candlesContexto.length - 1, Math.max(...indices) + PADDING);

  const candles = candlesContexto.slice(minIdx, maxIdx + 1);
  const pontosAjustados = Object.fromEntries(
    Object.entries(pontos).map(([k, p]) => [k, { i: p.i - minIdx, preco: p.preco }])
  );
  // Etiquetas vazias, ou que ficaram fora da janela, não têm por que ir
  // pro banco.
  const anotacoesAjustadas = anotacoes
    .filter((a) => a.texto?.trim() && a.ancora.i >= minIdx && a.ancora.i <= maxIdx)
    .map((a) => ({
      texto: a.texto.trim(),
      ancora: { i: a.ancora.i - minIdx, preco: a.ancora.preco },
      largura: a.largura,
      altura: a.altura,
    }));

  return { candles, pontosAjustados, anotacoesAjustadas };
}

/** Etiquetas prontas pra um update (o recorte já existe, só limpa vazias). */
export function anotacoesParaSalvar(lista) {
  return (lista || [])
    .filter((a) => a.texto?.trim())
    .map((a) => ({ texto: a.texto.trim(), ancora: a.ancora, largura: a.largura, altura: a.altura }));
}

/**
 * Data do primeiro ponto do padrão, pra coluna `data_p1`.
 *
 * É ela que faz o emoji aparecer no gráfico e o item no sidebar: sem
 * `data_p1` o template existe no banco mas é invisível em toda tela de
 * marcação (useLampadas descarta quem não tem data). Topo Duplo, OCO e
 * Níveis não gravavam esse campo — por isso 23 topos duplos, 1 OCO e 14
 * níveis já marcados nunca apareciam no gráfico.
 *
 * `pontos` aceita os dois formatos do projeto: objeto de pontos nomeados
 * ({ topo1: {i, preco} }) e a lista de toques dos níveis.
 */
export function dataDoPrimeiroPonto(candlesContexto, pontos) {
  const lista = Array.isArray(pontos)
    ? pontos
    : Array.isArray(pontos?.toques) ? pontos.toques : Object.values(pontos || {});
  const indices = lista.map((p) => p?.i).filter((i) => Number.isInteger(i));
  if (!indices.length) return null;
  const candle = candlesContexto?.[Math.min(...indices)];
  return candle ? new Date(candle.timestamp).toISOString() : null;
}
