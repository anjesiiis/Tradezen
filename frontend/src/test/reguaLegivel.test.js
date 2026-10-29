import { _desenharDesenhoUsuario } from '../lib/grafico/desenhos.js';

/**
 * A régua é o único desenho que existe PRA SER LIDO enquanto se arrasta —
 * ela some no clique seguinte, então não há um "depois" do qual o modo
 * "ainda colocando" precise distinguir. A 55% de opacidade, que é a marca
 * desse modo, os números dela sumiam em cima dos candles. Foi queixa de
 * usuário.
 */
// save/restore TÊM que empilhar o alfa: é assim que o canvas de verdade
// funciona, e é aí que mora o defeito. Com save/restore vazios, o
// globalAlpha=1 que o desenho do retângulo da régua já fazia "vazava"
// pelo restore e o teste passava mesmo com o bug — foi o que aconteceu na
// primeira versão deste arquivo.
const ctxEspiao = () => {
  const pilha = [];
  const alfas = [];
  const ctx = {
    _a: 1,
    save: () => pilha.push(ctx._a),
    restore: () => { if (pilha.length) ctx._a = pilha.pop(); },
    beginPath: () => {}, closePath: () => {},
    moveTo: () => {}, lineTo: () => {},
    stroke: () => ctx.tinta.push(ctx._a), fill: () => ctx.tinta.push(ctx._a),
    fillRect: () => ctx.tinta.push(ctx._a), strokeRect: () => ctx.tinta.push(ctx._a),
    rect: () => {}, roundRect: () => {},
    arc: () => {}, setLineDash: () => {}, measureText: (t) => ({ width: t.length * 7 }),
    fillText: (...a) => { alfas.push(ctx._a); ctx.tinta.push(ctx._a); ctx.textos.push(a[0]); },
    textos: [], alfas, tinta: [],
  };
  Object.defineProperty(ctx, 'globalAlpha', { get: () => ctx._a, set: (v) => { ctx._a = v; } });
  for (const p of ['fillStyle', 'strokeStyle', 'font', 'textAlign', 'textBaseline',
                   'lineWidth', 'shadowColor', 'shadowBlur', 'shadowOffsetY']) {
    Object.defineProperty(ctx, p, { get: () => '', set: () => {} });
  }
  return ctx;
};

const regua = {
  tipo: 'regua',
  pontos: [{ logical: 0, preco: 100 }, { logical: 10, preco: 120 }],
};
const toX = (l) => 50 + l * 10;
const toY = (p) => 400 - p;

describe('Régua — legibilidade enquanto se mede', () => {
  it('os números saem opacos mesmo no modo "ainda colocando"', () => {
    const ctx = ctxEspiao();
    _desenharDesenhoUsuario(ctx, toX, toY, regua, false, 800, true);

    expect(ctx.textos.length).toBeGreaterThan(0);
    // o alfa de CADA texto desenhado
    for (const a of ctx.alfas) expect(a).toBeGreaterThanOrEqual(0.8);
  });

  it('mostra a variação e quantas velas, que é o dado da medição', () => {
    const ctx = ctxEspiao();
    _desenharDesenhoUsuario(ctx, toX, toY, regua, false, 800, true);
    const tudo = ctx.textos.join(' | ');
    expect(tudo).toMatch(/%/);
    expect(tudo).toMatch(/vela/);
  });

  // a prova de que o esmaecimento continua valendo pro resto
  it('uma linha de tendência em colocação CONTINUA esmaecida', () => {
    const ctx = ctxEspiao();
    const trend = { tipo: 'trend', pontos: regua.pontos };
    _desenharDesenhoUsuario(ctx, toX, toY, trend, false, 800, true);
    // alfa no momento de pintar, não depois do restore final
    expect(Math.min(...ctx.tinta)).toBeLessThan(1);
  });
});
