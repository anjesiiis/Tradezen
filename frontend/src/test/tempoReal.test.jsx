import { aplicarAoVivo, precoDosCandles } from '../lib/grafico/cotacao.js';
import { ligarTempoReal, temTempoReal, INTERVALO_BINANCE } from '../lib/grafico/tempoReal.js';

const DIA = 24 * 60 * 60 * 1000;
const c = (fechamento, i = 0) => ({
  timestamp: Date.UTC(2026, 10, 26) + i * DIA,
  abertura: fechamento, maxima: fechamento + 1, minima: fechamento - 1,
  fechamento, volume: 1000,
});

describe('aplicarAoVivo — encaixar a vela em formação', () => {
  it('mesmo timestamp SUBSTITUI a última vela', () => {
    const serie = [c(100, 0), c(110, 1)];
    const vivo = { ...c(110, 1), fechamento: 115, maxima: 116 };
    const r = aplicarAoVivo(serie, vivo);
    expect(r).toHaveLength(2);
    expect(r[1].fechamento).toBe(115);
    expect(r[1].maxima).toBe(116);
  });

  it('timestamp mais novo ENTRA como vela nova (a hora virou)', () => {
    const serie = [c(100, 0), c(110, 1)];
    const r = aplicarAoVivo(serie, c(120, 2));
    expect(r).toHaveLength(3);
    expect(r[2].fechamento).toBe(120);
  });

  // Este é o caso que arruinaria a tela: trocar de ativo e receber um
  // tique atrasado do stream anterior reescreveria história já fechada.
  it('timestamp mais ANTIGO é descartado', () => {
    const serie = [c(100, 5), c(110, 6)];
    const r = aplicarAoVivo(serie, c(999, 1));
    expect(r).toEqual(serie);
  });

  it('candle ao vivo inválido não muda nada', () => {
    const serie = [c(100, 0)];
    for (const ruim of [null, undefined, {}, { timestamp: NaN, fechamento: 1 },
                        { timestamp: 1, fechamento: NaN }]) {
      expect(aplicarAoVivo(serie, ruim)).toEqual(serie);
    }
  });

  it('série vazia com vela ao vivo: a vela é a série', () => {
    expect(aplicarAoVivo([], c(42, 0))).toHaveLength(1);
  });
});

describe('o cabeçalho segue a vela ao vivo', () => {
  it('o preço do cabeçalho é o do tique, não o do último fetch', () => {
    const serie = [c(100, 0), c(110, 1)];
    const paradoAntes = precoDosCandles(serie);
    expect(paradoAntes.preco).toBe(110);

    // OHLC coerente, como a Binance manda: quando o preco passa a maxima,
    // ela sobe a maxima no mesmo quadro. Meu primeiro fixture tinha
    // maxima 111 com fechamento 117,5 — e o candle foi DESCARTADO pelo
    // candleUtilizavel do toLWCandles, caindo de volta pro preco antigo.
    const vivo = { ...c(110, 1), fechamento: 117.5, maxima: 117.5 };
    const agora = precoDosCandles(serie, vivo);
    expect(agora.preco).toBe(117.5);
    // e a variação é recalculada contra o fechamento anterior, não contra 110
    expect(agora.variacaoPct).toBeCloseTo(17.5, 10);
  });

  // O modo de falhar importa: vela ao vivo incoerente e DESCARTADA pelo
  // filtro do toLWCandles, e o cabecalho cai no ultimo preco bom em vez
  // de mostrar numero quebrado. E o lado certo pra errar.
  it('vela ao vivo com OHLC impossível é descartada, e o preço antigo fica', () => {
    const serie = [c(100, 0), c(110, 1)];
    const incoerente = { ...c(110, 1), fechamento: 999, maxima: 111 };
    expect(precoDosCandles(serie, incoerente).preco).toBe(100);
  });

  it('sem vela ao vivo, nada muda (o caminho de quem não é cripto)', () => {
    const serie = [c(100, 0), c(110, 1)];
    expect(precoDosCandles(serie, null)).toEqual(precoDosCandles(serie));
  });
});

