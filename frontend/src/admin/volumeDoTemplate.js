/**
 * TRADEZEN — VOLUME NOS GRÁFICOS DE MARCAÇÃO
 * ==========================================
 *
 * O mesmo histograma das duas telas de marcação (padrões e níveis), e por
 * isso mora fora delas: volume que aparece diferente em cada tela faz a
 * pessoa comparar barras que não são comparáveis.
 *
 * Volume importa pra marcar: um rompimento com volume e um sem volume têm
 * o mesmo desenho e não valem o mesmo. Marcar sem ver o volume é decidir
 * com metade da informação — e é essa decisão que vai pro treino.
 *
 * As cores são as do próprio candle das telas de admin (#00D68F / #FF4560),
 * com 50% de alfa, e não o verde/vermelho do design system: a barra fica
 * logo embaixo do candle que ela mede, e dois verdes diferentes no mesmo
 * gráfico leem como duas coisas diferentes.
 */

const ALTA = "rgba(0,214,143,.5)";
const BAIXA = "rgba(255,69,96,.5)";

// A faixa de baixo é do volume, e o preço sobe pra cima dela. O par de
// margens tem que fechar 100%: 0.82 aqui embaixo e 0.22 de folga lá em
// cima se sobrepõem de propósito nos 4% do meio, senão a maior barra
// encosta no candle mais baixo.
export const MARGENS_VOLUME = { top: 0.82, bottom: 0 };
export const MARGENS_PRECO_COM_VOLUME = { top: 0.05, bottom: 0.22 };

// Sem volume, exatamente o padrão do lightweight-charts — que é o que
// estes gráficos sempre usaram, por nunca terem declarado margem. Um
// número "mais bonito" aqui mudaria o enquadramento de toda marcação de
// commodity e índice sem ninguém ter pedido.
export const MARGENS_PRECO_SEM_VOLUME = { top: 0.2, bottom: 0.1 };

/**
 * Tem volume pra mostrar?
 *
 * Commodity e índice vêm do Yahoo com volume 0 ou ausente. Reservar 22%
 * da altura pra um histograma que é só chão rouba espaço de marcação em
 * troca de nada — nesses casos o gráfico fica como era.
 */
export function temVolume(candles) {
  return (candles || []).some((c) => Number(c?.volume) > 0);
}

/**
 * Barras prontas pro HistogramSeries.
 *
 * Deduplica por timestamp: no intradiário, arredondar pra segundos faz
 * dois candles caírem no mesmo `time`, e o lightweight-charts recusa a
 * série inteira ("data must be asc ordered by time") em vez de só ignorar
 * o repetido. Fica o último, que é o mais recente.
 */
export function barrasDeVolume(candles) {
  const porTempo = new Map();
  for (const c of candles || []) {
    if (!Number.isFinite(c?.timestamp)) continue;
    const time = Math.floor(c.timestamp / 1000);
    const volume = Number(c.volume);
    porTempo.set(time, {
      time,
      value: Number.isFinite(volume) && volume > 0 ? volume : 0,
      // Empate (fechou no mesmo preço que abriu) conta como alta, igual
      // ao candle, que nesse caso é desenhado com a cor de alta.
      color: c.fechamento >= c.abertura ? ALTA : BAIXA,
    });
  }
  return [...porTempo.values()].sort((a, b) => a.time - b.time);
}
