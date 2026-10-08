import { converterParaGraficoAtual } from "./lampadas.js";

// Abrir um template salvo mostrando CONTEXTO, não só o padrão.
//
// Ao salvar, guardamos duas coisas: `candles` (o padrão com uma folga
// estreita em volta) e `candles_contexto` (o histórico inteiro que estava
// carregado). Abrir pelo recorte estreito fazia um topo duplo — que ocupa
// poucos candles — aparecer espremido, quase encostando na borda, sem o
// antes e o depois que fazem o padrão ser lido como padrão.
//
// Aqui o template é reaberto sobre o contexto inteiro, com os pontos
// reindexados por timestamp (os índices salvos são do recorte estreito).
// Se o template não tiver contexto guardado, nada muda.
export function comContextoLargo(template) {
  const contexto = template?.candles_contexto;
  if (!contexto?.length || !template?.candles?.length) return template;
  if (contexto.length <= template.candles.length) return template;

  const pontos = converterParaGraficoAtual(template, contexto);
  if (!pontos) return template;

  const anotacoes = (template.anotacoes || []).map((a) => {
    const candle = template.candles[a?.ancora?.i];
    if (!candle) return null;
    let melhor = 0;
    for (let i = 1; i < contexto.length; i++) {
      if (Math.abs(contexto[i].timestamp - candle.timestamp) < Math.abs(contexto[melhor].timestamp - candle.timestamp)) melhor = i;
    }
    return { ...a, ancora: { i: melhor, preco: a.ancora.preco } };
  }).filter(Boolean);

  return { ...template, candles: contexto, pontos, anotacoes };
}
