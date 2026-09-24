import {
  AZUL, PADROES, PASSOS_PARES, VERDE, VERMELHO,
  avisosDoPadrao, configDoTemplate, linhasDoPadrao, medidasDoPadrao,
  stepsDoPadrao, temFormatoPares, validarPadrao,
} from '../admin/bandeira.js';

// Marcação típica de bandeira de alta: mastro sobe (10→20), a consolidação
// recua, e o mastro 2 começa DENTRO da consolidação (no fundo dela) — é
// esse caso que precisa ser aceito sem reclamação.
const ALTA = {
  p1_inicio_mastro1: { i: 0, preco: 10 },
  p2_topo_mastro1:   { i: 5, preco: 20 },
  p3_inicio_fundo:   { i: 7, preco: 17 },
  p4_fim_fundo:      { i: 13, preco: 16 },
  p5_inicio_topo:    { i: 8, preco: 19.5 },
  p6_fim_topo:       { i: 14, preco: 18.5 },
  p7_inicio_mastro2: { i: 13, preco: 16 },
  p8_topo_mastro2:   { i: 22, preco: 28 },
};
const BAIXA = Object.fromEntries(
  Object.entries(ALTA).map(([k, p]) => [k, { i: p.i, preco: 40 - p.preco }])
);
const com = (base, mudancas) => ({ ...base, ...mudancas });

describe('Padrões de continuação — os 4 templates', () => {
  it('bandeira e flâmula, de alta e de baixa', () => {
    expect(Object.keys(PADROES)).toEqual(['bandeira_alta', 'bandeira_baixa', 'flamula_alta', 'flamula_baixa']);
    expect(Object.values(PADROES).map((p) => p.rotulo)).toEqual([
      'Bandeira de Alta', 'Bandeira de Baixa', 'Flâmula de Alta', 'Flâmula de Baixa',
    ]);
  });

  it('os 4 usam as mesmas 8 chaves de ponto', () => {
    for (const padrao of Object.values(PADROES)) {
      expect(stepsDoPadrao(padrao).map((s) => s.key)).toEqual(PASSOS_PARES);
    }
  });

  it('bandeira de alta: rótulos e cores', () => {
    const steps = stepsDoPadrao(PADROES.bandeira_alta);
    expect(steps.map((s) => s.label)).toEqual([
      'Início Mastro 1', 'Topo Mastro 1',
      'Início Fundo Bandeira', 'Fim Fundo Bandeira',
      'Início Topo Bandeira', 'Fim Topo Bandeira',
      'Início Mastro 2', 'Topo Mastro 2',
    ]);
    expect(steps.map((s) => s.color)).toEqual([VERDE, VERDE, AZUL, AZUL, AZUL, AZUL, VERDE, VERDE]);
  });

  it('bandeira de baixa: mastros para baixo, em vermelho', () => {
    const steps = stepsDoPadrao(PADROES.bandeira_baixa);
    expect(steps.map((s) => s.label)).toEqual([
      'Início Mastro 1', 'Fundo Mastro 1',
      'Início Fundo Bandeira', 'Fim Fundo Bandeira',
      'Início Topo Bandeira', 'Fim Topo Bandeira',
      'Início Mastro 2', 'Fundo Mastro 2',
    ]);
    expect(steps[0].color).toBe(VERMELHO);
  });

  it('flâmula: mesmos pontos, nome próprio', () => {
    expect(stepsDoPadrao(PADROES.flamula_alta).map((s) => s.label)).toEqual([
      'Início Mastro 1', 'Topo Mastro 1',
      'Início Fundo Flâmula', 'Fim Fundo Flâmula',
      'Início Topo Flâmula', 'Fim Topo Flâmula',
      'Início Mastro 2', 'Topo Mastro 2',
    ]);
    expect(stepsDoPadrao(PADROES.flamula_baixa)[1].label).toBe('Fundo Mastro 1');
  });
});

