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
  // Cada triângulo tem 3 pontos: a borda inclinada (P1→P2) e a
  // horizontal (P3, só o preço). O vértice é calculado. No simétrico,
  // P1/P2 são as duas bordas e P3 é o próprio vértice.
  triangulo_ascendente: { p1: pt(10, 80), p2: pt(40, 95), p3: pt(15, 100) },
  triangulo_descendente: { p1: pt(10, 100), p2: pt(40, 88), p3: pt(15, 80) },
  triangulo_simetrico: { p1: pt(10, 100), p2: pt(10, 80), p3: pt(45, 90) },
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

    it('retângulo com o suporte acima da resistência', () => {
      const trocado = { res_esq: pt(2, 90), res_dir: pt(12, 91), sup_esq: pt(4, 100), sup_dir: pt(10, 101) };
      expect(validarExtra(trocado, P.retangulo))
        .toEqual(['O suporte está acima da resistência — as duas bordas estão trocadas.']);
    });

    it('triângulo com a borda inclinada no sentido errado', () => {
      expect(validarExtra({ ...VALIDOS.triangulo_ascendente, p2: pt(40, 70) }, P.triangulo_ascendente).join())
        .toMatch(/"Fundo Dir\." precisa estar acima de "Fundo Esq\."/);
      expect(validarExtra({ ...VALIDOS.triangulo_descendente, p2: pt(40, 110) }, P.triangulo_descendente).join())
        .toMatch(/"Topo Dir\." precisa estar abaixo de "Topo Esq\."/);
      // o simétrico é o caso livre: não tem regra rígida de preço
      expect(validarExtra({ p1: pt(10, 80), p2: pt(10, 100), p3: pt(45, 90) }, P.triangulo_simetrico)).toEqual([]);
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

    it('bordas do retângulo que não estão horizontais', () => {
      salvaComAviso('retangulo', { ...VALIDOS.retangulo, res_dir: pt(12, 130) }, /resistências estão a mais de 3%/);
    });

    it('horizontal do lado errado dos pontos vira aviso', () => {
      salvaComAviso('triangulo_ascendente', { ...VALIDOS.triangulo_ascendente, p3: pt(15, 70) }, /resistência está abaixo dos fundos/);
      salvaComAviso('triangulo_descendente', { ...VALIDOS.triangulo_descendente, p3: pt(15, 120) }, /suporte está acima dos topos/);
      salvaComAviso('triangulo_simetrico', { p1: pt(10, 80), p2: pt(10, 100), p3: pt(45, 90) }, /"Topo Esq\." está abaixo de "Fundo Esq\."/);
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
    // fecha no vértice CALCULADO: o suporte 80→95 (de 10 a 40) encosta
    // nos 100 da resistência no candle 50. O quadrilátero degenera num
    // triângulo porque os dois últimos cantos coincidem no vértice.
    expect(area.pontos.map((p) => [p.i, p.preco])).toEqual([[10, 80], [50, 100], [50, 100], [10, 100]]);
    expect(area.opacidade).toBe(0.15);
    expect(areasExtras(VALIDOS.retangulo, P.retangulo)[0].borda).toBe(true);
    expect(areasExtras(VALIDOS.fundo_duplo, P.fundo_duplo)).toEqual([]);
    // sem todos os vértices, não desenha área nenhuma
    expect(areasExtras({ p1: pt(1, 100) }, P.triangulo_simetrico)).toEqual([]);
    expect(areasExtras({ res_esq: pt(1, 100) }, P.retangulo)).toEqual([]);
  });

  it('cada triângulo tem 3 pontos, com o nome do seu papel', () => {
    for (const id of ['triangulo_ascendente', 'triangulo_descendente', 'triangulo_simetrico']) {
      expect(passosExtras(P[id]), id).toEqual(['p1', 'p2', 'p3']);
    }
    expect(stepsExtras(P.triangulo_ascendente).map((s) => s.label))
      .toEqual(['P1 · Fundo Esq.', 'P2 · Fundo Dir.', 'P3 · Resistência']);
    expect(stepsExtras(P.triangulo_descendente).map((s) => s.label))
      .toEqual(['P1 · Topo Esq.', 'P2 · Topo Dir.', 'P3 · Suporte']);
    expect(stepsExtras(P.triangulo_simetrico).map((s) => s.label))
      .toEqual(['P1 · Topo Esq.', 'P2 · Fundo Esq.', 'P3 · Vértice']);
    // o retângulo continua com as 4 bordas nomeadas
    expect(passosExtras(P.retangulo)).toEqual(['res_esq', 'res_dir', 'sup_esq', 'sup_dir']);
  });

  it('a horizontal vai até o vértice calculado, não até onde se clicou', () => {
    const linhas = linhasExtras(VALIDOS.triangulo_ascendente, P.triangulo_ascendente);
    expect(linhas.map((l) => l.id)).toEqual(['inclinada', 'horizontal']);
    // as duas terminam no mesmo ponto: o vértice
    const [inclinada, horizontal] = linhas;
    expect(inclinada.dados[1]).toEqual(horizontal.dados[1]);
    expect(horizontal.dados[1].i).toBe(50);
    // e a horizontal é horizontal mesmo
    expect(horizontal.dados[0].preco).toBe(horizontal.dados[1].preco);
  });

  it('vértice além do último candle é cortado no fim do gráfico', () => {
    // sem isso o desenho sumia: não existe pixel pra um candle que não
    // existe, e a linha e a área eram descartadas inteiras
    const candles = Array.from({ length: 30 }, (_, i) => ({ timestamp: i }));
    const linhas = linhasExtras(VALIDOS.triangulo_ascendente, P.triangulo_ascendente, candles);
    expect(linhas.every((l) => l.dados.every((d) => d.i <= 29))).toBe(true);
    expect(areasExtras(VALIDOS.triangulo_ascendente, P.triangulo_ascendente, candles)[0]
      .pontos.every((c) => c.i <= 29)).toBe(true);
  });

  it('no simétrico as duas bordas vão pro vértice marcado', () => {
    expect(linhasExtras(VALIDOS.triangulo_simetrico, P.triangulo_simetrico).map((l) => l.id))
      .toEqual(['superior', 'inferior']);
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
    // os três triângulos marcam os mesmos 3 vértices: dá pra trocar entre
    // eles no meio da marcação, que é o que "salvo como ele é" pede
    expect(padroesCompativeis(P.triangulo_ascendente).map((p) => p.id))
      .toEqual(['triangulo_ascendente', 'triangulo_descendente', 'triangulo_simetrico']);
    expect(padroesCompativeis(P.retangulo).map((p) => p.id)).toEqual(['retangulo']);
    // o resto fica sozinho — trocar jogaria a marcação fora
    expect(padroesCompativeis(P.topo_triplo).map((p) => p.id)).toEqual(['topo_triplo']);
  });
});
