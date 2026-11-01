import { render } from '@testing-library/react';
import { ICONES_FERRAMENTAS } from '../components/chart/IconesFerramentas.jsx';
import { GRUPOS_FERRAMENTAS } from '../components/chart/ferramentasGrafico.js';
import { CSS } from '../styles/appCss.js';

// O relato era "traço fino demais, contraste baixo, e o canal parece dois
// tracinhos soltos". Estes testes travam as três coisas: não medem beleza,
// medem o que, quando volta atrás, devolve o ícone invisível.

const regra = (seletor) => {
  const i = CSS.indexOf(seletor + '{');
  if (i === -1) return null;
  return CSS.slice(i + seletor.length + 1, CSS.indexOf('}', i));
};

const svgDe = (id) => {
  const { container } = render(ICONES_FERRAMENTAS[id]);
  return container.querySelector('svg');
};

const TODAS = GRUPOS_FERRAMENTAS.flat().map((f) => [f.id, f.rotulo]);

describe('Ícones da barra de ferramentas', () => {
  // Antes o Texto caía no glifo de reserva "T" — a letra pegava o peso da
  // fonte do sistema e saía magra do lado dos outros cinco.
  it.each(TODAS)('%s (%s) é desenho, não letra de fonte', (id) => {
    expect(ICONES_FERRAMENTAS[id]).toBeTruthy();
    expect(svgDe(id)).not.toBeNull();
  });

  it.each(TODAS)('%s usa a mesma caneta: viewBox 24, traço >= 2, ponta redonda', (id) => {
    const svg = svgDe(id);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(Number(svg.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(2);
    expect(svg.getAttribute('stroke-linecap')).toBe('round');
    expect(svg.getAttribute('stroke-linejoin')).toBe('round');
  });

  it.each(TODAS)('%s herda a cor do botão, não traz cor própria', (id) => {
    const svg = svgDe(id);
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    // cor fixa aqui quebraria o estado aceso (azul) e o tema claro
    expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);
  });

  // O traço fino era metade do problema de contraste; esmaecer traço é a
  // outra metade, e seria o jeito de reintroduzir o defeito sem mexer na
  // cor. O preenchimento do canal é a única transparência permitida.
  it.each(TODAS)('%s não esmaece nenhum traço', (id) => {
    const svg = svgDe(id);
    for (const el of svg.querySelectorAll('*')) {
      if (el.getAttribute('stroke') === 'none') continue;   // é preenchimento
      expect(el.getAttribute('opacity'), id).toBeNull();
      expect(el.getAttribute('stroke-opacity'), id).toBeNull();
    }
  });

  // A queixa nominal do dono: "parece dois tracinhos soltos". A faixa
  // entre as paralelas é o que faz o ícone dizer "canal".
  it('o canal paralelo tem a faixa preenchida entre as duas linhas', () => {
    const svg = svgDe('canal');
    const faixa = svg.querySelector('path[fill-opacity]');

    expect(faixa).not.toBeNull();
    expect(Number(faixa.getAttribute('fill-opacity'))).toBeGreaterThan(0.1);
    expect(faixa.getAttribute('fill')).toBe('currentColor');
    // e continua tendo as duas paralelas de verdade
    expect(svg.querySelectorAll('line')).toHaveLength(2);
  });

  // O espaçamento desigual (0 · 38,2 · 50 · 61,8 · 100) é o que identifica
  // Fibonacci. Linhas igualmente espaçadas viram "umas listas".
  it('o Fibonacci mantém o espaçamento desigual dos níveis', () => {
    const ys = [...svgDe('fibo').querySelectorAll('line')].map((l) => Number(l.getAttribute('y1')));
    const vaos = ys.slice(1).map((y, i) => y - ys[i]);

    expect(ys).toHaveLength(4);
    expect(new Set(vaos).size).toBeGreaterThan(1);
  });
});

describe('Botão da barra — contraste e alvo de toque', () => {
  const botao = regra('.chart-tool');

  // Medido: --text2 (#5A7299) sobre --s1 (#0D1117) dá 3,9:1, que passa
  // raspando o mínimo de 3:1 do WCAG pra elemento gráfico. Com --text
  // (#E6EDF3) são ~14:1.
  it('o ícone usa a cor de texto principal, não a secundária', () => {
    expect(botao).toMatch(/color:var\(--text\)/);
    expect(botao).not.toMatch(/color:var\(--text2\)/);
  });

  // A regra global button{min-height:44px} do celular esticava o botão pra
  // 36 de largura por 44 de altura. Classe vence seletor de elemento, e é
  // por isso que o lado mínimo tem que estar declarado AQUI.
  it('o botão se defende da regra dos 44px e fica quadrado', () => {
    expect(botao).toMatch(/min-width:var\(--tool-btn/);
    expect(botao).toMatch(/min-height:var\(--tool-btn/);
  });

  it('o alvo de toque tem no mínimo 40px', () => {
    const barra = regra('.chart-toolbar');
    const lado = barra.match(/--tool-btn:(\d+)px/);

    expect(lado).not.toBeNull();
    expect(Number(lado[1])).toBeGreaterThanOrEqual(40);
  });

  // Sem hover no celular, o :active é o único sinal de que o toque pegou
  it('o toque dá retorno visual', () => {
    expect(regra('.chart-tool:active')).toMatch(/transform:scale/);
  });

  // O azul é o sinal de "ferramenta armada". Se o hover também ficasse
  // azul, os dois estados viravam a mesma coisa.
  it('o azul fica reservado pra ferramenta armada', () => {
    expect(regra('.chart-tool.ativo')).toMatch(/color:var\(--accent\)/);
    expect(regra('.chart-tool:hover')).not.toMatch(/--accent/);
  });

  it('o tamanho do ícone vem do CSS e escala com a tela', () => {
    expect(regra('.chart-toolbar')).toMatch(/--tool-icone:clamp\(/);
    expect(regra('.chart-tool svg')).toMatch(/width:var\(--tool-icone/);
  });
});
