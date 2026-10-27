import { FERRAMENTA_INFO, manterLarguraDoCanal, pontoDaParalela, _desenharDesenhoUsuario } from '../lib/grafico/desenhos.js';
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

  // Este teste fixava o comportamento ANTIGO (ir até a borda do canvas).
  // Foi mudado por pedido do dono: a medição vale no trecho marcado, e
  // atravessar o gráfico inteiro tapava candles que não tinham nada a ver.
  it('as linhas são horizontais e param no 2º ponto', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'fibo', pontos: [{ logical: 2, preco: 10 }, { logical: 8, preco: 20 }],
    }, false, 640);

    for (const [x1, y1, x2, y2] of ctx.linhas) {
      expect(y1).toBe(y2);        // horizontal
      expect(x1).toBe(20);        // começa no ponto mais antigo (logical 2)
      expect(x2).toBe(80);        // e termina no outro (logical 8)
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

  // Voltou a ser 3 por pedido do dono: os dois primeiros cliques são a
  // base e o terceiro escolhe a largura, como no TradingView. Antes a
  // largura saía do maior desvio dos candles.
  it('são 3 cliques: a base e a largura', () => {
    expect(FERRAMENTA_INFO.canal.npontos).toBe(3);
    expect(FERRAMENTA_INFO.canal.hints).toHaveLength(3);
  });

  // `arrasta` é o que liga o desenho por segurar-e-puxar no CandleChart
  // (o gesto que funciona de dedo). As outras ferramentas seguem só no
  // clique — ligar arraste nelas mudaria o jeito de usar sem pedido.
  it('o canal aceita arraste; as outras ferramentas, não', () => {
    expect(FERRAMENTA_INFO.canal.arrasta).toBe(true);
    for (const id of ['trend', 'horizontal', 'retangulo_desenho', 'texto', 'fibo']) {
      expect(FERRAMENTA_INFO[id].arrasta, id).toBeUndefined();
    }
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

    // base, paralela e a mediana pontilhada no meio
    expect(ctx.linhas).toHaveLength(3);
    const [base, paralela, mediana] = ctx.linhas;
    // mesma inclinação nas três: é o que faz delas paralelas
    const incl = ([x0, y0, x1, y1]) => (y1 - y0) / (x1 - x0);
    expect(incl(base)).toBeCloseTo(incl(paralela), 10);
    expect(incl(base)).toBeCloseTo(incl(mediana), 10);
    // e a mediana fica exatamente no meio das duas
    expect(mediana[1]).toBeCloseTo((base[1] + paralela[1]) / 2, 10);
    expect(mediana[3]).toBeCloseTo((base[3] + paralela[3]) / 2, 10);
  });
});

describe('Linha de tendência — comprimento', () => {
  const pontos = [{ logical: 1, preco: 100 }, { logical: 5, preco: 140 }];
  // toX: logical*10  → x1=10, x2=50
  // toY: 500-preco   → y1=400, y2=360

  // o bug: a linha ia sempre até a borda direita do canvas, então marcar um
  // fundo e um topo desenhava uma reta que fugia do trecho marcado
  it('sem modo contínuo, vai exatamente de um clique ao outro', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, { tipo: 'trend', pontos }, false, 800);

    expect(ctx.linhas[0]).toEqual([10, 400, 50, 360]);
  });

  it('desenho antigo, salvo sem o campo, cai no modo limitado', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, { tipo: 'trend', pontos }, false, 800);
    const semCampo = ctx.linhas[0];

    const ctx2 = ctxFalso();
    _desenharDesenhoUsuario(ctx2, toX, toY, { tipo: 'trend', pontos, continua: false }, false, 800);

    expect(semCampo).toEqual(ctx2.linhas[0]);
  });

  it('com modo contínuo, atravessa o gráfico de borda a borda', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, { tipo: 'trend', pontos, continua: true }, false, 800);

    // inclinação -1 por pixel de x: de (10,400) a (50,360)
    const [x0, y0, x1, y1] = ctx.linhas[0];
    expect(x0).toBe(0);
    expect(x1).toBe(800);
    expect(y0).toBe(410);    // 400 + (-1)*(0-10)
    expect(y1).toBe(-390);   // 360 + (-1)*(800-50)
  });

  it('marcar da direita pra esquerda dá a mesma reta', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'trend', pontos: [pontos[1], pontos[0]], continua: true,
    }, false, 800);

    expect(ctx.linhas[0]).toEqual([0, 410, 800, -390]);
  });
});

