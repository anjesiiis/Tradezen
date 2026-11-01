import { PROJETAVEIS, _desenharDesenhoUsuario, _noCorpoDoDesenho } from '../lib/grafico/desenhos.js';

// O pedido era "ver onde o canal estaria nos próximos candles". Já existia
// a flag `continua` na linha de tendência (duplo clique no 2º ponto); o que
// faltava era o canal e o Fibonacci obedecerem a ela. Estes testes medem
// ATÉ ONDE cada linha é desenhada — é o que a projeção muda.

const LARGURA = 600;
const ALTURA = 400;

// Canvas falso que guarda os traços. `save`/`restore` empilham de verdade:
// sem isso um globalAlpha deixado pra trás não apareceria no teste.
function canvasFalso() {
  const estado = { globalAlpha: 1, strokeStyle: '#000', lineWidth: 1, dash: [] };
  const pilha = [];
  const traços = [];   // [{de:[x,y], para:[x,y], alpha, dash}]
  let atual = null;
  const preenchimentos = [];
  let caminho = [];

  const ctx = {
    canvas: { width: LARGURA, height: ALTURA },
    set globalAlpha(v) { estado.globalAlpha = v; }, get globalAlpha() { return estado.globalAlpha; },
    set strokeStyle(v) { estado.strokeStyle = v; }, get strokeStyle() { return estado.strokeStyle; },
    set fillStyle(v) { estado.fillStyle = v; }, get fillStyle() { return estado.fillStyle; },
    set lineWidth(v) { estado.lineWidth = v; }, get lineWidth() { return estado.lineWidth; },
    set font(v) { estado.font = v; }, get font() { return estado.font; },
    set textAlign(v) {}, set textBaseline(v) {}, set lineCap(v) {}, set lineJoin(v) {},
    set shadowColor(v) {}, set shadowBlur(v) {},
    save: () => pilha.push({ ...estado }),
    restore: () => Object.assign(estado, pilha.pop() || {}),
    setLineDash: (d) => { estado.dash = d; },
    beginPath: () => { atual = null; caminho = []; },
    moveTo: (x, y) => { atual = [x, y]; caminho.push([x, y]); },
    lineTo: (x, y) => {
      caminho.push([x, y]);
      if (atual) traços.push({ de: atual, para: [x, y], alpha: estado.globalAlpha, dash: [...estado.dash] });
      atual = [x, y];
    },
    arc: () => {}, closePath: () => {}, stroke: () => {},
    fill: () => preenchimentos.push([...caminho]),
    fillText: () => {}, strokeText: () => {}, rect: () => {}, fillRect: () => {},
    measureText: (t) => ({ width: (t || '').length * 6 }),
  };
  return { ctx, traços, preenchimentos };
}

// Converte índice lógico e preço em pixel com uma escala simples e sabida,
// pra as contas do teste serem verificáveis a olho.
const toLogX = (l) => l * 10;
const toPrecoY = (p) => ALTURA - p;

function desenhar(d) {
  const { ctx, traços, preenchimentos } = canvasFalso();
  // (ctx, toLogX, toPrecoY, d, isSel, canvasWidth, preview, canvasHeight)
  _desenharDesenhoUsuario(ctx, toLogX, toPrecoY, d, false, LARGURA, false, ALTURA);
  return { traços, preenchimentos };
}

// Os traços longos — descarta setas, âncoras e enfeites curtos.
const retas = (traços) => traços.filter((t) => Math.abs(t.para[0] - t.de[0]) > 50);
const extremos = (traços) => {
  const xs = retas(traços).flatMap((t) => [t.de[0], t.para[0]]);
  return { min: Math.min(...xs), max: Math.max(...xs) };
};

const CANAL = {
  id: 'c1', tipo: 'canal',
  pontos: [{ logical: 10, preco: 100 }, { logical: 30, preco: 140 }, { logical: 20, preco: 200 }],
};
const FIBO = {
  id: 'f1', tipo: 'fibo',
  pontos: [{ logical: 10, preco: 100 }, { logical: 30, preco: 200 }],
};
const TREND = {
  id: 't1', tipo: 'trend',
  pontos: [{ logical: 10, preco: 100 }, { logical: 30, preco: 140 }],
};

