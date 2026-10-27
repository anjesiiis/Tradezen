import { CHAVE_LOCAL, faltandoNaConta, gravarLocal, juntar, lerLocal } from '../lib/graficosSalvos.js';

describe('Gráficos salvos — navegador x conta', () => {
  beforeEach(() => localStorage.clear());

  it('sem nada guardado, começa vazio', () => {
    expect(lerLocal()).toEqual({});
  });

  it('storage estragado não derruba a tela', () => {
    localStorage.setItem(CHAVE_LOCAL, 'isto não é json');
    expect(lerLocal()).toEqual({});
  });

  it('grava e lê de volta', () => {
    const config = { 'PETR4.SA': { tools: ['sma20'], desenhos: [{ tipo: 'trend' }] } };
    gravarLocal(config);
    expect(lerLocal()).toEqual(config);
  });

  // a conta é a cópia que vale entre aparelhos
  it('o que está na conta manda sobre o que está no navegador', () => {
    const conta = { 'PETR4.SA': { desenhos: ['da conta'] } };
    const local = { 'PETR4.SA': { desenhos: ['do navegador'] } };

    expect(juntar(conta, local)['PETR4.SA'].desenhos).toEqual(['da conta']);
  });

  it('ativo que só o navegador tem continua aparecendo', () => {
    const conta = { 'PETR4.SA': { desenhos: [] } };
    const local = { 'VALE3.SA': { desenhos: ['meu estudo'] } };

    expect(Object.keys(juntar(conta, local)).sort()).toEqual(['PETR4.SA', 'VALE3.SA']);
  });

  // quem desenhou deslogado e depois criou conta não pode perder o trabalho
  it('o que só existe no navegador é o que sobe pra conta', () => {
    const conta = { 'PETR4.SA': {} };
    const local = { 'PETR4.SA': {}, 'VALE3.SA': {}, 'BTC-USD': {} };

    expect(faltandoNaConta(conta, local).sort()).toEqual(['BTC-USD', 'VALE3.SA']);
  });

  it('conta vazia: sobe tudo o que havia no navegador', () => {
    expect(faltandoNaConta({}, { 'PETR4.SA': {} })).toEqual(['PETR4.SA']);
    expect(faltandoNaConta(null, { 'PETR4.SA': {} })).toEqual(['PETR4.SA']);
  });

  it('navegador vazio: não há o que subir', () => {
    expect(faltandoNaConta({ 'PETR4.SA': {} }, {})).toEqual([]);
  });
});
