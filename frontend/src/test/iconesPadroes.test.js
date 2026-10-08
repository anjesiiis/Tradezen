import { ICONE_GENERICO, chaveDoPadrao, descricaoDoPadrao, iconeDoPadrao, rotuloDoPadrao } from '../lib/iconesPadroes.js';

describe('Ícones dos padrões já marcados', () => {
  it('cada padrão do projeto tem um ícone próprio', () => {
    const esperado = {
      oco: '🟠', topo_duplo: '🔴', niveis: '💡',
      bandeira_alta: '🚩', bandeira_baixa: '🏴',
      flamula_alta: '🔼', flamula_baixa: '🔽',
      cunha_alta: '🔶', cunha_baixa: '🔸',
      canal_alta: '🟦', canal_baixa: '🟪',
    };
    for (const [tipo, icone] of Object.entries(esperado)) {
      expect(iconeDoPadrao(tipo)).toBe(icone);
    }
    // nenhum se repete: é o que permite reconhecer de relance
    const usados = Object.values(esperado);
    expect(new Set(usados).size).toBe(usados.length);
  });

  it('entende os dois jeitos de nomear que existem no sistema', () => {
    // o admin usa o id da tabela; o /padroes-marcados devolve o tipo em
    // caixa alta, e os níveis vêm como "suporte"/"resistencia"
    expect(iconeDoPadrao('OCO')).toBe('🟠');
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
    expect(iconeDoPadrao('oco_invertido')).toBe('🟡');
    expect(iconeDoPadrao('topo_triplo')).toBe('🔺');
    expect(iconeDoPadrao('fundo_triplo')).toBe('🔻');
    expect(iconeDoPadrao('triangulo')).toBe('🔷');
  });

  it('o tooltip diz o padrão e quando foi marcado', () => {
    expect(descricaoDoPadrao('oco', '2026-05-14T00:00:00Z')).toBe('OCO — marcado em 14/05/2026');
    // data em UTC: o candle é do dia inteiro, o fuso local jogaria um dia atrás
    expect(descricaoDoPadrao('bandeira_alta', '2026-01-01T02:00:00Z')).toContain('01/01/2026');
  });

  it('sem data, o tooltip ainda diz o que é', () => {
    expect(descricaoDoPadrao('topo_duplo', null)).toBe('Topo Duplo — já marcado aqui');
    expect(descricaoDoPadrao('oco', 'data-torta')).toBe('OCO — já marcado aqui');
  });
});
