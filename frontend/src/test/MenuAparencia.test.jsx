import { fireEvent, render, screen } from '@testing-library/react';
import MenuAparencia from '../components/chart/MenuAparencia.jsx';
import { APARENCIA_PADRAO } from '../lib/grafico/aparencia.js';

const abrir = (aparencia = APARENCIA_PADRAO) => {
  const aoMudar = vi.fn();
  const aoFechar = vi.fn();
  render(
    <MenuAparencia pos={{ top: 0, left: 0 }} aparencia={aparencia} aoMudar={aoMudar} aoFechar={aoFechar} />,
  );
  return { aoMudar, aoFechar };
};

describe('Menu de aparência do gráfico', () => {
  it('mostra os dois tipos e os quatro atalhos de cor', () => {
    abrir();
    expect(screen.getByText('Candles')).toBeInTheDocument();
    expect(screen.getByText('Linha')).toBeInTheDocument();
    expect(screen.getByText('TradingView')).toBeInTheDocument();
    expect(screen.getByText('Sóbrio')).toBeInTheDocument();
  });

  it('marca o tipo em uso', () => {
    abrir({ ...APARENCIA_PADRAO, tipo: 'linha' });
    expect(screen.getByText('Linha').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Candles').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('escolher linha pede a troca de tipo, e nada mais', () => {
    const { aoMudar } = abrir();
    fireEvent.click(screen.getByText('Linha'));
    expect(aoMudar).toHaveBeenCalledWith({ tipo: 'linha' });
  });

  it('um atalho de cor manda as duas cores de uma vez', () => {
    const { aoMudar } = abrir();
    fireEvent.click(screen.getByLabelText('TradingView'));
    expect(aoMudar).toHaveBeenCalledWith({ cores: { alta: '#089981', baixa: '#F23645' } });
  });

  it('marca o atalho que corresponde às cores em uso', () => {
    abrir({ tipo: 'candle', cores: { alta: '#089981', baixa: '#F23645' } });
    expect(screen.getByLabelText('TradingView')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Clássico')).toHaveAttribute('aria-pressed', 'false');
  });

  // O conta-gotas muda uma cor só: mandar as duas apagaria a outra
  it('o conta-gotas da alta não mexe na baixa', () => {
    const { aoMudar } = abrir();
    fireEvent.change(screen.getByLabelText('Cor dos candles de alta'), { target: { value: '#123456' } });
    expect(aoMudar).toHaveBeenCalledWith({ cores: { alta: '#123456' } });
  });

  it('clicar fora fecha', () => {
    const { aoFechar } = abrir();
    fireEvent.mouseDown(screen.getByText('Tipo de gráfico').closest('[role="group"]').parentElement);
    expect(aoFechar).toHaveBeenCalled();
  });

  it('clicar dentro não fecha', () => {
    const { aoFechar } = abrir();
    fireEvent.mouseDown(screen.getByText('Tipo de gráfico'));
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
