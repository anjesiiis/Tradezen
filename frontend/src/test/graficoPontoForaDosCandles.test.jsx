import { render, screen } from '@testing-library/react';
import TemplateMarkerChart from '../admin/TemplateMarkerChart.jsx';
import NivelMarkerChart from '../admin/NivelMarkerChart.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

// O ÍNDICE DO PONTO PODE NÃO EXISTIR NOS CANDLES DA TELA
// =====================================================
//
// `pontos` e `candles` são dois estados, e o React os atualiza em passos
// diferentes. Entre um passo e o outro existe um render com os pontos do
// template NOVO sobre os candles do ANTERIOR. Se o novo marca o candle 80
// e o anterior tem 40, `candles[80]` é undefined — e `toChartTime` morria
// em "undefined is not an object (evaluating 'c.timestamp')", derrubando
// a página inteira na tela de "Algo quebrou".
//
// Todo o resto dos dois gráficos já filtrava por `candles[i]`; só o efeito
// dos marcadores não filtrava. Estes testes travam a guarda nos dois.

const DIA = 86400000;
const candles = Array.from({ length: 40 }, (_, i) => ({
  timestamp: i * DIA,
  abertura: 10 + i, maxima: 11 + i, minima: 9 + i, fechamento: 10 + i, volume: 100,
}));

const STEPS = [
  { key: 'topo1', label: 'Topo 1', short: 'T1', color: '#ef5350' },
  { key: 'fundo', label: 'Fundo', short: 'F', color: '#2962ff' },
];

const quebrou = () => document.querySelector('.erro-pedaco, .erro-tela');

describe('Ponto apontando pra candle que não está mais na tela', () => {
  it('desenha o gráfico de marcação sem quebrar quando o índice passa do fim', () => {
    render(
      <TemplateMarkerChart
        candles={candles}
        steps={STEPS}
        initialPontos={{ topo1: { i: 5, preco: 15 }, fundo: { i: 900, preco: 12 } }}
        onChange={vi.fn()}
      />,
    );
    expect(quebrou()).toBeNull();
  });

  it('não quebra nem quando NENHUM ponto cabe nos candles', () => {
    render(
      <TemplateMarkerChart
        candles={candles}
        steps={STEPS}
        initialPontos={{ topo1: { i: 700, preco: 15 }, fundo: { i: 900, preco: 12 } }}
        onChange={vi.fn()}
      />,
    );
    expect(quebrou()).toBeNull();
  });

  it('o gráfico de nível aguenta toque fora dos candles', () => {
    render(
      <NivelMarkerChart
        candles={candles}
        initialToques={[{ i: 3, preco: 12 }, { i: 1200, preco: 13 }]}
        onChange={vi.fn()}
      />,
    );
    expect(quebrou()).toBeNull();
  });

  it('o gráfico de nível aguenta a banda com os dois toques fora', () => {
    render(
      <NivelMarkerChart
        candles={candles}
        initialToques={[{ i: 800, preco: 12 }, { i: 1200, preco: 13 }]}
        onChange={vi.fn()}
      />,
    );
    expect(quebrou()).toBeNull();
  });

  it('encurtar os candles com os pontos já marcados não derruba a tela', () => {
    const { rerender } = render(
      <TemplateMarkerChart
        candles={candles}
        steps={STEPS}
        initialPontos={{ topo1: { i: 5, preco: 15 }, fundo: { i: 30, preco: 12 } }}
        onChange={vi.fn()}
      />,
    );
    // o passo intermediário do React: período novo (menos candles) com os
    // pontos do anterior ainda marcados
    rerender(
      <TemplateMarkerChart
        candles={candles.slice(0, 8)}
        steps={STEPS}
        initialPontos={{ topo1: { i: 5, preco: 15 }, fundo: { i: 30, preco: 12 } }}
        onChange={vi.fn()}
      />,
    );
    expect(quebrou()).toBeNull();
  });
});

// Rede de segurança: mesmo consertado o caso conhecido, um erro de desenho
// não pode mais levar a lista e o formulário junto.
function Bomba() {
  throw new Error('estourei de propósito');
}

describe('ErrorBoundary em modo compacto', () => {
  it('mostra o recado e o erro no lugar do pedaço, não na tela toda', () => {
    render(
      <div>
        <p>o resto da página</p>
        <ErrorBoundary compacto="Não deu pra desenhar o gráfico desta marcação.">
          <Bomba />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByText('o resto da página')).toBeTruthy();
    expect(document.querySelector('.erro-pedaco')).toBeTruthy();
    expect(document.querySelector('.erro-tela')).toBeNull();
    expect(screen.getByText(/estourei de propósito/)).toBeTruthy();
  });

  it('sem `compacto` continua sendo a tela cheia de sempre', () => {
    render(<ErrorBoundary><Bomba /></ErrorBoundary>);
    expect(document.querySelector('.erro-tela')).toBeTruthy();
    expect(document.querySelector('.erro-pedaco')).toBeNull();
  });
});
