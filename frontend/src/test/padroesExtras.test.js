import {
  PADROES_EXTRAS, ancoraExtra, areasExtras, avisosExtras, ehExtra,
  linhasExtras, passosExtras, stepsExtras, validarExtra,
} from '../admin/padroesExtras.js';
import { PADROES, padroesCompativeis, stepsDoPadrao, validarPadrao } from '../admin/bandeira.js';

const P = PADROES_EXTRAS;
const pt = (i, preco) => ({ i, preco });

// marcação válida de cada padrão, pra partir dela e quebrar um ponto só
const VALIDOS = {
  fundo_duplo: { vale1: pt(2, 100), pico: pt(6, 115), vale2: pt(10, 102), confirmacao: pt(14, 118) },
  oco_invertido: { ombro_esq: pt(2, 100), cabeca: pt(6, 90), ombro_dir: pt(10, 102), pescoco: pt(12, 110) },
  topo_triplo: { topo1: pt(2, 100), vale1: pt(4, 90), topo2: pt(6, 101), vale2: pt(8, 91), topo3: pt(10, 99) },
  fundo_triplo: { fundo1: pt(2, 100), pico1: pt(4, 110), fundo2: pt(6, 101), pico2: pt(8, 111), fundo3: pt(10, 99) },
  triangulo_ascendente: { res_esq: pt(2, 100), res_dir: pt(12, 101), sup_esq: pt(4, 90), sup_dir: pt(10, 96) },
  triangulo_descendente: { res_esq: pt(2, 110), res_dir: pt(12, 102), sup_esq: pt(4, 90), sup_dir: pt(10, 90.5) },
  triangulo_simetrico: { topo_esq: pt(2, 110), topo_dir: pt(12, 103), fundo_esq: pt(4, 90), fundo_dir: pt(10, 97) },
  retangulo: { res_esq: pt(2, 100), res_dir: pt(12, 101), sup_esq: pt(4, 90), sup_dir: pt(10, 90.5) },
};

