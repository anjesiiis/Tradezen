import {
  MIN_ARRASTO, RAIO_LINHA, RAIO_PEGADA,
  distanciaAoSegmento, limitarIndice, linhaSobCursor, moverPar, passouDoArrasto, pontoSobCursor,
} from '../admin/arrastar.js';

// Pontos já marcados, em pixels na tela
const POSICOES = {
  p1: { x: 100, y: 100 },
  p2: { x: 140, y: 120 },
  p3: { x: 400, y: 300 },
};

describe('Pegar um ponto com o cursor', () => {
  it('pega o ponto quando o cursor está em cima', () => {
    expect(pontoSobCursor(POSICOES, 100, 100)).toBe('p1');
    expect(pontoSobCursor(POSICOES, 402, 298)).toBe('p3');
  });

  it('pega dentro do raio, mas não fora', () => {
    expect(pontoSobCursor(POSICOES, 100 + RAIO_PEGADA - 1, 100)).toBe('p1');
    expect(pontoSobCursor(POSICOES, 100 + RAIO_PEGADA + 5, 100)).toBeNull();
  });

  it('com dois pontos por perto, pega o mais próximo', () => {
    // 122 fica entre p1 (100) e p2 (140), mais perto de p1
    expect(pontoSobCursor({ p1: { x: 100, y: 100 }, p2: { x: 130, y: 100 } }, 112, 100)).toBe('p1');
    expect(pontoSobCursor({ p1: { x: 100, y: 100 }, p2: { x: 130, y: 100 } }, 124, 100)).toBe('p2');
  });

  it('ignora ponto sem posição (fora da área visível do gráfico)', () => {
    expect(pontoSobCursor({ p1: { x: null, y: null } }, 0, 0)).toBeNull();
    expect(pontoSobCursor({}, 10, 10)).toBeNull();
    expect(pontoSobCursor(null, 10, 10)).toBeNull();
  });
});

describe('Clique tremido não vira arrasto', () => {
  it('só conta como arrasto depois de sair do lugar', () => {
    const origem = { x: 200, y: 200 };
    expect(passouDoArrasto(origem, 200, 200)).toBe(false);
    expect(passouDoArrasto(origem, 200 + MIN_ARRASTO - 1, 200)).toBe(false);
    expect(passouDoArrasto(origem, 200 + MIN_ARRASTO, 200)).toBe(true);
    expect(passouDoArrasto(origem, 260, 240)).toBe(true);
  });

  it('sem origem, não é arrasto', () => {
    expect(passouDoArrasto(null, 10, 10)).toBe(false);
  });
});

describe('O ponto não escapa do gráfico', () => {
  it('arredonda para o candle mais próximo', () => {
    expect(limitarIndice(12.4, 100)).toBe(12);
    expect(limitarIndice(12.6, 100)).toBe(13);
  });

  it('não passa do primeiro nem do último candle', () => {
    expect(limitarIndice(-8, 50)).toBe(0);
    expect(limitarIndice(999, 50)).toBe(49);
  });

  it('coordenada inválida devolve null', () => {
    expect(limitarIndice(null, 50)).toBeNull();
    expect(limitarIndice(undefined, 50)).toBeNull();
    expect(limitarIndice(NaN, 50)).toBeNull();
  });
});

describe('Pegar uma linha inteira', () => {
  const segmentos = [
    { chaves: ['p1', 'p2'], a: { x: 100, y: 100 }, b: { x: 300, y: 100 } },  // horizontal
    { chaves: ['p3', 'p4'], a: { x: 100, y: 400 }, b: { x: 300, y: 500 } },  // inclinada
  ];

  it('mede a distância até o segmento (e não até a reta infinita)', () => {
    expect(distanciaAoSegmento(200, 110, segmentos[0].a, segmentos[0].b)).toBeCloseTo(10);
    // além da ponta: distância até a ponta, não até a reta
    expect(distanciaAoSegmento(400, 100, segmentos[0].a, segmentos[0].b)).toBeCloseTo(100);
  });

  it('pega a linha quando o cursor encosta nela', () => {
    expect(linhaSobCursor(segmentos, 200, 100 + RAIO_LINHA - 2)).toEqual(['p1', 'p2']);
    expect(linhaSobCursor(segmentos, 200, 451)).toEqual(['p3', 'p4']);
  });

  it('não pega longe da linha', () => {
    expect(linhaSobCursor(segmentos, 200, 100 + RAIO_LINHA + 6)).toBeNull();
    expect(linhaSobCursor([], 200, 100)).toBeNull();
  });

  it('linha com ponta faltando é ignorada', () => {
    expect(linhaSobCursor([{ chaves: ['a', 'b'], a: { x: 1, y: 1 }, b: null }], 1, 1)).toBeNull();
  });
});

describe('Mover a linha inteira', () => {
  const pontos = { p1: { i: 10, preco: 20 }, p2: { i: 20, preco: 30 }, outro: { i: 5, preco: 15 } };

  it('as duas pontas andam juntas, o resto fica parado', () => {
    const movido = moverPar(pontos, ['p1', 'p2'], 3, 1.5, 100);
    expect(movido.p1).toEqual({ i: 13, preco: 21.5 });
    expect(movido.p2).toEqual({ i: 23, preco: 31.5 });
    expect(movido.outro).toEqual(pontos.outro);
  });

  it('a linha não sai do gráfico — e não encolhe ao bater no limite', () => {
    const naEsquerda = moverPar(pontos, ['p1', 'p2'], -50, 0, 100);
    expect(naEsquerda.p1.i).toBe(0);
    expect(naEsquerda.p2.i).toBe(10); // manteve os 10 candles de distância

    const naDireita = moverPar(pontos, ['p1', 'p2'], 999, 0, 100);
    expect(naDireita.p2.i).toBe(99);
    expect(naDireita.p1.i).toBe(89);
  });

  it('par incompleto não muda nada', () => {
    expect(moverPar(pontos, ['p1', 'inexistente'], 5, 5, 100)).toBe(pontos);
  });
});
