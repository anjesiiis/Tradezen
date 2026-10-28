import { _noCorpoDoDesenho, _rotuloComFundo } from '../lib/grafico/desenhos.js';
import { ESTILO_PADRAO, LADOS_ROTULO, ladoDosRotulos, normalizarEstilo } from '../lib/grafico/estiloDesenho.js';

const px = (x, y, idx = 0) => ({ x, y, idx });

describe('Fibonacci — de que lado ficam as etiquetas', () => {
  it('escolhido na mão, manda', () => {
    expect(ladoDosRotulos('esquerda', 10, 300, 800)).toBe('esquerda');
    expect(ladoDosRotulos('direita', 10, 300, 800)).toBe('direita');
  });

  // Em `auto` o lado é o que tem espaço — e o lado sem espaço é sempre o
  // direito, onde mora o eixo de preço.
  it('no automático, desenho à esquerda joga as etiquetas pra direita', () => {
    expect(ladoDosRotulos('auto', 40, 200, 800)).toBe('direita');
  });

  it('no automático, desenho à direita joga as etiquetas pra esquerda', () => {
    expect(ladoDosRotulos('auto', 500, 700, 800)).toBe('esquerda');
  });

  it('sem largura conhecida, não chuta: fica à esquerda', () => {
    expect(ladoDosRotulos('auto', 40, 200, 0)).toBe('esquerda');
  });

  it('o padrão é automático e cabe nas três opções do painel', () => {
    expect(ESTILO_PADRAO.fibo.ladoRotulos).toBe('auto');
    expect(LADOS_ROTULO.map((l) => l.id)).toEqual(['esquerda', 'auto', 'direita']);
  });

  it('Fibonacci salvo antes desta opção existir cai no automático', () => {
    expect(normalizarEstilo('fibo', { cor: '#E8EBF2' }).ladoRotulos).toBe('auto');
    // valor de outra versão, ou banco editado à mão, também volta pro padrão
    expect(normalizarEstilo('fibo', { ladoRotulos: 'em cima' }).ladoRotulos).toBe('auto');
  });

  it('o lado escolhido sobrevive à normalização', () => {
    expect(normalizarEstilo('fibo', { ladoRotulos: 'direita' }).ladoRotulos).toBe('direita');
  });
});

describe('Etiqueta com pílula de fundo', () => {
  // Canvas de mentira que anota o que foi pedido, na ordem
  const ctxFalso = () => {
    const chamadas = [];
    return {
      chamadas,
      save: () => chamadas.push(['save']),
      restore: () => chamadas.push(['restore']),
      measureText: (t) => ({ width: t.length * 6 }),
      fillRect: (...a) => chamadas.push(['fillRect', ...a]),
      fillText: (...a) => chamadas.push(['fillText', ...a]),
      set fillStyle(v) { chamadas.push(['fillStyle', v]); },
      set textAlign(v) { chamadas.push(['textAlign', v]); },
      set textBaseline(v) { chamadas.push(['textBaseline', v]); },
      set globalAlpha(v) { chamadas.push(['globalAlpha', v]); },
      get fillStyle() { return ''; },
    };
  };

  // O texto sumia em cima dos candles — que é justamente onde ele cai,
  // já que as linhas do Fibonacci atravessam o movimento medido.
  it('pinta o fundo ANTES do texto', () => {
    const ctx = ctxFalso();
    _rotuloComFundo(ctx, '61.8% · 50.64', 100, 40, 'left', '#fff');
    const iFundo = ctx.chamadas.findIndex((c) => c[0] === 'fillRect');
    const iTexto = ctx.chamadas.findIndex((c) => c[0] === 'fillText');
    expect(iFundo).toBeGreaterThanOrEqual(0);
    expect(iFundo).toBeLessThan(iTexto);
  });

  it('alinhado à direita, o fundo fica à esquerda do ponto', () => {
    const ctx = ctxFalso();
    const texto = '50%';
    _rotuloComFundo(ctx, texto, 200, 40, 'right', '#fff');
    const [, xFundo] = ctx.chamadas.find((c) => c[0] === 'fillRect');
    expect(xFundo).toBeLessThan(200 - texto.length * 6);
  });

  it('devolve a largura que ocupou, pra quem precisa saber se cabe', () => {
    const ctx = ctxFalso();
    expect(_rotuloComFundo(ctx, 'abc', 0, 0, 'left', '#fff')).toBe(3 * 6 + 8);
  });
});

