import { COR_DA_DIRECAO, ICONE_GENERICO, chaveDoPadrao, classeDoPadrao, corDoPadrao, descricaoDoPadrao, ehInvertido, ficaAcima, iconeDoPadrao, rotuloDoPadrao } from '../lib/iconesPadroes.js';

describe('Ícones dos padrões já marcados', () => {
  it('o ícone é a forma do padrão', () => {
    const esperado = {
      topo_duplo: 'Ⓜ️', fundo_duplo: '🇼',
      bandeira_alta: '🏳️', bandeira_baixa: '🏳️',
      flamula_alta: '🚩', flamula_baixa: '🚩',
      cunha_alta: '🚩', cunha_baixa: '🚩',
      canal_alta: '↗️', canal_baixa: '↙️',
      oco: '⛰️', oco_invertido: '⛰️',
      topo_triplo: '🔺🔺🔺', fundo_triplo: '🔻🔻🔻',
      triangulo_ascendente: '🔺', triangulo_simetrico: '🔺',
      suporte: '🟢', resistencia: '🔴',
    };
    for (const [tipo, icone] of Object.entries(esperado)) {
      expect(iconeDoPadrao(tipo)).toBe(icone);
    }
  });

  it('a direção vira cor por fora do emoji (emoji não aceita cor por CSS)', () => {
    expect(corDoPadrao('bandeira_alta')).toBe(COR_DA_DIRECAO.alta);
    expect(corDoPadrao('bandeira_baixa')).toBe(COR_DA_DIRECAO.baixa);
    expect(corDoPadrao('triangulo_simetrico')).toBe(COR_DA_DIRECAO.neutro);
    // as duas bandeiras têm o mesmo emoji: o que separa é a cor
    expect(iconeDoPadrao('bandeira_alta')).toBe(iconeDoPadrao('bandeira_baixa'));
    expect(corDoPadrao('bandeira_alta')).not.toBe(corDoPadrao('bandeira_baixa'));
    // e as cores são as do design system
    expect(COR_DA_DIRECAO.alta).toBe('#26a69a');
    expect(COR_DA_DIRECAO.baixa).toBe('#ef5350');
  });

  it('classes do ícone: cor, cunha e espelhamento', () => {
    expect(classeDoPadrao('bandeira_alta')).toBe('cor-alta');
    expect(classeDoPadrao('topo_duplo')).toBe('cor-baixa');
    // 🚩 serve flâmula e cunha: a cunha ganha marca própria pra não confundir
    expect(classeDoPadrao('cunha_alta')).toBe('cor-alta cunha');
    expect(classeDoPadrao('flamula_alta')).toBe('cor-alta');
    // OCO Invertido é o mesmo ⛰️ espelhado
    expect(classeDoPadrao('oco_invertido')).toBe('cor-alta invertido');
    expect(ehInvertido('oco_invertido')).toBe(true);
    expect(ehInvertido('oco')).toBe(false);
    expect(classeDoPadrao('nao_existe')).toBe('cor-neutro');
  });

  it('o emoji fica embaixo do candle nos padrões de alta e em cima nos demais', () => {
    expect(ficaAcima('bandeira_alta')).toBe(false);
    expect(ficaAcima('canal_alta')).toBe(false);
    expect(ficaAcima('fundo_duplo')).toBe(false);
    expect(ficaAcima('topo_duplo')).toBe(true);
    expect(ficaAcima('oco')).toBe(true);
    expect(ficaAcima('canal_baixa')).toBe(true);
    // alta é alta: cunha e flâmula de alta também ficam embaixo do candle
    expect(ficaAcima('cunha_alta')).toBe(false);
    expect(ficaAcima('flamula_alta')).toBe(false);
  });

  it('entende os dois jeitos de nomear que existem no sistema', () => {
    // o admin usa o id da tabela; o /padroes-marcados devolve o tipo em
    // caixa alta, e os níveis vêm como "suporte"/"resistencia"
    expect(iconeDoPadrao('OCO')).toBe('⛰️');
    expect(iconeDoPadrao('TOPO_DUPLO')).toBe('Ⓜ️');
    expect(iconeDoPadrao('suporte')).toBe('🟢');
    expect(iconeDoPadrao('Resistência')).toBe('🔴');
    expect(chaveDoPadrao('Bandeira-Alta')).toBe('bandeira_alta');
  });

  it('padrão sem ícone próprio cai no genérico, sem quebrar', () => {
    expect(iconeDoPadrao('coisa_que_nao_existe')).toBe(ICONE_GENERICO);
    expect(iconeDoPadrao(undefined)).toBe(ICONE_GENERICO);
    expect(rotuloDoPadrao('xyz', 'Nome vindo da API')).toBe('Nome vindo da API');
  });

  it('já tem ícone pros padrões que ainda não existem no projeto', () => {
    expect(iconeDoPadrao('fundo_duplo')).toBe('🇼');
    expect(iconeDoPadrao('topo_triplo')).toBe('🔺🔺🔺');
    expect(iconeDoPadrao('fundo_triplo')).toBe('🔻🔻🔻');
    expect(iconeDoPadrao('retangulo')).toBe('⬜');
    expect(iconeDoPadrao('diamante')).toBe('💠');
  });

  it('o tooltip diz o padrão, a data e o resultado', () => {
    expect(descricaoDoPadrao('bandeira_alta', '2025-06-14T00:00:00Z', null, 'sucesso'))
      .toBe('Bandeira de Alta • 14/06/2025 • sucesso');
    // sem resultado, só padrão e data
    expect(descricaoDoPadrao('oco', '2026-05-14T00:00:00Z')).toBe('OCO • 14/05/2026');
    // data em UTC: o candle é do dia inteiro, o fuso local jogaria um dia atrás
    expect(descricaoDoPadrao('bandeira_alta', '2026-01-01T02:00:00Z')).toContain('01/01/2026');
  });

  it('sem data, o tooltip ainda diz o que é', () => {
    expect(descricaoDoPadrao('topo_duplo', null)).toBe('Topo Duplo — já marcado aqui');
    expect(descricaoDoPadrao('oco', 'data-torta')).toBe('OCO — já marcado aqui');
    expect(descricaoDoPadrao('oco', null, null, 'falhou')).toBe('OCO — já marcado aqui • falhou');
  });
});
