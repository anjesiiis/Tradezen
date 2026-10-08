import { render, screen } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import TemplateMarkerChart from '../admin/TemplateMarkerChart.jsx';

// Depois de salvar um template, a tela precisa ficar pronta pro próximo
// padrão no MESMO ativo: os pontos saem do gráfico, mas o gráfico não é
// recriado (recriar jogaria fora o ativo, o período e o trecho na tela).
// O bug que isso cobre: a tela limpava só o seu próprio estado e os pontos
// continuavam desenhados, porque o gráfico guarda uma cópia deles.

const DIA = 86400000;
const candles = Array.from({ length: 40 }, (_, i) => ({
  timestamp: i * DIA,
  abertura: 10 + i, maxima: 11 + i, minima: 9 + i, fechamento: 10 + i, volume: 100,
}));

const STEPS = [
  { key: 'topo1', label: 'Topo 1', color: '#ef5350' },
  { key: 'fundo', label: 'Fundo', color: '#2962ff' },
  { key: 'topo2', label: 'Topo 2', color: '#ef5350' },
];

const PONTOS = {
  topo1: { i: 5, preco: 15 },
  fundo: { i: 10, preco: 12 },
  topo2: { i: 15, preco: 15.5 },
};

function montar(props = {}) {
  return render(
    <TemplateMarkerChart candles={candles} steps={STEPS} initialPontos={PONTOS} onChange={vi.fn()} {...props} />,
  );
}

const precosNaTela = () => Array.from(document.querySelectorAll('.admin-chip .val')).map((n) => n.textContent);

describe('Limpar os pontos depois de salvar', () => {
  beforeEach(() => createChart.mockClear());

  it('mostra os pontos marcados enquanto limparEm não muda', () => {
    const { rerender } = montar({ limparEm: 0 });
    expect(precosNaTela()).toHaveLength(3);

    rerender(
      <TemplateMarkerChart candles={candles} steps={STEPS} initialPontos={PONTOS} onChange={vi.fn()} limparEm={0} />,
    );

    expect(precosNaTela()).toHaveLength(3);
  });

  it('mudar limparEm apaga os pontos sem recriar o gráfico', () => {
    const { rerender } = montar({ limparEm: 0 });
    expect(precosNaTela()).toHaveLength(3);
    expect(createChart).toHaveBeenCalledTimes(1);

    rerender(
      <TemplateMarkerChart candles={candles} steps={STEPS} initialPontos={PONTOS} onChange={vi.fn()} limparEm={1} />,
    );

    expect(precosNaTela()).toHaveLength(0);
    // o gráfico é o mesmo: nada de recarregar ativo, período ou zoom
    expect(createChart).toHaveBeenCalledTimes(1);
  });

  it('depois de limpar, a marcação volta pro primeiro passo', () => {
    const { rerender } = montar({ limparEm: 0 });

    rerender(
      <TemplateMarkerChart candles={candles} steps={STEPS} initialPontos={PONTOS} onChange={vi.fn()} limparEm={1} />,
    );

    expect(screen.getByRole('button', { name: /Topo 1/ })).toHaveClass('active');
  });

  it('avisa a tela que os pontos ficaram vazios', () => {
    const onChange = vi.fn();
    const { rerender } = montar({ limparEm: 0, onChange });

    rerender(
      <TemplateMarkerChart candles={candles} steps={STEPS} initialPontos={PONTOS} onChange={onChange} limparEm={1} />,
    );

    expect(onChange).toHaveBeenLastCalledWith({});
  });
});