describe('Fibonacci — comprimento das linhas', () => {
  // o bug: as linhas seguiam até a borda direita do canvas e tapavam todos
  // os candles que vieram depois do movimento medido
  it('as linhas param no 2º ponto, não na borda do gráfico', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'fibo', pontos: [{ logical: 2, preco: 100 }, { logical: 8, preco: 160 }],
    }, false, 900);

    // toX: logical*10 → o intervalo marcado vai de x=20 a x=80
    expect(ctx.linhas.length).toBeGreaterThan(0);
    ctx.linhas.forEach(([x0, , x1]) => {
      expect(x0).toBe(20);
      expect(x1).toBe(80);
    });
  });

  it('marcar da direita pra esquerda dá o mesmo intervalo', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'fibo', pontos: [{ logical: 8, preco: 160 }, { logical: 2, preco: 100 }],
    }, false, 900);

    ctx.linhas.forEach(([x0, , x1]) => {
      expect(x0).toBe(20);
      expect(x1).toBe(80);
    });
  });
});

describe('Canal paralelo — comprimento', () => {
  // toX: logical*10 → o trecho marcado vai de x=20 a x=70
  const base = [{ logical: 2, preco: 100 }, { logical: 7, preco: 130 }];
  const paralela = { logical: 4, preco: 90 };

  // o bug: as duas linhas e a faixa sombreada seguiam até a borda direita
  // do canvas, como se o canal valesse pro gráfico inteiro
  it('as duas linhas param no 2º clique', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'canal', pontos: [...base, paralela],
    }, false, 900);

    expect(ctx.linhas.length).toBe(3);          // base, paralela e mediana
    ctx.linhas.forEach(([x0, , x1]) => {
      expect(x0).toBe(20);
      expect(x1).toBe(70);
    });
  });

  it('com só a linha base (preview), também para no 2º ponto', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, { tipo: 'canal', pontos: base }, false, 900);

    expect(ctx.linhas[0][0]).toBe(20);
    expect(ctx.linhas[0][2]).toBe(70);
  });

  it('marcar da direita pra esquerda dá o mesmo trecho', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'canal', pontos: [base[1], base[0], paralela],
    }, false, 900);

    ctx.linhas.forEach(([x0, , x1]) => {
      expect(x0).toBe(20);
      expect(x1).toBe(70);
    });
  });

  // a paralela nasce da inclinação da base: ela não pode virar horizontal
  it('a paralela mantém a inclinação da linha base', () => {
    const ctx = ctxFalso();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'canal', pontos: [...base, paralela],
    }, false, 900);

    const [[, yBase0, , yBase1], [, yPar0, , yPar1]] = ctx.linhas;
    expect(yBase1 - yBase0).toBe(yPar1 - yPar0);
    expect(yPar0).not.toBe(yBase0);              // e é outra linha, não a mesma
  });
});

describe('Canal — largura ao girar a base', () => {
  // base reta no preço 100, paralela 20 acima
  const canal = [
    { logical: 0, preco: 100 },
    { logical: 10, preco: 100 },
    { logical: 5, preco: 120 },
  ];
  const larguraEm = (pontos, logical) => {
    const [a, b, c] = pontos;
    const naBase = a.preco + (b.preco - a.preco) * (logical - a.logical) / (b.logical - a.logical);
    return c.preco - naBase;
  };

  // o bug que isto evita: o 3º ponto é posição absoluta, então inclinar a
  // base por baixo dele apertava ou abria o canal sozinho
  it('arrastar o ponto A gira o canal sem mudar a largura', () => {
    const depois = canal.slice();
    depois[0] = { logical: 0, preco: 60 };      // A desceu 40

    const r = manterLarguraDoCanal(canal, depois, 0);

    expect(larguraEm(r, r[2].logical)).toBeCloseTo(20, 10);
    expect(r[0]).toEqual(depois[0]);            // A foi pra onde foi solto
    expect(r[2].logical).toBe(canal[2].logical);
  });

  it('arrastar o ponto B também mantém a largura', () => {
    const depois = canal.slice();
    depois[1] = { logical: 10, preco: 180 };

    const r = manterLarguraDoCanal(canal, depois, 1);

    expect(larguraEm(r, r[2].logical)).toBeCloseTo(20, 10);
  });

  // mexer na própria largura é o ponto 2: aí o que a pessoa escolheu vale
  it('arrastar o 3º ponto muda a largura, como deve', () => {
    const depois = canal.slice();
    depois[2] = { logical: 5, preco: 150 };

    const r = manterLarguraDoCanal(canal, depois, 2);

    expect(r).toEqual(depois);
    expect(larguraEm(r, r[2].logical)).toBeCloseTo(50, 10);
  });

  it('canal antigo, só com a base, passa batido', () => {
    const soBase = [canal[0], canal[1]];
    expect(manterLarguraDoCanal(soBase, soBase, 0)).toEqual(soBase);
  });

  it('base vertical (os dois cliques no mesmo ponto) não quebra', () => {
    const vertical = [{ logical: 3, preco: 100 }, { logical: 3, preco: 140 }, { logical: 3, preco: 160 }];
    const depois = vertical.slice();
    depois[0] = { logical: 3, preco: 90 };

    const r = manterLarguraDoCanal(vertical, depois, 0);
    expect(Number.isFinite(r[2].preco)).toBe(true);
  });
});