describe('Pares independentes — pontos podem se tocar', () => {
  it('aceita mastro 2 começando dentro da consolidação', () => {
    expect(validarPadrao(ALTA, PADROES.bandeira_alta)).toEqual([]);
    expect(avisosDoPadrao(ALTA, PADROES.bandeira_alta)).toEqual([]);
  });

  it('aceita pontos de pares diferentes no mesmo candle', () => {
    const mesmoCandle = com(ALTA, { p7_inicio_mastro2: { i: 13, preco: 16 } });
    expect(mesmoCandle.p7_inicio_mastro2.i).toBe(mesmoCandle.p4_fim_fundo.i);
    expect(validarPadrao(mesmoCandle, PADROES.bandeira_alta)).toEqual([]);
  });

  it('aceita a consolidação terminando depois do mastro 2 (linhas esticadas)', () => {
    const esticado = com(ALTA, { p4_fim_fundo: { i: 25, preco: 15 }, p6_fim_topo: { i: 25, preco: 17.5 } });
    expect(validarPadrao(esticado, PADROES.bandeira_alta)).toEqual([]);
  });

  it('aceita o topo da consolidação começando antes do fundo', () => {
    expect(ALTA.p5_inicio_topo.i).toBeLessThan(ALTA.p4_fim_fundo.i);
    expect(validarPadrao(ALTA, PADROES.bandeira_alta)).toEqual([]);
  });
});

describe('Validações que bloqueiam', () => {
  it('exige os 8 pontos', () => {
    expect(validarPadrao({ p1_inicio_mastro1: { i: 0, preco: 1 } }, PADROES.bandeira_alta))
      .toEqual(['Marque os 8 pontos antes de salvar.']);
    expect(temFormatoPares(ALTA)).toBe(true);
  });

  it.each([
    ['mastro 1 invertido no tempo', { p2_topo_mastro1: { i: 0, preco: 20 } }, /Mastro 1: "Topo Mastro 1" precisa vir depois/],
    ['consolidação invertida no tempo', { p4_fim_fundo: { i: 6, preco: 16 } }, /Fundo da Bandeira: "Fim Fundo Bandeira" precisa vir depois/],
    ['mastro 1 que não sobe', { p2_topo_mastro1: { i: 5, preco: 9 } }, /"Topo Mastro 1" precisa estar acima de "Início Mastro 1"/],
    ['mastro 2 que não sobe', { p8_topo_mastro2: { i: 22, preco: 15 } }, /"Topo Mastro 2" precisa estar acima de "Início Mastro 2"/],
  ])('recusa %s', (_, mudanca, mensagem) => {
    expect(validarPadrao(com(ALTA, mudanca), PADROES.bandeira_alta).join(' ')).toMatch(mensagem);
  });

  it('na bandeira de baixa as regras são espelhadas', () => {
    expect(validarPadrao(BAIXA, PADROES.bandeira_baixa)).toEqual([]);
    expect(validarPadrao(BAIXA, PADROES.bandeira_alta).length).toBeGreaterThan(0);
    expect(validarPadrao(ALTA, PADROES.bandeira_baixa).join(' ')).toMatch(/precisa estar abaixo/);
  });
});

describe('Avisos (não bloqueiam)', () => {
  it('avisa quando a consolidação começa antes do mastro 1', () => {
    const estranho = com(ALTA, { p3_inicio_fundo: { i: 0, preco: 17 } });
    expect(avisosDoPadrao(estranho, PADROES.bandeira_alta).join(' ')).toMatch(/"Início Fundo Bandeira" está antes de "Início Mastro 1"/);
    expect(validarPadrao(estranho, PADROES.bandeira_alta)).toEqual([]);
  });

  it('flâmula com bordas que não fecham vira aviso, não erro', () => {
    // abertura no começo: 19.5-17 = 2.5 | no fim: 18.5-16 = 2.5 (não fechou)
    const avisos = avisosDoPadrao(ALTA, PADROES.flamula_alta);
    expect(avisos.join(' ')).toMatch(/bordas da flâmula não estão se fechando/);
    expect(validarPadrao(ALTA, PADROES.flamula_alta)).toEqual([]);
  });

  it('flâmula com bordas convergindo não gera aviso', () => {
    const triangulo = com(ALTA, { p4_fim_fundo: { i: 13, preco: 17.8 }, p6_fim_topo: { i: 14, preco: 18.2 } });
    expect(avisosDoPadrao(triangulo, PADROES.flamula_alta)).toEqual([]);
  });

  it('bandeira não recebe o aviso de convergência', () => {
    expect(avisosDoPadrao(ALTA, PADROES.bandeira_alta)).toEqual([]);
  });
});

