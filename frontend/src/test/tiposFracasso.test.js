import { TIPOS_FRACASSO, rotuloDoTipoFracasso } from '../lib/tiposFracasso.js';

describe('classificação do fracasso', () => {
  it('tem os três tipos de armadilha, na ordem em que acontecem', () => {
    expect(TIPOS_FRACASSO.map((t) => t.id)).toEqual([
      'nao_rompeu', 'falso_rompimento', 'nao_atingiu_alvo',
    ]);
  });

  it('traduz a chave do banco para o rótulo da tela', () => {
    expect(rotuloDoTipoFracasso('falso_rompimento')).toBe('Falso rompimento');
    expect(rotuloDoTipoFracasso('nao_atingiu_alvo')).toBe('Não atingiu o alvo');
  });

  // a coluna é opcional: marcação sem classificação não mostra tag
  it('devolve vazio quando não foi classificado', () => {
    expect(rotuloDoTipoFracasso(null)).toBe('');
    expect(rotuloDoTipoFracasso(undefined)).toBe('');
    expect(rotuloDoTipoFracasso('')).toBe('');
    expect(rotuloDoTipoFracasso('inventado')).toBe('');
  });
});