describe('Corpo do desenho — mover a figura inteira', () => {
  describe('linha de tendência', () => {
    const d = { tipo: 'trend' };
    const pts = [px(100, 100, 0), px(300, 200, 1)];

    it('pega no meio da linha', () => {
      expect(_noCorpoDoDesenho(d, pts, 200, 150)).toBe(true);
    });

    it('não pega longe dela', () => {
      expect(_noCorpoDoDesenho(d, pts, 200, 250)).toBe(false);
    });

    // O segmento acaba no 2º clique: além dele não há linha pra pegar
    it('não pega no prolongamento, se a linha não é contínua', () => {
      expect(_noCorpoDoDesenho(d, pts, 400, 250)).toBe(false);
    });

    it('em modo contínuo, pega no prolongamento também', () => {
      expect(_noCorpoDoDesenho({ ...d, continua: true }, pts, 400, 250)).toBe(true);
    });
  });

  describe('fibonacci', () => {
    // 0% em y=100, 100% em y=300 → 50% cai em y=200
    const d = { tipo: 'fibo', estilo: { niveis: [0, 0.5, 1] } };
    const pts = [px(100, 100, 0), px(400, 300, 1)];

    it('pega em cima de uma linha de nível', () => {
      expect(_noCorpoDoDesenho(d, pts, 250, 200)).toBe(true);
    });

    // O vão entre os níveis é onde estão os candles que se está medindo:
    // engolir o arrasto ali tiraria o pan do gráfico
    it('não pega no vão entre dois níveis', () => {
      expect(_noCorpoDoDesenho(d, pts, 250, 150)).toBe(false);
    });

    it('não pega fora da largura marcada', () => {
      expect(_noCorpoDoDesenho(d, pts, 600, 200)).toBe(false);
    });

    it('nível desligado não vira área de pega', () => {
      const semMeio = { tipo: 'fibo', estilo: { niveis: [0, 1] } };
      expect(_noCorpoDoDesenho(semMeio, pts, 250, 200)).toBe(false);
    });
  });

  describe('retângulo', () => {
    const d = { tipo: 'retangulo_desenho' };
    const pts = [px(100, 100, 0), px(300, 250, 1)];

    it('pega no miolo', () => {
      expect(_noCorpoDoDesenho(d, pts, 200, 180)).toBe(true);
    });

    it('não pega fora', () => {
      expect(_noCorpoDoDesenho(d, pts, 400, 180)).toBe(false);
    });
  });

  describe('canal', () => {
    // base de (100,200) a (300,200), paralela 80px abaixo
    const d = { tipo: 'canal' };
    const pts = [px(100, 200, 0), px(300, 200, 1), px(200, 280, 2)];

    it('pega na faixa entre as duas paralelas', () => {
      expect(_noCorpoDoDesenho(d, pts, 200, 240)).toBe(true);
    });

    it('pega em cima das próprias linhas', () => {
      expect(_noCorpoDoDesenho(d, pts, 150, 200)).toBe(true);
      expect(_noCorpoDoDesenho(d, pts, 150, 280)).toBe(true);
    });

    it('não pega acima nem abaixo da faixa', () => {
      expect(_noCorpoDoDesenho(d, pts, 200, 150)).toBe(false);
      expect(_noCorpoDoDesenho(d, pts, 200, 330)).toBe(false);
    });

    it('não pega fora do trecho marcado', () => {
      expect(_noCorpoDoDesenho(d, pts, 500, 240)).toBe(false);
    });

    it('com a largura ainda por escolher, vale só a linha base', () => {
      const soBase = [px(100, 200, 0), px(300, 200, 1)];
      expect(_noCorpoDoDesenho(d, soBase, 200, 200)).toBe(true);
      expect(_noCorpoDoDesenho(d, soBase, 200, 240)).toBe(false);
    });
  });

  describe('triângulo', () => {
    const d = { tipo: 'triangulo_desenho' };
    const pts = [px(100, 100, 0), px(300, 100, 1), px(200, 250, 2)];

    it('pega no lado que fecha a figura, do último vértice ao primeiro', () => {
      expect(_noCorpoDoDesenho(d, pts, 150, 175)).toBe(true);
    });

    it('não pega no miolo vazio', () => {
      expect(_noCorpoDoDesenho(d, pts, 200, 150)).toBe(false);
    });
  });

  describe('linha vertical', () => {
    const d = { tipo: 'vertical' };
    const pts = [px(200, 100, 0)];

    // ela corre a altura toda: o y não importa
    it('pega em qualquer altura da coluna', () => {
      expect(_noCorpoDoDesenho(d, pts, 200, 40)).toBe(true);
      expect(_noCorpoDoDesenho(d, pts, 200, 500)).toBe(true);
    });

    it('não pega na coluna ao lado', () => {
      expect(_noCorpoDoDesenho(d, pts, 260, 300)).toBe(false);
    });
  });

  it('desenho sem ponto nenhum não tem corpo', () => {
    expect(_noCorpoDoDesenho({ tipo: 'trend' }, [], 10, 10)).toBe(false);
    expect(_noCorpoDoDesenho(null, [px(1, 1)], 10, 10)).toBe(false);
  });

  it('a tolerância do dedo é mais larga que a do mouse', () => {
    const d = { tipo: 'trend' };
    const pts = [px(100, 100, 0), px(300, 100, 1)];
    expect(_noCorpoDoDesenho(d, pts, 200, 112, 7)).toBe(false);
    expect(_noCorpoDoDesenho(d, pts, 200, 112, 14)).toBe(true);
  });
});
