import { ORDEM_DE_MARCACAO, mercadosEmOrdem, numerarAtivos } from '../lib/ordemAtivos.js';

// A numeração existe pra lembrar em qual ativo a marcação parou: ações
// brasileiras primeiro, depois cripto, depois o resto — número contínuo.
const ativos = [
  { ticker: 'AAPL', mercado: 'NASDAQ' },
  { ticker: 'PETR4.SA', mercado: 'B3' },
  { ticker: 'BTC-USD', mercado: 'CRIPTO' },
  { ticker: 'VALE3.SA', mercado: 'B3' },
  { ticker: 'GC=F', mercado: 'COMMODITY' },
  { ticker: 'ETH-USD', mercado: 'CRIPTO' },
  { ticker: 'KO', mercado: 'NYSE' },
];

describe('Ordem e número dos ativos na marcação', () => {
  it('numera do 1 em diante, B3 → cripto → resto', () => {
    expect(numerarAtivos(ativos).map((a) => [a.numero, a.ticker])).toEqual([
      [1, 'PETR4.SA'], [2, 'VALE3.SA'],      // ações brasileiras primeiro
      [3, 'BTC-USD'], [4, 'ETH-USD'],        // depois cripto
      [5, 'KO'], [6, 'AAPL'], [7, 'GC=F'],   // depois o resto
    ]);
  });

  it('dentro do mercado mantém a ordem do catálogo', () => {
    const b3 = numerarAtivos(ativos).filter((a) => a.mercado === 'B3');
    expect(b3.map((a) => a.ticker)).toEqual(['PETR4.SA', 'VALE3.SA']);
  });

  it('não mexe na lista original nem perde campo', () => {
    const copia = [...ativos];
    const numerados = numerarAtivos(ativos);
    expect(ativos).toEqual(copia);
    expect(numerados[0]).toMatchObject({ ticker: 'PETR4.SA', mercado: 'B3', numero: 1 });
  });

  it('mercado que ainda não existe na ordem vai pro fim, sem quebrar', () => {
    const comNovo = [...ativos, { ticker: 'XPTO', mercado: 'MERCADO_NOVO' }];
    const numerados = numerarAtivos(comNovo);
    expect(numerados[numerados.length - 1].ticker).toBe('XPTO');
    expect(mercadosEmOrdem(comNovo)).toEqual([...ORDEM_DE_MARCACAO.filter((m) => m !== 'FOREX' && m !== 'INDICE'), 'MERCADO_NOVO']);
  });

  it('lista vazia não quebra', () => {
    expect(numerarAtivos()).toEqual([]);
    expect(mercadosEmOrdem()).toEqual([]);
  });
});
