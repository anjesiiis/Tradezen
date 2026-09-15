import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';
import { MERCADO_FAKE } from './dadosFake.js';

async function acharLinhas() {
  return waitFor(() => {
    const linhas = document.querySelectorAll('.mlista-item');
    expect(linhas.length).toBe(MERCADO_FAKE.length);
    return [...linhas];
  });
}

describe('Dashboard — lista de ativos (mobile)', () => {
  it('busca /mercado na API e lista todos os ativos', async () => {
    renderApp('/mercados', { mobile: true });
    const linhas = await acharLinhas();

    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/mercado$/));
    const simbolos = linhas.map((l) => l.querySelector('.mlista-tk').textContent);
    expect(simbolos).toEqual(expect.arrayContaining(MERCADO_FAKE.map((a) => a.simbolo)));
  });

  it('agrupa os ativos em seções na ordem certa', async () => {
    renderApp('/mercados', { mobile: true });
    await acharLinhas();

    const secoes = [...document.querySelectorAll('.mlista-secao')].map((s) => s.textContent);
    expect(secoes).toEqual(['Índices', 'Ações', 'Cripto', 'Moedas', 'Commodities']);
  });

  it('cada linha mostra símbolo, nome e variação', async () => {
    renderApp('/mercados', { mobile: true });
    const linhas = await acharLinhas();

    const petr = linhas.find((l) => l.querySelector('.mlista-tk').textContent === 'PETR4');
    const linha = within(petr);
    expect(linha.getByText('Petrobras')).toBeInTheDocument();
    expect(linha.getByText(/1\.12%/)).toBeInTheDocument();
  });

  it('tocar num ativo abre a página do gráfico dele', async () => {
    const user = userEvent.setup();
    renderApp('/mercados', { mobile: true });
    const linhas = await acharLinhas();

    const petr = linhas.find((l) => l.querySelector('.mlista-tk').textContent === 'PETR4');
    await user.click(petr);

    await waitFor(() => expect(window.location.pathname).toBe('/ativo/PETR4.SA'));
  });

  it('mostra aviso quando a API falha', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('offline')));
    renderApp('/mercados', { mobile: true });

    expect(
      await screen.findByText(/Não foi possível carregar as cotações agora/)
    ).toBeInTheDocument();
  });
});
