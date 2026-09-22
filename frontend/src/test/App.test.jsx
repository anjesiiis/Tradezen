import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';

describe('App', () => {
  it('renderiza a abertura no desktop com o mesmo conteúdo do mobile', async () => {
    renderApp('/');

    const abertura = await waitFor(() => {
      const el = document.querySelector('.abm');
      expect(el).not.toBeNull();
      return el;
    });
    const nela = within(abertura);
    expect(nela.getByRole('heading', { name: /Mercado\s*com mais\s*clareza\./ })).toBeInTheDocument();
    expect(abertura.querySelector('.abm-tags')).toHaveTextContent('Análise·Gráficos·Mercado');
    expect(nela.getByRole('button', { name: /Explorar TradeZen/ })).toBeInTheDocument();
    expect(nela.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    // usa a mesma foto de fundo do celular
    expect(abertura.getAttribute('style')).toMatch(/hero-bg/);
  });

  it('abertura desktop: botão Entrar leva pra /login', async () => {
    const user = userEvent.setup();
    renderApp('/');

    const abertura = await waitFor(() => {
      const el = document.querySelector('.abm');
      expect(el).not.toBeNull();
      return el;
    });
    await user.click(within(abertura).getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it('abertura desktop: CTA leva pra /mercados', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(await screen.findByRole('button', { name: /Explorar TradeZen/ }));

    await waitFor(() => expect(window.location.pathname).toBe('/mercados'));
  });

  it('renderiza a landing mobile com título e CTA', async () => {
    renderApp('/', { mobile: true });

    expect(await screen.findByRole('heading', { name: /Mercado\s*com mais\s*clareza\./ })).toBeInTheDocument();
    // As tags vêm separadas por <i>·</i>, então confere o texto do bloco todo
    expect(document.querySelector('.abm-tags')).toHaveTextContent('Análise·Gráficos·Mercado');
    expect(screen.getByRole('button', { name: /Explorar TradeZen/ })).toBeInTheDocument();
  });

  it('landing mobile: CTA leva pra /mercados', async () => {
    const user = userEvent.setup();
    renderApp('/', { mobile: true });

    await user.click(await screen.findByRole('button', { name: /Explorar TradeZen/ }));

    await waitFor(() => expect(window.location.pathname).toBe('/mercados'));
  });

  it('renderiza /mercados sem crash', async () => {
    renderApp('/mercados');

    await waitFor(() => expect(document.querySelector('nav.nav')).not.toBeNull());
    expect(screen.queryByText('Página não encontrada')).not.toBeInTheDocument();
  });

  it('rota inexistente mostra a página 404', async () => {
    renderApp('/rota-que-nao-existe');

    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument();
  });

  it('rotas de auth renderizam a tela certa', async () => {
    renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
