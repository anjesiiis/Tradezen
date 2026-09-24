import { MIN_ARRASTO, RAIO_PEGADA, limitarIndice, passouDoArrasto, pontoSobCursor } from '../admin/arrastar.js';

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