describe('Projeção — a flag `continua` é a mesma nas três ferramentas', () => {
  it('só projetam as ferramentas que têm pra onde projetar', () => {
    expect([...PROJETAVEIS].sort()).toEqual(['canal', 'fibo', 'trend']);
    // retângulo infinito é uma faixa; vertical e texto não têm "pra frente"
    for (const t of ['retangulo_desenho', 'vertical', 'texto', 'triangulo_desenho', 'regua']) {
      expect(PROJETAVEIS.has(t), t).toBe(false);
    }
  });

  // Desenho salvo antes desta mudança não tem o campo. Tem que continuar
  // saindo limitado, e não virar projeção de surpresa no próximo refresh.
  it.each([['canal', CANAL], ['fibo', FIBO], ['trend', TREND]])(
    '%s sem o campo `continua` sai limitado, como o salvo ontem',
    (_nome, base) => {
      const semCampo = desenhar(base);
      const explicito = desenhar({ ...base, continua: false });

      expect(extremos(semCampo.traços)).toEqual(extremos(explicito.traços));
      expect(extremos(semCampo.traços).max).toBeLessThan(LARGURA);
    },
  );
});

describe('Canal paralelo projetado', () => {
  it('limitado, as linhas param no 2º clique', () => {
    const { min, max } = extremos(desenhar(CANAL).traços);

    expect(min).toBeCloseTo(toLogX(10), 0);
    expect(max).toBeCloseTo(toLogX(30), 0);
  });

  it('projetado, as linhas vão de borda a borda', () => {
    const { min, max } = extremos(desenhar({ ...CANAL, continua: true }).traços);

    expect(min).toBe(0);
    expect(max).toBe(LARGURA);
  });

  // "as três linhas (superior, inferior, mediana)" — a mediana é a
  // pontilhada, e tem que acompanhar junto, senão o canal projetado fica
  // com duas bordas longas e um tracinho curto no meio.
  it('as três linhas acompanham, mediana incluída', () => {
    const longas = retas(desenhar({ ...CANAL, continua: true }).traços)
      .filter((t) => t.de[0] === 0 && t.para[0] === LARGURA);

    expect(longas.length).toBeGreaterThanOrEqual(3);
    expect(longas.some((t) => t.dash.length > 0), 'a mediana é pontilhada').toBe(true);
  });

  // A projeção tem que seguir a inclinação dos dois cliques, não inventar
  // outra: é a regra do pedido que não se pode quebrar.
  it('a inclinação da projeção é a dos dois pontos marcados', () => {
    const esperada = (toPrecoY(140) - toPrecoY(100)) / (toLogX(30) - toLogX(10));

    for (const t of retas(desenhar({ ...CANAL, continua: true }).traços)) {
      const m = (t.para[1] - t.de[1]) / (t.para[0] - t.de[0]);
      expect(m).toBeCloseTo(esperada, 6);
    }
  });

  // A largura é o 3º ponto. Projetar não pode mexer nela — senão o canal
  // abre ou fecha sozinho ao ser projetado.
  it('a largura do canal não muda ao projetar', () => {
    const noMeio = (traços) => {
      const ys = retas(traços)
        .map((t) => {
          const m = (t.para[1] - t.de[1]) / (t.para[0] - t.de[0]);
          return t.de[1] + m * (toLogX(20) - t.de[0]);
        })
        .sort((a, b) => a - b);
      return ys[ys.length - 1] - ys[0];
    };

    expect(noMeio(desenhar({ ...CANAL, continua: true }).traços))
      .toBeCloseTo(noMeio(desenhar(CANAL).traços), 6);
  });

  it('a faixa sombreada também se estende', () => {
    const { preenchimentos } = desenhar({ ...CANAL, continua: true });
    const xs = preenchimentos.flat().map((p) => p[0]);

    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(LARGURA);
  });
});

