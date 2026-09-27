// Recorte que vai pro banco como `candles` de um template: a região do
// padrão com uma folga dos dois lados. Pontos e etiquetas são reindexados
// pra esse recorte — do contrário voltariam no candle errado ao reabrir.
//
// Mesma função nas telas de marcação de padrão (OCO, topo duplo e os
// padrões de continuação): uma correção aqui vale pra todas. A de níveis
// tem a sua, porque lá se marcam toques, não pontos nomeados.

const PADDING = 15;

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
