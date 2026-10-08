import { ICONE_GENERICO, chaveDoPadrao, descricaoDoPadrao, ficaAcima, iconeDoPadrao, rotuloDoPadrao } from '../lib/iconesPadroes.js';

describe('Ícones dos padrões já marcados', () => {
  it('a cor do ícone segue a direção do padrão', () => {
    const esperado = {
      bandeira_alta: '🟢', canal_alta: '🟢',          // alta
      bandeira_baixa: '🔴', topo_duplo: '🔴', oco: '🔴', canal_baixa: '🔴',   // baixa
      flamula_alta: '🔵', flamula_baixa: '🔵',        // neutro
      cunha_alta: '🟡', cunha_baixa: '🟡',            // rompe pros dois lados
      niveis: '💡',                                   // nível, não padrão de preço
    };
    for (const [tipo, icone] of Object.entries(esperado)) {
      expect(iconeDoPadrao(tipo)).toBe(icone);
    }
  });

  it('o emoji fica embaixo do candle nos padrões de alta e em cima nos demais', () => {
    expect(ficaAcima('bandeira_alta')).toBe(false);
    expect(ficaAcima('canal_alta')).toBe(false);
    expect(ficaAcima('fundo_duplo')).toBe(false);
    expect(ficaAcima('topo_duplo')).toBe(true);
    expect(ficaAcima('oco')).toBe(true);
    expect(ficaAcima('cunha_alta')).toBe(true);     // 🟡 fica acima
    expect(ficaAcima('flamula_alta')).toBe(true);   // 🔵 fica acima
  });

  it('entende os dois jeitos de nomear que existem no sistema', () => {
    // o admin usa o id da tabela; o /padroes-marcados devolve o tipo em
    // caixa alta, e os níveis vêm como "suporte"/"resistencia"
    expect(iconeDoPadrao('OCO')).toBe('🔴');
    expect(iconeDoPadrao('TOPO_DUPLO')).toBe('🔴');
    expect(iconeDoPadrao('suporte')).toBe('💡');
    expect(iconeDoPadrao('Resistência')).toBe('💡');
    expect(chaveDoPadrao('Bandeira-Alta')).toBe('bandeira_alta');
  });

  it('padrão sem ícone próprio cai no genérico, sem quebrar', () => {
    expect(iconeDoPadrao('coisa_que_nao_existe')).toBe(ICONE_GENERICO);
    expect(iconeDoPadrao(undefined)).toBe(ICONE_GENERICO);
    expect(rotuloDoPadrao('xyz', 'Nome vindo da API')).toBe('Nome vindo da API');
  });

  it('já tem ícone pros padrões que ainda não existem no projeto', () => {
    expect(iconeDoPadrao('fundo_duplo')).toBe('🟢');
    expect(iconeDoPadrao('oco_invertido')).toBe('🟢');
    expect(iconeDoPadrao('topo_triplo')).toBe('🔴');
    expect(iconeDoPadrao('fundo_triplo')).toBe('🟢');
    expect(iconeDoPadrao('triangulo_ascendente')).toBe('🔵');
    expect(iconeDoPadrao('retangulo')).toBe('⬜');
    expect(iconeDoPadrao('diamante')).toBe('🟣');
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