describe('Os 8 padrões de reversão e consolidação', () => {
  it('todos entram no registro de padrões, com rota e rótulo', () => {
    expect(Object.keys(P)).toEqual([
      'fundo_duplo', 'oco_invertido', 'topo_triplo', 'fundo_triplo',
      'triangulo_ascendente', 'triangulo_descendente', 'triangulo_simetrico', 'retangulo',
    ]);
    expect(P.fundo_duplo.rota).toBe('/admin/templates/fundo-duplo');
    expect(P.triangulo_simetrico.rotulo).toBe('Triângulo Simétrico');
    // e PainelMarcacao enxerga todos pelo registro central
    for (const id of Object.keys(P)) expect(PADROES[id]).toBe(P[id]);
  });

  it('cada um tem os seus pontos, na ordem de marcação', () => {
    expect(passosExtras(P.fundo_duplo)).toEqual(['vale1', 'pico', 'vale2', 'confirmacao']);
    expect(passosExtras(P.oco_invertido)).toEqual(['ombro_esq', 'cabeca', 'ombro_dir', 'pescoco']);
    expect(passosExtras(P.topo_triplo)).toEqual(['topo1', 'vale1', 'topo2', 'vale2', 'topo3']);
    expect(passosExtras(P.fundo_triplo)).toEqual(['fundo1', 'pico1', 'fundo2', 'pico2', 'fundo3']);
    expect(stepsExtras(P.retangulo).map((s) => s.label)).toEqual([
      'Resistência Esquerda', 'Resistência Direita', 'Suporte Esquerdo', 'Suporte Direito',
    ]);
    // bandeira.js encaminha pra cá — a tela é a mesma dos outros padrões
    expect(stepsDoPadrao(P.topo_triplo).map((s) => s.key)).toEqual(passosExtras(P.topo_triplo));
    expect(ehExtra(PADROES.bandeira_alta)).toBe(false);
  });

  it('marcação completa e correta passa em todos', () => {
    for (const [id, pontos] of Object.entries(VALIDOS)) {
      expect(validarExtra(pontos, P[id]), id).toEqual([]);
      expect(validarPadrao(pontos, P[id]), id).toEqual([]);
    }
  });

  it('faltando ponto, diz quantos são', () => {
    expect(validarExtra({ topo1: pt(1, 100) }, P.topo_triplo)).toEqual(['Marque os 5 pontos antes de salvar.']);
    expect(validarExtra({}, P.retangulo)).toEqual(['Marque os 4 pontos antes de salvar.']);
  });

  describe('regras que bloqueiam o salvamento', () => {
    it('fundo duplo: ordem no tempo, vales no mesmo nível e pico acima', () => {
      expect(validarExtra({ ...VALIDOS.fundo_duplo, vale2: pt(4, 102) }, P.fundo_duplo))
        .toContain('"Vale 2" precisa vir depois do "Pico" no tempo.');
      expect(validarExtra({ ...VALIDOS.fundo_duplo, confirmacao: pt(8, 118) }, P.fundo_duplo))
        .toContain('"Confirmação" precisa vir depois do "Vale 2".');
      // 100 e 130 é 30% de diferença: não são o mesmo nível
      expect(validarExtra({ ...VALIDOS.fundo_duplo, vale2: pt(10, 130) }, P.fundo_duplo).join())
        .toMatch(/mesmo nível/);
      expect(validarExtra({ ...VALIDOS.fundo_duplo, pico: pt(6, 95) }, P.fundo_duplo))
        .toContain('O "Pico" precisa estar acima dos dois vales.');
    });

    it('OCO invertido: cabeça mais baixa, ombros iguais, pescoço acima', () => {
      expect(validarExtra({ ...VALIDOS.oco_invertido, cabeca: pt(6, 105) }, P.oco_invertido))
        .toContain('A "Cabeça" precisa estar mais baixa que os dois ombros.');
      expect(validarExtra({ ...VALIDOS.oco_invertido, ombro_dir: pt(10, 140) }, P.oco_invertido).join())
        .toMatch(/ombros precisam estar no mesmo nível/);
      expect(validarExtra({ ...VALIDOS.oco_invertido, pescoco: pt(12, 95) }, P.oco_invertido))
        .toContain('A "Linha de Pescoço" precisa estar acima dos três fundos.');
    });

    it('triplos: três extremos no mesmo nível e o meio entre eles', () => {
      expect(validarExtra({ ...VALIDOS.topo_triplo, topo3: pt(10, 140) }, P.topo_triplo).join())
        .toMatch(/três topos/);
      expect(validarExtra({ ...VALIDOS.topo_triplo, vale1: pt(9, 90) }, P.topo_triplo))
        .toContain('"Vale 1" precisa ficar entre "Topo 1" e "Topo 2".');
      expect(validarExtra({ ...VALIDOS.fundo_triplo, pico2: pt(1, 111) }, P.fundo_triplo))
        .toContain('"Pico 2" precisa ficar entre "Fundo 2" e "Fundo 3".');
    });

    it('triângulo ascendente: resistência horizontal e suporte subindo', () => {
      expect(validarExtra({ ...VALIDOS.triangulo_ascendente, res_dir: pt(12, 130) }, P.triangulo_ascendente).join())
        .toMatch(/resistência precisa ser horizontal/);
      expect(validarExtra({ ...VALIDOS.triangulo_ascendente, sup_dir: pt(10, 85) }, P.triangulo_ascendente))
        .toContain('"Suporte Direito" precisa estar acima de "Suporte Esquerdo" — é o suporte que sobe.');
    });

    it('triângulo descendente: suporte horizontal e resistência cedendo', () => {
      expect(validarExtra({ ...VALIDOS.triangulo_descendente, sup_dir: pt(10, 120) }, P.triangulo_descendente).join())
        .toMatch(/suporte precisa ser horizontal/);
      expect(validarExtra({ ...VALIDOS.triangulo_descendente, res_dir: pt(12, 120) }, P.triangulo_descendente).join())
        .toMatch(/Resistência Direita/);
    });

    it('triângulo simétrico: as duas bordas convergem', () => {
      expect(validarExtra({ ...VALIDOS.triangulo_simetrico, topo_dir: pt(12, 120) }, P.triangulo_simetrico).join())
        .toMatch(/Topo Direito/);
      expect(validarExtra({ ...VALIDOS.triangulo_simetrico, fundo_dir: pt(10, 80) }, P.triangulo_simetrico).join())
        .toMatch(/Fundo Direito/);
    });

    it('retângulo: bordas horizontais e suporte abaixo da resistência', () => {
      expect(validarExtra({ ...VALIDOS.retangulo, res_dir: pt(12, 130) }, P.retangulo).join())
        .toMatch(/resistências precisam estar no mesmo nível/);
      expect(validarExtra({ ...VALIDOS.retangulo, sup_esq: pt(4, 105), sup_dir: pt(10, 105) }, P.retangulo))
        .toContain('Os suportes precisam estar abaixo das resistências.');
    });
  });

  it('desenho: as bordas e o nível calculado', () => {
    const linhas = linhasExtras(VALIDOS.topo_triplo, P.topo_triplo);
    expect(linhas).toHaveLength(5);            // 4 segmentos do ziguezague + a resistência
    const nivel = linhas.find((l) => l.id === 'nivel');
    expect(nivel.tracejada).toBe(true);
    expect(nivel.dados[0].preco).toBeCloseTo(100);   // média dos três topos
    expect(nivel.dados.map((d) => d.i)).toEqual([2, 10]);  // de ponta a ponta
  });

  it('desenho parcial: a linha aparece assim que os dois pontos dela existem', () => {
    const linhas = linhasExtras({ vale1: pt(2, 100), pico: pt(6, 115) }, P.fundo_duplo);
    // com 2 pontos, só o segmento — a linha de referência ainda não diz nada
    expect(linhas.map((l) => l.id)).toEqual(['vale1-pico']);

    const comTres = linhasExtras({ vale1: pt(2, 100), pico: pt(6, 115), vale2: pt(10, 102) }, P.fundo_duplo);
    expect(comTres.map((l) => l.id)).toEqual(['vale1-pico', 'pico-vale2', 'nivel']);
  });

  it('área preenchida só nos triângulos e no retângulo', () => {
    const area = areasExtras(VALIDOS.triangulo_ascendente, P.triangulo_ascendente)[0];
    // fecha pelos cantos, na ordem: resistência da esquerda pra direita e
    // suporte voltando
    expect(area.pontos.map((p) => p.i)).toEqual([2, 12, 10, 4]);
    expect(area.opacidade).toBe(0.15);
    expect(areasExtras(VALIDOS.retangulo, P.retangulo)[0].borda).toBe(true);
    expect(areasExtras(VALIDOS.fundo_duplo, P.fundo_duplo)).toEqual([]);
    // sem os 4 cantos, não desenha área nenhuma
    expect(areasExtras({ res_esq: pt(1, 100) }, P.retangulo)).toEqual([]);
  });

  it('o emoji fica no ponto mais característico do padrão', () => {
    expect(ancoraExtra(P.oco_invertido)).toBe('cabeca');
    expect(ancoraExtra(P.topo_triplo)).toBe('topo2');
    expect(ancoraExtra(P.retangulo)).toBe('res_esq');
  });

  it('marcar uma borda da direita pra esquerda avisa, mas não bloqueia', () => {
    const trocado = { ...VALIDOS.retangulo, res_dir: pt(1, 101) };
    expect(avisosExtras(trocado, P.retangulo).join()).toMatch(/"Resistência Direita" está antes de "Resistência Esquerda"/);
    expect(validarExtra(trocado, P.retangulo)).toEqual([]);
  });

  it('bordas que se alternam no tempo são o normal — não viram aviso', () => {
    // num triângulo o suporte esquerdo quase sempre vem depois da
    // resistência esquerda e antes da direita
    expect(avisosExtras(VALIDOS.triangulo_ascendente, P.triangulo_ascendente)).toEqual([]);
    expect(avisosExtras(VALIDOS.retangulo, P.retangulo)).toEqual([]);
    expect(avisosExtras(VALIDOS.topo_triplo, P.topo_triplo)).toEqual([]);
  });

  it('o seletor só oferece padrões dos mesmos pontos', () => {
    // triângulo asc/desc e retângulo marcam as mesmas 4 bordas: dá pra
    // trocar no meio da marcação sem perder nada
    expect(padroesCompativeis(P.triangulo_ascendente).map((p) => p.id))
      .toEqual(['triangulo_ascendente', 'triangulo_descendente', 'retangulo']);
    // o resto fica sozinho — trocar jogaria a marcação fora
    expect(padroesCompativeis(P.topo_triplo).map((p) => p.id)).toEqual(['topo_triplo']);
  });
});
