import {
  AZUL, VERDE, VERMELHO,
  linhasBandeira, medidasBandeira, precoNaReta, stepsBandeira, temFormatoNovo, validarBandeira,
} from '../admin/bandeira.js';

// Bandeira de alta bem marcada: mastro sobe de 10 a 20, canal desce de leve
// (17 → 16.5) e o rompimento fecha acima da linha de cima do canal.
const BOA = {
  p1_inicio_mastro: { i: 0, preco: 10 },
  p2_topo_mastro:   { i: 5, preco: 20 },
  p3_fundo1:        { i: 8, preco: 17 },
  p4_topo1:         { i: 11, preco: 19 },
  p5_fundo2:        { i: 14, preco: 16.5 },
  p6_rompimento:    { i: 18, preco: 21 },
};
const CANDLES = Array.from({ length: 40 }, (_, i) => ({ timestamp: i }));
const com = (mudancas) => ({ ...BOA, ...mudancas });

describe('Bandeira — os 6 pontos', () => {
  it('são cronológicos e na ordem do padrão', () => {
    expect(stepsBandeira(true).map((s) => s.key)).toEqual([
      'p1_inicio_mastro', 'p2_topo_mastro', 'p3_fundo1', 'p4_topo1', 'p5_fundo2', 'p6_rompimento',
    ]);
    expect(stepsBandeira(true).map((s) => s.label)).toEqual([
      'Início do Mastro', 'Topo do Mastro', 'Fundo 1', 'Topo 1', 'Fundo 2', 'Rompimento',
    ]);
  });

  it('na bandeira de baixa os rótulos são espelhados', () => {
    expect(stepsBandeira(false).map((s) => s.label)).toEqual([
      'Início do Mastro', 'Fundo do Mastro', 'Topo 1', 'Fundo 1', 'Topo 2', 'Rompimento',
    ]);
    expect(stepsBandeira(false)[0].color).toBe(VERMELHO);
    expect(stepsBandeira(true)[0].color).toBe(VERDE);
  });

  it('reconhece o formato antigo como incompleto', () => {
    expect(temFormatoNovo({ mastro_inicio: { i: 0, preco: 1 } })).toBe(false);
    expect(temFormatoNovo(BOA)).toBe(true);
  });
});

describe('Bandeira de alta — validações', () => {
  it('aceita uma marcação correta', () => {
    expect(validarBandeira(BOA, { alta: true })).toEqual([]);
  });

  it('exige os 6 pontos', () => {
    expect(validarBandeira({ p1_inicio_mastro: { i: 0, preco: 1 } })).toEqual(['Marque os 6 pontos antes de salvar.']);
  });

  it('recusa pontos fora de ordem no tempo', () => {
    const erros = validarBandeira(com({ p4_topo1: { i: 6, preco: 19 } }), { alta: true });
    expect(erros.join(' ')).toMatch(/"Topo 1" precisa vir depois de "Fundo 1" no tempo/);
  });

  it('recusa mastro que não sobe', () => {
    const erros = validarBandeira(com({ p2_topo_mastro: { i: 5, preco: 9 } }), { alta: true });
    expect(erros.join(' ')).toMatch(/"Topo do Mastro" precisa estar acima do "Início do Mastro"/);
  });

  it('recusa fundo 1 acima do topo do mastro', () => {
    const erros = validarBandeira(com({ p3_fundo1: { i: 8, preco: 21 } }), { alta: true });
    expect(erros.join(' ')).toMatch(/"Fundo 1" precisa estar abaixo do "Topo do Mastro"/);
  });

  it('recusa canal subindo (fundo 2 acima do fundo 1)', () => {
    const erros = validarBandeira(com({ p5_fundo2: { i: 14, preco: 18 } }), { alta: true });
    expect(erros.join(' ')).toMatch(/"Fundo 2" precisa estar no mesmo nível ou abaixo do "Fundo 1"/);
  });

  it('aceita canal quase horizontal (tolerância de 1%)', () => {
    expect(validarBandeira(com({ p5_fundo2: { i: 14, preco: 17.1 } }), { alta: true })).toEqual([]);
  });

  it('recusa rompimento que não fura a linha do canal', () => {
    const erros = validarBandeira(com({ p6_rompimento: { i: 18, preco: 17 } }), { alta: true });
    expect(erros.join(' ')).toMatch(/"Rompimento" precisa fechar acima da linha superior do canal/);
  });
});

