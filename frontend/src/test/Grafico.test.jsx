import { screen, waitFor } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import { renderApp } from './helpers.jsx';

// timeout maior: com a suíte inteira em paralelo, o chunk do gráfico
// (lazy) às vezes passa de 1s, o padrão do waitFor.
describe('Gráfico do ativo', () => {
  it('renderiza a página do ativo sem crash e cria o gráfico (desktop)', async () => {
    renderApp('/ativo/PETR4.SA');

    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    expect(document.querySelector('.analysis-wrap')).not.toBeNull();
    expect(screen.queryByText('Página não encontrada')).not.toBeInTheDocument();
  });

  it('busca os candles do ativo certo na API', async () => {
    renderApp('/ativo/PETR4.SA');

    await waitFor(
      () => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/ativo/PETR4.SA?')),
      { timeout: 5000 }
    );
  });

  // A régua fica na barra de cima: arma como ferramenta, mas o que ela
  // desenha não fica salvo. Esconder, travar e limpar foram retirados da
  // interface por pedido do dono.
  it('a régua fica na barra de cima, e as outras ações saíram', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    expect(screen.getByTitle('Régua — medir variação')).toBeInTheDocument();
    for (const titulo of ['Esconder desenhos', 'Travar desenhos', 'Limpar desenhos']) {
      expect(screen.queryByTitle(titulo)).not.toBeInTheDocument();
    }
  });

  it('a barra lateral tem só as seis ferramentas de desenho', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    await waitFor(() => expect(document.querySelectorAll('.chart-tool')).toHaveLength(6));
    expect(screen.queryByLabelText('Cursor')).not.toBeInTheDocument();
  });

  it('renderiza sem crash no mobile', async () => {
    renderApp('/ativo/PETR4.SA', { mobile: true });

    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    expect(document.querySelector('.analysis-wrap')).not.toBeNull();
  });
});
