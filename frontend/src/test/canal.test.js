import {
  PADROES_CANAL, areasDoCanal, avisosDoCanal, linhasDoCanal, medidasDoCanal,
  precoNaReta, rotulosDoCanal, stepsDoCanal, temFormatoCanal, validarCanal,
} from '../admin/canal.js';
import { PADROES, areasDoPadrao, stepsDoPadrao, validarPadrao } from '../admin/bandeira.js';

const ALTA = PADROES_CANAL.canal_alta;
const BAIXA = PADROES_CANAL.canal_baixa;
const pt = (i, preco) => ({ i, preco });

// Canal de alta bem marcado: duas retas paralelas subindo.
//   suporte     p1(2, 100) → p2(20, 120)
//   resistência p3(6, 112) → p4(24, 132)
const CANAL_ALTA = { p1: pt(2, 100), p2: pt(20, 120), p3: pt(6, 112), p4: pt(24, 132) };
// o mesmo desenho espelhado, descendo
const CANAL_BAIXA = { p1: pt(2, 132), p2: pt(20, 112), p3: pt(6, 120), p4: pt(24, 100) };

describe('Canal de alta e de baixa', () => {
  describe('pontos', () => {
    it('são 4, marcados primeiro uma linha e depois a outra', () => {
      expect(stepsDoCanal(ALTA).map((s) => s.key)).toEqual(['p1', 'p2', 'p3', 'p4']);
      expect(stepsDoCanal(ALTA).map((s) => s.label)).toEqual(['Fundo Esq.', 'Fundo Dir.', 'Topo Esq.', 'Topo Dir.']);
      // no canal de baixa o papel das linhas troca: marca-se o topo antes
      expect(stepsDoCanal(BAIXA).map((s) => s.label)).toEqual(['Topo Esq.', 'Topo Dir.', 'Fundo Esq.', 'Fundo Dir.']);
      expect(rotulosDoCanal(BAIXA)[0]).toBe('Topo Esq.');
    });

    it('a cor segue o papel da linha: suporte verde, resistência vermelha', () => {
      expect(stepsDoCanal(ALTA).map((s) => s.color)).toEqual(['#26a69a', '#26a69a', '#ef5350', '#ef5350']);
      // de baixa: a primeira linha marcada é a resistência
      expect(stepsDoCanal(BAIXA).map((s) => s.color)).toEqual(['#ef5350', '#ef5350', '#26a69a', '#26a69a']);
    });

    it('só é canal com os quatro pontos', () => {
      expect(temFormatoCanal(CANAL_ALTA)).toBe(true);
      expect(temFormatoCanal({ p1: pt(1, 10), p2: pt(5, 12), p3: pt(2, 14) })).toBe(false);
      expect(temFormatoCanal(null)).toBe(false);
    });

    it('a tela de marcação usa esses mesmos pontos', () => {
      expect(stepsDoPadrao(PADROES.canal_alta).map((s) => s.label))
        .toEqual(['Fundo Esq.', 'Fundo Dir.', 'Topo Esq.', 'Topo Dir.']);
    });
  });

  describe('desenho', () => {
    it('traça as duas linhas e a mediana', () => {
      expect(linhasDoCanal(CANAL_ALTA).map((l) => l.id)).toEqual(['p1', 'p3', 'mediana']);
    });

    it('as duas linhas são esticadas até as pontas do canal', () => {
      const [suporte, resistencia] = linhasDoCanal(CANAL_ALTA);
      // o canal vai do candle 2 (p1) ao 24 (p4): as duas linhas cobrem tudo
      expect(suporte.dados.map((d) => d.i)).toEqual([2, 24]);
      expect(resistencia.dados.map((d) => d.i)).toEqual([2, 24]);
      // e passam pelos pontos marcados
      expect(precoNaReta(CANAL_ALTA.p1, CANAL_ALTA.p2, 20)).toBeCloseTo(120);
      expect(suporte.dados[0].preco).toBeCloseTo(100);
    });

    it('a mediana fica no meio exato das duas e é tracejada', () => {
      const mediana = linhasDoCanal(CANAL_ALTA).find((l) => l.id === 'mediana');
      expect(mediana.tracejada).toBe(true);
      // em x=2: suporte 100, resistência 107,6 → meio 103,8
      expect(mediana.dados[0].preco).toBeCloseTo((100 + 107.5555) / 2, 2);
      expect(mediana.dados[1].preco).toBeCloseTo((124.444 + 132) / 2, 2);
    });

    it('com uma linha só marcada, ela já aparece — sem mediana', () => {
      const parcial = linhasDoCanal({ p1: pt(2, 100), p2: pt(20, 120) });
      expect(parcial.map((l) => l.id)).toEqual(['p1']);
      expect(parcial[0].dados.map((d) => d.i)).toEqual([2, 20]);
    });

    it('a área entre as linhas é verde na alta e vermelha na baixa', () => {
      const [area] = areasDoCanal(CANAL_ALTA, ALTA);
      expect(area.cor).toBe('#26a69a');
      expect(area.opacidade).toBe(0.10);
      // fecha pela linha de cima e volta pela de baixo
      expect(area.pontos.map((c) => c.i)).toEqual([2, 24, 24, 2]);
      expect(areasDoCanal(CANAL_BAIXA, BAIXA)[0].cor).toBe('#ef5350');
      // sem os 4 pontos não há área
      expect(areasDoCanal({ p1: pt(1, 10) }, ALTA)).toEqual([]);
      // e a tela pega a área pelo caminho de sempre
      expect(areasDoPadrao(CANAL_ALTA, PADROES.canal_alta)).toHaveLength(1);
    });
  });

  describe('validações que bloqueiam', () => {
    it('canal de alta e de baixa bem marcados passam', () => {
      expect(validarCanal(CANAL_ALTA, ALTA)).toEqual([]);
      expect(validarCanal(CANAL_BAIXA, BAIXA)).toEqual([]);
      expect(validarPadrao(CANAL_ALTA, PADROES.canal_alta)).toEqual([]);
    });

    it('exige os quatro pontos', () => {
      expect(validarCanal({ p1: pt(1, 10), p2: pt(5, 12) }, ALTA))
        .toEqual(['Marque os 4 pontos do canal antes de salvar.']);
    });

    // O que vale é a geometria das duas retas, não a posição de um clique
    // em relação a outro: foi comparando ponto com ponto que a validação
    // barrava canal bem marcado.
    it('canal que começa por um topo passa — o fundo esquerdo vem depois', () => {
      const comecaNoTopo = { p1: pt(10, 45), p2: pt(60, 58), p3: pt(5, 50), p4: pt(64, 63) };
      expect(validarCanal(comecaNoTopo, ALTA)).toEqual([]);
    });

    it('a ponta de uma reta pode cair antes da ponta da outra', () => {
      const cruzado = { p1: pt(5, 40), p2: pt(60, 50), p3: pt(10, 45), p4: pt(55, 54) };
      expect(validarCanal(cruzado, ALTA)).toEqual([]);
    });

    it('canal de alta: as duas retas precisam subir', () => {
      expect(validarCanal({ ...CANAL_ALTA, p2: pt(20, 90) }, ALTA).join())
        .toMatch(/A linha de "Fundo Esq." a "Fundo Dir." precisa estar subindo/);
      expect(validarCanal({ ...CANAL_ALTA, p4: pt(24, 100) }, ALTA).join())
        .toMatch(/A linha de "Topo Esq." a "Topo Dir." precisa estar subindo/);
    });

    it('trocar topo com fundo é barrado: as retas se cruzam', () => {
      const trocado = { p1: pt(5, 50), p2: pt(60, 63), p3: pt(10, 45), p4: pt(64, 58) };
      expect(validarCanal(trocado, ALTA).join()).toMatch(/as duas se cruzam/);
    });

    it('retas que se encostam no meio do canal também são barradas', () => {
      // sobem as duas, mas a de cima abre pouco e cruza a de baixo no fim
      const cruzando = { p1: pt(5, 40), p2: pt(60, 70), p3: pt(10, 45), p4: pt(64, 60) };
      expect(validarCanal(cruzando, ALTA).join()).toMatch(/precisa ficar acima/);
    });

    it('as duas pontas de uma reta não podem cair no mesmo candle', () => {
      expect(validarCanal({ ...CANAL_ALTA, p2: pt(2, 120) }, ALTA).join()).toMatch(/mesmo candle/);
    });

    it('canal de baixa: a mesma lógica, invertida', () => {
      expect(validarCanal({ ...CANAL_BAIXA, p2: pt(20, 140) }, BAIXA).join()).toMatch(/precisa estar descendo/);
      // um canal de alta marcado na tela de baixa não passa
      expect(validarCanal(CANAL_ALTA, BAIXA).length).toBeGreaterThan(0);
    });
  });

  describe('avisos que não bloqueiam', () => {
    it('canal paralelo não gera aviso', () => {
      expect(avisosDoCanal(CANAL_ALTA, ALTA)).toEqual([]);
    });

    it('linhas que convergem avisam que aquilo é cunha ou triângulo', () => {
      // abertura cai de 12 pra 6: as bordas se fecham, mas sem se cruzar
      // (se cruzassem, aí seria erro e não aviso)
      const fechando = { ...CANAL_ALTA, p4: pt(24, 126) };
      expect(avisosDoCanal(fechando, ALTA).join()).toMatch(/não estão paralelas/);
      // mas salvar continua possível
      expect(validarCanal(fechando, ALTA)).toEqual([]);
    });

    it('linhas em sentidos opostos avisam', () => {
      const oposto = { p1: pt(2, 100), p2: pt(20, 120), p3: pt(6, 140), p4: pt(24, 130) };
      expect(avisosDoCanal(oposto, ALTA).join()).toMatch(/lados opostos/);
    });
  });

  it('medidas do ML: abertura nas duas pontas e inclinação de cada linha', () => {
    expect(medidasDoCanal(CANAL_ALTA)).toEqual({
      abertura_inicio: 12,
      abertura_fim: 12,
      inclinacao_suporte: 20 / 18,
      inclinacao_resistencia: 20 / 18,
    });
    expect(medidasDoCanal({ p1: pt(1, 10) })).toBeNull();
  });
});
