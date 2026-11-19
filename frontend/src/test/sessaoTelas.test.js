import { TETO_DE_TELAS } from '../lib/limitesTelas.js';
import { MAX_EXTRAS, normalizarSessao, temAlgoAGuardar,
  gravarBancadaLocal,
  lerBancadaLocal,
} from '../lib/sessaoTelas.js';

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

  // O TETO DO ARMAZENAMENTO é o do MAIOR plano, não o de quem está
  // logado. Era 3 na mão, de quando o máximo eram 4 telas: com o admin em
  // 12, a bancada guardaria 3 extras e o F5 devolveria 4 mesas de 12 —
  // sem aviso. Quem corta pelo plano é cortarExtras, na montagem da tela.
  it('guarda tudo que o maior plano permite', () => {
    const muitas = Array.from({ length: 30 }, (_, i) => ({ ticker: `T${i}` }));
    expect(normalizarSessao({ extras: muitas }).extras).toHaveLength(MAX_EXTRAS);
    expect(MAX_EXTRAS).toBe(TETO_DE_TELAS - 1);
    expect(MAX_EXTRAS).toBeGreaterThanOrEqual(11);
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

// A RESERVA NO NAVEGADOR — o conserto do "dei F5 e voltei com um ativo".
//
// A bancada ia só pro banco, e `sessao_telas` não existe até a migration
// 022 rodar. Então nada era guardado em lugar nenhum: abrir dois ativos,
// atualizar a página e voltar com um. Sem erro na tela, porque a função
// já engolia a falha. Agora o navegador guarda primeiro.
describe('a bancada guardada no navegador', () => {
  const USER = 'u-1';
  const BANCADA = { extras: [{ ticker: 'VALE3.SA', tempo: '1d' }], tempoPrincipal: '1wk', ativa: 0 };

  beforeEach(() => { try { localStorage.clear(); } catch { /* sem storage */ } });

  it('grava e lê a mesma bancada', () => {
    expect(gravarBancadaLocal(USER, BANCADA)).toBe(true);
    expect(lerBancadaLocal(USER).sessao.extras).toHaveLength(1);
    expect(lerBancadaLocal(USER).sessao.tempoPrincipal).toBe('1wk');
  });

  // Duas contas no mesmo navegador não podem herdar a bancada uma da outra.
  it('cada conta tem a sua', () => {
    gravarBancadaLocal(USER, BANCADA);
    expect(lerBancadaLocal('u-2')).toBeNull();
  });

  it('sem conta não guarda nada', () => {
    expect(gravarBancadaLocal(null, BANCADA)).toBe(false);
    expect(lerBancadaLocal(null)).toBeNull();
  });

  // Bancada de uma mesa no tempo padrão não é bancada: guardá-la faria
  // o F5 "restaurar" o estado inicial, que já é o que a tela abre.
  it('bancada vazia apaga em vez de gravar', () => {
    gravarBancadaLocal(USER, BANCADA);
    gravarBancadaLocal(USER, { extras: [], tempoPrincipal: null, ativa: 0 });
    expect(lerBancadaLocal(USER)).toBeNull();
  });

  it('guarda quando foi gravada, pra poder comparar com a da conta', () => {
    const antes = Date.now();
    gravarBancadaLocal(USER, BANCADA);
    expect(lerBancadaLocal(USER).em).toBeGreaterThanOrEqual(antes);
  });

  // JSON corrompido por uma versão antiga é como não ter nada guardado —
  // nunca motivo pra derrubar a tela.
  it('lixo no storage não quebra a leitura', () => {
    localStorage.setItem(`tradezen:bancada:${USER}`, '{isso nao e json');
    expect(lerBancadaLocal(USER)).toBeNull();
  });

  it('normaliza o que lê: mesa sem ticker não volta', () => {
    localStorage.setItem(`tradezen:bancada:${USER}`, JSON.stringify({
      sessao: { extras: [{ tempo: '1d' }, { ticker: 'PETR4.SA' }], tempoPrincipal: null },
      em: Date.now(),
    }));
    const lida = lerBancadaLocal(USER).sessao;
    expect(lida.extras).toHaveLength(1);
    expect(lida.extras[0].ticker).toBe('PETR4.SA');
  });
});

// QUEM GANHA: NAVEGADOR OU CONTA
//
// A regra é "o mais recente vence". Sem ela, abrir o site num aparelho
// que ficou dias parado reescreveria com uma bancada velha a que você
// acabou de montar no aparelho de agora.
describe('carregarSessao junta as duas cópias', () => {
  const USER = 'u-9';
  const doLocal = { extras: [{ ticker: 'LOCAL3.SA' }], tempoPrincipal: null, ativa: 0 };
  const daConta = { extras: [{ ticker: 'CONTA3.SA' }], tempoPrincipal: null, ativa: 0 };

  const mockarConta = (telas, atualizado_em) => {
    vi.doMock('../lib/supabaseClient.js', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: telas ? { telas, atualizado_em } : null, error: null,
              }),
            }),
          }),
        }),
      },
    }));
  };

  beforeEach(() => {
    vi.resetModules();
    try { localStorage.clear(); } catch { /* sem storage */ }
  });

  it('conta mais nova ganha do navegador', async () => {
    mockarConta(daConta, new Date(Date.now() + 60000).toISOString());
    const mod = await import('../lib/sessaoTelas.js');
    mod.gravarBancadaLocal(USER, doLocal);
    const r = await mod.carregarSessao(USER);
    expect(r.extras[0].ticker).toBe('CONTA3.SA');
  });

  it('navegador mais novo ganha da conta', async () => {
    mockarConta(daConta, new Date(Date.now() - 600000).toISOString());
    const mod = await import('../lib/sessaoTelas.js');
    mod.gravarBancadaLocal(USER, doLocal);
    const r = await mod.carregarSessao(USER);
    expect(r.extras[0].ticker).toBe('LOCAL3.SA');
  });

  // O CASO DE HOJE: a 022 não rodou, o banco responde erro, e o F5 TEM
  // de devolver a bancada mesmo assim. É isto que conserta o relato.
  it('banco sem a tabela não impede a restauração', async () => {
    vi.doMock('../lib/supabaseClient.js', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: null,
                error: { code: 'PGRST205', message: "Could not find the table 'public.sessao_telas'" },
              }),
            }),
          }),
        }),
      },
    }));
    const mod = await import('../lib/sessaoTelas.js');
    mod.gravarBancadaLocal(USER, doLocal);
    const r = await mod.carregarSessao(USER);
    expect(r.extras[0].ticker).toBe('LOCAL3.SA');
  });

  it('sem nada em lugar nenhum devolve null', async () => {
    mockarConta(null, null);
    const mod = await import('../lib/sessaoTelas.js');
    expect(await mod.carregarSessao(USER)).toBeNull();
  });
});
