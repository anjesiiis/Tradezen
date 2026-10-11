// Histórico sob demanda: a página anterior de candles.
//
// A Binance dá anos de intraday; o Yahoo corta 60 minutos em 60 dias.
// Então, em cripto, a primeira resposta é só o começo — o resto chega
// conforme se rola pro passado. Em ação e forex não há o que buscar: a
// primeira resposta já traz tudo o que existe.
import { API } from "../api.js";

export const CANDLES_POR_PAGINA = 1000;   // teto da Binance por requisição

/** Só cripto pagina (ver /ativo/{ticker}/pagina no backend). */
export function temHistoricoSobDemanda(ativo) {
  return ativo?.mercado === "CRIPTO";
}

/**
 * Busca os candles anteriores a `maisAntigo` (timestamp em ms).
 *
 * Devolve sempre o mesmo formato, mesmo quando dá errado — quem chama
 * usa `temMais:false` pra parar de pedir, em vez de tratar exceção. Rede
 * caída não pode virar laço de tentativas enquanto a pessoa rola.
 */
export async function buscarPaginaAnterior(ticker, intervalo, maisAntigo) {
  const vazio = { novos: [], temMais: false };
  if (!ticker || !maisAntigo) return vazio;
  try {
    const r = await fetch(`${API}/ativo/${encodeURIComponent(ticker)}/pagina`
      + `?intervalo=${intervalo}&antes_de=${maisAntigo}&limite=${CANDLES_POR_PAGINA}`);
    const d = await r.json();
    if (d.status !== "ok" || !d.candles?.length) return vazio;
    // a borda pode repetir se backend e gráfico discordarem de 1 ms
    const novos = d.candles.filter((c) => c.timestamp < maisAntigo);
    return novos.length ? { novos, temMais: Boolean(d.tem_mais) } : vazio;
  } catch (e) {
    console.warn("[histórico] não deu pra buscar mais candles:", e);
    return vazio;
  }
}