describe('Fibonacci projetado', () => {
  it('limitado, os níveis param nos dois cliques', () => {
    const { min, max } = extremos(desenhar(FIBO).traços);

    expect(min).toBeCloseTo(toLogX(10), 0);
    expect(max).toBeCloseTo(toLogX(30), 0);
  });

  it('projetado, os níveis atravessam o gráfico', () => {
    const { min, max } = extremos(desenhar({ ...FIBO, continua: true }).traços);

    expect(min).toBe(0);
    expect(max).toBe(LARGURA);
  });

  // Nível de Fibonacci é horizontal: o PREÇO de cada um não pode mudar ao
  // projetar, só o comprimento da linha.
  it('os preços dos níveis não mudam ao projetar', () => {
    const alturas = (d) => [...new Set(retas(desenhar(d).traços).map((t) => t.de[1]))].sort((a, b) => a - b);

    expect(alturas({ ...FIBO, continua: true })).toEqual(alturas(FIBO));
  });

  it('todo nível fica horizontal depois de projetado', () => {
    for (const t of retas(desenhar({ ...FIBO, continua: true }).traços)) {
      expect(t.para[1]).toBeCloseTo(t.de[1], 6);
    }
  });
});

describe('Arrastar o desenho projetado', () => {
  const pts = (d) => d.pontos.map((p) => ({ x: toLogX(p.logical), y: toPrecoY(p.preco), ...p }));

  // Sem isto o canal se via atravessando o gráfico mas só respondia ao
  // arrasto no trecho marcado — parecia desenho travado.
  it('a projeção do canal responde ao arrasto fora do trecho marcado', () => {
    const d = { ...CANAL, continua: true };
    const p = pts(d);
    const m = (p[1].y - p[0].y) / (p[1].x - p[0].x);
    const xLonge = 500;                       // além do 2º ponto (x=300)
    const yNaBase = p[0].y + m * (xLonge - p[0].x);

    expect(_noCorpoDoDesenho(d, p, xLonge, yNaBase)).toBe(true);
    expect(_noCorpoDoDesenho(CANAL, p, xLonge, yNaBase)).toBe(false);
  });

  // A faixa projetada pode cobrir meio gráfico. Se ela agarrasse o arrasto
  // inteira, o pan do gráfico sumia naquela área sem explicação.
  it('fora do trecho marcado agarra só as linhas, não a faixa toda', () => {
    const d = { ...CANAL, continua: true };
    const p = pts(d);
    const m = (p[1].y - p[0].y) / (p[1].x - p[0].x);
    const xLonge = 500;
    const yNaBase = p[0].y + m * (xLonge - p[0].x);
    const offset = p[2].y - (p[0].y + m * (p[2].x - p[0].x));

    // no meio da faixa, longe das três linhas: é pan, não é o desenho
    expect(_noCorpoDoDesenho(d, p, xLonge, yNaBase + offset * 0.27)).toBe(false);
    // e as três linhas continuam pegáveis
    expect(_noCorpoDoDesenho(d, p, xLonge, yNaBase + offset)).toBe(true);
    expect(_noCorpoDoDesenho(d, p, xLonge, yNaBase + offset / 2)).toBe(true);
  });

  // Dentro do trecho marcado o comportamento é o de antes: a faixa inteira
  // é corpo, porque é ali que ela foi desenhada de propósito.
  it('dentro do trecho marcado a faixa inteira continua sendo corpo', () => {
    const d = { ...CANAL, continua: true };
    const p = pts(d);
    const m = (p[1].y - p[0].y) / (p[1].x - p[0].x);
    const xDentro = toLogX(20);
    const yNaBase = p[0].y + m * (xDentro - p[0].x);
    const offset = p[2].y - (p[0].y + m * (p[2].x - p[0].x));

    expect(_noCorpoDoDesenho(d, p, xDentro, yNaBase + offset * 0.27)).toBe(true);
  });

  it('a projeção do Fibonacci responde ao arrasto nos níveis estendidos', () => {
    const d = { ...FIBO, continua: true };
    const p = pts(d);
    const xLonge = 500;

    expect(_noCorpoDoDesenho(d, p, xLonge, p[0].y)).toBe(true);     // nível 0%
    expect(_noCorpoDoDesenho(FIBO, p, xLonge, p[0].y)).toBe(false);
    // Entre dois níveis continua sendo pan: é ali que ficam os candles que
    // se está medindo. 0,9 do caminho porque é o maior vão da escala
    // (0,786 → 1); a metade seria o nível de 50% em cheio.
    expect(_noCorpoDoDesenho(d, p, xLonge, p[0].y + (p[1].y - p[0].y) * 0.9)).toBe(false);
  });
});
