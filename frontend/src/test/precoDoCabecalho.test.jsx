import { precoDosCandles } from '../lib/grafico/cotacao.js';
import { toLWCandles } from '../lib/grafico/indicadores.js';

// A forma REAL que o backend manda (main.py) e que vive no estado do
// ChartPane: chaves em portugues e timestamp em ms. Era aqui que eu ia
// errar — minha primeira versao leu `.close`, que so existe DEPOIS do
// toLWCandles.
const DIA = 24 * 60 * 60 * 1000;
const c = (fechamento, i = 0) => ({
  timestamp: Date.UTC(2026, 6, 1) + i * DIA,
  abertura: fechamento,
  maxima: fechamento + 1,
  minima: fechamento - 1,
  fechamento,
  volume: 1000,
});
const serie = (...precos) => precos.map((p, i) => c(p, i));

describe('precoDosCandles — o preço do cabeçalho sai dos candles', () => {
  it('usa o close do ÚLTIMO candle, que é o que a escala de preço destaca', () => {
    const r = precoDosCandles(serie(100, 200, 60678.21));
    expect(r.preco).toBe(60678.21);
  });

  it('variação é o último contra o fechamento do anterior', () => {
    const r = precoDosCandles(serie(100, 110));
    expect(r.preco).toBe(110);
    expect(r.variacaoPct).toBeCloseTo(10, 10);
    expect(r.alta).toBe(true);
  });

  it('queda vira alta=false', () => {
    const r = precoDosCandles(serie(200, 180));
    expect(r.variacaoPct).toBeCloseTo(-10, 10);
    expect(r.alta).toBe(false);
  });

  it('empate conta como alta (▲0,00%), igual ao resto do app', () => {
    const r = precoDosCandles(serie(50, 50));
    expect(r.variacaoPct).toBe(0);
    expect(r.alta).toBe(true);
  });

  // ── o que NÃO pode acontecer ──
  it('um candle só: preço sim, variação NÃO (não há com o que comparar)', () => {
    const r = precoDosCandles(serie(42));
    expect(r.preco).toBe(42);
    expect(r.variacaoPct).toBeNull();
    expect(r.alta).toBeNull();
  });

  it('sem candles: tudo nulo, e o cabeçalho não mostra preço nenhum', () => {
    for (const vazio of [[], null, undefined]) {
      const r = precoDosCandles(vazio);
      expect(r.preco).toBeNull();
      expect(r.variacaoPct).toBeNull();
    }
  });

  it('fechamento anterior zero não gera Infinity na tela', () => {
    const r = precoDosCandles(serie(0, 10));
    expect(r.preco).toBe(10);
    expect(r.variacaoPct).toBeNull();
    expect(Number.isFinite(r.variacaoPct)).toBe(false);
  });

  // Este caso ficou MELHOR do que eu previ, e vale registrar o porquê:
  // como a derivação passa por toLWCandles, o candle inválido é FILTRADO
  // (candleUtilizavel) em vez de virar "sem preço". Então um lixo no fim
  // do array não apaga o cabeçalho — ele cai, e o último candle bom
  // assume. É o mesmo que acontece no desenho do gráfico, que é o ponto.
  it('candle inválido no fim é descartado, e o último candle bom assume', () => {
    const r = precoDosCandles([...serie(10, 20), { timestamp: 99, fechamento: NaN }]);
    expect(r.preco).toBe(20);
  });

  it('o cabeçalho mostra o MESMO candle que o gráfico desenha, sempre', () => {
    // a prova direta: a última posição da série do gráfico tem que ser
    // exatamente o preço do cabeçalho, inclusive com dado fora de ordem
    const foraDeOrdem = [c(10, 5), c(30, 1), c(20, 3)];
    const doGrafico = toLWCandles(foraDeOrdem);
    const doCabecalho = precoDosCandles(foraDeOrdem);
    expect(doCabecalho.preco).toBe(doGrafico[doGrafico.length - 1].close);
    // e NÃO é a última posição do array cru, que seria 20
    expect(doCabecalho.preco).toBe(10);
  });

  it('não é afetado por candles antigos adicionados no começo (paginação de cripto)', () => {
    const agora = precoDosCandles(serie(100, 110));
    const comHistorico = precoDosCandles(serie(1, 2, 3, 100, 110));
    expect(comHistorico.preco).toBe(agora.preco);
    expect(comHistorico.variacaoPct).toBe(agora.variacaoPct);
  });

  // ── os edge cases do pedido ──
  it('EDGE: mercado fechado — último candle de sexta continua sendo o preço', () => {
    // nada de especial a fazer: o último candle É o último pregão
    const sexta = precoDosCandles(serie(38.10, 38.42));
    expect(sexta.preco).toBe(38.42);
    expect(sexta.variacaoPct).toBeCloseTo(0.8398, 3);
  });

  it('EDGE: candle em formação — o close dele é o preço de agora', () => {
    // candle do dia ainda aberto: o `fechamento` dele é o preço de agora
    const emFormacao = { timestamp: Date.UTC(2026, 6, 2), abertura: 100,
                         maxima: 105, minima: 99, fechamento: 103.5 };
    const r = precoDosCandles([c(100), emFormacao]);
    expect(r.preco).toBe(103.5);     // acompanha o candle aberto
    expect(r.variacaoPct).toBeCloseTo(3.5, 10);
  });

  it('EDGE: depois do fechamento nada muda — mesma entrada, mesma saída', () => {
    const entrada = serie(100, 101);
    expect(precoDosCandles(entrada)).toEqual(precoDosCandles(entrada));
  });

  it('serve pra qualquer mercado: não olha ticker nem moeda', () => {
    // BTC, ação, forex e commodity passam pela MESMA função — era a
    // existência de dois caminhos que criava a divergência
    for (const v of [350123.45, 38.42, 5.4321, 1987.5]) {
      expect(precoDosCandles(serie(v - 1, v)).preco).toBe(v);
    }
  });
});

// ── O TESTE QUE TERIA PEGO O BUG ──────────────────────────────
// Os dados falsos já reproduzem a divergência de propósito: PETR4 vale
// 38,72 no resumo de /mercado (MERCADO_FAKE) e o último candle de
// CANDLES_FAKE fecha noutro valor. Se o cabeçalho voltar a ler o resumo,
// este teste falha.
describe('cabeçalho do gráfico na tela', () => {
  it('mostra o preço do último candle desenhado, não o do resumo de /mercado', async () => {
    const { screen, waitFor } = await import('@testing-library/react');
    const { renderApp } = await import('./helpers.jsx');
    const { CANDLES_FAKE, MERCADO_FAKE } = await import('./dadosFake.js');
    const { fmtP } = await import('../lib/mercado.js');
    const { createChart } = await import('lightweight-charts');

    const serieDoGrafico = toLWCandles(CANDLES_FAKE);
    const ultimo = serieDoGrafico[serieDoGrafico.length - 1].close;
    const doResumo = MERCADO_FAKE.find((a) => a.ticker === 'PETR4.SA').preco;
    // o cenário só testa algo se os dois forem diferentes
    expect(fmtP(ultimo)).not.toBe(fmtP(doResumo));

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    const preco = await waitFor(() => {
      const el = document.querySelector('.apr');
      expect(el).not.toBeNull();
      return el;
    }, { timeout: 5000 });

    expect(preco.textContent).toBe(fmtP(ultimo));
    expect(preco.textContent).not.toBe(fmtP(doResumo));
    expect(screen.queryByText(fmtP(doResumo))).not.toBeInTheDocument();
  });
});
