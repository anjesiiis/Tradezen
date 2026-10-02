import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GlobeD3 from '../components/GlobeD3.jsx';
import { MERCADOS_GLOBAIS } from '../lib/mercadosGlobais.js';

// Mapa mínimo no formato topojson: um quadrado, só pra o componente ter o
// que desenhar sem baixar os 105 KB do mapa real.
const MAPA_FALSO = {
  type: 'Topology',
  arcs: [[[0, 0], [9999, 0], [0, 9999], [-9999, 0], [0, -9999]]],
  transform: { scale: [0.001, 0.001], translate: [-10, -10] },
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [{ type: 'Polygon', arcs: [[0]], id: '076', properties: { name: 'Brasil' } }],
    },
  },
};

function montarGlobo(props = {}) {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => MAPA_FALSO }));
  const aoSelecionar = vi.fn();
  const utils = render(<GlobeD3 mercados={MERCADOS_GLOBAIS} aoSelecionar={aoSelecionar} {...props} />);
  return { ...utils, aoSelecionar };
}

const pontos = () => [...document.querySelectorAll('.globo-ponto')];
// Agora o globo desenha por fora do React: os <g> de todos os mercados
// existem sempre e quem está do outro lado da Terra fica com display:none.
const visiveis = () => pontos().filter((n) => n.style.display !== 'none');

// Raio de abertura: metade do tamanho padrão (460) menos a folga de 8%
// que mantém o globo longe da borda.
const RAIO_BASE = (460 / 2) * 0.92;
const raio = (svg) => Number(svg.querySelector('circle').getAttribute('r'));

describe('Globo 3D', () => {
  it('busca o mapa do mundo e desenha o globo', async () => {
    montarGlobo();

    expect(global.fetch).toHaveBeenCalledWith('/world-110m.json');
    expect(await screen.findByRole('img', { name: /globo/i })).toBeInTheDocument();
  });

  it('mapa indisponível não quebra a página, avisa', async () => {
    global.fetch = vi.fn(async () => ({ ok: false }));
    render(<GlobeD3 mercados={MERCADOS_GLOBAIS} />);

    expect(await screen.findByText(/Não foi possível carregar o mapa/)).toBeInTheDocument();
  });

  it('mostra só os mercados do lado da Terra virado pra frente', async () => {
    // abre virado pro Brasil: B3 aparece, Tóquio (do outro lado) não
    montarGlobo();
    await screen.findByRole('img', { name: /globo/i });

    await waitFor(() => expect(visiveis().length).toBeGreaterThan(0));
    const rotulos = visiveis().map((p) => p.getAttribute('aria-label'));
    expect(rotulos.some((l) => l.startsWith('B3'))).toBe(true);
    expect(rotulos.some((l) => l.startsWith('TSE'))).toBe(false);
    expect(visiveis().length).toBeLessThan(MERCADOS_GLOBAIS.length);
  });

  it('clicar num ponto entrega o mercado e a posição na tela', async () => {
    const { aoSelecionar } = montarGlobo();
    await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(visiveis().length).toBeGreaterThan(0));

    fireEvent.click(visiveis()[0]);

    const [mercado, posicao] = aoSelecionar.mock.calls[0];
    expect(MERCADOS_GLOBAIS.map((m) => m.id)).toContain(mercado.id);
    expect(typeof posicao.x).toBe('number');
    expect(typeof posicao.y).toBe('number');
  });

  it('o ponto também responde ao teclado', async () => {
    const { aoSelecionar } = montarGlobo();
    await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(visiveis().length).toBeGreaterThan(0));

    fireEvent.keyDown(visiveis()[0], { key: 'Enter' });

    expect(aoSelecionar).toHaveBeenCalled();
  });

  it('arrastar gira o globo', async () => {
    montarGlobo();
    const svg = await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(visiveis().length).toBeGreaterThan(0));
    const alvo = pontos()[0];
    const antes = alvo.getAttribute('transform');

    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { clientX: 180, clientY: 100 });
    fireEvent.pointerUp(svg);

    // o desenho acontece no próximo quadro, não no evento
    await waitFor(() => expect(alvo.getAttribute('transform')).not.toBe(antes));
  });

  it('a roda do mouse dá zoom (e não deixa passar dos limites)', async () => {
    montarGlobo();
    const svg = await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(raio(svg)).toBeCloseTo(RAIO_BASE, 0));

    fireEvent.wheel(svg, { deltaY: -100 });
    await waitFor(() => expect(raio(svg)).toBeGreaterThan(RAIO_BASE));

    // muito scroll pra dentro para no teto de 2,5x
    for (let i = 0; i < 40; i++) fireEvent.wheel(svg, { deltaY: -100 });
    await waitFor(() => expect(raio(svg)).toBeCloseTo(RAIO_BASE * 2.5, 0));

    // e muito scroll pra fora para no piso de 0,7x
    for (let i = 0; i < 60; i++) fireEvent.wheel(svg, { deltaY: 100 });
    await waitFor(() => expect(raio(svg)).toBeCloseTo(RAIO_BASE * 0.7, 0));
  });

  it('pinça com dois dedos também dá zoom', async () => {
    montarGlobo();
    const svg = await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(raio(svg)).toBeCloseTo(RAIO_BASE, 0));

    const dedos = (d) => ({ touches: [{ clientX: 0, clientY: 0 }, { clientX: d, clientY: 0 }] });
    fireEvent.touchStart(svg, dedos(100));
    fireEvent.touchMove(svg, dedos(150));   // dedos se afastaram 1,5x

    await waitFor(() => expect(raio(svg)).toBeCloseTo(RAIO_BASE * 1.5, 0));
  });
});
