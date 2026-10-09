import {
  AZUL, PADROES, PASSOS_PARES, VERDE, VERMELHO,
  avisosDoPadrao, configDoTemplate, linhasDoPadrao, medidasDoPadrao,
  normalizarPares, siglaDoPadrao, stepsDoPadrao, temFormatoPares, validarPadrao,
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
// Espelhar os preços (40 - preco) deixava o TOPO da bandeira abaixo do
// FUNDO dela — que é marcação trocada, não bandeira de baixa. Os nomes
// das bordas não mudam com a direção: "fundo" é sempre a borda de baixo.
// Aqui os mastros caem e a consolidação fica em pé.
const BAIXA = {
  p1_inicio_mastro1: { i: 0, preco: 30 },
  p2_topo_mastro1:   { i: 5, preco: 20 },
  p3_inicio_fundo:   { i: 7, preco: 21 },
  p4_fim_fundo:      { i: 13, preco: 22 },
  p5_inicio_topo:    { i: 8, preco: 23.5 },
  p6_fim_topo:       { i: 14, preco: 24.5 },
  p7_inicio_mastro2: { i: 13, preco: 24 },
  p8_topo_mastro2:   { i: 22, preco: 12 },
};
const com = (base, mudancas) => ({ ...base, ...mudancas });

describe('Ordem dos cliques numa linha', () => {
  // Uma linha é a mesma, clicada da esquerda pra direita ou ao contrário.
  // Antes disso, marcar a ponta direita primeiro dava
  // "Fim Topo Bandeira precisa vir depois de Início Topo Bandeira" numa
  // marcação visualmente correta — e valia pros seis padrões, não só pra
  // bandeira de baixa.
  const BASE = {
    p1_inicio_mastro1: { i: 10, preco: 50 }, p2_topo_mastro1: { i: 20, preco: 40 },
    p3_inicio_fundo: { i: 22, preco: 41 }, p4_fim_fundo: { i: 30, preco: 43 },
    p5_inicio_topo: { i: 22, preco: 44 }, p6_fim_topo: { i: 30, preco: 46 },
    p7_inicio_mastro2: { i: 31, preco: 43 }, p8_topo_mastro2: { i: 40, preco: 33 },
  };

  it('clicar a ponta direita primeiro não é mais erro', () => {
    const invertido = { ...BASE, p5_inicio_topo: { i: 30, preco: 46 }, p6_fim_topo: { i: 22, preco: 44 } };

    expect(validarPadrao(invertido, PADROES.bandeira_baixa)).toEqual([]);

    // e o mesmo vale na alta, com um mastro que sobe
    const naAlta = {
      ...invertido,
      p2_topo_mastro1: { i: 20, preco: 60 },
      p7_inicio_mastro2: { i: 31, preco: 43 },
      p8_topo_mastro2: { i: 40, preco: 70 },
    };
    expect(validarPadrao(naAlta, PADROES.bandeira_alta)).toEqual([]);
  });

  it('o par sai endireitado: o início é sempre o ponto mais à esquerda', () => {
    const invertido = { ...BASE, p5_inicio_topo: { i: 30, preco: 46 }, p6_fim_topo: { i: 22, preco: 44 } };

    const ok = normalizarPares(invertido, PADROES.bandeira_baixa);

    expect(ok.p5_inicio_topo.i).toBe(22);
    expect(ok.p6_fim_topo.i).toBe(30);
    // os outros pares não se mexem
    expect(ok.p1_inicio_mastro1).toEqual(BASE.p1_inicio_mastro1);
  });

  it('as duas pontas no mesmo candle continuam bloqueando, e o aviso explica', () => {
    const erros = validarPadrao({ ...BASE, p6_fim_topo: { i: 22, preco: 46 } }, PADROES.bandeira_baixa);

    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain('mesmo candle');
    expect(erros[0]).toContain('dois candles diferentes');
  });

  it('mastro contra a direção do padrão vira aviso, e salva', () => {
    // quem marca é quem está lendo o gráfico: o amarelo avisa, não barra
    const mastroQueCai = { ...BASE, p8_topo_mastro2: { i: 40, preco: 99 } };
    expect(validarPadrao(mastroQueCai, PADROES.bandeira_baixa)).toEqual([]);
    expect(avisosDoPadrao(mastroQueCai, PADROES.bandeira_baixa).join(' '))
      .toMatch(/não está abaixo de "Início Mastro 2"/);
  });

  it('normalizar não mexe no canal, que não tem pares', () => {
    const canal = { p1_fundo1: { i: 5, preco: 1 }, p2_topo1: { i: 3, preco: 2 } };

    expect(normalizarPares(canal, PADROES.canal_alta)).toEqual(canal);
  });
});

describe('Padrões de continuação — os 6 templates', () => {
  it('bandeira, flâmula e cunha — de alta e de baixa', () => {
    // PADROES é o registro de TODOS os padrões com tela de marcação: os 6
    // de continuação, os 2 canais (canal.js) e os 8 de reversão e
    // consolidação (padroesExtras.js). Cada família tem regras próprias.
    expect(Object.keys(PADROES).slice(0, 8)).toEqual([
      'bandeira_alta', 'bandeira_baixa', 'flamula_alta', 'flamula_baixa', 'cunha_alta', 'cunha_baixa',
      'canal_alta', 'canal_baixa',
    ]);
    expect(Object.keys(PADROES).slice(8)).toEqual([
      'fundo_duplo', 'oco_invertido', 'topo_triplo', 'fundo_triplo',
      'triangulo_ascendente', 'triangulo_descendente', 'triangulo_simetrico', 'retangulo',
    ]);
  });

  it('cada padrão tem sua sigla de 3 letras (marcadores do gráfico)', () => {
    expect(siglaDoPadrao('bandeira_alta')).toBe('BAN');
    expect(siglaDoPadrao('flamula_baixa')).toBe('FLA');
    expect(siglaDoPadrao('cunha_alta')).toBe('CUN');
  });

  it('cunha usa os mesmos 8 pontos, com nome próprio', () => {
    expect(stepsDoPadrao(PADROES.cunha_alta).map((s) => s.label)).toEqual([
      'Início Mastro 1', 'Topo Mastro 1',
      'Início Fundo Cunha', 'Fim Fundo Cunha',
      'Início Topo Cunha', 'Fim Topo Cunha',
      'Início Mastro 2', 'Topo Mastro 2',
    ]);
  });

  it('os 6 de continuação usam as mesmas 8 chaves de ponto', () => {
    // canal e extras ficam de fora: têm chaves próprias (canal.test.js,
    // padroesExtras.test.js)
    for (const padrao of Object.values(PADROES).filter((p) => ['bandeira', 'flamula', 'cunha'].includes(p.forma))) {
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
    // ordem trocada deixou de ser erro (normalizarPares endireita); o que
    // bloqueia é as duas pontas caírem no mesmo candle
    ['mastro 1 com as duas pontas no mesmo candle', { p2_topo_mastro1: { i: 0, preco: 20 } }, /Mastro 1: .* mesmo candle/],
    ['consolidação com as duas pontas no mesmo candle', { p4_fim_fundo: { i: 7, preco: 16 } }, /Fundo da Bandeira: .* mesmo candle/],
  ])('recusa %s', (_, mudanca, mensagem) => {
    expect(validarPadrao(com(ALTA, mudanca), PADROES.bandeira_alta).join(' ')).toMatch(mensagem);
  });

  it.each([
    // mastro contra a direção deixou de bloquear: é leitura do analista
    ['mastro 1 que não sobe', { p2_topo_mastro1: { i: 5, preco: 9 } }],
    ['mastro 2 que não sobe', { p8_topo_mastro2: { i: 22, preco: 15 } }],
  ])('%s salva, com aviso', (_, mudanca) => {
    const pontos = com(ALTA, mudanca);
    expect(validarPadrao(pontos, PADROES.bandeira_alta)).toEqual([]);
    expect(avisosDoPadrao(pontos, PADROES.bandeira_alta).join(' ')).toMatch(/Confira: .* não está acima de/);
  });

  it('a marcação boa passa nas duas direções', () => {
    expect(validarPadrao(BAIXA, PADROES.bandeira_baixa)).toEqual([]);
    expect(validarPadrao(ALTA, PADROES.bandeira_alta)).toEqual([]);
    // marcar uma de baixa na tela de alta não é mais erro: é aviso
    expect(validarPadrao(BAIXA, PADROES.bandeira_alta)).toEqual([]);
    expect(avisosDoPadrao(BAIXA, PADROES.bandeira_alta).join(' ')).toMatch(/Confira/);
  });

  it('o que bloqueia é topo e fundo da consolidação trocados', () => {
    const trocado = com(ALTA, {
      p5_inicio_topo: { i: ALTA.p5_inicio_topo.i, preco: ALTA.p3_inicio_fundo.preco - 5 },
      p6_fim_topo: { i: ALTA.p6_fim_topo.i, preco: ALTA.p4_fim_fundo.preco - 5 },
    });
    expect(validarPadrao(trocado, PADROES.bandeira_alta).join(' ')).toMatch(/trocados/);
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

  it('cunha avisa quando as bordas inclinam para lados opostos', () => {
    // no ALTA as bordas vão em sentidos opostos (fundo desce, topo desce?)
    const opostas = com(ALTA, {
      p3_inicio_fundo: { i: 7, preco: 17 }, p4_fim_fundo: { i: 13, preco: 16 },   // desce
      p5_inicio_topo: { i: 8, preco: 18 }, p6_fim_topo: { i: 14, preco: 19 },     // sobe
    });
    expect(avisosDoPadrao(opostas, PADROES.cunha_alta).join(' ')).toMatch(/inclinam para o mesmo lado/);
    expect(validarPadrao(opostas, PADROES.cunha_alta)).toEqual([]);
  });

  it('flâmula avisa quando as bordas inclinam para o mesmo lado (é cunha)', () => {
    const mesmoLado = com(ALTA, {
      p3_inicio_fundo: { i: 7, preco: 17 }, p4_fim_fundo: { i: 13, preco: 16 },
      p5_inicio_topo: { i: 8, preco: 19.5 }, p6_fim_topo: { i: 14, preco: 18 },
    });
    expect(avisosDoPadrao(mesmoLado, PADROES.flamula_alta).join(' ')).toMatch(/isso é uma cunha/);
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
