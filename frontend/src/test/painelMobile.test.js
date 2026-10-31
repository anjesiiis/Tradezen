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

// O trecho do painel dentro da media query de celular. Ancorado na
// definição dos tokens, que é a primeira regra do bloco — e não numa
// linha solta, que some assim que alguém escreve um comentário ali.
const MOBILE = (() => {
  const i = CSS.indexOf('--pp-alvo:');
  if (i === -1) return '';
  const fim = CSS.indexOf('\n}', i);
  return CSS.slice(CSS.lastIndexOf('@media', i), fim === -1 ? undefined : fim);
})();

describe('Painel de personalização — proporção no celular', () => {
  // A CAUSA das bolinhas ovais, medida no navegador: a regra de alvo de
  // toque `button{min-height:44px}`, que vale pra todo botão no celular,
  // esticava uma bolinha de 26px pra 44px de altura. Um border-radius de
  // 50% numa caixa 26x44 é uma oval. Medido: 8 ovais de 26x44, e só o
  // seletor de cor livre (que é <label>, não <button>) saía redondo.
  it.each(['.pp-cor', '.pp-esp', '.pp-traco', '.pp-bi', '.pp-nivel'])(
    '%s diz a própria altura mínima, vencendo a regra dos 44px',
    (seletor) => {
      // classe vence seletor de elemento — é o que faz a regra pegar
      expect(MOBILE).toMatch(new RegExp(`\\${seletor}\\{[^}]*min-height:`));
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

  // Num SE de 320px um botão de 34px come 11% da largura; num Pro Max de
  // 430, 8%. O clamp faz o controle encolher e crescer com o aparelho.
  it.each(['--pp-alvo', '--pp-cor', '--pp-gap', '--pp-pad', '--pp-fs'])(
    '%s escala com a tela em vez de ser fixo',
    (token) => {
      const m = MOBILE.match(new RegExp(`${token}:clamp\\((\\d+)px,[^,]+,(\\d+)px\\)`));
      expect(m, `${token} deveria ser um clamp`).not.toBeNull();
      expect(Number(m[1])).toBeLessThan(Number(m[2]));   // piso abaixo do teto
    },
  );

  it('o piso dos alvos de toque não desce abaixo de 30px', () => {
    const piso = Number(MOBILE.match(/--pp-alvo:clamp\((\d+)px/)[1]);
    expect(piso).toBeGreaterThanOrEqual(30);
  });

  // Antes era bottom:46px no osso, com a barra de navegação em 56px mais
  // a safe area: num iPhone com indicador o painel nascia por baixo das
  // abas, e os controles de baixo ficavam inalcançáveis.
  it('para em cima da barra de navegação, com a folga do aparelho', () => {
    expect(MOBILE).toContain('var(--h-nav-inferior)');
    expect(MOBILE).toContain('env(safe-area-inset-bottom');
    expect(MOBILE).not.toMatch(/\.pp\{[^}]*bottom:46px/);
  });

  describe('no celular', () => {
    it('o painel tem teto de altura e rola por dentro', () => {
      // Sem teto ele cobria quase metade da tela e empurrava os candles
      expect(MOBILE).toMatch(/max-height:\d+vh/);
      expect(MOBILE).toContain('overflow-y:auto');
    });

    it('a bolinha de cor cresce pro dedo, continuando quadrada', () => {
      const m = MOBILE.match(/\.pp-cor\{width:var\((--pp-cor)\);height:var\((--pp-cor)\)/);
      expect(m, 'largura e altura têm que sair do MESMO token').not.toBeNull();
      expect(m[1]).toBe(m[2]);
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
