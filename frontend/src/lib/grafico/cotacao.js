import { toLWCandles } from "./indicadores.js";

/**
 * TRADEZEN — O PREÇO DO CABEÇALHO SAI DO MESMO LUGAR QUE O GRÁFICO
 * ================================================================
 *
 * O BUG QUE ISTO CONSERTA
 * O cabeçalho mostrava preço de OUTRA fonte: `preco` do resumo de
 * /mercado, a fileira de cotações da tela inicial. São duas chamadas,
 * dois caches de 5 minutos e — o que mais pesa — dois RECORTES DE TEMPO
 * diferentes: o resumo traz a cotação do dia, e o gráfico desenha o
 * último candle do tempo gráfico aberto. Num gráfico de 60m o último
 * candle fecha num instante que não é o do resumo. A diferença de ~R$40
 * no BTC não era atraso de agregação: eram respostas de épocas
 * diferentes, lado a lado na mesma linha.
 *
 * POR QUE PASSAR POR toLWCandles E NÃO LER candles[length-1]
 * Porque o gráfico não desenha o array cru: desenha `toLWCandles(candles)`,
 * que CONVERTE (fechamento → close), FILTRA candle inválido
 * (candleUtilizavel) e ORDENA por tempo. Ler a última posição do array
 * cru acertaria quase sempre e erraria exatamente nos casos ruins — dado
 * fora de ordem, ou um candle inválido no fim — que são justamente os que
 * ninguém reproduz de propósito. Derivando daqui, o número do cabeçalho é
 * o mesmo que a escala de preço destaca, por construção.
 *
 * DE BRINDE
 * O resumo cobre só os 69 ativos marcados `resumo: True` no catálogo, de
 * 283. Nos outros 214 o cabeçalho ficava SEM preço nenhum. Candle todo
 * ativo tem.
 *
 * A VARIAÇÃO É A DO TEMPO GRÁFICO ABERTO
 * Último candle contra o fechamento do anterior: num diário é a do dia,
 * num 60m é a da última hora. É o que o gráfico mostra — e é por isso que
 * bate com ele. Antes era sempre a do dia, mesmo num gráfico de 5m.
 */
/**
 * `aoVivo` é o candle em formação que chega do stream da Binance (ver
 * lib/grafico/tempoReal.js). Ele entra AQUI, e não num estado separado do
 * cabeçalho, de propósito: o cabeçalho e a série do gráfico leem o mesmo
 * candle ao vivo, então continuam concordando tique a tique. Guardar um
 * "preço ao vivo" só pro cabeçalho recriaria a divergência que esta
 * função existe pra impedir — o número piscando em cima e a vela parada
 * embaixo.
 */
export function precoDosCandles(candles, aoVivo = null) {
  // A MESMA transformação que alimenta a série do gráfico.
  const lw = toLWCandles(aplicarAoVivo(Array.isArray(candles) ? candles : [], aoVivo));

  const ultimo = lw.length ? lw[lw.length - 1] : null;
  const anterior = lw.length > 1 ? lw[lw.length - 2] : null;

  const preco = Number.isFinite(ultimo?.close) ? ultimo.close : null;
  // Fechamento anterior zero cai fora junto com nulo e NaN: dividir por
  // ele daria Infinity, que viraria "▲Infinity%" na tela.
  const base =
    Number.isFinite(anterior?.close) && anterior.close !== 0 ? anterior.close : null;

  const variacaoPct =
    preco !== null && base !== null ? ((preco - base) / base) * 100 : null;

  return {
    preco,
    variacaoPct,
    // null, e não false: "sem dado" não é "caiu".
    alta: variacaoPct === null ? null : variacaoPct >= 0,
  };
}

/**
 * Encaixa o candle ao vivo na série.
 *
 * Mesmo timestamp do último = a vela em formação, e ele SUBSTITUI. Mais
 * novo = a hora virou e ele é uma vela nova, então ENTRA no fim. Mais
 * antigo é tique atrasado de um stream que ainda não sabe que trocamos de
 * timeframe, e é descartado: aceitar reescreveria história já fechada.
 */
export function aplicarAoVivo(candles, aoVivo) {
  if (!aoVivo || !Number.isFinite(aoVivo.timestamp) || !Number.isFinite(aoVivo.fechamento)) {
    return candles;
  }
  if (!candles.length) return [aoVivo];

  const ultimo = candles[candles.length - 1];
  if (aoVivo.timestamp === ultimo.timestamp) {
    return [...candles.slice(0, -1), { ...ultimo, ...aoVivo }];
  }
  if (aoVivo.timestamp > ultimo.timestamp) return [...candles, aoVivo];
  return candles;
}
