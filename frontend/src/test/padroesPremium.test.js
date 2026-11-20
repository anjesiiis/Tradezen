import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetchPadroesMarcados } from '../lib/grafico/padroes.js';

// O gate de premium é decidido no backend. O que se testa aqui é o lado do
// cliente: mandar o token quando existe, não mandar header nenhum quando
// não existe, e devolver o `plano` pra tela saber por que veio vazio.
describe('fetchPadroesMarcados — conteúdo premium', () => {
  function respostaDoBackend(corpo) {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => corpo }));
  }

  it('manda o token no header quando tem sessão', async () => {
    respostaDoBackend({ padroes: [{ tipo: 'bandeira_alta' }], niveis: [], plano: 'premium' });

    const r = await fetchPadroesMarcados('PETR4.SA', '1d', 'tok-123');

    expect(globalThis.fetch.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer tok-123' } });
    expect(r.padroes).toHaveLength(1);
    expect(r.plano).toBe('premium');
  });

  it('sem token não manda header nenhum', async () => {
    respostaDoBackend({ padroes: [], niveis: [], plano: 'free' });

    await fetchPadroesMarcados('PETR4.SA', '1d');

    expect(globalThis.fetch.mock.calls[0][1]).toBeUndefined();
  });

  // é assim que a tela sabe mostrar o aviso de premium em vez de
  // "nenhum padrão marcado nesse ativo"
  it('devolve o plano que o backend informou junto com a lista vazia', async () => {
    respostaDoBackend({ padroes: [], niveis: [], plano: 'free' });

    const r = await fetchPadroesMarcados('PETR4.SA', '1d', 'tok-de-free');

    expect(r).toEqual({ padroes: [], niveis: [], plano: 'free', timeframesComPadrao: [] });
  });

  it('erro de rede não quebra o gráfico — volta vazio e sem plano', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline'); });

    expect(await fetchPadroesMarcados('PETR4.SA', '1d', 'tok')).toEqual({
      padroes: [], niveis: [], plano: null, timeframesComPadrao: [],
    });
  });
});

// "SÓ APARECE EM 2 GRÁFICOS" — a causa real, e não era bug nenhum.
//
// Quatro mesas abertas no 1D: duas mostravam padrão, duas não. Medido
// contra o banco: os dois ativos "sem padrão" tinham os padrões marcados
// no 60m e no semanal, não no 1D. O dado não existia naquele tempo.
//
// Nada estava quebrado — a tela só não dizia ONDE o padrão estava, e isso
// é indistinguível de defeito. A rota agora informa em que tempos o ativo
// tem padrão, e a tela oferece o atalho.
describe('em que tempos o ativo tem padrão', () => {
  // `respostaDoBackend` mora dentro do describe de cima; aqui tem a sua.
  function respostaDoBackend(corpo) {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => corpo }));
  }

  it('a rota devolve a lista, e ela chega ao frontend', async () => {
    respostaDoBackend({
      padroes: [], niveis: [], plano: 'admin',
      timeframes_com_padrao: ['1wk', '60m'],
    });

    const r = await fetchPadroesMarcados('DIRR3.SA', '1d', 'tok');
    expect(r.padroes).toEqual([]);
    expect(r.timeframesComPadrao).toEqual(['1wk', '60m']);
  });

  // Ativo sem padrão em tempo NENHUM é outro caso: aí não há atalho a
  // oferecer, e a tela não deve sugerir nada.
  it('ativo sem padrão nenhum devolve lista vazia', async () => {
    respostaDoBackend({ padroes: [], niveis: [], plano: 'admin' });
    const r = await fetchPadroesMarcados('XPTO9.SA', '1d', 'tok');
    expect(r.timeframesComPadrao).toEqual([]);
  });
});

// DESLOGAR TEM DE APAGAR O QUE ESTÁ NA TELA.
//
// O efeito que busca as detecções saía cedo quando `user` era nulo, e
// ninguém limpava os padrões já desenhados: quem estava num plano com
// acesso, deslogava, e continuava vendo as detecções até recarregar a
// página. Conteúdo pago na tela de quem já não tem conta.
describe('a tela limpa quando o acesso acaba', () => {
  const fonte = readFileSync(
    resolve(process.cwd(), 'src/pages/Grafico.jsx'), 'utf8');

  it('sem conta, os padrões são zerados em vez de ignorados', () => {
    const bloco = fonte.slice(fonte.indexOf('SAIR DA CONTA TEM DE APAGAR'));
    expect(bloco.slice(0, 900)).toMatch(/if\(!user\)\{/);
    for (const limpeza of [/setPadroes\(\[\]\)/, /setTemposComPadrao\(\[\]\)/,
                           /setPlanoDetec\(null\)/, /setSelPat\(null\)/]) {
      expect(bloco.slice(0, 900)).toMatch(limpeza);
    }
  });

  // Lista vazia é RESPOSTA, não ausência de resposta: quem perdeu o
  // acesso tem de ver a tela limpar.
  it('lista vazia do servidor também limpa a seleção', () => {
    expect(fonte).toMatch(/if\(!marcados\.padroes\?\.length\) setSelPat\(null\);/);
  });

  // O efeito tem de reagir a `user`, senão a troca de conta não refaz a
  // busca e a tela fica com o resultado da conta anterior.
  it('o efeito depende de user', () => {
    expect(fonte).toMatch(/\},\[ticker, user, tf\.intervalo\]\);/);
  });
});
