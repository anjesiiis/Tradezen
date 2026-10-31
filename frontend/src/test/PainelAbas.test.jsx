import { fireEvent, render, screen } from '@testing-library/react';
import PainelPersonalizacao from '../components/chart/PainelPersonalizacao.jsx';
import { normalizarEstilo } from '../lib/grafico/estiloDesenho.js';

/**
 * Só o Fibonacci tem aba.
 *
 * Ele é a única ferramenta com mais de três grupos de controle — cor,
 * espessura, traço, etiquetas e dez níveis — e era o único painel que
 * precisava ROLAR num aparelho de 320, 360 ou 375px (medido no
 * navegador). Nas outras, abas só acrescentariam um toque pra chegar no
 * que já estava à vista.
 */
const abrir = (ferramenta) => {
  const aoMudar = vi.fn();
  render(
    <PainelPersonalizacao
      ferramenta={ferramenta}
      estilo={normalizarEstilo(ferramenta, {})}
      aoMudar={aoMudar}
    />,
  );
  return { aoMudar };
};

const abas = () => [...document.querySelectorAll('.pp-aba')].map((b) => b.textContent);

describe('Abas do painel de personalização', () => {
  it('o Fibonacci tem duas abas, abrindo em Estilo', () => {
    abrir('fibo');
    expect(abas()).toEqual(['Estilo', 'Níveis']);
    expect(screen.getByRole('tab', { name: 'Estilo' })).toHaveAttribute('aria-selected', 'true');
  });

  it.each(['trend', 'canal', 'retangulo_desenho', 'horizontal', 'texto'])(
    '%s não tem aba — cabe inteiro na tela', (ferramenta) => {
      abrir(ferramenta);
      expect(abas()).toEqual([]);
    },
  );

  it('em Estilo aparecem cor, espessura e traço — e nenhum nível', () => {
    abrir('fibo');
    expect(screen.getByText('Cor')).toBeInTheDocument();
    expect(screen.getByText('Espessura')).toBeInTheDocument();
    expect(screen.getByText('Traço')).toBeInTheDocument();
    expect(screen.queryByText('23.6%')).not.toBeInTheDocument();
  });

  it('em Níveis aparecem os níveis — e some o resto', () => {
    abrir('fibo');
    fireEvent.click(screen.getByRole('tab', { name: 'Níveis' }));

    expect(screen.getByText('23.6%')).toBeInTheDocument();
    expect(screen.queryByText('Espessura')).not.toBeInTheDocument();
    expect(screen.queryByText('Cor')).not.toBeInTheDocument();
  });

  // Trocar de aba é navegar, não mexer no desenho
  it('trocar de aba não altera estilo nenhum', () => {
    const { aoMudar } = abrir('fibo');
    fireEvent.click(screen.getByRole('tab', { name: 'Níveis' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Estilo' }));
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it('escolher um nível continua funcionando dentro da aba', () => {
    const { aoMudar } = abrir('fibo');
    fireEvent.click(screen.getByRole('tab', { name: 'Níveis' }));
    fireEvent.click(screen.getByText('23.6%'));
    expect(aoMudar).toHaveBeenCalledWith({ niveis: expect.not.arrayContaining([0.236]) });
  });

  it('recolher o painel esconde as abas junto', () => {
    abrir('fibo');
    fireEvent.click(screen.getByTitle('Recolher'));
    expect(abas()).toEqual([]);
  });
});