describe('temTempoReal — quem tem stream', () => {
  it('cripto nos timeframes do app', () => {
    for (const tf of ['1m', '5m', '15m', '60m', '1d', '1wk']) {
      expect(temTempoReal('BTCUSDT', tf)).toBe(true);
    }
  });

  it('o 60m do app virou 1h da Binance, que é o nome que ela entende', () => {
    expect(INTERVALO_BINANCE['60m']).toBe('1h');
    expect(INTERVALO_BINANCE['1wk']).toBe('1w');
  });

  it('sem símbolo da Binance (B3, forex, commodity) não tem stream', () => {
    expect(temTempoReal(null, '60m')).toBe(false);
    expect(temTempoReal(undefined, '1d')).toBe(false);
  });

  it('timeframe que a Binance não tem não liga stream', () => {
    expect(temTempoReal('BTCUSDT', '3s')).toBe(false);
    expect(temTempoReal('BTCUSDT', 'inventado')).toBe(false);
  });
});

describe('ligarTempoReal — o ciclo da conexão', () => {
  let criados;
  const original = global.WebSocket;

  beforeEach(() => {
    criados = [];
    global.WebSocket = class {
      constructor(url) { this.url = url; criados.push(this); }
      close() { this.fechado = true; }
    };
  });
  afterEach(() => { global.WebSocket = original; });

  it('abre o stream de kline do par e do intervalo certos', () => {
    const desligar = ligarTempoReal('BTCUSDT', '60m', () => {});
    expect(criados).toHaveLength(1);
    expect(criados[0].url).toBe('wss://stream.binance.com:9443/ws/btcusdt@kline_1h');
    desligar();
  });

  it('não abre nada sem símbolo ou com timeframe que a Binance não tem', () => {
    ligarTempoReal(null, '60m', () => {});
    ligarTempoReal('BTCUSDT', 'nao-existe', () => {});
    expect(criados).toHaveLength(0);
  });

  it('entrega o candle convertido pra forma do projeto', () => {
    const recebidos = [];
    const desligar = ligarTempoReal('BTCUSDT', '60m', (c) => recebidos.push(c));
    criados[0].onmessage({ data: JSON.stringify({
      k: { t: 1700000000000, o: '100.5', h: '101', l: '99', c: '100.75', v: '12.5', x: false },
    }) });
    expect(recebidos).toHaveLength(1);
    expect(recebidos[0]).toMatchObject({
      timestamp: 1700000000000, abertura: 100.5, maxima: 101,
      minima: 99, fechamento: 100.75, volume: 12.5, emFormacao: true,
    });
    desligar();
  });

  it('mensagem estranha não derruba o stream', () => {
    const recebidos = [];
    const desligar = ligarTempoReal('BTCUSDT', '60m', (c) => recebidos.push(c));
    expect(() => criados[0].onmessage({ data: 'isso nao e json' })).not.toThrow();
    expect(() => criados[0].onmessage({ data: '{}' })).not.toThrow();
    expect(recebidos).toHaveLength(0);
    desligar();
  });

  // Sem isto, fechar um gráfico do multichart agendaria reconexão de um
  // stream que já saiu da tela — e com oito mesas isso vira oito
  // conexões zumbis reabrindo sozinhas.
  it('desligar fecha o socket e NÃO reconecta', () => {
    vi.useFakeTimers();
    const desligar = ligarTempoReal('BTCUSDT', '60m', () => {});
    const ws = criados[0];
    desligar();
    expect(ws.fechado).toBe(true);
    expect(ws.onclose).toBeNull();
    vi.advanceTimersByTime(120000);
    expect(criados).toHaveLength(1);   // nenhuma reconexão
    vi.useRealTimers();
  });

  it('se a conexão cai sozinha, reconecta com recuo crescente', () => {
    vi.useFakeTimers();
    const desligar = ligarTempoReal('BTCUSDT', '60m', () => {});
    criados[0].onclose();
    vi.advanceTimersByTime(1000);
    expect(criados).toHaveLength(2);

    criados[1].onclose();
    vi.advanceTimersByTime(1000);
    expect(criados).toHaveLength(2);    // ainda não: a espera dobrou
    vi.advanceTimersByTime(1000);
    expect(criados).toHaveLength(3);

    desligar();
    vi.useRealTimers();
  });

  it('avisa o estado da conexão pra tela poder dizer "ao vivo"', () => {
    const estados = [];
    const desligar = ligarTempoReal('BTCUSDT', '60m', () => {}, (e) => estados.push(e));
    criados[0].onopen();
    expect(estados).toContain('ligado');
    desligar();
  });
});
