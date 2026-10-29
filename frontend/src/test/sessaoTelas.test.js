import { MAX_EXTRAS, normalizarSessao, temAlgoAGuardar } from '../lib/sessaoTelas.js';

/**
 * Quem abre PETR4 no diário e VALE3 no semanal lado a lado está montando
 * uma bancada, não navegando. Dar F5 e perder a bancada é perder
 * trabalho, mesmo sem nenhum desenho feito.
 *
 * A mesa PRINCIPAL continua vindo da URL — é o que faz um link de ativo
 * funcionar. O que se guarda são as mesas extras, o tempo de cada uma
 * (inclusive o da principal) e qual estava na frente no celular.
 */

const VAZIA = { extras: [], tempoPrincipal: null, ativa: 0 };

describe('Bancada guardada — o que entra', () => {
  it('guarda ticker e tempo de cada mesa extra', () => {
    const s = normalizarSessao({ extras: [{ ticker: 'VALE3.SA', tempo: '1S' }] });
    expect(s.extras).toEqual([{ ticker: 'VALE3.SA', tempo: '1S' }]);
  });

  it('mesa sem tempo fica sem tempo, em vez de ganhar um inventado', () => {
    const s = normalizarSessao({ extras: [{ ticker: 'VALE3.SA' }] });
    expect(s.extras).toEqual([{ ticker: 'VALE3.SA' }]);
  });

  it('o tempo da principal é guardado sozinho, porque o ticker dela vem da URL', () => {
    expect(normalizarSessao({ tempoPrincipal: '1S' }).tempoPrincipal).toBe('1S');
  });

  it('respeita o teto de mesas extras', () => {
    const muitas = Array.from({ length: 10 }, (_, i) => ({ ticker: `T${i}` }));
    expect(normalizarSessao({ extras: muitas }).extras).toHaveLength(MAX_EXTRAS);
  });
});

describe('Bancada guardada — o que não entra', () => {
  it.each([
    ['nulo', null],
    ['texto solto', 'PETR4'],
    ['número', 42],
    ['extras que não é lista', { extras: 'PETR4' }],
  ])('%s vira bancada vazia', (_nome, entrada) => {
    expect(normalizarSessao(entrada)).toEqual(VAZIA);
  });

  it('mesa sem ticker é descartada, não vira tela quebrada', () => {
    const s = normalizarSessao({ extras: [{ ticker: '' }, { tempo: '1D' }, null, { ticker: 'OK' }] });
    expect(s.extras).toEqual([{ ticker: 'OK' }]);
  });

  it('ticker com espaço sobrando é aparado', () => {
    expect(normalizarSessao({ extras: [{ ticker: '  PETR4.SA ' }] }).extras[0].ticker).toBe('PETR4.SA');
  });

  // Aba apontando pra uma mesa que não existe deixaria a tela em branco
  it('a aba ativa nunca aponta pra uma mesa que não existe', () => {
    expect(normalizarSessao({ extras: [{ ticker: 'A' }], ativa: 7 }).ativa).toBe(0);
    expect(normalizarSessao({ extras: [], ativa: 1 }).ativa).toBe(0);
    expect(normalizarSessao({ ativa: -1 }).ativa).toBe(0);
  });

  it('a aba ativa válida é mantida (0 é a principal)', () => {
    const s = normalizarSessao({ extras: [{ ticker: 'A' }, { ticker: 'B' }], ativa: 2 });
    expect(s.ativa).toBe(2);
  });
});

describe('Quando vale a pena guardar', () => {
  // Bancada de uma mesa no tempo padrão não é bancada — e se virasse
  // linha no banco, ressuscitaria sozinha no próximo F5
  it('uma mesa só, no tempo padrão, não deixa registro', () => {
    expect(temAlgoAGuardar(VAZIA)).toBe(false);
    expect(temAlgoAGuardar(null)).toBe(false);
  });

  it('uma mesa extra já é bancada', () => {
    expect(temAlgoAGuardar({ extras: [{ ticker: 'VALE3.SA' }] })).toBe(true);
  });

  // Dar F5 numa mesa no semanal tem que devolver o semanal, mesmo sem
  // nenhuma mesa extra aberta
  it('tempo diferente do padrão, sozinho, já é motivo pra guardar', () => {
    expect(temAlgoAGuardar({ extras: [], tempoPrincipal: '1S' })).toBe(true);
  });
});
