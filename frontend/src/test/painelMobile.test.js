import { CSS } from '../styles/appCss.js';
import { pontoDaParalela } from '../lib/grafico/desenhos.js';

// Pega a declaração de um seletor exato dentro do CSS (que é uma string
// só, sem parser) — o suficiente pra travar as regras que, quando caem,
// deformam o painel sem quebrar teste nenhum.
const regra = (seletor) => {
  const i = CSS.indexOf(seletor + '{');
  if (i === -1) return null;
  return CSS.slice(i + seletor.length + 1, CSS.indexOf('}', i));
};

// O trecho do painel dentro da media query de celular.
const MOBILE = (() => {
  const i = CSS.indexOf('@media(max-width:767px){\n  .pp{');
  return i === -1 ? '' : CSS.slice(i, CSS.indexOf('\n}', i));
})();

describe('Painel de personalização — proporção no celular', () => {
  // A CAUSA das bolinhas ovais, medida no navegador: a regra de alvo de
  // toque `button{min-height:44px}`, que vale pra todo botão no celular,
  // esticava uma bolinha de 26px pra 44px de altura. Um border-radius de
  // 50% numa caixa 26x44 é uma oval. Medido: 8 ovais de 26x44, e só o
  // seletor de cor livre (que é <label>, não <button>) saía redondo.
  it('as bolinhas dizem a própria altura mínima, vencendo a regra dos 44px', () => {
    expect(MOBILE).toMatch(/\.pp-cor\{[^}]*min-height:\d+px/);
    // classe vence seletor de elemento — é o que faz a regra pegar
    const alvo = MOBILE.match(/\.pp-cor\{[^}]*min-height:(\d+)px/)[1];
    const altura = MOBILE.match(/\.pp-cor\{width:\d+px;height:(\d+)px/)[1];
    expect(alvo).toBe(altura);
  });

  it.each(['.pp-esp', '.pp-traco', '.pp-bi', '.pp-nivel'])(
    '%s também escapa do esticão dos 44px',
    (seletor) => {
      expect(MOBILE).toMatch(new RegExp(`\\${seletor}\\{[^}]*min-height:\\d+px`));
    },
  );

  // Defesa de flanco: mesmo sem a regra dos 44px, um container flex sem
  // align-items estica os filhos (stretch é o padrão) e devolveria o
  // mesmo problema pela outra porta.
  it.each(['.pp-cores', '.pp-grupo', '.pp-niveis'])(
    '%s centraliza em vez de esticar os filhos',
    (seletor) => {
      expect(regra(seletor)).toContain('align-items:center');
    },
  );

  // Esticar também vem do lado: sem flex:0 0 auto, um container apertado
  // encolhe a bolinha e ela deixa de ser redonda.
  it.each(['.pp-cor', '.pp-esp', '.pp-traco', '.pp-nivel'])(
    '%s não encolhe nem cresce com o container',
    (seletor) => {
      expect(regra(seletor)).toContain('flex:0 0 auto');
    },
  );

  it('a bolinha de cor é quadrada antes de virar círculo', () => {
    const r = regra('.pp-cor');
    expect(r).toContain('border-radius:50%');
    // largura e altura iguais: um raio de 50% em caixa retangular é oval
    const [w] = r.match(/width:(\d+)px/).slice(1);
    const [h] = r.match(/height:(\d+)px/).slice(1);
    expect(w).toBe(h);
  });

  describe('no celular', () => {
    it('o painel tem teto de altura e rola por dentro', () => {
      // Sem teto ele cobria quase metade da tela e empurrava os candles
      expect(MOBILE).toMatch(/max-height:\d+vh/);
      expect(MOBILE).toContain('overflow-y:auto');
    });

    it('a bolinha de cor cresce pro dedo, continuando quadrada', () => {
      const m = MOBILE.match(/\.pp-cor\{width:(\d+)px;height:(\d+)px/);
      expect(m).not.toBeNull();
      expect(m[1]).toBe(m[2]);
      expect(Number(m[1])).toBeGreaterThanOrEqual(30);
    });

    it('os níveis do Fibonacci correm pro lado em vez de virar 4 fileiras', () => {
      expect(MOBILE).toContain('.pp-niveis{flex-wrap:nowrap;overflow-x:auto');
    });
  });
});

describe('Canal — a paralela aparece antes do 3º toque', () => {
  // maxima/minima, que é como o candle chega do backend — e não high/low,
  // que só existem na cópia feita pro Lightweight Charts
  const candles = [
    { maxima: 105, minima: 99, fechamento: 100 },
    { maxima: 108, minima: 101, fechamento: 104 },
    { maxima: 130, minima: 110, fechamento: 118 },
    { maxima: 115, minima: 106, fechamento: 110 },
    { maxima: 118, minima: 108, fechamento: 112 },
  ];

  // Entre o 2º e o 3º toque o dedo está NO AR: não existe movimento pra
  // paralela seguir, e a tela ficava com uma linha só e a instrução "mova
  // pra cima ou pra baixo". Semear o preview com a largura que os candles
  // sugerem é o que faz o canal aparecer inteiro desde o começo.
  it('a base rende um 3º ponto palpitado pelos candles', () => {
    const a = { logical: 0, preco: 100 };
    const b = { logical: 4, preco: 112 };
    const terceiro = pontoDaParalela(a, b, candles);

    expect(terceiro).not.toBeNull();
    expect(terceiro.logical).toBeTypeOf('number');
    expect(terceiro.preco).toBeTypeOf('number');
    // tem que ficar FORA da base, senão a paralela nasce colada nela
    expect(terceiro.preco).not.toBeCloseTo(100);
  });

  it('sem candle entre os dois pontos, não inventa largura', () => {
    expect(pontoDaParalela({ logical: 0, preco: 100 }, { logical: 0, preco: 100 }, [])).toBeNull();
  });
});
