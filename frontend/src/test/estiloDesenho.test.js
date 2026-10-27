import {
  CORES_DESENHO, ESTILO_PADRAO, FIBO_NIVEIS_DISPONIVEIS,
  fonteDoCanvas, normalizarEstilo, normalizarNiveisFibo, normalizarPreferencias,
} from '../lib/grafico/estiloDesenho.js';

describe('Estilo dos desenhos', () => {
  it('são 8 cores no seletor', () => {
    expect(CORES_DESENHO).toHaveLength(8);
    CORES_DESENHO.forEach(c => expect(c.valor).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });

  // pedido do dono: o Fibonacci desenha sete linhas de uma vez e em cor
  // forte competia com os candles
  it('o Fibonacci nasce branco', () => {
    expect(ESTILO_PADRAO.fibo.cor).toBe('#E8EBF2');
  });

  // desenho salvo antes desta tela existir não tem campo de estilo nenhum
  it('desenho sem estilo cai no padrão da ferramenta', () => {
    expect(normalizarEstilo('trend', undefined)).toEqual(ESTILO_PADRAO.trend);
    expect(normalizarEstilo('horizontal', null).cor).toBe(ESTILO_PADRAO.horizontal.cor);
  });

  it('campo estranho volta pro padrão, em vez de pintar nada', () => {
    const e = normalizarEstilo('trend', { cor: 'javascript:alert(1)', espessura: 99, traco: 'zigzag' });
    expect(e).toEqual(ESTILO_PADRAO.trend);
  });

  it('o que a pessoa escolheu é respeitado', () => {
    const e = normalizarEstilo('trend', { cor: '#26C77B', espessura: 4, traco: 'pontilhado' });
    expect(e).toEqual({ cor: '#26C77B', espessura: 4, traco: 'pontilhado' });
  });

  describe('níveis do Fibonacci', () => {
    it('sem escolha, mostra todos', () => {
      expect(normalizarNiveisFibo(undefined)).toEqual(FIBO_NIVEIS_DISPONIVEIS);
    });

    it('dá pra tirar o 23,6% e o 78,6%', () => {
      const n = normalizarNiveisFibo([0, 0.382, 0.5, 0.618, 1]);
      expect(n).not.toContain(0.236);
      expect(n).not.toContain(0.786);
      expect(n).toEqual([0, 0.382, 0.5, 0.618, 1]);
    });

    // são as pontas do movimento medido: sem elas o desenho perde a referência
    it('0% e 100% voltam mesmo se alguém tirar', () => {
      const n = normalizarNiveisFibo([0.5]);
      expect(n).toEqual([0, 0.5, 1]);
    });

    it('sai sempre em ordem e sem repetir', () => {
      expect(normalizarNiveisFibo([1, 0.5, 0.5, 0, 0.236])).toEqual([0, 0.236, 0.5, 1]);
    });

    it('nível inventado é ignorado', () => {
      expect(normalizarNiveisFibo([0.5, 0.42, 1.618])).toEqual([0, 0.5, 1]);
    });
  });

  describe('fonte do texto', () => {
    it('monta a fonte do canvas', () => {
      expect(fonteDoCanvas({ fonte: 'Georgia, serif', tamanho: 24, negrito: true, italico: false }))
        .toBe('700 24px Georgia, serif');
    });

    it('itálico entra na frente', () => {
      expect(fonteDoCanvas({ tamanho: 16, italico: true })).toMatch(/^italic 400 16px /);
    });

    it('sem nada, usa o padrão', () => {
      expect(fonteDoCanvas(undefined)).toBe('400 14px Inter, sans-serif');
    });
  });

  it('as preferências saem completas, ferramenta por ferramenta', () => {
    const p = normalizarPreferencias({ trend: { cor: '#FF6B9D' } });
    expect(p.trend.cor).toBe('#FF6B9D');
    expect(p.trend.espessura).toBe(ESTILO_PADRAO.trend.espessura);
    expect(p.texto.fonte).toBe(ESTILO_PADRAO.texto.fonte);
    expect(p.fibo.niveis).toEqual(FIBO_NIVEIS_DISPONIVEIS);
  });
});

// ── o estilo chega mesmo ao canvas? ──────────────────────────────────
import { _desenharDesenhoUsuario } from '../lib/grafico/desenhos.js';

// ctx que anota a cor e o traço de cada risco, e as fontes usadas
function ctxEspiao() {
  return {
    riscos: [], fontes: [], textos: [],
    strokeStyle: null, fillStyle: null, font: null, lineWidth: 1, _dash: [],
    save(){}, restore(){}, beginPath(){}, closePath(){}, fill(){},
    arc(){}, rect(){}, fillRect(){}, translate(){}, rotate(){},
    moveTo(){}, lineTo(){},
    setLineDash(d){ this._dash = d; },
    strokeRect(){ this.riscos.push({ cor: this.strokeStyle, dash: this._dash, lw: this.lineWidth }); },
    stroke(){ this.riscos.push({ cor: this.strokeStyle, dash: this._dash, lw: this.lineWidth }); },
    measureText(){ return { width: 10 }; },
    fillText(t){ this.textos.push({ t, fonte: this.font, cor: this.fillStyle }); },
  };
}
const toY = (preco) => 500 - preco;
const toX = (logical) => logical * 10;
const DOIS = [{ logical: 1, preco: 100 }, { logical: 5, preco: 140 }];

describe('Estilo aplicado no canvas', () => {
  it('a linha de tendência sai na cor e no traço escolhidos', () => {
    const ctx = ctxEspiao();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'trend', pontos: DOIS, estilo: { cor: '#FF6B9D', espessura: 4, traco: 'pontilhado' },
    }, false, 800);

    expect(ctx.riscos[0].cor).toBe('#FF6B9D');
    expect(ctx.riscos[0].lw).toBe(4);
    expect(ctx.riscos[0].dash).toEqual([2, 4]);
  });

  it('desenho antigo, sem estilo, continua como era', () => {
    const ctx = ctxEspiao();
    _desenharDesenhoUsuario(ctx, toX, toY, { tipo: 'trend', pontos: DOIS }, false, 800);
    expect(ctx.riscos[0].cor).toBe(ESTILO_PADRAO.trend.cor);
  });

  it('o Fibonacci desenha só os níveis escolhidos', () => {
    const ctx = ctxEspiao();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'fibo', pontos: DOIS, estilo: { niveis: [0, 0.5, 1] },
    }, false, 800);

    const rotulos = ctx.textos.map(x => x.t);
    expect(rotulos.some(r => r.startsWith('50.0%'))).toBe(true);
    expect(rotulos.some(r => r.startsWith('23.6%'))).toBe(false);
    expect(rotulos.some(r => r.startsWith('78.6%'))).toBe(false);
  });

  it('o texto sai na fonte, no tamanho e na cor escolhidos', () => {
    const ctx = ctxEspiao();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'texto', pontos: [DOIS[0]], texto: 'suporte forte',
      estilo: { fonte: 'Georgia, serif', tamanho: 24, negrito: true, cor: '#26C77B' },
    }, false, 800);

    const escrito = ctx.textos.find(x => x.t === 'suporte forte');
    expect(escrito.fonte).toBe('700 24px Georgia, serif');
    expect(escrito.cor).toBe('#26C77B');
  });

  // a régua não é personalizável: não pode herdar o estilo da linha
  it('a régua não é afetada pelo estilo da linha', () => {
    const ctx = ctxEspiao();
    _desenharDesenhoUsuario(ctx, toX, toY, {
      tipo: 'regua', pontos: DOIS, estilo: { cor: '#FF6B9D' },
    }, false, 800);

    expect(ctx.riscos.every(r => r.cor !== '#FF6B9D')).toBe(true);
  });
});