describe('Bandeira de baixa — validações espelhadas', () => {
  const BAIXA = {
    p1_inicio_mastro: { i: 0, preco: 20 },
    p2_topo_mastro:   { i: 5, preco: 10 },
    p3_fundo1:        { i: 8, preco: 13 },
    p4_topo1:         { i: 11, preco: 11 },
    p5_fundo2:        { i: 14, preco: 13.5 },
    p6_rompimento:    { i: 18, preco: 9 },
  };

  it('aceita uma marcação correta de baixa', () => {
    expect(validarBandeira(BAIXA, { alta: false })).toEqual([]);
  });

  it('recusa mastro que não cai', () => {
    const erros = validarBandeira({ ...BAIXA, p2_topo_mastro: { i: 5, preco: 21 } }, { alta: false });
    expect(erros.join(' ')).toMatch(/"Fundo do Mastro" precisa estar abaixo do "Início do Mastro"/);
  });

  it('a mesma marcação de baixa é recusada como bandeira de alta', () => {
    expect(validarBandeira(BAIXA, { alta: true }).length).toBeGreaterThan(0);
  });
});

describe('Bandeira — as 4 linhas do desenho', () => {
  const linhas = linhasBandeira(BOA, CANDLES, { alta: true });

  it('desenha mastro, canal superior, canal inferior e alvo', () => {
    expect(linhas.map((l) => l.id)).toEqual(['mastro', 'canal_superior', 'canal_inferior', 'alvo']);
  });

  it('mastro verde cheio de P1 a P2', () => {
    const m = linhas[0];
    expect(m).toMatchObject({ cor: VERDE, largura: 2, tracejada: false });
    expect(m.dados).toEqual([{ i: 0, preco: 10 }, { i: 5, preco: 20 }]);
  });

  it('canais azuis tracejados, esticados até o rompimento', () => {
    const [, sup, inf] = linhas;
    expect(sup).toMatchObject({ cor: AZUL, largura: 1, tracejada: true });
    expect(inf).toMatchObject({ cor: AZUL, largura: 1, tracejada: true });
    expect(sup.dados[1].i).toBe(BOA.p6_rompimento.i);
    expect(inf.dados[1].i).toBe(BOA.p6_rompimento.i);
    // a reta P2→P4 no tempo do rompimento
    expect(sup.dados[1].preco).toBeCloseTo(precoNaReta(BOA.p2_topo_mastro, BOA.p4_topo1, 18), 6);
  });

  it('alvo projeta a altura do mastro a partir do rompimento', () => {
    const alvo = linhas[3];
    expect(alvo.dados[0]).toEqual({ i: 18, preco: 21 });
    expect(alvo.dados[1].preco).toBeCloseTo(21 + (20 - 10), 6); // + altura do mastro
    expect(alvo.dados[1].i).toBe(18 + (5 - 0));
  });

  it('não passa do último candle disponível', () => {
    const curto = Array.from({ length: 20 }, (_, i) => ({ timestamp: i }));
    const alvo = linhasBandeira(BOA, curto, { alta: true })[3];
    expect(alvo.dados[1].i).toBe(19);
  });

  it('não desenha nada com marcação incompleta', () => {
    expect(linhasBandeira({ p1_inicio_mastro: { i: 0, preco: 1 } }, CANDLES)).toEqual([]);
  });
});

describe('Bandeira — medidas pro ML', () => {
  it('altura do mastro e retração da bandeira', () => {
    expect(medidasBandeira(BOA)).toEqual({ altura_mastro: 10, retracao_bandeira: (20 - 17) / 10 });
  });
});