describe('Desenho — 4 linhas, uma por par', () => {
  it('cores e traços de cada par (bandeira de alta)', () => {
    expect(linhasDoPadrao(ALTA, PADROES.bandeira_alta)).toEqual([
      { id: 'mastro1', cor: VERDE, largura: 2,   tracejada: false, dados: [{ i: 0, preco: 10 }, { i: 5, preco: 20 }] },
      { id: 'fundo',   cor: AZUL,  largura: 1.5, tracejada: true,  dados: [{ i: 7, preco: 17 }, { i: 13, preco: 16 }] },
      { id: 'topo',    cor: AZUL,  largura: 1.5, tracejada: true,  dados: [{ i: 8, preco: 19.5 }, { i: 14, preco: 18.5 }] },
      { id: 'mastro2', cor: VERDE, largura: 2,   tracejada: false, dados: [{ i: 13, preco: 16 }, { i: 22, preco: 28 }] },
    ]);
  });

  it('na baixa os mastros são vermelhos', () => {
    const linhas = linhasDoPadrao(BAIXA, PADROES.bandeira_baixa);
    expect(linhas.map((l) => l.cor)).toEqual([VERMELHO, AZUL, AZUL, VERMELHO]);
  });

  it('a linha aparece assim que o par fecha', () => {
    const soMastro1 = { p1_inicio_mastro1: ALTA.p1_inicio_mastro1, p2_topo_mastro1: ALTA.p2_topo_mastro1 };
    expect(linhasDoPadrao(soMastro1, PADROES.flamula_alta).map((l) => l.id)).toEqual(['mastro1']);
    expect(linhasDoPadrao({ p1_inicio_mastro1: ALTA.p1_inicio_mastro1 }, PADROES.flamula_alta)).toEqual([]);
  });
});

describe('Medidas pro ML', () => {
  it('altura dos dois mastros', () => {
    expect(medidasDoPadrao(ALTA)).toEqual({ altura_mastro1: 10, altura_mastro2: 12 });
  });

  it('na baixa as alturas saem negativas', () => {
    const m = medidasDoPadrao(BAIXA);
    expect(m.altura_mastro1).toBeLessThan(0);
    expect(m.altura_mastro2).toBeLessThan(0);
  });

  it('marcação incompleta não tem medidas', () => {
    expect(medidasDoPadrao({ p1_inicio_mastro1: { i: 0, preco: 1 } })).toBeNull();
  });
});

describe('Templates salvos em formatos antigos', () => {
  it('formato de 8 pontos usa os pares', () => {
    const cfg = configDoTemplate(ALTA, PADROES.bandeira_alta);
    expect(cfg.steps).toHaveLength(8);
    expect(cfg.linePairs).toEqual([]);
  });

  it('formato de 6 pontos cronológicos ainda abre', () => {
    const seis = {
      p1_inicio_mastro: { i: 0, preco: 10 }, p2_topo_mastro: { i: 5, preco: 20 },
      p3_fundo1: { i: 8, preco: 17 }, p4_topo1: { i: 11, preco: 19 },
      p5_fundo2: { i: 14, preco: 16.5 }, p6_rompimento: { i: 18, preco: 21 },
    };
    const cfg = configDoTemplate(seis, PADROES.bandeira_alta);
    expect(cfg.steps).toHaveLength(6);
    expect(cfg.linhas(seis, [])).toHaveLength(4);
  });

  it('formato mais antigo (por função) abre com pares de linha', () => {
    const legado = { mastro_inicio: {}, mastro_fim: {}, topo1: {}, topo2: {}, fundo1: {}, fundo2: {} };
    const cfg = configDoTemplate(legado, PADROES.bandeira_alta);
    expect(cfg.steps.map((s) => s.key)).toEqual(['mastro_inicio', 'mastro_fim', 'topo1', 'topo2', 'fundo1', 'fundo2']);
    expect(cfg.linePairs).toHaveLength(3);
  });
});
