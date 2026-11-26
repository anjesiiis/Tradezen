/**
 * TRADEZEN — PREÇO AO VIVO DA CRIPTO, DIRETO DA BINANCE
 * =====================================================
 *
 * O QUE ISTO CONSERTA, MEDIDO
 * O gráfico buscava os candles UMA vez e congelava: zero polling, zero
 * websocket. Somado ao cache de 5 minutos do backend, uma amostragem de
 * um minuto deu isto, com BTC:
 *
 *   TradeZen 60486,98 (parado)  |  Binance 60533 … 60558 (andando)
 *
 * Diferença de US$ 46 a 72, e crescendo enquanto a aba fica aberta. O
 * dado nunca esteve errado — estava velho. E a fonte não era o problema:
 * cripto já vem da Binance, a mesma do TradingView.
 *
 * POR QUE DIRETO DO NAVEGADOR, SEM PASSAR PELO NOSSO BACKEND
 * Porque o stream da Binance é público e de graça. Passar por nós
 * significaria manter uma conexão aberta por usuário no Render (plano
 * free, 512MB) só pra repetir um dado que o navegador pega sozinho. É
 * assim que o TradingView faz, e o custo pra gente é zero.
 *
 * O QUE ISTO **NÃO** COBRE
 * Só cripto. B3, forex e commodities vêm do Yahoo, que não tem stream
 * público — e para a B3 o atraso de ~15 min é da licença da bolsa, não
 * nosso. Não existe conserto de graça para esse lado.
 *
 * A reconexão é com recuo crescente e teto: cair em loop de conexão num
 * celular com rede ruim gastaria bateria e dados do usuário.
 */

// O id de timeframe do app → o intervalo que a Binance entende.
// Só os que ela tem: ela não tem "1wk" com esse nome, e não tem nada
// abaixo de 1m. Timeframe fora deste mapa simplesmente não liga o tempo
// real, e o gráfico segue funcionando como antes.
const INTERVALO_BINANCE = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
  "60m": "1h", "1h": "1h", "4h": "4h",
  "1d": "1d", "1wk": "1w", "1mo": "1M",
};

const ESPERA_INICIAL = 1000;
const ESPERA_MAXIMA = 30000;

/** A Binance manda o candle em texto; aqui ele vira a forma do projeto. */
function candleDoStream(k) {
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const fechamento = num(k.c);
  if (fechamento === null) return null;
  return {
    // `t` é a abertura do candle, que é o timestamp que o projeto usa.
    timestamp: k.t,
    abertura: num(k.o),
    maxima: num(k.h),
    minima: num(k.l),
    fechamento,
    volume: num(k.v) ?? 0,
    // marca de que esta vela ainda está se formando (a Binance manda
    // `x: true` quando ela fecha). Quem desenha não precisa saber, mas
    // quem depura precisa.
    emFormacao: k.x === false,
  };
}

/**
 * Liga o tempo real de um par. Devolve a função que desliga.
 *
 * `aoReceber` é chamado com o candle em formação a cada tique. Quem chama
 * decide o que fazer com ele — e é de propósito que esta função não
 * guarda estado nenhum: assim duas mesas do multichart no mesmo par
 * abrem dois streams independentes e nenhuma mexe no estado da outra.
 */
export function ligarTempoReal(simboloBinance, timeframe, aoReceber, aoMudarEstado) {
  const intervalo = INTERVALO_BINANCE[timeframe];
  if (!simboloBinance || !intervalo || typeof WebSocket === "undefined") {
    return () => {};
  }

  const fluxo = `${simboloBinance.toLowerCase()}@kline_${intervalo}`;
  const endereco = `wss://stream.binance.com:9443/ws/${fluxo}`;

  let ws = null;
  let desligado = false;
  let espera = ESPERA_INICIAL;
  let reconexao = null;

  const avisar = (estado) => { try { aoMudarEstado?.(estado); } catch { /* quem ouve não pode derrubar o stream */ } };

  const conectar = () => {
    if (desligado) return;
    try {
      ws = new WebSocket(endereco);
    } catch {
      agendarReconexao();
      return;
    }

    ws.onopen = () => { espera = ESPERA_INICIAL; avisar("ligado"); };

    ws.onmessage = (evento) => {
      try {
        const dados = JSON.parse(evento.data);
        const k = dados?.k;
        if (!k) return;
        const candle = candleDoStream(k);
        if (candle) aoReceber(candle);
      } catch {
        // mensagem que não é o que esperávamos: ignorar é melhor que
        // derrubar a conexão por causa de um quadro estranho
      }
    };

    ws.onerror = () => { avisar("erro"); };

    ws.onclose = () => {
      if (desligado) return;
      avisar("caiu");
      agendarReconexao();
    };
  };

  const agendarReconexao = () => {
    if (desligado) return;
    clearTimeout(reconexao);
    reconexao = setTimeout(conectar, espera);
    // Recuo crescente com teto: a Binance fecha a conexão a cada 24h por
    // política, e rede de celular cai sozinha. Insistir de 1 em 1 segundo
    // nessas horas queima bateria e dados sem adiantar nada.
    espera = Math.min(espera * 2, ESPERA_MAXIMA);
  };

  conectar();

  return () => {
    desligado = true;
    clearTimeout(reconexao);
    // onclose é limpo ANTES de fechar: sem isso o nosso próprio close
    // agendaria uma reconexão para um gráfico que já saiu da tela.
    if (ws) { ws.onclose = null; try { ws.close(); } catch { /* já fechado */ } }
  };
}

/** Este timeframe tem stream na Binance? */
export function temTempoReal(simboloBinance, timeframe) {
  return Boolean(simboloBinance && INTERVALO_BINANCE[timeframe]);
}

export { INTERVALO_BINANCE };
