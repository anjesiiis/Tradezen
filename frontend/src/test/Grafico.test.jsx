import { screen, waitFor } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import { renderApp } from './helpers.jsx';

describe('Gráfico do ativo', () => {
  it('renderiza a página do ativo sem crash e cria o gráfico (desktop)', async () => {
    renderApp('/ativo/PETR4.SA');

    await waitFor(() => expect(createChart).toHaveBeenCalled());
    expect(document.querySelector('.analysis-wrap')).not.toBeNull();
    expect(screen.queryByText('Página não encontrada')).not.toBeInTheDocument();
  });

  it('busca os candles do ativo certo na API', async () => {
    renderApp('/ativo/PETR4.SA');

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/ativo/PETR4.SA?'))
    );
  });

  it('renderiza sem crash no mobile', async () => {
    renderApp('/ativo/PETR4.SA', { mobile: true });

    await waitFor(() => expect(createChart).toHaveBeenCalled());
    expect(document.querySelector('.analysis-wrap')).not.toBeNull();
  });
});
