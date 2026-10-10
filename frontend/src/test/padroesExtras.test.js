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
  // Triângulo: 3 pontos ligados, sem papel de topo ou fundo.
  // Retângulo: P1/P2 a linha de baixo, P3/P4 a de cima.
  triangulo_ascendente: { p1: pt(10, 80), p2: pt(40, 82), p3: pt(25, 110) },
  triangulo_descendente: { p1: pt(10, 80), p2: pt(40, 82), p3: pt(25, 110) },
  triangulo_simetrico: { p1: pt(10, 80), p2: pt(40, 82), p3: pt(25, 110) },
  retangulo: { p1: pt(4, 90), p2: pt(10, 90.5), p3: pt(2, 100), p4: pt(12, 101) },
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
    expect(stepsExtras(P.retangulo).map((s) => s.label)).toEqual(['P1', 'P2', 'P3', 'P4']);
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

  // O que bloqueia é só topo e fundo trocados de lugar. Tudo o mais —
  // nível fora de ±5%, ordem no tempo, borda pouco horizontal — é
  // conferência do analista: vira aviso amarelo e o template salva do
  // jeito que foi marcado.
  describe('o que bloqueia: topo e fundo trocados', () => {
    it('fundo duplo com o pico abaixo dos vales', () => {
      expect(validarExtra({ ...VALIDOS.fundo_duplo, pico: pt(6, 95) }, P.fundo_duplo))
        .toEqual(['O "Pico" está abaixo dos vales — topo e fundo trocados de lugar.']);
    });

    it('OCO invertido com a cabeça acima dos ombros, ou o pescoço por baixo', () => {
      expect(validarExtra({ ...VALIDOS.oco_invertido, cabeca: pt(6, 105) }, P.oco_invertido).join())
        .toMatch(/"Cabeça" está acima dos ombros/);
      expect(validarExtra({ ...VALIDOS.oco_invertido, pescoco: pt(12, 95) }, P.oco_invertido).join())
        .toMatch(/"Linha de Pescoço" está abaixo dos fundos/);
    });

    it('triplos com o miolo do lado errado', () => {
      expect(validarExtra({ ...VALIDOS.topo_triplo, vale1: pt(4, 130) }, P.topo_triplo))
        .toEqual(['Tem vale acima de topo — os pontos estão trocados.']);
      expect(validarExtra({ ...VALIDOS.fundo_triplo, pico1: pt(4, 80) }, P.fundo_triplo))
        .toEqual(['Tem pico abaixo de fundo — os pontos estão trocados.']);
    });

    it('triângulos e retângulo não têm regra de preço nenhuma', () => {
      // qualquer configuração vale: o sistema só liga os pontos
      const deCabecaPraBaixo = { p1: pt(10, 110), p2: pt(40, 108), p3: pt(25, 80) };
      const retanguloInvertido = { p1: pt(4, 100), p2: pt(10, 101), p3: pt(2, 90), p4: pt(12, 90.5) };
      for (const id of ['triangulo_ascendente', 'triangulo_descendente', 'triangulo_simetrico']) {
        expect(validarExtra(deCabecaPraBaixo, P[id]), id).toEqual([]);
        expect(avisosExtras(deCabecaPraBaixo, P[id]), id).toEqual([]);
      }
      expect(validarExtra(retanguloInvertido, P.retangulo)).toEqual([]);
      expect(avisosExtras(retanguloInvertido, P.retangulo)).toEqual([]);
    });
  });

  describe('o que NÃO bloqueia mais — vira aviso e salva assim mesmo', () => {
    const salvaComAviso = (id, pontos, trecho) => {
      expect(validarExtra(pontos, P[id]), `${id} não devia bloquear`).toEqual([]);
      expect(avisosExtras(pontos, P[id]).join()).toMatch(trecho);
    };

    it('níveis fora da tolerância', () => {
      salvaComAviso('fundo_duplo', { ...VALIDOS.fundo_duplo, vale2: pt(10, 112) }, /vales estão a mais de 5%/);
      salvaComAviso('oco_invertido', { ...VALIDOS.oco_invertido, ombro_dir: pt(10, 108) }, /ombros estão a mais de 5%/);
      salvaComAviso('topo_triplo', { ...VALIDOS.topo_triplo, topo3: pt(10, 140) }, /topos estão a mais de 5%/);
    });

    it('ordem no tempo', () => {
      salvaComAviso('fundo_duplo', { ...VALIDOS.fundo_duplo, vale2: pt(4, 102) }, /Confira a ordem/);
      salvaComAviso('topo_triplo', { ...VALIDOS.topo_triplo, vale1: pt(9, 90) }, /"Vale 1" não está entre/);
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
    const area = areasExtras(VALIDOS.triangulo_simetrico, P.triangulo_simetrico)[0];
    // o triângulo fecha nos três pontos marcados, na ordem P1 → P3 → P2
    expect(area.pontos.map((p) => [p.i, p.preco])).toEqual([[10, 80], [25, 110], [40, 82]]);
    expect(area.opacidade).toBe(0.15);
    expect(areasExtras(VALIDOS.retangulo, P.retangulo)[0].borda).toBe(true);
    expect(areasExtras(VALIDOS.fundo_duplo, P.fundo_duplo)).toEqual([]);
    // sem todos os pontos, não desenha área nenhuma
    expect(areasExtras({ p1: pt(1, 100) }, P.triangulo_simetrico)).toEqual([]);
    expect(areasExtras({ p1: pt(1, 100) }, P.retangulo)).toEqual([]);
  });

  it('triângulo e retângulo são só pontos: P1, P2, P3 (e P4)', () => {
    for (const id of ['triangulo_ascendente', 'triangulo_descendente', 'triangulo_simetrico']) {
      expect(passosExtras(P[id]), id).toEqual(['p1', 'p2', 'p3']);
      expect(stepsExtras(P[id]).map((s) => s.label), id).toEqual(['P1', 'P2', 'P3']);
      // a dica fala de posição, não de topo/fundo
      expect(stepsExtras(P[id])[2].dica, id).toBe('P3 — o vértice');
    }
    expect(passosExtras(P.retangulo)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(stepsExtras(P.retangulo).map((s) => s.label)).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(stepsExtras(P.retangulo)[0].dica).toBe('P1 — primeiro ponto da linha inferior');
  });

  it('o triângulo liga os três pontos, com a base fechando', () => {
    expect(linhasExtras(VALIDOS.triangulo_simetrico, P.triangulo_simetrico).map((l) => l.id))
      .toEqual(['p1-p3', 'p2-p3', 'base']);
    // e as duas linhas do retângulo são as duas bordas
    expect(linhasExtras(VALIDOS.retangulo, P.retangulo).map((l) => l.id)).toEqual(['p1-p2', 'p3-p4']);
  });

  it('o emoji fica no ponto mais característico do padrão', () => {
    expect(ancoraExtra(P.oco_invertido)).toBe('cabeca');
    expect(ancoraExtra(P.topo_triplo)).toBe('topo2');
    expect(ancoraExtra(P.retangulo)).toBe('p1');
  });

  it('marcar uma borda da direita pra esquerda avisa, mas não bloqueia', () => {
    const trocado = { ...VALIDOS.retangulo, p2: pt(1, 90.5) };
    expect(avisosExtras(trocado, P.retangulo).join()).toMatch(/Confira a ordem: "P2" está antes de "P1"/);
    expect(validarExtra(trocado, P.retangulo)).toEqual([]);
  });

  it('marcação na ordem não vira aviso', () => {
    expect(avisosExtras(VALIDOS.retangulo, P.retangulo)).toEqual([]);
    expect(avisosExtras(VALIDOS.topo_triplo, P.topo_triplo)).toEqual([]);
  });

  it('o seletor só oferece padrões dos mesmos pontos', () => {
    // triângulo asc/desc e retângulo marcam as mesmas 4 bordas: dá pra
    // trocar no meio da marcação sem perder nada
    // os três triângulos marcam os mesmos 3 pontos: dá pra trocar entre
    // eles no meio da marcação, que é o que "salvo como ele é" pede
    expect(padroesCompativeis(P.triangulo_ascendente).map((p) => p.id))
      .toEqual(['triangulo_ascendente', 'triangulo_descendente', 'triangulo_simetrico']);
    // canal e retângulo também marcam os mesmos 4 pontos, então trocam
    // entre si sem perder a marcação
    expect(padroesCompativeis(P.retangulo).map((p) => p.id))
      .toEqual(['canal_alta', 'canal_baixa', 'retangulo']);
    // o resto fica sozinho — trocar jogaria a marcação fora
    expect(padroesCompativeis(P.topo_triplo).map((p) => p.id)).toEqual(['topo_triplo']);
  });
});
