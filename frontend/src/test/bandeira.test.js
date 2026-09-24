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

// ── Bandeira de ALTA no formato atual: 8 pontos em 4 pares ────
import {
  PARES_ALTA, PASSOS_ALTA_PARES,
  avisosAltaPares, linhasAltaPares, medidasAltaPares, stepsAltaPares, temFormatoPares, validarAltaPares,
} from '../admin/bandeira.js';

// mastro 1 sobe (10→20), bandeira consolida, mastro 2 sobe depois (19→28)
const PARES = {
  p1_inicio_mastro1: { i: 0, preco: 10 },
  p2_topo_mastro1:   { i: 5, preco: 20 },
  p3_inicio_fundo:   { i: 7, preco: 17 },
  p4_fim_fundo:      { i: 13, preco: 16 },
  p5_inicio_topo:    { i: 8, preco: 19.5 },
  p6_fim_topo:       { i: 14, preco: 18.5 },
  p7_inicio_mastro2: { i: 16, preco: 19 },
  p8_topo_mastro2:   { i: 22, preco: 28 },
};
const comPar = (mudancas) => ({ ...PARES, ...mudancas });

describe('Bandeira de alta — 8 pontos em 4 pares', () => {
  it('os 8 botões saem na ordem dos pares', () => {
    expect(stepsAltaPares().map((s) => s.label)).toEqual([
      'Início Mastro 1', 'Topo Mastro 1',
      'Início Fundo Bandeira', 'Fim Fundo Bandeira',
      'Início Topo Bandeira', 'Fim Topo Bandeira',
      'Início Mastro 2', 'Topo Mastro 2',
    ]);
    expect(PASSOS_ALTA_PARES).toHaveLength(8);
    expect(PARES_ALTA).toHaveLength(4);
  });

  it('cada ponto tem a cor da linha do seu par', () => {
    const cores = stepsAltaPares().map((s) => s.color);
    expect(cores).toEqual([VERDE, VERDE, AZUL, AZUL, AZUL, AZUL, VERDE, VERDE]);
  });

  it('só está completo com os 8 pontos', () => {
    expect(temFormatoPares(PARES)).toBe(true);
    const faltando = { ...PARES };
    delete faltando.p8_topo_mastro2;
    expect(temFormatoPares(faltando)).toBe(false);
  });
});

describe('Bandeira de alta em pares — as 4 linhas', () => {
  it('uma linha por par, com a cor e o traço certos', () => {
    expect(linhasAltaPares(PARES)).toEqual([
      { id: 'mastro1',        cor: VERDE, largura: 2,   tracejada: false, dados: [{ i: 0, preco: 10 }, { i: 5, preco: 20 }] },
      { id: 'fundo_bandeira', cor: AZUL,  largura: 1.5, tracejada: true,  dados: [{ i: 7, preco: 17 }, { i: 13, preco: 16 }] },
      { id: 'topo_bandeira',  cor: AZUL,  largura: 1.5, tracejada: true,  dados: [{ i: 8, preco: 19.5 }, { i: 14, preco: 18.5 }] },
      { id: 'mastro2',        cor: VERDE, largura: 2,   tracejada: false, dados: [{ i: 16, preco: 19 }, { i: 22, preco: 28 }] },
    ]);
  });

  it('a linha de um par aparece assim que os 2 cliques dele acontecem', () => {
    const soUmPar = { p1_inicio_mastro1: PARES.p1_inicio_mastro1, p2_topo_mastro1: PARES.p2_topo_mastro1 };
    expect(linhasAltaPares(soUmPar).map((l) => l.id)).toEqual(['mastro1']);
  });

  it('par pela metade não desenha nada', () => {
    expect(linhasAltaPares({ p1_inicio_mastro1: PARES.p1_inicio_mastro1 })).toEqual([]);
  });
});

describe('Bandeira de alta em pares — validações', () => {
  it('aceita uma marcação correta', () => {
    expect(validarAltaPares(PARES)).toEqual([]);
  });

  it('exige os 8 pontos', () => {
    expect(validarAltaPares({ p1_inicio_mastro1: { i: 0, preco: 1 } })).toEqual(['Marque os 8 pontos antes de salvar.']);
  });

  it.each([
    ['mastro 1 invertido no tempo', { p2_topo_mastro1: { i: 0, preco: 20 } }, /Mastro 1: "Topo Mastro 1" precisa vir depois/],
    ['fundo da bandeira invertido', { p4_fim_fundo: { i: 6, preco: 16 } }, /Fundo da Bandeira: "Fim Fundo Bandeira" precisa vir depois/],
    ['topo da bandeira invertido', { p6_fim_topo: { i: 7, preco: 18.5 } }, /Topo da Bandeira: "Fim Topo Bandeira" precisa vir depois/],
    ['mastro 2 invertido no tempo', { p8_topo_mastro2: { i: 15, preco: 28 } }, /Mastro 2: "Topo Mastro 2" precisa vir depois/],
    ['mastro 1 que não sobe', { p2_topo_mastro1: { i: 5, preco: 9 } }, /"Topo Mastro 1" precisa estar acima de "Início Mastro 1"/],
    ['mastro 2 que não sobe', { p8_topo_mastro2: { i: 22, preco: 18 } }, /"Topo Mastro 2" precisa estar acima de "Início Mastro 2"/],
  ])('recusa %s', (_, mudanca, mensagem) => {
    expect(validarAltaPares(comPar(mudanca)).join(' ')).toMatch(mensagem);
  });

  // Caso real que estava sendo barrado: o analista estica as linhas do
  // canal pra direita, além do rompimento — marcação correta.
  it('aceita canal esticado além do início do mastro 2', () => {
    const esticado = comPar({
      p4_fim_fundo: { i: 25, preco: 15 },
      p6_fim_topo: { i: 25, preco: 17.5 },
    });
    expect(validarAltaPares(esticado)).toEqual([]);
    expect(avisosAltaPares(esticado)).toEqual([]);
  });

  it('os pares são independentes: o fundo pode começar antes do topo', () => {
    // p5 (i=8) vem antes de p4 (i=13) e isso é permitido
    expect(validarAltaPares(PARES)).toEqual([]);
  });
});

describe('Bandeira de alta em pares — avisos (não bloqueiam)', () => {
  it('marcação normal não gera aviso', () => {
    expect(avisosAltaPares(PARES)).toEqual([]);
  });

  it('avisa quando a bandeira começa antes do mastro 1', () => {
    const avisos = avisosAltaPares(comPar({ p3_inicio_fundo: { i: 0, preco: 17 } }));
    expect(avisos.join(' ')).toMatch(/"Início Fundo Bandeira" está antes de "Início Mastro 1"/);
    // mas não impede salvar
    expect(validarAltaPares(comPar({ p3_inicio_fundo: { i: 0, preco: 17 } }))).toEqual([]);
  });

  it('avisa quando o mastro 2 começa antes da bandeira', () => {
    const avisos = avisosAltaPares(comPar({ p7_inicio_mastro2: { i: 6, preco: 19 } }));
    expect(avisos.join(' ')).toMatch(/"Início Mastro 2" está antes do começo da bandeira/);
  });
});

describe('Bandeira de alta em pares — medidas pro ML', () => {
  it('altura dos dois mastros', () => {
    expect(medidasAltaPares(PARES)).toEqual({ altura_mastro1: 10, altura_mastro2: 9 });
  });

  it('marcação incompleta não tem medidas', () => {
    expect(medidasAltaPares({ p1_inicio_mastro1: { i: 0, preco: 1 } })).toBeNull();
  });
});
