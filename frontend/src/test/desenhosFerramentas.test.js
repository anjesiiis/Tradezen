import { FERRAMENTA_INFO, pontoDaParalela, _desenharDesenhoUsuario } from '../lib/grafico/desenhos.js';
import { toLWCandles } from '../lib/grafico/indicadores.js';
import { CANDLES_FAKE } from './dadosFake.js';

// Um ctx de canvas que só anota o que foi pedido — dá pra afirmar sobre o
// desenho sem precisar de canvas de verdade.
function ctxFalso() {
  const ctx = {
    linhas: [], textos: [],
    _de: null,
    save(){}, restore(){}, beginPath(){}, closePath(){}, fill(){},
    setLineDash(){}, measureText(){ return { width: 10 }; },
    arc(){}, rect(){}, fillRect(){}, strokeRect(){}, translate(){}, rotate(){},
    moveTo(x,y){ this._de = [x,y]; },
    lineTo(x,y){ this._para = [x,y]; },
    stroke(){ if(this._de && this._para) this.linhas.push([...this._de, ...this._para]); },
    fillText(t,x,y){ this.textos.push({ t, x, y }); },
  };
  return ctx;
}

// preço → y invertido (como num gráfico: preço maior, y menor)
const toY = (preco) => 500 - preco;
const toX = (logical) => logical * 10;

describe('Fibonacci', () => {
  it('são 2 cliques, como as outras ferramentas', () => {
    expect(FERRAMENTA_INFO.fibo.npontos).toBe(2);
    expect(FERRAMENTA_INFO.fibo.hints).toHaveLength(2);
  });

  // o bug era este: o 0% ia sempre no preço mais ALTO dos dois pontos, então
  // marcar de baixo pra cima saía invertido
  it('o 1º clique é o 0% e o 2º é o 100%, mesmo marcando de baixo pra cima', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'fibo', pontos: [{ logical: 1, preco: 100 }, { logical: 5, preco: 200 }],
    }, false, 800);

    const rotulos = ctx.textos.map(t => t.t);
    expect(rotulos[0]).toBe('0.0% · 100.00');
    expect(rotulos[rotulos.length - 1]).toBe('100.0% · 200.00');
  });

  it('desenha os 7 níveis da retração', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'fibo', pontos: [{ logical: 0, preco: 0 }, { logical: 10, preco: 100 }],
    }, false, 800);

    expect(ctx.textos.map(t => t.t.split(' ·')[0])).toEqual([
      '0.0%', '23.6%', '38.2%', '50.0%', '61.8%', '78.6%', '100.0%',
    ]);
  });

  it('as linhas são horizontais e vão até a borda direita', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'fibo', pontos: [{ logical: 2, preco: 10 }, { logical: 8, preco: 20 }],
    }, false, 640);

    for (const [x1, y1, x2, y2] of ctx.linhas) {
      expect(y1).toBe(y2);        // horizontal
      expect(x1).toBe(20);        // começa no ponto mais antigo (logical 2)
      expect(x2).toBe(640);       // termina na borda
    }
  });
});

describe('Canal paralelo', () => {
  // `maxima`/`minima` é como o candle chega do backend — e é o que esta
  // função recebe. A versão anterior deste teste usava high/low, que só
  // existem na cópia convertida pro gráfico: passava verde enquanto o
  // canal saía com uma linha só no site. O teste abaixo trava isso.
  const candles = [
    { maxima: 12, minima: 10 },
    { maxima: 14, minima: 11 },
    { maxima: 30, minima: 12 },   // o pico
    { maxima: 16, minima: 13 },
    { maxima: 18, minima: 14 },
  ];

  it('usa os nomes de campo que o candle do projeto realmente tem', () => {
    // se alguém trocar maxima/minima por high/low, isto quebra na hora
    const comHighLow = toLWCandles(CANDLES_FAKE);
    expect(comHighLow[0]).toHaveProperty('high');
    expect(CANDLES_FAKE[0]).not.toHaveProperty('high');
    expect(CANDLES_FAKE[0]).toHaveProperty('maxima');

    // candle cru (o que a função recebe): acha a paralela
    expect(pontoDaParalela({ logical: 0, preco: CANDLES_FAKE[0].minima },
      { logical: 10, preco: CANDLES_FAKE[10].minima }, CANDLES_FAKE)).not.toBeNull();
    // candle convertido (o que ela NUNCA recebe): não acha nada
    expect(pontoDaParalela({ logical: 0, preco: 38 }, { logical: 10, preco: 38 }, comHighLow)).toBeNull();
  });

  it('são 2 cliques: a linha base. O 3º ponto não é mais pedido', () => {
    expect(FERRAMENTA_INFO.canal.npontos).toBe(2);
    expect(FERRAMENTA_INFO.canal.hints).toHaveLength(2);
  });

  it('a paralela passa pelo maior pico entre os dois cliques', () => {
    const p = pontoDaParalela({ logical: 0, preco: 10 }, { logical: 4, preco: 14 }, candles);

    expect(p).toEqual({ logical: 2, preco: 30 });
  });

  // dois topos clicados: o maior desvio é pra BAIXO, e é pra lá que a
  // paralela vai — é isso que impede o canal de sair invertido
  it('clicando em topos, a paralela desce', () => {
    const topos = [
      { maxima: 20, minima: 19 },
      { maxima: 21, minima: 5 },    // fundo bem abaixo da base
      { maxima: 22, minima: 20 },
    ];
    const p = pontoDaParalela({ logical: 0, preco: 20 }, { logical: 2, preco: 22 }, topos);

    expect(p.preco).toBe(5);
  });

  it('sem candle entre os cliques, não inventa largura', () => {
    expect(pontoDaParalela({ logical: 0, preco: 1 }, { logical: 0, preco: 2 }, candles)).toBeNull();
    expect(pontoDaParalela({ logical: 0, preco: 1 }, { logical: 4, preco: 2 }, [])).toBeNull();
  });

  it('com só os 2 pontos, desenha a linha base e não quebra', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'canal', pontos: [{ logical: 0, preco: 10 }, { logical: 4, preco: 14 }],
    }, false, 800);

    expect(ctx.linhas).toHaveLength(1);
  });

  it('com os 3 pontos, desenha as duas linhas paralelas', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'canal',
      pontos: [{ logical: 0, preco: 10 }, { logical: 4, preco: 14 }, { logical: 2, preco: 30 }],
    }, false, 800);

    expect(ctx.linhas).toHaveLength(2);
    const [base, paralela] = ctx.linhas;
    // mesma inclinação nas duas: é o que faz delas paralelas
    expect((base[3] - base[1]) / (base[2] - base[0]))
      .toBeCloseTo((paralela[3] - paralela[1]) / (paralela[2] - paralela[0]), 10);
  });
});
