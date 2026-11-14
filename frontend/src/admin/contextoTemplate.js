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
//
// ATENÇÃO AO CONTRATO — foi daqui que saiu o bug do desenho que sumia:
// o que esta função devolve está em COORDENADAS DO CONTEXTO. `candles`
// passa a ser o contexto e os índices de `pontos` são índices dele. Quem
// for GRAVAR a edição não pode mandar esses índices com o `candles`
// antigo: o banco ficaria com pontos do contexto sobre o recorte, que é
// exatamente "abre com os candles e mais nada". Por isso devolvemos
// também `candlesDoRecorte` e `emContexto` — ver salvarEdicao em
// PainelMarcacao.jsx, que refaz o recorte com janelaDoPadrao.
export function comContextoLargo(template) {
  const contexto = template?.candles_contexto;
  if (!contexto?.length || !template?.candles?.length) return template;
  if (contexto.length <= template.candles.length) return template;

  // Linha já corrompida pelo bug acima? Então os índices JÁ são do
  // contexto, e reindexar de novo é que os destruiria. Ver a função.
  if (pontosJaEstaoNoContexto(template, contexto)) {
    return {
      ...template,
      candles: contexto,
      candlesDoRecorte: template.candles,
      emContexto: true,
      pontosEramDoContexto: true,
      anotacoes: (template.anotacoes || []).filter((a) => contexto[a?.ancora?.i]),
    };
  }

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

  return {
    ...template,
    candles: contexto,
    candlesDoRecorte: template.candles,
    emContexto: true,
    pontos,
    anotacoes,
  };
}

// Os pontos desta linha estão em coordenadas do CONTEXTO em vez do
// recorte? É a assinatura das linhas gravadas enquanto salvarEdicao
// mandava os índices do gráfico aberto sem mandar o recorte junto.
//
// O teste é o honesto que existe: algum ponto cai FORA do recorte
// guardado (logo não pode ser índice dele) e TODOS caem dentro do
// contexto (logo são índices dele). Quando o recorte começava no candle 0
// do contexto as duas numerações coincidem e não há como distinguir — mas
// aí também não há estrago, porque os índices valem para os dois.
export function pontosJaEstaoNoContexto(template, contexto) {
  const indices = Object.values(template?.pontos || {})
    .map((p) => p?.i)
    .filter((i) => Number.isInteger(i));
  if (!indices.length) return false;
  const algumForaDoRecorte = indices.some((i) => !template.candles[i]);
  const todosNoContexto = indices.every((i) => !!contexto[i]);
  return algumForaDoRecorte && todosNoContexto;
}
