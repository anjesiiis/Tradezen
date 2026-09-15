import { screen, waitFor, within } from '@testing-library/react';
import { renderApp } from './helpers.jsx';

const ABAS = ['Lista', 'Gráfico', 'Cripto', 'Favoritos', 'Menu'];

async function acharBarra() {
  return waitFor(() => {
    const barra = document.querySelector('nav.mnav');
    expect(barra).not.toBeNull();
    return barra;
  });
}

describe('Barra de navegação inferior (mobile)', () => {
  it('renderiza os 5 itens na ordem: Lista, Gráfico, Cripto, Favoritos, Menu', async () => {
    renderApp('/mercados', { mobile: true });
    const barra = await acharBarra();

    const itens = within(barra).getAllByRole('button');
    expect(itens.map((b) => b.textContent)).toEqual(ABAS);
  });

  it('fica direto no body (portal), fora de qualquer container da página', async () => {
    renderApp('/mercados', { mobile: true });
    const barra = await acharBarra();

    expect(barra.parentElement).toBe(document.body);
  });

  it('não aparece no desktop', async () => {
    renderApp('/mercados');
    await screen.findByText('TRADE', { selector: '.logo' }).catch(() => {});

    expect(document.querySelector('nav.mnav')).toBeNull();
  });

  it('não aparece na página do gráfico de um ativo', async () => {
    renderApp('/ativo/PETR4.SA', { mobile: true });
    await waitFor(() => expect(document.querySelector('nav.nav')).not.toBeNull());

    expect(document.querySelector('nav.mnav')).toBeNull();
  });
});
