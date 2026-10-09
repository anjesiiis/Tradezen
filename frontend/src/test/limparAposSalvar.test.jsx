import { render, screen } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import TemplateMarkerChart from '../admin/TemplateMarkerChart.jsx';

// O gráfico guarda a PRÓPRIA cópia dos pontos, por índice de candle. A
// tela limpar só o estado dela não basta: os pontos continuam desenhados.
// É o mesmo bug em dois caminhos —
//   • depois de salvar: a marcação anterior ficava na tela;
//   • ao trocar de ativo ou período: as linhas do ativo ANTERIOR ficavam
//     desenhadas sobre o novo, em preços que não existem nele.
// Os dois são resolvidos pelo mesmo `limparEm`, que zera os pontos sem
// recriar o gráfico (recriar jogaria fora o ativo, o período e o zoom).

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

  it('serve pra trocar de ativo: pontos do anterior não sobrevivem', () => {
    // mesmo com candles NOVOS (outro ativo), o que apaga os pontos é o
    // limparEm — sem ele o gráfico redesenha a marcação velha nos índices
    // do ativo novo
    const outroAtivo = candles.map((c) => ({ ...c, fechamento: c.fechamento * 3 }));
    const { rerender } = montar({ limparEm: 0 });
    expect(precosNaTela()).toHaveLength(3);

    rerender(
      <TemplateMarkerChart candles={outroAtivo} steps={STEPS} initialPontos={PONTOS} onChange={vi.fn()} limparEm={1} />,
    );

    expect(precosNaTela()).toHaveLength(0);
    expect(createChart).toHaveBeenCalledTimes(1);
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
