import { waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';

async function acharHeader() {
  return waitFor(() => {
    const header = document.querySelector('nav.nav');
    expect(header).not.toBeNull();
    return header;
  });
}

describe('Header', () => {
  it('renderiza logo TRADEZEN e os botões de menu, busca, tema e Entrar', async () => {
    renderApp('/mercados', { mobile: true });
    const header = await acharHeader();
    const h = within(header);

    expect(header.querySelector('.logo')).toHaveTextContent('TRADEZEN');
    expect(h.getByTitle('Menu')).toBeInTheDocument();
    expect(h.getByTitle('Buscar')).toBeInTheDocument();
    // Há dois botões de tema (um do layout mobile, outro do desktop — o CSS
    // mostra só um); aqui vale o do mobile.
    expect(header.querySelector('.tema-toggle-mobile')).toHaveAttribute('title', expect.stringMatching(/Mudar pro tema/));
    // Ninguém logado (Supabase mockado sem sessão) → botão Entrar
    expect(h.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('botão de tema alterna entre claro e escuro', async () => {
    const user = userEvent.setup();
    renderApp('/mercados', { mobile: true });
    const header = await acharHeader();

    const botao = () => header.querySelector('.tema-toggle-mobile');
    const tituloAntes = botao().getAttribute('title');
    expect(tituloAntes).toMatch(/Mudar pro tema/);
    await user.click(botao());

    await waitFor(() => {
      expect(botao().getAttribute('title')).not.toBe(tituloAntes);
    });
  });

  it('clicar em Entrar leva pra /login', async () => {
    const user = userEvent.setup();
    renderApp('/mercados', { mobile: true });
    const header = await acharHeader();

    await user.click(within(header).getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });
});
