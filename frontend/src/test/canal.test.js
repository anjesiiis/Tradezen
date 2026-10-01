import {
  PADROES_CANAL, avisosDoCanal, linhasDoCanal, medidasDoCanal,
  precoNaPolilinha, stepsDoCanal, temFormatoCanal, validarCanal,
} from '../admin/canal.js';
import { PADROES, paresDeLinha, stepsDoPadrao, validarPadrao } from '../admin/bandeira.js';

const ALTA = PADROES_CANAL.canal_alta;
const BAIXA = PADROES_CANAL.canal_baixa;

// Canal de alta bem comportado: fundos e topos subindo 0,3 por candle,
// com as duas linhas paralelas.
const CANAL_ALTA = {
  p1_fundo1: { i: 10, preco: 30 }, p2_topo1: { i: 14, preco: 34 },
  p3_fundo2: { i: 20, preco: 33 }, p4_topo2: { i: 24, preco: 37 },
};
const canalComTerceiroToque = () => ({
  ...CANAL_ALTA,
  p5_fundo3: { i: 30, preco: 36 }, p6_topo3: { i: 34, preco: 40 },
});

const linha = (pontos, id) => linhasDoCanal(pontos, Array.from({ length: 60 })).find((l) => l.id === id);

describe('Canal de alta e de baixa', () => {
  describe('pontos', () => {
    it('são 6: fundo e topo alternados, os dois últimos opcionais', () => {
      const steps = stepsDoCanal();

      expect(steps.map((s) => s.key)).toEqual([
        'p1_fundo1', 'p2_topo1', 'p3_fundo2', 'p4_topo2', 'p5_fundo3', 'p6_topo3',
      ]);
      expect(steps.filter((s) => s.opcional).map((s) => s.key)).toEqual(['p5_fundo3', 'p6_topo3']);
    });

    it('quatro pontos já formam um canal', () => {
      expect(temFormatoCanal(CANAL_ALTA)).toBe(true);
      expect(temFormatoCanal({ p1_fundo1: CANAL_ALTA.p1_fundo1 })).toBe(false);
    });
  });

  describe('desenho', () => {
    it('traça suporte, resistência e mediana', () => {
      expect(linhasDoCanal(CANAL_ALTA, Array.from({ length: 60 })).map((l) => l.id))
        .toEqual(['suporte', 'resistencia', 'mediana']);
    });

    it('a mediana fica exatamente no meio das duas linhas e é tracejada', () => {
      const mediana = linha(CANAL_ALTA, 'mediana');
      const suporte = linha(CANAL_ALTA, 'suporte');
      const resistencia = linha(CANAL_ALTA, 'resistencia');

      expect(mediana.tracejada).toBe(true);
      for (const ponto of mediana.dados) {
        const meio = (precoNaPolilinha(suporte.dados, ponto.i) + precoNaPolilinha(resistencia.dados, ponto.i)) / 2;
        expect(ponto.preco).toBeCloseTo(meio, 6);
      }
    });

    it('as linhas passam pelos toques e são estendidas dos dois lados', () => {
      const suporte = linha(CANAL_ALTA, 'suporte');

      // começa antes do primeiro toque (i=10) e termina depois do último (i=24)
      expect(suporte.dados[0].i).toBeLessThan(10);
      expect(suporte.dados[suporte.dados.length - 1].i).toBeGreaterThan(24);
      // e no candle do toque vale o preço marcado
      expect(precoNaPolilinha(suporte.dados, 20)).toBeCloseTo(33);
    });

    it('a linha de suporte passa pelos três toques quando o P5 existe', () => {
      const suporte = linha(canalComTerceiroToque(), 'suporte');

      expect(precoNaPolilinha(suporte.dados, 10)).toBeCloseTo(30);
      expect(precoNaPolilinha(suporte.dados, 20)).toBeCloseTo(33);
      expect(precoNaPolilinha(suporte.dados, 30)).toBeCloseTo(36);
    });

    it('não desenha nada com um lado só marcado', () => {
      expect(linhasDoCanal({ p1_fundo1: { i: 10, preco: 30 } }, [])).toEqual([]);
    });

    it('não estoura o limite dos candles ao estender', () => {
      const suporte = linha(CANAL_ALTA, 'suporte');
      const curto = linhasDoCanal(CANAL_ALTA, Array.from({ length: 26 })).find((l) => l.id === 'suporte');

      expect(suporte.dados[suporte.dados.length - 1].i).toBe(27);
      expect(curto.dados[curto.dados.length - 1].i).toBe(25);
    });
  });

  describe('validações que bloqueiam', () => {
    it('canal de alta correto passa', () => {
      expect(validarCanal(CANAL_ALTA, ALTA)).toEqual([]);
      expect(validarCanal(canalComTerceiroToque(), ALTA)).toEqual([]);
    });

    it('exige os quatro primeiros pontos', () => {
      expect(validarCanal({ p1_fundo1: { i: 1, preco: 1 } }, ALTA))
        .toEqual(['Marque pelo menos os 4 primeiros pontos: dois fundos e dois topos.']);
    });

    it('no canal de alta o segundo fundo precisa ser mais alto', () => {
      const erros = validarCanal({ ...CANAL_ALTA, p3_fundo2: { i: 20, preco: 29 } }, ALTA);

      expect(erros.join(' ')).toContain('"Fundo 2" precisa estar acima de "Fundo 1"');
    });

    it('no canal de baixa é o contrário', () => {
      expect(validarCanal(CANAL_ALTA, BAIXA).join(' ')).toContain('os fundos descem');

      const canalBaixa = {
        p1_fundo1: { i: 10, preco: 33 }, p2_topo1: { i: 14, preco: 37 },
        p3_fundo2: { i: 20, preco: 30 }, p4_topo2: { i: 24, preco: 34 },
      };
      expect(validarCanal(canalBaixa, BAIXA)).toEqual([]);
    });

    it('cobra a ordem no tempo dentro de cada linha', () => {
      const erros = validarCanal({ ...CANAL_ALTA, p3_fundo2: { i: 5, preco: 33 } }, ALTA);

      expect(erros.join(' ')).toContain('precisa vir depois de "Fundo 1" no tempo');
    });

    it('recusa resistência abaixo do suporte', () => {
      const invertido = {
        p1_fundo1: { i: 10, preco: 40 }, p2_topo1: { i: 14, preco: 34 },
        p3_fundo2: { i: 20, preco: 41 }, p4_topo2: { i: 24, preco: 36 },
      };

      expect(validarCanal(invertido, ALTA).join(' '))
        .toContain('resistência (topos) precisa ficar acima da linha de suporte');
    });
  });

  describe('avisos que não bloqueiam', () => {
    it('paralelo e com três toques não gera aviso', () => {
      expect(avisosDoCanal(canalComTerceiroToque())).toEqual([]);
    });

    it('avisa quando as linhas convergem (é cunha, não canal)', () => {
      const convergindo = { ...CANAL_ALTA, p4_topo2: { i: 24, preco: 34.5 } };

      expect(avisosDoCanal(convergindo).join(' ')).toContain('convergindo');
    });

    it('lembra do terceiro toque quando só há dois de cada lado', () => {
      expect(avisosDoCanal(CANAL_ALTA).join(' ')).toContain('terceiro toque');
    });
  });

  describe('medidas para o ML', () => {
    it('largura do canal e inclinação das duas linhas', () => {
      const medidas = medidasDoCanal(canalComTerceiroToque());

      expect(medidas.inclinacao_suporte).toBeCloseTo(0.3);
      expect(medidas.inclinacao_resistencia).toBeCloseTo(0.3);
      expect(medidas.largura_canal).toBeGreaterThan(0);
    });
  });

  describe('integração com o resto do admin', () => {
    it('os dois canais entram no seletor de padrões', () => {
      expect(PADROES.canal_alta.rotulo).toBe('Canal de Alta');
      expect(PADROES.canal_baixa.rotulo).toBe('Canal de Baixa');
    });

    it('as telas pedem os passos e a validação do canal', () => {
      expect(stepsDoPadrao(PADROES.canal_alta)).toHaveLength(6);
      expect(validarPadrao(CANAL_ALTA, PADROES.canal_alta)).toEqual([]);
      // linhas do canal são conta, não par de pontos arrastável
      expect(paresDeLinha(PADROES.canal_alta)).toEqual([]);
    });

    it('não mexeu nos padrões de continuação', () => {
      expect(stepsDoPadrao(PADROES.bandeira_alta)).toHaveLength(8);
      expect(paresDeLinha(PADROES.bandeira_alta)).toHaveLength(4);
    });
  });
});
