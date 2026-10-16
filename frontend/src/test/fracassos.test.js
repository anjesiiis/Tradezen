import { PADROES, PADROES_FRACASSO, avisosDoPadrao, ehFracasso, padroesCompativeis, stepsDoPadrao, validarPadrao } from '../admin/bandeira.js';
import { API_DO_PADRAO } from '../admin/adminApi';
import { GRUPOS_DE_PADRAO, grupoDoPadrao } from '../admin/gruposDePadrao.js';

// Fracasso é o que PARECE o padrão e não é — o contraexemplo que ensina
// o detector a não confundir. Não confundir com padrão que FALHOU: esse
// se formou, continua sendo o padrão, e o desfecho dele vai na coluna
// `resultado` da tabela de sucesso.
const pt = (i, preco) => ({ i, preco });
const OITO = (ajustes = {}) => ({
  p1_inicio_mastro1: pt(0, 10), p2_topo_mastro1: pt(5, 20),
  p3_inicio_fundo: pt(7, 17), p4_fim_fundo: pt(13, 16),
  p5_inicio_topo: pt(8, 19.5), p6_fim_topo: pt(14, 18.5),
  p7_inicio_mastro2: pt(13, 16), p8_topo_mastro2: pt(22, 28),
  ...ajustes,
});

describe('Fracassos — contraexemplos de forma', () => {
  it('são dois, um por direção da bandeira, com tela própria', () => {
    expect(Object.keys(PADROES_FRACASSO)).toEqual(['bandeira_alta_fracasso', 'bandeira_baixa_fracasso']);
    expect(PADROES_FRACASSO.bandeira_alta_fracasso.rota).toBe('/admin/templates/fracasso-bandeira-alta');
    expect(PADROES_FRACASSO.bandeira_alta_fracasso.rotulo).toBe('Fracassos — Bandeira de Alta');
    // entram no registro central, então a tela de marcação os enxerga
    for (const id of Object.keys(PADROES_FRACASSO)) expect(PADROES[id]).toBeTruthy();
  });

  it('usam os mesmos 8 pontos da bandeira — a marcação é o mesmo gesto', () => {
    expect(stepsDoPadrao(PADROES.bandeira_alta_fracasso).map((s) => s.key))
      .toEqual(stepsDoPadrao(PADROES.bandeira_alta).map((s) => s.key));
  });

  it('o desenho torto SALVA: é justamente ele que se quer guardar', () => {
    // topo da consolidação abaixo do fundo — barrado na tela de sucesso
    const torto = OITO({ p5_inicio_topo: pt(8, 12), p6_fim_topo: pt(14, 12.5) });

    expect(validarPadrao(torto, PADROES.bandeira_alta).length).toBeGreaterThan(0);
    expect(validarPadrao(torto, PADROES.bandeira_alta_fracasso)).toEqual([]);
    // e nada de aviso amarelo: não há o que conferir num contraexemplo
    expect(avisosDoPadrao(torto, PADROES.bandeira_alta_fracasso)).toEqual([]);
  });

  it('mas ainda exige os 8 pontos — meio contraexemplo não serve', () => {
    expect(validarPadrao({ p1_inicio_mastro1: pt(0, 10) }, PADROES.bandeira_alta_fracasso))
      .toEqual(['Marque os 8 pontos antes de salvar.']);
  });

  it('o seletor não mistura as duas classes', () => {
    // mesmos pontos, classes opostas: trocar transformaria a análise em
    // contraexemplo com um clique
    expect(padroesCompativeis(PADROES.bandeira_alta).map((p) => p.id)).not.toContain('bandeira_alta_fracasso');
    expect(padroesCompativeis(PADROES.bandeira_alta_fracasso).map((p) => p.id))
      .toEqual(['bandeira_alta_fracasso', 'bandeira_baixa_fracasso']);
  });

  it('cada um salva na sua própria tabela', () => {
    expect(API_DO_PADRAO.bandeira_alta_fracasso).toBeTruthy();
    expect(API_DO_PADRAO.bandeira_alta_fracasso).not.toBe(API_DO_PADRAO.bandeira_alta);
    expect(API_DO_PADRAO.bandeira_baixa_fracasso).not.toBe(API_DO_PADRAO.bandeira_alta_fracasso);
  });

  it('ficam num grupo próprio da navegação, marcado como perigo', () => {
    const grupo = GRUPOS_DE_PADRAO.find((g) => g.id === 'fracassos');
    expect(grupo.perigo).toBe(true);
    expect(grupo.itens.map((i) => i.href)).toEqual([
      '/admin/o-que-deu-errado',                      // a revisão vem primeiro
      '/admin/templates/fracasso-bandeira-alta',
      '/admin/templates/fracasso-bandeira-baixa',
    ]);
    expect(grupoDoPadrao('fracasso-bandeira-baixa').id).toBe('fracassos');
    // e NÃO aparecem junto com as bandeiras de verdade
    const continuacao = GRUPOS_DE_PADRAO.find((g) => g.id === 'continuacao');
    expect(continuacao.itens.map((i) => i.key)).not.toContain('fracasso-bandeira-alta');
  });

  it('ehFracasso separa as duas classes', () => {
    expect(ehFracasso(PADROES.bandeira_alta_fracasso)).toBe(true);
    expect(ehFracasso(PADROES.bandeira_alta)).toBe(false);
    expect(ehFracasso(null)).toBe(false);
  });
});
