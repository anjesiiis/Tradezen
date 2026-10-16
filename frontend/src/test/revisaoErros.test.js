import { DESFECHOS, deuCerto, falhou, lerDesfecho, rotuloDoDesfecho } from '../lib/resultado.js';

// O campo `resultado` é texto livre preenchido à mão ao longo de meses.
// Filtrar por igualdade erra calado — e erro calado na hora de montar o
// conjunto de treino é o pior tipo.
describe('Leitura do desfecho de um template', () => {
  it('reconhece as variações que existem de verdade nos dados', () => {
    expect(lerDesfecho('sucesso')).toBe('sucesso');
    expect(lerDesfecho('sucess')).toBe('sucesso');          // erro de digitação real
    expect(lerDesfecho('sucesso,porem')).toBe('sucesso');
    expect(lerDesfecho('sucesso com questionamento')).toBe('sucesso');
    expect(lerDesfecho('Sucesso!')).toBe('sucesso');
    expect(lerDesfecho('falha')).toBe('falhou');
    expect(lerDesfecho('falhou')).toBe('falhou');
    expect(lerDesfecho('Falhou')).toBe('falhou');
  });

  it('o que não é desfecho vira indefinido, não um palpite', () => {
    // em templates_niveis o campo virou o TIPO, não o desfecho
    expect(lerDesfecho('suporte')).toBe('indefinido');
    expect(lerDesfecho('resistencia')).toBe('indefinido');
    expect(lerDesfecho('bandeira')).toBe('indefinido');
    expect(lerDesfecho('')).toBe('indefinido');
    expect(lerDesfecho(null)).toBe('indefinido');
    expect(lerDesfecho(undefined)).toBe('indefinido');
  });

  it('sempre devolve um dos três', () => {
    for (const t of ['sucesso', 'falhou', 'qualquer coisa', '', null]) {
      expect(DESFECHOS).toContain(lerDesfecho(t));
    }
  });

  it('falhou e deuCerto são excludentes', () => {
    expect(falhou('falha')).toBe(true);
    expect(deuCerto('falha')).toBe(false);
    expect(deuCerto('sucess')).toBe(true);
    expect(falhou('sucess')).toBe(false);
    // indefinido não é nenhum dos dois
    expect(falhou('suporte')).toBe(false);
    expect(deuCerto('suporte')).toBe(false);
  });

  it('o rótulo da tela sai dos mesmos três', () => {
    expect(rotuloDoDesfecho('falha')).toBe('Falhou');
    expect(rotuloDoDesfecho('sucess')).toBe('Sucesso');
    expect(rotuloDoDesfecho('suporte')).toBe('Indefinido');
  });
});
