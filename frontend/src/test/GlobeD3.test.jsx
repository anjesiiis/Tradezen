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
    // girado pro Brasil: B3 e NYSE aparecem, Tóquio (do outro lado) não
    montarGlobo();
    await screen.findByRole('img', { name: /globo/i });

    await waitFor(() => expect(pontos().length).toBeGreaterThan(0));
    const visiveis = pontos().map((p) => p.getAttribute('aria-label'));
    expect(visiveis.some((l) => l.startsWith('B3'))).toBe(true);
    expect(visiveis.some((l) => l.startsWith('TSE'))).toBe(false);
    expect(pontos().length).toBeLessThan(MERCADOS_GLOBAIS.length);
  });

  it('clicar num ponto entrega o mercado e a posição na tela', async () => {
    const { aoSelecionar } = montarGlobo();
    await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(pontos().length).toBeGreaterThan(0));

    fireEvent.click(pontos()[0]);

    const [mercado, posicao] = aoSelecionar.mock.calls[0];
    expect(MERCADOS_GLOBAIS.map((m) => m.id)).toContain(mercado.id);
    expect(typeof posicao.x).toBe('number');
    expect(typeof posicao.y).toBe('number');
  });

  it('o ponto também responde ao teclado', async () => {
    const { aoSelecionar } = montarGlobo();
    await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(pontos().length).toBeGreaterThan(0));

    fireEvent.keyDown(pontos()[0], { key: 'Enter' });

    expect(aoSelecionar).toHaveBeenCalled();
  });

  it('arrastar gira o globo', async () => {
    montarGlobo();
    const svg = await screen.findByRole('img', { name: /globo/i });
    await waitFor(() => expect(pontos().length).toBeGreaterThan(0));
    const antes = pontos()[0].getAttribute('transform');

    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { clientX: 180, clientY: 100 });
    fireEvent.pointerUp(svg);

    expect(pontos()[0].getAttribute('transform')).not.toBe(antes);
  });
});
